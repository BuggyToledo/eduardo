import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Trash2,
  AlertCircle,
  Eye,
  Database,
  Lock,
  LogOut,
  Shield,
  KeyRound,
  Info,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AuthSession,
  AuthSettings,
  CompanySettings,
  Quote,
  QuoteItem,
  QuoteStatus,
} from './types';
import {
  DEFAULT_AUTH_SETTINGS,
  DEFAULT_COMPANY_SETTINGS,
  INITIAL_QUOTES,
} from './data/initialData';
import {
  calculateQuoteTotal,
  formatCurrency,
  formatDateBr,
  valorPorExtenso,
} from './utils/formatters';
import { QuoteDocument } from './components/QuoteDocument';
import {
  buildShareSummaryText,
  exportElementToPdfFile,
} from './utils/pdfExporter';
import {
  downloadTextFile,
  generateDreamHostPhpApi,
  generateDreamHostSql,
  generateStandaloneHtmlFile,
} from './utils/standaloneExporter';
import { LoginScreen } from './components/LoginScreen';

const STORAGE_QUOTES_KEY = 'reformas_pinturas_crm_quotes_v2';
const STORAGE_COMPANY_KEY = 'reformas_pinturas_company_settings_v2';
const STORAGE_AUTH_KEY = 'reformas_pinturas_auth_settings_v2';
const STORAGE_SESSION_KEY = 'reformas_pinturas_session_v2';

type ActiveTab = 'editor' | 'crm' | 'pdf' | 'settings';

const QUICK_SERVICE_PRESETS: Array<{
  label: string;
  description: string;
}> = [
  {
    label: 'Reparo Telhado c/ Manta',
    description:
      'Reparo de telhado do condomínio, com retirada de telhas e colocação de manta alumínio.',
  },
  {
    label: 'Impermeabilização Via Plus',
    description:
      'Impermeabilização com via plus 1000 nas partes que forem necessárias.',
  },
  {
    label: 'Lavagem das Telhas',
    description: 'Lavagem das telhas com máquina de alta pressão.',
  },
  {
    label: 'Impermeabilizante Incolor',
    description: 'Aplicação de impermeabilizante incolor nas telhas.',
  },
  {
    label: 'Reparo Teto Hall Infiltração',
    description: 'Reparo do teto do hall onde está com infiltração.',
  },
  {
    label: 'Pintura Acrílica Teto Hall',
    description: 'Pintura do teto do hall com tinta acrílica fosca na cor branca.',
  },
  {
    label: 'Pintura Fachadas e Muros',
    description:
      'Aplicação de 1 demão de selador acrílico e 2 demãos de tinta acrílica premium elastomérica.',
  },
  {
    label: 'Emassamento e Lixamento',
    description:
      'Aplicação de massa corrida PVA/Acrílica e lixamento mecanizado preparado para pintura.',
  },
  {
    label: 'Limpeza e Entulhos',
    description: 'Limpeza geral da obra e retirada completa de todos os entulhos.',
  },
];

const STATUS_LABELS: Record<QuoteStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

