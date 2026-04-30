import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { useFlowStore } from '../../store/flowStore';
import type { DataFlowStrategy, FieldMapping } from '../../types/flow';
import { nanoid } from '../../lib/nanoid';

function extractPaths(obj: unknown, prefix = '$'): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [prefix];
  return Object.keys(obj as object).flatMap((k) =>
    extractPaths((obj as Record<string, unknown>)[k], `${prefix}.${k}`)
  );
}

interface EdgeConfigModalProps {
  edgeId: string | null;
  onClose: () => void;
}

const STRATEGY_LABELS: Record<DataFlowStrategy, { label: string; desc: string }> = {
  'sequential':    { label: 'Apenas sequencial', desc: 'Sem transferência de dados — garante somente a ordem de execução.' },
  'full-response': { label: 'Resposta completa', desc: 'O JSON inteiro da resposta anterior é usado como body desta requisição.' },
  'map-fields':    { label: 'Mapear campos', desc: 'Selecione campos específicos da resposta anterior para injetar nos campos desta requisição.' },
};

export function EdgeConfigModal({ edgeId, onClose }: EdgeConfigModalProps) {
  const edges = useFlowStore((s) => s.edges);
  const nodes = useFlowStore((s) => s.nodes);
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);

  const edge = edges.find((e) => e.id === edgeId);
  const [strategy, setStrategy] = useState<DataFlowStrategy>('sequential');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [showPaths, setShowPaths] = useState(false);

  // Source node name for context
  const sourceNode = nodes.find((n) => n.id === edge?.source);
  const targetNode = nodes.find((n) => n.id === edge?.target);

  const availablePaths = useMemo(() => {
    const json = sourceNode?.data.config.expectedJson;
    if (!json) return [];
    try { return extractPaths(JSON.parse(json)); } catch { return []; }
  }, [sourceNode]);

  useEffect(() => {
    if (edge?.data) {
      setStrategy(edge.data.strategy ?? 'sequential');
      setMappings(edge.data.fieldMappings ?? []);
    }
  }, [edge]);

  if (!edge) return null;

  function save() {
    if (!edgeId) return;
    updateEdgeData(edgeId, { strategy, fieldMappings: mappings });
    onClose();
  }

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { id: nanoid(), sourceJsonPath: '$.', targetField: '', targetType: 'body' },
    ]);
  }

  function removeMapping(id: string) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMapping(id: string, field: keyof FieldMapping, value: string) {
    setMappings((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
  }

  return (
    <Modal open={!!edgeId} onClose={onClose} title="Configurar Conexão" width="max-w-xl">
      {/* Context */}
      {sourceNode && targetNode && (
        <p className="text-xs text-gray-500 mb-4">
          <span className="text-gray-300 font-mono">{sourceNode.data.route.method} {sourceNode.data.route.path}</span>
          {' → '}
          <span className="text-gray-300 font-mono">{targetNode.data.route.method} {targetNode.data.route.path}</span>
        </p>
      )}

      {/* Strategy selection */}
      <div className="flex flex-col gap-2 mb-4">
        {(Object.entries(STRATEGY_LABELS) as [DataFlowStrategy, { label: string; desc: string }][]).map(([key, { label, desc }]) => (
          <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${strategy === key ? 'border-violet-500 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
            <input
              type="radio"
              name="strategy"
              value={key}
              checked={strategy === key}
              onChange={() => setStrategy(key)}
              className="mt-0.5 accent-violet-500 shrink-0"
            />
            <div>
              <p className="text-sm text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Field mappings */}
      {strategy === 'map-fields' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mapeamentos</span>
            <button onClick={addMapping} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              + Adicionar
            </button>
          </div>

          {availablePaths.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowPaths((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPaths ? '▾' : '▸'} Campos disponíveis da resposta anterior ({availablePaths.length})
              </button>
              {showPaths && (
                <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto p-1 bg-gray-800/50 rounded">
                  {availablePaths.map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        setMappings((prev) => [
                          ...prev,
                          { id: nanoid(), sourceJsonPath: p, targetField: '', targetType: 'body' },
                        ])
                      }
                      className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 hover:bg-violet-800 text-gray-400 hover:text-white rounded transition-colors"
                      title={`Adicionar mapeamento para ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mappings.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-3">Nenhum mapeamento configurado</p>
          )}

          {mappings.map((m) => (
            <div key={m.id} className="flex items-center gap-1 mb-2 flex-wrap">
              <input
                type="text"
                value={m.sourceJsonPath}
                onChange={(e) => updateMapping(m.id, 'sourceJsonPath', e.target.value)}
                placeholder="$.id"
                className="w-28 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500 font-mono"
                title="JSONPath da resposta anterior"
              />
              <span className="text-gray-600 text-xs">→</span>
              <select
                value={m.targetType}
                onChange={(e) => updateMapping(m.id, 'targetType', e.target.value)}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500"
              >
                <option value="body">body</option>
                <option value="header">header</option>
                <option value="query">query</option>
                <option value="path">path</option>
              </select>
              <input
                type="text"
                value={m.targetField}
                onChange={(e) => updateMapping(m.id, 'targetField', e.target.value)}
                placeholder="campo.destino"
                className="flex-1 min-w-0 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500 font-mono"
                title="Campo de destino (dot notation)"
              />
              <button
                onClick={() => removeMapping(m.id)}
                className="text-gray-600 hover:text-red-400 transition-colors text-base"
              >
                ×
              </button>
            </div>
          ))}

          {mappings.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-1">
              JSONPath: use <code className="bg-gray-800 px-1 rounded">$.campo</code> ou <code className="bg-gray-800 px-1 rounded">$.array[0].campo</code>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
          Cancelar
        </button>
        <button onClick={save} className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          Salvar
        </button>
      </div>
    </Modal>
  );
}
