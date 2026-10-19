import React from 'react';
import { WorkItem, Role } from '../types';
import { CheckSquare, AlertCircle, ArrowUp, ArrowDown, Hand, ChevronRight, Check, Play, Clock, RotateCcw } from 'lucide-react';

interface JiraBoardProps {
  items: WorkItem[];
  userRole: Role | null;
  onSelect: (item: WorkItem) => void;
  onClaim: (item: WorkItem, e: React.MouseEvent) => void;
  onStatusChange?: (item: WorkItem, newStatus: string) => void;
}

interface ColumnDef {
  key: string;
  label: string;
  status: string;
  filter: (item: WorkItem) => boolean;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'todo',
    label: 'TO DO',
    status: 'Open',
    filter: (i) => i.status === 'Open',
  },
  {
    key: 'inprogress',
    label: 'IN PROGRESS',
    status: 'In_Progress',
    filter: (i) => i.status === 'In_Progress',
  },
  {
    key: 'review',
    label: 'CODE REVIEW / APPROVAL',
    status: 'Awaiting_Approval',
    filter: (i) => i.status === 'Awaiting_Approval',
  },
  {
    key: 'done',
    label: 'DONE',
    status: 'Resolved',
    filter: (i) => i.status === 'Resolved' || i.status === 'Closed',
  },
];

export const JiraBoard: React.FC<JiraBoardProps> = ({
  items,
  userRole,
  onSelect,
  onClaim,
  onStatusChange,
}) => {
  const canClaim = userRole !== 'Viewer' && userRole !== null;
  const isLead = userRole === 'Lead' || userRole === 'Admin';
  const canEdit = userRole !== 'Viewer' && userRole !== null;

  const getTeamTagClass = (teamName: string) => {
    if (teamName.includes('Platform')) return 'tag-Core';
    if (teamName.includes('Payment')) return 'tag-Payments';
    if (teamName.includes('Trust')) return 'tag-Trust';
    return 'tag-Compliance';
  };

  return (
    <div className="jira-board-canvas">
      {COLUMNS.map((col) => {
        const colItems = items.filter(col.filter);

        return (
          <div key={col.key} className="jira-column">
            {/* Header */}
            <div className="jira-column-header">
              <span>{col.label}</span>
              <span style={{ background: '#dfe1e6', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div className="jira-column-cards">
              {colItems.map((item) => {
                const isUrgent = item.priority === 'urgent' || item.priority === 'high';

                return (
                  <div
                    key={item.id}
                    className="jira-card"
                    onClick={() => onSelect(item)}
                    style={{ position: 'relative' }}
                  >
                    {/* Title */}
                    <div className="jira-card-title">{item.title}</div>

                    {/* Team Tag */}
                    <div className={`jira-card-tag ${getTeamTagClass(item.team.name)}`}>
                      {item.team.name}
                    </div>

                    {/* Bottom Metadata Bar */}
                    <div className="jira-card-bottom">
                      <div className="jira-card-id-row">
                        {item.type === 'incident' ? (
                          <AlertCircle size={14} style={{ color: '#de350b' }} />
                        ) : (
                          <CheckSquare size={14} style={{ color: '#0052cc' }} />
                        )}

                        {isUrgent ? (
                          <ArrowUp size={14} style={{ color: '#de350b' }} />
                        ) : (
                          <ArrowDown size={14} style={{ color: '#00875a' }} />
                        )}

                        <span>OPS-{item.id.slice(0, 4).toUpperCase()}</span>
                        <span style={{ fontSize: '0.68rem', color: '#7a869a' }}>v{item.version}</span>
                      </div>

                      {/* Assignee / Claim */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {item.assignee ? (
                          <div className="jira-avatar" title={`Assigned to ${item.assignee.name}`}>
                            {item.assignee.name.charAt(0).toUpperCase()}
                          </div>
                        ) : canClaim ? (
                          <button
                            className="btn-primary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={(e) => onClaim(item, e)}
                          >
                            <Hand size={11} style={{ marginRight: '3px' }} /> Claim
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#7a869a', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Move Transition Footer */}
                    {canEdit && onStatusChange && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          paddingTop: '0.45rem',
                          borderTop: '1px solid #f4f5f7',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.status === 'Open' && (
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '0.18rem 0.45rem',
                              fontSize: '0.68rem',
                              color: '#0052cc',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            onClick={() => onStatusChange(item, 'In_Progress')}
                            title="Move to In Progress"
                          >
                            <Play size={10} /> Start Work →
                          </button>
                        )}

                        {item.status === 'In_Progress' && (
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '0.18rem 0.45rem',
                              fontSize: '0.68rem',
                              color: '#ff8b00',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            onClick={() => onStatusChange(item, 'Awaiting_Approval')}
                            title="Submit for Lead Review"
                          >
                            <Clock size={10} /> Review →
                          </button>
                        )}

                        {item.status === 'Awaiting_Approval' && isLead && (
                          <button
                            className="btn-primary"
                            style={{
                              padding: '0.18rem 0.45rem',
                              fontSize: '0.68rem',
                              background: '#00875a',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            onClick={() => onStatusChange(item, 'Resolved')}
                            title="Approve & Resolve"
                          >
                            <Check size={10} /> Approve ✓
                          </button>
                        )}

                        {(item.status === 'Resolved' || item.status === 'Closed') && (
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '0.18rem 0.45rem',
                              fontSize: '0.68rem',
                              color: '#5e6c84',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            onClick={() => onStatusChange(item, 'In_Progress')}
                            title="Re-open ticket"
                          >
                            <RotateCcw size={10} /> Reopen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
