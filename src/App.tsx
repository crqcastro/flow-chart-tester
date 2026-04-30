import { useState, useRef } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { TopBar } from './components/layout/TopBar';
import { StatusBar } from './components/layout/StatusBar';
import { SettingsModal } from './components/layout/SettingsModal';
import { RouteList } from './components/swagger/RouteList';
import { SwaggerImportModal } from './components/swagger/SwaggerImportModal';
import { FlowCanvas } from './components/canvas/FlowCanvas';
import { PropertiesPanel } from './components/panel/PropertiesPanel';
import { Modal } from './components/ui/Modal';
import { EnvironmentModal } from './components/environment/EnvironmentModal';
import { ExecutionModal } from './components/execution/ExecutionModal';
import { useFlowStore } from './store/flowStore';
import { useXmlIO } from './hooks/useXmlIO';

export default function App() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [exportNameOpen, setExportNameOpen] = useState(false);
  const [exportName, setExportName] = useState('Meu Fluxo');
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const xmlFileRef = useRef<HTMLInputElement>(null);
  const { exportXml, importXml, error: xmlError } = useXmlIO();

  async function handleXmlFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      await importXml(file);
      e.target.value = '';
    }
  }

  return (
    <>
      <AppLayout
        topBar={
          <TopBar
            onImportClick={() => setImportModalOpen(true)}
            onSettingsClick={() => setSettingsOpen(true)}
            onEnvironmentClick={() => setEnvModalOpen(true)}
            onImportXmlClick={() => xmlFileRef.current?.click()}
            onExportXmlClick={() => setExportNameOpen(true)}
            onExecuteClick={() => setExecutionModalOpen(true)}
          />
        }
        sidebar={<RouteList onImportClick={() => setImportModalOpen(true)} />}
        canvas={<FlowCanvas />}
        panel={<PropertiesPanel />}
        statusBar={<StatusBar />}
        showPanel={!!selectedNodeId}
      />

      {/* Hidden XML file input */}
      <input
        ref={xmlFileRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleXmlFileChange}
      />

      <SwaggerImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <EnvironmentModal
        open={envModalOpen}
        onClose={() => setEnvModalOpen(false)}
      />
      <ExecutionModal
        open={executionModalOpen}
        onClose={() => setExecutionModalOpen(false)}
      />

      {/* Export name dialog */}
      <Modal open={exportNameOpen} onClose={() => setExportNameOpen(false)} title="Exportar Diagrama">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome do diagrama</label>
            <input
              type="text"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (exportXml(exportName), setExportNameOpen(false))}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              placeholder="Meu Fluxo"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setExportNameOpen(false)} className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => { exportXml(exportName); setExportNameOpen(false); }}
              className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Baixar XML
            </button>
          </div>
        </div>
      </Modal>

      {/* XML error toast */}
      {xmlError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-900 border border-red-700 text-red-200 text-xs px-4 py-2 rounded shadow-lg">
          {xmlError}
        </div>
      )}
    </>
  );
}
