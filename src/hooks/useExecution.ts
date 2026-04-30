import { useCallback } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useExecutionStore } from '../store/executionStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { runFlow } from '../lib/executionEngine';

export function useExecution() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setNodeExecutionStatus = useFlowStore((s) => s.setNodeExecutionStatus);
  const { setRunning, updateResult, clearResults, setSummary, proxyUrl } = useExecutionStore();
  const running = useExecutionStore((s) => s.running);
  const getActiveVars = useEnvironmentStore((s) => s.getActiveVars);
  const setVariableValue = useEnvironmentStore((s) => s.setVariableValue);

  const execute = useCallback(async () => {
    if (running || nodes.length === 0) return;

    clearResults();
    setRunning(true);
    nodes.forEach((n) => setNodeExecutionStatus(n.id, 'idle'));

    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;

    try {
      await runFlow(nodes, edges, {
        proxyUrl: proxyUrl || undefined,
        vars: getActiveVars(),
        onNodeStart: (nodeId) => {
          setNodeExecutionStatus(nodeId, 'running');
        },
        onNodeEnd: (result) => {
          const passed = result.validationResult.passed && !result.error;
          setNodeExecutionStatus(result.nodeId, passed ? 'success' : 'error');
          updateResult(result);
          if (passed) successCount++;
          else failedCount++;
        },
        onVarsUpdated: (extracted) => {
          // Persist extracted vars back to the active environment
          for (const [key, value] of Object.entries(extracted)) {
            setVariableValue(key, value);
          }
        },
      });
    } catch (err) {
      console.error('Execution error:', err);
    } finally {
      setRunning(false);
      setSummary({
        total: nodes.filter((n) => n.data.config.enabled).length,
        success: successCount,
        failed: failedCount,
        durationMs: Date.now() - startTime,
      });
    }
  }, [nodes, edges, running, proxyUrl, clearResults, setRunning, setNodeExecutionStatus,
      updateResult, setSummary, getActiveVars, setVariableValue]);

  return { execute, running };
}
