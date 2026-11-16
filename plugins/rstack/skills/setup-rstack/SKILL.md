---
name: setup-rstack
description: Configure rstack's provider-qualified models, per-role effort, and parent-owned routes per role. Detects which providers this machine can reach, picks the matching availability tier, and verifies every distinct lane before writing the override sheet. Use for /setup-rstack, "configure rstack models", or changing rstack's model choices.
---

# Setup rstack

Configure one portable model sheet for the current parent harness. Read [`provider-dispatch.md`](../poteto-mode/references/provider-dispatch.md) before probing or writing anything. Its model matrix, descriptor grammar, and route table are the contract. Effort is chosen per role. Providers this machine cannot reach are resolved once here, by picking an availability tier, never by falling back at dispatch time. Do not add a second configuration file, a runtime resolver, or a weaker-model fallback.

Claude Code writes `~/.claude/rstack-models.md` and loads it from `~/.claude/CLAUDE.md` with:

```text
@~/.claude/rstack-models.md
```

Codex writes `~/.codex/rstack-models.md`. Codex has no `@` include, so mirror the sheet's exact bytes inside one bounded block in `~/.codex/AGENTS.md` and retain the sheet as the editable source of truth:

```text
<!-- rstack:models:begin -->
<exact contents of ~/.codex/rstack-models.md>
<!-- rstack:models:end -->
```

## Steps

### 1. Establish the parent

Use the harness and tool surface running this skill: Claude Code or Codex. Environment markers may corroborate that top-level answer, but do not launch a child and ask it to detect where it came from. Record the parent because the same descriptor takes a different route in each harness.

### 2. Load current state

Read the current parent-specific sheet when it exists. Before matrix validation, normalize only the rolling-alias predecessors that earlier rstack releases generated. A provider-qualified Claude model is migratable when its model component starts with `claude-fable-` or `claude-opus-` and the remaining revision contains only digits and hyphens. Replace that component in memory with `fable` or `opus`, preserving the provider, effort, role, and lane order. Record each original and normalized descriptor for the confirmation in step 8. This migration is valid loaded state and does not require a separate operator choice.

Treat the normalized values as current role-to-family assignments. Overlay those rows on the availability tier map chosen in step 3. Materialize any missing documented role row from that map on the next successful write. A duplicate or unknown role row is inconsistent state; report it and resolve it before probing. A bare host-native slug from an older sheet is also invalid because it does not say which provider owns it. A versioned Claude model outside the two migration families remains inconsistent state. If the sheet is missing, use the availability tier map chosen in step 3.

### 3. Detect provider availability and choose the role map

Determine which providers this machine can reach before choosing anything. The parent's own provider is reachable natively. Every other provider is reachable when T3 Code's `orchestrator_capabilities` lists it with `canRunChildTask: true` and its catalog contains the matrix model (for Claude, a model of each family the map uses).

| Provider | From a Claude parent | From a Codex parent |
|---|---|---|
| claude | native | `orchestrator_capabilities` lists `claudeAgent` |
| codex | `orchestrator_capabilities` lists `codex` with `gpt-6.1-sol` | native |
| grok | `orchestrator_capabilities` lists `grok` with `grok-4.6` | `orchestrator_capabilities` lists `grok` with `grok-4.6` |

An unreachable provider is an expected outcome, not a failure. Codex and Grok each require their own paid subscription and most operators will not hold both. Claude is the only provider assumed present; if it is unreachable, stop and write nothing. Outside T3 Code there is no `orchestrator_capabilities`, so only the parent's own provider is reachable.

Pick the availability tier matching the reachable set and use its role map as the first-run map. On a rerun the loaded sheet is the map; report every role whose provider is no longer reachable and offer that tier's value for those roles only, never a whole-sheet reset.

Full tier. Claude, Codex, and Grok all reachable:

```markdown
# rstack model configuration

Provider-qualified per-role choices. Read the installed rstack provider-dispatch reference before dispatching a configured role. Every documented role remains present. `inherit-parent` and `auto` use the parent model natively and still count as one panel lane.

feature: grok:grok-4.6@xhigh
refactoring: claude:opus@high
bug-fix: codex:gpt-6.1-sol@medium
perf-issue: codex:gpt-6.1-sol@medium
hillclimb: claude:opus@medium
judgment and prose: claude:fable@medium
hardest tasks: claude:fable@high
how explorer: grok:grok-4.6@high
how explainer: claude:opus@high
how critics: claude:opus@xhigh, codex:gpt-6.1-sol@high, grok:grok-4.6@xhigh
why investigators: claude:opus@medium
why synthesizer: claude:opus@high
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: claude:opus@xhigh, codex:gpt-6.1-sol@high, grok:grok-4.6@xhigh, claude:fable@medium
arena cross-judge pool: claude:opus@xhigh, codex:gpt-6.1-sol@high, grok:grok-4.6@xhigh, claude:fable@medium
swarm workers: claude:opus@medium
architect runners: claude:opus@xhigh, codex:gpt-6.1-sol@high, grok:grok-4.6@xhigh, claude:fable@medium
interrogate reviewers: claude:opus@xhigh, codex:gpt-6.1-sol@high, grok:grok-4.6@xhigh
```

