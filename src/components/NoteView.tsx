import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { getFileBlob, updateFileBlob } from '../storage/fileRepo';

interface NoteViewProps {
  fileId: string;
  fileName: string;
  onBack: () => void;
}

const SAVE_DEBOUNCE_MS = 500;

export function NoteView({ fileId, fileName, onBack }: NoteViewProps) {
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: { class: 'note-editor' },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(() => {
        const json = JSON.stringify(editor.getJSON());
        updateFileBlob(fileId, new Blob([json], { type: 'application/json' }));
      }, SAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    let cancelled = false;
    getFileBlob(fileId).then(async (blob) => {
      if (!blob || cancelled || !editor) return;
      const text = await blob.text();
      if (!text.trim()) {
        setLoaded(true);
        return;
      }
      try {
        const json = JSON.parse(text);
        editor.commands.setContent(json);
      } catch {
        // ignore malformed content
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fileId, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    };
  }, []);

  if (!editor) return null;

  const buttons: { label: string; title: string; action: () => void; active: () => boolean }[] = [
    {
      label: 'B',
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      active: () => editor.isActive('bold'),
    },
    {
      label: 'I',
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: () => editor.isActive('italic'),
    },
    {
      label: 'H1',
      title: 'Heading',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: () => editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      title: 'Subheading',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => editor.isActive('heading', { level: 2 }),
    },
    {
      label: '•',
      title: 'Bullet list',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: () => editor.isActive('bulletList'),
    },
    {
      label: '1.',
      title: 'Numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: () => editor.isActive('orderedList'),
    },
    {
      label: '"',
      title: 'Quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: () => editor.isActive('blockquote'),
    },
  ];

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-group">
          <button onClick={onBack} title="Back to files">
            Files
          </button>
          <span className="toolbar-filename" title={fileName}>
            {fileName}
          </span>
        </div>
        <div className="toolbar-group">
          {buttons.map((b) => (
            <button key={b.title} className={b.active() ? 'active' : ''} onClick={b.action} title={b.title}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="main-area">
        <div className="note-scroll">
          <div className="note-page">{loaded && <EditorContent editor={editor} />}</div>
        </div>
      </div>
    </>
  );
}
