> Documento recebido do responsável em 2026-11-11 e salvo sem alterações de conteúdo.
> Auditoria e plano: [AUDITORIA_LANDING_BUILDER](AUDITORIA_LANDING_BUILDER.md) · [PLANO_IMPLEMENTACAO_LANDING](PLANO_IMPLEMENTACAO_LANDING.md)

# PRD TÉCNICO — LANDING PAGE BUILDER
## Construtor Visual de Landing Pages por Blocos

**Versão:** 1.0  
**Status:** Especificação técnica para auditoria e desenvolvimento por etapas  
**Ambiente:** Google Antigravity + Claude Code  
**Produto:** Sistema individual de vendas para pequenas empresas

---

# 1. PAPEL DO DESENVOLVEDOR

Atue como Arquiteto de Software, Desenvolvedor Full Stack Sênior, Engenheiro de Software, Especialista em UX/UI Design e Especialista em React, TypeScript, Vite, Tailwind CSS e Supabase.

Você será responsável pelo planejamento técnico e desenvolvimento do módulo **Landing Page Builder**, que fará parte de um sistema web de vendas já existente.

Trabalhe com arquitetura escalável, código modular, desempenho otimizado, segurança e excelente experiência de usuário.

**IMPORTANTE: não desenvolva um sistema novo e isolado. O Landing Page Builder será um módulo integrado ao projeto existente.**

Antes de qualquer implementação, analise a estrutura atual do repositório e identifique os recursos que poderão ser reutilizados.

---

# 2. CONTEXTO DO PROJETO

Estamos desenvolvendo um sistema web individual para pequenas empresas.

O sistema terá:

1. Dashboard administrativa.
2. Cadastro de clientes e contatos.
3. CRM com funil de vendas Kanban.
4. Gerenciamento do site institucional/Home.
5. Construtor de landing pages.
6. Formulários de captação.
7. Relatórios comerciais.

O projeto possui uma landing page inicial já desenvolvida.

A dashboard e os demais módulos poderão estar concluídos, em desenvolvimento ou planejados. Verifique a situação real de cada um no repositório.

Não presuma que funcionalidades foram implementadas sem verificar o código e os testes.

## Modelo de comercialização

O sistema não será um SaaS multiempresa.

Cada empresa contratante terá uma instalação independente, incluindo:

- Projeto web próprio.
- Banco Supabase exclusivo.
- Autenticação própria.
- Domínio próprio.
- Configurações individuais.
- Landing pages próprias.
- Contatos e leads próprios.
- CRM próprio.

O projeto deverá permitir a criação de múltiplas landing pages dentro da instalação de uma única empresa.

Não implementar cobrança por assinatura, planos SaaS, administração multiempresa ou sistema multi-tenant.

---

# 3. STACK TECNOLÓGICA

## Obrigatória

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Edge Functions quando necessário.

## Hospedagem

Hostinger, preferencialmente em plano de hospedagem web compartilhada.

Build obrigatório:

`npm run build`

Saída de produção:

`dist/`

O frontend deverá funcionar como aplicação compilada, sem depender de um servidor Node.js permanente.

## Bibliotecas candidatas

Avaliar a necessidade de:

- dnd-kit: drag-and-drop.
- Zustand: estado complexo do editor.
- TanStack Query: consultas e cache.
- React Hook Form: formulários administrativos.
- Zod: validação.
- Lucide React: ícones.
- Sonner ou alternativa: notificações.
- Vitest: testes unitários.
- Testing Library: testes de componentes.
- Playwright: testes ponta a ponta.

Não instalar bibliotecas sem verificar compatibilidade com as versões existentes.

Não duplicar bibliotecas que já desempenham a mesma função no projeto.

---

# 4. OBJETIVO DO LANDING PAGE BUILDER

Criar um construtor visual que permita ao empreendedor desenvolver landing pages profissionais sem escrever código.

O editor será baseado em **blocos e seções**, não em posicionamento absolutamente livre.

O usuário poderá selecionar um template ou começar com uma página em branco, adicionar componentes, personalizar propriedades, salvar e publicar.

## Requisitos principais

- Facilidade de utilização.
- Interface visual intuitiva.
- Drag-and-drop.
- Componentes reutilizáveis.
- Personalização visual.
- Templates prontos.
- Edição responsiva.
- Formulários integrados ao CRM.
- Salvamento de rascunhos.
- Versionamento.
- Publicação.
- SEO.
- Alta performance.
- Segurança.

## Referências conceituais

21st.dev — https://21st.dev/

MotionSites AI — https://motionsites.ai/

Canva — facilidade de edição e organização visual.

Esses sites deverão servir somente como referências de experiência, acabamento visual, organização de componentes e animações.

