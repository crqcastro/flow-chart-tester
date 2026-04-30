import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useSwaggerImport } from '../../hooks/useSwaggerImport';

interface SwaggerImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SwaggerImportModal({ open, onClose }: SwaggerImportModalProps) {
  const [tab, setTab] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loading, error, importFromUrl, importFromFile } = useSwaggerImport();

  async function handleUrlImport() {
    if (!url.trim()) return;
    const ok = await importFromUrl(url.trim());
    if (ok) onClose();
  }

  async function handleFile(file: File) {
    const ok = await importFromFile(file);
    if (ok) onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar Swagger / OpenAPI">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded p-1">
        <button
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${tab === 'url' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setTab('url')}
        >
          URL
        </button>
        <button
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${tab === 'file' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setTab('file')}
        >
          Arquivo
        </button>
      </div>

      {tab === 'url' && (
        <div className="flex flex-col gap-3">
          <input
            type="url"
            placeholder="https://petstore.swagger.io/v2/swagger.json"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleUrlImport}
            disabled={loading || !url.trim()}
            className="w-full py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
          >
            {loading ? 'Carregando...' : 'Importar'}
          </button>
        </div>
      )}

      {tab === 'file' && (
        <div className="flex flex-col gap-3">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-400">Arraste o arquivo aqui ou <span className="text-violet-400">clique para selecionar</span></p>
            <p className="text-xs text-gray-600 mt-1">.json ou .yaml</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {loading && <p className="text-sm text-center text-gray-400">Processando...</p>}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
          {error}
        </div>
      )}
    </Modal>
  );
}
