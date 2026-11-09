import type { MissionId } from '../domain/types';

export interface CareerSkillAnchor {
  missionId: MissionId;
  checkpointId: string;
  roadmapVersion: '3.0.0';
}

export interface CareerSkillLink {
  id: string;
  concept: string;
  reason: string;
  source: CareerSkillAnchor;
  target: CareerSkillAnchor;
}

const anchor = (missionId: MissionId, checkpointId: string): CareerSkillAnchor => ({
  missionId, checkpointId, roadmapVersion: '3.0.0',
});

// Editorial transfer opportunities, not prerequisites, completion equivalence or inferred experience.
// Each endpoint is an explicit checkpoint in the public v3 curriculum; citations live in its definition.
export const careerSkillLinks: readonly CareerSkillLink[] = [
  {
    id: 'keyed-state-to-fieldcraft-debugging', concept: 'Identity before deduplication',
    reason: 'Pattern HashMap reasoning helps Fieldcraft distinguish repeated input from legitimate updates when debugging a customer importer; the FDE attempt must still prove the customer-specific identity semantics.',
    source: anchor('pattern', 'pattern-v3-section-05'), target: anchor('fde', 'fde-v3-fde-42'),
  },
  {
    id: 'contest-keyed-lookup-to-fieldcraft-code', concept: 'Bounded lookup with explicit complexity',
    reason: 'Algorithm Arena Two Sum practice provides a concrete keyed-lookup and complexity defense that transfers to Fieldcraft live coding; customer data correctness remains a separate requirement.',
    source: anchor('algorithm', 'algorithm-v3-algorithm-module-17'), target: anchor('fde', 'fde-v3-fde-42'),
  },
  {
    id: 'system-request-signals-to-fieldcraft-telemetry', concept: 'Trace a user-visible failure',
    reason: 'System request-observability practice supplies diagnostic logs, metrics and spans; Fieldcraft extends that reasoning across the customer UI, API, job and dependency with explicit privacy and handoff limits.',
    source: anchor('system', 'system-v3-module-64'), target: anchor('fde', 'fde-v3-fde-30'),
  },
  {
    id: 'latency-distribution-to-fieldcraft-budget', concept: 'Measure the workload before tuning',
    reason: 'System latency-versus-throughput reasoning supports Fieldcraft quality/latency/cost comparisons, which must disclose the actual workload and avoid presenting local stub behavior as production performance.',
    source: anchor('system', 'system-v3-module-03'), target: anchor('fde', 'fde-v3-fde-32'),
  },
  {
    id: 'architecture-adr-to-fieldcraft-constraints', concept: 'Decisions tied to customer constraints',
    reason: 'Blueprint alternatives and reconsideration triggers transfer to Fieldcraft architecture under network, data and ownership restrictions; related architecture study does not satisfy the new customer-specific decision record.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s9-1'), target: anchor('fde', 'fde-v3-fde-20'),
  },
  {
    id: 'schema-evolution-to-fieldcraft-compatibility', concept: 'Preserve old callers and records',
    reason: 'Blueprint mixed-version schema reasoning supports Fieldcraft migration rehearsals that replay old records and updates without fabricating missing history or silently resetting invalid data.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s6-5'), target: anchor('fde', 'fde-v3-fde-38'),
  },
  {
    id: 'fabric-trust-to-fieldcraft-access', concept: 'Trust boundaries are not interchangeable',
    reason: 'Fabric credential-owner and permission mapping helps Fieldcraft identify actors and resources; certificate/TLS knowledge is not equivalent to application authorization or tenant isolation, which need their own tests.',
    source: anchor('fabric', 'fabric-v3-fabric-4-6'), target: anchor('fde', 'fde-v3-fde-17'),
  },
  {
    id: 'artifact-promotion-to-fieldcraft-release', concept: 'A release is an observed artifact transition',
    reason: 'Credential promotion, health validation and rollback provide controls for the Fieldcraft local rollout drill, whose running artifact and data compatibility must actually be observed.',
    source: anchor('credential', 'credential-v3-credential-3-6'), target: anchor('fde', 'fde-v3-fde-29'),
  },
  {
    id: 'neural-retrieval-to-fieldcraft-evidence', concept: 'Retrieval relevance with permission boundaries',
    reason: 'Neural hybrid-retrieval choices inform Fieldcraft retrieval evaluation; Fieldcraft adds tenant-scoped eligibility, source freshness and explicit abstention rather than assuming a relevant document may be disclosed.',
    source: anchor('neural', 'neural-v3-neural-2-2'), target: anchor('fde', 'fde-v3-fde-23'),
  },
  {
    id: 'neural-json-to-fieldcraft-proposals', concept: 'Structured shape is not business correctness',
    reason: 'Neural JSON extraction and validation support Fieldcraft structured proposals, which additionally require business invariants and permission checks before any accepted state change.',
    source: anchor('neural', 'neural-v3-neural-0-3'), target: anchor('fde', 'fde-v3-fde-24'),
  },
  {
    id: 'income-problem-to-fieldcraft-discovery', concept: 'Understand the task before proposing software',
    reason: 'Income problem statements connect symptoms and business impact; Fieldcraft discovery develops those assumptions through neutral interviews and observed workflow examples, clearly distinguishing role-play from customer research.',
    source: anchor('income', 'income-v3-income-1-2'), target: anchor('fde', 'fde-v3-fde-05'),
  },
  {
    id: 'client-runbook-to-fieldcraft-handoff', concept: 'Another operator can carry the work',
    reason: 'Income handoff documentation supplies limitations, recovery and verification evidence; Fieldcraft tests that packet through an actual peer or explicitly labelled clean-room self-check.',
    source: anchor('income', 'income-v3-income-4-7'), target: anchor('fde', 'fde-v3-fde-36'),
  },
  {
    id: 'escape-claim-defense-to-fieldcraft-portfolio', concept: 'Defend only the contribution you can support',
    reason: 'Escape ownership/mechanism/impact follow-ups support Fieldcraft portfolio narratives, which must separate synthetic practice, actual execution and unverified customer or production impact.',
    source: anchor('escape', 'escape-v3-escape-3-1'), target: anchor('fde', 'fde-v3-fde-41'),
  },
  // Algorithmic state and proof, transferred into the contest curriculum.
  {
    id: 'array-regions-to-contest-state',
    concept: 'Indexed state and mutation boundaries',
    reason: 'The DSA array review explains maintained regions and in-place updates; the contest min/max scan applies that discipline to justify each stored value and whether an auxiliary array is needed.',
    source: anchor('pattern', 'pattern-v3-section-03'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-06'),
  },
  {
    id: 'string-representation-to-contest-accounting',
    concept: 'Character rules before representation',
    reason: 'Choosing character counts or position state in DSA transfers to the contest string task, where case, whitespace and token-versus-line rules determine which scan and output representation is correct.',
    source: anchor('pattern', 'pattern-v3-section-04'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-07'),
  },
  {
    id: 'hashmap-transfer-to-contest-keyed-state',
    concept: 'Keys chosen for the next query',
    reason: 'The expanded HashMap review asks what a map remembers; the contest Two Sum exercise makes that concrete with a seen-value-to-index map that answers the next complement lookup.',
    source: anchor('pattern', 'pattern-v3-section-05'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-17'),
  },
  {
    id: 'two-pointer-invariant-to-contest-elimination',
    concept: 'Safe pointer movement',
    reason: 'DSA processed-region invariants transfer to the contest sorted-pair-sum proof: each endpoint move must eliminate candidates that cannot produce the required sum.',
    source: anchor('pattern', 'pattern-v3-section-09'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-13'),
  },
  {
    id: 'window-validity-to-contest-distinct-count',
    concept: 'Incremental window validity',
    reason: 'DSA frequency maintenance and safe shrinking directly support the contest at-most-K-distinct trace, including when to update the answer after restoring a valid window.',
    source: anchor('pattern', 'pattern-v3-section-10'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-14'),
  },
  {
    id: 'prefix-boundaries-to-contest-range-query',
    concept: 'Prefix boundary conventions',
    reason: 'The DSA requirement to define prefix boundaries is exercised by the contest n+1 prefix array: deriving an inclusive range from two prefix positions prevents off-by-one errors.',
    source: anchor('pattern', 'pattern-v3-section-11'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-09'),
  },
  {
    id: 'sort-contract-to-contest-equal-runs',
    concept: 'Ordering as a problem reduction',
    reason: 'DSA sort-and-scan reasoning explains why equal values become adjacent; the contest run-counting exercise adds the requirement to preserve original indices when the requested output still needs them.',
    source: anchor('pattern', 'pattern-v3-section-12'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-10'),
  },
  {
    id: 'interval-endpoints-to-contest-sweep-events',
    concept: 'Endpoint and tie semantics',
    reason: 'The DSA sweep-line review requires consistent touching-endpoint behavior; the contest start/end event exercise turns that rule into an explicit ordering for equal-coordinate events.',
    source: anchor('pattern', 'pattern-v3-section-14'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-19'),
  },
  {
    id: 'binary-search-to-contest-first-true',
    concept: 'Monotonic search invariants',
    reason: 'The DSA search-interval proof transfers to the contest first-true implementation, where both predicate outcomes must preserve the boundary and justify discarding the other region.',
    source: anchor('pattern', 'pattern-v3-section-13'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-15'),
  },
  {
    id: 'recursive-contract-to-contest-state',
    concept: 'Recursive state and return contracts',
    reason: 'DSA call tracing supplies the state, termination and return-value discipline used when the contest recursion module defines what f(i) means before implementing its transition.',
    source: anchor('pattern', 'pattern-v3-section-15'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-21'),
  },
  {
    id: 'subtree-returns-to-contest-rooted-trees',
    concept: 'Child-to-parent summaries',
    reason: 'DSA binary-tree return contracts transfer to the contest rooted-tree subtree-size calculation; the contest representation additionally requires excluding the parent edge in an undirected tree.',
    source: anchor('pattern', 'pattern-v3-section-17'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-23'),
  },
  {
    id: 'bfs-layers-to-contest-grid-traversal',
    concept: 'Queue frontiers and visited identity',
    reason: 'The DSA BFS layer and first-discovery argument helps justify the contest queue-based grid traversal and when its unweighted shortest-path interpretation is valid.',
    source: anchor('pattern', 'pattern-v3-section-22'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-22'),
  },
  {
    id: 'dfs-state-to-contest-components',
    concept: 'Depth-first traversal state',
    reason: 'DSA recursive and explicit-stack DFS state supports the contest flood-fill and component exercises, keeping visited bookkeeping separate from graph representation and avoiding repeated exploration.',
    source: anchor('pattern', 'pattern-v3-section-23'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-22'),
  },
  {
    id: 'greedy-proof-to-contest-weighted-counterexample',
    concept: 'Exchange proofs and their limits',
    reason: 'Both modules defend safe local choices rather than memorized rules: the contest earliest-finish proof and weighted-interval counterexample put the DSA greedy-versus-DP distinction under a concrete test.',
    source: anchor('pattern', 'pattern-v3-section-26'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-27'),
  },
  {
    id: 'dp-state-to-contest-memoization',
    concept: 'Repeated states and evaluation order',
    reason: 'The DSA recurrence and initial-condition discipline transfers to the contest Fibonacci or climbing-stairs exercise, where repeated brute-force calls motivate memoization rather than an unexplained formula.',
    source: anchor('pattern', 'pattern-v3-section-27'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-24'),
  },
  {
    id: 'knapsack-reuse-to-contest-compression',
    concept: 'DP update direction preserves item reuse',
    reason: 'DSA distinguishes one-use from reusable choices; the contest 0/1 knapsack exercise uses that distinction to justify iteration direction before compressing a two-dimensional state.',
    source: anchor('pattern', 'pattern-v3-section-28'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-28'),
  },
  {
    id: 'range-structures-to-contest-fenwick',
    concept: 'Dynamic prefix aggregation',
    reason: 'The DSA static-versus-dynamic range choice becomes a concrete Fenwick implementation in the contest module, which derives point-update and prefix-query motion from lowbit-defined stored ranges.',
    source: anchor('pattern', 'pattern-v3-section-33'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-32'),
  },
  {
    id: 'range-structures-to-contest-segment-tree',
    concept: 'Hierarchical range aggregation',
    reason: 'The DSA range-structure review transfers to the contest segment tree by defining merge and identity for range minimum, then explaining how disjoint covered segments form a correct query answer.',
    source: anchor('pattern', 'pattern-v3-section-33'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-33'),
  },
  {
    id: 'bit-state-to-contest-subsets',
    concept: 'Masks as small-set state',
    reason: 'The DSA requirement to explain each bit position supports the contest feature-mask and subset-enumeration exercises, where a mask represents choices rather than an opaque numeric trick.',
    source: anchor('pattern', 'pattern-v3-section-35'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-31'),
  },
  {
    id: 'number-theory-to-contest-query-preprocessing',
    concept: 'Arithmetic reductions under input bounds',
    reason: 'DSA primes, sieves and integer-limit reasoning transfer to the contest choice between one primality query and many bounded queries, where preprocessing cost must follow workload size.',
    source: anchor('pattern', 'pattern-v3-section-36'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-29'),
  },
  {
    id: 'pattern-recognition-to-contest-composition',
    concept: 'Unlabeled technique selection',
    reason: 'The DSA recognition matrix asks for evidence and a rejected alternative; the contest mixed task applies that test to sort-plus-greedy, prefix-plus-map and window-plus-frequency candidates.',
    source: anchor('pattern', 'pattern-v3-section-43'), target: anchor('algorithm', 'algorithm-v3-algorithm-module-20'),
  },
  {
    id: 'dsa-mixed-mastery-to-coding-interview',
    concept: 'Visible reasoning under a coding timer',
    reason: 'The DSA mixed assessment requires independent implementation, tests and complexity; the Escape mock adds a 25-minute clarify-to-debug sequence and an explicit recovery from one mistake.',
    source: anchor('pattern', 'pattern-v3-section-50'), target: anchor('escape', 'escape-v3-escape-6-3'),
  },
  {
    id: 'topological-dependencies-to-migration-order',
    concept: 'Dependency ordering and cycle exposure',
    reason: 'Topological-sort dependency modeling can examine the Fabric migration dependency matrix: an acyclic dependency relation permits an order, while cycles expose coupling that needs a migration plan rather than an arbitrary sequence.',
    source: anchor('pattern', 'pattern-v3-section-24'), target: anchor('fabric', 'fabric-v3-fabric-3-2'),
  },

  // System guarantees connected to specific implementation and design exercises.
  {
    id: 'http-contract-to-fabric-stateless-api',
    concept: 'Retry-safe HTTP contracts',
    reason: 'System HTTP APIs defines resource outcomes and retries after uncertainty; the Fabric REST service applies those semantics while instances are replaced and downstream calls time out.',
    source: anchor('system', 'system-v3-module-13'), target: anchor('fabric', 'fabric-v3-fabric-2-2'),
  },
  {
    id: 'http-contract-to-delivered-integration',
    concept: 'Integration behavior under dependency failure',
    reason: 'The System endpoint and idempotency exercise supplies a contract to test in Income API Integration, alongside authentication, error handling and safe retries against an external service.',
    source: anchor('system', 'system-v3-module-13'), target: anchor('income', 'income-v3-income-2-1'),
  },
  {
    id: 'idempotency-state-to-rest-resource-model',
    concept: 'Repeated operations and durable deduplication',
    reason: 'Blueprint asks what repeating a resource operation means; System Idempotent Operations extends that answer into duplicate-detection storage and retention needed after a payment timeout.',
    source: anchor('system', 'system-v3-module-39'), target: anchor('blueprint', 'blueprint-v3-blueprint-s1-2'),
  },
  {
    id: 'retry-budget-to-ai-streaming-deadlines',
    concept: 'Bounded retries within a request deadline',
    reason: 'System bounded retries, backoff and jitter inform the Neural streaming policy, which must classify retryable failures while keeping total deadline, cancellation and quota behavior explicit.',
    source: anchor('system', 'system-v3-module-51'), target: anchor('neural', 'neural-v3-neural-1-2'),
  },
  {
    id: 'circuit-breaker-to-ai-degraded-modes',
    concept: 'Dependency isolation with meaningful fallback',
    reason: 'System open and half-open breaker states provide a mechanism for Neural model or search outages; the AI exercise must still define safe caller-visible behavior for missing retrieval, timeouts and exhausted quota.',
    source: anchor('system', 'system-v3-module-52'), target: anchor('neural', 'neural-v3-neural-4-3'),
  },
  {
    id: 'scoped-throttling-to-rate-limiter-design',
    concept: 'Admission policy and enforcement placement',
    reason: 'System per-user limits and multi-instance enforcement extend Blueprint local-counter practice into explicit burst, shared-state and fail-open or fail-closed decisions.',
    source: anchor('system', 'system-v3-module-63'), target: anchor('blueprint', 'blueprint-v3-blueprint-s4-4'),
  },
  {
    id: 'cache-invalidation-to-performance-defense',
    concept: 'Freshness limits on a caching claim',
    reason: 'System expiry versus explicit invalidation helps test the Escape cached request path: a faster response is not sufficient evidence unless the stated freshness contract still holds.',
    source: anchor('system', 'system-v3-module-23'), target: anchor('escape', 'escape-v3-escape-5-4'),
  },
  {
    id: 'cache-concentration-to-hotspot-diagnosis',
    concept: 'Hot keys versus synchronized cache refill',
    reason: 'System distinguishes popularity concentration from simultaneous expiry; Blueprint hotspot diagnosis can use that distinction to choose coalescing, TTL jitter or redistribution for the actual source of load.',
    source: anchor('system', 'system-v3-module-24'), target: anchor('blueprint', 'blueprint-v3-blueprint-s5-5'),
  },
  {
    id: 'write-behind-to-deferred-processing-boundary',
    concept: 'Acceptance before durable completion',
    reason: 'System write-behind failure analysis makes Blueprint deferred-processing boundaries concrete: accepting a write before backing-store persistence creates ordering and recovery obligations.',
    source: anchor('system', 'system-v3-module-22'), target: anchor('blueprint', 'blueprint-v3-blueprint-s3-3'),
  },
  {
    id: 'cdn-lifetime-to-edge-delivery-design',
    concept: 'Cache misses across an edge boundary',
    reason: 'The System pull/push and cache-miss exercises fill in Blueprint edge-delivery paths with origin requests, content lifetime and the behavior required when the edge has no usable object.',
    source: anchor('system', 'system-v3-module-20'), target: anchor('blueprint', 'blueprint-v3-blueprint-s2-6'),
  },
  {
    id: 'dns-cache-to-azure-request-path',
    concept: 'Name resolution as a routing dependency',
    reason: 'System resolver caching and TTL explain why the Credential network-path lab must inspect DNS as well as routes and security rules when clients keep reaching an old endpoint.',
    source: anchor('system', 'system-v3-module-12'), target: anchor('credential', 'credential-v3-credential-2-2'),
  },
  {
    id: 'l4-l7-to-routing-policy',
    concept: 'Routing visibility and TLS placement',
    reason: 'System transport-versus-application inspection constrains Blueprint traffic policies: host or path routing requires application visibility, so TLS termination and inspection cost belong in the two-instance design.',
    source: anchor('system', 'system-v3-module-17'), target: anchor('blueprint', 'blueprint-v3-blueprint-s2-1'),
  },
  {
    id: 'stateless-scaleout-to-fabric-state-ownership',
    concept: 'State survival during instance replacement',
    reason: 'System scale-out externalizes or coordinates request state; Fabric stateful-versus-stateless practice tests the same decision by locating authoritative state and predicting what survives process loss.',
    source: anchor('system', 'system-v3-module-19'), target: anchor('fabric', 'fabric-v3-fabric-1-3'),
  },
  {
    id: 'transaction-invariant-to-reliable-collections',
    concept: 'Atomic boundaries around business state',
    reason: 'System transaction scope protects an explicit invariant under concurrency; the Fabric two-record Reliable Dictionary exercise applies that reasoning without treating replication as a substitute for business consistency.',
    source: anchor('system', 'system-v3-module-34'), target: anchor('fabric', 'fabric-v3-fabric-2-3'),
  },
  {
    id: 'shard-key-to-fabric-partition-layout',
    concept: 'Workload division is not redundancy',
    reason: 'System shard-key and hotspot reasoning informs the Fabric customer-key partition sketch, while Fabric replica placement separately addresses durability and correlated failures.',
    source: anchor('system', 'system-v3-module-32'), target: anchor('fabric', 'fabric-v3-fabric-1-4'),
  },
  {
    id: 'stale-leader-to-election-failure-design',
    concept: 'Leader replacement without unsafe overlap',
    reason: 'System scheduler election exposes a former leader continuing to act; Blueprint leadership and failure detection must therefore preserve the leader invariant, not merely notice an unresponsive process.',
    source: anchor('system', 'system-v3-module-55'), target: anchor('blueprint', 'blueprint-v3-blueprint-s7-2'),
  },
  {
    id: 'majority-agreement-to-coordination-invariant',
    concept: 'Agreement under stated failure assumptions',
    reason: 'System majority-quorum and leadership-change sketches give Blueprint consensus intuition a concrete way to test its agreement invariant; this is conceptual design reasoning, not protocol implementation equivalence.',
    source: anchor('system', 'system-v3-module-56'), target: anchor('blueprint', 'blueprint-v3-blueprint-s7-1'),
  },
  {
    id: 'read-replica-lag-to-reader-guarantee',
    concept: 'Read-after-write expectations',
    reason: 'Blueprint asks what a replicated value guarantees its readers; System read-scaling practice tests that guarantee when a recent profile update is absent from a replica or failover changes routing.',
    source: anchor('system', 'system-v3-module-31'), target: anchor('blueprint', 'blueprint-v3-blueprint-s2-5'),
  },
  {
    id: 'lease-fencing-to-coordination-design',
    concept: 'Expired ownership and stale actions',
    reason: 'Blueprint names the invariant protected by a distributed lock; System lease-expiry and fencing analysis checks whether an old owner can still violate it after a timeout.',
    source: anchor('system', 'system-v3-module-57'), target: anchor('blueprint', 'blueprint-v3-blueprint-s6-3'),
  },
  {
    id: 'saga-compensation-to-order-payment-flow',
    concept: 'Partial completion and compensating actions',
    reason: 'System local transactions and non-reversible saga steps provide failure cases for Blueprint order/payment invariants, where compensation cannot be assumed to erase every externally visible effect.',
    source: anchor('system', 'system-v3-module-35'), target: anchor('blueprint', 'blueprint-v3-blueprint-s4-6'),
  },
  {
    id: 'delivery-guarantees-to-messaging-recovery',
    concept: 'Acknowledgement windows and duplicate effects',
    reason: 'System loss and duplication around acknowledgement explain the Income queue-workflow exercise, which must handle redelivery, ordering and poison messages rather than trusting an exactly-once broker label.',
    source: anchor('system', 'system-v3-module-38'), target: anchor('income', 'income-v3-income-6-4'),
  },
  {
    id: 'bounded-backlog-to-ai-concurrency',
    concept: 'Consumer capacity sets admission limits',
    reason: 'System bounded queues and rejection policies transfer to Neural queue-backed AI work, where per-tenant concurrency limits must prevent slow requests from creating an unbounded backlog.',
    source: anchor('system', 'system-v3-module-40'), target: anchor('neural', 'neural-v3-neural-4-2'),
  },
  {
    id: 'queue-boundary-to-cloud-integration',
    concept: 'Temporal decoupling with operating obligations',
    reason: 'System places a queue before email delivery and reasons about a slow consumer; Credential integration extends that boundary into ordering, duplicate, backpressure and poison-message behavior in a working artifact.',
    source: anchor('system', 'system-v3-module-36'), target: anchor('credential', 'credential-v3-credential-3-4'),
  },
  {
    id: 'worker-failure-to-job-scheduler-design',
    concept: 'Recoverable background execution',
    reason: 'System worker crashes, visibility timeouts and acknowledgements supply concrete failure checks for Blueprint scheduled jobs, whose execution path must account for retry and recovery as well as scheduling.',
    source: anchor('system', 'system-v3-module-37'), target: anchor('blueprint', 'blueprint-v3-blueprint-s4-5'),
  },
  {
    id: 'service-discovery-to-fabric-logical-identity',
    concept: 'Logical names across changing placement',
    reason: 'System discovery handles disappearing endpoints; Fabric communication applies that need by contrasting logical service resolution with direct node addresses tied to current placement.',
    source: anchor('system', 'system-v3-module-46'), target: anchor('fabric', 'fabric-v3-fabric-2-4'),
  },
  {
    id: 'observability-evidence-to-fabric-diagnosis',
    concept: 'Correlated request and dependency evidence',
    reason: 'System chooses metrics, log fields and spans to distinguish a slow API failure; Fabric diagnostics applies that choice across services and storage using request correlation, latency, errors and saturation.',
    source: anchor('system', 'system-v3-module-64'), target: anchor('fabric', 'fabric-v3-fabric-4-5'),
  },
  {
    id: 'error-budget-to-reliability-interview',
    concept: 'User objectives drive operational action',
    reason: 'System separates indicators, objectives and commitments and asks what changes when a budget is spent; Escape reliability practice connects those decisions to its metric-to-incident-to-action explanation.',
    source: anchor('system', 'system-v3-module-65'), target: anchor('escape', 'escape-v3-escape-5-5'),
  },
  {
    id: 'trust-boundaries-to-fabric-security',
    concept: 'Identity, permission and credential lifecycle',
    reason: 'System distinguishes authentication from authorization at trust boundaries; Fabric security applies those responsibilities to cluster and application identities, credential owners and certificate rotation.',
    source: anchor('system', 'system-v3-module-67'), target: anchor('fabric', 'fabric-v3-fabric-4-6'),
  },
  {
    id: 'scoped-delegation-to-secure-app-integration',
    concept: 'Limited authority for service operations',
    reason: 'System temporary-upload delegation illustrates limiting scope and lifetime; Credential secure integration applies that reasoning when mapping an application identity to allowed service operations and credential handling.',
    source: anchor('system', 'system-v3-module-68'), target: anchor('credential', 'credential-v3-credential-3-5'),
  },
  {
    id: 'tenant-isolation-to-authorized-rag',
    concept: 'Data isolation before model context',
    reason: 'System tenant separation becomes a concrete retrieval boundary in Neural secure RAG: requester authorization and ACL filters must exclude another tenant\'s content before generation, not merely hide the final answer.',
    source: anchor('system', 'system-v3-module-69'), target: anchor('neural', 'neural-v3-neural-2-4'),
  },
  {
    id: 'regional-write-policy-to-recovery-objective',
    concept: 'Failover constrained by RPO and RTO',
    reason: 'System active-active and active-passive write/failover choices can be tested against Credential business recovery objectives, making replication behavior and recovery time explicit rather than assuming another region is sufficient.',
    source: anchor('system', 'system-v3-module-70'), target: anchor('credential', 'credential-v3-credential-4-5'),
  },
  {
    id: 'measured-index-choice-to-api-repair',
    concept: 'Query evidence before optimization',
    reason: 'System query-plan and index trade-offs support the Income API-speed diagnostic, which must isolate database work and measure improvement before proposing indexes, caching or concurrency changes.',
    source: anchor('system', 'system-v3-module-27'), target: anchor('income', 'income-v3-income-3-1'),
  },
  {
    id: 'system-design-mock-to-adaptive-defense',
    concept: 'Defending and revising architecture choices',
    reason: 'System timed design practice makes five trade-offs and three failures explicit; Escape design defense uses those choices to name alternatives and triggers for revision when constraints change.',
    source: anchor('system', 'system-v3-module-72'), target: anchor('escape', 'escape-v3-escape-7-3'),
  },
  {
    id: 'search-index-to-hybrid-retrieval-choice',
    concept: 'Lexical retrieval versus semantic relevance',
    reason: 'System term-based search and relevance reasoning supplies the lexical side of Neural hybrid retrieval, whose error-code, conceptual and versioned-product queries require different signals rather than one universal ranking method.',
    source: anchor('system', 'system-v3-module-62'), target: anchor('neural', 'neural-v3-neural-2-2'),
  },
  {
    id: 'incremental-cloud-pattern-to-modernization-seam',
    concept: 'Reversible incremental replacement',
    reason: 'System Strangler Fig and compatibility-boundary reasoning gives Income modernization a concrete alternative to a rewrite: select a seam and preserve behavior while replacement proceeds incrementally.',
    source: anchor('system', 'system-v3-module-71'), target: anchor('income', 'income-v3-income-3-6'),
  },

  // Platform labs, safe changes and evidence-qualified operational transfer.
  {
    id: 'versioned-config-to-drift-recovery',
    concept: 'Desired state versus observed configuration',
    reason: 'Fabric treats settings as versioned contracts with owners and rollback; Escape configuration-drift recovery tests how that intended state is compared with observed state and turned into a justified action.',
    source: anchor('fabric', 'fabric-v3-fabric-2-5'), target: anchor('escape', 'escape-v3-escape-5-2'),
  },
  {
    id: 'rolling-upgrade-to-artifact-promotion',
    concept: 'Health-gated deployment with viable rollback',
    reason: 'Fabric two-version compatibility and upgrade health policies give Credential artifact promotion concrete safety conditions; a pipeline rollback point is useful only if the older version can still operate correctly.',
    source: anchor('fabric', 'fabric-v3-fabric-4-4'), target: anchor('credential', 'credential-v3-credential-3-6'),
  },
  {
    id: 'version-coexistence-to-schema-evolution',
    concept: 'Data contracts during mixed-version rollout',
    reason: 'Fabric rolling upgrades require old and new versions to coexist; Blueprint schema evolution can test its preserved invariant against both versions and any irreversible data change before claiming rollback is safe.',
    source: anchor('fabric', 'fabric-v3-fabric-4-4'), target: anchor('blueprint', 'blueprint-v3-blueprint-s6-5'),
  },
  {
    id: 'local-fault-test-to-architecture-recovery',
    concept: 'Hypothesis-led fault injection',
    reason: 'Fabric local restart, node-loss and replica-movement experiments supply concrete faults for Blueprint recovery practice, with a baseline, expected business invariant, observation and verified recovery sequence.',
    source: anchor('fabric', 'fabric-v3-fabric-2-6'), target: anchor('blueprint', 'blueprint-v3-blueprint-s12-3'),
  },
  {
    id: 'migration-dependency-map-to-strategy-choice',
    concept: 'Migration order and rollback boundaries',
    reason: 'Fabric records callers, state ownership and unavailable behavior; that dependency evidence informs Credential rehost, replatform or refactor choices and where a migration can safely stop or roll back.',
    source: anchor('fabric', 'fabric-v3-fabric-3-2'), target: anchor('credential', 'credential-v3-credential-4-9'),
  },
  {
    id: 'fabric-hop-timing-to-delivery-performance',
    concept: 'Measured bottlenecks before tuning',
    reason: 'Fabric defines workload, percentile, concurrency and hop latency before optimization; Income performance troubleshooting transfers that method to a delivered API by recording a baseline and measuring its dependencies.',
    source: anchor('fabric', 'fabric-v3-fabric-4-7'), target: anchor('income', 'income-v3-income-2-8'),
  },
  {
    id: 'migration-case-to-career-evidence-bank',
    concept: 'Supported contributions across interview themes',
    reason: 'Fabric migration case study separates validated system facts from an evidenced contribution; Escape can organize that supported case under multiple interviewer themes without upgrading a hypothetical design into work history.',
    source: anchor('fabric', 'fabric-v3-fabric-5-1'), target: anchor('escape', 'escape-v3-escape-1-3'),
  },
  {
    id: 'fabric-scope-to-ai-service-boundaries',
    concept: 'Platform responsibility and external dependencies',
    reason: 'Fabric design scenarios require choosing what the platform should own; Neural distributed AI applies that decision to separate model/search dependencies, gateway behavior and state ownership in a Service Fabric design.',
    source: anchor('fabric', 'fabric-v3-fabric-5-4'), target: anchor('neural', 'neural-v3-neural-4-1'),
  },
  {
    id: 'fabric-diagnostics-to-ai-operational-reconstruction',
    concept: 'Request-flow evidence for architecture learning',
    reason: 'Fabric correlation and dependency telemetry provide a method for Neural operational reconstruction; only authorized, sanitized observations can support the resulting incident or AI-integration reasoning.',
    source: anchor('fabric', 'fabric-v3-fabric-4-5'), target: anchor('neural', 'neural-v3-neural-4-4'),
  },
  {
    id: 'platform-notes-to-client-handoff',
    concept: 'Operating knowledge that survives the author',
    reason: 'Fabric documentation captures context, evidence and a failure path; Income handoff turns those same kinds of notes into configuration guidance, diagrams, runbooks, limitations and verification evidence for another operator.',
    source: anchor('fabric', 'fabric-v3-fabric-3-5'), target: anchor('income', 'income-v3-income-4-7'),
  },

  // AI-specific quality and authorization, not technology-name equivalence.
  {
    id: 'least-privilege-scope-to-ai-identity-chain',
    concept: 'Workload identities with minimal authority',
    reason: 'Credential human/workload identity and narrow-scope reasoning transfers to Neural client-to-API-to-model/search access, where managed identity and RBAC must authorize the needed operations without long-lived keys.',
    source: anchor('credential', 'credential-v3-credential-2-1'), target: anchor('neural', 'neural-v3-neural-3-2'),
  },
  {
    id: 'rag-correctness-to-reranked-grounding',
    concept: 'Authorized retrieval and answerable evidence',
    reason: 'Credential defines correct authorized retrieval before prompt changes; Neural makes that test concrete with candidate recall, 20-to-5 reranking, approved-evidence generation and citations whose limits must be defended.',
    source: anchor('credential', 'credential-v3-credential-5-4'), target: anchor('neural', 'neural-v3-neural-2-3'),
  },
  {
    id: 'ai-observability-to-quality-matrix',
    concept: 'Task-specific quality measurements',
    reason: 'Credential evaluation asks for quality checks and failure telemetry; Neural builds the corresponding matrix of correctness, grounding, refusal, latency and cost so a successful-looking answer is not the only criterion.',
    source: anchor('credential', 'credential-v3-credential-5-6'), target: anchor('neural', 'neural-v3-neural-5-2'),
  },
  {
    id: 'ai-data-boundary-to-agent-threat-model',
    concept: 'Prompt injection and tool authority',
    reason: 'Credential preventive and detective controls around sensitive data transfer to Neural search-and-ticketing threat models, which must keep authorization outside the model and address exfiltration and tool abuse.',
    source: anchor('credential', 'credential-v3-credential-5-7'), target: anchor('neural', 'neural-v3-neural-5-1'),
  },
  {
    id: 'versioned-ai-assets-to-regression-release',
    concept: 'Reproducible AI changes and release gates',
    reason: 'Credential records model, prompt and evaluation versions; Neural release discipline uses golden-set regressions to decide whether prompt, model or index changes can ship and which behavior must be restored on rollback.',
    source: anchor('credential', 'credential-v3-credential-5-8'), target: anchor('neural', 'neural-v3-neural-3-3'),
  },
  {
    id: 'agent-permission-design-to-approved-mutations',
    concept: 'Tool execution bounded by authority',
    reason: 'Credential compares deterministic orchestration with an agent and lists allowed operations; Neural incident-triage practice sharpens that boundary by separating read-only tools from mutations requiring approval.',
    source: anchor('credential', 'credential-v3-credential-5-5'), target: anchor('neural', 'neural-v3-neural-5-4'),
  },
  {
    id: 'llm-boundaries-to-structured-output-validation',
    concept: 'Model outputs are validated interface data',
    reason: 'Credential input, execution and output boundaries become concrete in Neural JSON extraction, where schema validation and explicit failure recovery keep a probabilistic response from being accepted as a valid tool contract.',
    source: anchor('credential', 'credential-v3-credential-5-3'), target: anchor('neural', 'neural-v3-neural-0-3'),
  },
  {
    id: 'architecture-unit-cost-to-model-routing',
    concept: 'Resource cost tied to required quality',
    reason: 'Credential cost drivers and unit economics transfer to Neural task-sensitive model routing: compare simple tasks with complex synthesis, account for token cost and defend safe caching without silently reducing required quality.',
    source: anchor('credential', 'credential-v3-credential-4-10'), target: anchor('neural', 'neural-v3-neural-5-3'),
  },
  {
    id: 'request-observability-to-ai-api-telemetry',
    concept: 'Ordinary request traces with AI cost signals',
    reason: 'System selects diagnostic logs, metrics and spans for slow requests; Neural production API practice extends that request evidence with model, token, retrieval and cost fields while retaining correlation and contract discipline.',
    source: anchor('system', 'system-v3-module-64'), target: anchor('neural', 'neural-v3-neural-1-4'),
  },
  {
    id: 'search-index-lag-to-rag-ingestion',
    concept: 'Source versions and derived search state',
    reason: 'System separates authoritative records from an asynchronously updated index; Neural ingestion makes that boundary inspectable through chunk source/version metadata and incremental indexing, helping explain stale retrieval after source changes.',
    source: anchor('system', 'system-v3-module-62'), target: anchor('neural', 'neural-v3-neural-2-1'),
  },

  // Delivery, decision records and career evidence with concrete shared artifacts.
  {
    id: 'artifact-lifecycle-to-small-team-pipeline',
    concept: 'Repeatable build-to-deploy delivery',
    reason: 'Credential artifact promotion, health validation and rollback supply concrete controls for Income small-team CI/CD, whose minimal build, test, scan, package and deploy path must remain operable rather than needlessly elaborate.',
    source: anchor('credential', 'credential-v3-credential-3-6'), target: anchor('income', 'income-v3-income-2-5'),
  },
  {
    id: 'diagnostic-telemetry-to-freelance-support',
    concept: 'Actionable signals after handoff',
    reason: 'Credential monitoring chooses evidence that distinguishes competing fault hypotheses; Income observability applies that choice to service logs, metrics and health signals a client can use after delivery.',
    source: anchor('credential', 'credential-v3-credential-2-5'), target: anchor('income', 'income-v3-income-2-7'),
  },
  {
    id: 'controlled-cloud-lab-to-fabric-fault-experiment',
    concept: 'Controlled experiments and cleanup',
    reason: 'Credential lab discipline adds a changed variable, evidence ledger and cleanup plan to Fabric local fault simulation, so observed recovery can be interpreted instead of attributed to an uncontrolled sequence of changes.',
    source: anchor('credential', 'credential-v3-credential-0-2'), target: anchor('fabric', 'fabric-v3-fabric-2-6'),
  },
  {
    id: 'cloud-cost-drivers-to-delivery-cost-model',
    concept: 'Cost assumptions exposed for review',
    reason: 'Credential capacity, egress and observability cost analysis supplies concrete drivers for the Income cost/capacity model, which must also expose usage assumptions and operational effort to a client or reviewer.',
    source: anchor('credential', 'credential-v3-credential-4-10'), target: anchor('income', 'income-v3-income-7-7'),
  },
  {
    id: 'architecture-rationale-to-client-adr',
    concept: 'Alternatives and reconsideration triggers',
    reason: 'Blueprint records a problem and rejected alternative; Income ADR practice carries that reasoning into changed delivery constraints with consequences and explicit triggers to revisit the decision.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s9-1'), target: anchor('income', 'income-v3-income-7-1'),
  },
  {
    id: 'integration-adr-to-architecture-decision-record',
    concept: 'A decision record that can be challenged',
    reason: 'Credential synchronous-versus-asynchronous order processing provides a concrete decision for Blueprint ADR practice, requiring alternatives and consequences that another engineer can inspect without the original author.',
    source: anchor('credential', 'credential-v3-credential-10-2'), target: anchor('blueprint', 'blueprint-v3-blueprint-s9-1'),
  },
  {
    id: 'design-opening-to-client-problem-statement',
    concept: 'Requirements before solution selection',
    reason: 'Blueprint design openings expose a requirement, constraint and unknown; Income problem statements translate the same discipline into symptoms, business impact, desired state and acceptance for a vague Azure-help request.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s10-2'), target: anchor('income', 'income-v3-income-1-2'),
  },
  {
    id: 'architecture-evidence-to-portfolio-narrative',
    concept: 'Artifacts support outcomes, not planned achievements',
    reason: 'Blueprint asks what an existing artifact actually demonstrates; Income portfolio narrative uses that evidence to explain a practice case through decisions and measured before/after results without presenting plans as delivered work.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s12-5'), target: anchor('income', 'income-v3-income-9-5'),
  },
  {
    id: 'claim-followups-to-delivery-interview',
    concept: 'Technical claims withstand mechanism questions',
    reason: 'Escape maps a supported claim to ownership, mechanism, impact and failure follow-ups; Income interview translation prepares a delivered or explicitly practice project through requirements, trade-offs, measurements and lessons.',
    source: anchor('escape', 'escape-v3-escape-3-1'), target: anchor('income', 'income-v3-income-10-3'),
  },
  {
    id: 'mock-repair-loop-to-fabric-interview',
    concept: 'Follow-ups identify specific recovery work',
    reason: 'Escape timed mocks produce scored failures and targeted repairs; Fabric technical/behavioral mocks apply that loop to no-notes failure explanations, changed constraints and unsupported ownership statements.',
    source: anchor('escape', 'escape-v3-escape-9-2'), target: anchor('fabric', 'fabric-v3-fabric-5-6'),
  },
  {
    id: 'auth-migration-recovery-to-fabric-trust',
    concept: 'Identity concepts and certificate lifecycle stay distinct',
    reason: 'Escape authentication recovery separates generic identity flow from supported migration history; Fabric trust-boundary and credential-owner mapping helps defend certificate rotation, permissions and availability without conflating TLS with OAuth.',
    source: anchor('escape', 'escape-v3-escape-5-3'), target: anchor('fabric', 'fabric-v3-fabric-4-6'),
  },
  {
    id: 'primary-artifact-recovery-to-architecture-proof',
    concept: 'Evidence strength and safe public claims',
    reason: 'Escape distinguishes primary artifacts, memory and reconstructed designs; Blueprint portfolio packaging can use that distinction to state exactly what an authorized, sanitized architecture artifact proves and what remains unverified.',
    source: anchor('escape', 'escape-v3-escape-3-3'), target: anchor('blueprint', 'blueprint-v3-blueprint-s12-5'),
  },
  {
    id: 'order-invariant-to-event-driven-delivery',
    concept: 'Order correctness across asynchronous failures',
    reason: 'Blueprint starts an order/payment flow with its invariant; Income event-driven order practice tests it through explicit retry, idempotency and dead-letter recovery paths under changed constraints.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s4-6'), target: anchor('income', 'income-v3-income-8-4'),
  },
  {
    id: 'operational-readiness-to-client-runbook',
    concept: 'Failure assumptions become handoff instructions',
    reason: 'Blueprint readiness review identifies a failure assumption and the signal that reveals it; Income handoff can turn that pair into a runbook entry with limitations and verification evidence for the next operator.',
    source: anchor('blueprint', 'blueprint-v3-blueprint-s10-4'), target: anchor('income', 'income-v3-income-4-7'),
  },
  {
    id: 'drift-control-to-declarative-infrastructure',
    concept: 'Declared intent and observed resource state',
    reason: 'Escape desired-versus-observed comparison provides a way to reason about Income infrastructure drift; the declarative-state exercise adds protected state, secrets and safe change rather than assuming detection authorizes automatic remediation.',
    source: anchor('escape', 'escape-v3-escape-5-2'), target: anchor('income', 'income-v3-income-2-6'),
  },
  {
    id: 'migration-strategy-to-modernization-offer',
    concept: 'Operationally safe modernization choices',
    reason: 'Credential compares migration strategies and rollback boundaries; Income modernization applies those choices to a constrained service transition, selecting a reversible seam instead of assuming replacement is always justified.',
    source: anchor('credential', 'credential-v3-credential-4-9'), target: anchor('income', 'income-v3-income-3-6'),
  },
  {
    id: 'workload-estimates-to-delivery-capacity-cost',
    concept: 'Usage assumptions drive capacity and cost',
    reason: 'System derives requests, storage, bandwidth and peaks from stated activity assumptions; Income uses those estimates to explain scaling costs and operating effort without presenting speculative precision as a verified budget.',
    source: anchor('system', 'system-v3-module-10'), target: anchor('income', 'income-v3-income-7-7'),
  },
  {
    id: 'latency-throughput-to-fabric-tuning',
    concept: 'Tail latency versus completed work',
    reason: 'System distinguishes p99 response time from throughput and batching effects; Fabric performance tuning applies that distinction when choosing a workload, percentile and concurrency before validating an optimization.',
    source: anchor('system', 'system-v3-module-03'), target: anchor('fabric', 'fabric-v3-fabric-4-7'),
  },
  {
    id: 'tenant-fairness-to-ai-capacity-isolation',
    concept: 'Noisy-neighbor protection for expensive requests',
    reason: 'System multi-tenancy requires fair shared-resource access as well as data separation; Neural per-tenant queue and concurrency limits test that resource boundary for slow, expensive or bursty AI work.',
    source: anchor('system', 'system-v3-module-69'), target: anchor('neural', 'neural-v3-neural-4-2'),
  },
];