**Não integrar APIs, serviços, componentes ou plugins dessas plataformas.**

Não copiar templates, imagens, códigos proprietários ou identidades visuais.

Criar uma biblioteca própria de componentes.

---

# 5. ESTRUTURA DO MÓDULO NA DASHBOARD

Adicionar ao menu lateral existente a seção:

**Landing Pages**

Subáreas:

- Minhas páginas.
- Nova landing page.
- Modelos.
- Biblioteca de mídia, caso ainda não exista no sistema.

Evitar criar menus redundantes.

Preservar o sistema de autenticação e permissões existente.

## Rotas sugeridas

As rotas administrativas poderão seguir a convenção atual do projeto:

- `/admin/landing-pages`
- `/admin/landing-pages/new`
- `/admin/landing-pages/:id/edit`
- `/admin/landing-pages/:id/preview`

Rotas públicas sugeridas:

- `/lp/:slug`

As rotas são propostas e deverão ser validadas contra as rotas atuais da aplicação.

Não permitir colisões com a Home, páginas institucionais ou rotas administrativas.

---

# 6. TELA 01 — GERENCIAMENTO DE LANDING PAGES

## Objetivo

Permitir ao administrador visualizar e gerenciar todas as páginas.

## Layout

### Cabeçalho

Título: Minhas Landing Pages

Subtítulo: Crie, personalize e acompanhe suas páginas de vendas.

Botão principal:

**+ Criar Landing Page**

### Indicadores

- Total de landing pages.
- Páginas publicadas.
- Páginas em rascunho.
- Leads captados.
- Conversão do período, quando houver rastreamento confiável.

### Ferramentas

- Pesquisa por nome.
- Filtro por status.
- Ordenação por data.
- Filtro por categoria, quando aplicável.
- Alternância entre cards e lista.

### Cards

Cada landing page deverá apresentar:

- Miniatura da página, quando disponível.
- Nome.
- Slug.
- Status.
- Data da última edição.
- Número de leads.
- Visitas, quando rastreadas.
- Botão Editar.
- Menu de ações.

### Ações

- Editar.
- Pré-visualizar.
- Duplicar.
- Publicar.
- Despublicar.
- Abrir URL pública.
- Arquivar.
- Excluir com confirmação.

## Regras

As exclusões não poderão remover automaticamente leads captados.

Manter vínculo histórico entre leads e páginas sempre que necessário.

Uma página arquivada deverá continuar identificável nos relatórios.

Não permitir reutilização acidental de URLs já ocupadas.

---

# 7. TELA 02 — CRIAÇÃO DE NOVA LANDING PAGE

Ao clicar em Criar Landing Page, abrir uma tela com duas opções:

**Opção A — Começar do zero**

Criar uma página com estrutura inicial simples.

**Opção B — Escolher um modelo**

Exibir uma biblioteca de templates originais.

## Categorias iniciais

- Serviços profissionais.
- Clínicas e consultórios.
- Comércio local.
- Produtos.
- Ofertas e promoções.
- Agendamento.
- Captura de leads.
- Eventos.

Cada template deverá possuir:

- Nome.
- Miniatura.
- Categoria.
- Descrição.
- Prévia.
- Botão Usar modelo.

Ao selecionar um template, criar uma cópia editável da estrutura.

Não modificar o modelo original.

---

# 8. TELA 03 — EDITOR VISUAL

Esta será a interface principal do módulo.

Organizar o editor em cinco regiões.

## 8.1 Barra superior

Elementos:

- Voltar para Minhas Landing Pages.
- Nome da landing page.
- Indicador de alterações não salvas.
- Estado do salvamento.
- Desfazer.
- Refazer.
- Desktop.
- Tablet.
- Mobile.
- Pré-visualizar.
- Salvar.
- Publicar.

O botão Publicar deverá abrir uma confirmação e executar validações antes da publicação.

## 8.2 Painel esquerdo — Componentes

Criar uma biblioteca de blocos organizada por categorias.

Recursos:

- Busca.
- Categorias.
- Miniaturas.
- Nome do componente.
- Ação de adicionar.
- Drag-and-drop.

O usuário poderá clicar em um componente para adicioná-lo ou arrastá-lo para uma posição válida no canvas.

## 8.3 Área central — Canvas

O canvas exibirá a landing page em construção.

Funcionalidades:

- Adicionar seção.
- Selecionar bloco.
- Arrastar e reordenar.
- Duplicar.
- Excluir.
- Inserir antes.
- Inserir depois.
- Reorganizar elementos dentro dos contêineres permitidos.
- Visualizar conteúdo real.
- Identificar componente selecionado.
- Mostrar indicadores de posição.
- Exibir estado vazio.

