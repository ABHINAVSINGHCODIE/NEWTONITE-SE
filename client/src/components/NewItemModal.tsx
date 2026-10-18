import React, { useState } from 'react';
import { User, ItemType, ItemPriority, WorkItem } from '../types';
import { api } from '../api';
import { X, PlusCircle } from 'lucide-react';

interface NewItemModalProps {
  currentUser: User | null;
  onClose: () => void;
  onItemCreated: (item: WorkItem) => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  currentUser,
  onClose,
  onItemCreated,
}) => {
  const defaultTeam = currentUser?.memberships[0]?.teamId || '';
  const [teamId, setTeamId] = useState(defaultTeam);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ItemType>('incident');
  const [priority, setPriority] = useState<ItemPriority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a client-side idempotency key for this form session
  const [idempotencyKey] = useState(
    () => `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !teamId) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await api.createItem(
        {
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          teamId,
        },
        idempotencyKey
      );

      onItemCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create work item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} className="text-indigo-400" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create New Work Item</h2>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert-banner alert-danger">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Team</label>
            <select
              className="form-control"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
            >
              {currentUser?.memberships.map((m) => (
                <option key={m.teamId} value={m.teamId}>
                  {m.teamName} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Critical DB connection timeout in billing queue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Type</label>
              <select
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value as ItemType)}
              >
                <option value="incident">Incident</option>
                <option value="customer_issue">Customer Issue</option>
                <option value="payment">Payment</option>
                <option value="compliance">Compliance</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                className="form-control"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ItemPriority)}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Provide context, reproduction steps, or relevant operational metadata..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Idempotency-Key enabled: {idempotencyKey.slice(0, 16)}...
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
