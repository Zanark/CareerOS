export const omscsTeaching: Readonly<Record<string, { model: string; example: string }>> = {
    "omscs-cs7641-foundations": {
        model: 'A learner fits a relationship from examples, but the useful question is how it behaves on new data. Separate training, model selection and final evaluation. Choose metrics that reflect the decision and its errors, not the most flattering aggregate.',
        example: 'A synthetic incident classifier appears accurate because almost every case is routine. Compare it with an always-routine baseline and inspect rare important failures before selecting a model.'
    },
    "omscs-cs7641-experiments": {
        model: 'An experiment changes a stated factor while holding enough context constant to interpret its effect. Unsupervised structure is a candidate representation, not a discovery of objective business categories. Keep seeds, preprocessing and data versions reproducible.',
        example: 'A cluster groups documents by length instead of topic. Inspect examples and the representation rather than presenting a visually clean plot as proof of meaningful categories.'
    },
    "omscs-cs7641-defense": {
        model: 'A report should connect a hypothesis, method, result and limitation. Code enables the experiment; it does not replace the analysis. Retain unsuccessful approaches and avoid selecting conclusions after viewing the final test result.',
        example: 'A larger model improves one validation run but not repeated held-out checks. A defensible report may recommend the smaller baseline for stability and operational simplicity.'
    },
    "omscs-cs6200-concurrency": {
        model: 'Concurrency permits overlapping work but introduces shared-state invariants and ordering problems. State who owns each resource and what makes a transition safe. A program that usually finishes can still have an incorrect cancellation or shutdown path.',
        example: 'A producer waits on a full queue while the consumer is stopping. Without a termination protocol, shutdown can hang even though the normal data path works.'
    },
    "omscs-cs6200-resources": {
        model: 'A request crosses CPU, memory and I/O boundaries. Measure where it waits before adding concurrency. Bounded work queues make overload visible; an unbounded queue can preserve throughput temporarily while making latency and memory use unacceptable.',
        example: 'A service processes ten requests per second while fifty arrive. Adding a queue does not create capacity; it moves the failure into delay and memory growth.'
    },
    "omscs-cs6200-communication": {
        model: 'Crossing a process boundary introduces message formats, failures and lifecycle ownership. A successful function call in one process is not evidence that a remote interaction survived interruption. Keep the protocol and cleanup behavior observable.',
        example: 'A worker exits after receiving a request. The caller needs an explicit failure or uncertain result, not a blocked connection and a leaked buffer.'
    },
    "omscs-cs6515-paradigms": {
        model: 'The central work is choosing the state and proving that smaller subproblems preserve the information needed for the answer. A recurrence needs base cases, an evaluation order and a complexity argument; passing a few examples is not a proof.',
        example: 'A scheduling DP omits a resource constraint from its state. Two histories with the same stored state then require different next decisions, invalidating the recurrence.'
    },
    "omscs-cs6515-graphs": {
        model: 'Vertices and edges must represent the problem accurately before an algorithm can be correct. Distinguish reachability, ordering, shortest path and capacity constraints; they ask different questions even when drawn with similar arrows.',
        example: 'A job-dependency graph asks for a valid order, not a shortest route. A cycle prevents a complete ordering and should become an explicit diagnostic.'
    },
    "omscs-cs6515-limits": {
        model: 'A hardness result is about a precisely defined problem, not a claim that every practical instance is impossible. Reductions connect problems in a direction that must be defended. Separate worst-case complexity from measured runtime on one input.',
        example: 'A small search finishes quickly, but doubling an input dimension creates an exponential state space. A benchmark alone did not establish scalability.'
    },
    "omscs-cs7643-gradients": {
        model: 'Training connects a loss to parameters through a computation graph. Shapes, gradients and update rules are testable mechanisms. Deliberately fitting a tiny dataset can expose implementation errors before a larger experiment hides them.',
        example: 'A tensor broadcasts across the wrong dimension and training still produces numbers. A tiny controlled example and gradient check expose the incorrect operation.'
    },
    "omscs-cs7643-architectures": {
        model: 'Architectures encode assumptions about structure and information flow. Explain what an operation can see, what it preserves and the cost of its representation. An attention visualization is not by itself a causal explanation of a model decision.',
        example: 'A sequence model accidentally observes future tokens during training. Apparent predictive quality disappears when the information boundary is corrected.'
    },
    "omscs-cs7643-evaluation": {
        model: 'A project needs a falsifiable task, a baseline, a controlled evaluation and a limitation. Modern model families are choices, not a requirement to use the newest one. Reproducibility includes data, environment, seed and the reasoning behind evaluation.',
        example: 'A generated output looks convincing but fails a task-specific factual check. A qualitative example and a held-out metric answer different questions and should both be labelled.'
    },
    "omscs-cs7650-representations": {
        model: 'Text must be represented before a model can operate on it. A representation chooses which distinctions are available and which are lost. Limited compute and memory make algorithmic complexity relevant even when working inside a notebook.',
        example: 'A classifier learns a document-source identifier rather than the intended topic. A new source breaks its apparent success.'
    },
    "omscs-cs7650-language": {
        model: 'A language model assigns or generates sequences under a learned distribution. Likely text is not necessarily true text. Trace training targets, context and decoding decisions before attaching professional meaning to an output.',
        example: 'A fluent generated explanation contradicts its source. Better fluency alone does not repair the unsupported claim.'
    },
    "omscs-cs7650-retrieval": {
        model: 'Retrieval quality and answer quality are separate layers. A relevant document can still be unauthorized, stale or insufficient to answer. Define answerability and abstention before choosing a generation system.',
        example: 'The top-ranked document mentions a service but describes an old version. A confident answer needs to disclose the version boundary or abstain.'
    },
    "omscs-cs7210-protocols": {
        model: 'A distributed observer sees messages and local transitions, not a single trustworthy global clock. An acknowledgement can be lost after work completes. Stable logical identity lets a protocol recognize a repeated request without confusing it with new work.',
        example: 'A worker completes an action but its reply is dropped. A retry with a new identity creates another effect; a stable ID permits reconciliation under the stated storage/failure assumptions.'
    },
    "omscs-cs7210-replication": {
        model: 'Replicas need rules for agreeing on state and authority. Safety constrains what must never happen; liveness concerns eventual progress under stated conditions. A timeout is a local observation, not proof another node is dead.',
        example: 'Two nodes each believe the other is unavailable. An unsafe failover design lets both accept incompatible writes.'
    },
    "omscs-cs7210-sharding": {
        model: 'Partitioning data creates coordination and reconfiguration problems rather than removing them. Explore adverse message orders and retain a short failing trace. A test passing one schedule does not establish a protocol invariant for all schedules.',
        example: 'A transaction spans two shards while one changes ownership. The design must define who can decide and how participants recover, not merely retry the client forever.'
    },
    "omscs-cs7295-execution": {
        model: 'A GPU executes many related operations under a structured execution and memory model. Parallel code still needs ownership, bounds and synchronization rules. First establish a correct result against a small reference before measuring speed.',
        example: 'A numerical kernel reads beyond a tail boundary when the input size is not a multiple of the launch size.'
    },
    "omscs-cs7295-performance": {
        model: 'A faster kernel can leave complete application latency unchanged if transfer or orchestration dominates. Architecture simulators teach specific assumptions; they are not direct measurements of every production device.',
        example: 'A kernel improves locally while host-to-device copies dominate a small request. Excluding those copies gives a misleading end-to-end speedup.'
    },
    "omscs-cs7295-analysis": {
        model: 'Connect an implementation mechanism to the task it accelerates and the complete operational budget. A code-analysis result is evidence about a defined property, not proof that the application is safe, accurate or cost-effective.',
        example: 'An optimized ML primitive produces a different numerical result outside the accepted tolerance. A latency improvement does not compensate for violating the task contract.'
    },
    "omscs-cs7637-review": {
        model: 'A reasoning agent operates on an explicit representation with assumptions about what the world contains and which transitions are valid. A solution must expose those assumptions, not merely emit a plausible action.',
        example: 'A planner finds a legal route only because a missing constraint was never represented. Correct reasoning over an incomplete model can still fail the actual task.'
    },
    "omscs-cs7632-review": {
        model: 'Game AI selects behavior that supports a playable experience under limited time and compute. An approximation may be an excellent game design but an unacceptable shortcut in another domain. State the task and budget before transferring the technique.',
        example: 'A path planner chooses a cheap approximate route for an NPC. The same approximation cannot silently become an authorization or safety decision for a production worker.'
    },
    "omscs-cs6457-review": {
        model: 'An interactive system combines state, input, geometry and timely feedback. A useful artifact needs both correct mechanics and an understandable experience. Separate a user preference from a reproducible implementation defect.',
        example: 'A rotation looks correct at one camera angle but fails after a transform-order change. A second viewpoint exposes the hidden assumption.'
    }
};
