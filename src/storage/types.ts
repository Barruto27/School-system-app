/** Sentinel id meaning "top level" — IndexedDB indexes silently skip records
 * whose indexed field is null/undefined, so folders/files use this string
 * instead of null to represent "no parent". */
export const ROOT_ID = 'root';

export interface Folder {
  id: string;
  name: string;
  parentId: string;
  createdAt: number;
}

export type FileKind = 'pdf' | 'image' | 'doc' | 'other';

export interface FileEntry {
  id: string;
  name: string;
  folderId: string;
  kind: FileKind;
  mimeType: string;
  size: number;
  dateAdded: number;
  /** Deliberately included but unused until a later stage: keeping the
   * schema as folders+tags (not folders-only) avoids retrofitting auto-sort
   * and cross-linking onto a too-rigid file/folder model later. */
  tags: string[];
}
