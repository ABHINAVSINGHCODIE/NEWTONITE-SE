import React from 'react';
import { WorkItem, Role, ItemStatus } from '../types';
import { Hand, MessageSquare } from 'lucide-react';

interface ItemBoardViewProps {
  items: WorkItem[];
  userRole: Role | null;
  onSelect: (item: WorkItem) => void;
  onClaim: (item: WorkItem, e: React.MouseEvent) => void;
}

const COLUMNS: { key: ItemStatus; label: string; color: string }[] = [
  { key: 'Open', label: 'Open', color: 'var(--status-open)' },
  { key: 'In_Progress', label: 'In Progress', color: 'var(--status-inprogress)' },
  { key: 'Awaiting_Approval', label: 'Awaiting Approval', color: 'var(--status-awaiting)' },
  { key: 'Resolved', label: 'Resolved', color: 'var(--status-resolved)' },
  { key: 'Closed', label: 'Closed', color: 'var(--status-closed)' },
];

export const ItemBoardView: React.FC<ItemBoardViewProps> = ({
  items,
  userRole,
  onSelect,
  onClaim,
}) => {
  const canClaim = userRole !== 'Viewer' && userRole !== null;

  return (
    <div className="kanban-grid">
      {COLUMNS.map((col) => {
        const columnItems = items.filter((i) => i.status === col.key);

        return (
          <div key={col.key} className="kanban-column">
            {/* Column Header */}
            <div className="kanban-column-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: col.color,
                  }}
                />
                <span style={{ color: '#fff' }}>{col.label}</span>
              </div>
              <span className="version-pill">{columnItems.length}</span>
            </div>

            {/* Column Body */}
            <div className="kanban-column-body">
              {columnItems.map((item) => (
                <div
                  key={item.id}
                  className="kanban-card"
                  onClick={() => onSelect(item)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`badge-tag priority-${item.priority}`}>
                      {item.priority}
                    </span>
                    <span className="version-pill">v{item.version}</span>
                  </div>

                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.35 }}>
                    {item.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    {item.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div
                          className="user-avatar-small"
                          style={{ width: '20px', height: '20px', fontSize: '0.6rem' }}
                        >
                          {item.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                          {item.assignee.name.split(' ')[0]}
                        </span>
                      </div>
                    ) : canClaim ? (
                      <button
                        className="btn-figma-secondary"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', color: '#818cf8' }}
                        onClick={(e) => onClaim(item, e)}
                      >
                        <Hand size={11} /> Claim
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                        Unassigned
                      </span>
                    )}

                    {item._count?.comments ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#64748b', fontSize: '0.7rem' }}>
                        <MessageSquare size={11} /> {item._count.comments}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
