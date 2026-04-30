import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Environment, EnvironmentVariable } from '../types/environment';
import { nanoid } from '../lib/nanoid';

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;

  addEnvironment: (name: string) => string;
  updateEnvironment: (id: string, name: string) => void;
  deleteEnvironment: (id: string) => void;
  duplicateEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;

  /** Atomically create or merge an environment (used by Postman import). */
  importEnvironment: (env: Environment) => void;

  addVariable: (envId: string) => void;
  updateVariable: (envId: string, varId: string, patch: Partial<EnvironmentVariable>) => void;
  deleteVariable: (envId: string, varId: string) => void;

  // Called by execution engine after a response extractor runs
  setVariableValue: (key: string, value: string) => void;

  // Convenience: get resolved vars map for active env
  getActiveVars: () => Record<string, string>;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      activeEnvironmentId: null,

      addEnvironment: (name) => {
        const id = nanoid();
        set((s) => ({
          environments: [...s.environments, { id, name, variables: [] }],
        }));
        return id;
      },

      updateEnvironment: (id, name) =>
        set((s) => ({
          environments: s.environments.map((e) => (e.id === id ? { ...e, name } : e)),
        })),

      deleteEnvironment: (id) =>
        set((s) => ({
          environments: s.environments.filter((e) => e.id !== id),
          activeEnvironmentId: s.activeEnvironmentId === id ? null : s.activeEnvironmentId,
        })),

      duplicateEnvironment: (id) => {
        const env = get().environments.find((e) => e.id === id);
        if (!env) return;
        const newId = nanoid();
        set((s) => ({
          environments: [
            ...s.environments,
            {
              ...env,
              id: newId,
              name: `${env.name} (cópia)`,
              variables: env.variables.map((v) => ({ ...v, id: nanoid() })),
            },
          ],
        }));
      },

      importEnvironment: (incoming) =>
        set((s) => {
          const existing = s.environments.find((e) => e.name === incoming.name);
          if (existing) {
            // Merge: update known keys, append new ones
            const merged = [...existing.variables];
            for (const v of incoming.variables) {
              const idx = merged.findIndex((ev) => ev.key === v.key);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], value: v.value, enabled: v.enabled };
              } else {
                merged.push({ ...v, id: nanoid() });
              }
            }
            return {
              environments: s.environments.map((e) =>
                e.id === existing.id ? { ...e, variables: merged } : e
              ),
            };
          }
          // Create new with fresh IDs
          return {
            environments: [
              ...s.environments,
              {
                id: nanoid(),
                name: incoming.name,
                variables: incoming.variables.map((v) => ({ ...v, id: nanoid() })),
              },
            ],
          };
        }),

      setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),

      addVariable: (envId) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === envId
              ? { ...e, variables: [...e.variables, { id: nanoid(), key: '', value: '', enabled: true }] }
              : e
          ),
        })),

      updateVariable: (envId, varId, patch) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === envId
              ? { ...e, variables: e.variables.map((v) => (v.id === varId ? { ...v, ...patch } : v)) }
              : e
          ),
        })),

      deleteVariable: (envId, varId) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === envId ? { ...e, variables: e.variables.filter((v) => v.id !== varId) } : e
          ),
        })),

      setVariableValue: (key, value) => {
        const { environments, activeEnvironmentId } = get();
        if (!activeEnvironmentId) return;
        const env = environments.find((e) => e.id === activeEnvironmentId);
        if (!env) return;

        const exists = env.variables.some((v) => v.key === key);
        if (exists) {
          set((s) => ({
            environments: s.environments.map((e) =>
              e.id === activeEnvironmentId
                ? { ...e, variables: e.variables.map((v) => (v.key === key ? { ...v, value } : v)) }
                : e
            ),
          }));
        } else {
          set((s) => ({
            environments: s.environments.map((e) =>
              e.id === activeEnvironmentId
                ? { ...e, variables: [...e.variables, { id: nanoid(), key, value, enabled: true }] }
                : e
            ),
          }));
        }
      },

      getActiveVars: () => {
        const { environments, activeEnvironmentId } = get();
        const env = environments.find((e) => e.id === activeEnvironmentId);
        if (!env) return {};
        return Object.fromEntries(
          env.variables.filter((v) => v.enabled && v.key).map((v) => [v.key, v.value])
        );
      },
    }),
    { name: 'flowchart-environments' }
  )
);
