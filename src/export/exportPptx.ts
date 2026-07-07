import PptxGenJS from 'pptxgenjs';
import type { Deck } from '../components/SlideView';

const SLIDE_WIDTH_IN = 10;
const SLIDE_HEIGHT_IN = 5.625;

export async function exportDeckToPptx(deck: Deck, fileName: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'PKOS_16x9', width: SLIDE_WIDTH_IN, height: SLIDE_HEIGHT_IN });
  pptx.layout = 'PKOS_16x9';

  for (const slide of deck.slides) {
    const s = pptx.addSlide();
    for (const block of slide.blocks) {
      const x = block.x * SLIDE_WIDTH_IN;
      const y = block.y * SLIDE_HEIGHT_IN;
      const w = block.w * SLIDE_WIDTH_IN;
      const h = block.h * SLIDE_HEIGHT_IN;
      if (block.type === 'text') {
        s.addText(block.text, {
          x,
          y,
          w,
          h,
          fontSize: Math.max(8, Math.round(block.fontSize * 0.6)),
          align: block.align,
          valign: 'top',
          color: '1c1c1f',
        });
      } else {
        s.addImage({ data: block.src, x, y, w, h });
      }
    }
  }

  const base = fileName.replace(/\.pptx$/i, '');
  await pptx.writeFile({ fileName: `${base}.pptx` });
}
