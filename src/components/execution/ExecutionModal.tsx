import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { useFlowStore } from '../../store/flowStore';
import { useExecutionStore } from '../../store/executionStore';
import type { FlowNode, ExecutionStatus } from '../../types/flow';
import type { ExecutionResult, SerializedRequest, SerializedResponse } from '../../types/execution';

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ExecutionStatus | 'pending' }) {
  if (status === 'running') {
    return (
      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
        <span className="w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin block" />
      </span>
    );
  }
  const map: Record<string, string> = {
    pending: 'text-gray-600',
    idle:    'text-gray-600',
    success: 'text-green-400',
    error:   'text-red-400',
    skipped: 'text-gray-500',
  };
  const icon: Record<string, string> = {
    pending: '○', idle: '○', success: '✓', error: '✗', skipped: '⊘',
  };
  return (
    <span className={`w-4 h-4 shrink-0 flex items-center justify-center text-sm font-bold ${map[status] ?? 'text-gray-600'}`}>
      {icon[status] ?? '○'}
    </span>
  );
}

// ─── HTTP status badge ────────────────────────────────────────────────────────

function HttpStatusBadge({ code }: { code: number }) {
  const cls =
    code >= 500 ? 'bg-red-900/60 text-red-300' :
    code >= 400 ? 'bg-orange-900/60 text-orange-300' :
    code >= 300 ? 'bg-blue-900/60 text-blue-300' :
                  'bg-green-900/60 text-green-300';
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${cls}`}>{code}</span>
  );
}

// ─── Body preview ─────────────────────────────────────────────────────────────

function BodyPreview({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const MAX = 400;
  const trimmed = body.trim();
  if (!trimmed) return <span className="text-gray-600 italic">vazio</span>;
  const display = (!expanded && trimmed.length > MAX) ? trimmed.slice(0, MAX) + '…' : trimmed;
  return (
    <span>
      {display}
      {trimmed.length > MAX && (
        <button
          className="ml-1 text-violet-400 hover:text-violet-300 text-[10px]"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'menos' : 'mais'}
        </button>
      )}
    </span>
  );
}

// ─── Request section ──────────────────────────────────────────────────────────

function RequestSection({ request }: { request: SerializedRequest }) {
  const headers = Object.entries(request.headers);
  return (
    <div className="mt-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Requisição</p>
      <pre className="text-[11px] font-mono text-violet-300 break-all whitespace-pre-wrap">
        {request.method} {request.url}
      </pre>
      {headers.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {headers.map(([k, v]) => (
            <div key={k} className="flex gap-1 text-[11px] font-mono">
              <span className="text-gray-500 shrink-0">{k}:</span>
              <span className="text-gray-300 break-all">{v}</span>
            </div>
          ))}
        </div>
      )}
      {request.body && (
        <pre className="mt-1 text-[11px] font-mono text-gray-400 break-all whitespace-pre-wrap">
          <BodyPreview body={request.body} />
        </pre>
      )}
    </div>
  );
}

// ─── Response section ─────────────────────────────────────────────────────────

function ResponseSection({ response }: { response: SerializedResponse }) {
  return (
    <div className="mt-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Resposta</p>
      <div className="flex items-center gap-2 mb-1">
        <HttpStatusBadge code={response.status} />
        <span className="text-[11px] text-gray-400">{response.statusText}</span>
      </div>
      {response.body && (
        <pre className="text-[11px] font-mono text-gray-300 break-all whitespace-pre-wrap">
          <BodyPreview body={response.body} />
        </pre>
      )}
    </div>
  );
}

// ─── Node row ─────────────────────────────────────────────────────────────────

interface NodeRowProps {
  node: FlowNode;
  result: ExecutionResult | undefined;
  pending?: boolean;
}

function NodeRow({ node, result, pending = false }: NodeRowProps) {
  const { route, config, executionStatus } = node.data;
  const displayMethod = config.methodOverride ?? route.method;
  // Show resolved URL from result when available, fall back to template path
  const displayUrl = result?.request.url ?? (config.pathOverride ?? route.path);

  const status: ExecutionStatus | 'pending' = pending ? 'pending' : executionStatus;
  const hasDetails = !!result;
  const isError = status === 'error';

  // Auto-expand on error
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (isError && result) setExpanded(true);
  }, [isError, result]);

  const showExpanded = expanded && hasDetails;

  return (
    <div className="border border-gray-800 rounded overflow-hidden">
      <div
        className={`flex items-center gap-2 px-3 py-2 select-none ${hasDetails ? 'cursor-pointer hover:bg-gray-800/40' : ''}`}
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        <StatusIcon status={status} />
        <Badge method={displayMethod} />
        <span className="flex-1 text-xs font-mono text-gray-200 truncate" title={displayUrl}>
          {displayUrl}
        </span>
        {result?.response && <HttpStatusBadge code={result.response.status} />}
        {result && (
          <span className="text-[10px] text-gray-500 shrink-0">{result.durationMs}ms</span>
        )}
        {result?.error && (
          <span className="text-[10px] text-red-400 shrink-0 max-w-[120px] truncate" title={result.error}>
            {result.error}
          </span>
        )}
        {hasDetails && (
          <span className="text-[10px] text-gray-600 shrink-0 ml-1">{showExpanded ? '▲' : '▼'}</span>
        )}
      </div>

      {showExpanded && result && (
        <div className="px-3 pt-1 pb-3 border-t border-gray-800 bg-gray-900/40 flex flex-col gap-1">
          <RequestSection request={result.request} />
          {result.response && <ResponseSection response={result.response} />}
          {result.error && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Erro</p>
              <p className="text-xs text-red-400">{result.error}</p>
            </div>
          )}
          {result.extractedVars && Object.keys(result.extractedVars).length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Variáveis extraídas</p>
              {Object.entries(result.extractedVars).map(([k, v]) => (
                <div key={k} className="flex gap-1 text-[11px] font-mono">
                  <span className="text-violet-400">{`{{${k}}}`}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-300 truncate">{v}</span>
                </div>
              ))}
            </div>
          )}
          {result.validationResult.checks.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Validações</p>
              {result.validationResult.checks.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className={c.passed ? 'text-green-400' : 'text-red-400'}>{c.passed ? '✓' : '✗'}</span>
                  <span className="text-gray-400 font-mono">{c.path ?? c.type}</span>
                  {!c.passed && (
                    <span className="text-gray-500 truncate">esperado: {c.expected} · obtido: {c.actual}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface ExecutionModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExecutionModal({ open, onClose }: ExecutionModalProps) {
  const allNodes = useFlowStore((s) => s.nodes);
  const running = useExecutionStore((s) => s.running);
  const results = useExecutionStore((s) => s.results);
  const summary = useExecutionStore((s) => s.summary);
  const executionLog = useExecutionStore((s) => s.executionLog);

  // Nodes in the order they were executed
  const startedNodes = executionLog
    .map((id) => allNodes.find((n) => n.id === id))
    .filter((n): n is FlowNode => !!n);

  // Enabled nodes not yet started (shown as pending while running)
  const pendingNodes = running
    ? allNodes.filter((n) => n.data.config.enabled && !executionLog.includes(n.id))
    : [];

  const completedCount = executionLog.length;
  const totalEnabled = allNodes.filter((n) => n.data.config.enabled).length;

  return (
    <Modal open={open} onClose={running ? undefined : onClose} title="Execução do Fluxo" width="max-w-2xl">
      {/* Progress bar */}
      {(running || summary) && totalEnabled > 0 && (
        <div className="mb-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${running ? 'bg-violet-500' : summary && summary.failed === 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${(completedCount / totalEnabled) * 100}%` }}
          />
        </div>
      )}

      {/* Node list */}
      <div className="flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto pr-1">
        {startedNodes.map((node) => (
          <NodeRow key={node.id} node={node} result={results.get(node.id)} />
        ))}
        {pendingNodes.map((node) => (
          <NodeRow key={node.id} node={node} result={undefined} pending />
        ))}
        {allNodes.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">Nenhum nó no diagrama</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
        <div className="text-xs text-gray-400">
          {running ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse block" />
              Executando {completedCount}/{totalEnabled}...
            </span>
          ) : summary ? (
            <span className="flex items-center gap-3">
              <span className="text-gray-300">{summary.total} chamadas</span>
              <span className="text-green-400">✓ {summary.success}</span>
              {summary.failed > 0 && <span className="text-red-400">✗ {summary.failed}</span>}
              <span className="text-gray-500">{summary.durationMs}ms</span>
            </span>
          ) : null}
        </div>
        <button
          onClick={onClose}
          disabled={running}
          className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
        >
          {running ? 'Aguarde...' : 'Fechar'}
        </button>
      </div>
    </Modal>
  );
}
