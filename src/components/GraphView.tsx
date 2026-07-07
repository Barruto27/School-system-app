import { useEffect, useMemo, useState } from 'react';
import { getAllFiles, getAllLinks } from '../storage/fileRepo';
import type { FileEntry, Link } from '../storage/types';
import { KIND_ICON } from '../storage/icons';

interface GraphViewProps {
  onClose: () => void;
  onOpenFile: (id: string) => void;
}

const SIZE = 560;
const RADIUS = 220;
const CENTER = SIZE / 2;

export function GraphView({ onClose, onOpenFile }: GraphViewProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    Promise.all([getAllFiles(), getAllLinks()]).then(([f, l]) => {
      setFiles(f);
      setLinks(l);
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const linkedIds = new Set<string>();
    for (const l of links) {
      linkedIds.add(l.sourceId);
      linkedIds.add(l.targetId);
    }
    const nodeFiles = files.filter((f) => linkedIds.has(f.id));
    const positions = new Map<string, { x: number; y: number }>();
    nodeFiles.forEach((f, i) => {
      const angle = (i / Math.max(1, nodeFiles.length)) * Math.PI * 2 - Math.PI / 2;
      positions.set(f.id, { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) });
    });
    const edgeLines = links
      .map((l) => ({ from: positions.get(l.sourceId), to: positions.get(l.targetId), id: l.id }))
      .filter((e): e is { from: { x: number; y: number }; to: { x: number; y: number }; id: string } => !!e.from && !!e.to);
    return { nodes: nodeFiles.map((f) => ({ file: f, pos: positions.get(f.id)! })), edges: edgeLines };
  }, [files, links]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="graph-view-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Link Graph</h2>
          <button className="settings-close" onClick={onClose} title="Close">
            x
          </button>
        </div>
        {nodes.length === 0 ? (
          <p className="backlinks-empty">No links yet. Use the 🔗 button in a note to link it to another file.</p>
        ) : (
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="graph-svg">
            {edges.map((e) => (
              <line key={e.id} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} className="graph-edge" />
            ))}
            {nodes.map(({ file, pos }) => (
              <g key={file.id} className="graph-node" onClick={() => onOpenFile(file.id)} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r={22} />
                <text y={4} textAnchor="middle" className="graph-node-icon">
                  {file.icon ?? KIND_ICON[file.kind]}
                </text>
                <text y={38} textAnchor="middle" className="graph-node-label">
                  {file.name.length > 16 ? `${file.name.slice(0, 15)}…` : file.name}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
