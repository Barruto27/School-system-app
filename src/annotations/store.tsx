import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Annotation } from './types';

interface State {
  byId: Record<string, Annotation>;
  order: string[];
  /** False until the load effect has hydrated this docKey's saved annotations.
   * The persist effect must not write while this is false — otherwise it
   * clobbers the on-disk data with the reducer's empty initial state before
   * the load has had a chance to apply (a real race, worse under StrictMode's
   * dev-only double-invocation of effects). */
  loaded: boolean;
}

type Action =
  | { type: 'load'; annotations: Annotation[] }
  | { type: 'add'; annotation: Annotation }
  | { type: 'update'; id: string; patch: Partial<Annotation> }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load': {
      const byId: Record<string, Annotation> = {};
      const order: string[] = [];
      for (const a of action.annotations) {
        byId[a.id] = a;
        order.push(a.id);
      }
      return { byId, order, loaded: true };
    }
    case 'add':
      return {
        ...state,
        byId: { ...state.byId, [action.annotation.id]: action.annotation },
        order: [...state.order, action.annotation.id],
      };
    case 'update': {
      const existing = state.byId[action.id];
      if (!existing) return state;
      return {
        ...state,
        byId: { ...state.byId, [action.id]: { ...existing, ...action.patch } as Annotation },
      };
    }
    case 'remove': {
      const { [action.id]: _removed, ...rest } = state.byId;
      return { ...state, byId: rest, order: state.order.filter((id) => id !== action.id) };
    }
    case 'clear':
      return { ...state, byId: {}, order: [] };
    default:
      return state;
  }
}

interface AnnotationContextValue {
  annotations: Annotation[];
  byPage: (page: number) => Annotation[];
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAll: () => void;
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

function storageKey(docKey: string) {
  return `pkos:annotations:${docKey}`;
}

export function AnnotationProvider({ docKey, children }: { docKey: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { byId: {}, order: [], loaded: false });

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(docKey));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Annotation[];
        dispatch({ type: 'load', annotations: parsed });
      } catch {
        dispatch({ type: 'load', annotations: [] });
      }
    } else {
      dispatch({ type: 'load', annotations: [] });
    }
  }, [docKey]);

  useEffect(() => {
    if (!state.loaded) return;
    const annotations = state.order.map((id) => state.byId[id]);
    localStorage.setItem(storageKey(docKey), JSON.stringify(annotations));
  }, [docKey, state]);

  const annotations = useMemo(() => state.order.map((id) => state.byId[id]), [state]);

  const byPage = useCallback(
    (page: number) => annotations.filter((a) => a.page === page),
    [annotations],
  );

  const addAnnotation = useCallback((annotation: Annotation) => dispatch({ type: 'add', annotation }), []);
  const updateAnnotation = useCallback(
    (id: string, patch: Partial<Annotation>) => dispatch({ type: 'update', id, patch }),
    [],
  );
  const removeAnnotation = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const clearAll = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo(
    () => ({ annotations, byPage, addAnnotation, updateAnnotation, removeAnnotation, clearAll }),
    [annotations, byPage, addAnnotation, updateAnnotation, removeAnnotation, clearAll],
  );

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>;
}

export function useAnnotations() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotations must be used within AnnotationProvider');
  return ctx;
}
