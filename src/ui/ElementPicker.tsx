// src/ui/ElementPicker.tsx
import { ELEMENTS } from '../data/elements';
import { useStore } from '../state/store';

export function ElementPicker() {
  const symbol   = useStore(s => s.config.elementSymbol);
  const status   = useStore(s => s.status);
  const setConfig = useStore(s => s.setConfig);
  const disabled  = status !== 'idle';

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Element</p>
      <div className="flex gap-1 flex-wrap">
        {ELEMENTS.map(el => (
          <button
            key={el.symbol}
            onClick={() => setConfig({ elementSymbol: el.symbol, potentialParams: { ...el.lj } })}
            disabled={disabled}
            title={el.name}
            className="px-2.5 py-1 rounded text-xs font-bold border-2 transition-all disabled:opacity-40"
            style={{
              backgroundColor: el.color + '22',
              borderColor: symbol === el.symbol ? el.color : 'transparent',
              color: el.color,
            }}
          >
            {el.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
