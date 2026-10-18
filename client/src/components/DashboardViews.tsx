import React from 'react';
import { Search, Filter, ShieldAlert, UserCheck, Clock, ListFilter } from 'lucide-react';
import { User, ItemPriority, ItemStatus, ItemType } from '../types';

export type ActiveTab = 'all' | 'assigned_to_me' | 'unassigned_urgent' | 'awaiting_approval';

interface DashboardViewsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: User | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  priorityFilter: string;
  onPriorityChange: (p: string) => void;
  typeFilter: string;
  onTypeChange: (t: string) => void;
  teamFilter: string;
  onTeamChange: (t: string) => void;
  totalCount: number;
}

export const DashboardViews: React.FC<DashboardViewsProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  typeFilter,
  onTypeChange,
  teamFilter,
  onTeamChange,
  totalCount,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => onTabChange('all')}
        >
          <ListFilter size={16} />
          <span>All Work Items</span>
          <span className="tab-count">{totalCount}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'assigned_to_me' ? 'active' : ''}`}
          onClick={() => onTabChange('assigned_to_me')}
        >
          <UserCheck size={16} />
          <span>Assigned to me</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'unassigned_urgent' ? 'active' : ''}`}
          onClick={() => onTabChange('unassigned_urgent')}
        >
          <ShieldAlert size={16} style={{ color: '#ef4444' }} />
          <span>Unassigned urgent</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'awaiting_approval' ? 'active' : ''}`}
          onClick={() => onTabChange('awaiting_approval')}
        >
          <Clock size={16} style={{ color: '#a855f7' }} />
          <span>Awaiting my approval</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search tickets by title or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Team Scope Filter */}
        <select
          className="filter-select"
          value={teamFilter}
          onChange={(e) => onTeamChange(e.target.value)}
        >
          <option value="">All My Teams</option>
          {currentUser?.memberships.map((m) => (
            <option key={m.teamId} value={m.teamId}>
              {m.teamName} ({m.role})
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status Filter */}
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In_Progress">In Progress</option>
          <option value="Awaiting_Approval">Awaiting Approval</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        {/* Type Filter */}
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="incident">Incident</option>
          <option value="customer_issue">Customer Issue</option>
          <option value="payment">Payment</option>
          <option value="compliance">Compliance</option>
          <option value="task">Task</option>
        </select>
      </div>
    </div>
  );
};
