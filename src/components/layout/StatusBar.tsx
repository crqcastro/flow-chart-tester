import { useExecutionStore } from '../../store/executionStore';

export function StatusBar() {
  const running = useExecutionStore((s) => s.running);
  const summary = useExecutionStore((s) => s.summary);

  if (running) {
    return (
      <footer className="flex items-center px-4 h-7 bg-gray-900 border-t border-gray-800 shrink-0 text-xs text-blue-400">
        <span className="animate-pulse">⏳ Executando fluxo...</span>
      </footer>
    );
  }

  if (summary) {
    const allOk = summary.failed === 0;
    return (
      <footer className={`flex items-center gap-4 px-4 h-7 bg-gray-900 border-t border-gray-800 shrink-0 text-xs ${allOk ? 'text-green-400' : 'text-red-400'}`}>
        <span>{allOk ? '✓' : '✗'} Execução finalizada</span>
        <span className="text-gray-500">|</span>
        <span className="text-green-400">{summary.success} ok</span>
        {summary.failed > 0 && <span className="text-red-400">{summary.failed} falhou</span>}
        <span className="text-gray-500">{summary.durationMs}ms</span>
      </footer>
    );
  }

  return (
    <footer className="flex items-center px-4 h-7 bg-gray-900 border-t border-gray-800 shrink-0 text-xs text-gray-500">
      <span>Pronto</span>
    </footer>
  );
}
