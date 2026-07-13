import { ExtractedOrderDraft, OrderItem } from '../types';

type PdfJsGlobal = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: any) => { promise: Promise<any> };
};

type PdfPart = { str: string; x: number; y: number; page: number; width?: number };
type PdfLine = { text: string; parts: PdfPart[]; page: number; y: number; minX: number; maxX: number };

type ExtractionResult = {
  draft: ExtractedOrderDraft;
  rawText: string;
  confidence: number;
  note: string;
};

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

declare global {
  interface Window { pdfjsLib?: PdfJsGlobal }
}

function normalizeText(value: string) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\uE000-\uF8FF]/g, ' ')
    .replace(/[\uF095☎☏]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;])/g, '$1')
    .trim();
}

function normalizeLine(value: string) {
  return normalizeText(value)
    .replace(/Direcci[oó]n de env[ií]o\s*:?/i, 'Dirección de envío:')
    .replace(/Fecha de env[ií]o/i, 'Fecha de envío');
}

function moneyToNumber(value?: string) {
  if (!value) return 0;
  const clean = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function quantityToNumber(value?: string) {
  if (!value) return 0;
  const clean = String(value).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

async function loadPdfJs(): Promise<PdfJsGlobal> {
  const w = window as any;
  if (w.pdfjsLib?.getDocument) {
    w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return w.pdfjsLib as PdfJsGlobal;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pdfjs="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar PDF.js.')));
      return;
    }
    const script = document.createElement('script');
    script.src = PDFJS_URL;
    script.async = true;
    script.dataset.pdfjs = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar PDF.js.'));
    document.head.appendChild(script);
  });

  if (!w.pdfjsLib?.getDocument) throw new Error('PDF.js no quedó disponible en el navegador.');
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  return w.pdfjsLib as PdfJsGlobal;
}

function buildLines(parts: PdfPart[]): PdfLine[] {
  const sorted = [...parts].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const groups: PdfPart[][] = [];
  const tolerance = 4;

  for (const part of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[0].page === part.page && Math.abs(last[0].y - part.y) <= tolerance) {
      last.push(part);
    } else {
      groups.push([part]);
    }
  }

  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.x - b.x);
    const text = normalizeLine(ordered.map((p) => p.str).join(' '));
    const xs = ordered.map((p) => p.x);
    const widths = ordered.map((p) => Number(p.width || 0));
    return {
      text,
      parts: ordered,
      page: ordered[0].page,
      y: ordered[0].y,
      minX: Math.min(...xs),
      maxX: Math.max(...ordered.map((p, idx) => p.x + widths[idx])),
    };
  }).filter((l) => l.text);
}

function linesToText(lines: PdfLine[]) {
  return lines.map((l) => l.text).filter(Boolean).join('\n');
}

function firstMatch(text: string, re: RegExp) {
  const m = text.match(re);
  return m?.[1] ? normalizeText(m[1]) : undefined;
}

function cleanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('52')) return digits.slice(-10);
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function extractPhone(text: string) {
  const candidates = text.match(/(?:\+?52\s*)?(?:\d{2,3}[\s.-]*)?\d{3,4}[\s.-]*\d{4}/g) || [];
  for (const c of candidates) {
    const clean = cleanPhone(c);
    if (clean.length === 10) return clean;
  }
  return undefined;
}

function extractBlockByLine(rawLines: string[], startRe: RegExp, stopRes: RegExp[]) {
  const start = rawLines.findIndex((line) => startRe.test(line));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (stopRes.some((re) => re.test(line))) break;
    if (line) out.push(line);
  }
  return out;
}

