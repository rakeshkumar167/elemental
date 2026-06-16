import { ClusterScene }  from './viz/ClusterScene';
import { Controls }      from './ui/Controls';
import { ElementPicker } from './ui/ElementPicker';
import { Charts }        from './ui/Charts';
import { Presets }       from './ui/Presets';
import { useStore }      from './state/store';

export default function App() {
  const error       = useStore(s => s.error);
  const theme       = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);

  const isDark = theme === 'dark';

  const root    = isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const sidebar = isDark ? 'bg-gray-900 border-r border-gray-700' : 'bg-white border-r border-gray-200';
  const divider = isDark ? 'border-gray-700' : 'border-gray-200';
  const toggleBtn = isDark
    ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-400'
    : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-500';

  return (
    <div className={`flex h-screen overflow-hidden ${root}`}>
      {/* Sidebar */}
      <aside className={`w-72 flex-shrink-0 flex flex-col overflow-y-auto ${sidebar}`}>
        <div className={`p-4 flex items-start justify-between border-b ${divider}`}>
          <div>
            <h1 className="text-base font-bold tracking-tight">Elemental</h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Genetic algorithm cluster optimizer
            </p>
          </div>
          <button
            onClick={toggleTheme}
            title="Toggle light / dark mode"
            className={`mt-0.5 text-xs px-2 py-1 rounded border transition-colors ${toggleBtn}`}
          >
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className={`p-4 border-b ${divider}`}>
          <ElementPicker />
        </div>

        <div className="flex-1">
          <Controls />
        </div>

        <div className={`p-4 border-t ${divider}`}>
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
        <div className={`h-64 flex-shrink-0 border-t px-4 py-3 overflow-y-auto ${divider} ${isDark ? 'bg-gray-800/90' : 'bg-gray-50'}`}>
          <Charts />
        </div>
      </main>
    </div>
  );
}
