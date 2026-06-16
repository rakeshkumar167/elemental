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
  const theme        = useStore(s => s.theme);

  const isDark     = theme === 'dark';
  const historyRef = useRef(history);
  historyRef.current = history;

  const knownMin = LJ_GLOBAL_MINIMA[n];

  // Reinitialise uPlot when theme changes so axis/grid colors update
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth || 400;

    const axisStroke = isDark ? '#9ca3af' : '#4b5563';
    const gridStroke = isDark ? '#1f2937' : '#e5e7eb';
    const tickStroke = isDark ? '#374151' : '#d1d5db';

    const opts: uPlot.Options = {
      width: w, height: 180,
      series: [
        {},
        { label: 'Best',    stroke: '#22c55e', width: 2 },
        { label: 'Average', stroke: '#3b82f6', width: 1.5 },
      ],
      axes: [
        { stroke: axisStroke, ticks: { stroke: tickStroke }, grid: { stroke: gridStroke } },
        { stroke: axisStroke, ticks: { stroke: tickStroke }, grid: { stroke: gridStroke }, label: 'Energy (ε)' },
      ],
      cursor: { show: false },
      legend: { show: true },
    };

    plotRef.current = new uPlot(opts, [[0], [null as unknown as number], [null as unknown as number]], containerRef.current);

    // Restore current data after reinit
    const h = historyRef.current;
    if (h.length > 0) {
      plotRef.current.setData([h.map(p => p.gen), h.map(p => p.best), h.map(p => p.avg)]);
    }

    const ro = new ResizeObserver(([entry]) => {
      plotRef.current?.setSize({ width: entry.contentRect.width, height: 180 });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); plotRef.current?.destroy(); plotRef.current = null; };
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data on each new snapshot batch
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

  const labelCls = isDark ? 'text-gray-400' : 'text-gray-500';
  const valueCls = isDark ? 'text-gray-100' : 'text-gray-900';

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full" style={{ color: isDark ? '#d1d5db' : '#374151' }} />
      {snapshot && (
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-xs">
          <div className={labelCls}>Generation</div>
          <div className={labelCls}>Best E (ε)</div>
          <div className={labelCls}>RMS Force</div>
          <div className={valueCls}>{snapshot.generation}</div>
          <div className="text-green-400">{snapshot.bestEnergy.toFixed(4)}</div>
          <div className={valueCls}>{snapshot.rmsForce.toExponential(2)}</div>
          {knownMin !== undefined && (
            <>
              <div className={labelCls}>Known min (ε)</div>
              <div className={labelCls}>Δ to known min</div>
              <div />
              <div className="text-amber-500">{knownMin.toFixed(4)}</div>
              <div className={pctDelta! < 1 ? 'text-green-400' : 'text-amber-500'}>
                {pctDelta!.toFixed(2)}%
              </div>
              <div />
            </>
          )}
        </div>
      )}
      {!snapshot && (
        <p className={`text-xs italic ${labelCls}`}>Press Start to begin.</p>
      )}
    </div>
  );
}
