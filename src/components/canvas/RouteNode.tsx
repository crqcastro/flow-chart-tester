import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNode, ExecutionStatus } from '../../types/flow';
import { Badge } from '../ui/Badge';
import { useFlowStore } from '../../store/flowStore';

const STATUS_RING: Record<ExecutionStatus, string> = {
  idle:    '',
  running: 'ring-2 ring-blue-400 animate-pulse',
  success: 'ring-2 ring-green-500',
  error:   'ring-2 ring-red-500',
  skipped: 'ring-2 ring-gray-500',
};

const STATUS_DOT: Record<ExecutionStatus, string> = {
  idle:    'bg-gray-600',
  running: 'bg-blue-400 animate-ping',
  success: 'bg-green-500',
  error:   'bg-red-500',
  skipped: 'bg-gray-500',
};

export const RouteNode = memo(function RouteNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { route, config, executionStatus } = data;
  const ringClass = STATUS_RING[executionStatus];
  const dotClass = STATUS_DOT[executionStatus];
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);

  const displayMethod = config.methodOverride ?? route.method;
  const displayPath = config.urlOverride ?? route.path;
  const isOverridden = !!(config.methodOverride || config.urlOverride);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedNode(null);
    onNodesChange([{ type: 'remove', id }]);
  }

  return (
    <div
      className={`
        w-56 bg-gray-800 border rounded-lg overflow-hidden cursor-pointer select-none
        ${selected ? 'border-violet-500' : 'border-gray-700'}
        ${ringClass}
        transition-all duration-150
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/60 border-b border-gray-700">
        <Badge method={displayMethod} />
        <span
          className={`text-xs font-mono truncate flex-1 ${isOverridden ? 'text-amber-300' : 'text-gray-200'}`}
          title={displayPath}
        >
          {displayPath}
        </span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        {selected && (
          <button
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            title="Remover nó"
          >
            ×
          </button>
        )}
      </div>

      {/* Body */}
      {route.summary && (
        <div className="px-3 py-1.5">
          <p className="text-[10px] text-gray-400 truncate">{route.summary}</p>
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700 hover:!bg-violet-400 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700 hover:!bg-violet-400 transition-colors"
      />
    </div>
  );
});
