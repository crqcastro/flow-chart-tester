import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TopBar } from './components/layout/TopBar';
import { StatusBar } from './components/layout/StatusBar';
import { RouteList } from './components/swagger/RouteList';
import { SwaggerImportModal } from './components/swagger/SwaggerImportModal';
import { FlowCanvas } from './components/canvas/FlowCanvas';

export default function App() {
  const [importModalOpen, setImportModalOpen] = useState(false);

  return (
    <>
      <AppLayout
        topBar={<TopBar onImportClick={() => setImportModalOpen(true)} />}
        sidebar={<RouteList onImportClick={() => setImportModalOpen(true)} />}
        canvas={<FlowCanvas />}
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
