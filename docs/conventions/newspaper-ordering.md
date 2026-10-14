---
type: Convention
title: Every file reads like a newspaper
description: Source files and documents put the most important thing first — purpose and public surface at the top, each detail after the thing that needs it — so a reader can stop at any point and still know what the file is for.
tags: [conventions, code-style, documentation]
origin_repo: ghatnaghar
timestamp: 2026-10-14T00:00:00Z
---

# Every file reads like a newspaper

Start with the *what*, then reveal the *how*. A reader who stops after the
first screen of any file — code or prose — should already know what it is for
and how to use it. Adopted from ghatnaghar unchanged in substance. Source:
[Newspaper-like source code](https://chaitanyas.dev/blog/newspaper-like-source-code/).

# How to apply

## Source code

- **Headline first.** The module doc comment, then the public surface: the
  exported functions, types and classes, the Nest module or controller, the
  React component the file is named after. Private helpers come after.
- **Stepdown rule.** Each function is followed by the functions one level of
  abstraction below it, in the order it calls them. A helper sits after its
  first caller, never before it.
- **Shared helpers sink.** A helper used by several callers goes after the
  first of them; general utilities used everywhere go at the bottom.
- **Stay valid where the language needs define-before-use.** TypeScript
  `function` declarations hoist, so they can be ordered freely. A `const` that
  is *read* at module load (a Zod schema another schema extends, a lookup
  table) must still precede its use; imports stay at the top.
- **Tests read the same way.** The test that states the main promise comes
  first; edge cases and test helpers follow.
- **Generated code is exempt**: lockfiles, generated OpenAPI, migrations once
  merged.

## Documentation

- **Inverted pyramid.** Answer before reasoning: the decision, rule or result
  first, then why, then the detail. A runbook starts with the command.
- **Lead sentence carries the page.** The first paragraph after the title
  states the whole point; later sections only elaborate it.
- **Index entries lead with the topic**, then a one-line gist.

## What this does not mean

- It is not a licence to reorder on sight. Reordering a file is a change of
  its own: do it in a commit that changes nothing else, so the diff of a real
  change stays readable.
- Order within a template still wins where one exists — ADRs keep Nygard's
  Date / Status / Context / Decision / Consequences, test cases keep Given /
  When / Then.

# Why

We write a file once and read it many times; the compiler does not care about
order, readers do. A file that defines its helpers first makes the reader
assemble the story bottom-up before learning what it is for. Putting the
public surface on top also draws a natural boundary: details below it can
change without touching the story above.
