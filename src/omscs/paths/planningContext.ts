import type { AppState } from '../../domain/types';
import { pathProfileSchema, profileFromWorkspace } from '../../domain/omscs/paths/model';
import type { PathProfile } from '../../domain/omscs/paths/model';

export function readPlanningContext(state: AppState, practice: boolean): {
  profile: PathProfile | null; source: string; error: string;
} {
  const value: unknown = profileFromWorkspace(state);
  const source = practice ? 'Isolated tutorial assumptions' : 'Saved academic entries / public starter defaults';
  const parsed = pathProfileSchema.safeParse(value);
  return parsed.success ? { profile: parsed.data, source, error: '' }
    : { profile: null, source, error: `Planning assumptions need review: ${parsed.error.issues.map(issue => issue.message).join(' ')}` };
}
