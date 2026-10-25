#!/usr/bin/env bash
# TaskCompleted quality gate.
# Runs the project's lint / typecheck / test scripts (whichever exist in package.json).
# Exit 2 = block the task from being marked complete and send the output back to the dev.
# Exit 0 = allow.
# Set OFFICE_SKIP_CHECKS=1 to disable temporarily.

[ "${OFFICE_SKIP_CHECKS:-0}" = "1" ] && exit 0

# The hook payload arrives on stdin as JSON; use its cwd if present (teammates may work in other dirs).
payload="$(cat)"
dir=""
if command -v jq >/dev/null 2>&1; then
  dir="$(printf '%s' "$payload" | jq -r '.cwd // empty' 2>/dev/null)"
fi
dir="${dir:-${CLAUDE_PROJECT_DIR:-$PWD}}"
cd "$dir" 2>/dev/null || exit 0

# Only Node projects are checked by default. Add your own stack below if needed.
[ -f package.json ] || exit 0

# Pick the package manager the project uses.
pm="npm"
[ -f pnpm-lock.yaml ] && pm="pnpm"
[ -f yarn.lock ] && pm="yarn"
[ -f bun.lockb ] || [ -f bun.lock ] && pm="bun"

# Tests go through the machine-wide test gate (installed by the office kit) so several offices
# finishing tasks at once can't all run the full suite in parallel.
GATE=""
if command -v test-gate >/dev/null 2>&1; then GATE="test-gate"
elif [ -x "$HOME/.office/bin/test-gate" ]; then GATE="$HOME/.office/bin/test-gate"; fi

has_script() {
  node -e "const s=require('./package.json').scripts||{}; process.exit(s['$1']?0:1)" 2>/dev/null
}

failed=0
report=""
for script in lint typecheck test; do
  if has_script "$script"; then
    if [ "$script" = "test" ]; then
      if [ -n "$GATE" ]; then
        out="$(CI=1 OFFICE_GATE_MAX_WAIT=600 "$GATE" unit -- $pm run test 2>&1)"
      else
        out="$(CI=1 $pm run test 2>&1)"
      fi
    else
      out="$($pm run "$script" 2>&1)"
    fi
    rc=$?
    if [ $rc -eq 75 ]; then
      report+=$'\n'"### Tests could not run right now (queued too long or stopped for memory). Not a test failure: wait for memory to recover, then mark the task complete again."$'\n'
      failed=1
    elif [ $rc -ne 0 ]; then
      failed=1
      report+=$'\n'"### '$pm run $script' failed:"$'\n'"$(printf '%s' "$out" | tail -n 40)"$'\n'
    fi
  fi
done

if [ $failed -ne 0 ]; then
  echo "Task not complete: project checks are failing. Fix these, then mark the task complete again.$report" >&2
  exit 2
fi
exit 0
