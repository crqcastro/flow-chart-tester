import { useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import { useExecutionStore } from '../../store/executionStore';
import { Badge } from '../ui/Badge';
import { PayloadEditor } from './PayloadEditor';
import { HeadersEditor } from './HeadersEditor';
import { ExpectedEditor } from './ExpectedEditor';
import { ResultPanel } from './ResultPanel';
import { ScriptsEditor } from './ScriptsEditor';

type Tab = 'requisicao' | 'headers' | 'resposta' | 'scripts' | 'resultado';

export function PropertiesPanel() {
  const [tab, setTab] = useState<Tab>('requisicao');
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const results = useExecutionStore((s) => s.results);

  function handleDeleteNode() {
    if (!selectedNodeId) return;
    setSelectedNode(null);
    onNodesChange([{ type: 'remove', id: selectedNodeId }]);
  }

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const { route, executionStatus } = node.data;
  const result = selectedNodeId ? results.get(selectedNodeId) : undefined;

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: 'requisicao', label: 'Requisição' },
    { id: 'headers', label: 'Headers' },
    { id: 'resposta', label: 'Esperado' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'resultado', label: 'Resultado', badge: result ? (result.validationResult.passed && !result.error ? '✓' : '✗') : undefined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2 border-b border-gray-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge method={route.method} />
            <span className="text-xs font-mono text-white truncate">{route.path}</span>
          </div>
          {route.summary && (
            <p className="text-[10px] text-gray-500 truncate">{route.summary}</p>
          )}
          {executionStatus !== 'idle' && (
            <span className={`text-[10px] ${executionStatus === 'success' ? 'text-green-400' : executionStatus === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
              {executionStatus === 'success' ? '✓ Sucesso' : executionStatus === 'error' ? '✗ Falhou' : '⏳ Executando'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={handleDeleteNode}
            className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Remover chamada do diagrama"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedNode(null)}
            className="p-1 text-gray-600 hover:text-gray-400 transition-colors"
            title="Fechar painel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs transition-colors relative ${
              tab === t.id
                ? 'text-violet-400 border-b-2 border-violet-500 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.badge && (
              <span className={`ml-1 ${t.badge === '✓' ? 'text-green-400' : 'text-red-400'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'requisicao' && <PayloadEditor node={node} />}
        {tab === 'headers' && <HeadersEditor node={node} />}
        {tab === 'resposta' && <ExpectedEditor node={node} />}
        {tab === 'scripts' && <ScriptsEditor node={node} />}
        {tab === 'resultado' && <ResultPanel result={result} />}
      </div>
    </div>
  );
}
