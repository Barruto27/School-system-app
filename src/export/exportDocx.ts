import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';

interface TiptapMark {
  type: string;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

function textRunsFromInline(nodes: TiptapNode[] = []): TextRun[] {
  const runs: TextRun[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      const bold = node.marks?.some((m) => m.type === 'bold') ?? false;
      const italics = node.marks?.some((m) => m.type === 'italic') ?? false;
      const isCode = node.marks?.some((m) => m.type === 'code') ?? false;
      runs.push(new TextRun({ text: node.text ?? '', bold, italics, font: isCode ? 'Consolas' : undefined }));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '', break: 1 }));
    }
  }
  return runs;
}

function imageParagraph(src: string): Paragraph | null {
  const match = /^data:image\/(png|jpe?g);base64,(.*)$/.exec(src);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const type = match[1] === 'png' ? 'png' : 'jpg';
  return new Paragraph({
    children: [new ImageRun({ data: bytes, type, transformation: { width: 400, height: 280 } })],
  });
}

function listItemParagraph(item: TiptapNode, prefix: string): Paragraph {
  const inner = item.content?.[0];
  return new Paragraph({ children: [new TextRun(prefix), ...textRunsFromInline(inner?.content)] });
}

function nodesToParagraphs(nodes: TiptapNode[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
        paragraphs.push(new Paragraph({ children: textRunsFromInline(node.content) }));
        break;
      case 'heading': {
        const level = node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
        paragraphs.push(new Paragraph({ heading: level, children: textRunsFromInline(node.content) }));
        break;
      }
      case 'bulletList':
        for (const item of node.content ?? []) paragraphs.push(listItemParagraph(item, '• '));
        break;
      case 'orderedList': {
        let i = 1;
        for (const item of node.content ?? []) {
          paragraphs.push(listItemParagraph(item, `${i}. `));
          i++;
        }
        break;
      }
      case 'taskList':
        for (const item of node.content ?? []) {
          paragraphs.push(listItemParagraph(item, item.attrs?.checked ? '☑ ' : '☐ '));
        }
        break;
      case 'blockquote':
        paragraphs.push(...nodesToParagraphs(node.content ?? []));
        break;
      case 'codeBlock': {
        const text = (node.content ?? []).map((n) => n.text ?? '').join('');
        paragraphs.push(new Paragraph({ children: [new TextRun({ text, font: 'Consolas' })] }));
        break;
      }
      case 'image': {
        const src = node.attrs?.src;
        const img = typeof src === 'string' ? imageParagraph(src) : null;
        if (img) paragraphs.push(img);
        break;
      }
      default:
        break;
    }
  }
  return paragraphs;
}

export async function exportNoteToDocx(json: { content?: TiptapNode[] }, fileName: string): Promise<void> {
  const paragraphs = nodesToParagraphs(json.content ?? []);
  const doc = new Document({ sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph({})] }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\.[^.]+$/, '')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
