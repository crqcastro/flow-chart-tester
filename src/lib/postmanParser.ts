import type { RouteDefinition, HttpMethod, RouteParameter, RouteRequestBody } from '../types/swagger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

function slugify(method: string, path: string, suffix = ''): string {
  const base = `pm_${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
  return suffix ? `${base}_${suffix}` : base;
}

function parseUrl(url: AnyObj | string): { baseUrl: string; path: string; queryParams: RouteParameter[]; pathParams: RouteParameter[] } {
  let rawUrl = '';

  if (typeof url === 'string') {
    rawUrl = url;
  } else {
    rawUrl = url.raw ?? '';
  }

  // Remove protocol + host to get just the path
  let baseUrl = '';
  let pathname = '';

  try {
    // Handle {{variable}} in URLs by temporarily replacing them
    const sanitized = rawUrl.replace(/\{\{[^}]+\}\}/g, 'PLACEHOLDER');
    const parsed = new URL(sanitized.startsWith('http') ? sanitized : `https://${sanitized}`);
    baseUrl = rawUrl.startsWith('http')
      ? rawUrl.slice(0, rawUrl.indexOf(parsed.pathname.replace(/PLACEHOLDER/g, ''))) || `${parsed.protocol}//${parsed.host}`
      : '';

    // Re-extract from structured url object if available
    if (typeof url === 'object' && url.host) {
      const hostParts: string[] = url.host;
      const scheme = url.protocol ?? 'https';
      baseUrl = `${scheme}://${hostParts.join('.')}`;
    }

    // Path from structured object
    if (typeof url === 'object' && url.path) {
      pathname = '/' + (url.path as string[]).map((p: string) => p.startsWith(':') ? `{${p.slice(1)}}` : p).join('/');
    } else {
      pathname = parsed.pathname.replace(/PLACEHOLDER/g, () => {
        // Try to recover original {{var}}
        const re = /\{\{[^}]+\}\}/g;
        const matches = [...rawUrl.matchAll(re)];
        return matches[0]?.[0] ?? 'PLACEHOLDER';
      });
    }
  } catch {
    // Fallback: split manually
    const noProto = rawUrl.replace(/^https?:\/\//, '');
    const slashIdx = noProto.indexOf('/');
    if (slashIdx >= 0) {
      baseUrl = 'https://' + noProto.slice(0, slashIdx);
      pathname = noProto.slice(slashIdx).split('?')[0];
    } else {
      baseUrl = 'https://' + noProto;
      pathname = '/';
    }
  }

  // Remove query string from path
  pathname = pathname.split('?')[0];

  // Query params from structured object
  const queryParams: RouteParameter[] = [];
  if (typeof url === 'object' && url.query) {
    for (const q of url.query as AnyObj[]) {
      queryParams.push({
        name: q.key ?? '',
        in: 'query',
        required: false,
        description: q.description ?? '',
        example: q.value ?? '',
      });
    }
  }

  // Path params from structured object
  const pathParams: RouteParameter[] = [];
  if (typeof url === 'object' && url.variable) {
    for (const v of url.variable as AnyObj[]) {
      pathParams.push({
        name: v.key ?? v.id ?? '',
        in: 'path',
        required: true,
        description: v.description ?? '',
        example: v.value ?? '',
      });
    }
  } else {
    // Extract from path pattern {varName}
    const re = /\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pathname)) !== null) {
      pathParams.push({ name: m[1], in: 'path', required: true });
    }
  }

  return { baseUrl, path: pathname || '/', queryParams, pathParams };
}

function parseBody(body: AnyObj | undefined): RouteRequestBody | undefined {
  if (!body) return undefined;

  const mode: string = body.mode ?? 'raw';

  if (mode === 'raw') {
    const raw: string = body.raw ?? '';
    let example: unknown;
    try { example = JSON.parse(raw); } catch { example = raw || undefined; }
    const lang = body.options?.raw?.language ?? 'json';
    return {
      required: false,
      contentType: lang === 'json' ? 'application/json' : 'text/plain',
      example,
    };
  }

  if (mode === 'urlencoded') {
    const pairs: AnyObj[] = body.urlencoded ?? [];
    const example = Object.fromEntries(pairs.map((p: AnyObj) => [p.key, p.value ?? '']));
    return { required: false, contentType: 'application/x-www-form-urlencoded', example };
  }

  if (mode === 'formdata') {
    const pairs: AnyObj[] = body.formdata ?? [];
    const example = Object.fromEntries(pairs.map((p: AnyObj) => [p.key, p.value ?? '']));
    return { required: false, contentType: 'multipart/form-data', example };
  }

  if (mode === 'graphql') {
    return { required: false, contentType: 'application/json', example: body.graphql };
  }

  return undefined;
}

function parseItem(item: AnyObj, folderTags: string[], seenIds: Set<string>): RouteDefinition[] {
  // Folder — recurse
  if (item.item) {
    const tag = item.name ?? 'default';
    return (item.item as AnyObj[]).flatMap((child: AnyObj) =>
      parseItem(child, [...folderTags, tag], seenIds)
    );
  }

  // Request item
  const req: AnyObj = item.request ?? {};
  if (!req.method) return [];

  const method = (req.method as string).toUpperCase() as HttpMethod;
  const { baseUrl, path, queryParams, pathParams } = parseUrl(req.url ?? '/');

  const headers: RouteParameter[] = (req.header as AnyObj[] ?? [])
    .filter((h: AnyObj) => !h.disabled)
    .map((h: AnyObj) => ({
      name: h.key ?? '',
      in: 'header' as const,
      required: false,
      description: h.description ?? '',
      example: h.value ?? '',
    }));

  const parameters: RouteParameter[] = [...pathParams, ...queryParams, ...headers];
  const requestBody = parseBody(req.body);

  const tags = folderTags.length ? folderTags : ['default'];

  // Ensure unique id
  let id = slugify(method, path);
  let attempt = 0;
  while (seenIds.has(id)) {
    attempt++;
    id = slugify(method, path, String(attempt));
  }
  seenIds.add(id);

  return [{
    id,
    method,
    path,
    summary: item.name ?? '',
    description: typeof req.description === 'string' ? req.description : '',
    operationId: item.id,
    tags,
    parameters,
    requestBody,
    responses: { '200': { statusCode: '200', description: 'OK' } },
    baseUrl,
  }];
}

export function parsePostmanCollection(rawContent: string): RouteDefinition[] {
  let doc: AnyObj;
  try {
    doc = JSON.parse(rawContent) as AnyObj;
  } catch (e) {
    throw new Error(`Arquivo não é um JSON válido: ${(e as Error).message}`);
  }

  // Validate it's a Postman collection
  const schema: string = doc.info?.schema ?? '';
  if (!schema.includes('getpostman.com') && !doc.item) {
    throw new Error('Arquivo não parece ser uma coleção Postman. Verifique se exportou como "Collection v2" ou "v2.1".');
  }

  const items: AnyObj[] = doc.item ?? [];
  const seenIds = new Set<string>();
  return items.flatMap((item: AnyObj) => parseItem(item, [], seenIds));
}
