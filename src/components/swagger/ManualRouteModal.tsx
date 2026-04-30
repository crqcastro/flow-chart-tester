import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useSwaggerStore } from '../../store/swaggerStore';
import type { HttpMethod, RouteDefinition, RouteParameter } from '../../types/swagger';
import { nanoid } from '../../lib/nanoid';
import type { ImportedSource } from '../../store/swaggerStore';
import { VarInput } from '../ui/VarInput';

interface ManualRouteModalProps {
  open: boolean;
  onClose: () => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface ParamRow {
  id: string;
  name: string;
  in: 'query' | 'header' | 'path';
  required: boolean;
}

export function ManualRouteModal({ open, onClose }: ManualRouteModalProps) {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [baseUrl, setBaseUrl] = useState('https://');
  const [path, setPath] = useState('/');
  const [summary, setSummary] = useState('');
  const [hasBody, setHasBody] = useState(false);
  const [bodyExample, setBodyExample] = useState('{\n  \n}');
  const [params, setParams] = useState<ParamRow[]>([]);
  const [error, setError] = useState('');

  const { routes, appendRoutes } = useSwaggerStore();

  function reset() {
    setMethod('GET');
    setBaseUrl('https://');
    setPath('/');
    setSummary('');
    setHasBody(false);
    setBodyExample('{\n  \n}');
    setParams([]);
    setError('');
  }

  function addParam() {
    setParams((p) => [...p, { id: nanoid(), name: '', in: 'query', required: false }]);
  }

  function removeParam(id: string) {
    setParams((p) => p.filter((r) => r.id !== id));
  }

  function updateParam(id: string, field: keyof ParamRow, value: string | boolean) {
    setParams((p) => p.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function handleSave() {
    if (!path.trim() || !path.startsWith('/')) {
      setError('O path deve começar com /');
      return;
    }
    if (!baseUrl.trim()) {
      setError('Informe a URL base');
      return;
    }

    // Build unique id - ensure no collision
    const baseId = `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
    const existsCount = routes.filter((r) => r.id === baseId || r.id.startsWith(baseId + '_')).length;
    const id = existsCount > 0 ? `${baseId}_${existsCount}` : baseId;

    const parameters: RouteParameter[] = params
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        in: p.in,
        required: p.required,
      }));

    const route: RouteDefinition = {
      id,
      method,
      path: path.trim(),
      summary: summary.trim(),
      description: '',
      tags: ['manual'],
      parameters,
      requestBody: hasBody && !['GET', 'HEAD', 'OPTIONS'].includes(method)
        ? { required: false, contentType: 'application/json', example: (() => { try { return JSON.parse(bodyExample); } catch { return undefined; } })() }
        : undefined,
      responses: { '200': { statusCode: '200', description: 'OK' } },
      baseUrl: baseUrl.replace(/\/$/, ''),
    };

    const manualSource: ImportedSource = {
      type: 'manual',
      label: 'manual',
      source: { type: 'file', fileName: 'manual', rawContent: '' },
      routeIds: [route.id],
    };
    appendRoutes([route], manualSource);

    reset();
    onClose();
  }

  function handleClose() {
    reset();
    onClose();
  }

  const isBodyMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  return (
    <Modal open={open} onClose={handleClose} title="Adicionar Rota Manualmente" width="max-w-lg">
      <div className="flex flex-col gap-3">

        {/* Method + Path */}
        <div className="flex gap-2">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Método</label>
            <select
              value={method}
              onChange={(e) => {
                const m = e.target.value as HttpMethod;
                setMethod(m);
                if (['GET', 'HEAD', 'OPTIONS'].includes(m)) setHasBody(false);
              }}
              className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-violet-500"
            >
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Path</label>
            <VarInput
              value={path}
              onChange={setPath}
              placeholder="/users/{id}"
              className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">URL Base</label>
          <VarInput
            value={baseUrl}
            onChange={setBaseUrl}
            placeholder="https://api.exemplo.com"
            className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Descrição (opcional)</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Buscar usuário por ID"
            className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Parameters */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Parâmetros (opcional)</label>
            <button onClick={addParam} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              + Adicionar
            </button>
          </div>
          {params.map((param) => (
            <div key={param.id} className="flex items-center gap-1 mb-1">
              <select
                value={param.in}
                onChange={(e) => updateParam(param.id, 'in', e.target.value)}
                className="px-1.5 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:border-violet-500"
              >
                <option value="query">query</option>
                <option value="path">path</option>
                <option value="header">header</option>
              </select>
              <input
                type="text"
                value={param.name}
                onChange={(e) => updateParam(param.id, 'name', e.target.value)}
                placeholder="nome"
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
              <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                <input
                  type="checkbox"
                  checked={param.required}
                  onChange={(e) => updateParam(param.id, 'required', e.target.checked)}
                  className="accent-violet-500"
                />
                req
              </label>
              <button onClick={() => removeParam(param.id)} className="text-gray-600 hover:text-red-400 transition-colors">×</button>
            </div>
          ))}
        </div>

        {/* Body toggle */}
        {isBodyMethod && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBody}
                onChange={(e) => setHasBody(e.target.checked)}
                className="accent-violet-500"
              />
              <span className="text-xs text-gray-300">Tem body (JSON)</span>
            </label>
            {hasBody && (
              <textarea
                value={bodyExample}
                onChange={(e) => setBodyExample(e.target.value)}
                rows={4}
                placeholder='{\n  "key": "value"\n}'
                className="mt-2 w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
              />
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={handleClose} className="px-3 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors">
            Adicionar Rota
          </button>
        </div>
      </div>
    </Modal>
  );
}