O canvas deverá ser responsivo e oferecer largura de pré-visualização compatível com o dispositivo selecionado.

Não permitir posicionamento arbitrário que comprometa a responsividade.

## 8.4 Painel direito — Propriedades

Exibir as propriedades do bloco selecionado.

Criar abas:

### Conteúdo
- Texto.
- Título.
- Subtítulo.
- Imagem.
- Ícone.
- Links.
- Rótulos de botões.
- Dados de formulários.

### Estilo
- Cor.
- Background.
- Tipografia.
- Tamanho.
- Peso.
- Alinhamento.
- Largura.
- Altura.
- Padding.
- Margin.
- Bordas.
- Arredondamento.
- Sombras.

### Responsividade
- Configurações desktop.
- Configurações tablet.
- Configurações mobile.
- Visibilidade por dispositivo.
- Ajustes permitidos de espaçamento e alinhamento.

### Animações
- Tipo.
- Duração.
- Atraso.
- Intensidade.
- Ativação.
- Desabilitar animação.

## 8.5 Navegador de camadas

Criar uma árvore dos elementos.

Exemplo:

Página
- Header
- Hero
  - Título
  - Texto
  - Botão
  - Imagem
- Benefícios
  - Card 01
  - Card 02
  - Card 03
- Formulário
- Rodapé

Permitir selecionar e reordenar elementos de acordo com as regras da estrutura.

O navegador deverá mostrar o elemento atualmente selecionado.

---

# 9. BIBLIOTECA DE COMPONENTES

Criar uma biblioteca original de blocos.

## Categoria 01 — Estrutura

- Seção.
- Container.
- Grid.
- Colunas.
- Espaçador.
- Divisor.

## Categoria 02 — Texto

- Título.
- Subtítulo.
- Parágrafo.
- Lista.
- Texto de destaque.

## Categoria 03 — Mídia

- Imagem.
- Galeria.
- Vídeo incorporado.
- Ícone.

## Categoria 04 — Conversão

- Botão CTA.
- Botão WhatsApp.
- Formulário.
- Card de oferta.
- Lista de benefícios.

## Categoria 05 — Seções completas

- Header.
- Hero.
- Sobre a empresa.
- Serviços.
- Benefícios.
- Produtos.
- Depoimentos.
- FAQ.
- Preços.
- CTA final.
- Rodapé.

## Regras técnicas

Cada componente deverá possuir:

1. ID estável.
2. Tipo.
3. Versão do esquema.
4. Propriedades validadas.
5. Valores padrão.
6. Renderizador.
7. Definições de propriedades editáveis.
8. Regras de responsividade.
9. Restrições de elementos filhos.
10. Miniatura ou representação visual.

Os blocos deverão ser criados de maneira reutilizável.

Componentes visuais da landing page não poderão depender da dashboard para funcionar.

---

# 10. SISTEMA DE DRAG-AND-DROP

Implementar arrastar e soltar com uma biblioteca apropriada para React.

Avaliar dnd-kit.

## Funcionalidades

- Arrastar da biblioteca para o canvas.
- Reordenar seções.
- Reordenar elementos permitidos.
- Indicar a posição de inserção.
- Cancelar movimentação.
- Preservar a seleção.
- Permitir movimentação por teclado quando viável.
- Salvar a nova ordem.
- Desfazer movimentação.

## Restrições

Não permitir estruturas inválidas.

Exemplos:

- Um formulário não poderá ser inserido dentro de um botão.
- Uma seção não poderá ser inserida dentro dela mesma.
- Componentes filhos deverão respeitar os contêineres permitidos.

A movimentação deve alterar a estrutura de dados da página, não apenas a aparência visual.

---

# 11. SISTEMA DE EDIÇÃO VISUAL

O usuário deverá editar visualmente os componentes.

## Tipografia

- Família de fonte.
- Tamanho.
- Peso.
- Alinhamento.
- Altura de linha.
- Espaçamento entre letras.
- Cor.

## Cores

- Cores sólidas.
- Paleta da marca.
- Cores personalizadas.
- Gradientes permitidos.

## Background

- Cor.
- Gradiente.
- Imagem.
- Ajuste de posição.
- Overlay.

## Espaçamentos

- Padding.
- Margin.
- Gap.
- Largura máxima.

## Botões

- Texto.
- Link.
- Cor.
- Tamanho.
- Bordas.
- Arredondamento.
- Alinhamento.
- Estilo de hover.

## Links

Suportar ações configuradas:

- URL externa.
- URL interna.
- Âncora.
- WhatsApp.
- Telefone.
- E-mail.

Validar e normalizar URLs.

Bloquear protocolos perigosos, incluindo `javascript:`.

---

# 12. DESIGN RESPONSIVO

