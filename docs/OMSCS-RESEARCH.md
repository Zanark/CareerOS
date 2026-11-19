# Gold Circuit: Georgia Tech OMSCS study companion

Reviewed **November 19, 2026**. This is an unofficial public-source route template,
not Georgia Tech advising, an official individual degree audit, enrollment,
a transcript/GPA integration or a connected AI tutor. No actual student history,
grades, matriculation date or previous completion is included in the defaults.

[User guide](GUIDE.md#gold-circuit-georgia-tech-omscs-semesters-and-learning) ·
[Architecture](ARCHITECTURE.md#gold-circuit-academic-planning-is-not-learning-progress) ·
[Source integration](OPERATION-SOURCES.md#gold-circuit--georgia-tech-omscs-november-19) ·
[Official AI specialization](https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence)

## Degree contract and selected allocation

The reviewed [degree requirements](https://omscs.gatech.edu/degree-requirements)
call for 30 credits, including a specialization, with the actual cumulative
GPA at least 3.0. Specialization courses require B or better; free electives
require C or better. The reviewed orientation also requires two foundational
courses at B or better in the first 12 months and explains the six-year window.
Course applicability, grade history and
any exception require the actual official record.

The updated AI specialization page and
[June 2026 worksheet](https://www.cc.gatech.edu/sites/default/files/documents/2026/AI%20POS%20updated%20June%202026.pdf)
have a broader AI-core menu than the older
[general MSCS catalog](https://catalog.gatech.edu/programs/computer-science-ms/).
The selected allocation fits both: excess-core DL may fill a specialization
elective, and each course counts once.

| Selected slot | Courses | Credits |
| --- | --- | ---: |
| Algorithms/design core | CS 6515 Graduate Algorithms | 3 |
| AI core | CS 7637 KBAI + CS 7641 Machine Learning | 6 |
| Specialization electives | CS 7632 Game AI + CS 7643 Deep Learning | 6 |
| Free electives | CS 6457 VGD + CS 7650 NLP + CS 6200 GIOS + CS 7210 DC + CS 7295 GPU | 15 |
| **Total** | **Ten distinct courses** | **30** |

This is one deliberate route, not a claim that every listed course is compulsory.
For example, SDP is an eligible design-core alternative; Graduate Algorithms
is selected here for algorithm/proof depth, not because AI universally requires it.
Current [online-course listings](https://omscs.gatech.edu/current-courses) and
historical offerings do not guarantee future semesters or seats. Seminars do not
silently become degree-credit replacements.

## Learning order and practical purpose

The seven-course proposal assumes one substantial course per regular term.
It is an authored preparation sequence, not a university timetable or a promise
of a manageable weekly workload.

| Proposal position | Course | Why it is selected |
| --- | --- | --- |
| 1 | CS 7641 Machine Learning | Mathematical/experimental foundations, baselines, generalization and defensible evaluation rather than an unexplained metric. |
| 2 | CS 6200 Introduction to Operating Systems | C/Linux, threads, synchronization, memory and communication beneath an AI service. |
| 3 | CS 6515 Graduate Algorithms | Algorithm design, complexity and correctness arguments that transfer beyond a coding pattern. |
| 4 | CS 7643 Deep Learning | Tensor/autograd reasoning, PyTorch implementation and architecture experiments after ML preparation. |
| 5 | CS 7650 Natural Language | Text representations, language models, structured tasks, retrieval and evidence-aware evaluation. |
| 6 | CS 7210 Distributed Computing | Protocol state, replicated behavior, failure assumptions and systematic testing; not a universal exactly-once-effects promise. |
| 7 | CS 7295 GPU Hardware and Software | CUDA, memory/performance reasoning, architecture/compiler concepts and ML-kernel/resource tradeoffs. |

KBAI, Game AI and Video Game Design have complete companion guides as foundation
references. Their presence does **not** assert that anyone has taken or passed
them. KBAI supports explicit knowledge/reasoning; Game AI contributes planning
and decision mechanisms under game-specific goals; VGD contributes interactive
systems and implementation/team iteration. None is automatically equated to
production-agent reliability or another mission's completion.

The editable start/summer proposal and individual terms allow a different calendar.
The unsaved default uses the next regular term, never an unrequested summer.
An explicitly selected summer start is retained; the summer checkbox adds later summers.
Entered terms survive route edits. Reporting completion does not silently move
the other courses earlier. The UI warns about preparation-order inversions,
multiple substantial courses in one term and default letter-grade load limits.
It does not enforce official registration prerequisites, infer a matriculation
date or approve a six-year extension. Alternate course comparisons do not replace
the fixed ten-course template automatically.

## An infrastructure-first alternative, not extra default courses

For deeper cloud-platform engineering, compare replacing **DC and GPU** with
**AOS and SDCC**, retaining GIOS and the other selected slots. Do not quietly
add all four and call the result a ten-course plan.

SDCC's reviewed description expects strong AOS preparation, equivalent background
or consent, and mandatory weekly 90-minute live meetings. An older linked
description uses A/F grading. Current future delivery, attendance and grading must
be confirmed before selecting it. AOS's scheduler/barrier/RPC/MapReduce work
has a different emphasis from DC's protocol reasoning or GPU's hardware/kernels.
The optional comparison unit makes that opportunity cost explicit.

## Source evidence and conflicts

The focused website registry contains **37 public primary-source records**:
eight program records, seventeen course/faculty pages, nine sample syllabi and
three technical references. It is a selected subset of the broader research,
not a claim that all linked material was read in full.

[`src/domain/omscs/sources.ts`](../src/domain/omscs/sources.ts) is the maintained
per-source register. Each record includes its actual reviewed scope; the same
record appears in the relevant website course/lesson disclosure.

- Program requirements, current availability markers and dated examples have
  different authority. The orientation review covers named pages, not its entire
  45-page PDF; no personal worksheet fields were completed.
- ML's current overview and linked Fall 2026 sample disagree on instructor/content
  emphasis. Assessment/reporting details remain a dated snapshot.
- NLP's newer sample describes CPU/free-tier routes while its overview advises
  Colab Pro. The companion does not silently require a paid subscription.
- GIOS's linked sample has stale internal term wording. DC's sample has a
  date-range typo. Current actual course instructions govern.
- DL/CUDA/PyTorch references inform teaching; no executed model training, hardware
  performance, compute availability or production qualification is claimed.
- DSLabs explicitly discourages publishing assignment solutions. Exercises here
  are original independent practice; course-specific assistance/AI rules still
  govern assessed work.

## What the website records

`#/omscs` displays the semester proposal and all ten course guides.
[`courses.ts`](../src/domain/omscs/courses.ts) defines preparation, tools, syllabus
groups, dated assessments and career relevance.
[`model.ts`](../src/domain/omscs/model.ts) derives terms and conditional credits
from an optional, explicitly saved `omscsPlan`.

Completed self-reports with an unknown grade contribute only to the **reported**
total, not eligible slots. D/F contribute no passing credits. A C can qualify a
free-elective slot but not a specialization slot. These conditional counters
neither calculate the full GPA nor verify transfer/age/official applicability.
Grades and academic data remain private browser entries included in private
backups; optional encrypted publication stays manual.

The separate learning mission has **24 checkpoints / 29 units / 58 exercises**:
two program/readiness checkpoints, three modules for each proposed course and
one integrated design defense, plus three foundation references and two
choice/integrity units. [`outline.ts`](../src/domain/omscs/outline.ts) retains the
roles; [`content.ts`](../src/domain/omscs/content.ts) loads original teaching and
worked examples from [`teaching.ts`](../src/domain/omscs/teaching.ts).

Academic entries, browsing and planning create no evidence, checkpoint, streak
or Atlas EXP. Actual independent study uses the existing self-attested criteria
and save guards. Six curated graph/library connections support transfer, not
automatic equivalence; native recall scope is unchanged. No account login,
assessed solution, paid service or model integration is needed.
