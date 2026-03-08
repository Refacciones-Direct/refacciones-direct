# Multi-Agent Workflow

This project uses Claude Code's native subagent system with three specialized agents that work together as a plan → code → review pipeline.

## Agents

### Planner (`.claude/agents/planner.md`)

**Role:** Orchestrator. Analyzes requests, produces implementation plans, delegates to Coder and Reviewer, reports results.

**Model:** Opus 4.6 — uses the most capable model for deep reasoning, architectural analysis, and plan generation.

**Access:** Read-only (Read, Glob, Grep)

**When to use:** Starting any feature, bug fix, or refactor that touches more than one file or requires design decisions. The Planner reads the codebase, breaks the work into small scoped tasks, gets your approval, then runs each task through the Coder → Reviewer pipeline.

### Coder (`.claude/agents/coder.md`)

**Role:** Implementation worker. Receives one task at a time and implements it precisely, with tests.

**Model:** Sonnet 4.6 — conserves tokens on well-scoped implementation tasks where the plan is already defined.

**Access:** Read + Write (Read, Write, Edit, Bash, Glob, Grep)

**When to use:** Typically invoked by the Planner, but you can invoke it directly for small, well-defined tasks where planning isn't needed.

### Reviewer (`.claude/agents/reviewer.md`)

**Role:** Quality gate. Reviews code changes against the task spec, runs tests, reports findings.

**Model:** Sonnet 4.6 — conserves tokens on well-scoped review tasks where criteria are clearly defined.

**Access:** Read-only + Bash (for running tests/lints)

**When to use:** After any code change, either as part of the Planner pipeline or standalone on existing code.

## Recommended Workflow

### Full Pipeline (recommended for most work)

Invoke the Planner agent with your request:

```
claude "Use the planner agent to add a shipping rate calculator to the checkout page"
```

Or from within a Claude Code session:

```
@planner Add a shipping rate calculator to the checkout page
```

The Planner will:

1. Read relevant code to understand the current state
2. Produce a numbered implementation plan
3. Wait for your approval
4. Execute each task via Coder → Reviewer
5. Present a final summary

### Direct Coder (small, well-scoped tasks)

For quick changes where you already know exactly what to do:

```
@coder Add a "lastUpdated" timestamp field to the product card component in src/components/product-card.tsx
```

### Standalone Review (review existing code)

To review code that's already written:

```
@reviewer Review the changes in src/app/api/shipping/route.ts against this spec: [paste spec]
```

Or review a set of recent changes:

```
@reviewer Review all files changed in the last commit. Check for bugs, missing tests, and convention violations.
```

## Tips

### When to use the full pipeline

- Features that touch multiple files (UI + API + database)
- Bug fixes where the root cause isn't obvious
- Refactors that need careful sequencing
- Any work touching auth, payments, or data models

### When to skip the Planner

- Single-file changes with clear scope
- Adding a translation string
- Fixing a typo
- Writing a test for existing code

### Overriding agents

- You can approve, modify, or reject the Planner's plan before execution starts
- You can tell the Planner to skip review for low-risk tasks
- You can re-run just the Reviewer if the Coder's output looks suspicious
- You can always step in and code directly — the agents are tools, not gatekeepers

### Getting the best results

- Be specific in your requests — "add shipping rates" is okay, "add shipping rate calculation using Skydropx API that shows rates on the checkout page before payment" is better
- If the Planner asks a question, answer it — it's trying to avoid building the wrong thing
- Review the plan before approving — catching issues at the plan stage is 10x cheaper than catching them in code
