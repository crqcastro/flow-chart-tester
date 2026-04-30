import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from '../../store/flowStore';
import { useSwaggerStore } from '../../store/swaggerStore';
import { RouteNode } from './RouteNode';
import { EdgeConfigModal } from './EdgeConfigModal';
import type { EdgeData, FlowEdge } from '../../types/flow';
import { nanoid } from '../../lib/nanoid';

const NODE_TYPES: NodeTypes = { route: RouteNode as NodeTypes[string] };

export function FlowCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange,
    addNodeFromRoute,
    addEdge: storeAddEdge,
    setSelectedNode, setSelectedEdge,
    selectedNodeId, selectedEdgeId,
  } = useFlowStore();
  const routes = useSwaggerStore((s) => s.routes);
  const [edgeModalId, setEdgeModalId] = useState<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedEdgeId)) {
        // React Flow handles node/edge deletion via onNodesChange/onEdgesChange with 'remove' type
        if (selectedNodeId) {
          onNodesChange([{ type: 'remove', id: selectedNodeId }]);
          setSelectedNode(null);
        }
        if (selectedEdgeId) {
          onEdgesChange([{ type: 'remove', id: selectedEdgeId }]);
          setSelectedEdge(null);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, selectedEdgeId, onNodesChange, onEdgesChange, setSelectedNode, setSelectedEdge]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: FlowEdge = {
        ...connection,
        id: nanoid(),
        data: { strategy: 'sequential', fieldMappings: [] } as EdgeData,
        style: { stroke: '#6b7280', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as const },
      } as FlowEdge;
      storeAddEdge(newEdge);
      useFlowStore.setState((state) => ({ edges: addEdge(newEdge, state.edges) }));
    },
    [storeAddEdge]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const routeId = e.dataTransfer.getData('application/flowchart-route');
      if (!routeId) return;
      const route = routes.find((r) => r.id === routeId);
      if (!route) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeFromRoute(route, position);
    },
    [routes, addNodeFromRoute, screenToFlowPosition]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const edgesWithLabels = edges.map((e) => {
    const strategy = e.data?.strategy ?? 'sequential';
    const labelMap: Record<string, string> = {
      'sequential': '',
      'full-response': '→ full',
      'map-fields': '→ map',
    };
    return {
      ...e,
      label: labelMap[strategy] || '',
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
      style: {
        stroke: strategy === 'sequential' ? '#6b7280' : '#8b5cf6',
        strokeWidth: selectedEdgeId === e.id ? 3 : 2,
      },
    };
  });

  return (
    <div className="w-full h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edgesWithLabels}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onEdgeClick={(_, edge) => setSelectedEdge(edge.id)}
        onEdgeDoubleClick={(_, edge) => setEdgeModalId(edge.id)}
        onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
        fitView
        colorMode="dark"
        defaultEdgeOptions={{
          style: { stroke: '#6b7280', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed' as const },
        }}
        deleteKeyCode={null} // We handle delete manually
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls className="!bg-gray-800 !border-gray-700" />
        <MiniMap
          className="!bg-gray-900 !border-gray-700"
          nodeColor={(n) => {
            const status = (n.data as { executionStatus?: string }).executionStatus;
            if (status === 'success') return '#22c55e';
            if (status === 'error') return '#ef4444';
            if (status === 'running') return '#60a5fa';
            return '#374151';
          }}
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <svg className="w-12 h-12 text-gray-800 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
          </svg>
          <p className="text-sm text-gray-600">Arraste rotas da sidebar para começar</p>
          <p className="text-xs text-gray-700 mt-1">Conecte blocos para encadear chamadas</p>
        </div>
      )}

      {/* Keyboard hints */}
      {(selectedNodeId || selectedEdgeId) && (
        <div className="absolute top-3 right-3 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded pointer-events-none">
          <kbd className="px-1 bg-gray-800 rounded">Esc</kbd> desselecionar ·{' '}
          <kbd className="px-1 bg-gray-800 rounded">Del</kbd> remover
        </div>
      )}

      {/* Edge config modal */}
      <EdgeConfigModal edgeId={edgeModalId} onClose={() => setEdgeModalId(null)} />
    </div>
  );
}
