# Conventions

How code and documentation are written here, and how the product decides what
to test where. Adopted from ghatnaghar (`solar-square/ghatnaghar`, `staging`)
and adapted to a TypeScript monorepo with an offline POS. They apply to every
workspace.

- [Newspaper ordering](./newspaper-ordering.md) - every source file and document puts the most important thing first: public surface on top, each helper after its first caller, answer before reasoning
- [Testing levels](./testing-levels.md) - a promise is tested at the lowest level that can falsify it: unit, component, integration, contract, e2e, user story, QA
- [ADR style](./adr-style.md) - record the decision and its rationale at the concept level, never the implementation; the ADR format
- [Documentation layers](./documentation-layers.md) - why the PRD and TRD may disagree with the code on purpose, and why test cases may not
- [Commit messages](./commit-messages.md) - Conventional Commits: a type, an optional scope and an imperative subject, then a body that argues for the change
