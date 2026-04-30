import { AppLayout } from './components/layout/AppLayout';
import { TopBar } from './components/layout/TopBar';
import { StatusBar } from './components/layout/StatusBar';

function SidebarPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4 text-center">
      <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
      <p className="text-sm text-gray-500">Importe um Swagger<br />para ver as rotas</p>
    </div>
  );
}

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
  return (
    <AppLayout
      topBar={<TopBar />}
      sidebar={<SidebarPlaceholder />}
      canvas={<CanvasPlaceholder />}
      panel={null}
      statusBar={<StatusBar />}
      showPanel={false}
    />
  );
}
