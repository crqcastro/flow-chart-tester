import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useEnvironmentStore } from '../../store/environmentStore';
import type { Environment } from '../../types/environment';

interface EnvironmentModalProps {
  open: boolean;
  onClose: () => void;
}

export function EnvironmentModal({ open, onClose }: EnvironmentModalProps) {
  const {
    environments, activeEnvironmentId,
    addEnvironment, updateEnvironment, deleteEnvironment, duplicateEnvironment,
    setActiveEnvironment,
    addVariable, updateVariable, deleteVariable,
  } = useEnvironmentStore();

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) ?? environments[0] ?? null;

  function handleAddEnv() {
    if (!newEnvName.trim()) return;
    const id = addEnvironment(newEnvName.trim());
    setSelectedEnvId(id);
    setNewEnvName('');
  }

  function handleRenameEnv(env: Environment) {
    setEditingName(env.id);
    setEditNameValue(env.name);
  }

  function commitRename(id: string) {
    if (editNameValue.trim()) updateEnvironment(id, editNameValue.trim());
    setEditingName(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="Ambientes e Variáveis" width="max-w-3xl">
      <div className="flex gap-4 min-h-[380px]">

        {/* Left: environment list */}
        <div className="w-48 shrink-0 flex flex-col gap-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ambientes</p>

          {environments.map((env) => (
            <div
              key={env.id}
              className={`group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors ${selectedEnv?.id === env.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              onClick={() => setSelectedEnvId(env.id)}
            >
              {/* Active indicator */}
              <button
                onClick={(e) => { e.stopPropagation(); setActiveEnvironment(activeEnvironmentId === env.id ? null : env.id); }}
                title={activeEnvironmentId === env.id ? 'Ambiente ativo — clique para desativar' : 'Definir como ativo'}
                className={`w-2 h-2 rounded-full shrink-0 transition-colors ${activeEnvironmentId === env.id ? 'bg-green-400' : 'bg-gray-600 group-hover:bg-gray-500'}`}
              />

              {editingName === env.id ? (
                <input
                  autoFocus
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={() => commitRename(env.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(env.id); if (e.key === 'Escape') setEditingName(null); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-gray-800 border border-violet-500 rounded px-1 text-xs text-white focus:outline-none"
                />
              ) : (
                <span className="flex-1 min-w-0 text-xs text-gray-200 truncate" onDoubleClick={() => handleRenameEnv(env)}>
                  {env.name}
                </span>
              )}

              {/* Actions */}
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateEnvironment(env.id); }}
                  title="Duplicar"
                  className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors text-xs"
                >⧉</button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${env.name}"?`)) deleteEnvironment(env.id); }}
                  title="Excluir"
                  className="p-0.5 text-gray-500 hover:text-red-400 transition-colors text-xs"
                >×</button>
              </div>
            </div>
          ))}

          {/* Add new env */}
          <div className="flex gap-1 mt-2">
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEnv()}
              placeholder="Novo ambiente"
              className="flex-1 min-w-0 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleAddEnv}
              disabled={!newEnvName.trim()}
              className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-600 text-white rounded transition-colors"
            >+</button>
          </div>

          {activeEnvironmentId && (
            <p className="text-[10px] text-green-500 mt-2">
              ● Ativo: {environments.find((e) => e.id === activeEnvironmentId)?.name}
            </p>
          )}
          {!activeEnvironmentId && (
            <p className="text-[10px] text-gray-600 mt-2">Nenhum ambiente ativo</p>
          )}
        </div>

        {/* Right: variable editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedEnv ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <p className="text-sm text-gray-600">Crie ou selecione um ambiente</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-white">{selectedEnv.name}</p>
                <button
                  onClick={() => addVariable(selectedEnv.id)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  + Variável
                </button>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-1 mb-1 px-1">
                <span className="w-4 shrink-0" />
                <span className="flex-1 text-[10px] text-gray-500 uppercase tracking-wider">Variável</span>
                <span className="flex-1 text-[10px] text-gray-500 uppercase tracking-wider">Valor atual</span>
                <span className="w-5 shrink-0" />
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-1">
                {selectedEnv.variables.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-4">
                    Nenhuma variável. Clique em "+ Variável" para começar.
                  </p>
                )}
                {selectedEnv.variables.map((v) => (
                  <div key={v.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) => updateVariable(selectedEnv.id, v.id, { enabled: e.target.checked })}
                      className="w-4 shrink-0 accent-violet-500"
                      title="Habilitar variável"
                    />
                    <input
                      type="text"
                      value={v.key}
                      onChange={(e) => updateVariable(selectedEnv.id, v.id, { key: e.target.value })}
                      placeholder="nome_variavel"
                      className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-violet-300 font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => updateVariable(selectedEnv.id, v.id, { value: e.target.value })}
                      placeholder="valor"
                      className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={() => deleteVariable(selectedEnv.id, v.id)}
                      className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors shrink-0"
                    >×</button>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-2 bg-gray-800/50 rounded text-[10px] text-gray-500">
                Use <code className="bg-gray-700 px-1 rounded text-violet-300">{'{{nome_variavel}}'}</code> em URLs, headers e body para substituição automática.
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors">
          Fechar
        </button>
      </div>
    </Modal>
  );
}
