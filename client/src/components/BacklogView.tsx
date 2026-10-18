import React, { useState } from 'react';
import { WorkItem, Role } from '../types';
import { CheckSquare, AlertCircle, ArrowUp, ArrowDown, Play, Plus, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';

interface BacklogViewProps {
  items: WorkItem[];
  userRole: Role | null;
  onSelect: (item: WorkItem) => void;
  onOpenNewModal: () => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  items,
  userRole,
  onSelect,
  onOpenNewModal,
}) => {
  const [sprintOpen, setSprintOpen] = useState(true);
  const [backlogOpen, setBacklogOpen] = useState(true);

  // Split into active sprint and backlog queue
  const sprintItems = items.slice(0, 8);
  const backlogItems = items.slice(8);

  const canEdit = userRole !== 'Viewer' && userRole !== null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: '#fafbfc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#172b4d', letterSpacing: '-0.02em' }}>
            Backlog & Sprint Planning
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#5e6c84', marginTop: '0.15rem' }}>
            Prioritize backlog items, estimate points, and plan active operational sprints.
          </p>
        </div>

        {canEdit && (
          <button
            className="btn-primary"
            style={{ background: '#0052cc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={onOpenNewModal}
          >
            <Plus size={15} /> Create Issue
          </button>
        )}
      </div>

      {/* 1. Active Sprint Section */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dfe1e6',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#f4f5f7',
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setSprintOpen(!sprintOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {sprintOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#172b4d' }}>
              Operational Sprint 42 (Active)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84', background: '#ebecf0', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>
              {sprintItems.length} issues
            </span>
            <span style={{ fontSize: '0.725rem', color: '#00875a', fontWeight: 600 }}>
              • Ends in 4 days
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84' }}>Est. Points: 28</span>
            {canEdit && (
              <button
                className="btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
                onClick={(e) => {
                  e.stopPropagation();
                  alert('Sprint 42 completed! Velocity recorded.');
                }}
              >
                Complete Sprint
              </button>
            )}
          </div>
        </div>

        {sprintOpen && (
          <div style={{ padding: '0.5rem' }}>
            {sprintItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  borderBottom: '1px solid #f4f5f7',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f5f7')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {item.type === 'incident' ? (
                    <AlertCircle size={14} style={{ color: '#de350b' }} />
                  ) : (
                    <CheckSquare size={14} style={{ color: '#0052cc' }} />
                  )}
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0052cc', fontSize: '0.75rem' }}>
                    OPS-{item.id.slice(0, 4).toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 600, color: '#172b4d' }}>{item.title}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '3px',
                      background: item.status === 'Resolved' ? '#e3fcef' : '#deebff',
                      color: item.status === 'Resolved' ? '#006644' : '#0747a6',
                      fontWeight: 700,
                    }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#5e6c84' }}>v{item.version}</span>
                  {item.assignee ? (
                    <div className="jira-avatar" style={{ width: '20px', height: '20px', fontSize: '0.6rem' }}>
                      {item.assignee.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#7a869a' }}>Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Backlog Pool Section */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dfe1e6',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#f4f5f7',
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setBacklogOpen(!backlogOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {backlogOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#172b4d' }}>Backlog Queue</span>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84', background: '#ebecf0', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>
              {backlogItems.length} issues
            </span>
          </div>

          {canEdit && (
            <button
              className="btn-secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
              onClick={(e) => {
                e.stopPropagation();
                alert('Created Sprint 43 draft.');
              }}
            >
              + Create Sprint
            </button>
          )}
        </div>

        {backlogOpen && (
          <div style={{ padding: '0.5rem' }}>
            {backlogItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  borderBottom: '1px solid #f4f5f7',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f5f7')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {item.priority === 'urgent' ? (
                    <ArrowUp size={14} style={{ color: '#de350b' }} />
                  ) : (
                    <ArrowDown size={14} style={{ color: '#00875a' }} />
                  )}
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5e6c84', fontSize: '0.75rem' }}>
                    OPS-{item.id.slice(0, 4).toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 500, color: '#172b4d' }}>{item.title}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '3px',
                      background: '#ebecf0',
                      color: '#42526e',
                      fontWeight: 600,
                    }}
                  >
                    {item.team.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#7a869a' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