O construtor deverá priorizar responsividade.

Criar três modos:

**Desktop:** largura de referência de 1440 px.

**Tablet:** largura de referência de 768 px.

**Mobile:** largura de referência de 375 px.

Essas larguras serão utilizadas para pré-visualização, não como limites fixos de layout.

## Regras

- Layout fluido.
- Componentes adaptáveis.
- Imagens responsivas.
- Tipografia escalável.
- Colunas que se reorganizam.
- Botões acessíveis em telas pequenas.
- Formulários adaptáveis.

Permitir ajustes específicos por breakpoint quando necessário.

Os ajustes mobile não deverão sobrescrever indiscriminadamente os estilos desktop.

---

# 13. SISTEMA DE TEMPLATES

Desenvolver templates próprios, compostos pela biblioteca interna.

## Templates iniciais

1. Landing page de serviços.
2. Landing page de clínica.
3. Landing page de comércio local.
4. Landing page promocional.
5. Landing page de agendamento.
6. Landing page de produto.
7. Landing page de captura de leads.

Cada template deverá ser editável.

## Personalização

O administrador poderá trocar:

- Logo.
- Textos.
- Imagens.
- Vídeos.
- Cores.
- Fontes.
- Botões.
- Formulários.
- Ordem de seções.

Os templates deverão herdar os padrões da identidade visual da empresa quando aplicável.

---

# 14. KIT DE IDENTIDADE VISUAL

Criar uma estrutura para reutilizar a identidade visual do cliente.

Dados:

- Nome da empresa.
- Logotipo.
- Favicon.
- Cor primária.
- Cor secundária.
- Cores auxiliares.
- Fonte de títulos.
- Fonte de textos.
- WhatsApp.
- Telefone.
- E-mail.
- Redes sociais.

## Regras

Ao criar uma landing page, o usuário poderá aplicar as configurações da marca.

Componentes poderão herdar os tokens globais.

Alterações globais deverão respeitar opções de sobrescrita local.

Não modificar inesperadamente páginas já publicadas.

---

# 15. BIBLIOTECA DE MÍDIA

Criar um gerenciador de arquivos usando Supabase Storage.

## Funcionalidades

- Upload.
- Listagem.
- Busca.
- Pré-visualização.
- Seleção.
- Exclusão segura.
- Reutilização de mídia.

## Formatos

Priorizar imagens:

- WebP.
- AVIF, quando suportado pela solução.
- JPEG.
- PNG.
- SVG somente com sanitização e política de segurança adequadas.

Para vídeos, priorizar incorporação segura e otimizada.

## Segurança

Validar:

- Tipo real do arquivo.
- Tamanho máximo.
- Permissões de upload.
- Nome e caminho.
- Conteúdo potencialmente perigoso.

Definir buckets públicos para mídias publicadas e privados para materiais administrativos, conforme a finalidade.

Não permitir exclusão de arquivos ainda utilizados sem confirmação e análise de dependências.

---

# 16. SISTEMA DE FORMULÁRIOS

Cada landing page poderá conter um ou mais formulários.

## Campos disponíveis

- Nome.
- E-mail.
- Telefone.
- WhatsApp.
- Campo de texto.
- Campo numérico.
- Campo de seleção.
- Checkbox.
- Campo de consentimento.

## Configuração

Permitir:

- Criar formulário.
- Definir campos.
- Definir obrigatoriedade.
- Editar rótulos.
- Configurar mensagem de sucesso.
- Configurar redirecionamento.
- Selecionar funil de destino.
- Selecionar etapa inicial.
- Ativar proteção antispam.

## Integração CRM

Fluxo obrigatório:

1. Visitante acessa a landing page.
2. Preenche formulário.
3. Envia os dados.
4. Backend valida a submissão.
5. Sistema registra a origem.
6. Sistema localiza ou cria contato.
7. Sistema cria oportunidade quando configurado.
8. Oportunidade entra na etapa selecionada.
9. Administrador visualiza o lead no CRM.

## Dados de origem

Registrar quando disponíveis:

- ID da página.
- ID do formulário.
- Data do envio.
- URL de origem.
- UTM Source.
- UTM Medium.
- UTM Campaign.
- UTM Content.
- UTM Term.

Não confiar em valores enviados pelo navegador para determinar permissões ou recursos de destino.

O servidor deverá validar os vínculos entre formulário, página e funil.

## Segurança

Utilizar Supabase Edge Function ou backend equivalente para o processamento público.

Implementar:

- Validação server-side.
- Rate limiting.
- Proteção antispam.
- Tratamento de duplicidade.
- Idempotência.
- Respostas seguras.
- Logs sem exposição de dados sensíveis.

