import { Badge, ContextHelp } from '../components';
import type { AppState } from '../domain/types';
import { omscsTermLabel } from '../domain/omscs/model';
import { createAcademicStarter } from '../domain/omscs/starter';
import './specializations.css';

export function AcademicBasis({ state, showSpecializationsLink = true }: { state: AppState; showSpecializationsLink?: boolean }) {
  const plan = state.omscsPlan;
  const completed = plan?.courses.filter(row => row.status === 'completed' && ['A', 'B', 'C'].includes(row.grade)).length ?? 0;
  return <div className="academic-basis" data-tour="academic-basis">
    <div className="academic-basis-term">
      <Badge>Resume / {omscsTermLabel(plan?.startTerm ?? createAcademicStarter().startTerm)}</Badge>
      <ContextHelp title="Academic basis">The app includes an owner-approved public starter profile. Saved academic entries are self-reports, not university verification or learning checkpoint credit. Explicit custom records and start terms take precedence. Edit or export your academic entries from Georgia Tech OMSCS.</ContextHelp>
    </div>
    <span>{completed} passing / {Math.max(0, 10 - completed)} remaining</span>
    {showSpecializationsLink && <a className="text-link" href="#/omscs/specializations">All specializations</a>}
  </div>;
}
