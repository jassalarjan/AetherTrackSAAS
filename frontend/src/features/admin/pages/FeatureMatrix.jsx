import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { TableProperties, Eye, EyeOff } from 'lucide-react';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import settingsService from '@/features/settings/services/settingsService';
import { FEATURE_FLAG_SECTIONS, DEFAULT_FEATURE_FLAGS } from '@/features/workspace/constants/featureFlags';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import CyberToggle from '@/shared/components/ui/CyberToggle';

// ─── Data ────────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'project_mgmt', label: 'Project Mgmt',     example: 'e.g., ClickUp',  accent: 'blue',  isFuture: false },
  { id: 'hr_mgmt',      label: 'HR Mgmt',          example: 'e.g., BambooHR', accent: 'green', isFuture: false },
  { id: 'future_2030',  label: '2030 Enhancement', example: null,             accent: 'amber', isFuture: true  },
];

const ROWS = [
  {
    id: 'core_sections',
    label: 'Core Sections',
    description: 'Primary navigation modules available to users',
    accent: 'blue',
    cells: {
      project_mgmt: { value: 'Dashboard, Tasks, Goals, Whiteboards', tag: 'linkedin' },
      hr_mgmt:      { value: 'Employees, Reports, Onboarding',       tag: 'hrbamb' },
      future_2030:  { value: 'AI-Predicted Priorities',              tag: 'worxwide' },
    },
  },
  {
    id: 'customization',
    label: 'Customization',
    description: 'Layout and view personalization capabilities',
    accent: 'green',
    cells: {
      project_mgmt: { value: 'Drag-reorder, Resize',          tag: 'asana' },
      hr_mgmt:      { value: 'Role-Tailored Dashboards',      tag: 'ec-undp-electoralassista' },
      future_2030:  { value: 'Behavior-Adaptive Layouts',     tag: null },
    },
  },
  {
    id: 'productivity_boost',
    label: 'Productivity Boost',
    description: 'Efficiency features that reduce friction and errors',
    accent: 'purple',
    cells: {
      project_mgmt: { value: 'Contextual Views Reduce Clicks',      tag: 'clickup' },
      hr_mgmt:      { value: 'Search + Grouping Cuts Errors',       tag: 'merveilleux' },
      future_2030:  { value: 'Automation + Insights (100% Spike)',  tag: 'merveilleux' },
    },
  },
];

// ─── Accent helpers ───────────────────────────────────────────────────────────

const ACCENT_DOT = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  purple: 'bg-purple-500',
  amber:  'bg-amber-400',
};

const COL_UNDERLINE = {
  blue:  'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-400',
};

// ─── Tag Badge ────────────────────────────────────────────────────────────────

