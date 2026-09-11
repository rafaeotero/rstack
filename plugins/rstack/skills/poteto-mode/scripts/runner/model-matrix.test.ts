import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EFFORTS, type Effort } from "./types.ts";

const PLUGIN_ROOT = join(import.meta.dir, "../../../..");
const DISPATCH_PATH = join(
  PLUGIN_ROOT,
  "skills/poteto-mode/references/provider-dispatch.md"
);
const SETUP_PATH = join(PLUGIN_ROOT, "skills/setup-rstack/SKILL.md");
const AGENTS_DIR = join(PLUGIN_ROOT, "agents");

const MATRIX_HEADER = [
  "Family",
  "Upstream rstack choice",
  "Provider",
  "Model",
  "Default effort",
  "Selectable efforts",
  "Claude-native agent stem",
] as const;

const FAMILY_ORDER = ["fable", "sol", "grok", "opus"] as const;
const PROVIDERS = ["claude", "codex", "grok"] as const;
const DESCRIPTOR_RE =
  /(claude|codex|grok):[a-z0-9.-]+@(low|medium|high|xhigh|max)/g;
const SHEET_ROLES = [
  "feature",
  "refactoring",
  "bug-fix",
  "perf-issue",
  "hillclimb",
  "judgment and prose",
  "hardest tasks",
  "how explorer",
  "how explainer",
  "how critics",
  "why investigators, synthesizer",
  "reflect tooling, judgment, divergent, synthesizer",
  "arena runners",
  "arena cross-judge pool",
  "swarm workers",
  "architect runners",
  "interrogate reviewers",
] as const;
const SETUP_SECTION_ORDER = [
  "### 2. Load current state",
  "### 3. Detect provider availability and choose the role map",
  "### 4. Parse per-role descriptors",
  "### 5. Collect role changes",
  "### 6. Probe every distinct pair",
  "### 7. Render",
  "### 8. Confirm and commit",
] as const;

// setup-rstack ships one role map per availability tier, in descending order of
// which providers a machine can reach. Each tier drops the providers above it.
const TIERS = [
  { name: "full", providers: ["claude", "codex", "grok"] },
  { name: "claude+codex", providers: ["claude", "codex"] },
  { name: "claude-only", providers: ["claude"] },
] as const;
const PANEL_WIDTHS: Record<string, number> = {
  "how critics": 3,
  "arena runners": 4,
  "arena cross-judge pool": 4,
  "architect runners": 4,
  "interrogate reviewers": 3,
};

interface MatrixRow {
  family: string;
  upstreamChoice: string;
  provider: string;
  model: string;
  defaultEffort: Effort;
  selectableEfforts: Effort[];
  claudeNativeAgentStem: string | null;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    throw new Error(`matrix row must be a pipe table: ${line}`);
  }
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim().replaceAll("`", ""));
}

function isSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function asEffort(value: string): Effort {
  if ((EFFORTS as readonly string[]).includes(value)) {
    return value as Effort;
  }
  throw new Error(`not an effort: ${value}`);
}

function parseModelMatrix(markdown: string): MatrixRow[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Model matrix");
  if (start < 0) {
    throw new Error("missing ## Model matrix");
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  const table = lines
    .slice(start + 1, end)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (table.length !== 6) {
    throw new Error(
      `model matrix must be header, separator, and 4 data rows, got ${table.length}`
    );
  }
  const header = splitRow(table[0]);
  if (header.join("|") !== MATRIX_HEADER.join("|")) {
    throw new Error(`unexpected matrix header: ${header.join(" | ")}`);
  }
  if (!isSeparator(splitRow(table[1]))) {
    throw new Error("matrix header separator missing");
  }
  return table.slice(2).map((line) => {
    const cells = splitRow(line);
    if (cells.length !== MATRIX_HEADER.length) {
      throw new Error(`matrix row has ${cells.length} cells: ${line}`);
    }
    const [
      family,
      upstreamChoice,
      provider,
      model,
      defaultEffortRaw,
      selectableRaw,
      stemRaw,
    ] = cells;
    if (!(PROVIDERS as readonly string[]).includes(provider)) {
      throw new Error(`invalid provider: ${provider}`);
    }
    const selectableEfforts = selectableRaw.split(/\s+/).map(asEffort);
    const claudeNativeAgentStem = stemRaw === "-" ? null : stemRaw;
    if (claudeNativeAgentStem !== null && !/^[a-z0-9-]+$/.test(claudeNativeAgentStem)) {
      throw new Error(`invalid Claude-native agent stem: ${stemRaw}`);
    }
    if ((provider === "claude") !== (claudeNativeAgentStem !== null)) {
      throw new Error(`${family} stem must be present iff provider is claude`);
    }
    const defaultEffort = asEffort(defaultEffortRaw);
    if (!selectableEfforts.includes(defaultEffort)) {
      throw new Error(`${family} default effort is not selectable`);
    }
    return {
      family,
      upstreamChoice,
      provider,
      model,
      defaultEffort,
      selectableEfforts,
      claudeNativeAgentStem,
    };
  });
}

function parseFrontmatter(text: string): {
  fields: Record<string, string>;
  body: string;
} {
  if (!text.startsWith("---\n")) {
    throw new Error("missing frontmatter");
  }
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) {
    throw new Error("unterminated frontmatter");
  }
  const fields: Record<string, string> = {};
  for (const line of text.slice(4, end).split("\n")) {
    const idx = line.indexOf(": ");
    if (idx < 0) {
      throw new Error(`bad frontmatter line: ${line}`);
    }
    fields[line.slice(0, idx)] = line.slice(idx + 2);
  }
  return { fields, body: text.slice(end + 5) };
}

