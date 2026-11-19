import type { AppState } from '../../domain/types';
import { pathProfileSchema, profileFromWorkspace } from '../../domain/omscs/paths/model';
import type { PathProfile } from '../../domain/omscs/paths/model';

export function readPlanningContext(state: AppState, practice: boolean): {
  profile: PathProfile | null; source: string; error: string;
} {
  let value: unknown = profileFromWorkspace(state);
  let source = practice ? 'Isolated tutorial assumptions' : 'Saved course entries / unsaved planning defaults';
  if (import.meta.env.DEV && location.hostname === '127.0.0.1' && !practice) {
    const node = document.getElementById('omscs-private-planning-context');
    if (node?.textContent) {
      try {
        value = JSON.parse(node.textContent);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        return { profile: null, source: 'Private local preview', error: 'The supplied local planning context is not valid JSON. No workspace data was changed.' };
      }
      source = 'Supplied private local preview / not saved academic records';
    }
  }
  const parsed = pathProfileSchema.safeParse(value);
  return parsed.success ? { profile: parsed.data, source, error: '' }
    : { profile: null, source, error: `Planning assumptions need review: ${parsed.error.issues.map(issue => issue.message).join(' ')}` };
}
