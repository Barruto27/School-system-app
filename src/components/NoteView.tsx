import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { getFileBlob, syncOutgoingLinks, updateFileBlob } from '../storage/fileRepo';
import { EditableTitle } from './EditableTitle';
import { exportNoteToDocx } from '../export/exportDocx';
import { FileLinkNode } from '../notes/FileLinkNode';
import { FileLinkPicker } from './FileLinkPicker';

interface NoteViewProps {
  fileId: string;
  fileName: string;
  onRename: (name: string) => void;
  onNavigateToFile: (fileId: string) => void;
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

interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
}

function collectLinkTargetIds(node: JsonNode): string[] {
  const ids: string[] = [];
  if (node.type === 'fileLink' && typeof node.attrs?.targetId === 'string') {
    ids.push(node.attrs.targetId);
  }
  for (const child of node.content ?? []) ids.push(...collectLinkTargetIds(child));
  return ids;
}

export function NoteView({ fileId, fileName, onRename, onNavigateToFile }: NoteViewProps) {
  const [loaded, setLoaded] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const saveTimeout = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const onNavigateToFileRef = useRef(onNavigateToFile);
  onNavigateToFileRef.current = onNavigateToFile;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      FileLinkNode,
    ],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: { class: 'note-editor' },
      handleClick: (_view, _pos, event) => {
        const chip = (event.target as HTMLElement).closest('[data-file-link]');
        const targetId = chip?.getAttribute('data-target-id');
        if (targetId) {
          onNavigateToFileRef.current(targetId);
          return true;
        }
        return false;
      },
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
        const docJson = editor.getJSON();
        updateFileBlob(fileId, new Blob([JSON.stringify(docJson)], { type: 'application/json' }));
        syncOutgoingLinks(fileId, collectLinkTargetIds(docJson));
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
        syncOutgoingLinks(fileId, collectLinkTargetIds(json));
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

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      await exportNoteToDocx(editor.getJSON(), fileName);
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
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
      <div className="toolbar toolbar-centered">
        <div className="toolbar-group">
          <EditableTitle name={fileName} onRename={onRename} />
        </div>
        <div className="toolbar-center-cluster">
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
            <div className="file-link-picker-anchor">
              <button onClick={() => setLinkPickerOpen((v) => !v)} title="Link to another file">
                🔗
              </button>
              {linkPickerOpen && (
                <FileLinkPicker
                  excludeFileId={fileId}
                  onClose={() => setLinkPickerOpen(false)}
                  onPick={(file) => {
                    editor
                      .chain()
                      .focus()
                      .insertFileLink({ targetId: file.id, targetName: file.name, targetKind: file.kind })
                      .run();
                    setLinkPickerOpen(false);
                  }}
                />
              )}
            </div>
          </div>
          <div className="toolbar-group">
            <button onClick={handleExportPdf} title="Print or save as PDF">
              PDF
            </button>
            <button onClick={handleExportDocx} disabled={exportingDocx} title="Export as Word document">
              {exportingDocx ? 'Exporting…' : '.docx'}
            </button>
          </div>
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
