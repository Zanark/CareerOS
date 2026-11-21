import { ArrowRight, ArrowUpRight, BookOpen, FileText } from 'lucide-react';
import { useState } from 'react';
import { PageHeading } from '../components';
import { getMission } from '../domain/catalog';
import { DSA_EXPANDED_SOURCE, dsaSections, dsaMasteryGate, dsaPracticeProtocol, dsaStudySectionFor } from '../domain/operations/dsaStudy';
import type { AppState, Checkpoint } from '../domain/types';
import type { DsaDifficulty, DsaProblemSet } from '../domain/operations/dsaStudyTypes';
import './dsa-library.css';
import { DsaNotebookCompanion } from './DsaNotebookCompanion';

const sets: { id: DsaProblemSet; label: string }[] = [
  { id: 'foundation', label: 'Foundation set' },
  { id: 'core-a', label: 'Core set A' },
  { id: 'core-b', label: 'Core set B' },
  { id: 'stress', label: 'Mastery / stress set' },
];

export function DsaPracticeLink({ checkpoint }: { checkpoint?: Checkpoint }) {
  const section = dsaStudySectionFor(checkpoint);
  return <><DsaNotebookCompanion sectionNumber={section?.number} />
    {section && <aside className="dsa-practice-link" data-tour="dsa-practice-link">
    <BookOpen size={20} />
    <div><strong>Practice for this topic</strong><p>{section.title}</p></div>
    <a className="text-link" href={`#/dsa/${section.number}`}>Open practice set<ArrowRight size={15} /></a>
  </aside>}</>;
}

export function DsaLibrary({ state, sectionNumber }: { state: AppState; sectionNumber?: string }) {
  const requested = sectionNumber ? Number(sectionNumber) : 1;
  const section = dsaSections.find(candidate => candidate.number === requested);
  const [difficulty, setDifficulty] = useState<DsaDifficulty | 'all'>('all');
  const [query, setQuery] = useState('');
  const active = getMission('pattern', state);
  const current = active.checkpoints.find(checkpoint => checkpoint.id === state.missions.pattern.checkpointId);
  const currentSection = dsaStudySectionFor(current);
  const occurrenceCount = dsaSections.reduce((sum, entry) => sum + entry.problems.length, 0);
  const uniqueCount = new Set(dsaSections.flatMap(entry => entry.problems.map(problem => problem.id))).size;
  const filtered = section?.problems.filter(problem =>
    (difficulty === 'all' || difficulty === problem.difficulty) &&
    `${problem.id} ${problem.title}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];

  return <div className="dsa-library" data-tour="dsa-library">
    <PageHeading eyebrow="PATTERN FORGE / EXPANDED SOURCE" title="DSA practice library"
      help="A read-only source library. Repeats are transfer practice, not extra completion credit. Set placement and row difficulty are different source classifications; difficulty is not checked live. Reading does not change your saved tracker.">
      <a href="#/mission/pattern" className="button secondary">Back to DSA<ArrowRight size={15} /></a>
    </PageHeading>
    <div className="dsa-library-intro">
      <p><strong>{dsaSections.length} sections / {occurrenceCount} appearances / {uniqueCount} distinct problems.</strong> Tracker v{active.roadmapVersion}</p>
    </div>
    <div className="dsa-library-controls">
      <label>PDF section<select data-tour="dsa-section" aria-label="DSA source section" value={section?.number ?? ''}
        onChange={event => { window.location.hash = `/dsa/${event.target.value}`; }}>
        {!section && <option value="" disabled>Choose a section</option>}
        {dsaSections.map(entry => <option key={entry.number} value={entry.number}>{String(entry.number).padStart(2, '0')}. {entry.title}</option>)}
      </select></label>
      {currentSection && <a href={`#/dsa/${currentSection.number}`} className="button secondary">Current checkpoint's practice</a>}
    </div>
    {!section ? <p role="alert" className="dsa-library-empty">That source section does not exist. Choose one of the 50 sections above.</p> : <>
      <section className="dsa-topic" aria-labelledby="dsa-topic-title">
        <span className="eyebrow"><FileText size={15} />PDF SECTION {String(section.number).padStart(2, '0')} / PAGES {section.page}-{section.page + 1}</span>
        <h2 id="dsa-topic-title">{section.title}</h2>
        <p>{section.summary}</p>
        <p><strong>Section target:</strong> {section.goal}</p>
        <p className="dsa-topic-guidance"><strong>Where it fits:</strong> {section.guidance}</p>
        <details><summary>Concepts and self-confirmed mastery gate</summary>
          <ul>{section.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>
          <h3>Before calling this topic complete</h3>
          <ul>{dsaMasteryGate.map(item => <li key={item}>{item}</li>)}</ul>
          <p>These are self-checks, not an AI assessment. A checkpoint's suggested minutes describe one starting session, not a deadline to master the topic.</p>
        </details>
      </section>
      <DsaNotebookCompanion sectionNumber={section.number} />
      <details className="dsa-protocol">
        <summary>How to use the sets without chasing a problem count</summary>
        <ol>{dsaPracticeProtocol.map(item => <li key={item}>{item}</li>)}</ol>
        <p>Section numbers identify the PDF's chapters, not execution order. The appended roadmap follows Appendix A's phases; study-method sections remain available throughout.</p>
        <a href="#/sources/pattern" className="text-link">Read append notes and source mapping<ArrowRight size={15} /></a>
      </details>
      <div className="dsa-problem-filters" data-tour="dsa-problem-filters">
        <label>Row difficulty<select aria-label="Filter DSA problems by difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value as DsaDifficulty | 'all')}>
          <option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option>
        </select></label>
        <label>Find a problem<input aria-label="Search DSA practice problems" placeholder="Problem number or title" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <span role="status">{filtered.length} of {section.problems.length} source entries</span>
      </div>
      {sets.map(set => {
        const problems = filtered.filter(problem => problem.set === set.id);
        if (!problems.length) return null;
        return <section key={set.id} className="dsa-problem-set" data-problem-set={set.id}>
          <h3>{set.label}<span>{problems.length}</span></h3>
          {set.id === 'stress' && <p>For later stress testing after representative Medium work is stable.</p>}
          <ul>{problems.map((problem, index) => <li key={`${problem.id}-${index}`}>
            <a href={problem.url} target="_blank" rel="noopener noreferrer"><span>{problem.id}. {problem.title}</span><ArrowUpRight size={16} /></a>
            <span className={`dsa-difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
            <small>PDF p.{problem.page}</small>
          </li>)}</ul>
        </section>;
      })}
      {!filtered.length && <p className="dsa-library-empty">No problems match these filters. Try another difficulty, title, or problem number.</p>}
      <p className="dsa-library-source">Source: {DSA_EXPANDED_SOURCE}, supplied locally. Links open LeetCode in a new tab; some problems may require an account or subscription. The PDF itself is not published.</p>
    </>}
  </div>;
}
