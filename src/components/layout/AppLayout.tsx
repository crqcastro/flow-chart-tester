import type { ReactNode } from 'react';

interface AppLayoutProps {
  topBar: ReactNode;
  sidebar: ReactNode;
  canvas: ReactNode;
  panel: ReactNode;
  statusBar: ReactNode;
  showPanel: boolean;
}

export function AppLayout({ topBar, sidebar, canvas, panel, statusBar, showPanel }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {topBar}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar esquerda */}
        <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto flex flex-col">
          {sidebar}
        </aside>

        {/* Canvas central */}
        <main className="flex-1 overflow-hidden bg-gray-950 relative">
          {canvas}
        </main>

        {/* Painel lateral direito */}
        {showPanel && (
          <aside className="w-80 shrink-0 bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col">
            {panel}
          </aside>
        )}
      </div>
      {statusBar}
    </div>
  );
}
