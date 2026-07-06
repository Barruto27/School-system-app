import { useCallback, useRef, useState } from 'react';
import { pdfjsLib, type PDFDocumentProxy } from '../pdf/pdfjs';
import type { SearchRect } from '../components/PageView';

export interface SearchMatch {
  pageIndex: number;
  rect: SearchRect;
}

interface PageTextCache {
  items: { str: string; rect: SearchRect }[];
}

export function useSearch(doc: PDFDocumentProxy | null, numPages: number) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const cacheRef = useRef<Map<number, PageTextCache>>(new Map());

  const getPageText = useCallback(
    async (pageIndex: number): Promise<PageTextCache> => {
      const cached = cacheRef.current.get(pageIndex);
      if (cached) return cached;
      if (!doc) return { items: [] };
      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const items: PageTextCache['items'] = [];
      for (const raw of textContent.items) {
        const item = raw as { str: string; transform: number[]; width: number; height: number };
        if (!item.str || !item.str.trim()) continue;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const scaleX = Math.hypot(tx[0], tx[1]) || 1;
        const height = Math.hypot(tx[2], tx[3]) || item.height || 10;
        const width = item.width * scaleX;
        const x = tx[4];
        const y = tx[5] - height;
        items.push({
          str: item.str,
          rect: {
            x: x / viewport.width,
            y: y / viewport.height,
            w: width / viewport.width,
            h: height / viewport.height,
          },
        });
      }
      const result = { items };
      cacheRef.current.set(pageIndex, result);
      return result;
    },
    [doc],
  );

  const search = useCallback(
    async (q: string) => {
      setQuery(q);
      cacheRef.current.clear();
      if (!doc || !q.trim()) {
        setMatches([]);
        setActiveIndex(0);
        return;
      }
      const needle = q.trim().toLowerCase();
      const found: SearchMatch[] = [];
      for (let p = 0; p < numPages; p++) {
        const { items } = await getPageText(p);
        for (const item of items) {
          if (item.str.toLowerCase().includes(needle)) {
            found.push({ pageIndex: p, rect: item.rect });
          }
        }
      }
      setMatches(found);
      setActiveIndex(0);
    },
    [doc, numPages, getPageText],
  );

  const next = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((i) => (i + 1) % matches.length);
  }, [matches]);

  const prev = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
  }, [matches]);

  return { query, matches, activeIndex, search, next, prev };
}
