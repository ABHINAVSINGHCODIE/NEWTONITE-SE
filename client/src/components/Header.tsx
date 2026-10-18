import React from 'react';
import { Search, Plus, LayoutList, Kanban, Filter } from 'lucide-react';
import { Role } from '../types';

export type ViewLayout = 'table' | 'board';

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewLayout: ViewLayout;
  onViewLayoutChange: (layout: ViewLayout) => void;
  onOpenNewModal: () => void;
  currentRole: Role | null;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  searchQuery,
  onSearchChange,
  viewLayout,
  onViewLayoutChange,
  onOpenNewModal,
  currentRole,
}) => {
  const canCreate = currentRole !== 'Viewer' && currentRole !== null;

  return (
    <header className="figma-header">
      {/* Left: View Title */}
      <div className="header-left">
        <h1 className="view-heading">
          <span>{title}</span>
        </h1>
      </div>

      {/* Right: Search, View Switcher & Action */}
      <div className="header-right">
        {/* Search */}
        <div className="linear-search">
          <Search size={14} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search issues, tickets, errors..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="search-shortcut">⌘K</span>
        </div>

        {/* View Toggle (Table / Board) */}
        <div className="btn-toggle-group">
          <button
            className={`btn-toggle ${viewLayout === 'table' ? 'active' : ''}`}
            onClick={() => onViewLayoutChange('table')}
            title="Table List View"
          >
            <LayoutList size={16} />
          </button>
          <button
            className={`btn-toggle ${viewLayout === 'board' ? 'active' : ''}`}
            onClick={() => onViewLayoutChange('board')}
            title="Kanban Board View"
          >
            <Kanban size={16} />
          </button>
        </div>

        {/* Create Issue Button */}
        {canCreate && (
          <button className="btn-figma-primary" onClick={onOpenNewModal}>
            <Plus size={15} />
            <span>New Issue</span>
          </button>
        )}
      </div>
    </header>
  );
};
