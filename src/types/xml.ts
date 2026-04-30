export interface DiagramMeta {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SwaggerSourceMeta {
  type: 'url' | 'file';
  url?: string;
  fileName?: string;
  rawContent: string; // base64-encoded original YAML/JSON
}

export interface XmlNodeData {
  id: string;
  routeId: string;
  x: number;
  y: number;
  config: string; // JSON-stringified NodeConfig (CDATA)
}

export interface XmlEdgeData {
  id: string;
  source: string;
  target: string;
  data: string; // JSON-stringified EdgeData (CDATA)
}

export interface DiagramXml {
  version: string;
  meta: DiagramMeta;
  swaggerSource: SwaggerSourceMeta;
  nodes: XmlNodeData[];
  edges: XmlEdgeData[];
}
