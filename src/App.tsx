// src/App.tsx
import { ClusterScene } from './viz/ClusterScene';
import { Controls }     from './ui/Controls';
import { ElementPicker } from './ui/ElementPicker';
import { Charts }       from './ui/Charts';
import { Presets }      from './ui/Presets';
import { useStore }     from './state/store';

export default function App() {
  const error = useStore(s => s.error);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-base font-bold tracking-tight">Elemental</h1>
          <p className="text-xs text-gray-400 mt-0.5">Genetic algorithm cluster optimizer</p>
        </div>

        <div className="p-4 border-b border-gray-700">
          <ElementPicker />
        </div>

        <div className="flex-1">
          <Controls />
        </div>

        <div className="p-4 border-t border-gray-700">
          <Presets />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-900/60 border-b border-red-700 px-4 py-2 text-sm text-red-200">
            ⚠ {error}
          </div>
        )}
        <div className="flex-1 relative min-h-0">
          <ClusterScene />
        </div>
        <div className="h-64 flex-shrink-0 border-t border-gray-700 bg-gray-800/50 px-4 py-3 overflow-y-auto">
          <Charts />
        </div>
      </main>
    </div>
  );
}
