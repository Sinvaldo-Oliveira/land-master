import type { PageDocument, SiteTheme } from '../types'

/**
 * Preset "Horizonte": base clara, seções escuras em azul-noite, acento cobalto.
 * Contrastes verificados em theme.test.ts (texto ≥ 4,5:1).
 */
export const horizonteTheme: SiteTheme = {
  preset: 'horizonte',
  colors: {
    background: '#ffffff',
    foreground: '#0b1324',
    primary: '#2f5bea',
    primaryForeground: '#ffffff',
    accent: '#0891b2',
    accentForeground: '#ffffff',
    muted: '#f3f6fb',
    mutedForeground: '#475569',
    card: '#ffffff',
    border: '#e2e8f0',
    ring: '#2f5bea',
  },
  darkColors: {
    background: '#070d1f',
    foreground: '#f1f5ff',
    primary: '#6d8dff',
    primaryForeground: '#050a18',
    accent: '#22d3ee',
    accentForeground: '#050a18',
    muted: '#0f1a35',
    mutedForeground: '#a6b3cf',
    card: '#0d1730',
    border: '#1e2a4a',
    ring: '#8aa4ff',
  },
  fonts: { heading: 'sora', body: 'plus-jakarta-sans' },
  radius: 'lg',
  motion: 'subtle',
}

const brand = { name: 'Sua Empresa', tagline: 'Soluções sob medida' }

/**
 * Modelo de site institucional (template de sistema).
 * Textos genéricos e editáveis; contatos são marcadores a substituir pelos dados reais da empresa.
 * Não contém números, depoimentos ou clientes fictícios.
 */
