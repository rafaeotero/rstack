#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
fail=0

note() { printf '%s\n' "$*"; }

legacy_command_dir="$repo/plugins/rstack/commands"
if [ -e "$legacy_command_dir" ]; then
  note "FAIL: legacy command layer still exists: $legacy_command_dir"
  find "$legacy_command_dir" -mindepth 1 -print 2>/dev/null || true
  fail=1
else
  note "ok: native skills are the only user-facing workflow surface"
fi

bad_principle=""
for skill in "$repo"/plugins/rstack/skills/principle-*/SKILL.md; do
  if [ ! -f "$skill" ]; then
    bad_principle="no principle-* leaves found"$'\n'
    break
  fi
  front="$(sed -n '2,/^---$/p' "$skill")"
  printf '%s\n' "$front" | grep -q '^user-invocable: false$' || bad_principle="$bad_principle$skill (missing user-invocable: false)"$'\n'
  printf '%s\n' "$front" | grep -q '^disable-model-invocation: true$' && bad_principle="$bad_principle$skill (still carries disable-model-invocation)"$'\n'
done
if [ -n "$bad_principle" ]; then
  note "FAIL: principle-* leaves must be user-invocable: false and model-readable:"
  note "$bad_principle"
  fail=1
else
  note "ok: all principle-* leaves request user-hidden and remain model-readable"
fi

verof() { { grep -m1 '"version"' "$1" || true; } | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'; }
vc="$(verof "$repo/plugins/rstack/.claude-plugin/plugin.json")"
vx="$(verof "$repo/plugins/rstack/.codex-plugin/plugin.json")"
vm="$(verof "$repo/.claude-plugin/marketplace.json")"
vu="$(sed -n 's/| open-pstack version | `\([^`]*\)` |/\1/p' "$repo/UPSTREAM.md")"
if [ -n "$vc" ] && [ "$vc" = "$vx" ] && [ "$vc" = "$vm" ] && [ "$vc" = "$vu" ]; then
  note "ok: open-pstack version matches across UPSTREAM.md and the 3 manifests ($vc)"
else
  note "FAIL: open-pstack version differs: upstream=$vu claude-plugin=$vc codex-plugin=$vx marketplace=$vm"
  fail=1
fi

# Active configuration must use Claude's rolling family aliases. Concrete
# provider reports may still appear in runner fixtures, but no shipped
# descriptor, native-agent model field, or live test invocation may pin one.
legacy_model_pins="$(
  grep -REn \
    --include='*.md' --include='*.ts' --include='*.sh' \
    'claude:claude-(fable|opus)-[0-9]|^model: claude-(fable|opus)-[0-9]|--model claude-(fable|opus)-[0-9]' \
    "$repo/plugins/rstack" "$repo/tests" "$repo/README.md" "$repo/docs/reference.md" \
    2>/dev/null || true
)"
standalone_code_pins="$(
  grep -REn \
    --include='*.ts' --include='*.js' \
    --exclude='*.test.ts' --exclude='*.test.js' \
    "['\"]claude-(fable|opus)-[0-9]" \
    "$repo/plugins/rstack" \
    2>/dev/null || true
)"
if [ -n "$legacy_model_pins" ] || [ -n "$standalone_code_pins" ]; then
  note "FAIL: active Fable or Opus configuration still pins a model revision:"
  [ -z "$legacy_model_pins" ] || note "$legacy_model_pins"
  [ -z "$standalone_code_pins" ] || note "$standalone_code_pins"
  fail=1
else
  note "ok: active Fable and Opus configuration uses rolling aliases"
fi

# Static invariant (CHANGES maintenance note): setup-rstack's full availability
# tier owns the default panels and the four panel skills copy them verbatim.
# Panels come in two widths: arena, cross-judge, and architect run four lanes;
# how critics and interrogate reviewers run three.
setup="$repo/plugins/rstack/skills/setup-rstack/SKILL.md"
quad_of() { { grep -oE '(claude|codex|grok):[a-z0-9.-]+@(low|medium|high|xhigh|max)' || true; } | tr '\n' ' ' | sed 's/ $//'; }
# The full tier is the first fence in setup-rstack, so take the first match.
row_of() { grep -m1 -E "^$1:" "$setup" | quad_of; }
canon4="$(row_of 'arena runners')"
canon3="$(row_of 'interrogate reviewers')"
quad_bad=""
[ -n "$canon4" ] || quad_bad="could not read the 4-lane panel from $setup"$'\n'
[ -n "$canon3" ] || quad_bad="$quad_bad""could not read the 3-lane panel from $setup"$'\n'
for role in 'arena cross-judge pool' 'architect runners'; do
  got="$(row_of "$role")"
  [ "$got" = "$canon4" ] || quad_bad="$quad_bad$setup $role: [$got] != [$canon4]"$'\n'
