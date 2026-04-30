import { useFlowStore } from '../../store/flowStore';
import type { FlowNode } from '../../types/flow';
import { JsonEditor } from '../ui/JsonEditor';

interface ExpectedEditorProps {
  node: FlowNode;
}

export function ExpectedEditor({ node }: ExpectedEditorProps) {
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const { config } = node.data;

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Modo de Validação</label>
        <div className="flex gap-1 bg-gray-800 rounded p-1">
          <button
            className={`flex-1 py-1 text-xs rounded transition-colors ${config.expectedMode === 'json' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => updateNodeConfig(node.id, { expectedMode: 'json' })}
          >
            JSON
          </button>
          <button
            className={`flex-1 py-1 text-xs rounded transition-colors ${config.expectedMode === 'regex' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => updateNodeConfig(node.id, { expectedMode: 'regex' })}
          >
            Regex
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-500">
        {config.expectedMode === 'json'
          ? 'Cole o JSON esperado na resposta. Os campos serão comparados por igualdade profunda.'
          : 'Uma expressão regex por linha. Cada regex será testada contra o corpo da resposta (string).'}
      </p>

      {/* Editor */}
      <JsonEditor
        value={config.expectedJson}
        onChange={(v) => updateNodeConfig(node.id, { expectedJson: v })}
        placeholder={
          config.expectedMode === 'json'
            ? '{\n  "status": "ok"\n}'
            : '^\\{"id":\\d+\\}\n"name":"\\w+"'
        }
        plainText={config.expectedMode === 'regex'}
        minHeight="150px"
      />

      {config.expectedMode === 'regex' && (
        <div className="p-2 bg-gray-800/50 rounded text-[10px] text-gray-500">
          <p className="font-semibold text-gray-400 mb-1">Exemplos de Regex:</p>
          <code className="block">^{'{'}.*{'}'}$</code>
          <code className="block">&quot;id&quot;:\d+</code>
          <code className="block">&quot;status&quot;:&quot;(ok|success)&quot;</code>
        </div>
      )}
    </div>
  );
}
