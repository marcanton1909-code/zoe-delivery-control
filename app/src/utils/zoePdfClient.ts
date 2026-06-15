import { ExtractedOrderDraft, OrderItem } from '../types';

type PdfPart = { str: string; x: number; y: number; page: number; width?: number };
type PdfLine = { text: string; y: number; page: number; parts: PdfPart[]; minX: number; maxX: number };

type PdfJsGlobal = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (args: { data: ArrayBuffer }) => { promise: Promise<any> };
};

type ExtractionResult = {
  draft: ExtractedOrderDraft;
  rawText: string;
  confidence: number;
  note: string;
};

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function normalizeText(value: string) {
  return (value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function moneyToNumber(value?: string) {
  if (!value) return 0;
  const n = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
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
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar PDF.js.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = PDFJS_URL;
    script.async = true;
    script.dataset.pdfjs = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar PDF.js. Revisa conexión a internet.'));
    document.head.appendChild(script);
  });
  if (!w.pdfjsLib?.getDocument) throw new Error('PDF.js no quedó disponible en el navegador.');
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  return w.pdfjsLib as PdfJsGlobal;
}

function buildLines(parts: PdfPart[], yTolerance = 4): PdfLine[] {
  const sorted = [...parts].sort((a, b) => a.page - b.page || Math.abs(b.y - a.y) > yTolerance ? b.y - a.y : a.x - b.x);
  const lines: PdfLine[] = [];
  for (const part of sorted) {
    const text = normalizeText(part.str);
    if (!text) continue;
    let line = lines.find((l) => l.page === part.page && Math.abs(l.y - part.y) <= yTolerance);
    if (!line) {
      line = { text: '', y: part.y, page: part.page, parts: [], minX: part.x, maxX: part.x };
      lines.push(line);
    }
    line.parts.push({ ...part, str: text });
    line.minX = Math.min(line.minX, part.x);
    line.maxX = Math.max(line.maxX, part.x + (part.width || 0));
  }

  return lines
    .map((line) => {
      line.parts.sort((a, b) => a.x - b.x);
      line.text = normalizeText(line.parts.map((p) => p.str).join(' '));
      return line;
    })
    .filter((line) => line.text)
    .sort((a, b) => a.page - b.page || b.y - a.y || a.minX - b.minX);
}

function linesToText(lines: PdfLine[]) {
  return lines.map((l) => l.text).join('\n');
}

function firstMatch(text: string, re: RegExp) {
  const m = text.match(re);
  return m?.[1] ? normalizeText(m[1]) : undefined;
}

function extractBlock(lines: PdfLine[], start: RegExp, stops: RegExp[]) {
  const out: string[] = [];
  let active = false;
  for (const line of lines) {
    if (!active && start.test(line.text)) {
      active = true;
      const after = normalizeText(line.text.replace(start, ''));
      if (after && !stops.some((s) => s.test(after))) out.push(after);
      continue;
    }
    if (active) {
      if (stops.some((s) => s.test(line.text))) break;
      out.push(line.text);
    }
  }
  return out.map(normalizeText).filter(Boolean);
}

function cleanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

function extractPhone(text: string) {
  const phones: string[] = [];
  const tel = text.match(/tel\s*:\s*([\d\s]{8,})/i)?.[1];
  const cel = text.match(/cel\s*:\s*([\d\s]{8,})/i)?.[1];
  if (tel) phones.push(cleanPhone(tel));
  if (cel) phones.push(cleanPhone(cel));
  const generic = text.match(/(?:\+?52\s*)?(?:\d{2}\s*)?\d{4}\s*\d{4}/g) || [];
  for (const p of generic) phones.push(cleanPhone(p));
  return phones.find((p) => p.length >= 10);
}

