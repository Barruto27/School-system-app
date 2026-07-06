import { PDFArray, PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';
import type { Annotation } from '../annotations/types';
import { hexToRgb01 } from './color';

function addStickyNote(
  pdfDoc: PDFDocument,
  page: import('pdf-lib').PDFPage,
  x: number,
  y: number,
  contents: string,
  color: [number, number, number],
) {
  const context = pdfDoc.context;
  const annotDict = context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Rect: [x, y - 12, x + 24, y + 12],
    Contents: PDFString.of(contents || ''),
    Name: 'Comment',
    C: color,
    Open: false,
  });
  const annotRef = context.register(annotDict);
  const existing = page.node.lookup(PDFName.of('Annots'));
  if (existing instanceof PDFArray) {
    existing.push(annotRef);
  } else {
    page.node.set(PDFName.of('Annots'), context.obj([annotRef]));
  }
}

export async function exportAnnotatedPdf(
  originalBytes: ArrayBuffer,
  annotations: Annotation[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const byPage = new Map<number, Annotation[]>();
  for (const a of annotations) {
    const list = byPage.get(a.page) ?? [];
    list.push(a);
    byPage.set(a.page, list);
  }

  for (const [pageIndex, pageAnnotations] of byPage) {
    const page = pages[pageIndex];
    if (!page) continue;
    const width = page.getWidth();
    const height = page.getHeight();

    for (const a of pageAnnotations) {
      const [r, g, b] = hexToRgb01(a.color);
      if (a.type === 'draw' || a.type === 'highlight') {
        const thickness = Math.max(0.5, a.strokeWidth * width);
        const opacity = a.type === 'highlight' ? 0.35 : 1;
        for (let i = 0; i < a.points.length - 1; i++) {
          const p1 = a.points[i];
          const p2 = a.points[i + 1];
          page.drawLine({
            start: { x: p1.x * width, y: height - p1.y * height },
            end: { x: p2.x * width, y: height - p2.y * height },
            thickness,
            color: rgb(r, g, b),
            opacity,
          });
        }
      } else if (a.type === 'text') {
        const fontSize = Math.max(4, a.fontSize * height);
        page.drawText(a.text, {
          x: a.position.x * width,
          y: height - a.position.y * height - fontSize,
          size: fontSize,
          font,
          color: rgb(r, g, b),
        });
      } else if (a.type === 'comment') {
        const x = a.position.x * width;
        const y = height - a.position.y * height;
        page.drawCircle({
          x,
          y,
          size: 8,
          color: rgb(r, g, b),
          opacity: 0.9,
        });
        addStickyNote(pdfDoc, page, x, y, a.text, [r, g, b]);
      }
    }
  }

  return pdfDoc.save();
}
