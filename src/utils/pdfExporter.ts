import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CompanySettings, Quote } from '../types';
import {
  calculateQuoteTotal,
  formatCurrency,
  formatDateBr,
  valorPorExtenso,
} from './formatters';

export function buildQuoteFilename(quote: Quote): string {
  const safeNum = (quote.number || '001').replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeClient = (quote.client.name || 'Cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `Orcamento_${safeNum}_${safeClient || 'Cliente'}.pdf`;
}

export async function exportElementToPdfFile(
  element: HTMLElement,
  quote: Quote
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 850,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  pdf.save(buildQuoteFilename(quote));
}

export function buildShareSummaryText(
  quote: Quote,
  company: CompanySettings
): string {
  const total = typeof quote.totalAmount === 'number' ? quote.totalAmount : 0;
  const extenso = valorPorExtenso(total);
  const itemsList = quote.items
    .map((item, idx) => `${idx + 1}. ${item.description}`)
    .join('\n');

  return [
    `*${company.brandTitle} ${company.brandSubtitle}*`,
    `*ORÇAMENTO Nº ${quote.number}*`,
    `Data: ${formatDateBr(quote.date)} | Validade: ${formatDateBr(quote.validUntil)}`,
    ``,
    `*Cliente:* ${quote.client.name}`,
    quote.client.contactPerson ? `*A/C:* ${quote.client.contactPerson}` : '',
    ``,
    `*ESCOPO DOS SERVIÇOS:*`,
    itemsList,
    ``,
    `*PRAZO DE EXECUÇÃO:*`,
    quote.executionTime,
    ``,
    `*INVESTIMENTO TOTAL:* ${formatCurrency(total)} (${extenso})`,
    `*CONDIÇÕES DE PAGAMENTO:*`,
    quote.paymentConditions,
    ``,
    `Atenciosamente,`,
    `${quote.companySigner || company.brandTitle} — Tel. ${company.phone}`,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');
}
