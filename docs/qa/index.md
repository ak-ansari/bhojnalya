# QA runs

Dated records of a person (or an agent driving a browser) walking test cases'
**Procedures** on real devices, printers and the real API. A run says what was
true that day and is never edited afterwards. Why this level exists, and what
it may keep: [testing levels](../conventions/testing-levels.md#qa).

File a run as `YYYY-MM-DD-<what-was-walked>.md` with frontmatter
`type: QA Run`, then **Environment** (stack, build, devices and printers, what
could not be reached), **Result by case** (PASS / FAIL / BLOCKED with notes),
and **Defects** (each with the lowest-level test that now catches it, or why
none can).

The release device matrix: Windows Chrome and Edge, Android Chrome on a
low-end phone, iPad Safari as an installed PWA; 80 mm and 58 mm thermal
printers.

No runs yet.
