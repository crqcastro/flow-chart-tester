import { useState } from 'react';
import { useSwaggerStore } from '../../store/swaggerStore';
import { Badge } from '../ui/Badge';
import { ManualRouteModal } from './ManualRouteModal';
import type { RouteDefinition } from '../../types/swagger';

interface RouteListProps {
  onImportClick: () => void;
}

export function RouteList({ onImportClick }: RouteListProps) {
  const routes = useSwaggerStore((s) => s.routes);
  const source = useSwaggerStore((s) => s.source);
  const [search, setSearch] = useState('');
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const [manualModalOpen, setManualModalOpen] = useState(false);

  if (!routes.length) {
    return (
      <>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4 text-center">
          <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <p className="text-sm text-gray-500">Importe um Swagger<br />para ver as rotas</p>
          <button
            className="mt-2 px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            onClick={onImportClick}
          >
            Importar Swagger
          </button>
          <button
            className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            onClick={() => setManualModalOpen(true)}
          >
            + Rota manual
          </button>
        </div>
        <ManualRouteModal open={manualModalOpen} onClose={() => setManualModalOpen(false)} />
      </>
    );
  }

  // Group by tag
  const grouped = routes.reduce<Record<string, RouteDefinition[]>>((acc, r) => {
    const tag = r.tags[0] ?? 'default';
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(r);
    return acc;
  }, {});

  const filtered = Object.entries(grouped).map(([tag, items]) => ({
    tag,
    items: items.filter((r) =>
      r.path.toLowerCase().includes(search.toLowerCase()) ||
      r.summary.toLowerCase().includes(search.toLowerCase()) ||
      r.method.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.items.length > 0);

  function toggleTag(tag: string) {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>, route: RouteDefinition) {
    e.dataTransfer.setData('application/flowchart-route', route.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rotas</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualModalOpen(true)}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              title="Adicionar rota manualmente"
            >
              + Manual
            </button>
            <button
              onClick={onImportClick}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reimportar
            </button>
          </div>
        </div>
        {source && (
          <p className="text-xs text-gray-600 truncate mb-2" title={source.url ?? source.fileName}>
            {source.type === 'url' ? source.url : source.fileName}
          </p>
        )}
        <input
          type="text"
          placeholder="Buscar rota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(({ tag, items }) => (
          <div key={tag}>
            <button
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:bg-gray-800 transition-colors"
              onClick={() => toggleTag(tag)}
            >
              <span className="truncate">{tag}</span>
              <span className="text-gray-600">{collapsedTags.has(tag) ? '▶' : '▼'}</span>
            </button>
            {!collapsedTags.has(tag) && items.map((route) => (
              <div
                key={route.id}
                draggable
                onDragStart={(e) => onDragStart(e, route)}
                className="flex items-start gap-2 px-3 py-2 hover:bg-gray-800 cursor-grab active:cursor-grabbing border-b border-gray-800/50 transition-colors group"
                title={route.description || route.summary}
              >
                <Badge method={route.method} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-200 font-mono truncate">{route.path}</p>
                  {route.summary && (
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{route.summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-6">Nenhuma rota encontrada</p>
        )}
      </div>
    </div>
    <ManualRouteModal open={manualModalOpen} onClose={() => setManualModalOpen(false)} />
    </>
  );
}
