import type { PackSection, PackUnit, RoadmapPack } from '../roadmapPacks/types';
import { agentCloudUnits, extendNeuralOutline } from './outline';

type Study = { model: string; example: string; transfer: string; check: string };

const studies: Record<string, Study> = {
  'neural-agent-control': {
    model: 'Cloud APIs, infrastructure-as-code and reconciliation were already machine interfaces. The new problem is combining flexible model reasoning with dependable execution. Separate infrastructure that runs agents, agents that propose engineering changes, agents that operate services, and independently evaluated improvement of those systems. The planner must not be the sole owner of its permissions or success criteria.',
    example: 'For a fictional checkout service, an ordinary controller maintains a declared replica count. An agent investigates an unfamiliar latency pattern and proposes a change. A policy owner constrains that proposal, an executor applies an admitted action, and a separate verifier checks health. Replacing the replica controller with a model adds uncertainty without automatically adding value.',
    transfer: 'The model provider becomes unavailable during an incident. Redraw the stop, deterministic recovery and human handoff paths without assuming the agent can repair its own missing dependency.',
    check: 'Every vertical diagram box has a responsibility, evidence input and owner. Identify one task where ordinary software is preferable and one where interpretation may justify a model.',
  },
  'neural-agent-runtime': {
    model: 'Model inference and tool execution are different compute systems. Choose execution boundaries for the actual workload: generated code, browser work, a live interpreter or an addressable task that mostly waits. AgentCore documents session isolation but customer-owned user/session binding and execution-role credentials accessible to code in the VM. Foundry places its blueprint credential outside the hosted sandbox; this does not remove every possible downstream token or authority.',
    example: 'Compare a fake two-minute code job with a workflow waiting a day for approval. The first needs bounded CPU/filesystem/egress; the second needs persisted identity and events, not a VM kept alive for a day. Modal distinguishes Created, Started and Ready, offers gVisor or VM runtimes, and does not automatically terminate a sandbox after a readiness-probe timeout.',
    transfer: 'A process starts but its dependency installation fails. Specify the readiness evidence, visible failure, retained sandbox/job ID, cleanup owner and spending limit. Change the design for an approval wait that outlives the interpreter.',
    check: 'The decision record compares guarantees, not vendor slogans. List what persists, where credentials can be reached, who binds a tenant/session, and which price/region/preview assumptions remain unqualified.',
  },
  'neural-agent-authority': {
    model: 'An authenticated agent identity is not authorization, delegated user intent or action approval. Trace the caller, tenant, agent/session, token audience, downstream scope and resource policy separately. Least privilege constrains the possible harm even if the model selects an incorrect instruction. Approval hierarchy also matters: a UI mode is not necessarily the root of policy.',
    example: 'An Azure SRE Agent can have permission to reach a resource while Review mode asks about infrastructure writes. Response plans/tasks have their own mode defaults. Its documented administrator user-hook allow can override global tool-policy deny; that is an approval override, not a new RBAC grant. A read-only Azure role does not make a separately credentialed email tool read-only.',
    transfer: 'Write truth-table rows for resource deny plus hook allow, tool ask plus Autonomous mode, and a changed plan after approval. Specify which layer decides each row and who can change that layer.',
    check: 'Resource denial still denies the resource operation. Govern administrative overrides separately, tie admission to exact parameters/expiry, and do not claim that a system prompt or MCP support supplies authorization.',
  },
  'neural-agent-durability': {
    model: 'Conversation history, cross-session semantic memory, workflow checkpoints and actual resource state answer different questions. Cloudflare durable agents can wake and sleep; ordinary variables, timers and open requests do not survive like persisted state. LangGraph checkpoints support recovery but interrupted node code can restart. Neither runtime makes every external side effect atomic.',
    example: 'Use a local fake create API: persist action A, commit one resource, discard the response and restart the caller. A second request with the same stable identity should locate/reuse the original effect under the declared API contract. Reusing the identity with different parameters must reject; finite idempotency retention must cover the retry horizon.',
    transfer: 'The remote service offers no idempotency contract and its inventory is temporarily incomplete. Represent an uncertain outcome and block a second create until the original action is reconciled. Then test cancellation after the first commit.',
    check: 'A timeout is not proof of failure, an empty read is not proof that no effect occurred, and cancellation is not rollback. Preserve intent, observed state, compensation limits and the next accountable decision.',
  },
  'neural-agent-tools': {
    model: 'A useful agent-facing operation describes input/output shapes, identity, target, preconditions, effects, retries, completion, verification and errors. MCP provides a tool surface and an HTTP authorization profile; A2A provides task/message/artifact collaboration. Neither gives universal business authorization or cross-system transactions. Treat retrieved documents and tool annotations as data unless their authority is established.',
    example: 'Define read_service_snapshot and propose_release_restore in a local fixture. Return observed revision, source timestamps, tenant binding and explicit errors. The proposal tool cannot deploy anything. A compact search/execute interface can avoid loading thousands of schemas, but permitted API actions still need policy and the correct target.',
    transfer: 'A retrieved runbook contains an instruction to disable logging. Show how provenance and policy prevent it becoming administrative authority. Then change a tool schema version and make the old caller fail explicitly.',
    check: 'The contract is precise enough for another implementer to test. No hidden credential, unrestricted shell or plausible prose silently supplies a missing guarantee.',
  },
  'neural-agent-development': {
    model: 'A productive engineering worker includes a reproducible repository snapshot, prepared dependencies, relevant context, useful tests and an authorized review path. Stripe reports deterministic blueprints interleaving agent work and ordinary tooling, with bounded CI rounds and human-reviewed PRs. GitHub and OpenAI describe credential, sandbox and approval controls; those controls are product/deployment-specific rather than universal guarantees.',
    example: 'Create a synthetic configuration migration. Pin the input revision, change one setting, run deterministic syntax/behavior checks and produce a diff plus a receipt of actual results. Inject a failing test and allow a bounded repair attempt; unresolved work returns with its failure intact instead of claiming success.',
    transfer: 'The change passes tests but attempts to invoke a privileged deployment workflow. Reject publication outside the task envelope. Recreate the workspace from a clean fixture and identify which warm setup cost is being amortized.',
    check: 'The artifact is reviewable and tied to the checked revision. Setup/check/approval steps do not depend entirely on the model remembering them. Report actual human review and rework, not PR count as causal productivity.',
  },
  'neural-agent-operations': {
    model: 'Operational work happens against changing state. Separate observation, hypothesis, candidate plan, admission, execution and independent verification. Define the allowed target/revision, action class, budget, expiry and recovery owner before a write. Retain the correct no-op on a healthy system; an agent rewarded only for changes can harm a service by over-intervening.',
    example: 'Use invented telemetry for a canary checkout deployment. An investigator proposes restoring one approved artifact, but cannot execute arbitrary commands. The broker rechecks revision and permission. A fake executor changes one canary; a verifier checks latency, errors and a dependent-service invariant across a declared window.',
    transfer: 'Repeat with healthy telemetry, missing observations and a concurrent human deployment. The correct outcomes may be no-op, escalation and stale-plan rejection, not three automatic rollbacks.',
    check: 'Distinguish a correct diagnosis from verified restoration. A tool exit code, one green sample or an eloquent summary is insufficient; report partial/uncertain outcomes and collateral effects.',
  },
  'neural-agent-recovery': {
    model: 'Agent platforms depend on identity, model access, networking, state and tools. Keep stop/revoke and recovery paths outside the acting agent. Long-running work also needs version compatibility: Anthropic describes preserving compatible versions for in-flight agents. This is not permission to keep a compromised version running or to assume old state always replays safely.',
    example: 'Persist a fake workflow halfway through a resource update. Restart under a new agent/tool version and require an explicit compatibility decision. Then interleave an agent write with a deterministic controller: use ownership and a commit-time revision check rather than letting both repeatedly undo each other.',
    transfer: 'A recovery queue overloads the service that issues leases. Cap concurrency, back off and retain completed work. Explain why spawning more repair agents may lengthen recovery, and why reverting the agent binary does not undo earlier writes.',
    check: 'The rehearsal demonstrates a safe interruption, version mismatch, stale-plan rejection and bounded retry path. Source/runtime rollback and data/effect recovery remain separate.',
  },
  'neural-agent-evaluation': {
    model: 'Define independent outcomes before selecting prompts or a judge. ITBench separates diagnosis from mitigation; its historical task/model rates are not a current cloud capability ceiling. AIOpsLab uses workload/fault injection, real mutable test environments and an external problem oracle. AgentDojo separates ordinary utility from forbidden side effects. These are research methods, not proof of production autonomy.',
    example: 'Make a held-out local suite containing two repairable faults, a healthy no-op, a stale plan, denied access and a lost acknowledgement. The evaluator checks the resulting fake service/resource state and forbidden changes. Keep failed attempts, time and tool cost in the report.',
    transfer: 'A judge praises the explanation while the state verifier finds a broken dependency. Preserve the disagreement; do not let the actor rewrite the oracle or hide the failing scenario. Change a fixture unseen by the agent.',
    check: 'State model/tool/evaluator versions and budgets. Separate correctness, safety, calibration, no-op behavior, restoration time and cost. The lesson does not claim that these cloud benchmarks were executed here.',
  },
  'neural-agent-performance': {
    model: 'Profile accepted work end to end: context, environment, model, tools, waiting, verification and retries. vLLM prefix caching reuses shared-prefix prefill computation; it does not speed generation of new decode tokens. Cloudflare tool-schema reduction and Anthropic research parallelism concern different components and budgets. Shared-state work and coordination can erase parallel gains.',
    example: 'Use explicitly invented serial times: 120 seconds of prefill, 180 tools, 100 verification and 200 approval wait. A tenfold prefill improvement yields 492 seconds, not 60: about 1.22x workflow speed. Then add two independent branches and account for their slowest branch, coordination and final verification.',
    transfer: 'Move most latency into decode or a rate-limited tool, remove shared prefixes and add CI/reviewer contention. Predict which optimization stops helping, then measure locally or retain the numbers as labelled simulation.',
    check: 'Separate elapsed time, active human time, throughput and token footprint. Use bounded concurrency/backpressure and disclose the baseline; no unmeasured universal performance guarantee.',
  },
  'neural-agent-economics': {
    model: 'Cost per verified outcome includes model/runtime/tools/data, independent evaluation, human review, failed attempts, rework and allocated platform investment. Zero accepted outcomes must remain zero; a cheap token bill is not a successful system. Reduced effort creates capacity, not automatically cash or business value.',
    example: 'Build an invented 100-task ledger with 90 accepted agent changes and 10 completed human fallbacks. Charge every attempt, review and manual tail, then vary review time and escaped-defect cost. State which values are assumptions, observations and estimates. Airbnb is a reported bounded campaign with an estimated manual counterfactual, not a universal multiplier.',
    transfer: 'Present METR historical +19% task time only alongside the page marking it obsolete and the 2026 follow-up uncertainty/selection limits. Contrast a selected self-report survey with a randomized task experiment; do not turn either into a current universal effect.',
    check: 'Show numerator, accepted denominator, population, task selection and uncertainty. Separate perceived speed, measured task time, value, estimated savings and realized billing effects.',
  },
  'neural-agent-capstone': {
    model: 'An architect makes a design precise enough to be challenged: workload, alternatives, runtime/isolation, authorized context, identity, durable actions, verification, observability, recovery and economics. NIST identifies agent identity/interoperability/evaluation as active work; a protocol logo or initiative is not a safety certification or a guaranteed job outcome.',
    example: 'Choose one synthetic worker: a reviewed engineering change, a read-only incident investigator with a bounded proposal path, or a recommendation-only cost advisor. Produce a vertical responsibility flow, action envelope, ADR, local test evidence and honest outcome/cost ledger. No production account is required.',
    transfer: 'An interviewer removes the model service, changes the policy mid-wait and asks to expand authority. Defend stop/recovery behavior and the decision not to automate an irreversible action. Explain a simpler non-agent alternative.',
    check: 'Another reader can reproduce the local evidence and distinguish proposal, simulation, actual execution and untested deployment. Reuse earlier mission understanding, but demonstrate this new task separately.',
  },
  'neural-agent-case-workers': {
    model: 'Stripe reports substantial volumes of human-reviewed agent PRs using existing devboxes and deterministic blueprints. Airbnb reports nearly 3,500 test migrations over six weeks with external validation and a manual tail. The second manual baseline is estimated, and the first output count is not causal productivity. Their strongest common mechanism is disciplined scaffolding.',
    example: 'Compare task shape, context, workspace, validation, iteration stop, human role and measurement basis in a matrix. Reproduce one three-file configuration transformation on invented inputs. Keep the failing file and manual intervention visible.',
    transfer: 'Reduce the batch to five unrelated tasks and remove useful tests. Reassess whether fixed platform investment and open-ended generation remain worthwhile.',
    check: 'Every company claim is attributed and qualified; your tiny fixture is not evidence that you reproduced the production outcome.',
  },
  'neural-agent-case-context': {
    model: 'Cloudflare reports a compact two-tool schema surface over thousands of endpoints, but body/metadata baseline token counts differ. vLLM reuses prefill; Anthropic spends more compute to explore independent research branches. Do not chart these as interchangeable percentages of total speed or cost.',
    example: 'Mark context discovery, prefill, decode, tools, waits and verification on one invented critical path. For each optimization, identify the affected segment and the required permission/state assumptions.',
    transfer: 'The tool path dominates and all branches edit the same state. Explain why a smaller schema, warm cache or extra workers may not improve the accepted result.',
    check: 'No token-footprint result becomes a latency guarantee. Internal quality evaluation is not equal-budget architecture proof or a production recovery rate.',
  },
  'neural-agent-case-race': {
    model: 'The AWS public DynamoDB incident account describes an older DNS enactor passing a freshness check, later overwriting a newer plan, and concurrent cleanup removing the active old plan. Recovery then faced other queues and feedback effects. This was conventional automation, not an AI-caused incident.',
    example: 'On paper or in a fake state machine, interleave old-plan check, new-plan apply, old-plan apply and cleanup. Write the violated reference/generation invariant. Add a check at the effective commit boundary and prevent deletion of active state.',
    transfer: 'Reintroduce a human writer and a congested recovery queue. Explain why a local successful command or additional parallel repair agents does not establish stable service recovery.',
    check: 'Distinguish a proposed mitigation from the AWS reported remediation and from an executed test. Preserve the unknowns of an uninspected private implementation.',
  },
  'neural-agent-case-measurement': {
    model: 'The METR 2025 experiment reported 19% longer task time in its population; the page now disclaims current applicability. The 2026 continuation has selection/time-accounting difficulties and intervals including no effect. The later survey reports perceived speed/value in a selected sample. None provides a permanent universal multiplier.',
    example: 'Compare population, task allocation, tools, measurement, human attention, failure inclusion and uncertainty across the three reports. Design a local pilot with a credible comparator and an explicit rule for tasks refused by participants.',
    transfer: 'Concurrent agents reduce elapsed time but increase review and rework. Show both results and explain why task substitution or selective delegation can distort a headline average.',
    check: 'Classify causal evidence, observation, perception and estimate separately. Preserve inconvenient results rather than choosing the most positive or negative headline.',
  },
};