function getTodayIso(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getValidUntilIso(days = 15): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

  // Authentication Settings (User credentials)
  const [authSettings, setAuthSettings] = useState<AuthSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_KEY);
      if (saved) {
        return { ...DEFAULT_AUTH_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_AUTH_SETTINGS;
  });

  // Current User Session
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_SESSION_KEY) ||
        sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Form states for password change in Settings
  const [newAdminUser, setNewAdminUser] = useState(authSettings.adminUsername);
  const [newAdminName, setNewAdminName] = useState(authSettings.adminName);
  const [newAdminPass, setNewAdminPass] = useState(authSettings.adminPassword);
  const [confirmAdminPass, setConfirmAdminPass] = useState(
    authSettings.adminPassword
  );

  // Load company settings from localStorage
  const [company, setCompany] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPANY_KEY);
      if (saved) {
        return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_COMPANY_SETTINGS;
  });

  // Load quotes list from localStorage
  const [quotes, setQuotes] = useState<Quote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_QUOTES;
  });

  // Current quote being edited
  const [currentQuote, setCurrentQuote] = useState<Quote>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_QUOTES[0];
  });

  // CRM Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | QuoteStatus>('todos');

  // Validation and Notification feedback
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const pdfDocumentRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  // Auto-save authSettings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(authSettings));
    } catch {
      // ignore
    }
  }, [authSettings]);

  // Handle Login Success
  const handleLoginSuccess = (loginData: { username: string; name: string }) => {
    const newSession: AuthSession = {
      isAuthenticated: true,
      username: loginData.username,
      name: loginData.name,
      loginTime: new Date().toISOString(),
    };
    setSession(newSession);
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newSession));
    } catch {
      // ignore
    }
    showToast(`Bem-vindo, ${loginData.name}! Sistema liberado.`);
  };

  // Handle Logout
  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      // ignore
    }
    showToast('Sessão encerrada com sucesso.');
  };

  // Auto-save company settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPANY_KEY, JSON.stringify(company));
    } catch {
      // ignore
    }
  }, [company]);

  // Auto-save currentQuote into quotes list & localStorage
  useEffect(() => {
    setQuotes((prevQuotes) => {
      const exists = prevQuotes.some((q) => q.id === currentQuote.id);
      const updatedList = exists
        ? prevQuotes.map((q) => (q.id === currentQuote.id ? currentQuote : q))
        : [currentQuote, ...prevQuotes];
      try {
        localStorage.setItem(STORAGE_QUOTES_KEY, JSON.stringify(updatedList));
      } catch {
        // ignore
      }
      return updatedList;
    });
  }, [currentQuote]);

  // Persist quotes list changes
  const updateQuotesList = (nextQuotes: Quote[]) => {
    setQuotes(nextQuotes);
    try {
      localStorage.setItem(STORAGE_QUOTES_KEY, JSON.stringify(nextQuotes));
    } catch {
      // ignore
    }
  };

  // Calculate current quote total
  const currentTotal = useMemo(
    () =>
      typeof currentQuote.totalAmount === 'number'
        ? currentQuote.totalAmount
        : 0,
    [currentQuote.totalAmount]
  );

  // CRM Counters
  const crmMetrics = useMemo(() => {
    let totalOrcado = 0;
    let totalAprovado = 0;
    let totalPendente = 0;
    let countAprovados = 0;

    for (const q of quotes) {
      const val = typeof q.totalAmount === 'number' ? q.totalAmount : 0;
      totalOrcado += val;
      if (q.status === 'aprovado') {
        totalAprovado += val;
        countAprovados += 1;
      } else if (q.status === 'enviado' || q.status === 'rascunho') {
        totalPendente += val;
      }
    }

    return {
      totalOrcado,
      totalAprovado,
      totalPendente,
      countAprovados,
      totalCount: quotes.length,
    };
  }, [quotes]);

  // Filtered quotes for Mini CRM
  const filteredQuotes = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return quotes.filter((q) => {
      if (statusFilter !== 'todos' && q.status !== statusFilter) {
        return false;
      }
      if (!qLower) return true;
      const dateBr = formatDateBr(q.date).toLowerCase();
      return (
        q.client.name.toLowerCase().includes(qLower) ||
        q.client.phone.toLowerCase().includes(qLower) ||
        q.client.contactPerson.toLowerCase().includes(qLower) ||
        q.number.toLowerCase().includes(qLower) ||
        q.date.toLowerCase().includes(qLower) ||
        dateBr.includes(qLower)
      );
    });
  }, [quotes, searchQuery, statusFilter]);

  // Validate Quote before generating PDF
  const validateQuoteForPdf = (quoteToValidate: Quote): boolean => {
    const cleanClientName = (quoteToValidate.client.name || '').trim();
    if (!cleanClientName) {
      setValidationError(
        'Por favor, informe o Nome Completo do Cliente antes de gerar o PDF.'
      );
      setActiveTab('editor');
      return false;
    }

    const validItems = (quoteToValidate.items || []).filter(
      (it) => (it.description || '').trim().length > 0
    );
    if (validItems.length === 0) {
      setValidationError(
        'Adicione pelo menos 1 serviço com descrição no Escopo dos Serviços antes de gerar o PDF.'
      );
      setActiveTab('editor');
      return false;
    }

    if (!quoteToValidate.totalAmount || quoteToValidate.totalAmount <= 0) {
      setValidationError(
        'Informe o Investimento Total (R$) do orçamento no campo de Investimento antes de gerar o PDF.'
      );
      setActiveTab('editor');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Create a brand new blank quote
  const handleCreateNewQuote = () => {
    const nextNum = String(quotes.length + 17).padStart(3, '0');
    const year = new Date().getFullYear();
    const newQuote: Quote = {
      id: `orc-${Date.now()}`,
      number: `${nextNum}/${year}`,
      date: getTodayIso(),
      validUntil: getValidUntilIso(15),
      status: 'rascunho',
      client: {
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        street: '',
        number: '',
        neighborhood: '',
        city: `${company.cityForDate}/RJ`,
        zipCode: '',
      },
      items: [
        {
          id: `item-${Date.now()}-1`,
          description: '',
        },
      ],
      totalAmount: 0,
      generalConditions:
        'O condomínio/contratante deverá fornecer local para guarda de materiais, energia elétrica e água.\nIsolamento das áreas a serem trabalhadas.\nA obra seguirá as normas técnicas e boas práticas de segurança e limpeza.',
      executionTime: '15 dias úteis a partir do início dos serviços.',
      paymentConditions: '50% de entrada na aprovação + 50% na entrega da obra.',
      companySigner: `${company.brandTitle} ${company.brandSubtitle}`.trim(),
      clientSigner: '',
      updatedAt: new Date().toISOString(),
    };

    setCurrentQuote(newQuote);
    setValidationError(null);
    setActiveTab('editor');
    showToast(`Novo orçamento Nº ${newQuote.number} iniciado.`);
  };

  // Duplicate an existing quote
  const handleDuplicateQuote = (source: Quote) => {
    const nextNum = String(quotes.length + 17).padStart(3, '0');
    const year = new Date().getFullYear();
    const duplicated: Quote = {
      ...JSON.parse(JSON.stringify(source)),
      id: `orc-${Date.now()}`,
      number: `${nextNum}/${year}`,
      date: getTodayIso(),
      validUntil: getValidUntilIso(15),
      status: 'rascunho',
      updatedAt: new Date().toISOString(),
    };
    const nextList = [duplicated, ...quotes];
    updateQuotesList(nextList);
    setCurrentQuote(duplicated);
    setActiveTab('editor');
    showToast(`Orçamento duplicado como Nº ${duplicated.number}.`);
  };

  // Delete a quote from CRM
  const handleDeleteQuote = (id: string) => {
    if (quotes.length <= 1) {
      showToast('Mantenha pelo menos 1 orçamento na lista.');
      setDeleteConfirmId(null);
      return;
    }
    const nextList = quotes.filter((q) => q.id !== id);
    updateQuotesList(nextList);
    if (currentQuote.id === id && nextList.length > 0) {
      setCurrentQuote(nextList[0]);
    }
    setDeleteConfirmId(null);
    showToast('Orçamento excluído.');
  };

  // Change status directly on CRM card
  const handleChangeStatus = (id: string, newStatus: QuoteStatus) => {
    const nextList = quotes.map((q) =>
      q.id === id
        ? { ...q, status: newStatus, updatedAt: new Date().toISOString() }
        : q
    );
    updateQuotesList(nextList);
    if (currentQuote.id === id) {
      setCurrentQuote((prev) => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }));
    }
    showToast(`Status atualizado para "${STATUS_LABELS[newStatus]}".`);
  };

  // Add item to current quote (description only)
  const handleAddItem = (presetDescription?: string) => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: presetDescription || '',
    };
    setCurrentQuote((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      updatedAt: new Date().toISOString(),
    }));
    setValidationError(null);
  };

  // Update item description
  const handleUpdateItemDescription = (
    itemId: string,
    description: string
  ) => {
    setCurrentQuote((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === itemId ? { ...it, description } : it
      ),
      updatedAt: new Date().toISOString(),
    }));
    if (description.trim().length > 0) {
      setValidationError(null);
    }
  };

  // Move item up
  const handleMoveItemUp = (index: number) => {
    if (index === 0) return;
    setCurrentQuote((prev) => {
      const items = [...prev.items];
      const temp = items[index];
      items[index] = items[index - 1];
      items[index - 1] = temp;
      return { ...prev, items, updatedAt: new Date().toISOString() };
    });
  };

  // Move item down
  const handleMoveItemDown = (index: number) => {
    setCurrentQuote((prev) => {
      if (index >= prev.items.length - 1) return prev;
      const items = [...prev.items];
      const temp = items[index];
      items[index] = items[index + 1];
      items[index + 1] = temp;
      return { ...prev, items, updatedAt: new Date().toISOString() };
    });
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    if (currentQuote.items.length <= 1) {
      showToast('O orçamento deve ter pelo menos 1 serviço no escopo.');
      return;
    }
    setCurrentQuote((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== itemId),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Auto-generate payment terms with Portuguese words (valorPorExtenso)
  const applyPaymentTemplate = (type: '50-50' | 'sinal-2x' | 'avista') => {
    const total = currentTotal > 0 ? currentTotal : 5500;
    let text = '';
    if (type === '50-50') {
      const half = total / 2;
      text = `50% de entrada: ${formatCurrency(half)} (${valorPorExtenso(half)}).\n50% na entrega da obra: ${formatCurrency(half)} (${valorPorExtenso(half)}).`;
    } else if (type === 'sinal-2x') {
      const sinal = Math.round(total * 0.545454 * 100) / 100;
      const parcela = Math.round(((total - sinal) / 2) * 100) / 100;
      text = `Sinal: ${formatCurrency(sinal)} (${valorPorExtenso(sinal)}).\nRestante em 2 (duas) parcelas iguais e mensais de ${formatCurrency(parcela)} (${valorPorExtenso(parcela)}).`;
    } else {
      const desc = Math.round(total * 0.95 * 100) / 100;
      text = `À vista com 5% de desconto: ${formatCurrency(desc)} (${valorPorExtenso(desc)}) via PIX ou transferência bancária.`;
    }
    setCurrentQuote((prev) => ({
      ...prev,
      paymentConditions: text,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Save new admin credentials in Settings
  const handleSaveAuthSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim()) {
      showToast('O usuário não pode estar vazio.');
      return;
    }
    if (!newAdminPass) {
      showToast('A nova senha não pode estar vazia.');
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      showToast('A confirmação da senha não confere.');
      return;
    }

    const updated: AuthSettings = {
      adminUsername: newAdminUser.trim(),
      adminName: newAdminName.trim() || 'Administrador',
      adminPassword: newAdminPass,
      rememberMe: true,
    };
    setAuthSettings(updated);
    if (session) {
      setSession({
        ...session,
        username: updated.adminUsername,
        name: updated.adminName,
      });
    }
    showToast('Credenciais de login alteradas com sucesso!');
  };

  // Trigger PDF Preview & Direct PDF Download
  const handleGeneratePdf = async (mode: 'preview' | 'download' | 'print') => {
    if (!validateQuoteForPdf(currentQuote)) {
      return;
    }

    if (mode === 'preview') {
      setActiveTab('pdf');
      return;
    }

    if (mode === 'print') {
      setActiveTab('pdf');
      setTimeout(() => {
        window.print();
      }, 150);
      return;
    }

    if (mode === 'download') {
      try {
        setIsGeneratingPdf(true);
        if (!pdfDocumentRef.current) {
          setActiveTab('pdf');
          await new Promise((r) => setTimeout(r, 250));
        }
        if (pdfDocumentRef.current) {
          await exportElementToPdfFile(pdfDocumentRef.current, currentQuote);
          showToast('Arquivo PDF gerado e baixado com sucesso!');
        }
      } catch {
        window.print();
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  // Web Share API + WhatsApp / Email fallback
  const handleShareQuote = async () => {
    if (!validateQuoteForPdf(currentQuote)) {
      return;
    }

    const summaryText = buildShareSummaryText(currentQuote, company);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Orçamento Nº ${currentQuote.number} — ${company.brandTitle}`,
          text: summaryText,
        });
        showToast('Orçamento compartilhado com sucesso!');
        return;
      } catch {
        // User cancelled or iframe blocked navigator.share -> open share modal
      }
    }
    setShareModalOpen(true);
  };

  // IF NOT AUTHENTICATED: RENDER LOGIN SCREEN
  if (!session?.isAuthenticated) {
    return (
      <LoginScreen
        company={company}
        authSettings={authSettings}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // AUTHENTICATED: RENDER FULL APPLICATION
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* TOP NAVIGATION BAR */}
      <header className="no-print sticky top-0 z-30 bg-[#0B3B68] text-white border-b border-slate-800 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single Text Element Wordmark */}
        <a
          href="#editor"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('editor');
          }}
          className="font-display text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap truncate"
        >
          {company.brandTitle || 'OrçaReformas Pro'}
        </a>

        {/* Zone 2: 4 Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'editor'
                ? 'border-[#F5C518] text-white font-semibold'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            Novo Orçamento
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'crm'
                ? 'border-[#F5C518] text-white font-semibold'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            Orçamentos Salvos ({quotes.length})
          </button>
          <button
            type="button"
            onClick={() => handleGeneratePdf('preview')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'pdf'
                ? 'border-[#F5C518] text-white font-semibold'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            Visualizar PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'settings'
                ? 'border-[#F5C518] text-white font-semibold'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            Configurações & MySQL
          </button>
        </nav>

        {/* Zone 3: Actions + User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleShareQuote}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button
            type="button"
            onClick={() => handleGeneratePdf('download')}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-bold text-[#0B3B68] bg-[#F5C518] hover:bg-[#eab308] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}</span>
          </button>

          {/* User Profile & Logout button */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
            <button
              type="button"
              onClick={handleLogout}
              title={`Conectado como ${session.name}. Clique para sair.`}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-red-500/20 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SEGMENTED NAVIGATION BAR */}
      <div className="no-print md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'editor'
              ? 'bg-[#0B3B68] text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Novo Orçamento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('crm')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'crm'
              ? 'bg-[#0B3B68] text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Salvos ({quotes.length})
        </button>
        <button
          type="button"
          onClick={() => handleGeneratePdf('preview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'pdf'
              ? 'bg-[#0B3B68] text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Folha PDF
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'settings'
              ? 'bg-[#0B3B68] text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Configurações
        </button>
      </div>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-medium">
          <Check className="w-4 h-4 text-[#F5C518] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VALIDATION ALERT BANNER */}
      {validationError && (
        <div className="no-print max-w-[1400px] w-full mx-auto px-4 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-xs font-semibold underline hover:text-red-950 whitespace-nowrap"
            >
              Fechar aviso
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="no-print flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-6">
        {/* ===================================================================
            TAB 1: NOVO ORÇAMENTO (FORM EDITOR + LIVE A4 PREVIEW)
           =================================================================== */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Context Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  Formulário de Orçamento
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Editando Orçamento Nº {currentQuote.number}</span>
                  <span aria-hidden="true">·</span>
                  <span>Salvo automaticamente</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-[#0B3B68] tabular-nums">
                    Total: {formatCurrency(currentTotal)}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCreateNewQuote}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Limpar / Novo Orçamento</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const stella = INITIAL_QUOTES[0];
                    setCurrentQuote(JSON.parse(JSON.stringify(stella)));
                    setCompany((prev) => ({
                      ...prev,
                      brandTitle: 'EG FERREIRA',
                      brandSubtitle: 'PINTURAS E REFORMAS',
                    }));
                    showToast(
                      'Carregado modelo idêntico ao anexo (Edifício Stella Syrius Nº 017/2026).'
                    );
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-[#0B3B68] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Carregar Exemplo do Anexo (Nº 017/2026)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGeneratePdf('print')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0B3B68] hover:bg-[#082d50] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>
            </div>

            {/* Two-Column Split on Desktop */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: FORM CONTROLS */}
              <div className="xl:col-span-6 space-y-6">
                {/* 1. Cabeçalho do Orçamento */}
                <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                      01. Identificação e Datas do Orçamento
                    </h2>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      ID: {currentQuote.number}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nº do Orçamento
                      </label>
                      <input
                        type="text"
                        value={currentQuote.number}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            number: e.target.value,
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="017/2026"
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Data do Orçamento
                      </label>
                      <input
                        type="date"
                        value={currentQuote.date}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            date: e.target.value,
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Validade
                      </label>
                      <input
                        type="date"
                        value={currentQuote.validUntil}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            validUntil: e.target.value,
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status no CRM
                      </label>
                      <select
                        value={currentQuote.status}
                        onChange={(e) =>
                          handleChangeStatus(
                            currentQuote.id,
                            e.target.value as QuoteStatus
                          )
                        }
                        className="w-full px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      >
                        <option value="rascunho">Rascunho</option>
                        <option value="enviado">Enviado</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="recusado">Recusado</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* 2. Dados do Cliente */}
                <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                      02. Dados do Cliente e Local da Obra
                    </h2>
                    <span className="text-xs text-slate-500">
                      Obrigatório para PDF
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-7">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome Completo / Condomínio / Empresa *
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, name: val },
                            clientSigner:
                              prev.clientSigner || val.toUpperCase(),
                            updatedAt: new Date().toISOString(),
                          }));
                          if (val.trim()) setValidationError(null);
                        }}
                        placeholder="Ex: Condomínio Edifício Stella Syrius"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Aos Cuidados (A/C Síndico / Responsável)
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.contactPerson}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: {
                              ...prev.client,
                              contactPerson: e.target.value,
                            },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="Ex: Sra. Glória"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={currentQuote.client.phone}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, phone: e.target.value },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="(21) 99999-9999"
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={currentQuote.client.email}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, email: e.target.value },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="cliente@email.com.br"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-9">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rua / Logradouro
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.street}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, street: e.target.value },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="Ex: Rua Miguel Lemos"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Número / Compl.
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.number}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, number: e.target.value },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="119"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.neighborhood}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: {
                              ...prev.client,
                              neighborhood: e.target.value,
                            },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="Copacabana"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cidade / UF
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.city}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, city: e.target.value },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="Rio de Janeiro/RJ"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={currentQuote.client.zipCode}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            client: { ...prev.client, zipCode: e.target.value },
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="22071-000"
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                      />
                    </div>
                  </div>
                </section>

                {/* 3. Escopo dos Serviços */}
                <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                        03. Escopo dos Serviços ({currentQuote.items.length}{' '}
                        {currentQuote.items.length === 1 ? 'item' : 'itens'})
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        Apenas descrições (sem preços ou metragens)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Adicione a descrição detalhada de cada serviço ou etapa da obra. No escopo entram exclusivamente as descrições dos serviços.
                    </p>
                  </div>

                  {/* Quick Service Add Bar */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <span className="block text-[11px] font-semibold text-slate-600">
                      Adicionar serviço frequente com 1 clique:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SERVICE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddItem(preset.description)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-[#0B3B68] hover:text-white border border-slate-200 hover:border-[#0B3B68] rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    {currentQuote.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3 transition-colors hover:bg-slate-50/80"
                      >
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <span className="w-6 h-6 rounded-full bg-[#0B3B68] text-white font-display text-xs font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveItemUp(index)}
                              title="Mover item para cima"
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed rounded hover:bg-slate-200"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === currentQuote.items.length - 1}
                              onClick={() => handleMoveItemDown(index)}
                              title="Mover item para baixo"
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed rounded hover:bg-slate-200"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1">
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItemDescription(
                                item.id,
                                e.target.value
                              )
                            }
                            placeholder="Descreva o serviço a ser realizado nesta etapa (ex: Reparo de telhado do condomínio, com retirada de telhas e colocação de manta alumínio...)"
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] leading-snug resize-y"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remover serviço do escopo"
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="px-4 py-2 text-xs font-bold text-[#0B3B68] bg-slate-100 hover:bg-slate-200 border border-slate-300/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Novo Serviço ao Escopo</span>
                    </button>

                    <span className="text-[11px] text-slate-500 italic">
                      Dica: o valor total é inserido no campo de Investimento logo abaixo.
                    </span>
                  </div>
                </section>

                {/* 4. Investimento Total e Condições Comerciais */}
                <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                      04. Investimento Total e Condições Comerciais
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Defina o investimento global da obra e as condições de pagamento.
                    </p>
                  </div>

                  {/* Investimento Total Box */}
                  <div className="bg-[#E8F1F8] border border-blue-200/80 rounded-xl p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-5">
                        <label className="block text-xs font-bold text-[#0B3B68] uppercase tracking-wide mb-1.5">
                          Investimento Total da Obra (R$) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                            R$
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentQuote.totalAmount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentQuote((prev) => ({
                                ...prev,
                                totalAmount: val,
                                updatedAt: new Date().toISOString(),
                              }));
                              setValidationError(null);
                            }}
                            placeholder="Ex: 5500,00"
                            className="w-full pl-10 pr-3 py-2.5 text-base font-bold font-mono text-[#0B3B68] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68] tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-7 bg-white/80 border border-blue-200/60 rounded-lg p-3">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Valor Formatado & Por Extenso (no PDF)
                        </div>
                        <div className="font-display text-2xl font-black text-[#0B3B68] tabular-nums mt-0.5">
                          {formatCurrency(currentTotal)}
                        </div>
                        <div className="text-xs text-slate-700 italic mt-0.5 capitalize">
                          ({valorPorExtenso(currentTotal)})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Condições de Pagamento */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Condições de Pagamento
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 mr-0.5">Calcular:</span>
                        <button
                          type="button"
                          onClick={() => applyPaymentTemplate('50-50')}
                          className="px-2.5 py-1 text-xs font-medium text-[#0B3B68] bg-slate-100 hover:bg-[#0B3B68] hover:text-white rounded-md transition-colors cursor-pointer"
                        >
                          Gerar 50% + 50%
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPaymentTemplate('sinal-2x')}
                          className="px-2.5 py-1 text-xs font-medium text-[#0B3B68] bg-slate-100 hover:bg-[#0B3B68] hover:text-white rounded-md transition-colors cursor-pointer"
                        >
                          Gerar Sinal + 2x
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPaymentTemplate('avista')}
                          className="px-2.5 py-1 text-xs font-medium text-[#0B3B68] bg-slate-100 hover:bg-[#0B3B68] hover:text-white rounded-md transition-colors cursor-pointer"
                        >
                          À Vista (-5%)
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={currentQuote.paymentConditions}
                      onChange={(e) =>
                        setCurrentQuote((prev) => ({
                          ...prev,
                          paymentConditions: e.target.value,
                          updatedAt: new Date().toISOString(),
                        }))
                      }
                      placeholder="Ex: Sinal: R$ 3.000,00 (três mil reais). Restante em 2 (duas) parcelas de R$ 1.250,00..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                    />
                  </div>

                  {/* Prazo de Execução */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prazo de Execução
                    </label>
                    <textarea
                      rows={2}
                      value={currentQuote.executionTime}
                      onChange={(e) =>
                        setCurrentQuote((prev) => ({
                          ...prev,
                          executionTime: e.target.value,
                          updatedAt: new Date().toISOString(),
                        }))
                      }
                      placeholder="Ex: O prazo máximo para realização total das obras será de 7 (sete) dias úteis..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                    />
                  </div>

                  {/* Condições Gerais */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Condições Gerais (1 tópico por linha)
                    </label>
                    <textarea
                      rows={3}
                      value={currentQuote.generalConditions}
                      onChange={(e) =>
                        setCurrentQuote((prev) => ({
                          ...prev,
                          generalConditions: e.target.value,
                          updatedAt: new Date().toISOString(),
                        }))
                      }
                      placeholder="Ex: O condomínio deverá fornecer local para guarda de materiais, energia elétrica e água..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                    />
                  </div>

                  {/* 5. Assinaturas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Assinatura pela Empresa (Contratada)
                      </label>
                      <input
                        type="text"
                        value={currentQuote.companySigner}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            companySigner: e.target.value,
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="EG FERREIRA PINTURAS E REFORMAS"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Assinatura pelo Cliente (Contratante)
                      </label>
                      <input
                        type="text"
                        value={currentQuote.clientSigner}
                        onChange={(e) =>
                          setCurrentQuote((prev) => ({
                            ...prev,
                            clientSigner: e.target.value,
                            updatedAt: new Date().toISOString(),
                          }))
                        }
                        placeholder="CONDOMÍNIO EDIFÍCIO STELLA SYRIUS"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: LIVE A4 DOCUMENT PREVIEW */}
              <div className="xl:col-span-6 space-y-3 xl:sticky xl:top-20">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0B3B68]" />
                    <span>Pré-visualização em Tempo Real (Padrão A4)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGeneratePdf('print')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGeneratePdf('download')}
                      disabled={isGeneratingPdf}
                      className="px-3 py-1.5 text-xs font-bold text-[#0B3B68] bg-[#F5C518] hover:bg-[#eab308] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PDF</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4">
                  <QuoteDocument
                    quote={currentQuote}
                    company={company}
                    documentRef={pdfDocumentRef}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: MINI CRM (ORÇAMENTOS SALVOS)
           =================================================================== */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  Orçamentos Salvos — Mini CRM
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Acompanhe propostas comerciais, filtre por status e duplique orçamentos anteriores.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNewQuote}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0B3B68] hover:bg-[#082d50] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Orçamento</span>
              </button>
            </div>

            {/* Financial Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-xl p-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="pb-3 sm:pb-0 sm:pr-5">
                <div className="text-xs font-medium text-slate-500">
                  Total Orçado ({crmMetrics.totalCount} propostas)
                </div>
                <div className="font-mono text-2xl font-bold text-[#0B3B68] mt-1 tabular-nums">
                  {formatCurrency(crmMetrics.totalOrcado)}
                </div>
              </div>

              <div className="py-3 sm:py-0 sm:px-5">
                <div className="text-xs font-medium text-slate-500">
                  Total Aprovado ({crmMetrics.countAprovados} obras fechadas)
                </div>
                <div className="font-mono text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                  {formatCurrency(crmMetrics.totalAprovado)}
                </div>
              </div>

              <div className="pt-3 sm:pt-0 sm:pl-5">
                <div className="text-xs font-medium text-slate-500">
                  Em Negociação (Rascunho / Enviado)
                </div>
                <div className="font-mono text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                  {formatCurrency(crmMetrics.totalPendente)}
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome do cliente, telefone, nº ou data..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg overflow-x-auto">
                {(
                  [
                    ['todos', 'Todos'],
                    ['rascunho', 'Rascunho'],
                    ['enviado', 'Enviado'],
                    ['aprovado', 'Aprovado'],
                    ['recusado', 'Recusado'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* CRM Quotes Cards */}
            {filteredQuotes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="font-display text-base font-bold text-slate-800">
                  Nenhum orçamento encontrado
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Altere os termos da busca acima ou crie um novo orçamento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredQuotes.map((q) => {
                  const total =
                    typeof q.totalAmount === 'number' ? q.totalAmount : 0;
                  const isCurrent = q.id === currentQuote.id;
                  return (
                    <div
                      key={q.id}
                      className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-colors ${
                        isCurrent
                          ? 'border-[#0B3B68] ring-1 ring-[#0B3B68]/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 font-mono tabular-nums">
                            <span className="font-semibold text-slate-700">
                              Nº {q.number}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatDateBr(q.date)}</span>
                          </div>

                          <select
                            value={q.status}
                            onChange={(e) =>
                              handleChangeStatus(
                                q.id,
                                e.target.value as QuoteStatus
                              )
                            }
                            aria-label="Status do orçamento"
                            className={`text-xs font-semibold bg-transparent border-b pb-0.5 focus:outline-none cursor-pointer ${
                              q.status === 'aprovado'
                                ? 'text-emerald-700 border-emerald-600'
                                : q.status === 'recusado'
                                  ? 'text-red-700 border-red-600'
                                  : q.status === 'enviado'
                                    ? 'text-[#0B3B68] border-[#0B3B68]'
                                    : 'text-amber-700 border-amber-600'
                            }`}
                          >
                            <option value="rascunho">Status: Rascunho</option>
                            <option value="enviado">Status: Enviado</option>
                            <option value="aprovado">Status: Aprovado</option>
                            <option value="recusado">Status: Recusado</option>
                          </select>
                        </div>

                        <div>
                          <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                            {q.client.name || 'Cliente sem nome'}
                          </h3>
                          <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {q.client.contactPerson && (
                              <span>A/C: {q.client.contactPerson}</span>
                            )}
                            {q.client.phone && (
                              <span className="font-mono tabular-nums">
                                {q.client.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs text-slate-500">
                            {q.items.length}{' '}
                            {q.items.length === 1 ? 'serviço' : 'serviços'}
                          </span>
                          <span className="font-mono text-lg font-bold text-[#0B3B68] tabular-nums">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentQuote(q);
                              setActiveTab('pdf');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#0B3B68] hover:bg-[#082d50] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCurrentQuote(q);
                              setActiveTab('editor');
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateQuote(q)}
                            title="Duplicar este orçamento"
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicar</span>
                          </button>
                        </div>

                        {deleteConfirmId === q.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(q.id)}
                              className="px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(q.id)}
                            title="Excluir orçamento"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 3: VISUALIZAR PDF / IMPRESSÃO A4
           =================================================================== */}
        {activeTab === 'pdf' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl">
              <div>
                <h1 className="font-display text-lg font-bold text-slate-900">
                  Visualização Final de Impressão e Exportação PDF
                </h1>
                <p className="text-xs text-slate-600">
                  Orçamento Nº {currentQuote.number} · Cliente:{' '}
                  {currentQuote.client.name || 'Não informado'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Voltar para Edição
                </button>
                <button
                  type="button"
                  onClick={handleShareQuote}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B3B68] hover:bg-[#082d50] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar via Navegador</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGeneratePdf('download')}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 text-xs font-bold text-[#0B3B68] bg-[#F5C518] hover:bg-[#eab308] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isGeneratingPdf
                      ? 'Exportando PDF...'
                      : 'Baixar PDF Automaticamente'}
                  </span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-8">
              <QuoteDocument
                quote={currentQuote}
                company={company}
                documentRef={pdfDocumentRef}
              />
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: CONFIGURAÇÕES, SEGURANÇA (LOGIN/SENHA) & MYSQL DREAMHOST
           =================================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  Configurações, Segurança & Hospedagem DreamHost
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Gerencie sua senha de login, dados do cabeçalho da empresa e conexão MySQL na DreamHost.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompany((prev) => ({
                      ...prev,
                      brandTitle: 'REFORMAS & PINTURAS',
                      brandSubtitle: 'SOLUÇÕES EM OBRAS',
                      brandTagline: 'PREDIAIS E RESIDENCIAIS',
                    }));
                    showToast('Nome alterado para "REFORMAS & PINTURAS".');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Usar "Reformas & Pinturas"
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompany((prev) => ({
                      ...prev,
                      brandTitle: 'EG FERREIRA',
                      brandSubtitle: 'PINTURAS E REFORMAS',
                      brandTagline: 'PREDIAIS E RESIDENCIAIS',
                    }));
                    showToast(
                      'Nome alterado para "EG FERREIRA PINTURAS E REFORMAS".'
                    );
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-[#0B3B68] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Usar "EG FERREIRA" (Modelo Anexo)
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: SEGURANÇA E ACESSO (LOGIN E SENHA) */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#0B3B68]" />
                  <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                    Controle de Acesso & Senha do Sistema
                  </h2>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Proteção de Login Ativa
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Defina o nome de usuário e a senha master utilizados para desbloquear o sistema ao abrir o aplicativo (inclusive no arquivo HTML exportado).
              </p>

              <form onSubmit={handleSaveAuthSettings} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Usuário de Acesso
                    </label>
                    <input
                      type="text"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Operador / Responsável
                    </label>
                    <input
                      type="text"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="Administrador"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova Senha de Acesso
                    </label>
                    <input
                      type="password"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmAdminPass}
                      onChange={(e) => setConfirmAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0B3B68] hover:bg-[#082d50] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#F5C518]" />
                    <span>Salvar Nova Senha de Acesso</span>
                  </button>
                </div>
              </form>
            </section>

            {/* SEÇÃO 2: DADOS DA EMPRESA */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Settings className="w-4 h-4 text-[#0B3B68]" />
                <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                  Dados do Cabeçalho da Empresa (Exibidos no PDF)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Principal da Empresa (Linha 1)
                  </label>
                  <input
                    type="text"
                    value={company.brandTitle}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        brandTitle: e.target.value,
                      }))
                    }
                    placeholder="Ex: REFORMAS & PINTURAS"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtítulo da Marca (Linha 2)
                  </label>
                  <input
                    type="text"
                    value={company.brandSubtitle}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        brandSubtitle: e.target.value,
                      }))
                    }
                    placeholder="Ex: PINTURAS E REFORMAS"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Especialidade (Entre faixas amarelas)
                  </label>
                  <input
                    type="text"
                    value={company.brandTagline}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        brandTagline: e.target.value,
                      }))
                    }
                    placeholder="PREDIAIS E RESIDENCIAIS"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={company.cnpj}
                    onChange={(e) =>
                      setCompany((prev) => ({ ...prev, cnpj: e.target.value }))
                    }
                    placeholder="26.718.800/0001-83"
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço da Empresa (Linha 1)
                  </label>
                  <input
                    type="text"
                    value={company.addressLine1}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        addressLine1: e.target.value,
                      }))
                    }
                    placeholder="Rua Raimundo Correa, 34"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro / Cidade / UF (Linha 2)
                  </label>
                  <input
                    type="text"
                    value={company.addressLine2}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        addressLine2: e.target.value,
                      }))
                    }
                    placeholder="Copacabana – Rio de Janeiro/RJ"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone Comercial / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={company.phone}
                    onChange={(e) =>
                      setCompany((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(21) 98349-6496"
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade para Data por Extenso (Rodapé do PDF)
                  </label>
                  <input
                    type="text"
                    value={company.cityForDate}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        cityForDate: e.target.value,
                      }))
                    }
                    placeholder="Rio de Janeiro"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white"
                  />
                </div>
              </div>
            </section>

            {/* SEÇÃO 3: EXPORTAÇÃO DREAMHOST & RESPOSTA SOBRE A SENHA DO MYSQL */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#0B3B68]" />
                  <h2 className="font-display text-sm font-bold text-[#0B3B68] uppercase tracking-wide">
                    Hospedagem DreamHost & Banco MySQL
                  </h2>
                </div>
              </div>

              {/* Box Explicativo Tirando a Dúvida do Usuário */}
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs space-y-2 text-slate-800">
                <div className="font-bold flex items-center gap-2 text-[#0B3B68]">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Como funciona a senha do MySQL na DreamHost?</span>
                </div>
                <p className="leading-relaxed">
                  <strong>Onde a senha do MySQL é criada:</strong> Você cria o nome do banco, usuário e a senha no painel de controle da <strong>DreamHost</strong> (em <em>Goodies &gt; MySQL Databases</em>).
                </p>
                <p className="leading-relaxed">
                  <strong>Onde a senha deve ficar:</strong> A senha do banco de dados <strong>NUNCA</strong> deve ficar no HTML ou Javascript público do navegador. Ela fica protegida exclusivamente dentro do arquivo <code>api.php</code> no seu servidor.
                </p>
                <p className="leading-relaxed">
                  Você pode digitar a senha do seu MySQL da DreamHost no campo abaixo. Ao clicar em <strong>"Baixar Conector PHP (api.php)"</strong>, o arquivo já será baixado com a sua senha preenchida e pronta para rodar com segurança na DreamHost!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Host MySQL DreamHost
                  </label>
                  <input
                    type="text"
                    value={company.mysqlHost}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        mysqlHost: e.target.value,
                      }))
                    }
                    placeholder="mysql.seudominio.com.br"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Banco
                  </label>
                  <input
                    type="text"
                    value={company.mysqlDatabase}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        mysqlDatabase: e.target.value,
                      }))
                    }
                    placeholder="reformas_pinturas_crm"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Usuário MySQL
                  </label>
                  <input
                    type="text"
                    value={company.mysqlUser}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        mysqlUser: e.target.value,
                      }))
                    }
                    placeholder="admin_orcamentos"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Senha do MySQL (DreamHost)
                  </label>
                  <input
                    type="password"
                    value={company.mysqlPassword || ''}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        mysqlPassword: e.target.value,
                      }))
                    }
                    placeholder="Sua senha da DreamHost"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Botões de Download dos Arquivos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const html = generateStandaloneHtmlFile(
                      company,
                      quotes,
                      authSettings
                    );
                    downloadTextFile(
                      'index.html',
                      html,
                      'text/html;charset=utf-8'
                    );
                    showToast(
                      'Arquivo index.html único autocontido com login baixado!'
                    );
                  }}
                  className="p-4 text-left bg-[#0B3B68] hover:bg-[#082d50] text-white rounded-xl transition-colors flex flex-col justify-between gap-2 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <FileCode className="w-5 h-5 text-[#F5C518]" />
                    <Download className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <div className="font-display text-xs font-bold uppercase">
                      1. Baixar HTML Único Protegido
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5">
                      Arquivo index.html com login, CRM e gerador de PDF embutidos.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sql = generateDreamHostSql(
                      company,
                      quotes,
                      authSettings
                    );
                    downloadTextFile('database_dreamhost.sql', sql);
                    showToast('Script SQL MySQL com tabela de usuários gerado!');
                  }}
                  className="p-4 text-left bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border border-slate-200 transition-colors flex flex-col justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <FileSpreadsheet className="w-5 h-5 text-[#0B3B68]" />
                    <Download className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-display text-xs font-bold text-[#0B3B68] uppercase">
                      2. Baixar Tabelas MySQL (.sql)
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Cria tabelas de orçamentos, itens e usuários no phpMyAdmin.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const php = generateDreamHostPhpApi(company, authSettings);
                    downloadTextFile('api.php', php);
                    showToast(
                      'Script api.php gerado com proteção e senha do banco!'
                    );
                  }}
                  className="p-4 text-left bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border border-slate-200 transition-colors flex flex-col justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Database className="w-5 h-5 text-[#0B3B68]" />
                    <Download className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-display text-xs font-bold text-[#0B3B68] uppercase">
                      3. Baixar Conector PHP (api.php)
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      API PDO com endpoint de login e consulta segura MySQL.
                    </div>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* DEDICATED PRINT-ONLY CONTAINER */}
      <div className="hidden print-only-container">
        <QuoteDocument quote={currentQuote} company={company} />
      </div>

      {/* SHARE MODAL */}
      {shareModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-[#0B3B68]">
                Compartilhar Orçamento Nº {currentQuote.number}
              </h3>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Envie o resumo formatado diretamente para o WhatsApp ou e-mail do cliente:
            </p>

            <textarea
              readOnly
              rows={8}
              value={buildShareSummaryText(currentQuote, company)}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    buildShareSummaryText(currentQuote, company)
                  );
                  showToast('Resumo copiado para a área de transferência!');
                  setShareModalOpen(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Texto</span>
              </button>

              <a
                href={`mailto:${encodeURIComponent(currentQuote.client.email || '')}?subject=${encodeURIComponent(`Orçamento Nº ${currentQuote.number} - ${company.brandTitle}`)}&body=${encodeURIComponent(buildShareSummaryText(currentQuote, company))}`}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no E-mail</span>
              </a>

              <a
                href={`https://wa.me/${(currentQuote.client.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(buildShareSummaryText(currentQuote, company))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 px-4 lg:px-8 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            {company.brandTitle} — {company.brandSubtitle} · CNPJ {company.cnpj}
          </div>
          <div className="flex items-center gap-4">
            <span>
              Conectado como: <strong>{session.name}</strong> ({session.username})
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-red-600 hover:underline cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
