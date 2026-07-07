import { Node, mergeAttributes } from '@tiptap/core';

export interface FileLinkAttrs {
  targetId: string;
  targetName: string;
  targetKind: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileLink: {
      insertFileLink: (attrs: FileLinkAttrs) => ReturnType;
    };
  }
}

export const FileLinkNode = Node.create({
  name: 'fileLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      targetId: { default: null },
      targetName: { default: '' },
      targetKind: { default: 'note' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-file-link]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-file-link': '',
        'data-target-id': node.attrs.targetId,
        class: 'note-link-chip',
        contenteditable: 'false',
      }),
      `🔗 ${node.attrs.targetName}`,
    ];
  },

  addCommands() {
    return {
      insertFileLink:
        (attrs: FileLinkAttrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});
