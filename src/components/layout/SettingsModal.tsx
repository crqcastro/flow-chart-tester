import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useExecutionStore } from '../../store/executionStore';

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

  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            URL do Proxy CORS
          </label>
          <input
            type="text"
            value={localProxy}
            onChange={(e) => setLocalProxy(e.target.value)}
            placeholder="https://cors-anywhere.example.com"
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <p className="text-[10px] text-gray-500 mt-1.5">
            Quando preenchido, todas as requisições são prefixadas com essa URL.
            Útil para contornar bloqueios de CORS em produção.
          </p>
        </div>

        <div className="p-3 bg-blue-900/20 border border-blue-800 rounded text-[10px] text-blue-300">
          <p className="font-semibold mb-1">Sobre CORS</p>
          <p>Em desenvolvimento, configure <code className="bg-gray-800 px-1 rounded">server.proxy</code> no <code className="bg-gray-800 px-1 rounded">vite.config.ts</code>.</p>
          <p className="mt-1">Em produção, use uma instância do <strong>cors-anywhere</strong> ou desabilite CORS com uma extensão de navegador.</p>
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
