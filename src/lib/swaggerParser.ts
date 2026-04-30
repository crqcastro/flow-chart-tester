import yaml from 'js-yaml';
import type { HttpMethod, RouteDefinition, RouteParameter, RouteRequestBody, RouteResponse } from '../types/swagger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

function slugify(method: string, path: string): string {
  return `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
}

function resolveRef(doc: AnyObj, ref: string): AnyObj | undefined {
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = doc;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return current;
}

function resolveSchema(doc: AnyObj, schema: AnyObj | undefined): AnyObj | undefined {
  if (!schema) return undefined;
  if (schema.$ref) return resolveRef(doc, schema.$ref);
  return schema;
}

function extractExample(schema: AnyObj | undefined): unknown {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.type === 'object' && schema.properties) {
    const obj: AnyObj = {};
    for (const [key, val] of Object.entries(schema.properties as AnyObj)) {
      const propSchema = val as AnyObj;
      obj[key] = propSchema.example ?? propSchema.default ?? defaultForType(propSchema.type);
    }
    return obj;
  }
  if (schema.type === 'array' && schema.items) {
    return [extractExample(schema.items as AnyObj)];
  }
  return schema.default ?? defaultForType(schema.type);
}

function defaultForType(type: string | undefined): unknown {
  switch (type) {
    case 'string': return '';
    case 'integer':
    case 'number': return 0;
    case 'boolean': return false;
    case 'array': return [];
    case 'object': return {};
    default: return null;
  }
}

// ---------- OAS 2.0 (Swagger) ----------

function parseSwagger2(doc: AnyObj): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  const host: string = doc.host ?? 'localhost';
  const basePath: string = doc.basePath ?? '/';
  const schemes: string[] = doc.schemes ?? ['https'];
  const baseUrl = `${schemes[0]}://${host}${basePath === '/' ? '' : basePath}`;

  const paths: AnyObj = doc.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      const op: AnyObj | undefined = (pathItem as AnyObj)[method.toLowerCase()];
      if (!op) continue;

      const parameters: RouteParameter[] = [];
      let requestBody: RouteRequestBody | undefined;

      const allParams = [...((pathItem as AnyObj).parameters ?? []), ...(op.parameters ?? [])];
      for (const param of allParams) {
        const p = param.$ref ? resolveRef(doc, param.$ref) as AnyObj : param as AnyObj;
        if (!p) continue;
        if (p.in === 'body') {
          const schema = resolveSchema(doc, p.schema);
          requestBody = {
            required: p.required ?? false,
            contentType: 'application/json',
            schema,
            example: extractExample(schema),
          };
        } else if (p.in === 'formData') {
          requestBody = {
            required: p.required ?? false,
            contentType: 'application/x-www-form-urlencoded',
            schema: { type: 'object' },
            example: { [p.name]: p.example ?? '' },
          };
        } else {
          parameters.push({
            name: p.name,
            in: p.in,
            required: p.required ?? false,
            description: p.description,
            schema: p.schema,
            example: p.example,
          });
        }
      }

      const responses: Record<string, RouteResponse> = {};
      for (const [statusCode, resp] of Object.entries(op.responses ?? {})) {
        const r = (resp as AnyObj).$ref ? resolveRef(doc, (resp as AnyObj).$ref) as AnyObj : resp as AnyObj;
        if (!r) continue;
        const schema = resolveSchema(doc, r.schema);
        responses[statusCode] = {
          statusCode,
          description: r.description ?? '',
          schema,
          example: r.examples?.['application/json'] ?? extractExample(schema),
        };
      }

      const tags: string[] = op.tags ?? [];

      routes.push({
        id: slugify(method, path),
        method,
        path,
        summary: op.summary ?? '',
        description: op.description ?? '',
        operationId: op.operationId,
        tags: tags.length ? tags : ['default'],
        parameters,
        requestBody,
        responses,
        baseUrl,
      });
    }
  }

  return routes;
}

// ---------- OAS 3.0 ----------

function parseOas3(doc: AnyObj): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  const servers: AnyObj[] = doc.servers ?? [{ url: '/' }];
  const globalBaseUrl: string = servers[0]?.url ?? '/';

  const paths: AnyObj = doc.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      const op: AnyObj | undefined = (pathItem as AnyObj)[method.toLowerCase()];
      if (!op) continue;

      const opServers: AnyObj[] = op.servers ?? (pathItem as AnyObj).servers ?? servers;
      const baseUrl = opServers[0]?.url ?? globalBaseUrl;

      const parameters: RouteParameter[] = [];
      const allParams = [...((pathItem as AnyObj).parameters ?? []), ...(op.parameters ?? [])];
      for (const param of allParams) {
        const p = param.$ref ? resolveRef(doc, param.$ref) as AnyObj : param as AnyObj;
        if (!p) continue;
        const schema = resolveSchema(doc, p.schema);
        parameters.push({
          name: p.name,
          in: p.in,
          required: p.required ?? false,
          description: p.description,
          schema,
          example: p.example ?? extractExample(schema),
        });
      }

      let requestBody: RouteRequestBody | undefined;
      if (op.requestBody) {
        const rb: AnyObj = op.requestBody.$ref
          ? (resolveRef(doc, op.requestBody.$ref) as AnyObj)
          : op.requestBody;
        const content: AnyObj = rb.content ?? {};
        const contentType = Object.keys(content)[0] ?? 'application/json';
        const mediaType: AnyObj = content[contentType] ?? {};
        const schema = resolveSchema(doc, mediaType.schema);
        requestBody = {
          required: rb.required ?? false,
          contentType,
          schema,
          example: mediaType.example ?? extractExample(schema),
        };
      }

      const responses: Record<string, RouteResponse> = {};
      for (const [statusCode, resp] of Object.entries(op.responses ?? {})) {
        const r = (resp as AnyObj).$ref ? resolveRef(doc, (resp as AnyObj).$ref) as AnyObj : resp as AnyObj;
        if (!r) continue;
        const content: AnyObj = r.content ?? {};
        const contentType = Object.keys(content)[0] ?? 'application/json';
        const mediaType: AnyObj = content[contentType] ?? {};
        const schema = resolveSchema(doc, mediaType.schema);
        responses[statusCode] = {
          statusCode,
          description: r.description ?? '',
          schema,
          example: mediaType.example ?? extractExample(schema),
        };
      }

      routes.push({
        id: slugify(method, path),
        method,
        path,
        summary: op.summary ?? '',
        description: op.description ?? '',
        operationId: op.operationId,
        tags: op.tags?.length ? op.tags : ['default'],
        parameters,
        requestBody,
        responses,
        baseUrl,
      });
    }
  }

  return routes;
}

// ---------- Public API ----------

export function parseSwagger(rawContent: string): RouteDefinition[] {
  let doc: AnyObj;

  try {
    doc = JSON.parse(rawContent) as AnyObj;
  } catch {
    try {
      doc = yaml.load(rawContent) as AnyObj;
    } catch (yamlErr) {
      throw new Error(`Não foi possível interpretar o arquivo como JSON ou YAML: ${(yamlErr as Error).message}`);
    }
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('Documento inválido: o conteúdo não é um objeto.');
  }

  if (doc.swagger === '2.0' || doc.swagger?.startsWith('2.')) {
    return parseSwagger2(doc);
  }

  if (doc.openapi?.startsWith('3.')) {
    return parseOas3(doc);
  }

  throw new Error('Formato não reconhecido. Certifique-se de que o arquivo é OpenAPI 2.0 ou 3.x.');
}
