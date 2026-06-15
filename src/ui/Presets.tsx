import { useStore } from '../state/store';
import { LJ_REDUCED } from '../data/elements';
import type { GAConfig } from '../ga/types';

const PRESETS: Array<{ label: string; desc: string; config: Partial<GAConfig> }> = [
  {
    label: 'LJ₁₃ Icosahedron',
    desc: '13 atoms — classic Mackay icosahedron. Converges quickly.',
    config: { n: 13, populationSize: 20, seed: 42, elementSymbol: 'Ar', potentialParams: { ...LJ_REDUCED } },
  },
  {
    label: 'LJ₇ Pentagonal bipyramid',
    desc: '7 atoms — very fast demo.',
    config: { n: 7, populationSize: 10, seed: 42, elementSymbol: 'Ar', potentialParams: { ...LJ_REDUCED } },
  },
  {
    label: 'LJ₃₈ Double funnel',
    desc: '38 atoms — famous hard case with two competing funnels. Needs patience.',
    config: { n: 38, populationSize: 50, seed: 42, elementSymbol: 'Ar', potentialParams: { ...LJ_REDUCED } },
  },
  {
    label: 'LJ₅₅ Mackay shell',
    desc: '55-atom Mackay icosahedron — large cluster.',
    config: { n: 55, populationSize: 40, seed: 42, elementSymbol: 'Ar', potentialParams: { ...LJ_REDUCED } },
  },
];

export function Presets() {
  const status    = useStore(s => s.status);
  const setConfig = useStore(s => s.setConfig);

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Presets</p>
      {PRESETS.map(preset => (
        <button
          key={preset.label}
          onClick={() => setConfig(preset.config)}
          disabled={status !== 'idle'}
          title={preset.desc}
          className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed text-gray-200"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
