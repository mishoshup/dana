# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [correction] Direct code edits violate Pantheon workflow

**Date:** 2026-05-10
**Source:** Danial correction

After establishing the Pantheon workflow (all code changes through sub-agents), I directly edited `src/middleware.ts` to fix an edge runtime crash. This violates the rule.

**Correct process:**
- Always spawn a Pantheon fixer agent for ANY code change
- Even "quick" fixes must go through a sub-agent
- The agent gets full context and writes a summary to `.planning/`

**See Also:** AGENTS.md section on Pantheon Delegation
