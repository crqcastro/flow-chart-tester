import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TopBar } from './components/layout/TopBar';
import { StatusBar } from './components/layout/StatusBar';
import { RouteList } from './components/swagger/RouteList';
import { SwaggerImportModal } from './components/swagger/SwaggerImportModal';

function CanvasPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-3">
      <svg className="w-12 h-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
      </svg>
      <p className="text-sm text-gray-600">Arraste rotas aqui para montar o fluxo</p>
    </div>
  );
}

export default function App() {
  const [importModalOpen, setImportModalOpen] = useState(false);

  return (
    <>
      <AppLayout
        topBar={<TopBar onImportClick={() => setImportModalOpen(true)} />}
        sidebar={<RouteList onImportClick={() => setImportModalOpen(true)} />}
        canvas={<CanvasPlaceholder />}
        panel={null}
        statusBar={<StatusBar />}
        showPanel={false}
      />
      <SwaggerImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </>
  );
}
