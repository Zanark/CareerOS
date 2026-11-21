import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialState, generatePlan, localDate, parseState } from './domain/engine';
import type { AppState } from './domain/types';
import type { WorkspaceModel } from './useWorkspace';
import { serializeWorkspace } from './workspaceFile';

export function createPracticeState(date = localDate()): AppState {
  const state = createInitialState(false);
  delete state.omscsPlan;
  state.missions.fabric = { ...createInitialState(false, '1.0.0').missions.fabric };
  state.sampleData = true;
  state.objective = 'Tutorial example: practice tracking a learning goal.';
  state.plans[date] = generatePlan(state, date);
  return parseState(state);
}

export function usePracticeWorkspace(): WorkspaceModel & {
  active: boolean;
  generation: number;
  begin: () => void;
  end: () => void;
} {
  const [state, setState] = useState<AppState | null>(null);
  const current = useRef(state);
  const [error, setError] = useState('');
  const [date, setDate] = useState(localDate);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setDate(localDate()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const replace = useCallback((value: AppState) => {
    try {
      const next = parseState(value);
      serializeWorkspace(next);
      current.current = next;
      setState(next);
      setError('');
      return true;
    } catch (cause) {
      setError(`Practice change rejected. ${cause instanceof Error ? cause.message : 'Invalid practice data.'}`);
      return false;
    }
  }, []);

  const commit = useCallback((transform: (value: AppState) => AppState) => {
    try {
      if (!current.current) throw new Error('Start the tutorial before changing practice data.');
      return replace(transform(current.current));
    } catch (cause) {
      setError(`Practice change rejected. ${cause instanceof Error ? cause.message : 'Invalid practice action.'}`);
      return false;
    }
  }, [replace]);

  const begin = useCallback(() => {
    const today = localDate();
    current.current = createPracticeState(today);
    setState(current.current);
    setDate(today);
    setError('');
    setGeneration(value => value + 1);
  }, []);

  const end = useCallback(() => {
    current.current = null;
    setState(null);
    setError('');
  }, []);

  useEffect(() => {
    if (current.current && !current.current.plans[date]) {
      commit(value => ({ ...value, plans: { ...value.plans, [date]: generatePlan(value, date) } }));
    }
  }, [date, state, commit]);

  return {
    state, active: state !== null, date, error, setError, generation,
    conflict: false, recoveryRaw: null, commit, replace, begin, end,
  };
}
