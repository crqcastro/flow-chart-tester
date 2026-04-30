import type { ExecutionResult } from '../../types/execution';

interface ResultPanelProps {
  result?: ExecutionResult;
}

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg className="w-8 h-8 text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xs text-gray-600">Nenhum resultado ainda.<br />Execute o fluxo primeiro.</p>
      </div>
    );
  }

  const { request, response, validationResult, error, durationMs, requestedAt } = result;
  const passed = validationResult.passed && !error;

  return (
    <div className="flex flex-col gap-3">
      {/* Status summary */}
      <div className={`flex items-center justify-between p-2 rounded ${passed ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
        <span className={`text-sm font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? '✓ Sucesso' : '✗ Falhou'}
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {response && <span className={response.status < 400 ? 'text-green-400' : 'text-red-400'}>{response.status}</span>}
          <span>{durationMs}ms</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Request */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Requisição</p>
        <div className="bg-gray-800/50 rounded p-2">
          <p className="text-xs font-mono text-gray-300 break-all">{request.method} {request.url}</p>
          {request.body && (
            <pre className="text-[10px] text-gray-500 mt-1 overflow-x-auto max-h-20 scrollbar-thin">{request.body}</pre>
          )}
        </div>
      </div>

      {/* Response */}
      {response && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Resposta</p>
          <div className="bg-gray-800/50 rounded p-2">
            <p className="text-xs text-gray-300 mb-1">{response.status} {response.statusText}</p>
            <pre className="text-[10px] text-gray-400 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
              {response.body.length > 2000 ? response.body.slice(0, 2000) + '\n...(truncado)' : response.body}
            </pre>
          </div>
        </div>
      )}

      {/* Validation checks */}
      {validationResult.checks.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Validações</p>
          <div className="flex flex-col gap-1">
            {validationResult.checks.map((check, i) => (
              <div key={i} className={`flex items-start gap-2 p-1.5 rounded text-xs ${check.passed ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <span className={check.passed ? 'text-green-400 shrink-0' : 'text-red-400 shrink-0'}>
                  {check.passed ? '✓' : '✗'}
                </span>
                <div className="min-w-0">
                  {check.path && <span className="text-gray-400 font-mono">{check.path}: </span>}
                  <span className="text-gray-400">esperado </span>
                  <code className="text-gray-300 break-all">{check.expected.slice(0, 80)}</code>
                  {!check.passed && (
                    <>
                      <span className="text-gray-500"> · recebido </span>
                      <code className="text-gray-400 break-all">{check.actual.slice(0, 80)}</code>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600">Executado em {new Date(requestedAt).toLocaleTimeString('pt-BR')}</p>
    </div>
  );
}
