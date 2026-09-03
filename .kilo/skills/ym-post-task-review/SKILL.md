---
name: ym-post-task-review
description: >-
  Use after every implemented task, code change, or attempted feature completion.
  Enforces mandatory verification steps and documentation updates before marking
  any work as done. Prevents premature completion claims.
metadata:
  category: workflow
  source:
    repository: 'https://github.com/PROmarket/market'
    path: .kilo/skills/ym-post-task-review
    license_path: LICENSE
    commit: main
---

# Yalla Market — Post Task Review

## Purpose

This skill enforces a mandatory post-task verification workflow after every
implementation step. It prevents claiming completion before the project is
actually working.

## When to Use

Trigger this skill automatically after:
- completing any task from Sprint Brief
- modifying API routes, pages, components, or Prisma schema
- running migrations or seed scripts
- refactoring existing code
- any change that affects runtime behavior

## Mandatory Steps

Execute these steps in order. Do not skip any step.

### Step 1: Type Check

Run:

```shell
npx tsc --noEmit
```

Requirements:
- Command exits with code 0
- No TypeScript errors in output
- No `@ts-ignore` violations unless explicitly documented

If this step fails: stop, fix errors, retry. Do not proceed.

### Step 2: Build

Run:

```shell
npm run build
```

Requirements:
- Command exits with code 0
- No build errors
- Production bundle generated successfully

If this step fails: stop, fix errors, retry. Do not proceed.

### Step 3: Lint

Run:

```shell
npm run lint
```

Requirements:
- Command exits with code 0
- No ESLint errors

If this step fails: stop, fix errors, retry. Do not proceed.

### Step 4: Done Criteria Verification

Read the current Sprint Brief and verify every Done Criterion for the
completed task:

- [ ] Each criterion is met by the implemented code
- [ ] No criterion is partially implemented without acknowledgment
- [ ] Edge cases mentioned in the spec are handled

If any criterion is not met: document the gap, do not mark task as complete.

### Step 5: Documentation Sync

Update project documentation if the change affects:
- API routes or request/response shapes → update relevant docs
- Prisma schema changes → note in schema changelog if applicable
- New files or routes → ensure they are referenced where appropriate
- Sprint progress → update PROJECT_STATUS.md checkboxes

### Step 6: Final Gate

Before claiming completion, confirm all of the following are true:
1. `tsc --noEmit` passed
2. `npm run build` passed
3. `npm run lint` passed
4. All Done Criteria for the current task are met
5. PROJECT_STATUS.md reflects the current state

If any item is false: the task is NOT complete. Return to implementation.

## Anti-Patterns

Do not:
- Claim "done" without running all verification steps
- Skip build or type check because "it works in dev"
- Mark Sprint criteria as complete without evidence
- Update status docs before code actually works
