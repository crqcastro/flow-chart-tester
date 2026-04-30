import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TopBar } from './components/layout/TopBar';
import { StatusBar } from './components/layout/StatusBar';
import { SettingsModal } from './components/layout/SettingsModal';
import { RouteList } from './components/swagger/RouteList';
import { SwaggerImportModal } from './components/swagger/SwaggerImportModal';
import { FlowCanvas } from './components/canvas/FlowCanvas';
import { PropertiesPanel } from './components/panel/PropertiesPanel';
import { useFlowStore } from './store/flowStore';

export default function App() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);

  return (
    <>
      <AppLayout
        topBar={
          <TopBar
            onImportClick={() => setImportModalOpen(true)}
            onSettingsClick={() => setSettingsOpen(true)}
            onImportXmlClick={() => {/* Etapa 7 */}}
            onExportXmlClick={() => {/* Etapa 7 */}}
          />
        }
        sidebar={<RouteList onImportClick={() => setImportModalOpen(true)} />}
        canvas={<FlowCanvas />}
        panel={<PropertiesPanel />}
        statusBar={<StatusBar />}
        showPanel={!!selectedNodeId}
      />
      <SwaggerImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
