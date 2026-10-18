import React from 'react';
import { User, Role } from '../types';
import { Settings, Shield, Sliders, Database, Cpu, Check, AlertCircle } from 'lucide-react';

interface ProjectSettingsViewProps {
  currentUser: User | null;
}

export const ProjectSettingsView: React.FC<ProjectSettingsViewProps> = ({ currentUser }) => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: '#fafbfc' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#172b4d', letterSpacing: '-0.02em' }}>
          Project Settings & Governance
        </h2>
        <p style={{ fontSize: '0.825rem', color: '#5e6c84', marginTop: '0.15rem' }}>
          Operational configuration, RBAC permissions matrix, and concurrency policies.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Project Details Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#172b4d', marginBottom: '1rem' }}>
            General Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6c84' }}>Project Name</label>
              <div style={{ fontWeight: 600, color: '#172b4d', marginTop: '0.2rem' }}>Newtonite Operations</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6c84' }}>Project Key</label>
              <div style={{ fontWeight: 700, color: '#0052cc', marginTop: '0.2rem' }}>OPS</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6c84' }}>System Mode</label>
              <div style={{ fontWeight: 600, color: '#00875a', marginTop: '0.2rem' }}>Production (High Concurrency)</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6c84' }}>Active User</label>
              <div style={{ fontWeight: 600, color: '#172b4d', marginTop: '0.2rem' }}>{currentUser?.name}</div>
            </div>
          </div>
        </div>

        {/* 2. RBAC Permissions Matrix */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Shield size={18} style={{ color: '#0052cc' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#172b4d' }}>
              Role-Based Access Control (RBAC) Enforcement
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#5e6c84', marginBottom: '1rem' }}>
            All operations are strictly validated on the server via <code>AuthorizationService</code>.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#f4f5f7', borderBottom: '1px solid #dfe1e6', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.8rem', color: '#5e6c84' }}>Role</th>
                <th style={{ padding: '0.6rem 0.8rem', color: '#5e6c84' }}>Read Queue</th>
                <th style={{ padding: '0.6rem 0.8rem', color: '#5e6c84' }}>Create Tickets</th>
                <th style={{ padding: '0.6rem 0.8rem', color: '#5e6c84' }}>Claim Tickets</th>
                <th style={{ padding: '0.6rem 0.8rem', color: '#5e6c84' }}>Approve & Resolve</th>
                <th style={{ padding: '0.6rem 0.8rem', color: '#5e6c84' }}>Add Members</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f4f5f7' }}>
                <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#9333ea' }}>Admin</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Full</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Full</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Full</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f4f5f7' }}>
                <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#b45309' }}>Lead</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Team Scope</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Exclusive Lead Guard</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f4f5f7' }}>
                <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#0052cc' }}>Member</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Team Scope</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Allowed</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#de350b' }}>✕ Blocked (403)</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#de350b' }}>✕ Blocked</td>
              </tr>
              <tr>
                <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#5e6c84' }}>Viewer</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#00875a' }}>✓ Read-Only</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#de350b' }}>✕ Blocked</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#de350b' }}>✕ Blocked</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#de350b' }}>✕ Blocked</td>
                <td style={{ padding: '0.6rem 0.8rem', color: '#de350b' }}>✕ Blocked</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Concurrency & Outbox Engine Status */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Cpu size={18} style={{ color: '#00875a' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#172b4d' }}>
              Engine Status & Concurrency Guards
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#f4f5f7', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, color: '#172b4d', fontSize: '0.85rem' }}>Optimistic Concurrency (OCC)</div>
              <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginTop: '0.2rem' }}>
                Active with <code>version</code> check & increment.
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f4f5f7', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, color: '#172b4d', fontSize: '0.85rem' }}>Atomic Conditional Updates</div>
              <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginTop: '0.2rem' }}>
                <code>WHERE assignee_id IS NULL</code> (409 on collision).
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f4f5f7', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, color: '#172b4d', fontSize: '0.85rem' }}>Transactional Outbox Worker</div>
              <div style={{ fontSize: '0.75rem', color: '#00875a', marginTop: '0.2rem', fontWeight: 600 }}>
                ● Active (3000ms polling, 5 max attempts).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