Não permitir acesso público irrestrito às tabelas de leads.

---

# 17. SALVAMENTO E VERSIONAMENTO

Implementar sistema de rascunho e publicação.

## Estados

- Rascunho.
- Publicada.
- Arquivada.

Uma página publicada poderá possuir alterações ainda não publicadas.

## Autosave

Implementar salvamento automático com debounce.

O sistema deverá indicar:

- Salvando.
- Salvo.
- Alterações não salvas.
- Erro ao salvar.

Evitar sobrescrever mudanças concorrentes.

Utilizar controle de versão ou revisão otimista.

## Histórico

Guardar versões relevantes das páginas.

Permitir:

- Consultar versões.
- Visualizar data.
- Identificar responsável.
- Restaurar versão anterior, quando implementado.

Uma restauração deverá gerar uma nova revisão, preservando o histórico.

---

# 18. PRÉ-VISUALIZAÇÃO

Criar modo Preview.

Características:

- Sem painéis administrativos.
- Visualização desktop e mobile.
- Conteúdo idêntico ao renderizador público.
- Formulários protegidos contra envio real durante a prévia, salvo teste explicitamente configurado.
- Animações conforme configurações.
- Links identificados ou protegidos durante edição.

Rascunhos não poderão ficar publicamente acessíveis.

A pré-visualização administrativa deverá exigir autorização.

---

# 19. PUBLICAÇÃO DE LANDING PAGES

Este é um requisito arquitetural crítico.

O frontend será hospedado na Hostinger, utilizando arquivos compilados pelo Vite.

O Supabase armazenará os documentos de página e as versões publicadas.

## Requisitos

- URL amigável.
- Publicação mediante confirmação.
- Despublicação.
- Rascunhos separados das versões públicas.
- Versões imutáveis ou snapshots publicados.
- Prevenção de colisão de slugs.
- SEO.
- Performance.
- Segurança.
- Compatibilidade com hospedagem compartilhada.

## Estratégias a avaliar

### Estratégia A — Renderização pública baseada em JSON

A aplicação identifica o slug da página e carrega sua versão publicada no Supabase.

Vantagens:

- Publicação sem novo deploy.
- Arquitetura simples.
- Compatível com Vite estático.

Limitação:

O HTML inicial pode não conter todo o conteúdo e as metatags específicas da landing page, prejudicando compartilhamento e SEO em determinados robôs.

### Estratégia B — Geração estática automatizada

Ao publicar, um serviço autorizado dispara um processo que gera HTML e assets e realiza deploy automatizado.

Vantagens:

- HTML pronto por página.
- Melhor controle de metatags.
- Boa compatibilidade com SEO e compartilhamento.

Desvantagens:

- Pipeline mais complexo.
- Necessidade de automação e credenciais seguras.
- Gestão de falhas e implantação.

### Estratégia C — Híbrida

Editor e dados operando no Supabase, com entrega pública otimizada por geração estática ou outra solução validada.

## Diretriz arquitetural

Antes de implementar o mecanismo de publicação, elaborar uma decisão técnica documentada.

Não afirmar que JSON armazenado no Supabase equivale automaticamente à publicação de HTML estático.

Não criar soluções que dependam de o navegador escrever diretamente no diretório `public_html`.

Não colocar credenciais de hospedagem, chaves de deploy ou tokens administrativos no frontend.

A publicação deverá ter confirmação de sucesso, tratamento de falhas e possibilidade de manter a versão anterior quando um deploy falhar.

---

# 20. SEO DAS LANDING PAGES

Criar configurações individuais por página.

## Campos

- Slug.
- Meta title.
- Meta description.
- Canonical URL.
- Imagem Open Graph.
- Status de indexação.
- Idioma.
- Título principal H1.

## Requisitos

- HTML semântico.
- Hierarquia de títulos.
- Alt text.
- Links rastreáveis.
- Metadados por página.
- Sitemap compatível com a estratégia de publicação.
- Exclusão de rascunhos da indexação.
- Conteúdo público renderizável por mecanismos de busca.

Validar a estratégia real de SEO de acordo com o modelo de publicação escolhido.

---

# 21. ANIMAÇÕES

Criar um sistema simples de animações configuráveis.

## Presets iniciais

- Nenhuma.
- Fade in.
- Slide up.
- Slide left.
- Slide right.
- Scale in.

## Configurações

- Duração.
- Delay.
- Distância.
- Ativação por entrada na viewport, quando aplicável.

## Regras

- Priorizar CSS nativo.
- Evitar bibliotecas pesadas.
- Respeitar `prefers-reduced-motion`.
- Não aplicar efeitos que prejudiquem a legibilidade.
- Evitar mudanças de layout durante a animação.
- Permitir desativação por bloco.

