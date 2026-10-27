#!/usr/bin/env bash
# Starts the Manager: Opus at medium effort. Teammates (Sonnet, high effort) are spawned by the Manager.
# Normally you don't run this directly: `office up <account> .` runs it inside tmux with the right
# CLAUDE_CONFIG_DIR, so you can reach it from your Mac terminal, your phone and pixtuoid.
# Direct use still works:   CLAUDE_CONFIG_DIR=~/.claude-account-tq ./office.sh ["first request"]
exec claude --agent manager --model opus --effort medium --teammate-mode in-process "$@"
