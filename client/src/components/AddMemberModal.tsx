import React, { useState } from 'react';
import { User, Role } from '../types';
import { api } from '../api';
import { X, UserPlus, Shield, Check } from 'lucide-react';

interface AddMemberModalProps {
  currentUser: User | null;
  onClose: () => void;
  onMemberAdded: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  currentUser,
  onClose,
  onMemberAdded,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState(currentUser?.memberships[0]?.teamId || '');
  const [role, setRole] = useState<Role>('Member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !teamId) {
      setError('Please provide full name, email, and select a team.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.addMember({
        name: name.trim(),
        email: email.trim(),
        teamId,
        role,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onMemberAdded();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserPlus size={20} style={{ color: '#0052cc' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Add Team Member to Operations
            </h2>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert-banner alert-danger">
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-banner" style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Work Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. john.doe@newtonite.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Designated Team</label>
            <select
              className="form-control"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
            >
              {currentUser?.memberships.map((m) => (
                <option key={m.teamId} value={m.teamId}>
                  {m.teamName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Designated Role (RBAC Scope)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
              {(['Member', 'Lead', 'Admin', 'Viewer'] as Role[]).map((r) => (
                <label
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: role === r ? 'rgba(0, 82, 204, 0.25)' : '#1e293b',
                    border: `1px solid ${role === r ? '#0052cc' : '#334155'}`,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                    color: '#f8fafc',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="radio"
                    name="designatedRole"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <span style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.35rem' }}>
              • <strong>Lead:</strong> Authorize state transitions (Awaiting Approval &rarr; Resolved)<br />
              • <strong>Member:</strong> Claim & edit tickets<br />
              • <strong>Viewer:</strong> Audit only
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ background: '#0052cc' }}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