Animações avançadas poderão ser incorporadas em fases posteriores.

---

# 22. ARQUITETURA DE DADOS DO EDITOR

As landing pages deverão ser armazenadas como documentos JSON tipados e versionados.

## Estrutura conceitual

```json
{
  "schemaVersion": 1,
  "pageId": "uuid",
  "settings": {
    "title": "Minha Landing Page",
    "theme": {},
    "seo": {}
  },
  "blocks": [
    {
      "id": "block-001",
      "type": "hero",
      "version": 1,
      "props": {
        "title": "Transforme seu negócio",
        "subtitle": "Apresente seus serviços"
      },
      "styles": {},
      "responsive": {},
      "animation": {
        "type": "none"
      },
      "children": []
    }
  ]
}
```

Exemplo apenas conceitual.

Definir o esquema exato após auditoria da estrutura existente.

## Regras

- IDs únicos por bloco.
- Tipos conhecidos.
- Schema versionado.
- Validação com Zod ou equivalente.
- Valores padrão.
- Migração entre versões.
- Limite de profundidade.
- Limite de quantidade de blocos.
- Renderização por registro interno.
- Tratamento de componentes desconhecidos.

Não armazenar componentes executáveis nem JavaScript arbitrário.

Não permitir importação irrestrita de HTML com scripts.

---

# 23. ARQUITETURA DOS COMPONENTES

Criar um registro tipado de componentes.

Cada tipo deverá apontar para:

- Componente de renderização.
- Esquema de propriedades.
- Configuração do painel de edição.
- Valores padrão.
- Regras de filhos.
- Representação visual na biblioteca.

Separar:

1. Definição do bloco.
2. Renderizador.
3. Controles do editor.
4. Dados da página.
5. Estilos e tokens.

## Requisito importante do Tailwind

Não gerar classes Tailwind arbitrárias a partir de strings dinâmicas armazenadas no banco.

As classes necessárias deverão ser reconhecidas durante o build.

Utilizar tokens, variantes predefinidas e variáveis CSS validadas para propriedades dinâmicas.

Validar valores antes de aplicá-los aos estilos.

O editor poderá trabalhar com propriedades dinâmicas, mas o bundle de produção não deverá depender de classes que não foram compiladas.

---

# 24. INTEGRAÇÃO COM SUPABASE

Aproveitar a estrutura do Supabase já existente no projeto.

Antes de criar tabelas, verificar as tabelas atuais.

Evitar tabelas duplicadas com responsabilidades semelhantes.

## Modelo de dados sugerido

### landing_pages

- id.
- name.
- slug.
- status.
- draft_revision.
- published_version_id.
- created_by.
- created_at.
- updated_at.
- published_at.

### landing_page_versions

- id.
- page_id.
- revision.
- schema_version.
- content_json.
- created_by.
- created_at.

### landing_page_templates

- id.
- name.
- category.
- description.
- content_json.
- thumbnail_path.
- is_active.

### landing_page_media

- id.
- storage_path.
- media_type.
- metadata.
- created_by.
- created_at.

### landing_page_forms

- id.
- page_id.
- form_definition.
- pipeline_id.
- initial_stage_id.
- success_settings.
- is_active.

### landing_page_submissions

- id.
- form_id.
- page_id.
- contact_id.
- submitted_at.
- source_data.
- idempotency_key.
- status.

### landing_page_events

- id.
- page_id.
- event_type.
- occurred_at.
- event_metadata.

Os nomes e campos são sugestões.

Reutilizar contatos, funis, oportunidades e configurações já existentes.

Não criar CRM paralelo dentro do Landing Page Builder.

## Banco de dados

Aplicar:

- Chaves estrangeiras.
- Constraints.
- Índices.
- Unicidade de slug.
- Timestamps.
- RLS.
- Políticas por função.
- Migrações versionadas.
- Integridade referencial.

## Publicação

A página pública deverá acessar apenas os dados da versão publicada.

Rascunhos, histórico administrativo e configurações privadas não poderão ser lidos anonimamente.

O administrador deverá utilizar permissões autenticadas.

Não criar políticas RLS excessivamente permissivas.

---

# 25. SEGURANÇA E LGPD

Implementar:

- Autenticação administrativa.
- Autorização por perfil.
- RLS.
- Validação de URLs.
- Sanitização de conteúdos quando necessário.
- Proteção contra XSS.
- Proteção de uploads.
- Restrição de acesso ao Storage.
- Segurança dos formulários.
- Rate limiting.
- Logs administrativos.
- Tratamento de dados pessoais.
- Retenção e exclusão de dados conforme política definida.

Não expor `service_role`, tokens secretos ou credenciais no bundle compilado.

