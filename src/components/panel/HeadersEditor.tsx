import { useFlowStore } from '../../store/flowStore';
import type { FlowNode, KeyValuePair } from '../../types/flow';
import { nanoid } from '../../lib/nanoid';

interface HeadersEditorProps {
  node: FlowNode;
}

export function HeadersEditor({ node }: HeadersEditorProps) {
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const headers = node.data.config.headers;

  function update(updated: KeyValuePair[]) {
    updateNodeConfig(node.id, { headers: updated });
  }

  function addRow() {
    update([...headers, { id: nanoid(), key: '', value: '', enabled: true }]);
  }

  function removeRow(id: string) {
    update(headers.filter((h) => h.id !== id));
  }

  function setField(id: string, field: 'key' | 'value' | 'enabled', val: string | boolean) {
    update(headers.map((h) => h.id === id ? { ...h, [field]: val } : h));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Column headers */}
      <div className="flex items-center gap-1 px-1">
        <span className="w-4 shrink-0" />
        <span className="flex-1 text-[10px] text-gray-500 uppercase tracking-wider">Nome</span>
        <span className="flex-1 text-[10px] text-gray-500 uppercase tracking-wider">Valor</span>
        <span className="w-5 shrink-0" />
      </div>

      {headers.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-3">Nenhum header configurado</p>
      )}

      {headers.map((header) => (
        <div key={header.id} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={header.enabled}
            onChange={(e) => setField(header.id, 'enabled', e.target.checked)}
            className="w-4 shrink-0 accent-violet-500"
          />
          <input
            type="text"
            value={header.key}
            onChange={(e) => setField(header.id, 'key', e.target.value)}
            placeholder="Content-Type"
            disabled={!header.enabled}
            className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-40 focus:outline-none focus:border-violet-500 font-mono"
          />
          <input
            type="text"
            value={header.value}
            onChange={(e) => setField(header.id, 'value', e.target.value)}
            placeholder="application/json"
            disabled={!header.enabled}
            className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-40 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={() => removeRow(header.id)}
            className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors shrink-0"
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={addRow}
        className="mt-1 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
      >
        <span className="text-base leading-none">+</span> Adicionar header
      </button>
    </div>
  );
}
