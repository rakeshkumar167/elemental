import { useStore } from '../state/store';

export function Controls() {
  const n               = useStore(s => s.config.n);
  const populationSize  = useStore(s => s.config.populationSize);
  const mutationRate    = useStore(s => s.config.mutationRate);
  const mutationSigma   = useStore(s => s.config.mutationSigma);
  const potentialParams = useStore(s => s.config.potentialParams);
  const seed            = useStore(s => s.config.seed);
  const status          = useStore(s => s.status);
  const theme           = useStore(s => s.theme);
  const setConfig    = useStore(s => s.setConfig);
  const updateParams = useStore(s => s.updateParams);
  const start        = useStore(s => s.start);
  const pause        = useStore(s => s.pause);
  const resume       = useStore(s => s.resume);
  const step         = useStore(s => s.step);
  const reset        = useStore(s => s.reset);

  const isIdle    = status === 'idle';
  const isRunning = status === 'running';
  const isPaused  = status === 'paused';
  const isDark    = theme === 'dark';

  const labelCls = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputCls = `w-full rounded border px-2 py-1 text-sm ${
    isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
  }`;

  return (
    <div className="space-y-5 p-4">
      <label className="block space-y-1">
        <span className={`text-xs uppercase tracking-wider ${labelCls}`}>
          Cluster size — N = {n}
        </span>
        <input type="range" min={2} max={80} value={n}
          onChange={e => setConfig({ n: parseInt(e.target.value) })}
          disabled={!isIdle} className="w-full accent-blue-500" />
      </label>

      <label className="block space-y-1">
        <span className={`text-xs uppercase tracking-wider ${labelCls}`}>
          Population — {populationSize}
        </span>
        <input type="range" min={5} max={100} value={populationSize}
          onChange={e => setConfig({ populationSize: parseInt(e.target.value) })}
          disabled={!isIdle} className="w-full accent-blue-500" />
      </label>

      <label className="block space-y-1">
        <span className={`text-xs uppercase tracking-wider ${labelCls}`}>
          Mutation rate — {Math.round(mutationRate * 100)}%
        </span>
        <input type="range" min={0} max={100} value={Math.round(mutationRate * 100)}
          onChange={e => updateParams({ mutationRate: parseInt(e.target.value) / 100 })}
          className="w-full accent-blue-500" />
      </label>

      <label className="block space-y-1">
        <span className={`text-xs uppercase tracking-wider ${labelCls}`}>
          Rattle σ — {mutationSigma.toFixed(2)} σ
        </span>
        <input type="range" min={5} max={100} value={Math.round(mutationSigma * 100)}
          onChange={e => updateParams({ mutationSigma: parseInt(e.target.value) / 100 })}
          className="w-full accent-blue-500" />
      </label>

      <label className="block space-y-1">
        <span className={`text-xs uppercase tracking-wider ${labelCls}`}>Potential</span>
        <select value={potentialParams.type}
          onChange={e => setConfig({
            potentialParams: { ...potentialParams, type: e.target.value as 'lj' | 'morse' }
          })}
          disabled={!isIdle}
          className={inputCls}
        >
          <option value="lj">Lennard-Jones</option>
          <option value="morse">Morse</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className={`text-xs uppercase tracking-wider ${labelCls}`}>Seed</span>
        <input type="number" value={seed}
          onChange={e => setConfig({ seed: parseInt(e.target.value) || 0 })}
          disabled={!isIdle}
          className={inputCls} />
      </label>

      <div className="flex gap-2 flex-wrap pt-1">
        {isIdle   && <button onClick={start}  className="btn-primary">▶ Start</button>}
        {isRunning && <button onClick={pause}  className="btn-secondary">⏸ Pause</button>}
        {isPaused  && <button onClick={resume} className="btn-primary">▶ Resume</button>}
        {isPaused  && <button onClick={step}   className="btn-secondary">⏭ Step</button>}
        {!isIdle   && <button onClick={reset}  className="btn-danger">↺ Reset</button>}
      </div>
    </div>
  );
}