Não utilizar `dangerouslySetInnerHTML` com conteúdo não confiável.

Se houver necessidade legítima de HTML enriquecido, utilizar uma estratégia controlada de sanitização e renderização.

---

# 26. PERFORMANCE

O construtor deverá manter o projeto leve.

## Diretrizes

- Lazy loading do editor.
- Separação entre editor e renderizador público.
- Code splitting.
- Carregamento sob demanda de blocos.
- Otimização de imagens.
- Dimensões para evitar layout shift.
- Cache apropriado.
- Debounce no autosave.
- Virtualização apenas quando necessária.
- Evitar requisições desnecessárias.

O visitante de uma landing page não deverá carregar bibliotecas de drag-and-drop, painéis de propriedades ou outras dependências exclusivamente administrativas.

## Indicadores de qualidade

Avaliar:

- Largest Contentful Paint.
- Interaction to Next Paint.
- Cumulative Layout Shift.
- Tamanho do JavaScript público.
- Requisições.
- Tempo de carregamento mobile.

Definir metas mensuráveis e registrar os resultados nos testes.

---

# 27. ESTRUTURA DE PASTAS

Após analisar o projeto, propor uma organização modular.

Sugestão:

```text
src/
  modules/
    landing-builder/
      components/
      blocks/
      editor/
      canvas/
      panels/
      templates/
      renderers/
      hooks/
      schemas/
      services/
      stores/
      types/
      utils/
      tests/

  pages/
    admin/
    public/

  lib/
    supabase/

supabase/
  migrations/
  functions/

docs/
```

Exemplo de organização dos blocos:

```text
landing-builder/
  blocks/
    hero/
    text/
    image/
    button/
    form/
    services/
    testimonials/
    faq/
    footer/
```

Não reorganizar toda a aplicação sem necessidade.

Preservar padrões existentes que estejam tecnicamente corretos.

---

# 28. TESTES OBRIGATÓRIOS

## Testes unitários

- Validação de documento.
- Migração de versões.
- Inserção de blocos.
- Duplicação.
- Exclusão.
- Reordenação.
- Histórico de desfazer/refazer.
- Validação de slug.
- Validação de propriedades.

## Testes de integração

- Salvamento no Supabase.
- Recuperação do rascunho.
- Publicação.
- Despublicação.
- Permissões.
- Upload de mídia.
- Envio de formulários.
- Criação de oportunidades no CRM.

## Testes ponta a ponta

Fluxos principais:

1. Login.
2. Abrir Landing Pages.
3. Criar página.
4. Selecionar template.
5. Adicionar bloco.
6. Editar texto.
7. Alterar estilo.
8. Reordenar blocos.
9. Salvar.
10. Reabrir página.
11. Pré-visualizar.
12. Publicar.
13. Acessar URL pública.
14. Enviar formulário.
15. Verificar lead no CRM.

Testar desktop e mobile.

## Regressão

Confirmar que:

- A Home existente continua funcionando.
- A dashboard não foi comprometida.
- O CRM mantém seu comportamento.
- As rotas existentes continuam válidas.
- O build permanece funcional.

---

# 29. DESENVOLVIMENTO POR ETAPAS

Não desenvolver tudo de uma vez.

## ETAPA 0 — Auditoria

Analisar código existente.

Identificar arquitetura, dependências, autenticação, rotas, Supabase e CRM.

Produzir relatório.

Nenhuma alteração funcional.

## ETAPA 1 — Fundação do módulo

Criar:

- Rotas.
- Estrutura modular.
- Gerenciador de páginas.
- Modelos de dados.
- Esquemas de validação.
- Integração inicial Supabase.

## ETAPA 2 — Editor visual básico

Criar:

- Layout do editor.
- Barra superior.
- Biblioteca.
- Canvas.
- Painel de propriedades.
- Seleção de blocos.

## ETAPA 3 — Drag-and-drop

Implementar:

- Inserção.
- Reordenação.
- Duplicação.
- Exclusão.
- Validação estrutural.
- Desfazer/refazer.

## ETAPA 4 — Estilização e responsividade

Implementar:

- Tipografia.
- Cores.
- Espaçamentos.
- Background.
- Botões.
- Layouts.
- Breakpoints.

## ETAPA 5 — Templates

Desenvolver a biblioteca inicial de templates próprios.

## ETAPA 6 — Salvamento e mídia

Implementar:

- Persistência.
- Autosave.
- Histórico.
- Upload.
- Biblioteca de imagens.

## ETAPA 7 — Preview e publicação

Validar arquitetura escolhida e implementar publicação segura.

## ETAPA 8 — Formulários e CRM

Integrar a captação com contatos e oportunidades do sistema.

## ETAPA 9 — SEO, animações e performance

