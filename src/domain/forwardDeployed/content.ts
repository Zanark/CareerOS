import type { PackSection, RoadmapPack } from '../roadmapPacks/types';
import { fdeOutline } from './outline';

type Study = {
  model: string;
  example: string;
  transfer: string;
  check: string;
};

const study: Record<string, Study> = {
  'fde-01': {
    model: 'Think of the human FDE as an engineering owner working close to a customer problem. The reviewed roles combine implementation with discovering what is worth building and making it usable. Some specialize in AI applications, others in data or infrastructure. Job titles overlap with solutions engineering, consulting and product engineering; responsibilities are the stronger signal.',
    example: 'A matrix might show Palantir emphasizing data and operational software, OpenAI emphasizing AI workflow delivery and adoption, and Modal emphasizing infrastructure migrations. A travel clause or years-of-experience number belongs in that posting column, not in a universal prerequisites column. Palantir AI FDE search results describe a software product: exclude them as human-role requirements.',
    transfer: 'Compare a fourth employer with your original three. Explain which artifact you would show for each shared responsibility and which claim you cannot yet support.',
    check: 'Every claimed requirement points to a specific role source; your baseline names runnable evidence or explicitly says untested.',
  },
  'fde-02': {
    model: 'A vertical slice crosses enough boundaries to demonstrate one useful action. Start with a language you can maintain, a small HTTP server, a local store and deterministic fixtures. Python/TypeScript are common in the reviewed sample, not the only permitted languages. Git, tests and a clear startup command matter more than an elaborate stack.',
    example: 'Create a synthetic case with POST /cases, persist it locally, then read it back with GET /cases/{id}. A second terminal should run a smoke test from the documented setup. Stop the store deliberately: the API must return an explicit failure, not a success message with lost data.',
    transfer: 'Recreate the slice in a fresh temporary directory from your tracked sources and documented dependencies. Change the fixture ID and demonstrate the same result.',
    check: 'The result survives restart, no credential is needed, and a missing prerequisite has an actionable error.',
  },
  'fde-03': {
    model: 'Authority is per action and resource. Separate permission to inspect from permission to write, export, delete or spend. Use synthetic data by default; a real engagement needs its actual owners to approve access, retention and changes. A roadmap checkbox cannot provide that approval.',
    example: 'For a fictional document-review workflow, an analyst may read only their tenant, a reviewer may approve a proposed decision, and an operator may deploy a reviewed build. Exporting source documents to an external model is separately denied until approved. Include a stop rule when ownership or data classification is unknown.',
    transfer: 'The sponsor asks you to upload an internal spreadsheet to an external model for a quick demo. Write the immediate response, missing approvals and a synthetic alternative.',
    check: 'The answer does not upload data, assume consent or hide the blocker; it preserves a useful safe next step.',
  },
  'fde-04': {
    model: 'Use diagnostics to route learning, not to manufacture a professional rank. A small parsing task tests coding, a join tests data reasoning, an HTTP failure tests integration, and a request-path diagram tests systems thinking. Existing mission work can supply practice material; the FDE evidence should demonstrate transfer to this scenario.',
    example: 'Suppose coding and HTTP attempts work but a SQL join duplicates totals. Route a short practice session to data modeling rather than requiring completion of every System Design or Algorithm Arena checkpoint. Repeat the join with a different key cardinality and explain the original error.',
    transfer: 'Replace the initial tasks with a new CSV shape, a one-to-many join, a timeout and a tenant boundary. Record which assumptions broke.',
    check: 'Your gap plan follows observed failures, and the retry changes the input rather than memorizing the original answer.',
  },
  'fde-05': {
    model: 'Ask about behavior before preferences: the last time a task happened, what triggered it, which tools were used, where the handoff stalled and what happened next. Avoid promising a feature inside the question. Obtain consent before recording; retain only authorized notes and distinguish a role-play from actual research.',
    example: 'Instead of asking whether an AI assistant would help, ask an operator to walk through the last delayed case. They may reveal that missing approval ownership, not document summarization, is the bottleneck. A sponsor may care about backlog while the operator fears incorrect decisions: both belong in the discovery notes.',
    transfer: 'Rewrite five leading questions into neutral questions. Role-play an interview in which the first proposed solution is explicitly rejected.',
    check: 'The notes preserve concrete tasks and contradictions without converting imagined dialogue into customer evidence.',
  },
  'fde-06': {
    model: 'Map actors and transitions before components. A workflow includes information inputs, decisions, queue time, exceptions and responsibility changes. Mark manual work separately from automated work and identify the system of record. A technical integration can optimize the wrong step if waiting time dominates.',
    example: 'A case moves from intake to enrichment to analyst review to approval to notification. Missing account IDs cause a return to intake; disputed approvals enter a manual exception queue. Trace one normal case and those two exceptions before proposing a queue, model or dashboard.',
    transfer: 'Add a customer who has no account identifier and a reviewer who is unavailable. Update the diagram and identify the new owner or escalation.',
    check: 'Every exception has an explicit state and next owner; no arrow silently skips a required approval.',
  },
  'fde-07': {
    model: 'Connect purpose to a hypothesis and a measurable outcome. Define both benefit and harm: for example, less handling time without higher error or appeal rates. A baseline, denominator, window and segmentation make a number interpretable. Prototype measurements are not proof of causal business impact.',
    example: 'For 30 synthetic cases, measure minutes from valid intake to correct proposed disposition, plus incorrect proposals and manual escalations. Exclude neither failures nor difficult cases without disclosure. A lower median on this fixture demonstrates a local comparison, not savings across a real organization.',
    transfer: 'The new tool is faster only on easy cases. Recompute the result by case type and explain how an unsegmented average hid the problem.',
    check: 'Your report includes all eligible cases, failures, measurement conditions and a clear limit on real-world inference.',
  },
  'fde-08': {
    model: 'Scope is a decision contract: problem, actors, evidence, constraints, non-goals, delivery slice, success and exit gates. A discovery may justify not building. Compare existing tooling or a process correction before committing to bespoke software. Timeboxes are chosen for the engagement, not imposed by this curriculum.',
    example: 'A first slice may classify incoming synthetic requests and create a review queue, but not send final decisions. Non-goals include replacing identity, migrating all historical data and proving production ROI. Stop if authorized data cannot be obtained; switch to a labelled simulation rather than silently expanding access.',
    transfer: 'The sponsor doubles the scope but keeps the same budget. Present two smaller options, the lost outcomes and the decision that needs their ownership.',
    check: 'Acceptance remains measurable, non-goals remain visible and no unapproved commitment is disguised as a stretch target.',
  },
  'fde-09': {
    model: 'A contract separates caller expectations from implementation. Describe the request fields, response shape, error behavior, limits and compatibility assumptions. OpenAPI is a language-neutral description format; use a version you understand and verify detailed syntax against its actual specification when implementing.',
    example: 'POST /cases accepts a tenant-scoped external ID and bounded description. A malformed body is rejected; an unknown case has a defined not-found result; a duplicate key has a documented outcome. A contract test should observe the actual service, not just validate a hand-written schema.',
    transfer: 'A legacy caller sends an omitted field and an unknown enum value. Decide and test the compatibility behavior without silently coercing business meaning.',
    check: 'The documented contract and observed status/body agree on normal, invalid and incompatible requests.',
  },
  'fde-10': {
    model: 'Validate before committing and keep invariants inside the actual transaction boundary. A database transaction can atomically change local rows, but it does not automatically include an email or remote API call. Persist enough state to reconcile uncertain external outcomes instead of claiming distributed exactly-once behavior.',
    example: 'Creating a case and its initial audit entry should either both commit or both roll back. If notification fails after commit, the case still exists and notification is pending or failed. Returning an unexplained generic success would conceal a partial workflow failure.',
    transfer: 'Inject failure between case creation and audit insertion, then after commit but before notification acknowledgement. Explain the two recovery paths.',
    check: 'No local partial commit occurs, and remote uncertainty is represented rather than erased or blindly retried.',
  },
  'fde-11': {
    model: 'The UI is an operational interface. Use real labels, keyboard reachability and accessible validation messages. Keep submitted work recoverable on failure, distinguish loading from empty results, and show permission errors honestly. Client-side checks improve usability; the server must enforce the same important rules.',
    example: 'An analyst edits a case, loses connectivity and receives a visible save failure while their text remains available. A retry does not create a second case. If the backend denies access, the UI must not display cached data from another tenant or imply that a save completed.',
    transfer: 'Complete the task using only the keyboard, then repeat with a failed save, empty result and denied permission.',
    check: 'The current state is understandable without color alone, errors are associated with fields, and failed input is not lost.',
  },
  'fde-12': {
    model: 'Reproduction narrows uncertainty. Record input, expected behavior, observed behavior and the smallest environment that exhibits a defect. Use unit tests for local rules, integration tests for boundaries and one end-to-end task for the usable slice. Do not equate test count with outcome coverage.',
    example: 'A case appears saved but disappears after restart. A test that only checks the response misses the bug; an integration test that restarts the service and reads the record catches it. The runbook explains how to locate the store and correlate the failed request.',
    transfer: 'Break the serialization or persistence step intentionally. Show the failing regression, correct the defect and rerun the documented clean setup.',
    check: 'The test fails for the actual defect and passes after the correction without weakening its assertion.',
  },
  'fde-13': {
    model: 'Profile before joining or aggregating. Inspect key cardinality, null semantics, duplicate rows, distributions and freshness. A join can multiply rows without a database error. Unknown is not necessarily zero; an absent account or stale event may require an explicit quality state.',
    example: 'Ten orders joined to multiple contact rows inflate revenue. Compare row counts, distinct order IDs and totals before and after each join, then fix the intended relationship or aggregation. Keep a failing fixture showing the duplicated account rather than hiding it with DISTINCT everywhere.',
    transfer: 'Add an account with no contact, an order with a null amount and a duplicate event. Predict and then verify the effect on each query.',
    check: 'The output preserves business meaning and your quality report explains every excluded or unresolved row.',
  },
  'fde-14': {
    model: 'A data contract captures meaning as well as types: identity, ownership, freshness, allowable values and error treatment. Assertions can return the rows that violate an invariant. dbt is one implementation; plain SQL is sufficient for this practice. Reconciliation checks whether all input records are accounted for.',
    example: 'An external case ID must be unique within its tenant, an account reference must exist, and disposition must be from an agreed set. Quarantine an invalid row with its source ID and reason. A reconciliation report balances accepted, quarantined and unresolved inputs.',
    transfer: 'A producer renames a field and sends a new disposition value. Detect the change, identify the owner and propose a compatible or explicitly breaking response.',
    check: 'No bad row disappears silently and the contract distinguishes syntax errors from unresolved business meaning.',
  },
  'fde-15': {
    model: 'Incremental processing must survive retries and interruptions. Define identity, watermark or checkpoint semantics and late-update handling. Deduplication is not the same as discarding all repeated IDs: an update may legitimately change a record. State deletion and reconciliation policy explicitly.',
    example: 'Import events with stable IDs and versions. After a mid-batch failure, restart from a committed checkpoint; re-read overlap safely. A late corrected amount updates the right record rather than adding a second sale. Keep a report comparing source and destination counts and totals.',
    transfer: 'Replay the same batch, crash before checkpoint commit, deliver an older update and then a correction with the same ID.',
    check: 'State and totals match the defined semantics after each restart, including the deliberate treatment of stale updates.',
  },
  'fde-16': {
    model: 'An operational model connects what a business entity means with its relationships and allowed actions. Palantir describes an Ontology including object/link structure and actions/functions with governance. You can learn the modeling principle in plain tables and code without access to Foundry.',
    example: 'A case belongs to an account, references documents and can move to approved only through an authorized action. A graph of those relationships is not sufficient if approval can bypass policy. Trace the same action through the conceptual model, data rows and server check.',
    transfer: 'One document now belongs to multiple cases, but access differs by tenant. Update the model and explain why a shared link cannot itself grant access.',
    check: 'Identifiers, relationship cardinality and action authorization remain explicit; the artifact is labelled local modeling, not vendor deployment.',
  },
  'fde-17': {
    model: 'Authentication establishes identity; authorization decides an allowed action on a resource. Enforce least privilege, default deny and checks on every server path, including exports and background jobs. A client-supplied tenant ID is not a trusted authority boundary.',
    example: 'Analyst A changes a case ID in the URL to one owned by tenant B. The service must reject access even though A is logged in and the case exists. Repeat the test for list filtering, download, update and an asynchronous worker.',
    transfer: 'A former reviewer loses a permission while a job is queued. Define when permission is rechecked and demonstrate the denied operation.',
    check: 'The forbidden path is tested at the enforcement boundary, not merely hidden by the UI.',
  },
  'fde-18': {
    model: 'Timeout means the caller stopped waiting, not necessarily that the server did nothing. Put bounded retries in one deliberate layer, use idempotency where appropriate, respect rate limits and introduce backoff/jitter. Do not retry validation or permission errors as if they were transient outages.',
    example: 'A write succeeds remotely but the acknowledgement is delayed. Retrying with a new identity creates two cases; retrying the same idempotent request or querying its status can reconcile the first. A retry storm across three layers multiplies load just as the dependency is failing.',
    transfer: 'Simulate 429, 403, a connection refusal and a delayed successful write. Record attempts, time budget and final side-effect count.',
    check: 'Retries stay within the chosen budget and no test equates an uncertain acknowledgement with a confirmed failure.',
  },
  'fde-19': {
    model: 'Asynchronous acceptance is not completion. Define durable states, allowed transitions, deduplication identity and a failure route. Keep enough history to distinguish queued, running, completed, failed and uncertain operations. Recovery must not depend on deleting the failing message and pretending it never existed.',
    example: 'A webhook arrives twice and an older status arrives after completion. Store the event identity and ignore only duplicates or stale transitions according to an explicit rule. A poison payload becomes inspectable failed work with a safe corrected replay path.',
    transfer: 'Deliver completion before start, replay a duplicate and introduce a permanently malformed payload. Recover the corrected record without losing its earlier failure.',
    check: 'Each state transition has a reason and the operator can tell accepted work from completed work.',
  },
  'fde-20': {
    model: 'Architecture decisions are conditional choices. Capture the problem, constraints, alternatives, selected design and consequences. Customer network access, identity, data locality and support ownership can outweigh a fashionable stack. Include a trigger for revisiting the choice.',
    example: 'A local service plus SQL may meet a modest case-review workflow with fewer failure modes than microservices. If a partner cannot accept inbound traffic, a polling or outbound connector may be necessary. Document latency/freshness trade-offs rather than drawing an impossible webhook.',
    transfer: 'The customer requires offline operation for one shift and disallows inbound connections. Revise the request/data paths and ownership model.',
    check: 'The design satisfies the stated restrictions, and each major component has a necessary responsibility and failure story.',
  },
  'fde-21': {
    model: 'Start with the simplest approach that can solve the task. Distinguish a fixed workflow from an agent that decides its steps. A model adds variable quality, latency, cost and new failure modes. Evaluation determines whether that trade is justified; a persuasive demo does not.',
    example: 'A rules-based router may handle known case categories deterministically, while a model is proposed for ambiguous descriptions. Compare both on the same held-out cases and allow manual escalation. If no model is actually run, you can still test the adapter but must mark model quality and cost unmeasured.',
    transfer: 'Add cases requiring exact arithmetic and a case outside the allowed domain. Decide whether to use rules, tools, a model or abstention for each.',
    check: 'The choice follows evidence and failure costs, not the requirement to put AI in every step.',
  },
  'fde-22': {
    model: 'An evaluation set represents the job to be done, including hard and harmful cases. Keep task definitions, expected outcomes and grading rules versioned. Distinguish development iteration from held-out assessment. Model graders need calibration and should not be treated as infallible judges.',
    example: 'A document classifier dataset includes ordinary inputs, ambiguous labels, missing evidence and hostile instructions. Manually review disagreements between a code rule and a human rubric. Report the size of each slice; a high overall score can hide failures in rare but important cases.',
    transfer: 'Create five cases your current solution fails and a separate regression set for past fixes. Explain how you avoid tuning directly to the final held-out set.',
    check: 'The rubric can be applied consistently, failed cases remain visible and no arbitrary example threshold becomes a universal acceptance score.',
  },
  'fde-23': {
    model: 'Retrieval and generation are separate systems to evaluate. An answer cannot be grounded if the right evidence was never retrieved, and a citation string is not proof that the claim is supported. Filter by authorization before exposing content, then test freshness, coverage and abstention.',
    example: 'A local keyword index contains policy documents for two synthetic tenants. A tenant A question must never receive tenant B content, even when it is a better text match. For an unsupported question, return no supporting evidence instead of attaching the nearest unrelated paragraph.',
    transfer: 'Replace a policy version, revoke document access and ask a question with no answer. Trace which documents are eligible and why.',
    check: 'Forbidden content stays outside retrieval results and the evidence/answer boundary is independently inspectable.',
  },
  'fde-24': {
    model: 'Schema validation proves shape, not truth. Apply business invariants and permission checks after parsing and before any state change. Treat model output as untrusted input. A safe fallback can be explicit abstention, review or a deterministic path; it must not look like a completed business action.',
    example: 'A proposed approval JSON has valid fields but names a nonexistent case or exceeds the actor permission. Reject it before mutation and explain the failure. A synthetic response file can prove this validator works, but cannot estimate how frequently a real model produces bad proposals.',
    transfer: 'Test malformed JSON, unknown properties, an out-of-range value, an invented citation and a disallowed action.',
    check: 'None reaches accepted state and your report distinguishes adapter correctness from model behavior.',
  },
  'fde-25': {
    model: 'A good tool is a narrow capability, not a shortcut around policy. Describe inputs, output, side effects, errors, time budget and required permission. Correlation IDs and explicit partial results make debugging possible. Keep general execution and unrestricted network access out of the practice tool.',
    example: 'A get_case_summary tool reads one authorized case and returns a bounded result with a status and case ID. An update_case tool needs a separate permission and stable operation identity. A downstream timeout returns uncertainty or failure, not an empty success object.',
    transfer: 'Call the tool with missing fields, another tenant ID, oversized input and a failing dependency.',
    check: 'The contract fails explicitly and no request can expand its own authority through arguments or returned text.',
  },
  'fde-26': {
    model: 'Approval should bind to an exact preview: target, change, identity and relevant preconditions. If the preview changes, approval is stale. Separate proposing from applying and keep a record of denial, cancellation and uncertain outcomes. Human involvement is not protective if the UI hides what is being approved.',
    example: 'Preview changing case C from pending to approved at revision 4. If another actor changes C to revision 5, executing the old approval must fail for review. A timeout after execution triggers reconciliation by the original operation ID, not a fresh approval/write loop.',
    transfer: 'Modify the proposal after approval, cancel before execution and simulate lost acknowledgement after a real local state change.',
    check: 'Stale or cancelled proposals cannot execute and an uncertain result cannot create a duplicate effect.',
  },
  'fde-27': {
    model: 'Evaluate the actual end state as well as the trace. An agent can choose plausible tools and say the task is done while leaving the database wrong. Repeat stochastic trials when a real model is used and distinguish new capability tests from regressions protecting previously working behavior.',
    example: 'The transcript says a refund was issued, but the synthetic ledger contains no matching transaction. A final-state assertion catches it. A trace check additionally ensures the actor did not access a forbidden record along the way; the final total alone would miss that violation.',
    transfer: 'Create a false-success transcript, a correct result reached through a forbidden tool and a duplicate side effect.',
    check: 'Different assertions identify outcome failure, policy failure and duplicate execution rather than collapsing them into one vague score.',
  },
  'fde-28': {
    model: 'Untrusted content may ask for actions, but it cannot grant permission. Defense needs enforcement outside model persuasion: narrow tools, tenant checks, approval gates, bounded outputs and observable rejection. No small adversarial suite establishes that all attacks are prevented.',
    example: 'A retrieved synthetic document says to export all tenant records. The workflow treats that sentence as document content and the export capability is unavailable or denied. The same test with the model removed verifies that the enforcement layer does not depend on a model politely refusing.',
    transfer: 'Place misleading instructions in a document and tool response, then request an unauthorized cross-tenant read. Test the permission layer and the composed workflow separately.',
    check: 'Denied actions leave state unchanged, residual risks are documented and security is not claimed complete.',
  },
  'fde-29': {
    model: 'A release is a specific artifact and a controlled transition. Reproducible packaging, a small rollout, health comparison and rollback reduce risk. Data changes need special treatment: reverting code does not automatically restore a dropped column or undo externally sent messages.',
    example: 'Run old and new builds locally against synthetic data, route a small test cohort to the new build and compare error and task outcomes. Trigger rollback on the defined regression. Record the exact build identifier and what happens to records created during the test.',
    transfer: 'The new release changes a data format. Rehearse rollback and explain which compatibility or backup strategy protects new records.',
    check: 'The running version and recovery result are observed, not inferred from a green build or deployment command.',
  },
  'fde-30': {
    model: 'Logs describe events, traces connect a request through boundaries and metrics summarize behavior. Choose signals that diagnose user-visible failures. Correlation is useful only if it crosses API, job and dependency boundaries without logging secrets, access tokens or confidential payloads.',
    example: 'A case request returns accepted, but the enrichment job fails. A shared correlation ID links the UI attempt, API acceptance, job failure and dependency error. The operator can distinguish the pending case from a failed notification without reading the full document text.',
    transfer: 'Inject one fault at each boundary. Diagnose it using only your intended operator-visible signals, then inspect logs for accidental sensitive content.',
    check: 'Each failure can be localized and retention/redaction decisions are explicit.',
  },
  'fde-31': {
    model: 'Choose an SLI from a user journey: eligible work completed correctly within the defined expectation. An SLO is an agreed target over a window with ownership and response policy. Missing observations and excluded work affect interpretation; infrastructure availability alone may not represent successful customer outcomes.',
    example: 'Of 100 eligible synthetic case requests, 96 finish correctly within the chosen limit, two fail and two exceed it. The measured result is 96/100, with definitions and workload disclosed. A separate count of unobservable cases prevents an apparently perfect score from hiding telemetry loss.',
    transfer: 'An alert is green while jobs remain queued indefinitely. Change the SLI and calculate how the new definition changes the apparent reliability.',
    check: 'The metric follows the user outcome and a budget breach changes a named operational decision.',
  },
  'fde-32': {
    model: 'Benchmark a defined workload and report distributions, not one fastest run. Specify hardware, concurrency, input sizes, warm-up, quality and errors. Estimated vendor prices are not actual incurred cost. A mock service cannot establish model, GPU or real-network performance.',
    example: 'Run a fixed set of synthetic requests at two concurrency levels. Report median and tail latency, errors and throughput; then change one bottleneck. A cheaper model or cache is not an improvement if quality or tenant isolation regresses.',
    transfer: 'Introduce long documents and a slow dependency. Compare the earlier workload and explain which conclusion no longer generalizes.',
    check: 'Measurements are reproducible, guardrails remain visible and unsupported production claims are excluded.',
  },
  'fde-33': {
    model: 'UAT tests whether intended users can complete meaningful tasks under agreed criteria. Observe rather than coach, include errors and permission limits, and obtain consent before recording participants. Role-play is valid practice when labelled; it is not actual customer acceptance.',
    example: 'Ask a participant to find a stalled case, explain its status and recover a failed submission. Do not point to the correct button. Record task success, confusion and an observed defect; compare with the original acceptance criteria, not whether they liked the visual design.',
    transfer: 'Repeat the script after changing the error message and navigation. Include a keyboard-only attempt and a case the participant is not permitted to edit.',
    check: 'Results distinguish observed behavior from researcher interpretation and do not invent a sign-off.',
  },
  'fde-34': {
    model: 'Adoption is continued useful behavior, not a launch announcement. Identify who changes their workflow, what incentive or barrier they face, how they learn the task and how they return to a safe fallback. Measure usage separately from outcomes and causal claims.',
    example: 'Analysts use a new review queue only if it preserves context and makes exceptions recoverable. A short walkthrough, one repeat task and a named feedback owner can reveal a hidden barrier. More logins alone do not prove reduced handling time or better decisions.',
    transfer: 'Users repeatedly export data and finish work in a spreadsheet. Investigate without blaming them and propose a testable change.',
    check: 'The response treats workarounds as evidence, keeps the old workflow available where needed and measures the actual task.',
  },
  'fde-35': {
    model: 'During an incident, separate confirmed facts, hypotheses and unknowns. Contain harm, preserve diagnostic evidence and give a scoped update with the next decision/checkpoint. A root-cause claim requires a reproduced mechanism or an explicit limit; avoid certainty just to make the story tidy.',
    example: 'After a release, duplicate cases appear. Disable the affected ingestion path, preserve operation IDs and compare versions. A customer update describes the affected workflow and mitigation without exposing private data or claiming all records are repaired before reconciliation.',
    transfer: 'Run the incident with one misleading log and incomplete impact data. Write the first update, investigate, reconcile and produce the corrected final account.',
    check: 'The timeline retains the failed hypothesis and the regression reproduces the actual mechanism.',
  },
  'fde-36': {
    model: 'A handoff transfers operating capability and ownership. Include startup, identity/access prerequisites, configuration, normal tasks, signals, failure recovery, backup/restore and escalation. A README existing on disk does not prove a new operator can use it.',
    example: 'A peer starts the synthetic system, finds a failed job and recovers it using the packet. When they need an undocumented environment value, fix the guide and repeat that step. If no peer is available, label the exercise a self-tested handoff with independent validation pending.',
    transfer: 'Give the packet to a fresh reader or perform a clean-room self-check. Add a dependency failure not covered by the original demo.',
    check: 'Every required hidden step becomes explicit and unsupported target-environment claims remain pending.',
  },
  'fde-37': {
    model: 'Generalize from evidence of repetition. A second customer scenario reveals stable engineering behavior and variable business policy. Prefer a small shared core with explicit adapters over copying everything or introducing a framework for hypothetical future users.',
    example: 'Two synthetic customers share case storage, audit and retry handling but differ in approval rules and source schemas. Extract the reliable primitives while keeping policy in separate adapters. Both original scenarios must still pass; abstraction cannot erase a customer constraint.',
    transfer: 'Add a third customer with an incompatible approval model. Decide whether it fits the abstraction or deserves a separate path.',
    check: 'The decision is explained through actual use cases and no private source data is copied into reusable examples.',
  },
  'fde-38': {
    model: 'Compatibility protects actual callers and records. Preserve old fixtures, define default semantics deliberately and reject input that cannot be interpreted safely. Migration must not invent historical facts. A recovery rehearsal matters more than a successful happy-path transformation.',
    example: 'Add an optional delivery note to an old case format. Old valid records can gain an explicitly empty field, but an invalid existing value must not be reset silently. A breaking identity change needs a deliberate migration and rollback/readability policy.',
    transfer: 'Replay an old baseline and subsequent updates, migrate it and append new work. Inject a malformed explicit field and verify that it fails without overwriting the original.',
    check: 'Old records retain their meaning and the failed migration has a visible, recoverable outcome.',
  },
  'fde-39': {
    model: 'Field feedback is most useful when it preserves the user problem, reproduction, observed frequency and uncertainty. Separate a bespoke request from a reusable product gap. Propose the next experiment rather than disguising one customer request as a universal roadmap mandate.',
    example: 'Two customers repeatedly reconcile the same import discrepancy. Provide a small failing fixture, the affected workflow, workarounds and the cost of the failure. A product team can compare a validation feature against documentation or a customer-specific adapter.',
    transfer: 'A third customer contradicts your recommendation. Update the brief and identify what evidence would justify a different default.',
    check: 'The brief retains counterevidence and makes its confidence and remaining validation explicit.',
  },
  'fde-40': {
    model: 'An engagement ends when scope, outcomes, ownership and obligations are reconciled, not when the demo ends. Review open issues, retained data, temporary access, support and next decisions. Customer acceptance and technical qualification are separate facts.',
    example: 'The local pilot meets task criteria but has no real user-adoption measurement or production permission. The exit report can state the implemented capability and tested environment while leaving those gates pending. Temporary access and data-retention decisions have named owners.',
    transfer: 'The sponsor wants a success statement while one agreed criterion remains untested. Write a truthful closeout with the unresolved gate and a bounded next action.',
    check: 'No pending item is silently converted to approved, completed or independently verified.',
  },
  'fde-41': {
    model: 'A portfolio should make your engineering judgment inspectable. Show the problem, constraints, choices, artifact, failure, correction and measured result. Synthetic projects are legitimate when accurately labelled. Never claim customer scale, revenue impact or team ownership that the evidence does not establish.',
    example: 'A case study says a synthetic review system was exercised locally on a disclosed fixture with these failures and these limits. It links the repository and reproduction steps. It does not imply paid customer delivery, production rollout or measured annual savings.',
    transfer: 'Rewrite three overconfident portfolio statements into defensible claims and add the artifact or observation supporting each.',
    check: 'A reviewer can distinguish your contribution, simulation, actual execution and untested ambition.',
  },
  'fde-42': {
    model: 'Practice engineering communication while solving, not memorized narration. Clarify inputs, form a testable hypothesis, create a small failing case, implement a precise fix and discuss complexity. Distinguish missing requirements from your own assumptions.',
    example: 'An importer uses a list scan to deduplicate every row and mishandles updated IDs. Explain the identity semantics, introduce a suitable keyed structure and test duplicates versus legitimate updates. Report time/space behavior without pretending the data structure alone fixes business correctness.',
    transfer: 'Change key cardinality, input order and memory constraints. Debug an unseen defect in the same workflow under a bounded session.',
    check: 'The fix survives a changed input and your explanation includes both algorithmic and semantic trade-offs.',
  },
  'fde-43': {
    model: 'Customer-centered design begins with actors, outcomes and constraints, then moves through request/data paths, storage, security, reliability and ownership. Quantify assumptions before scaling. A clear smaller design is stronger than unexplained distributed boxes.',
    example: 'Design a document-review service for a restricted-network customer. Trace upload, permission filtering, processing, review and audit. Discuss how the design changes if documents cannot leave the network and approvals must be reversible.',
    transfer: 'The interviewer changes scale, data residency and dependency reliability. Revise the design and explicitly retire assumptions that no longer hold.',
    check: 'The new design remains coherent and you can explain what must be measured before choosing infrastructure.',
  },
  'fde-44': {
    model: 'Translate the same decision for different audiences without changing its truth. An operator needs task/recovery detail, an engineer needs mechanism and an executive needs outcome, risk and decision ownership. Disagree with unsupported expectations using evidence and a useful smaller alternative.',
    example: 'A sponsor wants autonomous approvals by Friday. Explain that only a bounded proposal-and-review workflow has been tested, identify the risk of unapproved actions and offer that slice with explicit gates. Do not use jargon to hide the gap or promise a date you cannot justify.',
    transfer: 'Give a two-minute sponsor update, a technical handoff and a response to a skeptical operator using the same evidence.',
    check: 'All three accounts preserve the same limits and state who decides the remaining trade-off.',
  },
  'fde-45': {
    model: 'The capstone integrates the earlier artifacts into one engagement. Pick a workflow with meaningful data, a human decision, a dependency and an observable outcome. Keep synthetic fixtures, charter and evaluation definitions stable enough to compare revisions.',
    example: 'Choose document-review triage: two synthetic tenants submit cases, a reviewer sees supporting documents and approves a proposed classification. The baseline is manual/rules-based; the system must not send final customer decisions. AI is optional and its quality must be measured separately if actually used.',
    transfer: 'Introduce a conflicting stakeholder and a data-access restriction before implementation. Update scope and stop/go gates without discarding the original problem evidence.',
    check: 'The charter can falsify success and every real-world approval absent from the simulation is listed.',
  },
  'fde-46': {
    model: 'The capstone implementation must connect the pieces: operator UI, API contract, persistent domain state, data checks, authorization and one unreliable boundary. A collection of disconnected notebooks or mock screenshots does not demonstrate the workflow.',
    example: 'Import synthetic cases, quarantine a bad record, show an analyst the authorized queue and create an approval preview. A retrying notification stub records side-effect identity. All paths use the same domain IDs and audit story.',
    transfer: 'Change the customer schema, retry the same import and attempt a forbidden cross-tenant action through the API rather than the UI.',
    check: 'The connected system survives those cases, and its setup and artifact version are reproducible.',
  },
  'fde-47': {
    model: 'Qualification is a bounded claim supported by observed execution. Run the frozen task set, access tests, a modest workload and a controlled failure/release drill. Report failed cases and what the environment cannot establish. Local simulation and production operation are different dimensions.',
    example: 'A receipt identifies source/build, fixture, test commands, case counts, errors and measured latency distribution. It records an incident diagnosis and rollback. If the model adapter was stubbed, quality/cost/production-model behavior remain explicitly unmeasured.',
    transfer: 'Select the strongest sentence in your outcome report and design a changed-case test that could prove it wrong. Run it or mark the claim unsupported.',
    check: 'The final report narrows claims to actual evidence instead of weakening failing assertions.',
  },
  'fde-48': {
    model: 'Defend an end-to-end outcome: why this problem, why this design, what failed, what improved, who can operate it and what remains uncertain. Completion of authored learning criteria is self-attested preparation, not professional certification, universal job readiness or a guaranteed offer.',
    example: 'Deliver a task-based demo with an error path, a cold-start operator packet, an outcome comparison and a short product feedback brief. A peer can challenge a changed requirement. If no peer/customer participated, preserve that limitation rather than inventing acceptance.',
    transfer: 'Revisit the original charter, run a new-operator scenario and defend one changed constraint. Write an honest final gap list and a next practice choice.',
    check: 'Artifacts tell one consistent story and remaining customer, production and independent-review gates stay visible.',
  },
  'fde-lab-ontology': {
    model: 'This optional terrain studies operational modeling as described by Palantir, not an employer-endorsed course. Objects and links describe entities and relationships; actions/functions and governance connect those entities to decisions. Vendor access and product behavior require their own current documentation and permission.',
    example: 'Represent a case, account and document in local tables and an authorized approval action. Compare the conceptual model to the overview, explicitly noting what your surrogate does not implement.',
    transfer: 'Add a governed cross-object action and identify which guarantees require actual platform study rather than your local model.',
    check: 'The artifact distinguishes conceptual understanding, local implementation and unverified Foundry experience.',
  },
  'fde-lab-inference': {
    model: 'Infrastructure-oriented FDE work may involve serving, containers, network/storage constraints and performance. A valid inference comparison fixes workload and quality requirements before evaluating latency and cost. Hardware availability, cloud spending and model rights remain separate constraints.',
    example: 'Draft a benchmark comparing batching choices under small and bursty requests. A local stub can verify scheduling and accounting but cannot predict GPU throughput, actual model quality or provider bills.',
    transfer: 'Change input length distribution and cold-start frequency. Revisit what would need measurement on authorized target hardware.',
    check: 'No CPU or stub result is relabelled as measured GPU/customer production performance.',
  },
  'fde-lab-mcp': {
    model: 'Protocol integration creates trust boundaries, not automatic trust. Study which client requests access, which server enforces it, how consent binds to the request and which token audience is valid. The reviewed snapshot covers selected security cases, not the entire current protocol.',
    example: 'Diagram an MCP-facing tool adapter with a denied token passthrough path and an explicit consent step. Simulate invalid audience and changed redirect/consent context without real credentials.',
    transfer: 'A downstream service asks for the original caller token. Explain and test a design that does not simply forward it.',
    check: 'Identities, audiences and consent are explicit; conformance or live integration is not claimed from a diagram.',
  },
  'fde-lab-regulated': {
    model: 'Restricted environments add requirements that engineering cannot invent: data classification, residency, retention, access, evidence and owner approvals. A technical checklist is not legal advice or a compliance certificate. Ask the qualified customer owners to resolve policy ambiguity.',
    example: 'A fictional healthcare-like document workflow uses entirely invented records. Map where data would move and where approval is needed; do not infer an actual jurisdictional requirement from the fictional label.',
    transfer: 'The customer prohibits external telemetry and requires deletion after an approved period. Revise data flows, support diagnostics and unresolved questions.',
    check: 'The design remains useful while legal/policy interpretations and actual compliance decisions stay with qualified owners.',
  },
  'fde-lab-language': {
    model: 'Task quality can vary by language, document layout and user context. Slice evaluation deliberately and use competent review; a machine translation or your own unsupported judgment is not ground truth. Regional employer language requirements do not apply to every role.',
    example: 'Create labelled synthetic document categories in a language you can review and mark a second-language slice unvalidated until a qualified reviewer participates. Test encoding and interface behavior separately from semantic correctness.',
    transfer: 'Add a mixed-language document and a locale-dependent date. Specify who can validate meaning and how ambiguous input is handled.',
    check: 'Encoding/UI tests are not presented as proof of multilingual model accuracy.',
  },
  'fde-lab-commercial': {
    model: 'Some reviewed roles cross technical delivery and pre-sales. A proof of value should test an outcome, not promise it. Make cost, procurement, technical access, success gates and exclusions visible before creating expectations.',
    example: 'A proposal estimates potential handling-time reduction but clearly labels the estimate and defines a small pilot to test it. It does not convert an optimistic scenario into guaranteed savings or a delivery contract.',
    transfer: 'A commercial stakeholder requests an unsupported performance guarantee. Offer a bounded experiment and explain the risk/decision owner.',
    check: 'The proposal preserves technical truth under sales pressure and separates estimates from observed value.',
  },
  'fde-lab-streams': {
    model: 'Choose freshness based on the user workflow and failure cost. Streaming adds operational and ordering complexity; batch can be simpler when delay is acceptable. Both need identity, replay and reconciliation rather than an unexplained exactly-once claim.',
    example: 'A nightly reconciliation dashboard may not need an event broker. An urgent review queue may need lower delay. Simulate both with late and duplicated records and compare correctness, freshness and operator burden.',
    transfer: 'A source sends corrections two days late. Explain how each design converges and what the operator sees before convergence.',
    check: 'The choice is justified by workflow needs and measured/specified behavior, not a technology preference.',
  },
  'fde-lab-review': {
    model: 'Independent criticism is useful when it can be reproduced and acted on. Provide context, constraints, diagrams, tests and open questions; invite the reviewer to challenge a concrete assumption. Approval count and confident generated praise are not quality measures.',
    example: 'A reviewer notices that replay can create a second notification. Reproduce the claim with a fixture, add a relevant regression and explain the fix. If the criticism cannot be reproduced, retain the question and narrow what you know.',
    transfer: 'Ask for one failure path your current suite misses, then turn the answer into a test or a documented unresolved risk.',
    check: 'The report attributes actual participation and does not present self-review or AI feedback as independent human acceptance.',
  },
};

