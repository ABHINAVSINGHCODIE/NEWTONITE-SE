import React from 'react';
import { WorkItem, Role } from '../types';
import { MessageSquare, Clock, User as UserIcon, CheckCircle, Hand } from 'lucide-react';

interface ItemCardProps {
  item: WorkItem;
  userRoleInTeam: Role | null;
  onSelect: (item: WorkItem) => void;
  onClaim: (item: WorkItem, e: React.MouseEvent) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  userRoleInTeam,
  onSelect,
  onClaim,
}) => {
  const canClaim =
    !item.assignee &&
    item.status !== 'Closed' &&
    userRoleInTeam !== 'Viewer' &&
    userRoleInTeam !== null;

  return (
    <div className="item-card" onClick={() => onSelect(item)}>
      <div>
        <div className="card-header">
          <div className="card-tags">
            <span className={`badge priority-${item.priority}`}>{item.priority}</span>
            <span className={`badge status-${item.status}`}>
              {item.status.replace('_', ' ')}
            </span>
            <span className="type-pill">{item.type.replace('_', ' ')}</span>
          </div>

          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>v{item.version}</span>
        </div>

        <h3 className="card-title" style={{ marginTop: '0.65rem' }}>
          {item.title}
        </h3>
        <p className="card-desc" style={{ marginTop: '0.35rem' }}>
          {item.description}
        </p>
      </div>

      <div>
        <div className="card-footer">
          <div className="assignee-info">
            {item.assignee ? (
              <>
                <div className="avatar">
                  {item.assignee.name.charAt(0).toUpperCase()}
                </div>
                <span>{item.assignee.name}</span>
              </>
            ) : canClaim ? (
              <button
                className="btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#6366f1' }}
                onClick={(e) => onClaim(item, e)}
              >
                <Hand size={12} /> Claim
              </button>
            ) : (
              <span style={{ color: '#64748b', fontStyle: 'italic' }}>Unassigned</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {item._count?.comments ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MessageSquare size={13} /> {item._count.comments}
              </span>
            ) : null}
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
