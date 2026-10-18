import React from 'react';
import { WorkItem, Role } from '../types';
import { Hand, MessageSquare, AlertCircle, Clock } from 'lucide-react';

interface ItemTableViewProps {
  items: WorkItem[];
  userRole: Role | null;
  onSelect: (item: WorkItem) => void;
  onClaim: (item: WorkItem, e: React.MouseEvent) => void;
}

export const ItemTableView: React.FC<ItemTableViewProps> = ({
  items,
  userRole,
  onSelect,
  onClaim,
}) => {
  const canClaim = userRole !== 'Viewer' && userRole !== null;

  return (
    <div className="linear-table-card">
      <table className="linear-table">
        <thead>
          <tr>
            <th style={{ width: '90px' }}>Type</th>
            <th>Issue Title</th>
            <th style={{ width: '130px' }}>Status</th>
            <th style={{ width: '100px' }}>Priority</th>
            <th style={{ width: '140px' }}>Team</th>
            <th style={{ width: '150px' }}>Assignee</th>
            <th style={{ width: '70px' }}>Version</th>
            <th style={{ width: '100px', textAlign: 'right' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isUnassigned = !item.assignee;

            return (
              <tr key={item.id} onClick={() => onSelect(item)}>
                {/* Type */}
                <td>
                  <span className="version-pill" style={{ textTransform: 'capitalize' }}>
                    {item.type.replace('_', ' ')}
                  </span>
                </td>

                {/* Title */}
                <td>
                  <div className="issue-title-cell">
                    <span>{item.title}</span>
                    {item._count?.comments ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: '#64748b',
                          fontSize: '0.725rem',
                        }}
                      >
                        <MessageSquare size={12} /> {item._count.comments}
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* Status */}
                <td>
                  <span className={`badge-tag status-${item.status}`}>
                    <span className="badge-dot" style={{ background: 'currentColor' }}></span>
                    {item.status.replace('_', ' ')}
                  </span>
                </td>

                {/* Priority */}
                <td>
                  <span className={`badge-tag priority-${item.priority}`}>
                    {item.priority}
                  </span>
                </td>

                {/* Team */}
                <td>
                  <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                    {item.team.name}
                  </span>
                </td>

                {/* Assignee / Claim */}
                <td>
                  {item.assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div className="user-avatar-small" style={{ width: '22px', height: '22px', fontSize: '0.65rem' }}>
                        {item.assignee.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#f1f5f9' }}>
                        {item.assignee.name}
                      </span>
                    </div>
                  ) : canClaim ? (
                    <button
                      className="btn-figma-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', color: '#818cf8' }}
                      onClick={(e) => onClaim(item, e)}
                    >
                      <Hand size={12} /> Claim
                    </button>
                  ) : (
                    <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      Unassigned
                    </span>
                  )}
                </td>

                {/* Version (OCC) */}
                <td>
                  <span className="version-pill">v{item.version}</span>
                </td>

                {/* Date */}
                <td style={{ textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
