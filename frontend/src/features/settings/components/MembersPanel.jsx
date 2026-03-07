import { useEffect, useState } from 'react';
import { Users, ExternalLink, UserPlus, UserCheck, UserX, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/services/axios';

const ROLE_COLORS = {
  admin:     { bg: 'rgba(196,113,58,0.12)', text: '#c4713a' },
  hr:        { bg: 'rgba(99,102,241,0.12)',  text: '#6366f1' },
  team_lead: { bg: 'rgba(20,184,166,0.12)', text: '#14b8a6' },
  member:    { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

const STATUS_COLORS = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a' },
  INACTIVE:  { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
  ON_NOTICE: { bg: 'rgba(234,179,8,0.12)',  text: '#ca8a04' },
  EXITED:    { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

const MembersPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users?page=1&limit=6')
      .then(r => setUsers(r.data.users ?? r.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const roleCount = {};
  const statusCount = {};
  users.forEach(u => {
    roleCount[u.role] = (roleCount[u.role] || 0) + 1;
    statusCount[u.employmentStatus] = (statusCount[u.employmentStatus] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Members</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Overview of workspace members. Full management in User Management.</p>
      </div>

      {/* Quick stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <Users size={18} />, label: 'Total Members', value: users.length, color: 'var(--brand)' },
            { icon: <UserCheck size={18} />, label: 'Active', value: statusCount['ACTIVE'] ?? 0, color: '#22c55e' },
            { icon: <UserX size={18} />, label: 'Inactive', value: (statusCount['INACTIVE'] ?? 0) + (statusCount['EXITED'] ?? 0), color: '#ef4444' },
            { icon: <Shield size={18} />, label: 'Admins', value: (roleCount['admin'] ?? 0) + (roleCount['hr'] ?? 0), color: '#6366f1' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="rounded-xl border p-4 flex items-center gap-3"
              style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1a`, color }}>
                {icon}
              </div>
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent members table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Recent Members</h3>
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border transition-colors hover:opacity-80"
            style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}>
            <ExternalLink size={12} /> Manage All Members
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 mb-3 animate-pulse">
                <div className="w-8 h-8 rounded-full" style={{ background: 'var(--border-mid)' }} />
                <div className="flex-1 h-4 rounded" style={{ background: 'var(--border-soft)' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {users.slice(0, 6).map(u => {
              const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.member;
              const sc = STATUS_COLORS[u.employmentStatus] ?? STATUS_COLORS.INACTIVE;
              return (
                <div key={u._id} className="flex items-center gap-4 px-6 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'var(--brand)' }}>
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded capitalize hidden sm:block"
                    style={{ background: rc.bg, color: rc.text }}>{u.role?.replace('_', ' ')}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded hidden sm:block"
                    style={{ background: sc.bg, color: sc.text }}>{u.employmentStatus}</span>
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <button onClick={() => navigate('/users')}
              className="flex items-center gap-2 text-sm font-medium w-full justify-center py-2 rounded border transition-colors hover:opacity-80"
              style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}>
              <UserPlus size={14} /> Invite &amp; Manage Members
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersPanel;
