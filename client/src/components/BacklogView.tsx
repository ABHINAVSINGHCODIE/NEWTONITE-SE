import React, { useState, useMemo } from 'react';
import { WorkItem, Role } from '../types';
import {
  CheckSquare,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Play,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Flame,
  MoveRight,
  Check,
  RotateCcw,
} from 'lucide-react';

interface BacklogViewProps {
  items: WorkItem[];
  userRole: Role | null;
  onSelect: (item: WorkItem) => void;
  onOpenNewModal: () => void;
  onStatusChange?: (item: WorkItem, newStatus: string) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  items,
  userRole,
  onSelect,
  onOpenNewModal,
  onStatusChange,
}) => {
  const [sprintOpen, setSprintOpen] = useState(true);
  const [nextSprintOpen, setNextSprintOpen] = useState(true);
  const [backlogOpen, setBacklogOpen] = useState(true);

  // Dynamic Sprint assignment state: map itemId -> 'sprint-42' | 'sprint-43' | 'backlog'
  const [itemSprintMap, setItemSprintMap] = useState<Record<string, string>>({});
  const [activeSprintNumber, setActiveSprintNumber] = useState(42);
  const [sprintNotice, setSprintNotice] = useState<string | null>(null);

  // Quick inline add
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineTarget, setInlineTarget] = useState<'sprint-42' | 'backlog'>('sprint-42');

  const canEdit = userRole !== 'Viewer' && userRole !== null;

  // Determine which items belong where
  const { sprint42Items, sprint43Items, backlogItems } = useMemo(() => {
    const s42: WorkItem[] = [];
    const s43: WorkItem[] = [];
    const bl: WorkItem[] = [];

    items.forEach((item, idx) => {
      const assigned = itemSprintMap[item.id];
      if (assigned === 'sprint-42') {
        s42.push(item);
      } else if (assigned === 'sprint-43') {
        s43.push(item);
      } else if (assigned === 'backlog') {
        bl.push(item);
      } else {
        // Default initial distribution
        if (idx < 5) {
          s42.push(item);
        } else if (idx < 10) {
          s43.push(item);
        } else {
          bl.push(item);
        }
      }
    });

    return { sprint42Items: s42, sprint43Items: s43, backlogItems: bl };
  }, [items, itemSprintMap]);

  // Points estimation generator (deterministic based on title/id)
  const getPoints = (item: WorkItem) => {
    if (item.priority === 'urgent') return 8;
    if (item.priority === 'high') return 5;
    if (item.priority === 'medium') return 3;
    return 1;
  };

  const s42TotalPoints = sprint42Items.reduce((acc, i) => acc + getPoints(i), 0);
  const s42DonePoints = sprint42Items
    .filter((i) => i.status === 'Resolved' || i.status === 'Closed')
    .reduce((acc, i) => acc + getPoints(i), 0);

  const moveItem = (itemId: string, target: 'sprint-42' | 'sprint-43' | 'backlog', e: React.MouseEvent) => {
    e.stopPropagation();
    setItemSprintMap((prev) => ({ ...prev, [itemId]: target }));
    setSprintNotice(`Moved ticket OPS-${itemId.slice(0, 4).toUpperCase()} to ${target === 'sprint-42' ? 'Sprint 42' : target === 'sprint-43' ? 'Sprint 43' : 'Product Backlog'}`);
    setTimeout(() => setSprintNotice(null), 3500);
  };

  const handleCompleteSprint = (e: React.MouseEvent) => {
    e.stopPropagation();
    const incomplete = sprint42Items.filter((i) => i.status !== 'Resolved' && i.status !== 'Closed');
    // Move incomplete to sprint 43
    const updates: Record<string, string> = {};
    incomplete.forEach((item) => {
      updates[item.id] = 'sprint-43';
    });
    setItemSprintMap((prev) => ({ ...prev, ...updates }));
    setActiveSprintNumber((prev) => prev + 1);
    setSprintNotice(`Sprint ${activeSprintNumber} successfully closed! Velocity: ${s42DonePoints} points. ${incomplete.length} open items rolled into Sprint ${activeSprintNumber + 1}.`);
    setTimeout(() => setSprintNotice(null), 5000);
  };

  const renderItemRow = (item: WorkItem, currentContainer: 'sprint-42' | 'sprint-43' | 'backlog') => {
    const isResolved = item.status === 'Resolved' || item.status === 'Closed';
    const points = getPoints(item);

    return (
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
          background: '#ffffff',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f5f7')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, overflow: 'hidden' }}>
          {item.type === 'incident' ? (
            <AlertCircle size={14} style={{ color: '#de350b', flexShrink: 0 }} />
          ) : (
            <CheckSquare size={14} style={{ color: '#0052cc', flexShrink: 0 }} />
          )}

          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#0052cc',
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            OPS-{item.id.slice(0, 4).toUpperCase()}
          </span>

          <span
            style={{
              fontWeight: 600,
              color: isResolved ? '#7a869a' : '#172b4d',
              textDecoration: isResolved ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Status Badge */}
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '3px',
              background: isResolved ? '#e3fcef' : item.status === 'In_Progress' ? '#deebff' : '#f4f5f7',
              color: isResolved ? '#006644' : item.status === 'In_Progress' ? '#0747a6' : '#42526e',
              fontWeight: 700,
            }}
          >
            {item.status.replace('_', ' ')}
          </span>

          {/* Story Points */}
          <span
            style={{
              fontSize: '0.7rem',
              background: '#ebecf0',
              color: '#172b4d',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
            }}
            title="Estimated Story Points"
          >
            {points} pts
          </span>

          {/* Version badge */}
          <span style={{ fontSize: '0.7rem', color: '#7a869a' }}>v{item.version}</span>

          {/* Move item controls */}
          {canEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {currentContainer !== 'sprint-42' && (
                <button
                  className="btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem', color: '#0052cc' }}
                  onClick={(e) => moveItem(item.id, 'sprint-42', e)}
                  title="Move to Active Sprint"
                >
                  ↑ Sprint 42
                </button>
              )}
              {currentContainer !== 'sprint-43' && (
                <button
                  className="btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem' }}
                  onClick={(e) => moveItem(item.id, 'sprint-43', e)}
                  title="Move to Sprint 43"
                >
                  Sprint 43
                </button>
              )}
              {currentContainer !== 'backlog' && (
                <button
                  className="btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem' }}
                  onClick={(e) => moveItem(item.id, 'backlog', e)}
                  title="Move down to Backlog"
                >
                  ↓ Backlog
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: '#fafbfc' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#172b4d', letterSpacing: '-0.02em', margin: 0 }}>
            Dynamic Backlog & Sprint Planning
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#5e6c84', marginTop: '0.15rem' }}>
            Interactive sprint grooming, story point estimation, and live ticket distribution across sprints.
          </p>
        </div>

        {canEdit && (
          <button
            className="btn-primary"
            style={{
              background: '#0052cc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.8rem',
            }}
            onClick={onOpenNewModal}
          >
            <Plus size={15} /> Create Issue
          </button>
        )}
      </div>

      {/* Dynamic Toast Notice */}
      {sprintNotice && (
        <div
          style={{
            background: '#e3fcef',
            border: '1px solid #57d9a3',
            color: '#006644',
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,102,68,0.1)',
          }}
        >
          <Check size={16} />
          {sprintNotice}
        </div>
      )}

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
              Operational Sprint {activeSprintNumber} (Active Sprint)
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#5e6c84',
                background: '#ebecf0',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
              }}
            >
              {sprint42Items.length} issues
            </span>
            <span style={{ fontSize: '0.725rem', color: '#00875a', fontWeight: 600 }}>
              • Ends in 4 days
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>
              Points: {s42DonePoints} / {s42TotalPoints} pts done
            </span>
            {canEdit && (
              <button
                className="btn-secondary"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0052cc',
                  border: '1px solid #c1c7d0',
                }}
                onClick={handleCompleteSprint}
              >
                Complete Sprint
              </button>
            )}
          </div>
        </div>

        {sprintOpen && (
          <div style={{ padding: '0.5rem' }}>
            {sprint42Items.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#7a869a', fontSize: '0.825rem' }}>
                Sprint is currently empty. Use the buttons below or in the Backlog to pull tickets into Sprint {activeSprintNumber}!
              </div>
            ) : (
              sprint42Items.map((item) => renderItemRow(item, 'sprint-42'))
            )}
          </div>
        )}
      </div>

      {/* 2. Planned Sprint 43 Section */}
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
            background: '#fafbfc',
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setNextSprintOpen(!nextSprintOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {nextSprintOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#172b4d' }}>
              Sprint {activeSprintNumber + 1} (Planned Next)
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#5e6c84',
                background: '#ebecf0',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
              }}
            >
              {sprint43Items.length} issues
            </span>
            <span style={{ fontSize: '0.725rem', color: '#7a869a' }}>• Starts next week</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84' }}>
              Est. Points: {sprint43Items.reduce((acc, i) => acc + getPoints(i), 0)} pts
            </span>
            {canEdit && (
              <button
                className="btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSprintNotice(`Sprint ${activeSprintNumber + 1} queued for kick-off upon closing current sprint.`);
                  setTimeout(() => setSprintNotice(null), 3000);
                }}
              >
                Plan Scope
              </button>
            )}
          </div>
        </div>

        {nextSprintOpen && (
          <div style={{ padding: '0.5rem' }}>
            {sprint43Items.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#7a869a', fontSize: '0.825rem' }}>
                No tickets planned for next sprint yet.
              </div>
            ) : (
              sprint43Items.map((item) => renderItemRow(item, 'sprint-43'))
            )}
          </div>
        )}
      </div>

      {/* 3. Product Backlog Pool */}
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
            background: '#fafbfc',
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
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#172b4d' }}>
              Product Backlog Repository
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#5e6c84',
                background: '#ebecf0',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
              }}
            >
              {backlogItems.length} issues
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#5e6c84' }}>
            Unassigned Pool • Grooming Queue
          </div>
        </div>

        {backlogOpen && (
          <div style={{ padding: '0.5rem' }}>
            {backlogItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#7a869a' }}>
                Backlog is currently empty.
              </div>
            ) : (
              backlogItems.map((item) => renderItemRow(item, 'backlog'))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
