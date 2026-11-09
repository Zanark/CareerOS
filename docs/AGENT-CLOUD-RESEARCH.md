# Agent-native cloud / Neural Edge extension

Reviewed **2026-11-09**. This is original learning design from public evidence,
not an official vendor curriculum or a working agent service. It extends the
existing AI Architect mission; it does not add another mission.

## What the evidence supports

Cloud already has machine APIs, infrastructure-as-code and deterministic
reconciliation. Adding a model is useful where interpretation is valuable, not
automatically preferable to a controller. Distinguish:

1. **Cloud for agents:** execution, isolation, identity, context and durable state.
2. **Development with agents:** reproducible workspaces, constrained changes,
   independent checks and review.
3. **Operations with agents:** observation, admitted actions, outcome verification,
   safe interruption and accountable recovery.

The recurring architecture is a nondeterministic planner inside deterministic
scaffolding, with policy and verification outside the actor. A self-sustaining,
unbounded production cloud is not demonstrated by the reviewed cases.

The research used five lenses: role and requirements, platform contracts,
failure/control paths, performance/economics, and empirical evidence/transfer
limits. This was a bounded primary-source synthesis, not an exhaustive systematic
review or execution of the referenced cloud benchmarks.

## Curriculum and evidence

The original **144-page, 28-checkpoint, 72-unit, 809-exercise** workbook is frozen.
The append adds **12 checkpoints, four optional cases and 60 exercises**.
Latest Neural Edge therefore has **40 checkpoints, 88 units and 869 exercises**.
New lessons have actual web references and no PDF page numbers.

| Lesson | Architecture artifact and changed-case evidence |
| --- | --- |
| 7.1 Cloud for / operated by agents | Vertical responsibility map and a defended deterministic alternative |
| 7.2 Execution isolation and readiness | Runtime ADR, credential boundary, session owner and failed-readiness cleanup |
| 7.3 Identity, delegation and policy | Caller/tool permission map and effective-policy truth table |
| 7.4 Durable workflows | Lost-acknowledgement fake API, stable intent and uncertain-outcome reconciliation |
| 8.1 Tools and context | Typed read/proposal contracts, provenance, explicit errors and version mismatch |
| 8.2 Engineering worker | Synthetic repository change, deterministic checks, rejected result and review packet |
| 8.3 Operational worker | Permitted canary action, denied/stale action, healthy no-op and external verifier |
| 8.4 Release and recovery | Interruption/version rehearsal, competing writers, stop path and backpressure |
| 9.1 Evaluation | Held-out mutable-state cases, forbidden-effect checks and independent outcome oracles |
| 9.2 Performance | Labelled timing breakdown, critical path, cached-prefill and bounded-parallel comparisons |
| 9.3 Economics | Verified-outcome denominator, full attempt/review/rework ledger and credible comparator |
| 9.4 Architecture defense | ADR, vertical authority/data flow, action envelope, failure matrix and evidence packet |

Case A compares Stripe/Airbnb engineering scaffolds. Case B separates compact
tools, reusable prefill and multi-agent research costs. Case C analyzes the AWS
DNS incident as **conventional automation, not an AI-caused incident**. Case D
reconciles METR evidence and designs a better local pilot. These cases are
independently browsable practice, not additional completion gates.

## Source register and important limits

[`sources.ts`](../src/domain/agentCloud/sources.ts) is the authoritative typed
register of **30 public primary-source receipts**, including each actual reviewed
scope. [`outline.ts`](../src/domain/agentCloud/outline.ts) maps them to lessons;
[`content.ts`](../src/domain/agentCloud/content.ts) contains lazy original teaching.
The same registry powers each lesson's **Reviewed sources** disclosure.

- Kubernetes reconciliation is an existing deterministic pattern, not an
  agent-specific invention. AgentCore session isolation does not supply user/
  session binding; execution-role credentials can be reached inside that VM.
- Azure SRE policy deny has precedence within policy rules, but an
  administrator user-hook allow can override global tool-policy deny.
  Downstream resource IAM remains separate. Global Review is not a universal
  gate over every external action.
- Durable identity is not an immortal process or a universal exactly-once
  transaction. Modal's Created/Started/Ready differ; readiness timeout does not
  automatically clean up the sandbox.
- Stripe PR volume and Airbnb's reported migration/estimated counterfactual
  are attributed case evidence, not causal universal productivity multipliers.
- Cloudflare schema-token reduction is not the same percentage improvement in
  task latency, cost or safety. vLLM prefix reuse improves reusable prefill, not
  new-token decode. Anthropic's reported research comparison is not equal-budget
  proof of every multi-agent design.
- METR's 2025 slowdown is explicitly obsolete as a current verdict. The 2026
  continuation retains selection/accounting limits and intervals including no
  effect; its survey is selected self-report, not randomized task measurement.
- ITBench diagnosis and mitigation are distinct historical measures. AIOpsLab's
  paper was reviewed; its live implementation was not inspected. Product
  contracts, research results, company reports and synthetic examples are not
  interchangeable evidence.

No paid model/account, production access, customer data or real cloud write is
required. Students may use invented local fixtures or explicitly labelled manual
traces. Reading, a successful command, a simulation and verified production
restoration must remain distinguishable.

## Integration and progress contract

Neural v4 is an explicitly verified append of v3. Its original checkpoint and
stage definitions are reused unchanged; only confirmed adoption carries genuine
prefix progress. Old position, blocker, mode, evidence and plans remain; an exact
old snapshot is archived. A finished v3 tracker resumes at unconfirmed 7.1.
Earlier incompatible editions archive normally, without guessed completion.

Library/search and the complete map expose new material before adoption.
Four cited transfer comparisons connect the extension to Fabric, Blueprint,
System and Fieldcraft. Graph endpoint lookup accepts only the verified identical
prefix when a pinned older connection is represented by a newer tracker.
Related knowledge is not equivalent completion.

Atlas uses the existing canonical evidence identities: adoption grants no
discoveries or EXP and counts old work once. There is no new score ledger or
silent expansion of Neural recall. Ordinary backups and the optional encrypted
journal retain exact old records and new v4 work. Five final tutorial lessons
exercise the actual source disclosure and optional-case selector using isolated
temporary data; the previous 177 lessons remain ordered and unchanged.

## Delivery boundary

Technical qualification and publication are separate. The workstream is
[`12_AI_ARCHITECT_AGENT_CLOUD.todo`](../TODO/12_AI_ARCHITECT_AGENT_CLOUD.todo).
Its evidence records the actual local checks and issue/Project reconciliation.
The [local qualification receipt](tracking/2026-11-10-agent-cloud-local-qualification.json)
separates the initial fixture failures, corrective pass and scoped visual review
from a full browser/hosted release.
The initial delivery was local-only. On November 10 the owner separately
authorized source push and GitHub Pages deployment. Source `5960bd3` is deployed
by successful run `42696296742`; the [publication receipt](tracking/2026-11-10-agent-cloud-publication.json)
records full CI and actual hosted artifact/behavior checks. The [live lesson](https://zanark.github.io/CareerOS/#/practice/neural/neural-agent-control)
is freely browsable before adoption.
The private research report, original PDFs, real workspace and passphrases are
not publication inputs. Source publication does not authorize cloud execution
or imply human acceptance of the curriculum.
