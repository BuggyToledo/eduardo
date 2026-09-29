import React from 'react';
import { CompanySettings, Quote } from '../types';
import {
  calculateQuoteTotal,
  formatCurrency,
  formatDateBr,
  formatDateLongPtBr,
  valorPorExtenso,
} from '../utils/formatters';

interface QuoteDocumentProps {
  quote: Quote;
  company: CompanySettings;
  documentRef?: React.RefObject<HTMLDivElement | null>;
}

export const QuoteDocument: React.FC<QuoteDocumentProps> = ({
  quote,
  company,
  documentRef,
}) => {
  const total = typeof quote.totalAmount === 'number' ? quote.totalAmount : 0;
  const totalExtenso = valorPorExtenso(total);

  const generalLines = (quote.generalConditions || '')
    .split('\n')
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);

  const executionLines = (quote.executionTime || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const paymentLines = (quote.paymentConditions || '')
    .split('\n')
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);

  const fullAddressParts = [
    quote.client.street
      ? `${quote.client.street}${quote.client.number ? `, ${quote.client.number}` : ''}`
      : '',
    quote.client.neighborhood,
    quote.client.city,
    quote.client.zipCode ? `CEP ${quote.client.zipCode}` : '',
  ].filter(Boolean);

  const fullClientAddress =
    fullAddressParts.join(' – ') || 'Endereço não informado';

  return (
    <div
      ref={documentRef}
      id="quote-pdf-surface"
      className="printable-quote-document relative bg-white text-[#0B3B68] w-full max-w-[794px] min-h-[1123px] mx-auto shadow-xl border border-slate-200 overflow-hidden flex flex-col justify-between select-text"
      style={{
        padding: '44px 48px 44px 48px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top-Right Decorative Corner Ribbon (matching PDF) */}
      <svg
        className="
          pointer-events-none
          absolute top-0 right-0
          w-36 h-36
        "
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="35,0 150,0 150,115" fill="#0B3B68" />
        <polygon points="15,0 42,0 150,108 150,135" fill="#F5C518" />
      </svg>

      {/* Bottom-Left Decorative Corner Ribbon (matching PDF) */}
      <svg
        className="
          pointer-events-none
          absolute bottom-0 left-0
          w-36 h-36
        "
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="0,35 115,150 0,150" fill="#0B3B68" />
        <polygon points="0,15 135,150 108,150 0,42" fill="#F5C518" />
      </svg>

      {/* Top Content Wrapper */}
      <div className="relative z-10 space-y-5">
        {/* HEADER: Brand Left + Company Info Right */}
        <div className="grid grid-cols-12 items-center gap-4 pt-1">
          <div className="col-span-7 pr-3">
            <div
              className="
                font-display text-[33px] leading-[1.02] font-black tracking-tight text-[#0B3B68] uppercase
              "
            >
              {company.brandTitle || 'EG FERREIRA'}
            </div>
            <div
              className="
                mt-1
                font-display text-[19px] leading-tight font-extrabold tracking-wide text-[#0B3B68] uppercase
              "
            >
              {company.brandSubtitle || 'PINTURAS E REFORMAS'}
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="h-[3.5px] w-11 bg-[#F5C518] shrink-0 rounded-full" />
              <span
                className="
                  text-[11px] font-semibold tracking-[0.22em] text-slate-700 uppercase whitespace-nowrap
                "
              >
                {company.brandTagline || 'PREDIAIS E RESIDENCIAIS'}
              </span>
              <span className="h-[3.5px] flex-1 max-w-12 bg-[#F5C518] rounded-full" />
            </div>
          </div>

          <div
            className="
              col-span-5 pl-5
              border-l-2 border-[#0B3B68]
              space-y-2 text-[12px] text-slate-800
            "
          >
            {company.cnpj && (
              <div className="flex items-center gap-2.5">
                <span
                  className="
                    w-5 h-5
                    rounded-[4px] bg-[#0B3B68] text-white
                    flex items-center justify-center shrink-0
                  "
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="7" x2="16" y2="7" />
                    <line x1="8" y1="11" x2="16" y2="11" />
                    <line x1="8" y1="15" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="font-medium text-slate-800">
                  CNPJ {company.cnpj}
                </span>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <span
                className="
                  mt-0.5
                  w-5 h-5
                  rounded-full bg-[#0B3B68] text-white
                  flex items-center justify-center shrink-0
                "
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div className="leading-snug text-slate-800">
                <div>{company.addressLine1}</div>
                <div>{company.addressLine2}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className="
                  w-5 h-5
                  rounded-full bg-[#0B3B68] text-white
                  flex items-center justify-center shrink-0
                "
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span className="font-medium text-slate-800">
                Tel. {company.phone}
              </span>
            </div>
          </div>
        </div>

        {/* ORÇAMENTO BANNER BAR */}
        <div
          className="
            pt-3 pb-3.5
            border-b-2 border-[#0B3B68]
            grid grid-cols-12 items-center
          "
        >
          <div className="col-span-5">
            <h2
              className="
                font-display text-[28px] font-black tracking-wide text-[#0B3B68] uppercase
              "
            >
              ORÇAMENTO
            </h2>
          </div>
          <div
            className="
              col-span-3 px-4 py-1
              border-l-2 border-[#0B3B68]
              text-center
            "
          >
            <span className="font-display text-[14px] font-bold text-[#0B3B68]">
              Nº {quote.number || '001/2026'}
            </span>
          </div>
          <div
            className="
              col-span-2 px-4 py-0.5
              border-l-2 border-[#0B3B68]
            "
          >
            <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              DATA
            </div>
            <div className="font-mono text-[13px] font-semibold text-[#0B3B68] tabular-nums">
              {formatDateBr(quote.date)}
            </div>
          </div>
          <div
            className="
              col-span-2 pl-4 py-0.5
              border-l-2 border-[#0B3B68]
            "
          >
            <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              VALIDADE
            </div>
            <div className="font-mono text-[13px] font-semibold text-[#0B3B68] tabular-nums">
              {formatDateBr(quote.validUntil)}
            </div>
          </div>
        </div>

        {/* CLIENTE BOX */}
        <div
          className="
            bg-[#F0F5FA]
            rounded-lg px-5 py-3.5
            grid grid-cols-12 items-center gap-4
          "
        >
          <div
            className="
              col-span-3 pr-3
              border-r border-slate-300
              flex items-center gap-3
            "
          >
            <svg
              className="w-8 h-8 text-[#0B3B68] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <rect x="4" y="2" width="16" height="20" rx="1" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="font-display text-[16px] font-extrabold tracking-wide text-[#0B3B68] uppercase">
              CLIENTE
            </span>
          </div>

          <div className="col-span-9 pl-2 space-y-1 text-[12.5px] text-slate-800">
            <div>
              <span className="font-semibold text-slate-700">Cliente: </span>
              <span className="font-bold text-[#0B3B68]">
                {quote.client.name || 'Nome do Cliente não informado'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#0B3B68]">Endereço: </span>
              <span>{fullClientAddress}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5">
              {quote.client.contactPerson && (
                <span>
                  <strong className="font-semibold text-slate-700">A/C: </strong>
                  {quote.client.contactPerson}
                </span>
              )}
              {quote.client.phone && (
                <span>
                  <strong className="font-semibold text-slate-700">Tel: </strong>
                  {quote.client.phone}
                </span>
              )}
              {quote.client.email && (
                <span>
                  <strong className="font-semibold text-slate-700">E-mail: </strong>
                  {quote.client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ESCOPO DOS SERVIÇOS */}
        <div className="pt-1">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="w-6 h-6 text-[#0B3B68] shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
            </svg>
            <h3
              className="
                font-display text-[16px] font-extrabold tracking-wide text-[#0B3B68] uppercase whitespace-nowrap
              "
            >
              ESCOPO DOS SERVIÇOS
            </h3>
            <div className="h-[3px] bg-[#F5C518] flex-1 rounded-full" />
          </div>

          <div className="divide-y divide-slate-200">
            {quote.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="py-2.5 flex items-center gap-3.5"
              >
                <span
                  className="
                    w-6 h-6
                    rounded-full bg-[#0B3B68] text-white
                    font-display text-[12px] font-bold
                    flex items-center justify-center shrink-0
                  "
                >
                  {idx + 1}
                </span>
                <span className="text-[12.5px] text-slate-800 leading-snug">
                  {item.description || 'Serviço sem descrição'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CONDIÇÕES GERAIS & PRAZO DE EXECUÇÃO (2 COLUMNS) */}
        <div className="grid grid-cols-12 gap-6 pt-2">
          {/* Condições Gerais */}
          <div className="col-span-6 pr-2 border-r border-slate-300">
            <div className="flex items-center gap-2.5 mb-2.5">
              <svg
                className="w-6 h-6 text-[#0B3B68] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="14" y2="17" />
              </svg>
              <h3 className="font-display text-[14.5px] font-extrabold text-[#0B3B68] uppercase whitespace-nowrap">
                CONDIÇÕES GERAIS
              </h3>
              <div className="h-[3px] bg-[#F5C518] flex-1 rounded-full" />
            </div>

            <ul className="space-y-2 text-[11.5px] text-slate-700 leading-relaxed pl-1">
              {generalLines.length > 0 ? (
                generalLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#0B3B68] font-bold mt-0.5">•</span>
                    <span>{line}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 italic">Sem condições adicionais especificadas.</li>
              )}
            </ul>
          </div>

          {/* Prazo de Execução */}
          <div className="col-span-6 pl-1">
            <div className="flex items-center gap-2.5 mb-2.5">
              <svg
                className="w-6 h-6 text-[#0B3B68] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 className="font-display text-[14.5px] font-extrabold text-[#0B3B68] uppercase whitespace-nowrap">
                PRAZO DE EXECUÇÃO
              </h3>
              <div className="h-[3px] bg-[#F5C518] flex-1 rounded-full" />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <svg
                className="w-6 h-6 text-[#0B3B68] shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
              <div className="space-y-2 text-[11.5px] text-slate-700 leading-relaxed">
                {executionLines.length > 0 ? (
                  executionLines.map((line, i) => <p key={i}>{line}</p>)
                ) : (
                  <p>Prazo a combinar.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INVESTIMENTO & CONDIÇÕES DE PAGAMENTO BOX */}
        <div
          className="
            bg-[#E8F1F8]
            rounded-xl px-6 py-5
            grid grid-cols-12 gap-6 items-start
          "
        >
          {/* Investimento */}
          <div className="col-span-6 pr-4 border-r border-slate-300/80">
            <div className="flex items-center gap-2.5">
              <svg
                className="w-6 h-6 text-[#0B3B68] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <ellipse cx="12" cy="5" rx="8" ry="3" />
                <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
                <path d="M4 10c0 1.66 3.58 3 8 3s8-1.34 8-3" />
                <path d="M4 15c0 1.66 3.58 3 8 3s8-1.34 8-3" />
              </svg>
              <div>
                <h3 className="font-display text-[15px] font-extrabold text-[#0B3B68] uppercase">
                  INVESTIMENTO
                </h3>
                <div className="h-[3px] w-24 bg-[#F5C518] rounded-full mt-0.5" />
              </div>
            </div>

            <div className="mt-3 pl-8">
              <div className="text-[11.5px] text-slate-600 font-medium">
                Valor total da obra
              </div>
              <div
                className="
                  font-display text-[28px] font-black text-[#0B3B68] leading-tight mt-0.5 tabular-nums
                "
              >
                {formatCurrency(total)}
              </div>
              <div className="h-[3px] w-36 bg-[#F5C518] rounded-full my-1.5" />
              <div className="text-[11px] text-slate-700">
                ({totalExtenso})
              </div>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div className="col-span-6 pl-2">
            <div className="flex items-center gap-2.5">
              <svg
                className="w-6 h-6 text-[#0B3B68] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="6" y1="15" x2="10" y2="15" />
              </svg>
              <div>
                <h3 className="font-display text-[15px] font-extrabold text-[#0B3B68] uppercase">
                  CONDIÇÕES DE PAGAMENTO
                </h3>
                <div className="h-[3px] w-28 bg-[#F5C518] rounded-full mt-0.5" />
              </div>
            </div>

            <ul className="mt-3 space-y-2 text-[12px] text-slate-800 leading-snug pl-2">
              {paymentLines.length > 0 ? (
                paymentLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#0B3B68] font-bold">•</span>
                    <span>{line}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500">Condições a combinar.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* FOOTER: Date, Greeting & Signatures */}
      <div className="relative z-10 pt-5">
        <div className="text-[12px] text-slate-800 space-y-1 mb-9">
          <div>{formatDateLongPtBr(quote.date, company.cityForDate)}</div>
          <div>Atenciosamente,</div>
        </div>

        <div className="grid grid-cols-2 gap-12 px-4 pb-2">
          <div className="text-center border-t-[1.5px] border-[#0B3B68] pt-2">
            <div className="font-display text-[11.5px] font-extrabold text-[#0B3B68] uppercase">
              {quote.companySigner || `${company.brandTitle} ${company.brandSubtitle}`}
            </div>
            <div className="text-[10.5px] font-medium text-slate-600 uppercase tracking-wider mt-0.5">
              CONTRATADA
            </div>
          </div>

          <div className="text-center border-t-[1.5px] border-[#0B3B68] pt-2">
            <div className="font-display text-[11.5px] font-extrabold text-[#0B3B68] uppercase">
              {quote.clientSigner || quote.client.name || 'CLIENTE'}
            </div>
            <div className="text-[10.5px] font-medium text-slate-600 uppercase tracking-wider mt-0.5">
              CONTRATANTE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
