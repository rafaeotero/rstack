# NOTICE

This plugin is a port of upstream MIT-licensed work. All upstream copyright notices and license terms are preserved. The open-pstack history begins from `michael-denyer/pstack-claude` through proven import commit `053ed78732e3b71826933170eafe7f7782dda844`.

## Upstream sources

| Component | Upstream | Copyright | License | License file |
| --- | --- | --- | --- | --- |
| `plugins/rstack/skills/poteto-mode/`, `plugins/rstack/skills/architect/`, `plugins/rstack/skills/arena/`, `plugins/rstack/skills/automate-me/`, `plugins/rstack/skills/figure-it-out/`, `plugins/rstack/skills/how/`, `plugins/rstack/skills/interrogate/`, `plugins/rstack/skills/reflect/`, `plugins/rstack/skills/show-me-your-work/`, `plugins/rstack/skills/tdd/`, `plugins/rstack/skills/typescript-best-practices/`, `plugins/rstack/skills/unslop/`, `plugins/rstack/skills/why/`, `plugins/rstack/skills/principle-*/`, `plugins/rstack/agents/poteto-agent.md` | [cursor/plugins/pstack @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/pstack) | (c) 2026 Lauren Tan | MIT | [LICENSE](LICENSE) |
| `plugins/rstack/skills/deslop/` | [cursor/plugins/cursor-team-kit/skills/deslop @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/deslop) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/skills/thermo-nuclear-code-quality-review/` | [cursor/plugins/cursor-team-kit/skills/thermo-nuclear-code-quality-review @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/thermo-nuclear-code-quality-review) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/skills/make-pr-easy-to-review/` | [cursor/plugins/cursor-team-kit/skills/make-pr-easy-to-review @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/make-pr-easy-to-review) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/skills/fix-ci/` | [cursor/plugins/cursor-team-kit/skills/fix-ci @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/fix-ci) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/skills/fix-merge-conflicts/` | [cursor/plugins/cursor-team-kit/skills/fix-merge-conflicts @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/fix-merge-conflicts) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/skills/get-pr-comments/` | [cursor/plugins/cursor-team-kit/skills/get-pr-comments @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/get-pr-comments) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/hooks/run-hook.cmd` (near-verbatim) | [anthropics/claude-plugins-official → superpowers @ 6.1.0](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/superpowers) (originally obra/superpowers) | (c) 2025 Jesse Vincent | MIT | [LICENSE-superpowers](LICENSE-superpowers) |
| `plugins/rstack/skills/what-did-i-get-done/` | [cursor/plugins/cursor-team-kit/skills/what-did-i-get-done @ e46364b](https://github.com/cursor/plugins/tree/e46364b8be46000b7df0f260550cd712afbb8d36/cursor-team-kit/skills/what-did-i-get-done) | (c) 2026 Cursor | MIT | [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) |
| `plugins/rstack/skills/teach/`, `plugins/rstack/skills/principle-model-the-domain/`, `plugins/rstack/skills/create-verification-skill/`, `plugins/rstack/skills/maintain-verification-skill/` (v0.11.3 additions) | [cursor/plugins/pstack @ 3fe2823](https://github.com/cursor/plugins/tree/3fe2823ce17c1656c222d4b7c59d3f82fbf20143/pstack) | (c) 2026 Lauren Tan | MIT | [LICENSE](LICENSE) |
| `plugins/rstack/skills/{swarm,no-comments,technical-writing,bro}/`, `plugins/rstack/agents/comment-sicko.md`, `plugins/rstack/skills/poteto-mode/playbooks/{babysit,shipping,orchestrate,autopilot-full,autopilot-stack,worktree-cleanup,multi-phase-plan}.md`, `plugins/rstack/skills/poteto-mode/references/bugbot-triage.md`, `plugins/rstack/skills/poteto-mode/scripts/`, `plugins/rstack/skills/architect/references/design-red-flags.md`, `plugins/rstack/skills/create-verification-skill/references/feature-map-example/` (v0.14.2 additions, v0.14.3 checklist) | [cursor/plugins/pstack @ bdf7aa3](https://github.com/cursor/plugins/tree/bdf7aa355337897f167153e05069aca505dae17c/pstack) | (c) 2026 Lauren Tan | MIT | [LICENSE](LICENSE) |

## What changed in the port

The port is editorial, not mechanical.

Summary of structural changes:

- Plugin content lives at `plugins/rstack/` (with its own `.claude-plugin/plugin.json`). The repo root holds `.claude-plugin/marketplace.json` and the LICENSE / NOTICE / README docs.
- `.claude-plugin/marketplace.json` added at repo root so the repo is installable via `/plugin marketplace add`. The marketplace's single plugin entry sources from `./plugins/rstack`.
- The native `plugins/rstack/skills/` tree is the only user-facing workflow surface. Claude Code and Codex invoke those skills directly.
- Seven skills imported from `cursor-team-kit`: `deslop`, `thermo-nuclear-code-quality-review`, `make-pr-easy-to-review`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments`, `what-did-i-get-done`. All copied verbatim — no rewiring needed.
- `plugins/rstack/skills/babysit/` is independently authored as the Claude Code analog of Cursor's `/babysit` built-in. It has no upstream pstack equivalent; its workflow is informed by Cursor's public `/babysit` behavior. No code or prose was copied from any source.
- `plugins/rstack/skills/poteto-mode/scripts/` is vendored from upstream (`watch-pr`, `orch`, `bootstrap.ts`, `worktree-audit.sh`, `package.json`, `bun.lock`) with these port edits: `worktree-audit.sh` reads `~/.claude/projects/` instead of Cursor's transcript directory and warns when `jq` or `rg` is missing (their absence silently blanks the columns the prune decision reads), the private workspace package is named `@open-pstack/poteto-mode-tools`, `bootstrap.ts` rejects Node before it reads Bun-only APIs, and `package.json` includes the port-authored tests in `bun run test`. `check-plan.mjs` is the Cursor 0.14.3 checker adapted for the shared Claude Code and Codex skeleton. `bootstrap.test.ts` and `check-plan.test.ts` are authored for this port.
- `plugins/rstack/agents/comment-sicko.md` is upstream's `Comment Sicko` agent, renamed to `comment-sicko` so the name works as a Claude Code `subagent_type`. The body is verbatim.
- Claude-native Fable and Opus lanes are port-authored agent definitions. They select the rolling family alias plus requested effort for every selectable Claude-native pair in the provider-dispatch model matrix.
- A Codex build shares the same `skills/` tree. It adds `plugins/rstack/.codex-plugin/plugin.json` and `plugins/rstack/skills/poteto-mode/references/codex-tools.md` (the Claude-to-Codex tool, model, and built-in map), plus a one-line Platform note in the skills that name a Claude primitive. The skill content itself is unchanged.

## Modifications

Per the MIT license, modifications are permitted. Skill bodies have been edited to substitute Cursor-specific primitives with their Claude Code equivalents. All upstream copyright notices in source files (where present) are preserved.

Files authored for this port (not derived from upstream):

- `plugins/rstack/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (repo root)
- `plugins/rstack/.codex-plugin/plugin.json`
- `plugins/rstack/skills/poteto-mode/references/codex-tools.md`
- `plugins/rstack/skills/poteto-mode/scripts/bootstrap.test.ts`
- `plugins/rstack/skills/poteto-mode/scripts/check-plan.test.ts`
- `plugins/rstack/skills/babysit/SKILL.md` (independently authored; workflow informed by Cursor's public `/babysit` behavior)
- `plugins/rstack/agents/rstack-fable-*.md` and `plugins/rstack/agents/rstack-opus-*.md` (Claude-native frontier lanes at each selectable effort)
- `plugins/rstack/hooks/hooks.json`, `plugins/rstack/hooks/session-start`, and `plugins/rstack/hooks/session-start-context.md` (the auto-fire hook and its mandate)
- `NOTICE.md` (this file)
- `README.md`
- `LICENSE-cursor-team-kit` (copied verbatim from upstream cursor-team-kit MIT)