Claude and Codex reachable, no Grok. Every Grok role moves to Opus at the same effort:

```markdown
# rstack model configuration

Provider-qualified per-role choices. Read the installed rstack provider-dispatch reference before dispatching a configured role. Every documented role remains present. `inherit-parent` and `auto` use the parent model natively and still count as one panel lane.

feature: claude:opus@xhigh
refactoring: claude:opus@high
bug-fix: codex:gpt-6.1-sol@medium
perf-issue: codex:gpt-6.1-sol@medium
hillclimb: claude:opus@medium
judgment and prose: claude:fable@medium
hardest tasks: claude:fable@high
how explorer: claude:opus@high
how explainer: claude:opus@high
how critics: claude:opus@xhigh, codex:gpt-6.1-sol@high, claude:opus@high
why investigators: claude:opus@medium
why synthesizer: claude:opus@high
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: claude:opus@xhigh, codex:gpt-6.1-sol@high, claude:opus@high, claude:fable@medium
arena cross-judge pool: claude:opus@xhigh, codex:gpt-6.1-sol@high, claude:opus@high, claude:fable@medium
swarm workers: claude:opus@medium
architect runners: claude:opus@xhigh, codex:gpt-6.1-sol@high, claude:opus@high, claude:fable@medium
interrogate reviewers: claude:opus@xhigh, codex:gpt-6.1-sol@high, claude:opus@high
```

Claude only. Every Codex and Grok role moves to Claude, and panel lanes that would collide are spread across Opus and Fable so each panel keeps distinct lanes:

```markdown
# rstack model configuration

Provider-qualified per-role choices. Read the installed rstack provider-dispatch reference before dispatching a configured role. Every documented role remains present. `inherit-parent` and `auto` use the parent model natively and still count as one panel lane.

feature: claude:opus@xhigh
refactoring: claude:opus@high
bug-fix: claude:opus@medium
perf-issue: claude:opus@medium
hillclimb: claude:opus@medium
judgment and prose: claude:fable@medium
hardest tasks: claude:fable@high
how explorer: claude:opus@high
how explainer: claude:opus@high
how critics: claude:opus@xhigh, claude:opus@high, claude:fable@medium
why investigators: claude:opus@medium
why synthesizer: claude:opus@high
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: claude:opus@xhigh, claude:opus@xhigh, claude:opus@high, claude:fable@medium
arena cross-judge pool: claude:opus@xhigh, claude:opus@xhigh, claude:opus@high, claude:fable@medium
swarm workers: claude:opus@medium
architect runners: claude:opus@xhigh, claude:opus@xhigh, claude:opus@high, claude:fable@medium
interrogate reviewers: claude:opus@xhigh, claude:opus@high, claude:fable@medium
```

Name the chosen tier in the step 8 confirmation, with every role it moved off its full-tier provider. A tier substitution is a setup-time choice recorded verbatim in the sheet, never a runtime fallback. At dispatch time an unavailable lane is still a dropout, never a silent swap.

Say plainly what a reduced tier costs. The Claude-only panels run two model families instead of four, so cross-provider agreement no longer means what it means on a full-tier machine.

### 4. Parse per-role descriptors

Read the model matrix. Every non-alias value must match `<provider>:<model>@<effort>`. Map it to exactly one matrix family by `(provider, model)` and require its effort to appear in that row's Selectable efforts cell. `inherit-parent` and `auto` rows carry no family and no effort.

Effort is per role, not per family. One family may carry different efforts on different roles, and one panel may repeat a descriptor across lanes. Both are valid state, not conflicts to normalize. Collect the set of distinct `(family, effort)` pairs the map uses. That set is the probe set for step 6.

An unmatched provider/model, out-of-domain effort, duplicate role, or unknown role is inconsistent state. Stop, show the conflicting rows verbatim, and ask for an explicit matrix family or alias replacement. Do not invent a precedence rule. Do not probe or write while any inconsistency is unresolved.

A family with no non-alias occurrence is unassigned. Leave it unassigned rather than forcing a descriptor onto some role to cover it.

### 5. Collect role changes

Show every role, its current or proposed descriptor, and the Selectable efforts for each descriptor's family. Ask which roles to change. Empty input keeps the whole map. On a first run, name the tier the map came from before asking.

A changed role may take any matrix family at any effort from that family's Selectable efforts cell, `inherit-parent`, or `auto`. Changing one role changes only that role. Never offer a reset of a customized sheet to the first-run assignments.

### 6. Probe every distinct pair

Probe each distinct `provider:model@effort` pair the map uses, once per pair. Do not enumerate or offer older models as substitutes. A failed probe writes nothing: report the failing pair and provider, stop, and keep the active sheet plus parent integration bytes unchanged. A failed first run creates neither artifact.

