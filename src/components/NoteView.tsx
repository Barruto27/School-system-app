import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { getFileBlob, updateFileBlob } from '../storage/fileRepo';

interface NoteViewProps {
  fileId: string;
  fileName: string;
}

const SAVE_DEBOUNCE_MS = 500;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function NoteView({ fileId, fileName }: NoteViewProps) {
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: { class: 'note-editor' },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(async (file) => {
          const src = await fileToDataUrl(file);
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
        });
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(async (file) => {
          const src = await fileToDataUrl(file);
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
        });
        return true;
      },
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

  const insertImage = async (file: File) => {
    const src = await fileToDataUrl(file);
    editor.chain().focus().setImage({ src }).run();
  };

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
      label: '☑',
      title: 'Checklist',
      action: () => editor.chain().focus().toggleTaskList().run(),
      active: () => editor.isActive('taskList'),
    },
    {
      label: '"',
      title: 'Quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: () => editor.isActive('blockquote'),
    },
    {
      label: '</>',
      title: 'Code block',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: () => editor.isActive('codeBlock'),
    },
  ];

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-group">
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
          <button onClick={() => imageInputRef.current?.click()} title="Insert image">
            🖼
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) insertImage(file);
              e.target.value = '';
            }}
          />
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
