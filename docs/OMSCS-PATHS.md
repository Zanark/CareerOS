# OMSCS AI path explorer

**Local review candidate. Not published or approved by the owner.**
Public sources reviewed November 19, 2026.

The path explorer at `#/omscs/paths` compares subject choices without replacing
academic records, learning checkpoints or the existing Gold Circuit study template.
The program is **Georgia Tech OMSCS**; its CareerOS codename is **Gold Circuit**.
The display rename changes no saved mission, checkpoint, course or journal identity.
It is a temporary what-if tool, not university advising, registration or an
official individual degree audit.

## What is counted

OMSCS requires **10 courses / 30 credits**, not ten credits. AI uses five
courses / 15 credits: one algorithms/design course, two AI-core courses and two
specialization electives. The remaining five courses / 15 credits are free
electives. Each subject is counted once.

Reported completed courses reduce a conditional planning budget. Unknown grades
are disclosed, not treated as verified credit. Specialization roles require B
or better, free electives C or better, and the actual cumulative GPA must be at
least 3.0. D/F attempts do not reduce the passing-credit budget; an entered C
cannot silently satisfy a B-minimum specialization slot.

No example in source is a real student record. Actual personal history, when
explicitly supplied for a local preview, stays outside repository source,
issues, shared continuity and production output.

## Complete menus, not one prescribed route

The **current OMSCS AI page** offers two online algorithms/design choices, six
online AI-core choices and six explicit online electives. It also permits unused
core courses as electives, including the other algorithms/design choice.
The complete online choice system has **1,650 role allocations across 830
distinct five-course sets**. These are different dimensions: the same subjects
can sometimes fill the slots in more than one way.

The **conservative catalog comparison** uses AI/KBAI/ML for the two AI-core
slots and nine electives explicitly shared with the older general MSCS table.
It does not assume the newer excess-core exception for that older table. This
lens has **216 distinct allocations/subject sets**. It is an intentionally
conservative comparison, not a declaration that the student's official record
must use one rule set or that an exception has been approved.

The UI includes the twelve additional current-page campus choices not marked
online, plus four topic/course references appearing only in the older table.
They are references, not selectable online degree slots in this snapshot.
For example, the presence of a Large Language Models title in the formal
campus menu does not establish an available online OMSCS section.

Completed compatible courses can be reused in different legal roles. Filtering
for maximum reuse finds efficient plans; other allocations can require more new
specialization subjects and leave fewer new free-elective choices. The ten-course
total remains the target. An explicit grade conflict stays visible.

## Free electives are genuine choices

The reviewed public catalogue has **78 regular-course entries**, including
13 whose subject code is neither CS nor CSE. All are browsable/searchable;
course-topic identities remain distinct rather than collapsing CS 8803 topics.
The planner enforces the maximum six non-CS/CSE credits, represented as two
three-credit courses. Seminars are one-credit pass/fail and do not count.

The selected free subjects are replaceable editorial suggestions. Clear them,
choose another capability-oriented example, or build a custom set. Existing
selections are never silently discarded when a specialization change creates
a duplicate or overfilled budget; the conflict is shown with removal controls.

Free-choice counts describe the compatible completions of the *currently
selected* allocation. They are not summed across specialization sets as a
misleading global count of unique complete degrees, and millions of complete
plans are not materialized into the DOM. Pagination covers the entire filtered
specialization/course catalogue, not a hidden truncated subset.

Capability areas and example bundles are authored navigation. Ten original
OMSCS companion courses retain detailed guides; additional reviewed overview
pages have short comparisons. For other catalogue entries, the disclosure explicitly says
that only identity/availability metadata was reviewed. A title alone is not
presented as a semantically reviewed complete syllabus or workload estimate.

## Semester and return checks

The calendar uses only selected new subjects. One regular-term course is the
default; later summers and a two-course heavy regular-term scenario are
explicit controls. Summer stays one course. Recommended preparation order is
guidance, not an invented university prerequisite gate. SDCC's listed strong
AOS-level preparation and weekly 90-minute live attendance remain explicit.

The Registrar's current return policy triggers a readmission check after
three or more consecutive absent terms, **including summer**. Approval is not
guaranteed and the explorer does not know whether it has already been granted.
The general Spring deadline is December 1 in the preceding year; other
standings have earlier deadlines. Confirm the current applicable conditions.

The same policy says readmission uses the catalog current at return; retaining
an older one requires a separate approved request. This matters alongside the
disagreement between the OMSCS specialization page and general catalog.

The program requires two foundational B-or-better courses in the first
12 months. Foundational markers are preserved, but unknown grades do not verify
that condition. Its FAQ describes credits as valid for six years from the
semester earned. Breaks and readmission do not automatically renew old credits.
Six-year warnings are watchpoints for official confirmation, not fabricated
graduation deadlines or extensions. Incomplete subject choices are never
labelled a complete graduation estimate.

## Implementation and privacy boundary

`src/domain/omscs/paths` owns the static public catalogue, explicit rule lenses,
complete role/set enumeration and pure budget/calendar functions.
`src/omscs/paths` loads separately and keeps draft choices in component memory.
There is no new workspace schema, storage key, journal cell or academic save.
The original mission's 24 checkpoints and source/recall/Atlas rules are unchanged.

A private local review process may supply validated planning context in a
development-only document node. That process and its input file are outside
the repository; production ignores the node and never imports the private data.
It uses a distinct loopback port/cache without restarting the existing preview.
No actual browser profile is automated, and the draft grants no progress or XP.

## Primary sources and review scope

- [Current AI specialization](https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence): complete menu, bold online distinction and unused-core rule.
- [Degree requirements](https://omscs.gatech.edu/degree-requirements): thirty credits, specialization/free grade floors, GPA and non-CS/CSE cap.
- [Current courses](https://omscs.gatech.edu/current-courses): complete 78-entry regular list, foundational markers, seminar exclusion and future-offering limitation.
- [General MSCS catalog](https://catalog.gatech.edu/programs/computer-science-ms/): program rules and the complete conflicting AI table; not every unrelated specialization was reviewed.
- [Return after three terms](https://registrar.gatech.edu/info/readmission-policy/readmission-after-being-away-three-or-more-consecutive-terms): absent-term trigger, approval and readmission catalog policy.
- [Registrar deadlines](https://registrar.gatech.edu/alumni/readmission): applicable deadline table and current return-process limitations, not a student's application/account.
- [OMSCS FAQ](https://omscs.gatech.edu/prospective-student-faqs): foundational and semester-based six-year credit guidance.

The extra HCI, cognitive science, health informatics, educational technology
and AI ethics course overviews/readiness pages were reviewed directly. Their
gated content and full dated syllabi were not accessed or represented as read.
Existing OMSCS research receipts retain their original scope separately.
