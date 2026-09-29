import { AuthSettings, CompanySettings, Quote } from '../types';

export function generateDreamHostSql(
  company: CompanySettings,
  quotes: Quote[],
  authSettings?: AuthSettings
): string {
  const safeJsonCompany = JSON.stringify(company).replace(/'/g, "''");
  const adminUser = (authSettings?.adminUsername || 'admin').replace(/'/g, "''");
  const adminName = (authSettings?.adminName || 'Administrador').replace(/'/g, "''");
  const adminPass = (authSettings?.adminPassword || 'admin123').replace(/'/g, "''");

  const inserts = quotes
    .map((q) => {
      const total = typeof q.totalAmount === 'number' ? q.totalAmount : 0;
      const safePayload = JSON.stringify(q).replace(/'/g, "''");
      const safeName = (q.client.name || '').replace(/'/g, "''");
      const safePhone = (q.client.phone || '').replace(/'/g, "''");
      const safeNumber = (q.number || '').replace(/'/g, "''");
      return `INSERT INTO orcamentos (id, numero, cliente_nome, cliente_telefone, data_orcamento, validade, status, valor_total, payload_json)
VALUES ('${q.id}', '${safeNumber}', '${safeName}', '${safePhone}', '${q.date}', '${q.validUntil}', '${q.status}', ${total.toFixed(2)}, '${safePayload}')
ON DUPLICATE KEY UPDATE
  numero = VALUES(numero),
  cliente_nome = VALUES(cliente_nome),
  cliente_telefone = VALUES(cliente_telefone),
  data_orcamento = VALUES(data_orcamento),
  validade = VALUES(validade),
  status = VALUES(status),
  valor_total = VALUES(valor_total),
  payload_json = VALUES(payload_json);`;
    })
    .join('\n\n');

  return `-- ============================================================================
-- SCRIPT MYSQL PARA HOSPEDAGEM DREAMHOST
-- Sistema: ${company.brandTitle} - ${company.brandSubtitle}
-- ============================================================================

-- 1. TABELA DE USUÁRIOS E SEGURANÇA
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insere o usuário administrador inicial se não existir
INSERT INTO usuarios (id, username, password_hash, nome)
VALUES (1, '${adminUser}', '${adminPass}', '${adminName}')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  nome = VALUES(nome);

-- 2. TABELA DE CONFIGURAÇÕES DA EMPRESA
CREATE TABLE IF NOT EXISTS configuracoes_empresa (
  id INT PRIMARY KEY DEFAULT 1,
  settings_json LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA DE ORÇAMENTOS E ITENS (MINI CRM)
CREATE TABLE IF NOT EXISTS orcamentos (
  id VARCHAR(64) PRIMARY KEY,
  numero VARCHAR(32) NOT NULL,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(64) DEFAULT '',
  data_orcamento DATE NOT NULL,
  validade DATE NOT NULL,
  status ENUM('rascunho', 'enviado', 'aprovado', 'recusado') DEFAULT 'rascunho',
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payload_json LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cliente (cliente_nome),
  INDEX idx_status (status),
  INDEX idx_data (data_orcamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO configuracoes_empresa (id, settings_json)
VALUES (1, '${safeJsonCompany}')
ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json);

${inserts}
`;
}

export function generateDreamHostPhpApi(
  company: CompanySettings,
  authSettings?: AuthSettings
): string {
  const dbPassPlaceholder = company.mysqlPassword
    ? company.mysqlPassword.replace(/"/g, '\\"')
    : 'SUA_SENHA_MYSQL_AQUI';

  const defaultAdminUser = authSettings?.adminUsername || 'admin';
  const defaultAdminPass = authSettings?.adminPassword || 'admin123';

  return `<?php
/**
 * API REST PHP + MySQL para Hospedagem DreamHost
 * Sistema: ${company.brandTitle} - ${company.brandSubtitle}
 *
 * INSTRUÇÕES DREAMHOST:
 * 1. Crie o banco de dados no painel da DreamHost: Goodies > MySQL Databases
 * 2. Anote o Host MySQL (ex: mysql.seudominio.com), Usuário e Senha
 * 3. A senha do banco é configurada exclusivamente aqui no servidor (variável $db_pass)
 * 4. Salve este arquivo como "api.php" na mesma pasta do seu index.html
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================================
// CREDENCIAIS DO BANCO MYSQL DA DREAMHOST
// ============================================================================
$db_host = "${company.mysqlHost || 'mysql.seudominio.com.br'}";
$db_name = "${company.mysqlDatabase || 'reformas_pinturas_crm'}";
$db_user = "${company.mysqlUser || 'admin_orcamentos'}";
$db_pass = "${dbPassPlaceholder}"; // Configure aqui a senha gerada no painel DreamHost

try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Falha na conexão MySQL da DreamHost: " . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? 'list';

// ----------------------------------------------------------------------------
// ENDPOINT: AUTENTICAÇÃO / LOGIN
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $body = json_decode(file_get_contents("php://input"), true);
    $user = trim($body['username'] ?? '');
    $pass = $body['password'] ?? '';

    // Consulta usuário no banco
    $stmt = $pdo->prepare("SELECT id, username, password_hash, nome FROM usuarios WHERE username = :u LIMIT 1");
    $stmt->execute([':u' => $user]);
    $row = $stmt->fetch();

    $isValid = false;
    $nome = 'Administrador';

    if ($row) {
        // Valida senha direta ou por password_verify se estiver usando hash
        if ($pass === $row['password_hash'] || password_verify($pass, $row['password_hash'])) {
            $isValid = true;
            $nome = $row['nome'];
        }
    } else if ($user === '${defaultAdminUser}' && $pass === '${defaultAdminPass}') {
        $isValid = true;
        $nome = 'Administrador';
    }

    if ($isValid) {
        $token = bin2hex(random_bytes(24));
        echo json_encode([
            "authenticated" => true,
            "username" => $user,
            "name" => $nome,
            "token" => $token
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Usuário ou senha inválidos"]);
    }
    exit;
}

// ----------------------------------------------------------------------------
// ENDPOINT: LISTAR ORÇAMENTOS E CONFIGURAÇÕES
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $stmt = $pdo->query("SELECT payload_json FROM orcamentos ORDER BY data_orcamento DESC, updated_at DESC");
    $rows = $stmt->fetchAll();
    $quotes = array_map(fn($r) => json_decode($r['payload_json'], true), $rows);

    $stmtCfg = $pdo->query("SELECT settings_json FROM configuracoes_empresa WHERE id = 1");
    $cfgRow = $stmtCfg->fetch();
    $settings = $cfgRow ? json_decode($cfgRow['settings_json'], true) : null;

    echo json_encode(["quotes" => $quotes, "settings" => $settings]);
    exit;
}

// ----------------------------------------------------------------------------
// ENDPOINT: SALVAR ORÇAMENTO
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save_quote') {
    $body = json_decode(file_get_contents("php://input"), true);
    if (!$body || !isset($body['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Dados do orçamento inválidos"]);
        exit;
    }

    $total = isset($body['totalAmount']) ? floatval($body['totalAmount']) : 0;

    $stmt = $pdo->prepare("
        INSERT INTO orcamentos (id, numero, cliente_nome, cliente_telefone, data_orcamento, validade, status, valor_total, payload_json)
        VALUES (:id, :numero, :cliente_nome, :cliente_telefone, :data_orcamento, :validade, :status, :valor_total, :payload_json)
        ON DUPLICATE KEY UPDATE
            numero = VALUES(numero),
            cliente_nome = VALUES(cliente_nome),
            cliente_telefone = VALUES(cliente_telefone),
            data_orcamento = VALUES(data_orcamento),
            validade = VALUES(validade),
            status = VALUES(status),
            valor_total = VALUES(valor_total),
            payload_json = VALUES(payload_json)
    ");

    $stmt->execute([
        ':id' => $body['id'],
        ':numero' => $body['number'] ?? '',
        ':cliente_nome' => $body['client']['name'] ?? '',
        ':cliente_telefone' => $body['client']['phone'] ?? '',
        ':data_orcamento' => $body['date'] ?? date('Y-m-d'),
        ':validade' => $body['validUntil'] ?? date('Y-m-d'),
        ':status' => $body['status'] ?? 'rascunho',
        ':valor_total' => $total,
        ':payload_json' => json_encode($body, JSON_UNESCAPED_UNICODE)
    ]);

    echo json_encode(["ok" => true, "id" => $body['id']]);
    exit;
}

// ----------------------------------------------------------------------------
// ENDPOINT: EXCLUIR ORÇAMENTO
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete_quote') {
    $body = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("DELETE FROM orcamentos WHERE id = :id");
    $stmt->execute([':id' => $body['id'] ?? '']);
    echo json_encode(["ok" => true]);
    exit;
}

// ----------------------------------------------------------------------------
// ENDPOINT: SALVAR CONFIGURAÇÕES DA EMPRESA
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save_settings') {
    $body = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("
        INSERT INTO configuracoes_empresa (id, settings_json)
        VALUES (1, :json)
        ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)
    ");
    $stmt->execute([':json' => json_encode($body, JSON_UNESCAPED_UNICODE)]);
    echo json_encode(["ok" => true]);
    exit;
}
?>`;
}

export function generateStandaloneHtmlFile(
  company: CompanySettings,
  quotes: Quote[],
  authSettings?: AuthSettings
): string {
  const initialDataJson = JSON.stringify({
    company,
    quotes,
    auth: authSettings || {
      adminUsername: 'admin',
      adminPassword: 'admin123',
      adminName: 'Administrador',
    },
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${company.brandTitle} — Gerador de Orçamentos & Mini CRM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Montserrat:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-display { font-family: 'Montserrat', sans-serif; }
    .font-mono, .tabular-nums { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { background: #fff !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
      #pdf-sheet { width: 210mm !important; min-height: 297mm !important; box-shadow: none !important; border: none !important; margin: 0 !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <div id="app"></div>
  <script>
    const INITIAL_SEED = ${initialDataJson};
    const STORAGE_QUOTES_KEY = 'reformas_pinturas_quotes_v1';
    const STORAGE_COMPANY_KEY = 'reformas_pinturas_company_v1';
    const STORAGE_AUTH_KEY = 'reformas_pinturas_auth_v1';
    const STORAGE_SESSION_KEY = 'reformas_pinturas_session_v1';

    let state = {
      isLoggedIn: !!localStorage.getItem(STORAGE_SESSION_KEY),
      tab: 'novo',
      search: '',
      statusFilter: 'todos',
      company: JSON.parse(localStorage.getItem(STORAGE_COMPANY_KEY) || 'null') || INITIAL_SEED.company,
      quotes: JSON.parse(localStorage.getItem(STORAGE_QUOTES_KEY) || 'null') || INITIAL_SEED.quotes,
      auth: JSON.parse(localStorage.getItem(STORAGE_AUTH_KEY) || 'null') || INITIAL_SEED.auth,
      currentQuote: null,
      loginError: null
    };
    state.currentQuote = JSON.parse(JSON.stringify(state.quotes[0]));

    function saveState() {
      localStorage.setItem(STORAGE_COMPANY_KEY, JSON.stringify(state.company));
      localStorage.setItem(STORAGE_QUOTES_KEY, JSON.stringify(state.quotes));
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(state.auth));
    }

    function doLogin(e) {
      e.preventDefault();
      const u = document.getElementById('login-user').value.trim();
      const p = document.getElementById('login-pass').value;
      if (u.toLowerCase() === state.auth.adminUsername.toLowerCase() && p === state.auth.adminPassword) {
        state.isLoggedIn = true;
        localStorage.setItem(STORAGE_SESSION_KEY, 'true');
        state.loginError = null;
        render();
      } else {
        state.loginError = 'Usuário ou senha incorretos.';
        render();
      }
    }

    function doLogout() {
      state.isLoggedIn = false;
      localStorage.removeItem(STORAGE_SESSION_KEY);
      render();
    }

    function formatBRL(v) {
      return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDateBr(d) {
      if (!d) return '';
      const p = d.split('-');
      return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
    }

    function calcTotal(q) {
      if (!q) return 0;
      return typeof q.totalAmount === 'number' ? q.totalAmount : (Number(q.totalAmount) || 0);
    }

    function exportDirectPdf() {
      const q = state.currentQuote;
      if (!q.client.name || !q.items.length) {
        alert('Preencha o nome do cliente e adicione pelo menos 1 item ao escopo.');
        return;
      }
      const el = document.getElementById('pdf-sheet');
      if (window.html2pdf) {
        window.html2pdf().set({
          margin: 0,
          filename: 'Orcamento_' + (q.number || '001').replace(/\\//g, '-') + '.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(el).save();
      } else {
        window.print();
      }
    }

    function render() {
      const appEl = document.getElementById('app');

      // Tela de Login se não estiver autenticado
      if (!state.isLoggedIn) {
        appEl.innerHTML = \`
          <div class="min-h-screen flex items-center justify-center p-4 bg-slate-100">
            <div class="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
              <div class="bg-[#0B3B68] text-white p-6 text-center">
                <h1 class="font-display text-xl font-bold uppercase">\${state.company.brandTitle}</h1>
                <p class="text-xs text-slate-300 mt-1">Acesso Protegido por Senha</p>
              </div>
              <form onsubmit="doLogin(event)" class="p-6 space-y-4">
                \${state.loginError ? \`<div class="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">\${state.loginError}</div>\` : ''}
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Usuário</label>
                  <input id="login-user" type="text" value="\${state.auth.adminUsername}" class="w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg" required />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
                  <input id="login-pass" type="password" value="\${state.auth.adminPassword}" class="w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg" required />
                </div>
                <button type="submit" class="w-full py-2.5 bg-[#0B3B68] text-white text-sm font-bold rounded-lg hover:bg-[#082d50]">Entrar</button>
                <div class="text-center text-[11px] text-slate-500">Padrão: <strong>\${state.auth.adminUsername}</strong> / <strong>\${state.auth.adminPassword}</strong></div>
              </form>
            </div>
          </div>
        \`;
        return;
      }

      const q = state.currentQuote;
      const total = calcTotal(q);
      const totalOrcado = state.quotes.reduce((s, item) => s + calcTotal(item), 0);
      const totalAprovado = state.quotes.filter(x => x.status === 'aprovado').reduce((s, item) => s + calcTotal(item), 0);

      appEl.innerHTML = \`
        <header class="no-print bg-[#0B3B68] text-white border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div class="font-display font-extrabold text-lg tracking-tight">\${state.company.brandTitle} — \${state.company.brandSubtitle}</div>
          <nav class="flex items-center gap-2">
            <button onclick="state.tab='novo';render()" class="px-3.5 py-1.5 rounded text-sm font-medium \${state.tab==='novo'?'bg-[#F5C518] text-[#0B3B68] font-bold':'text-slate-200 hover:text-white'}">Novo Orçamento</button>
            <button onclick="state.tab='crm';render()" class="px-3.5 py-1.5 rounded text-sm font-medium \${state.tab==='crm'?'bg-[#F5C518] text-[#0B3B68] font-bold':'text-slate-200 hover:text-white'}">Orçamentos Salvos (\${state.quotes.length})</button>
            <button onclick="state.tab='config';render()" class="px-3.5 py-1.5 rounded text-sm font-medium \${state.tab==='config'?'bg-[#F5C518] text-[#0B3B68] font-bold':'text-slate-200 hover:text-white'}">Configurações</button>
          </nav>
          <div class="flex items-center gap-2">
            <button onclick="exportDirectPdf()" class="px-4 py-2 bg-[#F5C518] text-[#0B3B68] font-bold text-xs rounded hover:opacity-95">Baixar PDF</button>
            <button onclick="window.print()" class="px-3 py-2 bg-white/10 text-white font-semibold text-xs rounded hover:bg-white/20">Imprimir</button>
            <button onclick="doLogout()" title="Sair do sistema" class="px-3 py-2 text-xs bg-red-900/60 hover:bg-red-800 text-white rounded">Sair</button>
          </div>
        </header>
        <main class="max-w-7xl mx-auto p-4 md:p-6">
          <div class="no-print mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-slate-200">
            <div><div class="text-xs text-slate-500">Total Orçado</div><div class="text-xl font-bold text-[#0B3B68] font-mono">\${formatBRL(totalOrcado)}</div></div>
            <div><div class="text-xs text-slate-500">Total Aprovado</div><div class="text-xl font-bold text-emerald-700 font-mono">\${formatBRL(totalAprovado)}</div></div>
            <div><div class="text-xs text-slate-500">Orçamento em Edição</div><div class="text-xl font-bold text-slate-900 font-mono">Nº \${q.number} — \${formatBRL(total)}</div></div>
          </div>
          <div id="pdf-sheet" class="bg-white p-10 max-w-[794px] min-h-[1123px] mx-auto border border-slate-200 shadow">
            <div class="flex justify-between items-start border-b-2 border-[#0B3B68] pb-4 mb-5">
              <div>
                <h1 class="font-display text-3xl font-black text-[#0B3B68] uppercase">\${state.company.brandTitle}</h1>
                <div class="font-display text-lg font-extrabold text-[#0B3B68] uppercase">\${state.company.brandSubtitle}</div>
                <div class="text-xs tracking-widest uppercase text-slate-600 mt-1">\${state.company.brandTagline}</div>
              </div>
              <div class="text-xs text-slate-700 border-l-2 border-[#0B3B68] pl-4 space-y-1">
                <div><strong>CNPJ:</strong> \${state.company.cnpj}</div>
                <div>\${state.company.addressLine1}</div>
                <div>\${state.company.addressLine2}</div>
                <div><strong>Tel:</strong> \${state.company.phone}</div>
              </div>
            </div>
            <div class="grid grid-cols-4 border-b-2 border-[#0B3B68] pb-3 mb-5 items-center">
              <div class="font-display text-2xl font-black text-[#0B3B68]">ORÇAMENTO</div>
              <div class="border-l-2 border-[#0B3B68] pl-3 font-bold text-[#0B3B68]">Nº \${q.number}</div>
              <div class="border-l-2 border-[#0B3B68] pl-3 text-xs">DATA<br><strong class="font-mono text-sm">\${formatDateBr(q.date)}</strong></div>
              <div class="border-l-2 border-[#0B3B68] pl-3 text-xs">VALIDADE<br><strong class="font-mono text-sm">\${formatDateBr(q.validUntil)}</strong></div>
            </div>
            <div class="bg-[#F0F5FA] p-4 rounded mb-5 text-xs space-y-1">
              <div><strong>Cliente:</strong> \${q.client.name}</div>
              <div><strong>Endereço:</strong> \${q.client.street}, \${q.client.number} - \${q.client.neighborhood} - \${q.client.city}</div>
              <div><strong>A/C:</strong> \${q.client.contactPerson} | <strong>Tel:</strong> \${q.client.phone}</div>
            </div>
            <h3 class="font-display font-extrabold text-sm text-[#0B3B68] uppercase mb-2">ESCOPO DOS SERVIÇOS</h3>
            <div class="divide-y divide-slate-200 mb-6">
              \${q.items.map((it, idx) => \`<div class="py-2.5 flex items-center gap-3 text-xs text-slate-800"><span class="w-5 h-5 rounded-full bg-[#0B3B68] text-white inline-flex items-center justify-center font-bold shrink-0 text-[11px]">\${idx+1}</span><span class="leading-relaxed">\${it.description}</span></div>\`).join('')}
            </div>
            <div class="grid grid-cols-2 gap-6 mb-6 text-xs">
              <div><h4 class="font-display font-bold text-[#0B3B68] uppercase mb-2">CONDIÇÕES GERAIS</h4><div class="whitespace-pre-line text-slate-700">\${q.generalConditions}</div></div>
              <div><h4 class="font-display font-bold text-[#0B3B68] uppercase mb-2">PRAZO DE EXECUÇÃO</h4><div class="whitespace-pre-line text-slate-700">\${q.executionTime}</div></div>
            </div>
            <div class="bg-[#E8F1F8] p-5 rounded-xl grid grid-cols-2 gap-6 mb-8">
              <div><div class="font-display font-extrabold text-sm text-[#0B3B68]">INVESTIMENTO</div><div class="font-display text-2xl font-black text-[#0B3B68] mt-1">\${formatBRL(total)}</div></div>
              <div><div class="font-display font-extrabold text-sm text-[#0B3B68]">CONDIÇÕES DE PAGAMENTO</div><div class="text-xs whitespace-pre-line mt-1 text-slate-800">\${q.paymentConditions}</div></div>
            </div>
            <div class="grid grid-cols-2 gap-12 pt-10 text-center text-xs">
              <div class="border-t border-[#0B3B68] pt-2"><strong class="uppercase text-[#0B3B68]">\${q.companySigner}</strong><br>CONTRATADA</div>
              <div class="border-t border-[#0B3B68] pt-2"><strong class="uppercase text-[#0B3B68]">\${q.clientSigner}</strong><br>CONTRATANTE</div>
            </div>
          </div>
        </main>
      \`;
    }
    render();
  </script>
</body>
</html>`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