function tierSheets(setup: string): string[] {
  const sheets = [
    ...setup.matchAll(/```markdown\n(# rstack model configuration\n[\s\S]*?)```/g),
  ].map((match) => match[1]);
  if (sheets.length !== TIERS.length) {
    throw new Error(
      `setup-rstack must ship one sheet per availability tier, got ${sheets.length}`
    );
  }
  return sheets;
}

function roleLines(sheet: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of sheet.split("\n")) {
    const idx = line.indexOf(": ");
    if (idx < 0 || line.startsWith("#") || line.includes(" the ")) {
      continue;
    }
    entries.set(line.slice(0, idx), line.slice(idx + 2));
  }
  return entries;
}

describe("model matrix", () => {
  const rows = parseModelMatrix(readFileSync(DISPATCH_PATH, "utf8"));
  const setup = readFileSync(SETUP_PATH, "utf8");

  it("owns the effort universe and first-run defaults", () => {
    expect([...EFFORTS]).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(rows.map((row) => row.family)).toEqual([...FAMILY_ORDER]);
    for (const row of rows) {
      expect(row.upstreamChoice.length).toBeGreaterThan(0);
      expect(row.model.length).toBeGreaterThan(0);
      expect(row.selectableEfforts.length).toBeGreaterThan(0);
      expect(row.selectableEfforts).toEqual(
        EFFORTS.filter((effort) => row.selectableEfforts.includes(effort))
      );
    }
    expect(
      rows.map((row) => [row.family, row.defaultEffort])
    ).toEqual([
      ["fable", "max"],
      ["sol", "max"],
      ["grok", "xhigh"],
      ["opus", "xhigh"],
    ]);
    expect(
      rows
        .filter((row) => row.family === "fable" || row.family === "opus")
        .map((row) => [row.family, row.model])
    ).toEqual([
      ["fable", "fable"],
      ["opus", "opus"],
    ]);
  });

  it("ships exactly the declared Claude-native frontier agents", () => {
    const expected = new Set<string>();
    const familyBodies = new Map<string, string>();
    for (const row of rows) {
      const stem = row.claudeNativeAgentStem;
      if (stem === null) {
        continue;
      }
      for (const effort of row.selectableEfforts) {
        const name = `rstack-${stem}-${effort}`;
        expected.add(`${name}.md`);
        const text = readFileSync(join(AGENTS_DIR, `${name}.md`), "utf8");
        const { fields, body } = parseFrontmatter(text);
        expect(fields).toEqual({
          name,
          description: `Native Claude lane for rstack roles configured as ${row.provider}:${row.model}@${effort}.`,
          model: row.model,
          effort,
          background: "true",
          disallowedTools: "Agent, Task",
        });
        const prior = familyBodies.get(stem);
        if (prior === undefined) {
          familyBodies.set(stem, body);
        } else {
          expect(body).toBe(prior);
        }
      }
    }
    const declaredCount = rows.reduce(
      (count, row) =>
        count +
        (row.claudeNativeAgentStem === null
          ? 0
          : row.selectableEfforts.length),
      0
    );
    expect(expected.size).toBe(declaredCount);
    const shipped = readdirSync(AGENTS_DIR)
      .filter((name) => name.startsWith("rstack-") && name.endsWith(".md"))
      .sort();
    expect(shipped).toEqual([...expected].sort());
  });

  it("ships one complete, matrix-valid role map per availability tier", () => {
    const sheets = tierSheets(setup);
    const byFamily = new Map<string, MatrixRow>(
      rows.map((row) => [`${row.provider}:${row.model}`, row])
    );
    sheets.forEach((sheet, index) => {
      const tier = TIERS[index];
      const roles = roleLines(sheet);
      expect([...roles.keys()]).toEqual([...SHEET_ROLES]);
      for (const [role, value] of roles) {
        const descriptors = value.match(DESCRIPTOR_RE) ?? [];
        if (descriptors.length === 0) {
          // Only the MCP-bound roles may sit on a parent alias.
          expect(value).toMatch(/^(inherit-parent|auto)$/);
          continue;
        }
        // Effort is per role now, so the only rule is that the family declares it.
        for (const descriptor of descriptors) {
          const at = descriptor.lastIndexOf("@");
          const row = byFamily.get(descriptor.slice(0, at));
          if (row === undefined) {
            throw new Error(`${tier.name}: unknown descriptor ${descriptor}`);
          }
          expect(row.selectableEfforts).toContain(
            asEffort(descriptor.slice(at + 1))
          );
          expect([...tier.providers] as string[]).toContain(row.provider);
        }
        const width = PANEL_WIDTHS[role];
        if (width !== undefined) {
          expect(descriptors.length).toBe(width);
        } else {
          expect(descriptors.length).toBe(1);
        }
      }
    });
  });

  it("keeps every panel's lanes distinct in every tier", () => {
    // A panel's product is model diversity, so a narrower tier may repeat a lane
    // only where the operator accepted it: arena-shaped generation work.
    const repeatAllowed = new Set(["arena runners", "arena cross-judge pool", "architect runners"]);
    for (const sheet of tierSheets(setup)) {
      for (const [role, value] of roleLines(sheet)) {
        if (PANEL_WIDTHS[role] === undefined || repeatAllowed.has(role)) {
          continue;
        }
        const descriptors = value.match(DESCRIPTOR_RE) ?? [];
        expect(new Set(descriptors).size).toBe(descriptors.length);
      }
    }
  });

  it("keeps setup's fail-closed reconfiguration order", () => {
    let previous = -1;
    for (const heading of SETUP_SECTION_ORDER) {
      const current = setup.indexOf(heading);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
    expect(setup).toContain("Do not invent a precedence rule.");
    expect(setup).toContain("Do not probe or write while any inconsistency is unresolved.");
    expect(setup).toContain("A failed probe writes nothing:");
    expect(setup).toContain("Probe each distinct `provider:model@effort` pair the map uses, once per pair.");
    expect(setup).toContain("normalized complete role map from step 2");
    expect(setup).toContain("starts with `claude-fable-` or `claude-opus-`");
    expect(setup).toContain("preserving the provider, effort, role, and lane order");
    expect(setup).toContain("Show any rolling-alias migrations");
    expect(setup).toContain("Every documented role remains present.");
    expect(setup).toContain("never by falling back at dispatch time");
    expect(setup).toContain("At dispatch time an unavailable lane is still a dropout, never a silent swap.");
    expect(setup).toContain("<!-- rstack:models:begin -->");
    expect(setup).toContain("<!-- rstack:models:end -->");
  });

  it("binds Claude-native dispatch to the matrix mapping", () => {
    const dispatch = readFileSync(DISPATCH_PATH, "utf8");
    const nativeStart = dispatch.indexOf("## Native lanes");
    const externalStart = dispatch.indexOf("## External lanes");
    expect(nativeStart).toBeGreaterThan(-1);
    expect(externalStart).toBeGreaterThan(nativeStart);
    const nativeLanes = dispatch.slice(nativeStart, externalStart);
    expect(nativeLanes).toContain(
      "match the descriptor's `(provider, model)` to one model-matrix row"
    );
    expect(nativeLanes).toContain("`rstack-<stem>-<effort>`");
  });

  it("normalizes old rolling-family pins before any runtime route", () => {
    const dispatch = readFileSync(DISPATCH_PATH, "utf8");
    const normalizationStart = dispatch.indexOf("## Read-time normalization");
    const parentStart = dispatch.indexOf("## The parent owns the route");
    expect(normalizationStart).toBeGreaterThan(-1);
    expect(parentStart).toBeGreaterThan(normalizationStart);
    const normalization = dispatch.slice(normalizationStart, parentStart);
    expect(normalization).toContain("replace that model component in memory");
    expect(normalization).toContain("Never pass the versioned predecessor to Claude.");
    expect(normalization).toContain("without writing user files");
    expect(normalization).toContain("`/setup-rstack` will rewrite it");
    expect(normalization).toContain("runner rejects a missed Fable or Opus version pin");
  });
});
