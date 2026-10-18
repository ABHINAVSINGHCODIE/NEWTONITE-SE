import React from 'react';
import { User, Role } from '../types';
import { Layers, Plus, ShieldCheck, Users } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  demoUsers: User[];
  onSwitchUser: (email: string) => void;
  onOpenNewModal: () => void;
  selectedTeamId: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  demoUsers,
  onSwitchUser,
  onOpenNewModal,
  selectedTeamId,
}) => {
  // Determine current role in selected team
  const currentMembership = currentUser?.memberships.find(
    (m) => m.teamId === selectedTeamId
  ) || currentUser?.memberships[0];

  const currentRole = currentMembership?.role || 'Viewer';

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Layers className="text-indigo-400" size={24} />
        <span>Newtonite Ops</span>
        <span className="brand-badge">Under Pressure</span>
      </div>

      <div className="nav-controls">
        {/* Reviewer / Demo User Switcher */}
        <div className="user-switcher" title="Quick switch user role for evaluation">
          <Users size={16} className="text-gray-400" />
          <select
            value={currentUser?.email || ''}
            onChange={(e) => onSwitchUser(e.target.value)}
          >
            {demoUsers.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name} ({u.memberships.map((m) => `${m.teamName}: ${m.role}`).join(', ')})
              </option>
            ))}
          </select>
          {currentMembership && (
            <span className={`role-pill role-${currentRole}`}>
              {currentRole}
            </span>
          )}
        </div>

        {/* Create Work Item Button (enabled for Member, Lead, Admin) */}
        {currentRole !== 'Viewer' && (
          <button className="btn-primary" onClick={onOpenNewModal}>
            <Plus size={16} />
            <span>New Ticket</span>
          </button>
        )}
      </div>
    </nav>
  );
};
