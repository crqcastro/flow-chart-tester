import { useFlowStore } from '../../store/flowStore';
import { useExecution } from '../../hooks/useExecution';
import { useEnvironmentStore } from '../../store/environmentStore';

interface TopBarProps {
  onImportClick?: () => void;
  onSettingsClick?: () => void;
  onImportXmlClick?: () => void;
  onExportXmlClick?: () => void;
  onEnvironmentClick?: () => void;
  onExecuteClick?: () => void;
  onNewDiagramClick?: () => void;
}

export function TopBar({ onImportClick, onSettingsClick, onImportXmlClick, onExportXmlClick, onEnvironmentClick, onExecuteClick, onNewDiagramClick }: TopBarProps) {
  const { execute, running } = useExecution();
  const nodes = useFlowStore((s) => s.nodes);
  const hasNodes = nodes.length > 0;
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentStore((s) => s.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentStore((s) => s.setActiveEnvironment);
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2m0 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
        </svg>
        <span className="font-semibold text-white text-sm tracking-wide">Flowchart</span>
        <span className="text-xs text-gray-500 hidden sm:inline">— Testador Visual de APIs</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Environment selector */}
        <div className="flex items-center gap-1">
          <select
            value={activeEnvironmentId ?? ''}
            onChange={(e) => setActiveEnvironment(e.target.value || null)}
            className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:border-violet-500 max-w-[130px]"
            title="Ambiente ativo"
          >
            <option value="">Sem ambiente</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button
            onClick={onEnvironmentClick}
            title="Gerenciar ambientes"
            className={`px-2 py-1.5 text-xs rounded transition-colors ${activeEnv ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}
          >
            {activeEnv ? '● Env' : '⊕ Env'}
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700" />

        {onNewDiagramClick && (
          <button
            onClick={onNewDiagramClick}
            className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Novo diagrama em branco"
          >
            Novo
          </button>
        )}
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Importar Swagger
          </button>
        )}
        <button
          onClick={onImportXmlClick}
          className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          Importar XML
        </button>
        <button
          onClick={onExportXmlClick}
          disabled={!hasNodes}
          className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 disabled:text-gray-600 disabled:cursor-not-allowed text-gray-300 transition-colors"
        >
          Exportar XML
        </button>
        <button
          onClick={() => { onExecuteClick?.(); execute(); }}
          disabled={running || !hasNodes}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            running
              ? 'bg-violet-700 text-violet-200 cursor-wait'
              : hasNodes
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'bg-violet-900 text-violet-600 cursor-not-allowed'
          }`}
        >
          {running ? '⏳ Executando...' : '▶ Executar'}
        </button>
        <button
          onClick={onSettingsClick}
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          title="Configurações"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
