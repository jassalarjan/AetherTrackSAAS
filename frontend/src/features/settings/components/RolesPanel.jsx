import { Shield, Check, X } from 'lucide-react';

const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    color: '#c4713a',
    description: 'Full workspace control. Can manage all users, settings, billing, and data.',
  },
  {
    id: 'hr',
    label: 'HR',
    color: '#6366f1',
    description: 'People operations. Can manage attendance, leaves, HR dashboard and team members.',
  },
  {
    id: 'team_lead',
    label: 'Team Lead',
    color: '#14b8a6',
    description: "Team management. Can manage their team's tasks and view team analytics.",
  },
  {
    id: 'member',
    label: 'Member',
    color: '#64748b',
    description: 'Standard user. Can manage their own tasks, log attendance, and submit leave requests.',
  },
];

const PERMISSIONS = [
  { label: 'View dashboard',          admin: true, hr: true,  team_lead: true,  member: true  },
  { label: 'Create & manage tasks',   admin: true, hr: true,  team_lead: true,  member: true  },
  { label: 'Manage team members',     admin: true, hr: true,  team_lead: true,  member: false },
  { label: 'View HR dashboard',       admin: true, hr: true,  team_lead: false, member: false },
  { label: 'Approve leave requests',  admin: true, hr: true,  team_lead: false, member: false },
  { label: 'Manage attendance',       admin: true, hr: true,  team_lead: false, member: false },
  { label: 'View analytics',          admin: true, hr: true,  team_lead: true,  member: false },
  { label: 'Manage users',            admin: true, hr: true,  team_lead: false, member: false },
  { label: 'Invite new users',        admin: true, hr: true,  team_lead: false, member: false },
  { label: 'Manage workspace settings',admin: true,hr: false, team_lead: false, member: false },
  { label: 'Manage integrations',     admin: true, hr: false, team_lead: false, member: false },
  { label: 'Manage billing',          admin: true, hr: false, team_lead: false, member: false },
  { label: 'View audit log',          admin: true, hr: false, team_lead: false, member: false },
  { label: 'Manage API keys',         admin: true, hr: false, team_lead: false, member: false },
  { label: 'Delete users',            admin: false,hr: false, team_lead: false, member: false, note: 'Admin users are protected' },
];

const RolesPanel = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Roles &amp; Permissions</h2>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
        Overview of role capabilities. Roles are assigned per user in User Management.
      </p>
    </div>

    {/* Role cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ROLES.map(role => (
        <div key={role.id} className="rounded-xl border p-5"
          style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
          <div className="flex items-start gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${role.color}20`, color: role.color }}>
              <Shield size={16} />
            </div>
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{role.label}</h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{role.description}</p>
            </div>
          </div>
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded capitalize mt-1"
            style={{ background: `${role.color}15`, color: role.color }}>
            {role.id.replace('_', ' ')}
          </span>
        </div>
      ))}
    </div>

    {/* Permissions matrix */}
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-raised)', borderColor: 'var(--card-border, var(--border-soft))' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Permission Matrix</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', minWidth: 200 }}>Permission</th>
              {ROLES.map(r => (
                <th key={r.id} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: r.color }}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm, i) => (
              <tr key={perm.label} style={{
                borderBottom: '1px solid var(--border-soft)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
              }}>
                <td className="px-6 py-2.5">
                  <span style={{ color: 'var(--text-primary)' }}>{perm.label}</span>
                  {perm.note && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>({perm.note})</span>}
                </td>
                {ROLES.map(r => (
                  <td key={r.id} className="px-4 py-2.5 text-center">
                    {perm[r.id]
                      ? <Check size={15} className="inline" style={{ color: '#22c55e' }} />
                      : <X size={15} className="inline" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="rounded-xl border p-5" style={{ background: 'rgba(196,113,58,0.06)', borderColor: 'rgba(196,113,58,0.2)' }}>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--brand)' }}>Note:</strong> Role assignments are managed per-user in the{' '}
        <a href="/users" className="underline" style={{ color: 'var(--brand)' }}>User Management</a> page.
        Custom roles are not supported in the current plan.
      </p>
    </div>
  </div>
);

export default RolesPanel;
