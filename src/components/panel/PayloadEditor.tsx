import { useFlowStore } from '../../store/flowStore';
import { JsonEditor } from '../ui/JsonEditor';
import { VarInput } from '../ui/VarInput';
import type { FlowNode } from '../../types/flow';

interface PayloadEditorProps {
  node: FlowNode;
}

export function PayloadEditor({ node }: PayloadEditorProps) {
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const { route, config } = node.data;

  const isBodyMethod = !['GET', 'HEAD', 'OPTIONS'].includes(route.method);

  // Path params
  const hasPathParams = config.pathParams.length > 0;
  const hasQueryParams = config.queryParams.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Base URL override */}
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">URL Base</label>
        <VarInput
          value={config.baseUrlOverride ?? route.baseUrl}
          onChange={(v) => updateNodeConfig(node.id, { baseUrlOverride: v || undefined })}
          className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono"
          placeholder={route.baseUrl}
        />
        <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{route.path}</p>
      </div>

      {/* Path params */}
      {hasPathParams && (
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Parâmetros de Path</label>
          <div className="flex flex-col gap-1">
            {config.pathParams.map((param, idx) => (
              <div key={param.id} className="flex items-center gap-1">
                <span className="text-xs text-gray-400 font-mono w-24 shrink-0 truncate">{param.key}</span>
                <VarInput
                  value={param.value}
                  onChange={(v) => {
                    const next = [...config.pathParams];
                    next[idx] = { ...param, value: v };
                    updateNodeConfig(node.id, { pathParams: next });
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500"
                  placeholder="valor"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query params */}
      {hasQueryParams && (
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Query Params</label>
          <div className="flex flex-col gap-1">
            {config.queryParams.map((param, idx) => (
              <div key={param.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={param.enabled}
                  onChange={(e) => {
                    const next = [...config.queryParams];
                    next[idx] = { ...param, enabled: e.target.checked };
                    updateNodeConfig(node.id, { queryParams: next });
                  }}
                  className="shrink-0 accent-violet-500"
                />
                <span className="text-xs text-gray-400 font-mono w-20 shrink-0 truncate">{param.key}</span>
                <VarInput
                  value={param.value}
                  onChange={(v) => {
                    const next = [...config.queryParams];
                    next[idx] = { ...param, value: v };
                    updateNodeConfig(node.id, { queryParams: next });
                  }}
                  disabled={!param.enabled}
                  className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-40 focus:outline-none focus:border-violet-500"
                  placeholder="valor"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request body */}
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
          Body {!isBodyMethod && <span className="normal-case text-gray-600">(não aplicável para {route.method})</span>}
        </label>
        <JsonEditor
          value={config.payloadJson}
          onChange={(v) => updateNodeConfig(node.id, { payloadJson: v })}
          placeholder={isBodyMethod ? '{\n  \n}' : '— sem body —'}
          disabled={!isBodyMethod}
          minHeight="120px"
        />
      </div>

      {/* Timeout */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">Timeout (ms)</label>
        <input
          type="number"
          value={config.timeoutMs}
          onChange={(e) => updateNodeConfig(node.id, { timeoutMs: Number(e.target.value) })}
          min={100}
          max={120000}
          step={500}
          className="w-24 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500"
        />
      </div>
    </div>
  );
}
