import type { MissionId } from '../../types';
import { pathCourse } from './catalog';

export const careerDirections = [
  { id: 'ai', title: 'AI engineering', description: 'Understand, build and evaluate useful AI applications and models.' },
  { id: 'cloud', title: 'AI cloud / solutions architecture', description: 'Design dependable AI platforms, agent runtimes, data boundaries and cloud systems.' },
  { id: 'fde', title: 'Forward deployed engineering', description: 'Discover a customer problem, deliver the system and make it useful in practice.' },
] as const;
export type CareerDirection = typeof careerDirections[number]['id'];
export type CourseFitTier = 'Direct support' | 'Supporting depth' | 'Specialist detour';
type LinkedRoadmap = Extract<MissionId, 'pattern' | 'system' | 'blueprint' | 'fabric' | 'neural' | 'fde' | 'algorithm' | 'income'>;
interface CourseAdvice {
  direct: readonly CareerDirection[];
  supporting: readonly CareerDirection[];
  roadmaps: readonly LinkedRoadmap[];
  benefit: string;
  tradeoff: string;
}

export const courseAdvice: Readonly<Record<string, CourseAdvice>> = {
  cs6035: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Build a broad security vocabulary for reviewing software, network, data and privacy risks in an AI solution.',
    tradeoff: 'Broad security foundations, not deep model training or a complete agent-authorization implementation.',
  },
  cs6150: {
    direct: ['fde'], supporting: ['ai'], roadmaps: ['fde', 'income'],
    benefit: 'Practice turning a partner or community problem into a team-delivered solution, close to Fieldcraft discovery and adoption.',
    tradeoff: 'Project and partner needs determine the technology; it is not a guaranteed AI-systems curriculum.',
  },
  cs6200: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['system', 'fabric', 'neural'],
    benefit: 'Understand threads, synchronization, memory, I/O and RPC behind reliable services and agent execution.',
    tradeoff: 'Systems foundations rather than model methods; readiness for systems programming matters.',
  },
  cs6210: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['system', 'fabric', 'blueprint'],
    benefit: 'Deepen scheduling, distributed communication and recovery reasoning before designing cloud platform internals.',
    tradeoff: 'A deeper systems choice after OS readiness, not a substitute for ML/DL foundations.',
  },
  cs6211: {
    direct: ['cloud'], supporting: ['fde'], roadmaps: ['neural', 'system', 'blueprint'],
    benefit: 'Build across SDN, cloud system software, virtualization and applications instead of stopping at architecture diagrams.',
    tradeoff: 'Project-intensive and lists mandatory weekly 90-minute live meetings; confirm strong AOS-level preparation.',
  },
  cs6238: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Reason about OS/database trust, access mediation and distributed-system security beneath an enterprise AI service.',
    tradeoff: 'Platform security depth, not a course dedicated to LLM prompt injection or a specific cloud IAM product.',
  },
  cs6250: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['system', 'fabric', 'blueprint'],
    benefit: 'Explain routing, transport, congestion and SDN when diagnosing service connectivity and cloud performance.',
    tradeoff: 'Internet protocol foundations, not graph-learning Network Science or a model-building course.',
  },
  cs6260: {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Make better privacy, authenticity and integrity decisions by understanding cryptographic foundations.',
    tradeoff: 'Focused cryptography depth competes with broader data, operating-systems or ML preparation.',
  },
  cs6261: {
    direct: ['cloud'], supporting: ['fde'], roadmaps: ['neural', 'fabric', 'fde'],
    benefit: 'Strengthen incident-response judgment and operational handoffs for systems that include AI.',
    tradeoff: 'Cybersecurity incident response is not the whole SRE discipline or model-quality evaluation.',
  },
  cs6262: {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'system'],
    benefit: 'Understand network and web threats and defenses when protecting distributed enterprise applications.',
    tradeoff: 'A security specialization choice; it does not replace general cloud or AI engineering foundations.',
  },
  cs6263: {
    direct: [], supporting: [], roadmaps: ['blueprint', 'fde'],
    benefit: 'Transfer architecture and threat-boundary reasoning into industrial and other cyber-physical systems.',
    tradeoff: 'Choose deliberately for critical infrastructure or physical-system work, not as the shortest general AI-cloud route.',
  },
  cs6264: {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Develop hands-on system/network defense and security-analysis experience for dependable software.',
    tradeoff: 'Substantial security-lab depth rather than broad AI product delivery; verify current lab readiness.',
  },
  cs6265: {
    direct: [], supporting: [], roadmaps: ['blueprint', 'fde'],
    benefit: 'Build specialized binary, reverse-engineering and security-laboratory reasoning.',
    tradeoff: 'An intentional security detour, not a direct replacement for AI, distributed systems or customer discovery.',
  },
  cs6271: {
    direct: [], supporting: [], roadmaps: ['blueprint', 'fde'],
    benefit: 'Connect resilience, embedded-system boundaries and adversarial thinking in autonomous aerial systems.',
    tradeoff: 'Useful for a drone/physical-autonomy direction; narrow for general enterprise AI-cloud work.',
  },
  cs6290: {
    direct: ['cloud'], supporting: ['ai'], roadmaps: ['system', 'neural'],
    benefit: 'Explain caches, memory hierarchy, multicore execution and hardware bottlenecks behind compute costs.',
    tradeoff: 'CPU/architecture depth; GPU programming and full AI-service latency still need separate practice.',
  },
  cs6291: {
    direct: [], supporting: ['cloud'], roadmaps: ['system', 'blueprint'],
    benefit: 'Reason about compiler, architecture, energy and memory tradeoffs in constrained computing.',
    tradeoff: 'Most compelling for embedded/edge work rather than a default cloud-hosted AI application path.',
  },
  cs6300: {
    direct: ['fde'], supporting: ['ai', 'cloud'], roadmaps: ['blueprint', 'fde'],
    benefit: 'Practice disciplined software delivery, quality and maintenance that turn a prototype into a maintainable product.',
    tradeoff: 'The degree design-slot alternative to GA, but it does not provide equivalent algorithm/proof depth.',
  },
  cs6310: {
    direct: ['cloud', 'fde'], supporting: ['ai'], roadmaps: ['blueprint', 'fde'],
    benefit: 'Evaluate architecture styles, object-oriented design and patterns, and communicate a design explicitly.',
    tradeoff: 'Software architecture/design focus, not a replacement for distributed failure experiments or ML.',
  },
  cs6340: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['blueprint', 'neural'],
    benefit: 'Understand program analysis, symbolic reasoning and automated testing behind stronger software-quality gates.',
    tradeoff: 'Especially useful for engineering-agent verification; program analysis is not the same as evaluating an LLM answer.',
  },
  cs6400: {
    direct: ['cloud', 'fde'], supporting: ['ai'], roadmaps: ['blueprint', 'fde', 'neural'],
    benefit: 'Model data, write SQL and understand normalization/indexes before building dependable customer and AI data flows.',
    tradeoff: 'Application/database foundations; not primarily vector retrieval or deep storage-engine implementation.',
  },
  cs6422: {
    direct: ['cloud'], supporting: ['ai'], roadmaps: ['system', 'blueprint'],
    benefit: 'Understand storage, indexes and query execution by working on database-system internals.',
    tradeoff: 'A deeper database/C++ implementation direction after fundamentals, not a broad first data-modeling course.',
  },
  cs6435: {
    direct: [], supporting: ['fde'], roadmaps: ['fde', 'blueprint'],
    benefit: 'Evaluate who can access and benefit from a digital system, using health-equity design and evidence.',
    tradeoff: 'Best for an intentional healthcare/user-equity direction; less model or platform implementation depth.',
  },
  cs6440: {
    direct: [], supporting: ['ai', 'fde'], roadmaps: ['fde', 'neural'],
    benefit: 'Apply interoperability, clinical data standards and project delivery to a concrete enterprise domain.',
    tradeoff: 'A meaningful healthcare FDE direction, not a domain-neutral replacement for systems or ML.',
  },
  cs6457: {
    direct: [], supporting: ['fde'], roadmaps: ['fde', 'blueprint'],
    benefit: 'Transfer interactive prototyping, team implementation and real-time product iteration into delivery work.',
    tradeoff: 'Game-engine delivery does not itself establish distributed-systems or ML understanding.',
  },
  cs6460: {
    direct: ['fde'], supporting: ['ai'], roadmaps: ['fde', 'income'],
    benefit: 'Scope and investigate a user-facing learning tool or research project, then communicate its evidence.',
    tradeoff: 'Open-ended project/research ownership; choosing an AI project does not guarantee a prescribed model syllabus.',
  },
  cs6475: {
    direct: [], supporting: ['ai'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Understand computational imaging and the formation of visual data for image-oriented products.',
    tradeoff: 'An imaging direction rather than general NLP, enterprise data or cloud-runtime depth.',
  },
  cs6476: {
    direct: ['ai'], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'pattern'],
    benefit: 'Build geometric/image-processing intuition and implementation evidence for visual AI applications.',
    tradeoff: 'Choose vision instead of, or alongside, language deliberately; it is not automatically a modern multimodal-model course.',
  },
  cs6491: {
    direct: [], supporting: ['ai'], roadmaps: ['neural', 'pattern'],
    benefit: 'Strengthen 3D representation, rendering and modeling foundations for graphics or visual-computing work.',
    tradeoff: 'A graphics-focused branch, not a default requirement for enterprise AI services.',
  },
  cs6515: {
    direct: ['ai', 'cloud'], supporting: ['fde'], roadmaps: ['pattern', 'algorithm', 'system'],
    benefit: 'Defend algorithm choices through graphs, dynamic programming, complexity and mathematical analysis.',
    tradeoff: 'Deeper algorithm/proof foundations than SDP; not a substitute for day-to-day team delivery or applied APIs.',
  },
  cs6601: {
    direct: ['ai'], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'pattern'],
    benefit: 'Broaden beyond neural models into classic AI search, uncertainty and decision-making methods.',
    tradeoff: 'A breadth choice; compare overlap with KBAI/Game AI against the opportunity for systems or modern model depth.',
  },
  cs6603: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Reason about bias, misuse and professional responsibility when defending enterprise AI decisions.',
    tradeoff: 'Responsible-AI analysis complements, but does not replace, model implementation or enforceable security controls.',
  },
  cs6675: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['system', 'blueprint', 'neural'],
    benefit: 'Compare Internet-scale systems, search, data platforms and edge/cloud architecture patterns.',
    tradeoff: 'Breadth across systems topics rather than the same deep protocol implementation as DC.',
  },
  cs6747: {
    direct: [], supporting: [], roadmaps: ['blueprint', 'fde'],
    benefit: 'Develop specialized malware, binary-analysis and security-research judgment.',
    tradeoff: 'Best for a security research/forensics direction, not the shortest general AI-cloud plan.',
  },
  cs6750: {
    direct: ['fde'], supporting: ['ai', 'cloud'], roadmaps: ['fde', 'blueprint'],
    benefit: 'Discover user needs, prototype interfaces and evaluate whether an AI-enabled system is actually usable.',
    tradeoff: 'Strong adoption/design complement, but not a coding-intensive substitute for ML or systems foundations.',
  },
  cs6795: {
    direct: [], supporting: ['ai', 'fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Challenge assumptions about intelligence, representation and human-system interaction using cognitive models.',
    tradeoff: 'Conceptual/interdisciplinary depth rather than a direct path to deploying models or cloud infrastructure.',
  },
  cs7210: {
    direct: ['cloud'], supporting: ['ai', 'fde'], roadmaps: ['system', 'fabric', 'neural'],
    benefit: 'Implement and reason about distributed components, failures and protocols behind dependable services and agents.',
    tradeoff: 'Deep distributed-systems work; a protocol project alone does not establish production exactly-once effects.',
  },
  cs7240: {
    direct: [], supporting: ['cloud'], roadmaps: ['blueprint', 'neural'],
    benefit: 'Design ethical, reproducible Internet measurements rather than drawing conclusions from convenient observations.',
    tradeoff: 'A research-methods and Internet-measurement direction rather than a default AI application course.',
  },
  cs7280: {
    direct: [], supporting: ['ai', 'cloud'], roadmaps: ['neural', 'pattern'],
    benefit: 'Understand network topology, graph inference and embeddings for relational-data problems.',
    tradeoff: 'Network Science studies complex graphs; it is not the Internet-protocol foundation of Computer Networks.',
  },
  cs7295: {
    direct: ['cloud'], supporting: ['ai'], roadmaps: ['neural', 'system'],
    benefit: 'Connect GPU architecture, CUDA and optimization to credible compute-performance and cost decisions.',
    tradeoff: 'A kernel speedup is not an end-to-end agent or application speedup; model and data fundamentals still matter.',
  },
  cs7400: {
    direct: [], supporting: [], roadmaps: ['pattern', 'blueprint'],
    benefit: 'Explore a genuinely different computation model, including quantum programs, architecture and compilation.',
    tradeoff: 'An intentional quantum direction, not a prerequisite for current general AI-cloud engineering.',
  },
  cs7470: {
    direct: [], supporting: ['fde', 'ai'], roadmaps: ['fde', 'blueprint'],
    benefit: 'Build and deploy context-aware, sensing-oriented systems across real user environments.',
    tradeoff: 'Choose for mobile/edge product work rather than generic cloud-platform or model-training depth.',
  },
  cs7496: {
    direct: [], supporting: ['ai'], roadmaps: ['pattern', 'neural'],
    benefit: 'Apply mathematics and algorithms to motion, simulation and physically based animation.',
    tradeoff: 'Algorithmic animation, not an animation-tool tutorial or a default language/enterprise AI subject.',
  },
  cs7632: {
    direct: [], supporting: ['ai'], roadmaps: ['pattern', 'neural'],
    benefit: 'Transfer path planning, decision-making and bounded real-time behavior into explainable AI reasoning.',
    tradeoff: 'Game AI optimizes a player experience; its shortcuts are not automatically valid for trustworthy enterprise agents.',
  },
  cs7637: {
    direct: ['ai'], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'pattern'],
    benefit: 'Represent knowledge, reason, plan and explain behavior instead of treating every AI problem as a neural-model prompt.',
    tradeoff: 'Symbolic/cognitive foundations do not replace statistical ML, deep learning or production deployment.',
  },
  cs7638: {
    direct: [], supporting: ['ai'], roadmaps: ['neural', 'pattern'],
    benefit: 'Apply probabilistic inference, search, localization and control to embodied AI problems.',
    tradeoff: 'Most compelling for robotics/autonomy; not a default substitute for NLP or cloud systems.',
  },
  cs7639: {
    direct: [], supporting: ['cloud'], roadmaps: ['blueprint', 'neural'],
    benefit: 'Study explicit models and verification for systems whose software acts on the physical world.',
    tradeoff: 'Physical-system assurance is a useful lens, but does not directly implement enterprise cloud-agent safety.',
  },
  cs7641: {
    direct: ['ai', 'cloud'], supporting: ['fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Build the mathematical, statistical and experimental foundation for choosing and evaluating models.',
    tradeoff: 'Fundamental model reasoning rather than a turnkey LLM app; pair with delivery and systems practice.',
  },
  cs7642: {
    direct: [], supporting: ['ai', 'cloud'], roadmaps: ['neural', 'pattern'],
    benefit: 'Understand learning policies, exploration and sequential decisions beyond ordinary supervised prediction.',
    tradeoff: 'Valuable for a deliberate decision-learning direction; not required just because an application uses the word agent.',
  },
  cs7643: {
    direct: ['ai'], supporting: ['cloud', 'fde'], roadmaps: ['neural'],
    benefit: 'Understand and implement neural-network training, representations and optimization behind modern AI.',
    tradeoff: 'Model depth rather than a complete RAG, cloud governance or production operations curriculum.',
  },
  cs7646: {
    direct: [], supporting: ['ai'], roadmaps: ['neural', 'pattern'],
    benefit: 'Practice a complete probabilistic-model workflow with financial data and trading decisions.',
    tradeoff: 'A finance application lens, not a replacement for broad ML or evidence of profitable real trading.',
  },
  cs7650: {
    direct: ['ai', 'cloud'], supporting: ['fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Understand language representations and models before defending text search, retrieval and language applications.',
    tradeoff: 'Language-method foundations do not by themselves establish secure, current or production-ready RAG.',
  },
  cs7711: {
    direct: [], supporting: ['fde'], roadmaps: ['fde', 'blueprint'],
    benefit: 'Translate a health-sensing problem into an evaluated hardware or software intervention.',
    tradeoff: 'A deliberate health/physical-sensing direction, not a default general AI-cloud elective.',
  },
  'cs8803-o08': {
    direct: [], supporting: ['ai', 'cloud'], roadmaps: ['pattern', 'blueprint'],
    benefit: 'Understand parsing, representations, types and code generation behind language tooling and execution systems.',
    tradeoff: 'Choose for compiler/toolchain or deeper code-agent interests, not as a broad cloud architecture shortcut.',
  },
  'cs8803-o15': {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['blueprint', 'fde'],
    benefit: 'Recognize licensing, contracts, intellectual-property and privacy issues that need expert advice.',
    tradeoff: 'Legal literacy, not legal qualification or a technical substitute for software/data foundations.',
  },
  'cs8803-o17': {
    direct: ['fde'], supporting: [], roadmaps: ['fde', 'income'],
    benefit: 'Test customer demand and iterate a business/product hypothesis instead of building before discovery.',
    tradeoff: 'Entrepreneurial/customer learning rather than guaranteed coding, model or systems depth.',
  },
  'cs8803-o20': {
    direct: [], supporting: [], roadmaps: ['blueprint', 'system'],
    benefit: 'Explore the physical and architectural systems behind quantum devices.',
    tradeoff: 'A specific quantum-hardware direction, not preparation required for conventional AI cloud services.',
  },
  'cs8803-o24': {
    direct: [], supporting: ['ai', 'cloud', 'fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Learn to formulate questions, review evidence and communicate a defensible research proposal.',
    tradeoff: 'Research process instead of a prescribed implementation specialization; the chosen topic determines technical transfer.',
  },
  'cs8803-o25': {
    direct: [], supporting: ['cloud'], roadmaps: ['system', 'blueprint'],
    benefit: 'Deepen wireless/5G architecture, mobility, resource and protocol reasoning for edge-connected systems.',
    tradeoff: 'A wireless-network branch after considering general networking; not direct model engineering.',
  },
  'cs8803-o27': {
    direct: [], supporting: ['ai'], roadmaps: ['neural', 'pattern'],
    benefit: 'Explore neural representations, differentiable rendering and generative 3D systems.',
    tradeoff: 'An exciting graphics-AI specialization, not a default substitute for language or cloud-platform foundations.',
  },
  'cs8803-o34': {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Analyze how behavior, trust and organizational decisions undermine purely technical security controls.',
    tradeoff: 'Human-centered threat analysis complements, but does not implement, runtime or authorization controls.',
  },
  'cs8803-oro': {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['blueprint', 'fde'],
    benefit: 'Practice team/research coordination and leadership within a real research-management setting.',
    tradeoff: 'Managing AI research is distinct from personally implementing its models or infrastructure.',
  },
  cse6220: {
    direct: ['cloud'], supporting: ['ai'], roadmaps: ['system', 'neural', 'pattern'],
    benefit: 'Analyze parallel algorithms, communication and data movement across multicore and distributed machines.',
    tradeoff: 'Algorithmic/HPC depth rather than the same failure-protocol focus as Distributed Computing or CUDA focus of GPU.',
  },
  cse6242: {
    direct: ['fde'], supporting: ['ai', 'cloud'], roadmaps: ['fde', 'neural'],
    benefit: 'Turn large-scale analysis into interactive visual explanations and a team-delivered data product.',
    tradeoff: 'Broad analytics/visualization integration rather than deep model theory or distributed-system internals.',
  },
  cse6250: {
    direct: [], supporting: ['ai', 'cloud', 'fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Connect scalable analytics systems and ML methods through complex healthcare data.',
    tradeoff: 'A healthcare/big-data direction; verify readiness before treating it as an introductory data course.',
  },
  cse6742: {
    direct: [], supporting: [], roadmaps: ['blueprint', 'fde'],
    benefit: 'Use multidisciplinary simulation and explicit hypotheses to investigate complex strategic scenarios.',
    tradeoff: 'A domain-specific modeling direction, not an AI-cloud or generic production-systems course.',
  },
  ece8843: {
    direct: [], supporting: ['cloud'], roadmaps: ['neural', 'system'],
    benefit: 'Understand hardware/software information leakage when reasoning about security boundaries.',
    tradeoff: 'Specialized side-channel depth and a non-CS/CSE slot; not a broad first security or cloud course.',
  },
  inta6450: {
    direct: [], supporting: ['ai', 'fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Connect analytics, security evidence and the social implications of surveillance/prediction.',
    tradeoff: 'Uses non-CS/CSE allowance; the optional industry-data project lists an NDA, not permission to publish its data.',
  },
  isye6402: {
    direct: [], supporting: ['ai', 'cloud'], roadmaps: ['neural', 'system'],
    benefit: 'Model temporal behavior and validate forecasts for time-dependent data or capacity questions.',
    tradeoff: 'A forecasting direction, not generic anomaly detection by default; uses non-CS/CSE allowance.',
  },
  isye6414: {
    direct: ['ai'], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'fde'],
    benefit: 'Build interpretable statistical baselines and model-selection reasoning before trusting more complex AI.',
    tradeoff: 'Consider overlap with ML and the two-course non-CS/CSE allowance; regression is not deep learning.',
  },
  isye6420: {
    direct: [], supporting: ['ai', 'cloud'], roadmaps: ['neural'],
    benefit: 'Reason explicitly about uncertainty, evidence and probabilistic inference.',
    tradeoff: 'Statistical depth rather than an application/deployment course; uses non-CS/CSE allowance.',
  },
  isye6501: {
    direct: ['fde'], supporting: ['ai', 'cloud'], roadmaps: ['fde', 'neural'],
    benefit: 'Choose among predictive, optimization and experimentation models for an actual business question.',
    tradeoff: 'Breadth and model selection rather than ML-theory equivalence; uses non-CS/CSE allowance.',
  },
  isye6525: {
    direct: [], supporting: ['ai'], roadmaps: ['neural', 'pattern'],
    benefit: 'Deepen high-dimensional modeling, regularization, tensors and optimization for structured data.',
    tradeoff: 'A mathematical specialization after considering ML foundations; uses non-CS/CSE allowance.',
  },
  isye6644: {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['system', 'blueprint'],
    benefit: 'Model discrete-event behavior and compare engineering decisions through explicit simulation.',
    tradeoff: 'Simulation evidence is not a live-system benchmark; uses non-CS/CSE allowance.',
  },
  isye6669: {
    direct: [], supporting: ['ai', 'cloud'], roadmaps: ['pattern', 'neural'],
    benefit: 'Formulate constrained allocation and decision problems using linear, integer and convex optimization.',
    tradeoff: 'Choose for optimization depth rather than broad AI delivery; uses non-CS/CSE allowance.',
  },
  mgt6311: {
    direct: [], supporting: ['fde'], roadmaps: ['income', 'fde'],
    benefit: 'Understand audience, positioning and acquisition when considering a customer-facing independent product.',
    tradeoff: 'Commercial context rather than engineering depth; uses one of the limited non-CS/CSE slots.',
  },
  mgt8813: {
    direct: [], supporting: [], roadmaps: ['income', 'blueprint'],
    benefit: 'Strengthen finance-modeling literacy and explain financial assumptions in a business case.',
    tradeoff: 'Finance/Excel models are not cloud-cost engineering or ML training; uses non-CS/CSE allowance.',
  },
  pubp6725: {
    direct: [], supporting: ['cloud', 'fde'], roadmaps: ['neural', 'blueprint'],
    benefit: 'Analyze cybersecurity governance and organizational/public-policy responsibilities.',
    tradeoff: 'Policy judgment rather than implementation of technical controls; uses non-CS/CSE allowance.',
  },
  pubp8823: {
    direct: [], supporting: [], roadmaps: ['blueprint', 'fde'],
    benefit: 'Add a strategic international-policy lens for work in a specifically geopolitical cybersecurity domain.',
    tradeoff: 'A deliberate policy/domain branch, not direct general AI-cloud preparation; uses non-CS/CSE allowance.',
  },
};

export function courseCareerFit(id: string, direction: CareerDirection) {
  const course = pathCourse(id), advice = courseAdvice[id];
  if (!advice) throw new Error(`Missing reviewed course-to-career guidance for ${id}.`);
  const tier: CourseFitTier = advice.direct.includes(direction) ? 'Direct support'
    : advice.supporting.includes(direction) ? 'Supporting depth' : 'Specialist detour';
  return { ...advice, tier, source: course.url };
}
