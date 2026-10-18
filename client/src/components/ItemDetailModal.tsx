import React, { useState, useEffect } from 'react';
import { WorkItem, Role, ActivityEvent, Comment, ItemStatus, ItemPriority } from '../types';
import { api, ApiError } from '../api';
import { X, RefreshCw, Send, CheckCircle2, AlertTriangle, Hand, ArrowRight, ShieldAlert } from 'lucide-react';

interface ItemDetailModalProps {
  item: WorkItem;
  userRole: Role | null;
  currentUserId: string;
  onClose: () => void;
  onItemUpdated: (updatedItem: WorkItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item: initialItem,
  userRole,
  currentUserId,
  onClose,
  onItemUpdated,
}) => {
  const [item, setItem] = useState<WorkItem>(initialItem);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictItem, setConflictItem] = useState<WorkItem | null>(null);

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(item.description);
  const [editPriority, setEditPriority] = useState<ItemPriority>(item.priority);

  // Fetch timeline and comments
  const loadActivity = async () => {
    try {
      const data = await api.getActivity(item.id);
      setActivities(data.activities);
      setComments(data.comments);
    } catch (err: any) {
      console.error('Failed to load activity:', err);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [item.id]);

  // Allowed transitions map
  const allowedTransitions: Record<ItemStatus, ItemStatus[]> = {
    Open: ['In_Progress'],
    In_Progress: ['Awaiting_Approval', 'Resolved'],
    Awaiting_Approval: ['Resolved'],
    Resolved: ['Closed', 'Open'],
    Closed: ['Open'],
  };

  const nextAllowed = allowedTransitions[item.status] || [];

  // Claim action
  const handleClaim = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updated = await api.claimItem(item.id);
      setItem(updated);
      onItemUpdated(updated);
      loadActivity();
    } catch (err: any) {
      if (err.status === 409) {
        setErrorMessage(err.message);
        if (err.latestItem) setConflictItem(err.latestItem);
      } else {
        setErrorMessage(err.message || 'Failed to claim item');
      }
    } finally {
      setLoading(false);
    }
  };

  // State Transition action
  const handleTransition = async (targetStatus: ItemStatus) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updated = await api.transitionItem(item.id, targetStatus);
      setItem(updated);
      onItemUpdated(updated);
      loadActivity();
    } catch (err: any) {
      setErrorMessage(err.message || 'Status transition failed');
    } finally {
      setLoading(false);
    }
  };

  // Save edits (with optimistic locking version check)
  const handleSaveEdit = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const updated = await api.updateItem(item.id, {
        version: item.version,
        description: editDescription,
        priority: editPriority,
      });
      setItem(updated);
      setIsEditing(false);
      onItemUpdated(updated);
      loadActivity();
    } catch (err: any) {
      if (err.status === 409) {
        setErrorMessage(err.message);
        if (err.latestItem) {
          setConflictItem(err.latestItem);
        }
      } else {
        setErrorMessage(err.message || 'Failed to update item');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const comment = await api.addComment(item.id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      loadActivity();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  // Conflict resolution: reload latest item
  const handleReloadConflict = () => {
    if (conflictItem) {
      setItem(conflictItem);
      setEditDescription(conflictItem.description);
      setEditPriority(conflictItem.priority);
      onItemUpdated(conflictItem);
      setConflictItem(null);
      setErrorMessage(null);
      loadActivity();
    }
  };

  const isLeadOrAdmin = userRole === 'Lead' || userRole === 'Admin';
  const canModify = userRole !== 'Viewer' && userRole !== null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className={`badge priority-${item.priority}`}>{item.priority}</span>
              <span className={`badge status-${item.status}`}>
                {item.status.replace('_', ' ')}
              </span>
              <span className="type-pill">{item.type.replace('_', ' ')}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Version: {item.version}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#172b4d' }}>{item.title}</h2>
          </div>
          <button onClick={onClose} style={{ color: '#5e6c84', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Conflict Error Banner */}
          {errorMessage && (
            <div className={`alert-banner ${conflictItem ? 'alert-warning' : 'alert-danger'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                <span>{errorMessage}</span>
              </div>
              {conflictItem && (
                <button
                  className="btn-secondary"
                  style={{ background: '#78350f', color: '#fef3c7', padding: '0.2rem 0.5rem' }}
                  onClick={handleReloadConflict}
                >
                  <RefreshCw size={14} /> Reload Latest
                </button>
              )}
            </div>
          )}

          {/* Quick Action Ribbon */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', background: '#f4f5f7', border: '1px solid #dfe1e6', padding: '0.75rem', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5e6c84' }}>Actions:</span>

            {/* Atomic Claim */}
            {!item.assignee && canModify && (
              <button className="btn-primary" onClick={handleClaim} disabled={loading} style={{ background: '#0052cc' }}>
                <Hand size={14} style={{ marginRight: '4px' }} /> Claim Ticket
              </button>
            )}

            {/* Workflow Transitions */}
            {canModify &&
              nextAllowed.map((target) => {
                const requiresApproval =
                  item.status === 'Awaiting_Approval' && target === 'Resolved';
                const isBlocked = requiresApproval && !isLeadOrAdmin;

                return (
                  <button
                    key={target}
                    className="btn-secondary"
                    onClick={() => handleTransition(target)}
                    disabled={loading || isBlocked}
                    title={
                      isBlocked
                        ? 'Approval transition is restricted to Team Leads or Admins'
                        : `Move to ${target.replace('_', ' ')}`
                    }
                  >
                    <ArrowRight size={14} style={{ marginRight: '4px' }} />
                    <span>Move to {target.replace('_', ' ')}</span>
                    {requiresApproval && (
                      <span style={{ fontSize: '0.65rem', background: '#eae6ff', color: '#403294', padding: '0.1rem 0.35rem', borderRadius: '3px', marginLeft: '4px', fontWeight: 700 }}>
                        Lead
                      </span>
                    )}
                  </button>
                );
              })}

            {canModify && !isEditing && (
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                Edit Details
              </button>
            )}
          </div>

          {/* Description & Metadata */}
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-control"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as ItemPriority)}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveEdit} disabled={loading} style={{ background: '#0052cc' }}>
                  Save Changes (v{item.version})
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Description
              </div>
              <p
                style={{
                  background: '#fafbfc',
                  border: '1px solid #dfe1e6',
                  color: '#172b4d',
                  padding: '0.95rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.description}
              </p>
            </div>
          )}

          {/* Meta Attributes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.85rem',
              background: '#f4f5f7',
              border: '1px solid #dfe1e6',
              padding: '0.95rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#172b4d',
            }}
          >
            <div>
              <span style={{ color: '#5e6c84', fontWeight: 600 }}>Team: </span>
              <strong style={{ color: '#0052cc' }}>{item.team.name}</strong>
            </div>
            <div>
              <span style={{ color: '#5e6c84', fontWeight: 600 }}>Creator: </span>
              <strong>{item.creator.name}</strong>
            </div>
            <div>
              <span style={{ color: '#5e6c84', fontWeight: 600 }}>Assignee: </span>
              <strong>{item.assignee ? item.assignee.name : 'Unassigned'}</strong>
            </div>
            <div>
              <span style={{ color: '#5e6c84', fontWeight: 600 }}>Created: </span>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Activity Log & Comments */}
          <div style={{ borderTop: '1px solid #dfe1e6', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172b4d', marginBottom: '0.85rem' }}>
              Activity History & Comments
            </h4>

            {/* Timeline */}
            <div className="timeline" style={{ borderLeft: '2px solid #dfe1e6' }}>
              {activities.map((act) => (
                <div key={act.id} className="timeline-item" style={{ marginBottom: '0.65rem' }}>
                  <div className="timeline-meta" style={{ color: '#5e6c84', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                    <strong style={{ color: '#172b4d' }}>{act.actor.name}</strong> • {new Date(act.createdAt).toLocaleString()}
                  </div>
                  <div className="timeline-text" style={{ color: '#172b4d', fontSize: '0.85rem' }}>
                    {act.action === 'created' && 'Created this work item.'}
                    {act.action === 'claimed' && 'Claimed this item.'}
                    {act.action === 'status_changed' && (
                      <span>
                        Status changed from <code style={{ background: '#ebecf0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{act.fromValue}</code> to <code style={{ background: '#deebff', color: '#0747a6', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{act.toValue}</code>
                      </span>
                    )}
                    {act.action === 'priority_changed' && (
                      <span>
                        Priority updated from <code>{act.fromValue}</code> to <code>{act.toValue}</code>
                      </span>
                    )}
                    {act.action === 'assigned' && (
                      <span>Assignee changed to <code>{act.toValue}</code></span>
                    )}
                    {act.action === 'comment_added' && 'Added a comment.'}
                  </div>
                </div>
              ))}
            </div>

            {/* Comments Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: '#fafbfc',
                    border: '1px solid #dfe1e6',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#172b4d',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5e6c84', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#0052cc' }}>{c.author.name}</strong>
                    <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ lineHeight: '1.4' }}>{c.content}</div>
                </div>
              ))}
            </div>

            {/* New Comment Input */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                placeholder="Write an operational note or comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ background: '#0052cc' }}
                disabled={loading || !newComment.trim()}
              >
                <Send size={14} style={{ marginRight: '4px' }} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