const commonSections: PackSection[] = [
  { heading: 'How to use Fieldcraft', paragraphs: [
    'This is a research-backed, authored route into human forward deployed engineering. Keep it background while continuing your current focus; standalone evidence and criteria-based completion work without activation. Activate it only when you want it in the daily plan.',
    'Start at the saved current checkpoint. The session budget is one starting attempt, not a promise of mastery or a career deadline. Build small artifacts, retry changed cases and reuse relevant learning from other missions without claiming automatic equivalent completion.',
  ], items: [] },
  { heading: 'Evidence and retained understanding', paragraphs: [
    'Save a title, actual artifact and meaningful account of what you did, observed and could not verify. A completed action, timer or tutorial is not completion evidence. Confirm checkpoint criteria only when your attempt supports them.',
    'FDE recall requires prior evidence and is separate from completion. Close the notes, explain the decision, reconstruct a workflow or architecture diagram and solve a changed practical case. Record needs-review honestly; spaced independent reviews use the same retention rules as DSA/System.',
    'Discovery Atlas and the Wayfinder read saved FDE evidence and eligible recall through the existing finite discovery system. Browsing lessons, unlocking cosmetics or repeating an animation does not create progress.',
  ], items: [] },
  { heading: 'One safe, coherent practice environment', paragraphs: [
    'Use invented tenants, accounts, cases and documents in a local repository. A small API, interface and SQLite/PostgreSQL-style store are enough; choose languages you can maintain. Vendor accounts, paid models, cloud/GPU resources and real customer access are optional and require separate authorization.',
    'A stub is useful for API contracts, fault injection and permission tests. It cannot measure real model quality, GPU speed, production reliability or business impact. Distinguish executed local results, hypothetical estimates and unrun experiments in every report.',
  ], items: [] },
  { heading: 'Source and career limits', paragraphs: [
    'Linked sources are primary role descriptions and technical/user-research guidance reviewed on 2026-11-09. The source register records partial reading scopes. Employer listings and live docs can change; consult current requirements for an actual application.',
    'The 48-checkpoint order, two exercises per unit, completion criteria and optional labs are original teaching design, not an official employer syllabus. A completed mission is self-attested preparation, not professional certification, a hiring guarantee or permission to act in a customer environment.',
    'Do not confuse Palantir AI FDE, a software-agent product, with the human occupation. Do not require OpenAI Evals platform: the reviewed notice describes its deprecation; use transferable evaluation methods and suitable current/local tooling.',
  ], items: [] },
];

const pack: RoadmapPack = {
  ...fdeOutline,
  commonSections,
  units: fdeOutline.units.map(unit => {
    const lesson = study[unit.id];
    if (!lesson) throw new Error(`Missing Fieldcraft study guidance: ${unit.id}`);
    return {
      ...unit,
      sections: [
        { heading: 'Mental model', paragraphs: [lesson.model], items: [] },
        { heading: 'Worked scenario / synthetic', paragraphs: [lesson.example], items: [] },
      ],
      exercises: [
        { title: 'Build the evidence', level: 'Applied', task: unit.action,
          check: unit.criteria.length ? unit.criteria.join(' ') : lesson.check },
        { title: 'Change the constraints', level: 'Transfer', task: lesson.transfer, check: lesson.check },
      ],
    };
  }),
};

export default pack;
