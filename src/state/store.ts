import { create } from 'zustand';
import { LJ_REDUCED } from '../data/elements';
import type { GAConfig, Snapshot, WorkerCommand, WorkerMessage } from '../ga/types';

const DEFAULT_CONFIG: GAConfig = {
  elementSymbol: 'Ar',
  n: 13,
  potentialParams: { ...LJ_REDUCED },
  populationSize: 20,
  eliteCount: 2,
  mutationRate: 0.3,
  mutationSigma: 0.3,
  selectionMethod: 'tournament',
  tournamentSize: 3,
  maxGenerations: 1000,
  seed: 42,
  relaxMaxIter: 500,
  relaxForceTol: 1e-4,
  diversityThreshold: 0,
};

interface HistoryPoint { gen: number; best: number; avg: number; }

interface StoreState {
  config: GAConfig;
  status: 'idle' | 'running' | 'paused';
  snapshot: Snapshot | null;
  history: HistoryPoint[];
  error: string | null;
  worker: Worker | null;
  theme: 'dark' | 'light';

  setConfig: (partial: Partial<GAConfig>) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  step: () => void;
  reset: () => void;
  updateParams: (partial: Partial<GAConfig>) => void;
  toggleTheme: () => void;
}

function cmd(worker: Worker | null, msg: WorkerCommand): void {
  worker?.postMessage(msg);
}

export const useStore = create<StoreState>((set, get) => ({
  config: DEFAULT_CONFIG,
  status: 'idle',
  snapshot: null,
  history: [],
  error: null,
  worker: null,
  theme: 'dark',

  setConfig: (partial) => set(s => ({ config: { ...s.config, ...partial } })),

  start: () => {
    get().worker?.terminate();
    const worker = new Worker(
      new URL('../worker/ga.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'snapshot') {
        set(s => ({
          snapshot: msg.snapshot,
          history: [
            ...s.history,
            { gen: msg.snapshot.generation, best: msg.snapshot.bestEnergy, avg: msg.snapshot.avgEnergy },
          ].slice(-2000),
        }));
      } else if (msg.type === 'error') {
        set({ error: msg.message, status: 'idle' });
      }
    };
    set({ worker, status: 'running', snapshot: null, history: [], error: null });
    cmd(worker, { type: 'start', config: get().config });
  },

  pause: () => {
    cmd(get().worker, { type: 'pause' });
    set({ status: 'paused' });
  },

  resume: () => {
    cmd(get().worker, { type: 'resume' });
    set({ status: 'running' });
  },

  step: () => {
    if (get().status === 'idle') return;
    cmd(get().worker, { type: 'step' });
  },

  reset: () => {
    get().worker?.terminate();
    set({ worker: null, status: 'idle', snapshot: null, history: [], error: null });
  },

  updateParams: (partial) => {
    set(s => ({ config: { ...s.config, ...partial } }));
    cmd(get().worker, { type: 'updateParams', params: partial });
  },

  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}));
