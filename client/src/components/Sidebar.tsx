import React from 'react';
import { User, Role } from '../types';
import {
  Layers,
  Inbox,
  UserCheck,
  Flame,
  Clock,
  Shield,
  CreditCard,
  Lock,
  Cpu,
  ChevronDown,
} from 'lucide-react';

export type ActiveNavTab = 'all' | 'assigned_to_me' | 'unassigned_urgent' | 'awaiting_approval';

interface SidebarProps {
  currentUser: User | null;
  demoUsers: User[];
  onSwitchUser: (email: string) => void;
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  totalCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  demoUsers,
  onSwitchUser,
  activeTab,
  onTabChange,
  selectedTeamId,
  onTeamChange,
  totalCount,
}) => {
  const currentMembership = currentUser?.memberships.find(
    (m) => m.teamId === selectedTeamId
  ) || currentUser?.memberships[0];

  const currentRole = currentMembership?.role || 'Viewer';

  const getTeamIcon = (name: string) => {
    if (name.includes('Platform')) return <Cpu size={15} className="text-indigo-400" />;
    if (name.includes('Payment')) return <CreditCard size={15} className="text-emerald-400" />;
    if (name.includes('Trust')) return <Lock size={15} className="text-amber-400" />;
    return <Shield size={15} className="text-purple-400" />;
  };

  return (
    <aside className="figma-sidebar">
      <div>
        {/* Workspace Brand Header */}
        <div className="sidebar-header">
          <div className="brand-badge-figma">
            <div className="logo-cube">
              <Layers size={16} color="#fff" />
            </div>
            <span>Newtonite Ops</span>
          </div>
          <span className="version-pill">v1.0-PROD</span>
        </div>

        {/* Navigation Section */}
        <div className="sidebar-nav">
          <div className="nav-section-title">Views</div>

          <button
            className={`sidebar-nav-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => onTabChange('all')}
          >
            <div className="nav-left">
              <Inbox size={16} />
              <span>All Work Items</span>
            </div>
            <span className="nav-badge">{totalCount}</span>
          </button>

          <button
            className={`sidebar-nav-btn ${activeTab === 'assigned_to_me' ? 'active' : ''}`}
            onClick={() => onTabChange('assigned_to_me')}
          >
            <div className="nav-left">
              <UserCheck size={16} />
              <span>Assigned to me</span>
            </div>
          </button>

          <button
            className={`sidebar-nav-btn ${activeTab === 'unassigned_urgent' ? 'active' : ''}`}
            onClick={() => onTabChange('unassigned_urgent')}
          >
            <div className="nav-left">
              <Flame size={16} style={{ color: '#f43f5e' }} />
              <span>Unassigned urgent</span>
            </div>
            <span className="pulse-dot"></span>
          </button>

          <button
            className={`sidebar-nav-btn ${activeTab === 'awaiting_approval' ? 'active' : ''}`}
            onClick={() => onTabChange('awaiting_approval')}
          >
            <div className="nav-left">
              <Clock size={16} style={{ color: '#c084fc' }} />
              <span>Awaiting approval</span>
            </div>
          </button>

          {/* Teams Section */}
          <div className="nav-section-title" style={{ marginTop: '1.25rem' }}>
            My Teams
          </div>

          <button
            className={`sidebar-nav-btn ${selectedTeamId === '' ? 'active' : ''}`}
            onClick={() => onTeamChange('')}
          >
            <div className="nav-left">
              <Layers size={15} />
              <span>All Joined Teams</span>
            </div>
          </button>

          {currentUser?.memberships.map((m) => (
            <button
              key={m.teamId}
              className={`sidebar-nav-btn ${selectedTeamId === m.teamId ? 'active' : ''}`}
              onClick={() => onTeamChange(m.teamId)}
            >
              <div className="nav-left">
                {getTeamIcon(m.teamName)}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.teamName}
                </span>
              </div>
              <span className={`role-tag ${m.role}`}>{m.role}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer / Reviewer Role Switcher */}
      <div className="sidebar-footer">
        <div className="user-profile-box">
          <div className="user-profile-header">
            <div className="user-info-text">
              <div className="user-avatar-small">
                {currentUser?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="user-name-small">{currentUser?.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{currentUser?.email}</div>
              </div>
            </div>
            <span className={`role-tag ${currentRole}`}>{currentRole}</span>
          </div>

          {/* Switch Account */}
          <div style={{ marginTop: '0.25rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>
              TEST AS ROLE (CLICK TO SWITCH):
            </div>
            <select
              className="role-switcher-select"
              value={currentUser?.email || ''}
              onChange={(e) => onSwitchUser(e.target.value)}
            >
              {demoUsers.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name} ({u.memberships.map((m) => `${m.teamName}: ${m.role}`).join(', ')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
};