A provider ruled unreachable in step 3 contributes no pairs, because its roles already moved to the chosen tier's values. A pair that fails on a provider step 3 found reachable is a real error, not a tier question. Stop rather than dropping to a lower tier.

| Family | Pair source | Claude parent route | Codex parent route | Availability proof |
|---|---|---|---|---|
| Fable | Fable matrix row + each effort used | native Agent `rstack-fable-<effort>` | T3 `delegate_task` | one-turn probe on the route |
| Sol | Sol matrix row + each effort used | T3 `delegate_task` | native `spawn_agent` | one-turn probe on the route |
| Grok | Grok matrix row + each effort used | T3 `delegate_task` | T3 `delegate_task` | one-turn probe on the route |
| Opus | Opus matrix row + each effort used | native Agent `rstack-opus-<effort>` | T3 `delegate_task` | one-turn probe on the route |

Use a tiny read-only probe that returns a unique marker. A catalog listing alone proves the provider is configured, not that the requested model and effort run. Record native and T3 results separately. Never send the parent's own provider through `delegate_task`. On a Claude parent, the Fable and Opus probes are one-turn runs of the mapped `rstack-<stem>-<effort>` agent. On a Codex parent, the Sol probe is native `spawn_agent` with the selected `reasoning_effort`. Every other pair is a read-only `delegate_task` built from the provider-dispatch mapping, with the selected effort in `target.options`. Launch every probe in one fan-out phase and let completions wake the parent.

T3 task results and native transcripts prove the requested effort and the route. They do not prove a provider's hidden applied reasoning depth. There is no implicit timeout, weaker-model fallback, same-provider T3 fallback, or second mutable configuration source.

### 7. Render

Build the new sheet in memory. Do not write it yet.

- First run: start from the tier map chosen in step 3.
- Rerun: start from the normalized complete role map from step 2, preserving each loaded row's lane order and family (or alias) per lane.

Apply only the role changes the operator named in step 5. Keep every documented role present; materialize a missing row from the chosen tier's map. Leave `inherit-parent` and `auto` unchanged.

Refuse an unqualified slug, an unavailable route, a model other than the four matrix families, or a provider/model mismatch.

### 8. Confirm and commit

Show any rolling-alias migrations as original and normalized descriptors. Then show the route table for this parent and every rendered role and descriptor. Ask for confirmation before writing.

Why and Reflect require the parent's live MCP surface, which a T3 delegated child does not inherit. Keep their investigator, reviewer, and synthesizer roles on a lane that runs natively in the parent: any `claude:*` descriptor on a Claude parent, any `codex:*` descriptor on a Codex parent, or `inherit-parent` / `auto` on either. A pinned native descriptor keeps the MCP surface and the model; an alias keeps the surface and takes whatever model the parent happens to be. Never route these roles through `delegate_task`. `inherit-parent` and `auto` always validate, but say when they reduce a panel's provider diversity. For panel roles, one lane runs per entry. The list length is the fan-out count. `arena cross-judge pool` is a list from which Arena chooses a provider different from the parent and base candidate when possible. `swarm workers` is the default for every worker unless a race explicitly assigns another descriptor.

Every non-alias value must match `<provider>:<model>@<effort>` and must have passed step 6.

Name the availability tier chosen in step 3 and every role it moved off its full-tier provider. After the operator confirms, write the in-memory render from step 7. Never paste a tier map from step 3 as the result; role changes from step 5 always replace its values before writing.

### 9. Wire it in

Render the parent integration in memory before either write. On Claude, the integration is the single `@~/.claude/rstack-models.md` include in `~/.claude/CLAUDE.md`. On Codex, it is the exact sheet bytes between one `<!-- rstack:models:begin -->` and `<!-- rstack:models:end -->` pair in `~/.codex/AGENTS.md`. Replace that whole bounded block on a rerun. Insert one block at the end on first run. If either marker is missing, duplicated, or reversed, stop and report inconsistent state instead of guessing a boundary.

Snapshot every target's current bytes. Write the sheet and parent integration only after every probe passes and the operator confirms. Read both targets back and compare them with the in-memory render. If either write or readback fails, restore every snapshot and report the failure. An unchanged rerun must produce byte-identical sheet and integration content after normalization.

Do not copy the model sheet between harnesses without rerunning the parent-specific probes; route availability can differ even on the same host.

### 10. Behavioral smoke

Before declaring setup complete, run one small read-only mixed panel from this parent: one lane per family the sheet uses and an independent cross-judge. Launch native agents in the background and every T3 lane as an async `delegate_task` in the same fan-out phase, then wait for every completion. Verify the native transcript entries and every T3 receipt as provider dispatch defines it. A structural config check or unit test is not a substitute.

Report the sheet path, parent route table, requested-effort probe results, smoke results, and each T3 receipt (`taskId`, echoed provider, model, and options, terminal status, wall-clock time). Re-running this skill re-probes and updates the same sheet. Do not claim the provider exposed hidden applied-effort observability.
