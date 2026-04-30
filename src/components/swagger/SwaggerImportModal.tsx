import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useSwaggerImport } from '../../hooks/useSwaggerImport';
import { useSwaggerStore } from '../../store/swaggerStore';
import { useEnvironmentStore } from '../../store/environmentStore';
import { parsePostmanEnvironment } from '../../lib/postmanEnvParser';

interface SwaggerImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SwaggerImportModal({ open, onClose }: SwaggerImportModalProps) {
  const [tab, setTab] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSuccess, setEnvSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const envFileRef = useRef<HTMLInputElement>(null);
  const { loading, error, importFromUrl, importFromFile } = useSwaggerImport();
  const { sources, removeSource } = useSwaggerStore();
  const { environments, addEnvironment, updateVariable, addVariable } = useEnvironmentStore();

  async function handleUrlImport() {
    if (!url.trim()) return;
    const ok = await importFromUrl(url.trim());
    if (ok) { setUrl(''); }
  }

  async function handleFile(file: File) {
    await importFromFile(file);
  }

  async function handleEnvFile(file: File) {
    setEnvError(null);
    setEnvSuccess(null);
    try {
      const raw = await file.text();
      const parsed = parsePostmanEnvironment(raw);

      // Check if environment with same name exists → merge variables
      const existing = environments.find((e) => e.name === parsed.name);
      if (existing) {
        for (const v of parsed.variables) {
          const existingVar = existing.variables.find((ev) => ev.key === v.key);
          if (existingVar) {
            updateVariable(existing.id, existingVar.id, { value: v.value });
          } else {
            addVariable(existing.id);
            // The variable is added as empty row; update it by key
            const store = (await import('../../store/environmentStore')).useEnvironmentStore.getState();
            const env = store.environments.find((e) => e.id === existing.id);
            const newVar = env?.variables[env.variables.length - 1];
            if (newVar) store.updateVariable(existing.id, newVar.id, { key: v.key, value: v.value, enabled: v.enabled });
          }
        }
        setEnvSuccess(`Ambiente "${parsed.name}" atualizado com ${parsed.variables.length} variáveis.`);
      } else {
        // Create new environment with all variables at once
        const id = addEnvironment(parsed.name);
        const store = useEnvironmentStore.getState();
        for (const v of parsed.variables) {
          store.addVariable(id);
          const env = store.environments.find((e) => e.id === id);
          const newVar = env?.variables[env.variables.length - 1];
          if (newVar) store.updateVariable(id, newVar.id, { key: v.key, value: v.value, enabled: v.enabled });
        }
        setEnvSuccess(`Ambiente "${parsed.name}" importado com ${parsed.variables.length} variáveis.`);
      }
    } catch (e) {
      setEnvError((e as Error).message);
    }
  }

  const TABS = [
    { id: 'url' as const, label: 'URL' },
    { id: 'file' as const, label: 'Arquivo' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Importar Swagger / Postman" width="max-w-lg">
      {/* Active sources */}
      {sources.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Fontes ativas</p>
          <div className="flex flex-col gap-1">
            {sources.map((s) => (
              <div key={s.label} className="flex items-center justify-between px-2 py-1 bg-gray-800 rounded text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] px-1 rounded font-semibold ${s.type === 'postman' ? 'bg-orange-900/50 text-orange-300' : s.type === 'manual' ? 'bg-gray-700 text-gray-400' : 'bg-blue-900/50 text-blue-300'}`}>
                    {s.type === 'postman' ? 'PM' : s.type === 'manual' ? 'MAN' : 'OAS'}
                  </span>
                  <span className="text-gray-300 truncate">{s.label}</span>
                  <span className="text-gray-600 shrink-0">{s.routeIds.length} rotas</span>
                </div>
                <button
                  onClick={() => removeSource(s.label)}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-2 shrink-0"
                  title="Remover esta fonte"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`flex-1 py-1.5 text-xs rounded transition-colors ${tab === t.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'url' && (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] text-gray-500">Swagger/OpenAPI ou coleção Postman pública</p>
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
          {/* API collection drop zone */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Swagger / OpenAPI / Coleção Postman</p>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-7 h-7 text-gray-500 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs text-gray-400">Arraste ou <span className="text-violet-400">clique</span></p>
              <p className="text-[10px] text-gray-600 mt-0.5">.json · .yaml · .yml</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          </div>

          {loading && <p className="text-xs text-center text-gray-400">Processando...</p>}

          {/* Postman environment import */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-[10px] text-gray-500 mb-1">Ambiente Postman</p>
            <div
              className="border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-lg p-4 text-center cursor-pointer transition-colors"
              onClick={() => envFileRef.current?.click()}
            >
              <p className="text-xs text-gray-400">Importar <span className="text-orange-400">Environment.json</span> do Postman</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Cria ou atualiza o ambiente correspondente</p>
            </div>
            <input ref={envFileRef} type="file" accept=".json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEnvFile(f); e.target.value = ''; }} />
          </div>

          {envSuccess && (
            <div className="p-2 bg-green-900/30 border border-green-700 rounded text-xs text-green-300">{envSuccess}</div>
          )}
          {envError && (
            <div className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">{envError}</div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">{error}</div>
      )}
    </Modal>
  );
}
