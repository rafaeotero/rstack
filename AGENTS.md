# rstack

Keep one shared skill tree for Claude Code and Codex; adapt harness primitives at the existing mapping boundaries instead of forking skills or adding compatibility layers. The parent harness resolves provider routing once. Children do not detect or reroute themselves.

Before opening a pull request, run the Bun tests, strict typecheck, static invariants, and plugin validation.

Try the changed behavior from the real user surface before merging, and say in the pull request what you tried and what you observed.

Do not add an implicit runtime timeout or a weaker-model fallback.
