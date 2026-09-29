import { Quote, QuoteItem } from '../types';

export function formatCurrency(value: number): string {
  const safeVal = Number.isFinite(value) ? value : 0;
  return safeVal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateQuoteTotal(quoteOrAmount: Quote | number | QuoteItem[]): number {
  if (typeof quoteOrAmount === 'number') {
    return Number.isFinite(quoteOrAmount) ? quoteOrAmount : 0;
  }
  if (quoteOrAmount && typeof quoteOrAmount === 'object') {
    if ('totalAmount' in quoteOrAmount && typeof quoteOrAmount.totalAmount === 'number') {
      return quoteOrAmount.totalAmount;
    }
  }
  return 0;
}

export function formatDateBr(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function formatDateLongPtBr(isoDate: string, city: string): string {
  const cleanCity = (city || 'Rio de Janeiro').trim();
  if (!isoDate) {
    const now = new Date();
    return `${cleanCity}, ${now.getDate()} de ${MONTHS_PT[now.getMonth()]} de ${now.getFullYear()}.`;
  }
  const parts = isoDate.split('-');
  if (parts.length !== 3) return `${cleanCity}, ${isoDate}.`;
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = MONTHS_PT[monthIndex] || MONTHS_PT[0];
  return `${cleanCity}, ${day} de ${monthName} de ${year}.`;
}

/**
 * Converte um valor numérico em Reais (BRL) para texto por extenso em português brasileiro.
 * Ex: 5500 -> "cinco mil e quinhentos reais"
 */
export function valorPorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return 'zero reais';

  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
  ];
  const especiais = [
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ];
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  function converteGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    const c = Math.floor(n / 100);
    const resto = n % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;

    const partes: string[] = [];
    if (c > 0) partes.push(centenas[c]);

    if (resto > 0) {
      if (resto < 10) {
        partes.push(unidades[resto]);
      } else if (resto < 20) {
        partes.push(especiais[resto - 10]);
      } else {
        let dezenaStr = dezenas[d];
        if (u > 0) {
          dezenaStr += ` e ${unidades[u]}`;
        }
        partes.push(dezenaStr);
      }
    }

    return partes.join(' e ');
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const partesReais: string[] = [];

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const restoMilhoes = inteiro % 1000000;
    const milhares = Math.floor(restoMilhoes / 1000);
    const centenasGrupo = restoMilhoes % 1000;

    if (milhoes > 0) {
      const txtMilhoes = converteGrupo(milhoes);
      partesReais.push(milhoes === 1 ? `${txtMilhoes} milhão` : `${txtMilhoes} milhões`);
    }

    if (milhares > 0) {
      if (milhares === 1) {
        partesReais.push('mil');
      } else {
        partesReais.push(`${converteGrupo(milhares)} mil`);
      }
    }

    if (centenasGrupo > 0) {
      const txtCentenas = converteGrupo(centenasGrupo);
      if (
        partesReais.length > 0 &&
        (centenasGrupo < 100 || centenasGrupo % 100 === 0)
      ) {
        const last = partesReais.pop()!;
        partesReais.push(`${last} e ${txtCentenas}`);
      } else {
        partesReais.push(txtCentenas);
      }
    }
  }

  let resultado = '';
  if (inteiro > 0) {
    const sufixoReal = inteiro === 1 ? 'real' : 'reais';
    resultado = `${partesReais.join(', ')} ${sufixoReal}`;
  }

  if (centavos > 0) {
    const txtCentavos = converteGrupo(centavos);
    const sufixoCentavo = centavos === 1 ? 'centavo' : 'centavos';
    if (resultado) {
      resultado += ` e ${txtCentavos} ${sufixoCentavo}`;
    } else {
      resultado = `${txtCentavos} ${sufixoCentavo}`;
    }
  }

  return resultado;
}
