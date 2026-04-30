import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useExecutionStore } from '../../store/executionStore';

const LOCAL_PROXY = 'http://localhost:5173/proxy';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { proxyUrl, setProxyUrl } = useExecutionStore();
  const [localProxy, setLocalProxy] = useState(proxyUrl);

  function save() {
    setProxyUrl(localProxy.trim());
    onClose();
  }

  function useLocalProxy() {
    setLocalProxy(LOCAL_PROXY);
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            URL do Proxy CORS
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={localProxy}
              onChange={(e) => setLocalProxy(e.target.value)}
              placeholder="http://localhost:5173/proxy"
              className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono"
            />
            <button
              onClick={useLocalProxy}
              title="Usar proxy local do Vite"
              className="px-3 py-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors whitespace-nowrap"
            >
              Proxy local
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">
            Quando preenchido, as requisições são enviadas via esse proxy para contornar CORS.
          </p>
        </div>

        {/* Local proxy instructions */}
        <div className="p-3 bg-green-900/20 border border-green-800 rounded text-[10px] text-green-300 flex flex-col gap-1">
          <p className="font-semibold text-green-200">Proxy local (recomendado)</p>
          <p>
            Em desenvolvimento (<code className="bg-gray-800 px-1 rounded">npm run dev</code>), o Vite
            inclui um proxy CORS embutido. Clique em{' '}
            <strong>"Proxy local"</strong> para preencher automaticamente e salve.
          </p>
          <p className="font-mono bg-gray-900/60 px-2 py-1 rounded text-green-400 mt-0.5">
            {LOCAL_PROXY}
          </p>
        </div>

        <div className="p-3 bg-blue-900/20 border border-blue-800 rounded text-[10px] text-blue-300">
          <p className="font-semibold mb-1">Produção / build estático</p>
          <p>Use uma instância própria do <strong>cors-anywhere</strong> ou desabilite CORS
            temporariamente com uma extensão de navegador.</p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={save} className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
}