function TagBadge({ tag, show, isDark }) {
  const [hovered, setHovered] = useState(false);
  if (!show || !tag) return null;
  return (
    <span
      className={`relative inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] cursor-default select-none transition-opacity ${
        isDark
          ? 'bg-[#1c2027] text-gray-500 hover:text-gray-400'
          : 'bg-stone-100 text-stone-500 hover:text-stone-600'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {tag}
      {hovered && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-gray-900 text-white text-[11px] px-2 py-1 shadow-xl z-20 pointer-events-none">
          Source: {tag}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeatureMatrix() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { refreshEnabledFeatures } = useSidebar();
  const isDark = theme === 'dark';

  const [activeCol, setActiveCol] = useState(null);
  const [showTags, setShowTags]   = useState(true);
  const [features, setFeatures] = useState(DEFAULT_FEATURE_FLAGS);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [featuresError, setFeaturesError] = useState('');

  const isSuperAdmin = user?.isSystemAdmin || user?.role === 'super_admin' || (user?.role === 'admin' && !user?.workspaceId);

  useEffect(() => {
    if (!isSuperAdmin) return;

    let mounted = true;
    const loadFeatures = async () => {
      setLoadingFeatures(true);
      setFeaturesError('');
      try {
        const incoming = await settingsService.getFeatureMatrix();
        if (!mounted) return;
        setFeatures({ ...DEFAULT_FEATURE_FLAGS, ...(incoming || {}) });
      } catch (error) {
        if (!mounted) return;
        setFeaturesError(error?.response?.data?.message || 'Failed to load feature matrix.');
      } finally {
        if (mounted) setLoadingFeatures(false);
      }
    };

    loadFeatures();
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  const enabledCount = useMemo(
    () => Object.values(features).filter(Boolean).length,
    [features]
  );

  // Super-admin guard
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const handleColClick = (colId) => setActiveCol(prev => prev === colId ? null : colId);
  const handleToggleFeature = (key) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const areAllSectionItemsEnabled = (section) => (
    section.items.every((item) => features[item.key] !== false)
  );

  const handleToggleSection = (section, nextState) => {
    setFeatures((prev) => {
      const next = { ...prev };
      section.items.forEach((item) => {
        next[item.key] = Boolean(nextState);
      });
      return next;
    });
  };

  const handleSaveFeatureMatrix = async () => {
    setSavingFeatures(true);
    setFeaturesError('');
    try {
      const saved = await settingsService.updateFeatureMatrix(features);
      const merged = { ...DEFAULT_FEATURE_FLAGS, ...(saved || {}) };
      setFeatures(merged);
      await refreshEnabledFeatures();
    } catch (error) {
      setFeaturesError(error?.response?.data?.message || 'Failed to save feature matrix.');
    } finally {
      setSavingFeatures(false);
    }
  };

  const colOpacity = (colId) => {
    if (!activeCol) return '';
    return activeCol === colId ? '' : 'opacity-40';
  };

  return (
    <ResponsivePageLayout
      title="Feature Matrix"
      subtitle="Platform capability comparison across domains"
      icon={TableProperties}
      noPadding
      actions={
        <button
          onClick={() => setShowTags(v => !v)}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all sm:w-auto ${
            showTags
              ? 'bg-[#C4713A] border-transparent text-white'
              : isDark
                ? 'bg-[#1a1d23] border-[#282f39] text-gray-300 hover:border-[#3a4150]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {showTags ? <Eye size={15} /> : <EyeOff size={15} />}
          {showTags ? 'Hide Tags' : 'Show Tags'}
        </button>
      }
    >

      {/* ── Table ── */}
      <div className="p-4 sm:p-6">
        <div className="mb-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-base)] p-4 sm:mb-6 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Workspace Feature Access</p>
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                Toggle features to control sidebar visibility for all users. Enabled: {enabledCount}
              </p>
            </div>
            <button
              onClick={handleSaveFeatureMatrix}
              disabled={savingFeatures || loadingFeatures}
              className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
              style={{ background: 'var(--sidebar-accent)' }}
            >
              {savingFeatures ? 'Saving...' : 'Save Feature Matrix'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              Total: {Object.keys(DEFAULT_FEATURE_FLAGS).length}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Enabled: {enabledCount}
            </span>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              Disabled: {Object.keys(DEFAULT_FEATURE_FLAGS).length - enabledCount}
            </span>
          </div>

          {featuresError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {featuresError}
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {FEATURE_FLAG_SECTIONS.map((section) => (
              <div key={section.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{section.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">Toggle all</span>
                    <CyberToggle
                      checked={areAllSectionItemsEnabled(section)}
                      disabled={loadingFeatures || savingFeatures}
                      onChange={(nextState) => handleToggleSection(section, nextState)}
                      label={`Toggle all ${section.label} features`}
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  {section.items.map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-base)] px-3 py-3 sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                        <p className="mt-0.5 text-[11px] break-all text-[var(--text-muted)]">{item.path}</p>
                      </div>
                      <div className="flex shrink-0 items-center pt-0.5 sm:pt-0">
                        <CyberToggle
                          checked={features[item.key]}
                          disabled={loadingFeatures || savingFeatures}
                          onChange={() => handleToggleFeature(item.key)}
                          label={`Toggle ${item.label}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 space-y-3 md:hidden">
          {ROWS.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-base)] p-4 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ACCENT_DOT[row.accent]}`} />
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{row.label}</p>
                  <p className={`mt-0.5 text-xs leading-snug ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {row.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                {COLUMNS.map((col) => {
                  const cell = row.cells[col.id];
                  return (
                    <div
                      key={col.id}
                      className={`rounded-lg border px-3 py-2 ${
                        col.isFuture
                          ? 'border-amber-300/60 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/10'
                          : 'border-[var(--border-soft)] bg-[var(--bg-raised)]'
                      }`}
                    >
                      <p className={`text-[11px] font-bold uppercase tracking-wide ${col.isFuture ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--text-muted)]'}`}>
                        {col.label}
                      </p>
                      <p className={`mt-1 text-sm font-medium leading-snug ${col.isFuture ? 'text-amber-700 dark:text-amber-200' : 'text-[var(--text-primary)]'}`}>
                        {cell?.value ?? '-'}
                      </p>
                      <TagBadge tag={cell?.tag} show={showTags} isDark={isDark} />
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        <div className={`hidden rounded-2xl border overflow-hidden shadow-sm md:block ${
          'border-[var(--border-soft)] bg-[var(--bg-base)]'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">

              {/* Header */}
              <thead>
                <tr className={`border-b border-[var(--border-soft)] bg-[var(--bg-sunken)]`}>
                  <th className={`sticky left-0 z-10 px-6 py-4 text-left w-48 bg-[var(--bg-sunken)]`}>
                    <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Feature
                    </span>
                  </th>

                  {COLUMNS.map((col) => (
                    <th
                      key={col.id}
                      onClick={() => handleColClick(col.id)}
                      className={`px-6 py-4 text-left cursor-pointer select-none transition-all duration-200 ${colOpacity(col.id)} ${
                        col.isFuture
                          ? `border-l-2 border-amber-400 ${isDark ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-amber-50/60 hover:bg-amber-100/60'}`
                          : isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-bold tracking-tight ${
                          col.isFuture ? 'text-amber-600 dark:text-amber-300' : isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {col.label}
                        </p>
                        {col.isFuture && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                            isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                          }`}>
                            Future
                          </span>
                        )}
                      </div>
                      {col.example && (
                        <p className={`text-xs ${
                          col.isFuture ? 'text-amber-500/70' : isDark ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {col.example}
                        </p>
                      )}
                      <div className={`mt-2 h-0.5 rounded-full transition-all duration-200 ${
                        activeCol === col.id ? COL_UNDERLINE[col.accent] : 'bg-transparent'
                      } w-8`} />
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.id}
                    className={`group border-b last:border-b-0 transition-colors ${
                      'border-[var(--border-soft)] hover:bg-[var(--bg-raised)]'
                    }`}
                  >
                    {/* Row label — sticky */}
                    <td className={`sticky left-0 z-10 px-6 py-5 align-top transition-colors ${
                      'bg-[var(--bg-base)] group-hover:bg-[var(--bg-raised)]'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ACCENT_DOT[row.accent]}`} />
                        <div>
                          <p className={`text-sm font-bold text-[var(--text-primary)]`}>
                            {row.label}
                          </p>
                          <p className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {row.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {COLUMNS.map((col) => {
                      const cell = row.cells[col.id];
                      return (
                        <td
                          key={col.id}
                          className={`px-6 py-5 align-top transition-all duration-200 ${colOpacity(col.id)} ${
                            col.isFuture
                              ? `border-l-2 border-amber-400/50 ${isDark ? 'bg-amber-500/[0.04]' : 'bg-amber-50/30'}`
                              : ''
                          }`}
                        >
                          <p className={`text-sm font-medium leading-snug ${
                            col.isFuture
                              ? isDark ? 'text-amber-300' : 'text-amber-700'
                              : isDark ? 'text-gray-200' : 'text-gray-800'
                          }`}>
                            {cell?.value ?? '—'}
                          </p>
                          <TagBadge tag={cell?.tag} show={showTags} isDark={isDark} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-5">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Legend
          </p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded-full bg-blue-500" />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Click column to highlight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border-l-2 border-amber-400" />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>2030 AI-enhanced state</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] bg-[var(--bg-raised)] text-[var(--text-muted)]`}>
              tag
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Source citation — hover for details</span>
          </div>
          <div className="flex items-center gap-2">
            {['blue', 'green', 'purple'].map((c) => (
              <span key={c} className={`w-2 h-2 rounded-full ${ACCENT_DOT[c]}`} />
            ))}
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Row category accent</span>
          </div>
        </div>
      </div>
    </ResponsivePageLayout>
  );
}
