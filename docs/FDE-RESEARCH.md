# Fieldcraft: a research-backed Forward Deployed Engineering roadmap

Reviewed **2026-11-09**. This is original CareerOS learning design, not an
employer-approved syllabus, a hiring forecast, a professional credential or a
claim about anyone's experience.

[Open Fieldcraft](https://zanark.github.io/CareerOS/#/mission/fde) ·
[Practice library](https://zanark.github.io/CareerOS/#/practice/fde/fde-01) ·
[Guide](GUIDE.md) · [Source register](OPERATION-SOURCES.md) ·
[Workstream](../TODO/11_FORWARD_DEPLOYED_ENGINEERING.todo)

## What the research supports

The human FDE works near a customer problem and still does substantive
engineering. In the reviewed roles, the deliverable extends beyond a demo:
discover the workflow, build/integrate a system, establish production readiness,
support adoption and return reusable findings to the product team. The exact
balance varies considerably.

| First-party role family | Observed emphasis | Do not generalize |
|---|---|---|
| [Palantir FDSE][palantir-role] | Ambiguous operational problems, customer data, end-to-end software and stakeholder collaboration | This posting's language, clearance and travel terms |
| [OpenAI FDE][openai-role] | Discovery through production, workflow impact, evaluations, adoption and reusable patterns | A universal model stack or years-of-experience threshold |
| [Anthropic FDE][anthropic-role] / [Staff FDE][anthropic-staff] | Enterprise AI applications, architecture, safety, customer delivery and operable handoff | Staff expectations as beginner gates; the staff posting explicitly accepts hands-on agent projects alongside production-systems experience |
| [Baseten FDE][baseten-role] | Hands-on customer engineering and quality/latency/cost through production | Employer marketing claims as independently measured outcomes |
| [Modal FDE, Systems][modal-role] | Infrastructure, networking, containers, migrations and technical discovery | GPU/infra specialization as the definition of every FDE |

This is a purposive sample, **not** a labor-market prevalence study. Job listings
are mutable and may disappear. Recruiting/interview processes, current vacancies,
geographic eligibility, compensation and an individual's qualification were not
independently established.

Two important search traps:

- [Palantir **AI FDE**][ai-fde-name] names a software-agent product, not the human
  occupation. Its capabilities are not human job-entry requirements.
- The reviewed [OpenAI evaluation guide][evals] carries an Evals platform
  deprecation notice. The roadmap teaches datasets, task-specific grading and
  regression methods, **not a dependency on that hosted product**.

## Five progressive research lenses

### 1. Structure: define the role and the product boundary

**HIGH confidence in the reviewed sample; limited generalizability.** The five
role families above support customer discovery plus implementation and delivery,
but differ in application, data and infrastructure specialization. Technical
judgment and communication must therefore be practiced together, rather than
tacking a sales chapter onto a coding course.

**Authored consequence:** twelve core phases cover the whole engagement. Eight
independent terrain labs preserve specialization without forcing Foundry, GPUs,
MCP, a paid model or a cloud account on everyone. This sequence is teaching
design, not a curriculum found verbatim in a source.

Implementation: [`fdeOutline`](../src/domain/forwardDeployed/outline.ts#L420)
contains the bounded curriculum; [`fdeMission`](../src/domain/forwardDeployed/mission.ts#L7)
creates its latest-only version. `catalog.ts` leaves the original nine v2
definitions frozen and appends FDE only to the latest mission list.

### 2. State flow: learning must become evidence, not assumed experience

**HIGH confidence; traced implementation.** A unit is browsable reference
material. Only the normal evidence form can save an attempt, and completion
still requires the current checkpoint, prerequisites, an artifact and explicit
criteria confirmation. The new mission starts unstarted in the background;
source browsing does not activate it or replace primary focus.

[`parseState`](../src/domain/engine.ts#L384) recognizes a missing FDE lane in an
otherwise valid schema-two workspace and adds its empty canonical default.
Explicit invalid FDE state still rejects. Strict schema-one recognition retains
the original eight-mission wire format before migration adds fresh Income and
FDE lanes. No migration event, retroactive completion or new timestamps are
invented. Existing load-time generation of a missing current-day plan remains
the normal behavior of [`loadWorkspace`](../src/useWorkspace.ts#L21).

**Authored learning consequence:** every core unit asks for a distinct artifact
and a changed-constraint retry. The full lessons in
[`content.ts`](../src/domain/forwardDeployed/content.ts) explain a mental model,
a clearly synthetic worked scenario and an inspectable outcome check. A stub
can validate integration contracts; it cannot establish model quality, GPU
performance, production reliability or actual customer impact.

### 3. Integration contracts: connect all mission surfaces honestly

**HIGH confidence; traced implementation and focused compatibility coverage.**
FDE uses the same mission identity, evidence/activity/history, backup, map,
source selector, search and graph pathways as the other missions. Its web-source
provenance is explicit: no fictitious PDF or page numbers.

[`RelatedPractice`](../src/practice/PackPractice.tsx#L43) and the graph use
[`careerSkillLinks`](../src/graph/careerSkillLinks.ts#L23): thirteen new curated
comparisons touch all nine earlier missions, with exact checkpoint identities,
specific reasons and both curriculum bases. These are navigation and reasoning
transfer, **not** completion equivalence or hidden prerequisites.

[`recordRecall`](../src/domain/engine.ts#L833) explicitly supports FDE after prior
evidence. Independent FDE recall requires explanation, diagram and exercise;
DSA's existing optional-diagram rule stays unchanged. Spacing and later
Needs-review behavior are not replaced by a new scoring system.

[`getDiscoverySnapshot`](../src/discovery/model.ts#L146) consumes validated FDE
records through the existing canonical identity logic. The finite **24**
discoveries, **seven** Wayfinder levels and their source receipts remain the
same. No new EXP ledger or career-rank field exists.

The encrypted journal is also a contract. An old nine-mission baseline is
normalized during authenticated replay; old changes can then replay before new
FDE changes are appended to the same chain. Conversely,
[`assemble`](../src/repositorySync/workspaceChanges.ts#L70) requires every mission
cell: deleting FDE in a change batch must fail, not invoke backup normalization
as a silent reset. Whole-workspace import remains a separately confirmed
replacement, not an automatic merge.

### 4. Risks and patterns: resist attractive but unsupported shortcuts

**HIGH confidence in the cited methods; environment-specific qualification
remains separate.**

| Risk | Source-supported principle | Curriculum response |
|---|---|---|
| Building the requested feature instead of solving the problem | [Discovery][discovery], [interviews][interviews], [outcomes][outcomes] | Neutral task interviews, workflow exceptions, baseline, non-build alternative and stop/go gates |
| Treating a schema or happy-path import as trustworthy data | [Transactions][postgres], [data assertions][data-tests] | Profiling, failing rows, stable identity, late updates and reconciliation |
| Assuming a login grants access everywhere | [Authorization][authorization], selected [MCP boundaries][mcp-security] | Default-deny actor/resource/action tests and tenant isolation |
| Retrying an uncertain write as if nothing happened | [AWS retry guidance][retries] | Stable operation identity, bounded retries and explicit uncertainty/reconciliation |
| Adding autonomous AI before establishing value | [Simple agent/workflow design][simple-agents], [evaluation process][evals] | Deterministic baseline, held-out task set, abstention and bounded tools |
| Grading confident text instead of completed work | [Agent evaluation][agent-evals] | End-state assertions, trace checks, calibrated graders and regression protection |
| Calling a green build a safe release | [Canarying][releases], [SLOs][slos], [telemetry][telemetry] | Exact artifacts, limited rollout, observed outcomes and a rollback drill |
| Handoff as an untested README | [Staff delivery ownership][anthropic-staff], [accessible task errors][accessible-forms] | Task-based acceptance, cold-start operator check and honest unresolved owner decisions |

Several sources are version-pinned or only partially read; the register below
and in-app citations preserve those limits. No completed lesson establishes
legal compliance or a complete security assessment.

**Product nuance:** there is still no universal shared-topic identity or
cross-mission evidence reuse. Related study can reduce relearning, but only
verified unchanged DSA append lineage shares evidence identity automatically.
The daily planner still schedules mission checkpoints; it does not deduplicate
all semantic overlap. This task does not quietly implement that larger feature.

### 5. Synthesis: think in complete, falsifiable engagements

Think of Fieldcraft as a chain from **problem evidence to an operable customer
workflow**, with engineering proof at every boundary. The portfolio should tell
one consistent story across discovery, code, data, evaluation, rollout, adoption
and handoff, rather than exhibit unrelated demos.

What that model hides: employers vary, customer permissions are not supplied by
a learning roadmap, and simulated practice is not production experience. A
completed tracker remains self-attested preparation. Actual interviews,
qualified human review, target-environment behavior and real adoption require
their own evidence.

## Curriculum and source matrix

All **48** core units are sequential evidence gates, grouped in twelve phases.
Each has two applied/transfer exercises, criterion prompts and a recovery route.
The **eight** optional units have two exercises each and create no required
completion gates: **56 browsable units / 112 authored exercises** in total.

| Core IDs | Phase and concrete deliverables | Main research basis |
|---|---|---|
| FDE-01–04 | Role matrix, reproducible local slice, authority charter, gap-driven diagnostics | Employer roles, authorization, API contract |
| FDE-05–08 | Neutral interview, exception-aware workflow, baseline/guardrails, reversible scope | Discovery, interviews, performance metrics |
| FDE-09–12 | API contract, transactional backend, usable interface, reproducible regression | OpenAPI, PostgreSQL, WAI, observability/release principles |
| FDE-13–16 | SQL profile, data contracts, restartable import, operational domain model | Data tests, transactions, retries, Ontology |
| FDE-17–20 | Access matrix, resilient API adapter, asynchronous state machine, constrained ADR | OWASP, AWS, selected MCP security, discovery |
| FDE-21–24 | AI baseline decision, held-out evaluation, authorized retrieval, validated proposals | Agent/workflow design, evaluation methods, authorization |
| FDE-25–28 | Narrow tool, bound approval, final-state grader, adversarial boundary checks | Agent evaluation, authorization, MCP boundary study |
| FDE-29–32 | Versioned rollout/rollback, correlated diagnostics, SLO, quality/latency/cost report | SRE, OpenTelemetry, Baseten/Modal roles |
| FDE-33–36 | Task-based UAT, adoption loop, incident account, cold-start handoff | Interviews, WAI, outcome measurement, delivery roles |
| FDE-37–40 | Proven reusable core, compatible evolution, product brief, responsible closeout | Employer product loops, contracts, releases, governance |
| FDE-41–44 | Truthful case study, coding/debugging attempt, customer system design, stakeholder negotiation | Reviewed engineering/customer responsibilities |
| FDE-45–48 | One integrated synthetic engagement: charter, implementation, qualification, handoff | The preceding methods, assessed on one coherent workflow |

Optional terrain: Foundry/operational ontologies; inference infrastructure;
MCP trust boundaries; restricted-data environments; multilingual evaluation;
technical-commercial discovery; batch versus streaming; independent architecture
review. The first core unit and every library source disclosure link directly
to the relevant primary sources and the exact reviewed scope.

## Review register and omissions

The canonical typed register is
[`sources.ts`](../src/domain/forwardDeployed/sources.ts#L1), shared with the
website. These are reviewed references, not twenty-four entire sources all read
in full. No long copyrighted article text, employer application form or personal
applicant data is reproduced.

| Source | Actual reviewed scope |
|---|---|
| [Palantir role][palantir-role] | Role/responsibilities/requirements; not evidence of universal entry rules |
| [OpenAI role][openai-role] | Team, role, responsibilities and candidate expectations |
| [Anthropic FDE][anthropic-role] | Role, delivery responsibilities and fit sections |
| [Anthropic Staff FDE][anthropic-staff] | Role through candidate expectations; seniority and advisory/handoff distinctions |
| [Baseten role][baseten-role] | First-party structured role description; linked blog did not yield reviewable article text |
| [Modal Systems FDE][modal-role] | First-party role/requirements text, including infrastructure emphasis |
| [Discovery][discovery] | Complete guidance; government-specific durations/process are not imposed here |
| [Interviews][interviews] | Complete guidance, including neutral questions and consent |
| [Outcome metrics][outcomes] | Complete guidance; government-mandated KPIs are not universalized |
| [OpenAPI 3.1.1][openapi] | Introduction, definitions, versions, formats and description/reference structure; not the full operation/security specification or a newest-version claim |
| [PostgreSQL transactions][postgres] | Complete tutorial; not a full concurrency/isolation reference |
| [dbt data tests][data-tests] | Overview, singular/generic assertions, failing-row semantics and examples; not the entire syntax reference |
| [OWASP authorization][authorization] | Introduction, least privilege, default deny, every-request checks and access-model trade-offs; not the entire cheat sheet |
| [AWS retries][retries] | Complete article; numeric examples are not default configurations |
| [OpenTelemetry primer][telemetry] | Complete primer |
| [SRE SLOs][slos] | Motivation, stakeholder agreement, SLIs, measurement coverage and component types through worked-example introduction |
| [SRE canaries][releases] | Release principles, risk, canary requirements/control comparison through initial worked example |
| [Building effective agents][simple-agents] | Workflow/agent distinction, patterns, trade-offs and summary; tool appendix not fully reviewed and historical tooling warning retained |
| [OpenAI eval guidance][evals] | Task process, datasets, anti-patterns, architecture risks and grader introductions, plus deprecation notice; not the whole guide |
| [Agent evals][agent-evals] | Tasks/trials, outcomes versus transcripts, grader trade-offs, capability/regression distinction through initial research-agent discussion |
| [MCP security snapshot][mcp-security] | Scope, confused deputy/consent, token-audience separation and SSRF introduction; not complete current conformance |
| [WAI validation][accessible-forms] | Complete tutorial; not a complete WCAG assessment |
| [Ontology overview][ontology] | Complete overview; vendor-specific specialization |
| [AI FDE product][ai-fde-name] | Complete overview, only to disambiguate product from human career |

Third-party bootcamp summaries, salary estimates and search-result claims were
not used as curriculum authority. The Baseten blog fetch returned a generic
shell and supplies no reviewed article evidence. A Palantir Deployment Strategist
result was discovered but not substantively reviewed; this document does not
claim a complete FDE-versus-strategist comparison.

## Verification is a separate dimension

Domain tests cover missing-only old-state normalization, strict explicit
invalid-data rejection, frozen editions, background evidence, recall guards,
source integrity and Atlas receipts. Encrypted tests construct an actual old
wire baseline plus an old change batch, authenticate/replay both, append FDE
work and reject mission deletion. Browser tests exercise real forms, maps,
sources, search, backup/import, graph reveal and isolated tutorial controls.

Those are defined checks, not a claim that a real customer engagement, hiring
outcome or deployment occurred. Current execution/publication evidence belongs
in the [workstream](../TODO/11_FORWARD_DEPLOYED_ENGINEERING.todo) and its delivery
receipt, not in employer-source claims.

### Knowledge map and open boundaries

- **Explored / HIGH:** role-family contrasts; authored curriculum sequence;
  actual catalog, parser, legacy migration, journal replay, learning, graph,
  recall and Atlas paths cited above.
- **Partially explored / explicit limits:** long API/security/evaluation/SRE
  references, exactly scoped in the register. Implementation of a specific
  protocol or provider requires its relevant current specification.
- **Unexplored:** an actual customer's workflow/data, target production
  environment, independent human acceptance and any individual's hiring fit.
- **Open questions:** which employer specialization and customer constraints
  eventually matter? Resolve them for a real engagement, not by guessing from
  a general roadmap. No current implementation depends on an answer.

[palantir-role]: https://jobs.lever.co/palantir/a8eb96f4-e39b-4c0f-b42e-610165b88f34
[openai-role]: https://openai.com/careers/forward-deployed-engineer-(fde)-sf-san-francisco/
[anthropic-role]: https://job-boards.greenhouse.io/anthropic/jobs/5391016008-109
[anthropic-staff]: https://job-boards.greenhouse.io/anthropic/jobs/5449229008
[baseten-role]: https://jobs.ashbyhq.com/baseten/84c1801c-1a65-49fb-aaaa-beeafd530e7e
[modal-role]: https://jobs.ashbyhq.com/modal/cbbbee50-3d3b-4873-8ae8-ff4b885b8e54
[discovery]: https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works
[interviews]: https://www.gov.uk/service-manual/user-research/using-in-depth-interviews
[outcomes]: https://www.gov.uk/service-manual/measuring-success/how-to-set-performance-metrics-for-your-service
[openapi]: https://spec.openapis.org/oas/v3.1.1.html
[postgres]: https://www.postgresql.org/docs/current/tutorial-transactions.html
[data-tests]: https://docs.getdbt.com/docs/build/data-tests
[authorization]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[retries]: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
[telemetry]: https://opentelemetry.io/docs/concepts/observability-primer/
[slos]: https://sre.google/workbook/implementing-slos/
[releases]: https://sre.google/workbook/canarying-releases/
[simple-agents]: https://www.anthropic.com/research/building-effective-agents
[evals]: https://developers.openai.com/api/docs/guides/evaluation-best-practices
[agent-evals]: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
[mcp-security]: https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices
[accessible-forms]: https://www.w3.org/WAI/tutorials/forms/validation/
[ontology]: https://www.palantir.com/docs/foundry/ontology/overview
[ai-fde-name]: https://www.palantir.com/docs/foundry/ai-fde/overview
