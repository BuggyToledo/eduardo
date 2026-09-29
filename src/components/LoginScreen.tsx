import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, ShieldCheck, User } from 'lucide-react';
import { AuthSettings, CompanySettings } from '../types';

interface LoginScreenProps {
  company: CompanySettings;
  authSettings: AuthSettings;
  onLoginSuccess: (session: { username: string; name: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  company,
  authSettings,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const targetUser = authSettings.adminUsername.trim().toLowerCase();

    if (!cleanUser) {
      setErrorMessage('Informe o nome de usuário ou e-mail.');
      return;
    }
    if (!password) {
      setErrorMessage('Digite a sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Check credentials against configured auth settings
      if (cleanUser === targetUser && password === authSettings.adminPassword) {
        onLoginSuccess({
          username: authSettings.adminUsername,
          name: authSettings.adminName || 'Administrador',
        });
      } else {
        setErrorMessage('Usuário ou senha incorretos. Verifique suas credenciais.');
        setIsLoading(false);
      }
    }, 250);
  };

  const handleUseDefaultCredentials = () => {
    setUsername(authSettings.adminUsername);
    setPassword(authSettings.adminPassword);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Ribbon / Banner */}
        <div className="bg-[#0B3B68] text-white px-6 py-6 text-center relative overflow-hidden">
          {/* Subtle Corner Graphic */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#F5C518]/20 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-[#F5C518] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight uppercase">
            {company.brandTitle || 'OrçaReformas Pro'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Controle de Acesso ao Sistema de Orçamentos e CRM
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Usuário ou E-mail
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ex: admin"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-[#0B3B68] focus:ring-[#0B3B68]"
              />
              <span>Manter conectado</span>
            </label>

            <span className="text-slate-400 text-[11px]">
              Acesso seguro SSL
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#0B3B68] hover:bg-[#082d50] text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-md"
          >
            <LogIn className="w-4 h-4 text-[#F5C518]" />
            <span>{isLoading ? 'Verificando...' : 'Entrar no Sistema'}</span>
          </button>

          {/* Quick Default Credentials Tip */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <div className="text-[11px] text-slate-500 mb-1.5">
              Credenciais padrão configuradas:{' '}
              <strong className="text-slate-700 font-mono">
                {authSettings.adminUsername}
              </strong>{' '}
              /{' '}
              <strong className="text-slate-700 font-mono">
                {authSettings.adminPassword}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleUseDefaultCredentials}
              className="text-xs text-[#0B3B68] font-semibold hover:underline cursor-pointer"
            >
              Preencher credenciais padrão automaticamente
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-center text-[11px] text-slate-500">
          Você poderá alterar seu usuário e senha a qualquer momento nas Configurações.
        </div>
      </div>
    </div>
  );
};