function extractItems(lines: PdfLine[], pageWidth: number): OrderItem[] {
  const items: OrderItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const text = line.text;
    if (/Cantidad|Descripción|Precio|Importe|Total|DIRECCI|REFERENCIAS|NOTAS/i.test(text)) continue;

    const qtyPart = line.parts.find((p) => /^\d+$/.test(p.str) && p.x > pageWidth * 0.25 && p.x < pageWidth * 0.38);
    const moneyParts = line.parts.filter((p) => /^\$?\d+[\d,.]*$/.test(p.str) && p.x > pageWidth * 0.78);
    const descParts = line.parts.filter((p) => p.x > pageWidth * 0.36 && p.x < pageWidth * 0.82 && !/^\$/.test(p.str));
    const description = normalizeText(descParts.map((p) => p.str).join(' '));

    if (!qtyPart || !description || description.length < 5) continue;
    if (!/Zoé|Zoe|Water|botellas|Paquete/i.test(description)) continue;

    const qty = Number(qtyPart.str);
    const unit = moneyToNumber(moneyParts[0]?.str);
    const amount = moneyToNumber(moneyParts[moneyParts.length - 1]?.str) || qty * unit;
    const key = `${qty}|${description.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ quantity: qty, description, unit_price: unit, amount, sort_order: items.length });
  }

  return items;
}

function parseZoeFromLines(allLines: PdfLine[], pageWidth: number): ExtractedOrderDraft {
  const fullText = linesToText(allLines);
  const leftLines = allLines.filter((l) => l.minX < pageWidth * 0.32);
  const leftText = linesToText(leftLines);

  const draft: ExtractedOrderDraft = {};
  draft.zoe_folio = firstMatch(fullText, /(?:RP\s*-\s*)?Pedido\s*#\s*(\d+)/i);
  draft.customer_company = firstMatch(fullText, /Empresa\s*:\s*([^\n]+)/i);
  draft.customer_name = firstMatch(fullText, /Nombre\s*:\s*([^\n]+)/i);
  draft.customer_contact_name = draft.customer_name;
  draft.customer_email = firstMatch(fullText, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);

  const address = extractBlock(leftLines, /DIRECCI[ÓO]N\s+DE\s+ENTREGA/i, [/^REFERENCIAS$/i, /^NOTAS$/i, /^Cantidad/i, /^Recib/i]);
  if (address.length) draft.customer_address = address.join('\n');

  const references = extractBlock(leftLines, /^REFERENCIAS$/i, [/^NOTAS$/i, /^Cantidad/i, /^Recib/i]);
  const notes = extractBlock(leftLines, /^NOTAS$/i, [/^Recib/i, /^Si tienes/i, /^Fecha$/i, /Nombre y firma/i]);
  const notesText = notes.join(' ');
  draft.delivery_reference = normalizeText([references.join(' '), notesText].filter(Boolean).join(' | '));
  draft.customer_phone = extractPhone(notesText || leftText || fullText);

  const items = extractItems(allLines, pageWidth);
  if (items.length) {
    draft.items = items;
    draft.packages_expected = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  const totalLine = allLines.find((l) => /\bTotal\b/i.test(l.text));
  if (totalLine) {
    const money = totalLine.parts.map((p) => p.str).find((s) => /^\$\d/.test(s));
    draft.order_total = moneyToNumber(money || totalLine.text);
  }
  if (!draft.order_total && items.length) draft.order_total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  draft.payment_note = 'Contamos con tu pronto pago';

  return draft;
}

function scoreDraft(draft: ExtractedOrderDraft) {
  let score = 0;
  if (draft.zoe_folio) score += 15;
  if (draft.customer_company) score += 10;
  if (draft.customer_name) score += 10;
  if (draft.customer_address && draft.customer_address.length > 10) score += 20;
  if (draft.delivery_reference) score += 10;
  if (draft.customer_phone) score += 10;
  if (draft.items?.length) score += 20;
  if (draft.order_total !== undefined) score += 5;
  return Math.min(100, score);
}

export async function extractZoeOrderFromPdfInBrowser(file: File): Promise<ExtractionResult> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const parts: PdfPart[] = [];
  let pageWidth = 612;

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1 });
    pageWidth = viewport.width || pageWidth;
    const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
    for (const item of content.items || []) {
      const it = item as any;
      const str = normalizeText(it.str || '');
      if (!str) continue;
      const t = it.transform || [1, 0, 0, 1, 0, 0];
      parts.push({ str, x: Number(t[4] || 0), y: Number(t[5] || 0), page: pageIndex, width: Number(it.width || 0) });
    }
  }

  if (!parts.length) throw new Error('El PDF no entregó texto seleccionable al navegador. Puede ser imagen/escaneo y requerir OCR.');

  const lines = buildLines(parts);
  const rawText = linesToText(lines);
  const draft = parseZoeFromLines(lines, pageWidth);
  const confidence = scoreDraft(draft);

  return {
    draft,
    rawText,
    confidence,
    note: confidence >= 70
      ? 'Datos extraídos con PDF.js en el navegador. Revisa antes de guardar.'
      : 'Se leyó texto del PDF, pero algunos campos requieren revisión manual.',
  };
}
