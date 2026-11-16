# Provider dispatch

rstack model choices are provider-qualified descriptors:

```text
<provider>:<model>@<effort>
```

## Model matrix

| Family | Upstream rstack choice | Provider | Model | Default effort | Selectable efforts | Claude-native agent stem |
|---|---|---|---|---|---|---|
| fable | fable | claude | fable | max | low medium high xhigh max | fable |
| sol | gpt-6.1-sol-max | codex | gpt-6.1-sol | max | low medium high xhigh max | - |
| grok | grok-4.6-fast-xhigh | grok | grok-4.6 | xhigh | low medium high xhigh | - |
| opus | opus | claude | opus | xhigh | low medium high xhigh max | opus |

The allowed effort universe is exactly `low`, `medium`, `high`, `xhigh`, `max`. First-run requested efforts are the Default effort cell of each row. Grok stops at `xhigh` because T3 Code exposes no higher Grok effort. A Claude-native agent stem of `-` means the family has no Claude-native agent. Otherwise the shipped agent name is `rstack-<stem>-<effort>`.

`fable` and `opus` are Claude Code's rolling aliases. Claude resolves each alias to the latest available family revision. A T3 lane for a Claude family uses the newest `claude-fable-*` or `claude-opus-*` model id that `orchestrator_capabilities` lists for that family, and verification accepts only an echoed model id from the matching family.

## Read-time normalization

Normalize configured descriptors before matching them to the matrix or choosing a route. If a provider-qualified Claude model starts with `claude-fable-` or `claude-opus-` and its remaining revision contains only digits and hyphens, replace that model component in memory with `fable` or `opus`. Preserve provider, effort, role, and lane order. Use only the normalized descriptor for native dispatch or a T3 target. Never pass the versioned predecessor to Claude.

This read-time rule makes an older installed sheet use the latest family revision immediately without writing user files. Once per parent run, report that the persisted sheet is stale and that `/setup-rstack` will rewrite it after its normal probes and confirmation. Unknown versioned Claude models remain invalid. A T3 lane resolves the family alias against the live catalog, so a missed Fable or Opus version pin is never dispatched.

The Grok model is `grok-4.6`. `fast` is part of Cursor's Grok selector, not a T3 Grok model or effort. The first-run Grok effort is `xhigh`.

## The parent owns the route

The top-level harness resolves the route once. A child receives an assigned provider, model, effort, access mode, prompt, working directory, and output location. A child never detects the harness, chooses a provider, or launches another model. Environment markers may corroborate the top-level harness before fan-out, but nested processes inherit parent markers and must not use them for routing.

rstack runs inside T3 Code. A same-provider lane is native; every other provider goes through T3's `delegate_task`.

| Parent | `claude:*` | `codex:*` | `grok:*` |
|---|---|---|---|
| Claude Code | native `Agent` | T3 `delegate_task` | T3 `delegate_task` |
| Codex | T3 `delegate_task` | native `spawn_agent` | T3 `delegate_task` |

`inherit-parent` and `auto` remain aliases. They use the parent's current model and effort through its native subagent primitive. In a panel they still consume one lane, but they reduce provider diversity; say so in the synthesis record.

## Native lanes

Native dispatch keeps the parent's tools and avoids a second session startup.

- Claude Code: match the descriptor's `(provider, model)` to one model-matrix row, then dispatch it through `rstack-<stem>-<effort>` using that row's Claude-native agent stem and the descriptor's effort. Those definitions select the rolling model alias, requested effort, and `background: true`. `rstack-fable-max` and `rstack-opus-xhigh` remain in that set. Pass the complete task, grounding paths, access mode, and unique output location in the `Agent` prompt. Retain the task handle and drain it only after fan-out.
- Codex: call `spawn_agent` with the descriptor's model and `reasoning_effort`, the complete task, grounding paths, access mode, and unique output location. Use an isolated worktree for a writer. Codex subagents already run concurrently.

Do not send a same-provider descriptor to `delegate_task`. The native route is cheaper and keeps the parent's tool surface.

## T3 lanes

Call `orchestrator_capabilities` once per parent thread, before the first `delegate_task`, and again only after a dispatch error. It lists each provider's `providerInstanceId`, its catalog model ids, and each model's effort option id and values. Map the descriptor onto that catalog:

| Descriptor field | `delegate_task` field |
|---|---|
| provider | `target.providerInstanceId` of the provider whose `driverKind` matches (`claudeAgent` for `claude`) |
| model | `target.model`: the matrix model for `codex` and `grok`; for `claude:fable` and `claude:opus`, the newest catalog id of that family |
| effort | `target.options`: the model's effort option id (`effort` or `reasoningEffort`) set to the descriptor's effort |
| `read-only` access | `interactionMode: "plan"`, default `isolation` |
| `isolated-write` access | `isolation: "worktree"` |

A missing provider, missing model, or effort outside the catalog's values for that model is a dropout. Never pick the nearest catalog entry.

The child starts with only its `task`, never the parent's history. Write the complete brief into `task`: the goal, grounding paths, access mode, and the unique output location for any artifact beyond the final reply. Give every writer `isolation: "worktree"`. Never route a writer into the parent's checkout. T3 children do not receive the parent's MCP surface. Keep MCP-dependent Why and Reflect roles on a native lane, `inherit-parent`, or `auto`.

Dispatch with the default `mode: "async"` and keep each `taskId`. Start every lane, native and T3, in the same fan-out phase. T3 wakes the parent as each delegated task finishes. Do not poll with `task_status`, `sleep`, or a watcher. Read a finished task's result with `task_status` once its completion arrives.

There is no implicit timeout. Do not invent a duration from role, mode, or a convenient round number; real implementation lanes can run for 90 minutes or much longer. Cancel a lane through `task_cancel` with its `taskId` only on evidence that it is dead or no longer needed. A retry is a new `delegate_task` with a new output location.

## Completion and dropouts

A native lane succeeds when its tool transcript returns the assigned model's result. A T3 lane succeeds when all of these hold:

1. The task reached a terminal completed state with a non-empty result.
2. The echoed `providerInstanceId`, `model`, and effort option equal the assigned target. For `fable` and `opus`, the echoed model belongs to the requested family.
3. Any artifact the brief named exists at its output location.

Record the receipt for every T3 lane in the arena or review artifacts: `taskId`, child thread link, echoed provider, model, and options, terminal status, and the parent's wall-clock start and end. T3 does not report the child's token usage or cost, so do not claim them.

A provider missing from the catalog, an unavailable model or effort, a `delegate_task` error, cancellation, a failed or empty result, or a model mismatch is a dropout. Record it and apply the calling skill's existing dropout policy. Never substitute the parent model, retry another provider, or reinterpret a T3 descriptor as a native model slug.

A parent running outside T3 Code has no `delegate_task`. Every non-native lane there is a dropout, and the synthesis record says so.

Wait for every lane before judging. A judge must not read candidate paths while their owners are still writing.
