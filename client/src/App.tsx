import React, { useState, useEffect, useCallback } from 'react';
import { User, WorkItem, ItemListResponse, Role } from './types';
import { api } from './api';
import { Navbar } from './components/Navbar';
import { DashboardViews, ActiveTab } from './components/DashboardViews';
import { ItemCard } from './components/ItemCard';
import { ItemDetailModal } from './components/ItemDetailModal';
import { NewItemModal } from './components/NewItemModal';
import { ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  // Modals
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Initialize demo users and login default user
  useEffect(() => {
    async function init() {
      try {
        const users = await api.getDemoUsers();
        setDemoUsers(users);

        // Auto-login as Lead for Core Platform by default
        const defaultUser =
          users.find((u) => u.email === 'lead.platform@newtonite.internal') || users[0];
        if (defaultUser) {
          const authData = await api.login(defaultUser.email);
          setCurrentUser(authData.user);
          if (authData.user.memberships.length > 0) {
            setTeamFilter(authData.user.memberships[0].teamId);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize demo users:', err);
      }
    }
    init();
  }, []);

  // Fetch Items
  const fetchItems = useCallback(
    async (cursor?: string) => {
      if (!currentUser) return;
      setLoading(true);
      setErrorToast(null);

      try {
        // Derive filters based on active tab
        let effectiveStatus = statusFilter;
        let effectivePriority = priorityFilter;
        let effectiveAssignee: string | undefined = undefined;

        if (activeTab === 'assigned_to_me') {
          effectiveAssignee = currentUser.id;
        } else if (activeTab === 'unassigned_urgent') {
          effectiveAssignee = 'null';
          effectivePriority = 'urgent';
        } else if (activeTab === 'awaiting_approval') {
          effectiveStatus = 'Awaiting_Approval';
        }

        const data: ItemListResponse = await api.listItems({
          status: effectiveStatus,
          priority: effectivePriority,
          type: typeFilter,
          teamId: teamFilter,
          assigneeId: effectiveAssignee,
          q: searchQuery,
          cursor,
          limit: 18,
        });

        setItems(data.items);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        setTotalCount(data.totalCount);
      } catch (err: any) {
        setErrorToast(err.message || 'Failed to load work items');
      } finally {
        setLoading(false);
      }
    },
    [currentUser, activeTab, searchQuery, statusFilter, priorityFilter, typeFilter, teamFilter]
  );

  useEffect(() => {
    setCursorHistory([]);
    fetchItems();
  }, [fetchItems]);

  // Handle pagination next
  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory((prev) => [...prev, nextCursor]);
      fetchItems(nextCursor);
    }
  };

  // Handle pagination prev
  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const newHistory = [...cursorHistory];
      newHistory.pop(); // Remove current
      const prevCursor = newHistory[newHistory.length - 1]; // Cursor for previous page
      setCursorHistory(newHistory);
      fetchItems(prevCursor);
    }
  };

  // Switch demo user
  const handleSwitchUser = async (email: string) => {
    try {
      const authData = await api.login(email);
      setCurrentUser(authData.user);
      if (authData.user.memberships.length > 0) {
        setTeamFilter(authData.user.memberships[0].teamId);
      } else {
        setTeamFilter('');
      }
    } catch (err: any) {
      setErrorToast('Failed to switch user');
    }
  };

  // Inline claim handler
  const handleInlineClaim = async (item: WorkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.claimItem(item.id);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to claim ticket');
    }
  };

  // Callback when item is updated in modal
  const handleItemUpdated = (updatedItem: WorkItem) => {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    setSelectedItem(updatedItem);
  };

  // Callback when new item is created
  const handleItemCreated = (createdItem: WorkItem) => {
    setItems((prev) => [createdItem, ...prev]);
    setTotalCount((c) => c + 1);
  };

  // Determine user role in current active team filter
  const currentTeamRole =
    currentUser?.memberships.find((m) => m.teamId === teamFilter)?.role ||
    currentUser?.memberships[0]?.role ||
    null;

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        demoUsers={demoUsers}
        onSwitchUser={handleSwitchUser}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        selectedTeamId={teamFilter}
      />

      {/* Main Content */}
      <main className="main-content">
        {errorToast && (
          <div className="alert-banner alert-danger">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{errorToast}</span>
            </div>
            <button onClick={() => setErrorToast(null)} style={{ color: '#fca5a5' }}>
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Tabs & Filters */}
        <DashboardViews
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentUser={currentUser}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          teamFilter={teamFilter}
          onTeamChange={setTeamFilter}
          totalCount={totalCount}
        />

        {/* Work Items Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            Loading work items...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <Inbox size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8' }}>
              No work items match your filter criteria
            </h3>
            <p style={{ fontSize: '0.875rem' }}>Try broadening your search or switching views.</p>
          </div>
        ) : (
          <div className="items-grid">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                userRoleInTeam={currentTeamRole}
                onSelect={setSelectedItem}
                onClaim={handleInlineClaim}
              />
            ))}
          </div>
        )}

        {/* Cursor Pagination Bar */}
        <div className="pagination">
          <button
            className="btn-secondary"
            onClick={handlePrevPage}
            disabled={cursorHistory.length === 0 || loading}
          >
            <ChevronLeft size={16} /> Previous Page
          </button>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Showing {items.length} of {totalCount} tickets
          </span>
          <button
            className="btn-secondary"
            onClick={handleNextPage}
            disabled={!hasMore || loading}
          >
            Next Page <ChevronRight size={16} />
          </button>
        </div>
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          userRole={currentTeamRole}
          currentUserId={currentUser?.id || ''}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdated}
        />
      )}

      {/* New Item Modal */}
      {isNewModalOpen && (
        <NewItemModal
          currentUser={currentUser}
          onClose={() => setIsNewModalOpen(false)}
          onItemCreated={handleItemCreated}
        />
      )}
    </div>
  );
};
