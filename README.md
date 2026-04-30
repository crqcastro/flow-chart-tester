# Flowchart — Testador Visual de APIs

> Uma SPA front-end para testar APIs de forma visual: importe um Swagger, monte um fluxo de chamadas com blocos arrastáveis, encadeie respostas e execute para validar automaticamente.

---

## Funcionalidades

| Feature | Descrição |
|---|---|
| Importação de Swagger | OpenAPI 2.0 e 3.0 via URL ou upload de arquivo (.json / .yaml) |
| Canvas interativo | Blocos arrastáveis com cor por método HTTP, zoom, minimap |
| Painel de propriedades | Edite payload, headers, params e resposta esperada por bloco |
| Encadeamento | Ligue blocos para passar dados entre chamadas (full / mapeamento / sequencial) |
| Execução | Executa o fluxo na ordem correta, com timeout configurável |
| Validação | Compara resposta com JSON esperado ou expressões Regex |
| Feedback visual | Blocos ficam verdes (✓) ou vermelhos (✗) após a execução |
| Salvar/Carregar | Exporta/importa o diagrama inteiro como `.xml` |
| Sem backend | Aplicação 100% client-side |

---

## Instalação

```bash
# Requisitos: Node.js 18+

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

Acesse `http://localhost:5173` no navegador.

---

## Como Usar

### 1. Importar Swagger

Clique em **Importar Swagger** na barra superior ou na sidebar:

- **Via URL**: cole o link do arquivo Swagger/OpenAPI (ex: `https://petstore.swagger.io/v2/swagger.json`)
- **Via arquivo**: arraste ou selecione um arquivo `.json` ou `.yaml` do seu computador

As rotas aparecerão agrupadas por **tag** na sidebar esquerda.

### 2. Montar o Fluxo

- **Arraste** uma rota da sidebar para o canvas
- **Clique** em um bloco para abrir o painel lateral e editar:
  - **Requisição**: URL base, parâmetros de path/query, body JSON
  - **Headers**: cabeçalhos HTTP chave-valor (com checkbox para habilitar/desabilitar)
  - **Esperado**: resposta esperada em JSON ou Regex
- Use **Ctrl+Scroll** para dar zoom, arraste o fundo para navegar

### 3. Encadear Chamadas

- **Conecte** dois blocos arrastando da alça direita (saída) para a alça esquerda (entrada) de outro
- **Dê duplo clique** na aresta para configurar o fluxo de dados:
  - **Apenas sequencial**: garante a ordem, sem transferência de dados
  - **Resposta completa**: o JSON inteiro da resposta anterior vira o body da próxima
  - **Mapear campos**: selecione campos específicos via [JSONPath](https://goessner.net/articles/JsonPath/) e defina onde injetá-los (body, header, query ou path)

### 4. Executar

- Clique em **▶ Executar** na barra superior
- Blocos pulsam em azul durante a execução
- Ao finalizar:
  - **Verde** = resposta válida (passou na validação)
  - **Vermelho** = resposta inválida ou erro de rede
- Clique no bloco e abra a aba **Resultado** para ver request, response e detalhes da validação

### 5. Validação

**Modo JSON** (padrão): cole o JSON esperado — os campos são comparados por igualdade profunda.

**Modo Regex**: uma expressão por linha — cada regex é testada contra o corpo da resposta.

Exemplos de regex:
```
^\{"id":\d+\}
"status":"(ok|success)"
"name":"\w+"
```

### 6. Salvar e Carregar

- **Exportar XML**: baixa o diagrama completo (incluindo o Swagger original)
- **Importar XML**: restaura um diagrama salvo, incluindo rotas e configurações

> O Swagger original é embutido no XML em base64, então o diagrama é totalmente autossuficiente.

---

## Nota sobre CORS

Como é uma aplicação puramente front-end, requisições para APIs em outros domínios podem ser bloqueadas pelo browser.

### Soluções:

**1. Durante desenvolvimento** — configure `server.proxy` no `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': { target: 'https://sua-api.com', changeOrigin: true }
  }
}
```

**2. Em produção** — configure uma URL de Proxy CORS:

1. Clique no ícone de engrenagem ⚙️ na barra superior
2. Informe a URL de um proxy CORS (ex: instância própria do [cors-anywhere](https://github.com/Rob--W/cors-anywhere))

**3. Extensão de navegador** (apenas para testes locais):

Instale uma extensão como "CORS Unblock" ou "Allow CORS" no Chrome/Firefox.

---

## Formato do Arquivo XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<diagram version="1.0">
  <meta name="Meu Fluxo" createdAt="2024-01-01T00:00:00Z" updatedAt="2024-01-01T00:00:00Z"/>
  <swaggerSource type="url" url="https://...">
    <rawContent><![CDATA[base64-do-swagger]]></rawContent>
  </swaggerSource>
  <nodes>
    <node id="abc123" routeId="get_pet_petId" x="100" y="200">
      <config><![CDATA[{"headers":[],"payloadJson":"","expectedJson":"","expectedMode":"json",...}]]></config>
    </node>
  </nodes>
  <edges>
    <edge id="xyz789" source="abc123" target="def456">
      <data><![CDATA[{"strategy":"map-fields","fieldMappings":[...]}]]></data>
    </edge>
  </edges>
</diagram>
```

---

## Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Esc` | Desselecionar nó/aresta |
| `Delete` / `Backspace` | Remover nó ou aresta selecionado |
| `Ctrl + Scroll` | Zoom no canvas |
| `Enter` (nos inputs) | Confirmar ação |

---

## Stack Técnica

| Biblioteca | Versão | Uso |
|---|---|---|
| React + Vite | 18 / 8 | Framework e bundler |
| TypeScript | 5 | Tipagem estática |
| @xyflow/react | 12 | Canvas interativo |
| Zustand | 4 | Gerenciamento de estado |
| Tailwind CSS | 3 | Estilização |
| js-yaml | 4 | Parse de Swagger YAML |
| @uiw/react-codemirror | 4 | Editor JSON inline |
| fast-xml-parser | 4 | Serialização/deserialização XML |
| jsonpath-plus | 10 | Mapeamento de campos via JSONPath |

---

## Desenvolvimento

```bash
# Rodar em modo dev
npm run dev

# Checar tipos TypeScript
npm run build

# Lint
npm run lint
```

---

*Desenvolvido por [Cesar Castro](https://github.com/crqcastro)*
