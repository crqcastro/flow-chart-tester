import type { Environment, EnvironmentVariable } from '../types/environment';
import { nanoid } from './nanoid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export function parsePostmanEnvironment(rawContent: string): Environment {
  let doc: AnyObj;
  try {
    doc = JSON.parse(rawContent) as AnyObj;
  } catch (e) {
    throw new Error(`Arquivo não é um JSON válido: ${(e as Error).message}`);
  }

  // Support both wrapped { environment: {...} } and direct format
  const env: AnyObj = doc.environment ?? doc;

  if (!env.values && !env.variable) {
    throw new Error('Arquivo não parece ser um ambiente Postman. Verifique se exportou como "Environment".');
  }

  const rawVars: AnyObj[] = env.values ?? env.variable ?? [];

  const variables: EnvironmentVariable[] = rawVars
    .filter((v: AnyObj) => v.key || v.name) // some exports use "name" instead of "key"
    .map((v: AnyObj) => ({
      id: nanoid(),
      key: v.key ?? v.name ?? '',
      value: v.value ?? v.current_value ?? '',
      description: v.description ?? '',
      enabled: v.enabled !== false && v.disabled !== true,
    }));

  return {
    id: nanoid(),
    name: env.name ?? 'Ambiente Postman',
    variables,
  };
}
