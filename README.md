# Flowchart — Testador Visual de APIs

> Teste suas APIs de forma visual: importe um Swagger, monte um fluxo de chamadas com blocos arrastáveis e execute para validar as respostas.

## Funcionalidades

- **Importação de Swagger**: suporte a OpenAPI 2.0 e 3.0 via URL ou upload de arquivo (.json / .yaml)
- **Canvas interativo**: cada rota vira um bloco arrastável com cor por método HTTP
- **Painel de propriedades**: edite payload, headers e resposta esperada por bloco
- **Encadeamento de chamadas**: ligue blocos para passar dados de uma resposta para a próxima requisição (resposta completa, mapeamento de campos ou apenas sequencial)
- **Validação de respostas**: defina a resposta esperada em JSON ou Regex; blocos ficam **verdes** se válido, **vermelhos** se inválido
- **Salvar/Carregar**: exporte o diagrama inteiro como `.xml` e recarregue quando quiser

## Instalação e Execução

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

## Como Usar

### 1. Importar Swagger

Clique em **Importar Swagger** na barra lateral e:
- Cole a **URL** do arquivo Swagger/OpenAPI, ou
- Faça **upload** do arquivo `.json` ou `.yaml` do seu computador

### 2. Montar o Fluxo

- As rotas aparecem agrupadas por **tag** na sidebar esquerda
- **Arraste** uma rota para o canvas para adicioná-la ao diagrama
- Clique em um bloco para abrir o **painel de propriedades** e editar:
  - **Requisição**: payload JSON e parâmetros de path/query
  - **Headers**: cabeçalhos HTTP chave-valor
  - **Resposta Esperada**: JSON exato ou padrões Regex (um por linha)

### 3. Encadear Chamadas

- **Conecte** dois blocos arrastando da alça de saída de um para a entrada de outro
- **Duplo clique** na aresta para configurar como os dados fluem:
  - **Resposta completa**: usa o JSON inteiro da resposta anterior como body
  - **Mapear campos**: define quais campos da resposta vão para onde na próxima requisição (via JSONPath)
  - **Apenas sequencial**: sem transferência de dados, só garante a ordem de execução

### 4. Executar

- Clique em **▶ Executar** na barra superior
- Os blocos pulsam enquanto estão sendo executados
- Ao finalizar: **verde** = resposta válida, **vermelho** = resposta inválida ou erro

### 5. Salvar e Carregar

- Clique em **Exportar XML** para baixar o diagrama atual
- Clique em **Importar XML** para restaurar um diagrama salvo anteriormente

## Nota sobre CORS

Como é uma aplicação puramente front-end, requisições para APIs em outros domínios podem ser bloqueadas pelo navegador (política CORS).

**Soluções:**
1. **Ambiente de desenvolvimento**: configure `server.proxy` no `vite.config.ts` para redirecionar chamadas
2. **Produção**: insira a URL de um proxy CORS (ex: instância própria do [cors-anywhere](https://github.com/Rob--W/cors-anywhere)) nas configurações da aplicação
3. **Extensão de navegador**: instale uma extensão que desabilita CORS (ex: "CORS Unblock") — indicado apenas para testes locais

## Formato do Arquivo XML

O arquivo exportado segue o seguinte esquema:

```xml
<diagram version="1.0">
  <meta name="Meu Fluxo" createdAt="..." updatedAt="..." />
  <swaggerSource type="url" url="..." />
  <nodes>
    <node id="..." routeId="..." x="..." y="...">
      <config><![CDATA[{ ... }]]></config>
    </node>
  </nodes>
  <edges>
    <edge id="..." source="..." target="...">
      <data><![CDATA[{ ... }]]></data>
    </edge>
  </edges>
</diagram>
```

## Stack Técnica

| Biblioteca | Uso |
|---|---|
| React 18 + Vite | Framework e bundler |
| @xyflow/react | Canvas interativo (nós e arestas) |
| Zustand | Gerenciamento de estado |
| Tailwind CSS | Estilização |
| js-yaml | Parse de Swagger YAML |
| @uiw/react-codemirror | Editor JSON inline |
| fast-xml-parser | Serialização/deserialização XML |
| jsonpath-plus | Mapeamento de campos via JSONPath |

---

*Desenvolvido por Cesar Castro*
