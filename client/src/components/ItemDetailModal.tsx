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
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{item.title}</h2>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', background: '#1e293b', padding: '0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Actions:</span>

            {/* Atomic Claim */}
            {!item.assignee && canModify && (
              <button className="btn-primary" onClick={handleClaim} disabled={loading}>
                <Hand size={14} /> Claim Ticket
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
                    <ArrowRight size={14} />
                    <span>Move to {target.replace('_', ' ')}</span>
                    {requiresApproval && (
                      <span style={{ fontSize: '0.65rem', background: '#581c87', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
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
                <button className="btn-primary" onClick={handleSaveEdit} disabled={loading}>
                  Save Changes (v{item.version})
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>DESCRIPTION</div>
              <p style={{ background: '#0b1120', padding: '0.85rem', borderRadius: '8px', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {item.description}
              </p>
            </div>
          )}

          {/* Meta Attributes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#0f172a', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Team: </span>
              <strong>{item.team.name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Creator: </span>
              <strong>{item.creator.name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Assignee: </span>
              <strong>{item.assignee ? item.assignee.name : 'Unassigned'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Created: </span>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Activity Log & Comments */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Activity History & Comments
            </h4>

            {/* Timeline */}
            <div className="timeline">
              {activities.map((act) => (
                <div key={act.id} className="timeline-item">
                  <div className="timeline-meta">
                    <strong>{act.actor.name}</strong> • {new Date(act.createdAt).toLocaleString()}
                  </div>
                  <div className="timeline-text">
                    {act.action === 'created' && 'Created this work item.'}
                    {act.action === 'claimed' && 'Claimed this item.'}
                    {act.action === 'status_changed' && (
                      <span>Status changed from <code>{act.fromValue}</code> to <code>{act.toValue}</code></span>
                    )}
                    {act.action === 'priority_changed' && (
                      <span>Priority updated from <code>{act.fromValue}</code> to <code>{act.toValue}</code></span>
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
                <div key={c.id} style={{ background: '#1e293b', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                    <strong>{c.author.name}</strong>
                    <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div>{c.content}</div>
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
              <button type="submit" className="btn-primary" disabled={loading || !newComment.trim()}>
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
