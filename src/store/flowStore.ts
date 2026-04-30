import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { FlowNode, FlowEdge, NodeConfig, EdgeData } from '../types/flow';
import type { RouteDefinition } from '../types/swagger';
import { defaultNodeConfig } from '../types/flow';
import { nanoid } from '../lib/nanoid';

interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;

  addNodeFromRoute: (route: RouteDefinition, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, patch: Partial<NodeConfig>) => void;
  setNodeExecutionStatus: (nodeId: string, status: FlowNode['data']['executionStatus']) => void;

  addEdge: (edge: FlowEdge) => void;
  updateEdgeData: (edgeId: string, patch: Partial<EdgeData>) => void;

  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;

  clearDiagram: () => void;
  setDiagram: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  addNodeFromRoute: (route, position) =>
    set((state) => {
      const node: FlowNode = {
        id: nanoid(),
        type: 'route',
        position,
        data: {
          route,
          config: defaultNodeConfig(route),
          executionStatus: 'idle',
        },
      };
      return { nodes: [...state.nodes, node] };
    }),

  updateNodeConfig: (nodeId, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } }
          : n
      ),
    })),

  setNodeExecutionStatus: (nodeId, status) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, executionStatus: status } } : n
      ),
    })),

  addEdge: (edge) =>
    set((state) => ({ edges: [...state.edges, edge] })),

  updateEdgeData: (edgeId, patch) =>
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...(e.data ?? { strategy: 'sequential', fieldMappings: [] }), ...patch } } : e
      ),
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  clearDiagram: () => set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null }),
  setDiagram: (nodes, edges) => set({ nodes, edges, selectedNodeId: null, selectedEdgeId: null }),
}));
