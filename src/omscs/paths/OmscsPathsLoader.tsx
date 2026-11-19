import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { AppState } from '../../domain/types';

export interface OmscsPathsProps { state: AppState; practice: boolean }

export default function OmscsPathsLoader(props: OmscsPathsProps) {
  const [Page, setPage] = useState<ComponentType<OmscsPathsProps> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    import('./OmscsPathsPage').then(module => {
      if (active) setPage(() => module.default);
    }, reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'The course-path explorer could not be loaded.');
    });
    return () => { active = false; };
  }, []);
  if (error) return <section className="panel alert error" role="alert">
    <p>Course paths could not be loaded: {error}. Your workspace has not been replaced.</p>
    <button className="button secondary" onClick={() => window.location.reload()}>Reload path explorer</button>
  </section>;
  return Page ? <Page {...props} /> : <p role="status">Loading the course-path explorer...</p>;
}
