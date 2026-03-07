import { lazy, Suspense, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { User, Lock, Palette, Bell, Building, Users, Shield, Building2, CreditCard, Zap, Bot, Database, Code, Menu, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import SettingsNav from '../components/SettingsNav';

const ProfilePanel      = lazy(() => import('../components/ProfilePanel'));
const SecurityPanel     = lazy(() => import('../components/SecurityPanel'));
const AppearancePanel   = lazy(() => import('../components/AppearancePanel'));
const NotificationsPanel= lazy(() => import('../components/NotificationsPanel'));
const WorkspacePanel    = lazy(() => import('../components/WorkspacePanel'));
const MembersPanel      = lazy(() => import('../components/MembersPanel'));
const RolesPanel        = lazy(() => import('../components/RolesPanel'));
const OrganizationPanel = lazy(() => import('../components/OrganizationPanel'));
const BillingPanel      = lazy(() => import('../components/BillingPanel'));
const IntegrationsPanel = lazy(() => import('../components/IntegrationsPanel'));
const AutomationPanel   = lazy(() => import('../components/AutomationPanel'));
const DataPrivacyPanel  = lazy(() => import('../components/DataPrivacyPanel'));
const DeveloperPanel    = lazy(() => import('../components/DeveloperPanel'));

const ALL_SECTIONS = [
  { id: 'profile',       label: 'Profile',             icon: User,        group: 'Account' },
  { id: 'security',      label: 'Security',             icon: Lock,        group: 'Account' },
  { id: 'appearance',    label: 'Appearance',           icon: Palette,     group: 'Account' },
  { id: 'notifications', label: 'Notifications',        icon: Bell,        group: 'Account' },
  { id: 'workspace',     label: 'General',              icon: Building,    group: 'Workspace',    roles: ['admin'] },
  { id: 'members',       label: 'Members',              icon: Users,       group: 'Workspace',    roles: ['admin', 'hr'] },
  { id: 'roles',         label: 'Roles & Permissions',  icon: Shield,      group: 'Workspace',    roles: ['admin'] },
  { id: 'organization',  label: 'Organization',         icon: Building2,   group: 'Organization', roles: ['admin'] },
  { id: 'billing',       label: 'Billing',              icon: CreditCard,  group: 'Billing',      roles: ['admin'] },
  { id: 'integrations',  label: 'Integrations',         icon: Zap,         group: 'Integrations', roles: ['admin'] },
  { id: 'automation',    label: 'Automation',           icon: Bot,         group: 'Automation',   roles: ['admin'] },
  { id: 'data-privacy',  label: 'Data & Privacy',       icon: Database,    group: 'Data & Privacy' },
  { id: 'developer',     label: 'Developer',            icon: Code,        group: 'Developer',    roles: ['admin'] },
];

const PANEL_MAP = {
  profile:       ProfilePanel,
  security:      SecurityPanel,
  appearance:    AppearancePanel,
  notifications: NotificationsPanel,
  workspace:     WorkspacePanel,
  members:       MembersPanel,
  roles:         RolesPanel,
  organization:  OrganizationPanel,
  billing:       BillingPanel,
  integrations:  IntegrationsPanel,
  automation:    AutomationPanel,
  'data-privacy':DataPrivacyPanel,
  developer:     DeveloperPanel,
};

const PanelLoader = () => (
  <div className="flex-1 flex items-center justify-center py-16">
    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--border-mid)', borderTopColor: 'var(--brand)' }} />
  </div>
);

const Settings = () => {
  const { user } = useAuth();
  const { section } = useParams();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleSections = ALL_SECTIONS.filter(s => !s.roles || s.roles.includes(user?.role));
  const activeSection = section && PANEL_MAP[section] ? section : null;

  if (!activeSection) {
    return <Navigate to={`/settings/${visibleSections[0]?.id || 'profile'}`} replace />;
  }

  const ActivePanel = PANEL_MAP[activeSection];
  const activeLabel = ALL_SECTIONS.find(s => s.id === activeSection)?.label || 'Settings';

  return (
    <ResponsivePageLayout title="Settings" icon={SettingsIcon} noPadding>
      {/* Mobile header bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b lg:hidden flex-shrink-0"
        style={{ background: 'var(--bg-canvas)', borderColor: 'var(--border-soft)' }}>
        <button onClick={() => setMobileNavOpen(true)} className="p-1.5 rounded" aria-label="Open settings menu"
          style={{ color: 'var(--text-muted)' }}>
          <Menu size={20} />
        </button>
        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          {activeLabel}
        </h2>
      </header>

      {/* Body: SettingsNav handles its own desktop sidebar + mobile drawer */}
      <div className="flex flex-1 overflow-hidden">
        <SettingsNav
          sections={visibleSections}
          active={activeSection}
          onNavigate={id => navigate(`/settings/${id}`)}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        {/* Panel content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <Suspense fallback={<PanelLoader />}>
              <ActivePanel />
            </Suspense>
          </div>
        </main>
      </div>
    </ResponsivePageLayout>
  );
};

export default Settings;

