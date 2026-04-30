import { useFlowStore } from '../../store/flowStore';
import { useEnvironmentStore } from '../../store/environmentStore';
import type { FlowNode } from '../../types/flow';
import type { ResponseExtractor } from '../../types/environment';
import { nanoid } from '../../lib/nanoid';

interface ScriptsEditorProps {
  node: FlowNode;
}

export function ScriptsEditor({ node }: ScriptsEditorProps) {
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const activeEnvId = useEnvironmentStore((s) => s.activeEnvironmentId);
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnv = environments.find((e) => e.id === activeEnvId);

  const extractors: ResponseExtractor[] = node.data.config.responseExtractors ?? [];

  function update(updated: ResponseExtractor[]) {
    updateNodeConfig(node.id, { responseExtractors: updated });
  }

  function addExtractor() {
    update([
      ...extractors,
      {
        id: nanoid(),
        variableName: '',
        source: 'body',
        extractType: 'jsonpath',
        expression: '$.',
      },
    ]);
  }

  function removeExtractor(id: string) {
    update(extractors.filter((e) => e.id !== id));
  }

  function updateExtractor(id: string, patch: Partial<ResponseExtractor>) {
    update(extractors.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-white">Scripts pós-resposta</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Extrai valores da resposta e salva como variáveis no ambiente ativo.
          </p>
        </div>
        <button
          onClick={addExtractor}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0"
        >
          + Adicionar
        </button>
      </div>

      {!activeEnvId && (
        <div className="p-2 bg-amber-900/20 border border-amber-800 rounded text-[10px] text-amber-300">
          Nenhum ambiente ativo. Ative um ambiente para que os valores extraídos sejam salvos.
        </div>
      )}

      {activeEnv && (
        <p className="text-[10px] text-green-500">
          ● Salvando em: <span className="font-semibold">{activeEnv.name}</span>
        </p>
      )}

      {extractors.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-4">
          Nenhum extrator configurado.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {extractors.map((ext) => (
          <div key={ext.id} className="flex flex-col gap-1.5 p-2 bg-gray-800/50 rounded border border-gray-700">
            {/* Variable name */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 w-16 shrink-0">Variável</span>
              <input
                type="text"
                value={ext.variableName}
                onChange={(e) => updateExtractor(ext.id, { variableName: e.target.value })}
                placeholder="nome_variavel"
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-violet-300 font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={() => removeExtractor(ext.id)}
                className="text-gray-600 hover:text-red-400 transition-colors ml-1"
              >×</button>
            </div>

            {/* Source */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 w-16 shrink-0">Fonte</span>
              <select
                value={ext.source}
                onChange={(e) => updateExtractor(ext.id, { source: e.target.value as ResponseExtractor['source'] })}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500"
              >
                <option value="body">Body</option>
                <option value="header">Header</option>
              </select>

              {ext.source === 'header' && (
                <input
                  type="text"
                  value={ext.headerName ?? ''}
                  onChange={(e) => updateExtractor(ext.id, { headerName: e.target.value })}
                  placeholder="Authorization"
                  className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
                />
              )}

              {ext.source === 'body' && (
                <select
                  value={ext.extractType}
                  onChange={(e) => updateExtractor(ext.id, { extractType: e.target.value as ResponseExtractor['extractType'] })}
                  className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="jsonpath">JSONPath</option>
                  <option value="regex">Regex</option>
                </select>
              )}
            </div>

            {/* Expression */}
            {(ext.source === 'body') && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 w-16 shrink-0">
                  {ext.extractType === 'jsonpath' ? 'JSONPath' : 'Regex'}
                </span>
                <input
                  type="text"
                  value={ext.expression}
                  onChange={(e) => updateExtractor(ext.id, { expression: e.target.value })}
                  placeholder={ext.extractType === 'jsonpath' ? '$.data.id' : '"token":"([^"]+)"'}
                  className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {/* Preview hint */}
            <p className="text-[10px] text-gray-600">
              {ext.source === 'body' && ext.extractType === 'jsonpath' &&
                'Ex: $.id · $.user.token · $.items[0].name'}
              {ext.source === 'body' && ext.extractType === 'regex' &&
                'Captura o 1º grupo ( ) ou o match completo. Ex: "id":(\\d+)'}
              {ext.source === 'header' &&
                'Nome exato do header a capturar. Ex: Authorization · X-Request-Id'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