const extensionGuide: PackSection = {
  heading: 'Agent-cloud extension: evidence, not automatic autonomy',
  paragraphs: [
    'The original workbook remains the foundation. Phases 7-9 are an authored public-source extension, not newly discovered PDF pages. Four case laboratories are independent practice, not extra unlock gates.',
    'Use a local stub, invented records or a clearly labelled manual trace. No real cloud write, paid model call, credential, customer record or deployment is required. Public documentation and company reports do not certify a production system.',
  ],
  items: [
    'Draw intent -> authorized context -> proposal -> external admission -> execution -> independent verification -> recovery as a vertical flow.',
    'Save a concrete artifact and explain a changed-case failure before self-confirming completion.',
    'Keep existing mission evidence; related knowledge is transferable but does not automatically complete another mission.',
    'Study ahead freely. Only confirmed tracker adoption changes the saved edition.',
  ],
};

function lessonContent(outline: typeof agentCloudUnits[number]): PackUnit {
  const study = studies[outline.id];
  if (!study) throw new Error(`Missing agent-cloud lesson content: ${outline.id}`);
  const exercises = [
    { title: 'Build or reconstruct the mechanism', level: 'Apply',
      task: outline.action, check: study.check },
    { title: 'Change the assumptions', level: 'Transfer',
      task: study.transfer, check: 'Show the changed result and which assumption no longer holds; label simulations and untested claims.' },
    { title: 'Find the unsafe conclusion', level: 'Diagnose',
      task: `Use this scenario: ${study.example} Identify an attractive but unsupported success, safety or speed claim and construct a counterexample.`,
      check: 'Name the missing observation, permission or invariant and a safe next action.' },
    ...(outline.role === 'checkpoint' ? [{
      title: 'Defend the evidence packet', level: 'Explain',
      task: 'Give a short architecture defense with the diagram, actual artifact, failed case, source limits and alternative. Explain what you would refuse to automate.',
      check: outline.criteria.join(' '),
    }] : []),
  ];
  return {
    ...outline, exercises,
    sections: [
      { heading: 'Mental model and mechanism', paragraphs: [study.model], items: [] },
      { heading: 'Worked reasoning - synthetic unless attributed', paragraphs: [study.example], items: [] },
      { heading: 'Changed conditions and failure', paragraphs: [study.transfer], items: [] },
      { heading: 'Evidence and transfer limits', paragraphs: [study.check], items: [] },
    ],
  };
}

export function extendNeuralPack(base: RoadmapPack): RoadmapPack {
  const outline = extendNeuralOutline({
    ...base,
    units: base.units.map(unit => ({ ...unit, exerciseCount: unit.exercises.length })),
    exerciseCount: base.units.reduce((total, unit) => total + unit.exercises.length, 0),
  });
  return {
    ...base, title: outline.title, overview: outline.overview, sourceNotes: outline.sourceNotes,
    phases: outline.phases, sourceKind: outline.sourceKind, reviewedAt: outline.reviewedAt,
    webSources: outline.webSources,
    units: [...base.units, ...agentCloudUnits.map(lessonContent)],
    commonSections: [...base.commonSections, extensionGuide],
  };
}