export const institucionalTemplate: PageDocument = {
  schemaVersion: 1,
  seo: {
    title: 'Sua Empresa — Soluções sob medida para o seu negócio',
    description:
      'Atendimento próximo, proposta clara e acompanhamento em cada etapa. Conheça nossos serviços e solicite um orçamento.',
  },
  theme: horizonteTheme,
  sections: [
    {
      id: 'header',
      type: 'site-header',
      brand,
      links: [
        { label: 'Início', href: '#inicio' },
        { label: 'Serviços', href: '#servicos' },
        { label: 'Sobre', href: '#sobre' },
        { label: 'Como trabalhamos', href: '#processo' },
        { label: 'Dúvidas', href: '#duvidas' },
      ],
      cta: { label: 'Solicitar orçamento', href: '#contato' },
    },
    {
      id: 'hero',
      anchor: 'inicio',
      type: 'hero',
      tone: 'light',
      eyebrow: 'Do primeiro contato à entrega',
      title: 'Soluções sob medida para o seu negócio crescer',
      highlight: 'o seu negócio crescer',
      subtitle:
        'Entendemos o seu desafio, propomos o caminho certo e acompanhamos cada etapa com transparência — para você focar no que faz de melhor.',
      primary: { label: 'Solicitar orçamento', href: '#contato' },
      secondary: { label: 'Conhecer serviços', href: '#servicos' },
      points: [
        { icon: 'handshake', label: 'Atendimento consultivo' },
        { icon: 'clock', label: 'Prazos combinados' },
        { icon: 'shield', label: 'Suporte após a entrega' },
      ],
    },
    {
      id: 'services',
      anchor: 'servicos',
      type: 'features',
      tone: 'light',
      eyebrow: 'Serviços',
      title: 'O que fazemos por você',
      subtitle: 'Soluções completas, pensadas para a realidade e os objetivos de cada cliente.',
      items: [
        {
          icon: 'target',
          title: 'Diagnóstico e consultoria',
          description: 'Analisamos o cenário atual, identificamos oportunidades e definimos prioridades com você.',
        },
        {
          icon: 'layout',
          title: 'Projetos sob medida',
          description: 'Planejamento e execução feitos para o seu negócio, sem pacotes genéricos.',
        },
        {
          icon: 'megaphone',
          title: 'Marca e comunicação',
          description: 'Mensagem clara e identidade consistente em todos os pontos de contato.',
        },
        {
          icon: 'smartphone',
          title: 'Presença digital',
          description: 'Canais digitais organizados para que os clientes encontrem e confiem em você.',
        },
        {
          icon: 'sparkles',
          title: 'Treinamento da equipe',
          description: 'Capacitação prática para que o seu time aproveite ao máximo cada solução.',
        },
        {
          icon: 'life-buoy',
          title: 'Suporte contínuo',
          description: 'Acompanhamento depois da entrega, com ajustes e melhorias quando você precisar.',
        },
      ],
    },
    {
      id: 'about',
      anchor: 'sobre',
      type: 'about',
      tone: 'muted',
      eyebrow: 'Sobre nós',
      title: 'Uma equipe que entende o seu desafio antes de propor a solução',
      paragraphs: [
        'Nascemos para oferecer um atendimento próximo, em que cada cliente sabe com quem está falando e o que esperar de cada etapa.',
        'Combinamos experiência, método e cuidado com os detalhes para entregar soluções que funcionam no dia a dia do seu negócio.',
      ],
      bullets: [
        'Atendimento direto com quem executa',
        'Proposta clara, com escopo e prazo definidos',
        'Acompanhamento em cada etapa do projeto',
        'Relacionamento que continua depois da entrega',
      ],
      cta: { label: 'Fale com a gente', href: '#contato' },
      quote: 'Nossa missão é transformar boas ideias em resultados concretos para quem confia no nosso trabalho.',
    },
    {
      id: 'process',
      anchor: 'processo',
      type: 'steps',
      tone: 'dark',
      eyebrow: 'Como trabalhamos',
      title: 'Um processo simples, do começo ao fim',
      subtitle: 'Você acompanha cada etapa e sabe exatamente o que vem a seguir.',
      items: [
        {
          icon: 'message',
          title: 'Conversa inicial',
          description: 'Ouvimos o seu objetivo, o contexto e as expectativas para o projeto.',
        },
        {
          icon: 'target',
          title: 'Proposta',
          description: 'Apresentamos escopo, prazo e investimento de forma clara e objetiva.',
        },
        {
          icon: 'layout',
          title: 'Execução',
          description: 'Colocamos o plano em prática, com entregas parciais para sua validação.',
        },
        {
          icon: 'life-buoy',
          title: 'Acompanhamento',
          description: 'Depois da entrega, seguimos ao seu lado para ajustes e evolução.',
        },
      ],
    },
    {
      id: 'faq',
      anchor: 'duvidas',
      type: 'faq',
      tone: 'light',
      eyebrow: 'Dúvidas frequentes',
      title: 'Perguntas que costumamos receber',
      subtitle: 'Não encontrou o que procurava? Fale com a gente pelos canais de contato.',
      items: [
        {
          question: 'Como solicito um orçamento?',
          answer:
            'Entre em contato pelos canais desta página. Faremos uma conversa rápida para entender a sua necessidade e, em seguida, enviamos uma proposta.',
        },
        {
          question: 'Quanto tempo leva um projeto?',
          answer:
            'Depende do escopo. O prazo é definido na proposta, com as etapas e as datas de cada entrega combinadas antes do início.',
        },
        {
          question: 'Vocês atendem empresas de qualquer porte?',
          answer:
            'Sim. Adaptamos a solução ao momento e ao orçamento de cada negócio, de profissionais autônomos a empresas com equipes maiores.',
        },
        {
          question: 'Existe suporte depois da entrega?',
          answer:
            'Sim. Seguimos disponíveis para dúvidas, ajustes e melhorias, de acordo com o que for combinado na proposta.',
        },
      ],
    },
    {
      id: 'cta',
      type: 'cta',
      title: 'Vamos conversar sobre o seu projeto?',
      subtitle: 'Conte o que você precisa. Respondemos com os próximos passos e uma proposta clara.',
      primary: { label: 'Solicitar orçamento', href: '#contato' },
      secondary: { label: 'Ver serviços', href: '#servicos' },
    },
    {
      id: 'contact',
      anchor: 'contato',
      type: 'contact',
      tone: 'light',
      eyebrow: 'Contato',
      title: 'Fale com a nossa equipe',
      subtitle: 'Escolha o canal que preferir. Teremos prazer em ajudar.',
      channels: [
        { kind: 'whatsapp', label: 'WhatsApp', value: '(00) 00000-0000', href: 'https://wa.me/5500000000000' },
        { kind: 'email', label: 'E-mail', value: 'contato@suaempresa.com.br', href: 'mailto:contato@suaempresa.com.br' },
        { kind: 'phone', label: 'Telefone', value: '(00) 0000-0000', href: 'tel:+550000000000' },
        { kind: 'hours', label: 'Horário', value: 'Segunda a sexta, das 9h às 18h' },
        { kind: 'address', label: 'Endereço', value: 'Rua Exemplo, 123 — Centro, Cidade/UF' },
      ],
      primary: { label: 'Chamar no WhatsApp', href: 'https://wa.me/5500000000000' },
    },
    {
      id: 'footer',
      type: 'site-footer',
      brand,
      description: 'Soluções sob medida, com atendimento próximo e acompanhamento em cada etapa.',
      columns: [
        {
          title: 'Navegação',
          links: [
            { label: 'Início', href: '#inicio' },
            { label: 'Serviços', href: '#servicos' },
            { label: 'Sobre', href: '#sobre' },
            { label: 'Como trabalhamos', href: '#processo' },
          ],
        },
        {
          title: 'Atendimento',
          links: [
            { label: 'Dúvidas frequentes', href: '#duvidas' },
            { label: 'Solicitar orçamento', href: '#contato' },
            { label: 'contato@suaempresa.com.br', href: 'mailto:contato@suaempresa.com.br' },
          ],
        },
      ],
      legal: 'Todos os direitos reservados.',
    },
  ],
}
