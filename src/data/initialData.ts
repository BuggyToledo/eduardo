import { AuthSettings, CompanySettings, Quote } from '../types';

export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  adminUsername: 'admin',
  adminPassword: 'admin123',
  adminName: 'Administrador',
  rememberMe: true,
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  brandTitle: 'REFORMAS & PINTURAS',
  brandSubtitle: 'EG FERREIRA EMPREITEIRA',
  brandTagline: 'PREDIAIS E RESIDENCIAIS',
  cnpj: '26.718.800/0001-83',
  addressLine1: 'Rua Raimundo Correa, 34',
  addressLine2: 'Copacabana – Rio de Janeiro/RJ',
  phone: '(21) 98349-6496',
  email: 'contato@egferreirareformas.com.br',
  cityForDate: 'Rio de Janeiro',
  mysqlHost: 'mysql.seudominio.com.br',
  mysqlDatabase: 'reformas_pinturas_crm',
  mysqlUser: 'admin_orcamentos',
  mysqlPassword: '',
  mysqlApiUrl: '/api.php',
};

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'orc-017-2026',
    number: '017/2026',
    date: '2026-09-26',
    validUntil: '2026-10-10',
    status: 'aprovado',
    client: {
      name: 'Condomínio: Edifício Stella Syrius',
      contactPerson: 'Sra. Glória',
      phone: '(21) 98349-6496',
      email: 'administracao@stellasyrius.com.br',
      street: 'Rua Miguel Lemos',
      number: '119',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro/RJ',
      zipCode: '22071-000',
    },
    items: [
      {
        id: 'item-1',
        description:
          'Reparo de telhado do condomínio, com retirada de telhas e colocação de manta alumínio.',
      },
      {
        id: 'item-2',
        description:
          'Impermeabilização com via plus 1000 nas partes que forem necessárias.',
      },
      {
        id: 'item-3',
        description: 'Lavagem das telhas com máquina de alta pressão.',
      },
      {
        id: 'item-4',
        description: 'Aplicação de impermeabilizante incolor nas telhas.',
      },
      {
        id: 'item-5',
        description: 'Limpeza da obra, retirada dos entulhos.',
      },
    ],
    totalAmount: 5500,
    generalConditions:
      'O Condomínio deverá fornecer local para guarda de materiais, energia elétrica e local para troca de roupa dos funcionários e banho.\nIsolamento das áreas a serem trabalhadas.\nA obra seguirá as normas de segurança e boas práticas de manutenção predial.',
    executionTime:
      'O prazo máximo para realização total das obras será de 7 (sete) dias úteis, sem contar os dias de chuva.\nO prazo poderá ser prorrogado em caso de chuvas ou condições climáticas adversas.',
    paymentConditions:
      'Sinal: R$ 3.000,00 (três mil reais).\nRestante em 2 (duas) parcelas iguais e mensais de R$ 1.250,00 (mil duzentos e cinquenta reais).',
    companySigner: 'EG FERREIRA PINTURAS E REFORMAS',
    clientSigner: 'CONDOMÍNIO STELLA SYRIUS',
    updatedAt: '2026-09-26T14:30:00.000Z',
  },
  {
    id: 'orc-018-2026',
    number: '018/2026',
    date: '2026-09-28',
    validUntil: '2026-10-13',
    status: 'enviado',
    client: {
      name: 'Condomínio Edifício Atlântico Sul',
      contactPerson: 'Sr. Carlos Eduardo (Síndico)',
      phone: '(21) 99642-1180',
      email: 'sindico@atlanticosul.org.br',
      street: 'Av. Nossa Senhora de Copacabana',
      number: '890',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro/RJ',
      zipCode: '22060-002',
    },
    items: [
      {
        id: 'item-201',
        description:
          'Hidrojateamento e tratamento de fissuras na fachada frontal e prismas de ventilação.',
      },
      {
        id: 'item-202',
        description:
          'Aplicação de 1 demão de selador acrílico e 2 demãos de tinta acrílica premium elastomérica.',
      },
      {
        id: 'item-203',
        description:
          'Recuperação estrutural pontual em pastilhas e peitoris com argamassa polimérica.',
      },
    ],
    totalAmount: 18400,
    generalConditions:
      'Fornecimento de equipamentos de EPI e linha de vida conforme NR-35 inclusos.\nO condomínio disponibilizará ponto de água e energia trifásica.\nGarantia de 3 anos para mão de obra de aplicação.',
    executionTime:
      'O prazo estimado para conclusão dos serviços é de 18 (dezoito) dias úteis, condicionado a tempo firme sem precipitações.',
    paymentConditions:
      '40% de sinal na aprovação do contrato.\n30% na conclusão da preparação e selador (medido em obra).\n30% na entrega final após vistoria aprovada.',
    companySigner: 'REFORMAS & PINTURAS',
    clientSigner: 'CONDOMÍNIO EDIFÍCIO ATLÂNTICO SUL',
    updatedAt: '2026-09-28T16:15:00.000Z',
  },
  {
    id: 'orc-019-2026',
    number: '019/2026',
    date: '2026-09-29',
    validUntil: '2026-10-14',
    status: 'rascunho',
    client: {
      name: 'Dra. Helena Vasconcelos (Apto 702)',
      contactPerson: 'Dra. Helena Vasconcelos',
      phone: '(21) 98115-3920',
      email: 'helena.vasconcelos@medrio.com.br',
      street: 'Rua Visconde de Pirajá',
      number: '414',
      neighborhood: 'Ipanema',
      city: 'Rio de Janeiro/RJ',
      zipCode: '22410-002',
    },
    items: [
      {
        id: 'item-301',
        description:
          'Proteção completa de pisos em porcelanato, rodapés, esquadrias e mobiliário com lona e papelão ondulado.',
      },
      {
        id: 'item-302',
        description:
          'Emassamento corrido com massa PVA em paredes internas (sala, 3 quartos e circulação) e lixamento mecanizado sem pó.',
      },
      {
        id: 'item-303',
        description:
          'Pintura fina com 3 demãos de tinta acrílica fosca acetinada toque de seda em todas as paredes e tetos.',
      },
    ],
    totalAmount: 9750,
    generalConditions:
      'Horário de trabalho rigorosamente dentro das normas do condomínio (08h às 17h de segunda a sexta-feira).\nLimpeza fina diária do ambiente de trabalho.\nTintas e massas fornecidas pela contratante ou faturadas direto do fornecedor.',
    executionTime: '10 (dez) dias úteis a partir da liberação de acesso na portaria.',
    paymentConditions: '50% de entrada no início da obra + 50% na entrega das chaves.',
    companySigner: 'REFORMAS & PINTURAS',
    clientSigner: 'HELENA VASCONCELOS',
    updatedAt: '2026-09-29T10:00:00.000Z',
  },
];
