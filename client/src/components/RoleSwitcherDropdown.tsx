import React, { useState, useRef, useEffect } from 'react';
import { User, Role } from '../types';
import { ChevronDown, Check, User as UserIcon } from 'lucide-react';

interface RoleSwitcherDropdownProps {
  currentUser: User | null;
  demoUsers: User[];
  onSwitchUser: (email: string) => void;
  selectedTeamId: string;
}

export const RoleSwitcherDropdown: React.FC<RoleSwitcherDropdownProps> = ({
  currentUser,
  demoUsers,
  onSwitchUser,
  selectedTeamId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMembership = currentUser?.memberships.find(
    (m) => m.teamId === selectedTeamId
  ) || currentUser?.memberships[0];

  const currentRole = currentMembership?.role || 'Viewer';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '0.4rem 0.75rem',
          color: '#f8fafc',
          cursor: 'pointer',
          fontSize: '0.825rem',
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#2563eb',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
          }}
        >
          {currentUser?.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentUser?.name}
        </span>
        <span className={`role-pill-badge ${currentRole}`}>{currentRole}</span>
        <ChevronDown size={14} style={{ color: '#94a3b8' }} />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '360px',
            maxHeight: '420px',
            overflowY: 'auto',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75)',
            zIndex: 10002,
            padding: '0.5rem',
          }}
        >
          <div
            style={{
              padding: '0.4rem 0.6rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#94a3b8',
              letterSpacing: '0.05em',
              borderBottom: '1px solid #1e293b',
              marginBottom: '0.35rem',
            }}
          >
            Switch Reviewer Demo Account:
          </div>

          {demoUsers.map((u) => {
            const isSelected = u.id === currentUser?.id;
            const primaryRole = u.memberships[0]?.role || 'Viewer';

            return (
              <div
                key={u.id}
                onClick={() => {
                  onSwitchUser(u.email);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: isSelected ? '#38bdf8' : '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                  transition: 'background 0.15s ease',
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isSelected ? '#38bdf8' : '#334155',
                      color: isSelected ? '#000' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {u.memberships.map((m) => `${m.teamName} (${m.role})`).join(' • ') || 'No Teams'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className={`role-pill-badge ${primaryRole}`}>{primaryRole}</span>
                  {isSelected && <Check size={16} color="#38bdf8" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
