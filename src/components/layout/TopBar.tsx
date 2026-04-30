interface TopBarProps {
  onImportClick?: () => void;
}

export function TopBar({ onImportClick }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2m0 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
        </svg>
        <span className="font-semibold text-white text-sm tracking-wide">Flowchart</span>
        <span className="text-xs text-gray-500">— Testador Visual de APIs</span>
      </div>
      <div className="flex items-center gap-2">
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Importar Swagger
          </button>
        )}
        <button
          disabled
          className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-500 cursor-not-allowed"
          title="Disponível após importar Swagger"
        >
          Importar XML
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-500 cursor-not-allowed"
          title="Disponível após montar diagrama"
        >
          Exportar XML
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs rounded bg-violet-800 text-violet-300 cursor-not-allowed"
          title="Disponível após montar diagrama"
        >
          ▶ Executar
        </button>
      </div>
    </header>
  );
}
