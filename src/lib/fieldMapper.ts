import { JSONPath } from 'jsonpath-plus';
import type { FieldMapping, NodeConfig, KeyValuePair } from '../types/flow';
import { nanoid } from './nanoid';

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    current[part] = current[part] != null && typeof current[part] === 'object'
      ? { ...(current[part] as Record<string, unknown>) }
      : {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return result;
}

export function applyFieldMappings(
  previousResponseBody: unknown,
  config: NodeConfig,
  mappings: FieldMapping[]
): NodeConfig {
  if (!mappings.length) return config;

  let payloadObj: Record<string, unknown> = {};
  try {
    payloadObj = config.payloadJson ? JSON.parse(config.payloadJson) as Record<string, unknown> : {};
  } catch {
    payloadObj = {};
  }

  let headers = [...config.headers];
  let queryParams = [...config.queryParams];
  let pathParams = [...config.pathParams];

  for (const mapping of mappings) {
    let extracted: unknown;
    try {
      const results = JSONPath({ path: mapping.sourceJsonPath, json: previousResponseBody as object, wrap: false });
      extracted = results;
    } catch {
      continue;
    }

    if (extracted === undefined || extracted === null) continue;

    const strVal = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);

    switch (mapping.targetType) {
      case 'body':
        payloadObj = setNestedValue(payloadObj, mapping.targetField, extracted);
        break;
      case 'header': {
        const existing = headers.findIndex((h) => h.key === mapping.targetField);
        if (existing >= 0) {
          headers = headers.map((h, i) => i === existing ? { ...h, value: strVal, enabled: true } : h);
        } else {
          headers = [...headers, { id: nanoid(), key: mapping.targetField, value: strVal, enabled: true }];
        }
        break;
      }
      case 'query': {
        const existing = queryParams.findIndex((q) => q.key === mapping.targetField);
        if (existing >= 0) {
          queryParams = queryParams.map((q, i) => i === existing ? { ...q, value: strVal, enabled: true } : q);
        } else {
          queryParams = [...queryParams, { id: nanoid(), key: mapping.targetField, value: strVal, enabled: true }];
        }
        break;
      }
      case 'path': {
        const existing = pathParams.findIndex((p) => p.key === mapping.targetField);
        if (existing >= 0) {
          pathParams = pathParams.map((p, i) => i === existing ? { ...p, value: strVal } : p);
        } else {
          pathParams = [...pathParams, { id: nanoid(), key: mapping.targetField, value: strVal, enabled: true }];
        }
        break;
      }
    }
  }

  return {
    ...config,
    payloadJson: JSON.stringify(payloadObj, null, 2),
    headers,
    queryParams,
    pathParams,
  };
}

export function applyFullResponse(
  previousResponseBody: unknown,
  config: NodeConfig
): NodeConfig {
  return {
    ...config,
    payloadJson: JSON.stringify(previousResponseBody, null, 2),
  };
}

// Helper to update a KV list used in config
export function updateKvList(list: KeyValuePair[], id: string, field: keyof KeyValuePair, value: unknown): KeyValuePair[] {
  return list.map((item) => item.id === id ? { ...item, [field]: value } : item);
}
