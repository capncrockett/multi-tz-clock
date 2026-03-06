# Agent Guard Rails

These instructions apply to any coding agent working in this repository.

## Operating Contract

The required workflow is:

1. User gives a prompt.
2. Agent inspects the repo and makes the smallest coherent change that satisfies that prompt.
3. Agent runs relevant tests while developing.
4. Agent commits before stopping work on that prompt.
5. Agent leaves the repo in a clean state before the next prompt starts.
6. Push happens only when the chat session is complete or the user explicitly asks for it.

Do not carry uncommitted work from one user prompt into the next. If the topic pivots, commit the current state first.

## Hard Rules

- Commit after every prompt-sized unit of work. Do not wait until the end of a long session.
- Never start a new prompt with a dirty working tree.
- Do not bundle unrelated changes into one commit.
- Do not use `git commit --no-verify`.
- Do not disable or bypass git hooks.
- Do not push without explicit user approval or an explicit session-close instruction.
- Do not amend, rebase, reset, or force-push unless the user asks for it.
- If tests fail, fix the issue or revert the broken work before handing control back.
- If a prompt expands beyond the original scope, checkpoint the current work in a commit before continuing.

## Commit Rules

- Use a conventional-style commit message: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `chore: ...`, `build: ...`, `ci: ...`, or `revert: ...`.
- The subject must describe the change clearly. Messages like `wip`, `update`, `stuff`, `tmp`, or `fix` are not acceptable.
- One commit should represent one coherent checkpoint that is safe to roll back independently.

## Testing Rules

Agents must run the smallest relevant test set during development, then allow the hook to enforce the final pre-commit gate.

- Changes to `assets/js/clock-utils.js`, `tests/unit`, `tests/integration`, or `jest.config.cjs`: run `npm run test:node`
- Changes to `index.html`, `assets/js/app.js`, `assets/css/main.css`, `tests/e2e`, or `playwright.config.js`: run `npm test`
- Docs-only changes: tests may be skipped unless behavior or tooling docs changed

The repository hook runs the full test suite before each commit for non-doc changes. Treat that as a safety net, not your first feedback loop.

## Clean Tree Requirement

Before a commit is created, the working tree must be fully accounted for:

- no unstaged tracked changes
- no untracked files that belong to the change
- no leftover debug artifacts

Each commit should leave the repository ready for the next prompt to begin from a clean checkpoint.

## Recommended Session Discipline

- Start each task with `git status --short`
- Finish each task with `git status --short`
- If the user says "keep going" on the same topic, make another small change and create another commit
- If the user pivots, checkpoint first, then pivot

## Review Bias

When unsure, prefer the safer option:

- smaller commit
- narrower scope
- more tests
- earlier checkpoint
- clearer rollback path