done
got="$(row_of 'how critics')"
[ "$got" = "$canon3" ] || quad_bad="$quad_bad$setup how critics: [$got] != [$canon3]"$'\n'
# Anchor on each panel's last slug rather than a hard-coded one, so a model swap
# in setup-rstack cannot leave this check hunting for a slug nobody ships.
check_skill() {
  skill="$repo/plugins/rstack/skills/$1/SKILL.md"
  canon="$2"
  # Default to the panel's last slug; pass $3 when that slug also appears on an
  # unrelated line, as grok's does for how's explorer default.
  anchor="${3:-${canon##* }}"
  n="$(grep -Fc "$anchor" "$skill" || true)"
  if [ "$n" != "1" ]; then
    quad_bad="$quad_bad$skill: expected exactly 1 default-panel line, found $n"$'\n'
    return
  fi
  got="$(grep -F "$anchor" "$skill" | quad_of)"
  [ "$got" = "$canon" ] || quad_bad="$quad_bad$skill: [$got] != [$canon]"$'\n'
}
check_skill arena "$canon4"
check_skill architect "$canon4"
check_skill how "$canon3" "how-critics list"
# interrogate lists its panel as one slug per row of its Reviewer table (upstream #167).
interrogate="$repo/plugins/rstack/skills/interrogate/SKILL.md"
got="$(grep -E '^\| Reviewer [A-Z] \|' "$interrogate" | quad_of)"
[ "$got" = "$canon3" ] || quad_bad="$quad_bad$interrogate reviewer table: [$got] != [$canon3]"$'\n'
if [ -n "$quad_bad" ]; then
  note "FAIL: the default panels are not identical across setup-rstack and the panel skills:"
  note "$quad_bad"
  fail=1
else
  note "ok: default panels identical across setup-rstack + 4 panel skills (4-lane: $canon4 | 3-lane: $canon3)"
fi

plugin="$repo/plugins/rstack"
canon="$plugin/skills/poteto-mode/references/bugbot-triage.md"
skill="$plugin/skills/babysit/SKILL.md"
playbook="$plugin/skills/poteto-mode/playbooks/babysit.md"
bugbot_skill_rel="../poteto-mode/references/bugbot-triage.md"
bugbot_playbook_rel="../references/bugbot-triage.md"
bugbot_bad=""
if [ ! -f "$canon" ]; then
  bugbot_bad="${bugbot_bad}canonical rubric missing: $canon"$'\n'
fi
skill_op="$(grep -F 'Review-bot comments (Bugbot and similar automation):' "$skill" || true)"
skill_n="$(printf '%s\n' "$skill_op" | awk 'NF { c++ } END { print c+0 }')"
if [ "$skill_n" != "1" ]; then
  bugbot_bad="${bugbot_bad}standalone babysit skill lost bugbot-triage operational line"$'\n'
else
  skill_dest="$(printf '%s\n' "$skill_op" | sed -n 's/.*](\([^)]*\)).*/\1/p')"
  if [ "$skill_dest" != "$bugbot_skill_rel" ]; then
    bugbot_bad="${bugbot_bad}standalone babysit Markdown destination is [$skill_dest], not [$bugbot_skill_rel]"$'\n'
  fi
  if ! printf '%s\n' "$skill_op" | grep -Fq 'classify as fix, dismiss, or ask'; then
    bugbot_bad="${bugbot_bad}standalone babysit lost fix/dismiss/ask classification"$'\n'
  fi
  if ! printf '%s\n' "$skill_op" | grep -Fq "Follow the rubric's Ask by default categories, including security, data, and high-severity findings."; then
    bugbot_bad="${bugbot_bad}standalone babysit lost ask-by-default escalation"$'\n'
  fi
fi
playbook_op="$(grep -E '^8\. \*\*Bugbot is triaged skeptically, always\.\*\*' "$playbook" || true)"
playbook_n="$(printf '%s\n' "$playbook_op" | awk 'NF { c++ } END { print c+0 }')"
if [ "$playbook_n" != "1" ]; then
  bugbot_bad="${bugbot_bad}poteto-mode babysit playbook lost step-8 Bugbot operational line"$'\n'
elif ! printf '%s\n' "$playbook_op" | grep -Fq "$bugbot_playbook_rel"; then
  bugbot_bad="${bugbot_bad}poteto-mode babysit playbook step 8 lost bugbot-triage binding ($bugbot_playbook_rel)"$'\n'
fi
copies="$(find "$plugin" -name 'bugbot-triage.md' ! -path '*/node_modules/*' -print 2>/dev/null || true)"
n="$(printf '%s\n' "$copies" | awk 'NF { c++ } END { print c+0 }')"
if [ "$n" != "1" ]; then
  bugbot_bad="${bugbot_bad}expected exactly 1 bugbot-triage.md under plugin, found $n"$'\n'
fi
if [ -n "$bugbot_bad" ]; then
  note "FAIL: babysit Bugbot binding on the packaged plugin"
  note "$bugbot_bad"
  fail=1
else
  note "ok: babysit Bugbot binding on the packaged plugin"
fi

if [ "${PSTACK_STATIC_ONLY:-0}" = "1" ]; then
  exit "$fail"
fi

scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/.claude-plugin" "$scratch/skills/foo"
printf '%s\n' '{"name": "testplug", "version": "0.0.1", "description": "native skill repro"}' \
  > "$scratch/.claude-plugin/plugin.json"
cat > "$scratch/skills/foo/SKILL.md" <<'EOF'
---
name: foo
description: collision test skill
---

Say exactly: SKILL-RAN
Then stop. Do not invoke any skill or tool.
EOF

run() {
  claude -p --plugin-dir "$scratch" --model fable --effort max --max-turns 3 "$1" < /dev/null 2>&1
}

check() { # $1 label, $2 expected marker, $3 output
  if printf '%s' "$3" | grep -q "$2"; then
    note "ok: $1 -> $2"
  else
    note "FAIL: $1 expected $2, got: $3"
    fail=1
  fi
}

invoke='Call the Skill tool with skill "testplug:foo" exactly once and follow what it says.'

check "model-initiated Skill-tool invocation" "SKILL-RAN" "$(run "$invoke")"
check "user /testplug:foo invocation" "SKILL-RAN" "$(run '/testplug:foo')"

exit "$fail"