Implementar:

- Configurações SEO.
- Animações leves.
- Otimizações.
- Testes de acessibilidade.

## ETAPA 10 — Homologação Hostinger

Executar:

- Verificação TypeScript.
- Testes.
- Build.
- Validação da pasta dist.
- Teste de rotas.
- Teste de atualização direta em URLs.
- Teste de publicação.
- Teste do Supabase.
- Teste de segurança.

Não publicar em produção sem autorização explícita.

---

# 30. CRITÉRIOS DE ACEITE

O Landing Page Builder será considerado funcional quando:

- O administrador conseguir acessar o módulo.
- Conseguir criar uma página.
- Conseguir selecionar um template.
- Conseguir adicionar blocos.
- Conseguir reordenar blocos.
- Conseguir editar textos e imagens.
- Conseguir configurar estilos.
- Conseguir visualizar desktop e mobile.
- Conseguir salvar no Supabase.
- Conseguir reabrir e continuar editando.
- Conseguir visualizar a página.
- Conseguir publicar.
- Conseguir acessar uma URL pública.
- Conseguir despublicar.
- Conseguir integrar formulários ao CRM.
- Os leads aparecerem corretamente no funil.
- A Home existente continuar funcionando.
- O build de produção funcionar.
- Os recursos administrativos estiverem protegidos.
- As páginas públicas não expuserem dados privados.

Todos esses requisitos deverão ser verificados por testes ou evidências técnicas.

---

# 31. REGRAS OBRIGATÓRIAS PARA O CLAUDE CODE

1. Não modificar recursos existentes sem necessidade.
2. Não criar outro projeto React.
3. Não substituir a autenticação existente sem justificativa.
4. Não criar um CRM paralelo.
5. Não desenvolver arquitetura multi-tenant.
6. Não integrar os sites de referência.
7. Não copiar códigos proprietários.
8. Não instalar dependências sem análise.
9. Não criar dados fictícios em produção.
10. Não expor chaves secretas.
11. Não executar comandos destrutivos.
12. Não alterar produção sem autorização.
13. Não executar migrações destrutivas sem aprovação.
14. Não desenvolver todas as etapas simultaneamente.
15. Não afirmar que uma funcionalidade está concluída sem testá-la.
16. Priorizar simplicidade, segurança e desempenho.
17. Registrar decisões arquiteturais.
18. Manter documentação atualizada.
19. Preservar compatibilidade com Hostinger.
20. Informar riscos e limitações.

---

# 32. DOCUMENTAÇÃO DO PROJETO

Criar ou atualizar, de maneira organizada:

- `docs/PRD_LANDING_PAGE_BUILDER.md`
- `docs/AUDITORIA_LANDING_BUILDER.md`
- `docs/ARQUITETURA_LANDING_BUILDER.md`
- `docs/BANCO_LANDING_BUILDER.md`
- `docs/DESIGN_SYSTEM_LANDING_BUILDER.md`
- `docs/COMPONENTES_LANDING_BUILDER.md`
- `docs/ESTRATEGIA_PUBLICACAO_LANDING.md`
- `docs/PLANO_IMPLEMENTACAO_LANDING.md`

Não duplicar documentação existente sem necessidade.

---

# 33. PRIMEIRA EXECUÇÃO — INSTRUÇÃO FINAL

Sua primeira tarefa será realizar a auditoria do projeto existente e definir o plano de implementação do Landing Page Builder.

**Nesta primeira execução, não implemente funcionalidades.**

Execute:

1. Auditoria da estrutura.
2. Análise da dashboard.
3. Análise das rotas.
4. Análise da autenticação.
5. Análise do Supabase.
6. Análise dos módulos de contatos e CRM.
7. Identificação de componentes reutilizáveis.
8. Planejamento do editor por blocos.
9. Planejamento do banco de dados.
10. Avaliação da estratégia de publicação na Hostinger.
11. Definição do design system.
12. Divisão das etapas em entregas pequenas e verificáveis.

Apresente:

- Diagnóstico técnico.
- Estrutura encontrada.
- Componentes aproveitáveis.
- Riscos identificados.
- Arquitetura recomendada.
- Estratégia de publicação.
- Modelo de dados proposto.
- Plano de desenvolvimento.
- Critérios de aceite da primeira implementação.

Ao terminar, informe os documentos criados e os arquivos analisados.

Não instalar dependências, não alterar o banco e não modificar código funcional nessa etapa.

**Aguarde autorização explícita para iniciar a Etapa 1.**

Nosso objetivo é desenvolver um construtor visual próprio, profissional, intuitivo, independente de plataformas externas, integrado ao CRM e preparado para ser entregue individualmente a pequenas empresas.
