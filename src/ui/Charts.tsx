import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useStore } from '../state/store';
import { LJ_GLOBAL_MINIMA } from '../data/ljReference';

export function Charts() {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef      = useRef<uPlot | null>(null);
  const history      = useStore(s => s.history);
  const snapshot     = useStore(s => s.snapshot);
  const n            = useStore(s => s.config.n);

  const knownMin = LJ_GLOBAL_MINIMA[n];

  // Initialise uPlot once
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth || 400;

    const opts: uPlot.Options = {
      width: w, height: 180,
      series: [
        {},
        { label: 'Best',    stroke: '#22c55e', width: 2 },
        { label: 'Average', stroke: '#3b82f6', width: 1.5 },
      ],
      axes: [
        { stroke: '#6b7280', ticks: { stroke: '#374151' }, grid: { stroke: '#1f2937' } },
        { stroke: '#6b7280', ticks: { stroke: '#374151' }, grid: { stroke: '#1f2937' }, label: 'Energy (ε)' },
      ],
      cursor: { show: false },
      legend: { show: true },
    };
    plotRef.current = new uPlot(opts, [[0], [null as unknown as number], [null as unknown as number]], containerRef.current);

    // Resize observer
    const ro = new ResizeObserver(([entry]) => {
      plotRef.current?.setSize({ width: entry.contentRect.width, height: 180 });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); plotRef.current?.destroy(); plotRef.current = null; };
  }, []);

  // Update data
  useEffect(() => {
    if (!plotRef.current) return;
    if (history.length === 0) {
      plotRef.current.setData([[0], [null as unknown as number], [null as unknown as number]]);
      return;
    }
    plotRef.current.setData([
      history.map(h => h.gen),
      history.map(h => h.best),
      history.map(h => h.avg),
    ]);
  }, [history]);

  const pctDelta = snapshot && knownMin !== undefined
    ? Math.abs((snapshot.bestEnergy - knownMin) / Math.abs(knownMin) * 100)
    : null;

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full" />
      {snapshot && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-xs">
          <div className="text-gray-400">Generation</div>
          <div className="text-gray-400">Best E (ε)</div>
          <div className="text-gray-400">RMS Force</div>
          <div className="text-gray-100">{snapshot.generation}</div>
          <div className="text-green-400">{snapshot.bestEnergy.toFixed(4)}</div>
          <div className="text-gray-100">{snapshot.rmsForce.toExponential(2)}</div>
          {knownMin !== undefined && (
            <>
              <div className="text-gray-400">Known min (ε)</div>
              <div className="text-gray-400">Δ to known min</div>
              <div />
              <div className="text-yellow-300">{knownMin.toFixed(4)}</div>
              <div className={pctDelta! < 1 ? 'text-green-400' : 'text-yellow-400'}>
                {pctDelta!.toFixed(2)}%
              </div>
              <div />
            </>
          )}
        </div>
      )}
      {!snapshot && (
        <p className="text-xs text-gray-500 italic">Press Start to begin.</p>
      )}
    </div>
  );
}