function parseDateToInput(date?: string) {
  if (!date) return undefined;
  const m = date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseMtyOutReceipt(rawLines: string[], rawText: string): ExtractedOrderDraft {
  const draft: ExtractedOrderDraft = {};

  const mty = rawText.match(/\b[A-Z]{2,4}\s*\/\s*[A-Z]{2,4}\s*\/\s*\d{3,}\b/i)?.[0];
  draft.zoe_folio = mty ? mty.replace(/\s+/g, '').toUpperCase() : firstMatch(rawText, /Orden\s*\n\s*(S\d+)/i);

  const orderNo = firstMatch(rawText, /Orden\s*\n\s*(S\d+)/i) || firstMatch(rawText, /\b(S\d{3,})\b/i);
  const shipDate = firstMatch(rawText, /Fecha\s+de\s+env[ií]o\s*\n\s*(\d{2}\/\d{2}\/\d{4})/i)
    || firstMatch(rawText, /Fecha\s+de\s+env[ií]o\s+(\d{2}\/\d{2}\/\d{4})/i)
    || firstMatch(rawText, /(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/i);
  const inputDate = parseDateToInput(shipDate);
  if (inputDate) draft.order_date = inputDate;

  const addressLines = extractBlockByLine(rawLines, /Direcci[oó]n de env[ií]o\s*:?/i, [
    /^MTY\s*\//i,
    /^Orden$/i,
    /^PRODUCTO/i,
    /^Recib[ií]/i,
    /^AGUA, VIDA/i,
    /^RFC:/i,
    /^http/i,
    /^P[áa]gina/i,
  ]).filter((line) => !/^(Transportista|Mackavi|Fecha de env)/i.test(line));

  const cleanedAddressLines = addressLines
    .map((line) => normalizeLine(line))
    .filter((line) => line && !/^\d{10}$/.test(line.replace(/\D/g, '')) && !/^tel/i.test(line));

  if (cleanedAddressLines.length) {
    const phoneIndex = cleanedAddressLines.findIndex((line) => /\d{10}/.test(line.replace(/\D/g, '')));
    const contactLines = phoneIndex >= 0 ? cleanedAddressLines.slice(0, phoneIndex) : cleanedAddressLines;
    const name = contactLines[0];
    const address = contactLines.slice(1);
    if (name) {
      draft.customer_name = name;
      draft.customer_contact_name = name;
    }
    if (address.length) draft.customer_address = address.join('\n');
  }

  draft.customer_phone = extractPhone(rawText);
  draft.customer_company = draft.customer_name || '';
  draft.customer_email = undefined;
  draft.delivery_reference = [
    orderNo ? `Orden ${orderNo}` : '',
    'Transportista Mackavi',
  ].filter(Boolean).join(' · ');
  draft.payment_note = orderNo ? `Orden ${orderNo}` : 'Recibo de entrega Zoé';

  const headerIndex = rawLines.findIndex((line) => /^PRODUCTO\s+ORDENADO\s+ENTREGADO$/i.test(line) || /^PRODUCTO$/i.test(line));
  let productLines: string[] = [];
  if (headerIndex >= 0) {
    for (let i = headerIndex + 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (/^Recib[ií]/i.test(line) || /Nombre y firma/i.test(line) || /^AGUA, VIDA/i.test(line) || /^RFC:/i.test(line) || /^http/i.test(line) || /^P[áa]gina/i.test(line)) break;
      if (/^(ORDENADO|ENTREGADO)$/i.test(line)) continue;
      if (line) productLines.push(line);
    }
  }

  let qtyLine = productLines.find((line) => /\d+(?:[.,]\d+)?\s+Pieza\s+\d+(?:[.,]\d+)?\s+Pieza/i.test(line));
  if (!qtyLine) qtyLine = rawLines.find((line) => /\d+(?:[.,]\d+)?\s+Pieza\s+\d+(?:[.,]\d+)?\s+Pieza/i.test(line));
  const qm = qtyLine?.match(/(\d+(?:[.,]\d+)?)\s+Pieza\s+(\d+(?:[.,]\d+)?)\s+Pieza/i);
  const ordered = quantityToNumber(qm?.[1]) || 0;
  const delivered = quantityToNumber(qm?.[2]) || ordered || 0;

  const descLines = productLines
    .filter((line) => line !== qtyLine)
    .filter((line) => !/^\d+(?:[.,]\d+)?\s+Pieza/i.test(line))
    .filter((line) => !/^PRODUCTO|^ORDENADO|^ENTREGADO/i.test(line));

  if (descLines.length) {
    draft.items = [{
      quantity: ordered || 1,
      description: descLines.join('\n'),
      unit_price: 0,
      amount: delivered || ordered || 1,
      sort_order: 0,
    }];
    draft.packages_expected = ordered || 1;
    draft.order_total = delivered || ordered || 1;
  }

  return draft;
}

function parseLegacyOrder(rawLines: string[], rawText: string): ExtractedOrderDraft {
  const draft: ExtractedOrderDraft = {};
  draft.zoe_folio = firstMatch(rawText, /(?:RP\s*-\s*)?Pedido\s*#\s*(\d+)/i);
  draft.customer_company = firstMatch(rawText, /Empresa\s*:\s*([^\n]+)/i);
  draft.customer_name = firstMatch(rawText, /Nombre\s*:\s*([^\n]+)/i);
  draft.customer_contact_name = draft.customer_name;
  draft.customer_email = firstMatch(rawText, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const address = extractBlockByLine(rawLines, /DIRECCI[ÓO]N\s+DE\s+ENTREGA/i, [/^REFERENCIAS$/i, /^NOTAS$/i, /^Cantidad/i, /^Recib/i]);
  if (address.length) draft.customer_address = address.join('\n');
  const references = extractBlockByLine(rawLines, /^REFERENCIAS$/i, [/^NOTAS$/i, /^Cantidad/i, /^Recib/i]);
  const notes = extractBlockByLine(rawLines, /^NOTAS$/i, [/^Cantidad/i, /^Recib/i, /^Si tienes/i]);
  draft.delivery_reference = [references.join(' '), notes.join(' ')].filter(Boolean).join(' | ');
  draft.customer_phone = extractPhone(rawText);

  const items: OrderItem[] = [];
  for (const line of rawLines) {
    const m = line.match(/^(\d+)\s+(.+?)\s+(\$[\d,.]+)\s+(\$[\d,.]+)$/);
    if (m && /Zo[eé]|Water|botellas|Paquete/i.test(m[2])) {
      items.push({ quantity: Number(m[1]), description: m[2], unit_price: moneyToNumber(m[3]), amount: moneyToNumber(m[4]), sort_order: items.length });
    }
  }
  if (items.length) {
    draft.items = items;
    draft.packages_expected = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    draft.order_total = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }
  draft.payment_note = 'Contamos con tu pronto pago';
  return draft;
}

function looksLikeNewShippingReceipt(text: string) {
  return /MTY\s*\/\s*OUT/i.test(text)
    || /Direcci[oó]n de env[ií]o/i.test(text)
    || /Fecha\s+de\s+env[ií]o/i.test(text)
    || /PRODUCTO\s+ORDENADO\s+ENTREGADO/i.test(text);
}

function scoreDraft(draft: ExtractedOrderDraft) {
  let score = 0;
  if (draft.zoe_folio) score += 18;
  if (draft.customer_name) score += 16;
  if (draft.customer_address && draft.customer_address.length > 10) score += 22;
  if (draft.customer_phone) score += 12;
  if (draft.items?.length) score += 24;
  if (draft.order_date) score += 8;
  return Math.min(100, score);
}

export async function extractZoeOrderFromPdfInBrowser(file: File): Promise<ExtractionResult> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const parts: PdfPart[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    for (const item of content.items || []) {
      const it = item as any;
      const str = normalizeLine(it.str || '');
      if (!str) continue;
      const t = it.transform || [1, 0, 0, 1, 0, 0];
      parts.push({ str, x: Number(t[4] || 0), y: Number(t[5] || 0), page: pageIndex, width: Number(it.width || 0) });
    }
  }

  if (!parts.length) throw new Error('El PDF no entregó texto seleccionable al navegador. Puede ser imagen/escaneo y requerir OCR.');

  const lines = buildLines(parts);
  const rawLines = lines.map((l) => l.text).filter(Boolean);
  const rawText = rawLines.join('\n');
  const draft = looksLikeNewShippingReceipt(rawText) ? parseMtyOutReceipt(rawLines, rawText) : parseLegacyOrder(rawLines, rawText);
  const confidence = scoreDraft(draft);

  return {
    draft,
    rawText,
    confidence,
    note: looksLikeNewShippingReceipt(rawText)
      ? 'Formato nuevo de recibo Zoé detectado. Los campos se llenaron automáticamente; revisa antes de guardar.'
      : 'Formato anterior de Zoé detectado. Los campos se llenaron automáticamente; revisa antes de guardar.',
  };
}
