import { useEffect, useRef, useState } from 'react';
import type { Folder } from '../storage/types';

export type Nav = { type: 'home' } | { type: 'folder'; id: string };

interface AppSidebarProps {
  topFolders: Folder[];
  nav: Nav;
  onSelectHome: () => void;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onCreatePage: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const ROW_H = 36;
const ROW_GAP = 2;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

export function AppSidebar({
  topFolders,
  nav,
  onSelectHome,
  onSelectFolder,
  onCreateFolder,
  onCreatePage,
  width,
  onWidthChange,
  collapsed,
  onToggleCollapsed,
}: AppSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const resizing = useRef(false);

  const items: { key: string; label: string; onClick: () => void }[] = [
    { key: 'home', label: 'Home', onClick: onSelectHome },
    ...topFolders.map((f) => ({ key: f.id, label: f.name, onClick: () => onSelectFolder(f.id) })),
  ];
  const selectedIndex = items.findIndex((item) =>
    nav.type === 'home' ? item.key === 'home' : item.key === nav.id,
  );

  const commitCreate = () => {
    const name = newName.trim();
    if (name) onCreateFolder(name);
    setCreating(false);
    setNewName('');
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizing.current) return;
      onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      resizing.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onWidthChange]);

  return (
    <>
      {collapsed && (
        <button className="sidebar-expand-toggle" onClick={onToggleCollapsed} title="Show sidebar">
          »
        </button>
      )}
      <div className="app-sidebar" style={{ width: collapsed ? 0 : width }}>
        <div className="app-sidebar-inner" style={{ width }}>
          <div className="app-sidebar-header">
            <span className="app-sidebar-title">Personal Knowledge OS</span>
            <button className="sidebar-collapse-toggle" onClick={onToggleCollapsed} title="Hide sidebar">
              «
            </button>
          </div>

          <nav className="app-sidebar-nav">
            {selectedIndex >= 0 && (
              <div
                className="nav-indicator"
                style={{ transform: `translateY(${selectedIndex * (ROW_H + ROW_GAP)}px)` }}
              />
            )}
            {items.map((item, i) => (
              <button
                key={item.key}
                className={`nav-item ${i === selectedIndex ? 'selected' : ''}`}
                onClick={item.onClick}
              >
                {item.key === 'home' ? '🏠' : '📁'} {item.label}
              </button>
            ))}
            {creating && (
              <input
                autoFocus
                className="nav-create-input"
                value={newName}
                placeholder="Folder name"
                onChange={(e) => setNewName(e.target.value)}
                onBlur={commitCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    setCreating(false);
                    setNewName('');
                  }
                }}
              />
            )}
          </nav>

          <div className="app-sidebar-actions">
            <button
              onClick={() => {
                setCreating(true);
                setNewName('');
              }}
            >
              + Folder
            </button>
            <button onClick={onCreatePage}>+ Page</button>
          </div>
        </div>

        {!collapsed && (
          <div
            className="sidebar-resize-handle"
            onPointerDown={(e) => {
              e.preventDefault();
              resizing.current = true;
            }}
          />
        )}
      </div>
    </>
  );
}
