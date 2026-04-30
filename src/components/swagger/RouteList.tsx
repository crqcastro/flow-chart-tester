import { useState } from 'react';
import { useSwaggerStore } from '../../store/swaggerStore';
import type { ImportedSource } from '../../store/swaggerStore';
import { Badge } from '../ui/Badge';
import { ManualRouteModal } from './ManualRouteModal';
import type { RouteDefinition } from '../../types/swagger';

// ─── Tree model ────────────────────────────────────────────────────────────────

interface FolderNode {
  kind: 'folder';
  name: string;
  key: string; // unique collapse key
  children: TreeNode[];
}

interface RouteNode {
  kind: 'route';
  route: RouteDefinition;
}

type TreeNode = FolderNode | RouteNode;

/** Build nested folder tree from a flat route list.
 *  Each route's `tags` array is treated as a folder path:
 *  tags = ['Auth', 'Tokens'] → Auth > Tokens > route
 */
function buildTree(routes: RouteDefinition[], sourceKey: string): TreeNode[] {
  const root: TreeNode[] = [];

  for (const route of routes) {
    const folders = route.tags.length > 0 ? route.tags : [];
    let current = root;
    let keyPath = sourceKey;

    for (const folder of folders) {
      keyPath = `${keyPath}/${folder}`;
      let node = current.find((n): n is FolderNode => n.kind === 'folder' && n.name === folder);
      if (!node) {
        node = { kind: 'folder', name: folder, key: keyPath, children: [] };
        current.push(node);
      }
      current = node.children;
    }

    current.push({ kind: 'route', route });
  }

  return root;
}

function countRoutes(nodes: TreeNode[]): number {
  return nodes.reduce((sum, n) => sum + (n.kind === 'route' ? 1 : countRoutes(n.children)), 0);
}

function filterRoutes(routes: RouteDefinition[], q: string): RouteDefinition[] {
  if (!q.trim()) return routes;
  const lq = q.toLowerCase();
  return routes.filter(
    (r) =>
      r.path.toLowerCase().includes(lq) ||
      r.summary.toLowerCase().includes(lq) ||
      r.method.toLowerCase().includes(lq)
  );
}

// ─── Route item ─────────────────────────────────────────────────────────────────

function RouteItem({ route, indent }: { route: RouteDefinition; indent: number }) {
  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('application/flowchart-route', route.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{ paddingLeft: indent }}
      className="flex items-start gap-2 py-1.5 pr-3 hover:bg-gray-800 cursor-grab active:cursor-grabbing border-b border-gray-800/30 transition-colors"
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
  );
}

// ─── Folder accordion ───────────────────────────────────────────────────────────

interface TreeItemsProps {
  nodes: TreeNode[];
  indent: number;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}

function TreeItems({ nodes, indent, collapsed, onToggle }: TreeItemsProps) {
  return (
    <>
      {nodes.map((node) =>
        node.kind === 'folder' ? (
          <FolderSection
            key={node.key}
            node={node}
            indent={indent}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ) : (
          <RouteItem key={node.route.id} route={node.route} indent={indent + 4} />
        )
      )}
    </>
  );
}

interface FolderSectionProps {
  node: FolderNode;
  indent: number;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}

function FolderSection({ node, indent, collapsed, onToggle }: FolderSectionProps) {
  const isCollapsed = collapsed.has(node.key);
  const total = countRoutes(node.children);

  return (
    <div>
      <button
        className="w-full flex items-center gap-1.5 py-1 pr-3 hover:bg-gray-800/60 transition-colors text-left"
        style={{ paddingLeft: indent }}
        onClick={() => onToggle(node.key)}
      >
        <span className="text-[9px] text-gray-600 w-2 shrink-0">{isCollapsed ? '▶' : '▼'}</span>
        {/* folder icon */}
        <svg className="w-3 h-3 shrink-0 text-amber-500/60" fill="currentColor" viewBox="0 0 20 20">
          {isCollapsed ? (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          ) : (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H2V6zm0 3v5a2 2 0 002 2h12a2 2 0 002-2V9H2z" />
          )}
        </svg>
        <span className="flex-1 text-xs text-gray-300 truncate">{node.name}</span>
        <span className="text-[10px] text-gray-600 shrink-0">{total}</span>
      </button>

      {!isCollapsed && (
        <TreeItems
          nodes={node.children}
          indent={indent + 14}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

// ─── Source section ─────────────────────────────────────────────────────────────

const SOURCE_META: Record<
  ImportedSource['type'],
  { badge: string; badgeClass: string }
> = {
  swagger: { badge: 'OAS', badgeClass: 'bg-blue-900/50 text-blue-300' },
  postman: { badge: 'PM',  badgeClass: 'bg-orange-900/50 text-orange-300' },
  manual:  { badge: 'MAN', badgeClass: 'bg-gray-700 text-gray-400' },
};

interface SourceSectionProps {
  source: ImportedSource;
  routes: RouteDefinition[];
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}

function SourceSection({ source, routes, collapsed, onToggle }: SourceSectionProps) {
  const srcKey = `src:${source.label}`;
  const isCollapsed = collapsed.has(srcKey);
  const meta = SOURCE_META[source.type];
  const tree = buildTree(routes, srcKey);

  return (
    <div className="border-b border-gray-800">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 transition-colors"
        onClick={() => onToggle(srcKey)}
      >
        <span className="text-[9px] text-gray-600 w-2 shrink-0">{isCollapsed ? '▶' : '▼'}</span>
        <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${meta.badgeClass}`}>
          {meta.badge}
        </span>
        <span
          className="flex-1 text-xs text-gray-300 truncate text-left font-medium"
          title={source.label}
        >
          {source.label}
        </span>
        <span className="text-[10px] text-gray-600 shrink-0">{routes.length}</span>
      </button>

      {!isCollapsed && (
        <TreeItems nodes={tree} indent={12} collapsed={collapsed} onToggle={onToggle} />
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

interface RouteListProps {
  onImportClick: () => void;
}

export function RouteList({ onImportClick }: RouteListProps) {
  const routes = useSwaggerStore((s) => s.routes);
  const sources = useSwaggerStore((s) => s.sources);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [manualModalOpen, setManualModalOpen] = useState(false);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Empty state
  if (!routes.length) {
    return (
      <>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4 text-center">
          <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <p className="text-sm text-gray-500">
            Importe um Swagger / OpenAPI<br />ou coleção Postman
          </p>
          <button
            className="mt-2 px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            onClick={onImportClick}
          >
            Importar
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

  // Per-source filtered routes
  const sourceData = sources.map((source) => {
    const src = routes.filter((r) => source.routeIds.includes(r.id));
    return { source, routes: filterRoutes(src, search) };
  }).filter((s) => s.routes.length > 0 || !search.trim());

  const noResults = search.trim() && sourceData.every((s) => s.routes.length === 0);

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
                Importar
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Source + folder tree */}
        <div className="flex-1 overflow-y-auto">
          {!noResults ? (
            sourceData.map(({ source, routes: sr }) => (
              <SourceSection
                key={source.label}
                source={source}
                routes={sr}
                collapsed={collapsed}
                onToggle={toggle}
              />
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">Nenhuma rota encontrada</p>
          )}
        </div>
      </div>

      <ManualRouteModal open={manualModalOpen} onClose={() => setManualModalOpen(false)} />
    </>
  );
}
