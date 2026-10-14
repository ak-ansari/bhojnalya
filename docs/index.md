# Bhojnalya Knowledge Bundle

A multi-tenant restaurant OS for Indian cafés: POS + KDS + QR table ordering +
Swiggy/Zomato through middleware. This bundle holds what is true of the
**platform as a whole** — the design, the decisions, the user stories and the
cross-workspace contracts. Anything true of one workspace lives with that
workspace's code, in its own `docs/`.

## The design

- [PRD](./BHOJNALYA_PRD.md) - product requirements; IDs (M1, P4, G3, N2, …) are cited by the TRD, the ADRs and the stories
- [TRD](./BHOJNALYA_TRD.md) - technical design for the Phase 1 MVP
- [Requirements](./requirements/index.md) - the MVP as user stories, persona by persona, each with the level and test that will hold it

## The record

- [Decisions](./decisions/index.md) - numbered ADRs, one number space for the platform; numbers are never reused
- [Test cases](./test-cases/index.md) - the cross-workspace contracts, and where each workspace keeps its own catalogue
- [QA runs](./qa/index.md) - dated walks of the cases on real devices and printers
- [Conventions](./conventions/index.md) - newspaper ordering, testing levels, ADR style, documentation layers, commit messages
- [Log](./log.md) - every material change to this bundle, newest first

**Where something belongs.** A requirement, a user story, an ADR or a contract
between two workspaces goes here. A component's design, its runbook and its
test cases go with the code that implements it. If moving one app out of this
monorepo would make the document wrong, it is not a platform document.
