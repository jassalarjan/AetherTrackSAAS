import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TableProperties, Eye, EyeOff } from 'lucide-react';
import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';

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
  const isDark = theme === 'dark';

  const [activeCol, setActiveCol] = useState(null);
  const [showTags, setShowTags]   = useState(true);

  // Admin guard
  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const handleColClick = (colId) => setActiveCol(prev => prev === colId ? null : colId);

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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
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
      <div className="p-6">
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${
          isDark ? 'border-[#282f39] bg-[#111418]' : 'border-gray-200 bg-white'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">

              {/* Header */}
              <thead>
                <tr className={`border-b ${isDark ? 'border-[#282f39] bg-[#1a1d23]' : 'border-gray-200 bg-gray-50'}`}>
                  <th className={`sticky left-0 z-10 px-6 py-4 text-left w-48 ${isDark ? 'bg-[#1a1d23]' : 'bg-gray-50'}`}>
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
                      isDark ? 'border-[#282f39] hover:bg-[#1c2027]' : 'border-gray-100 hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Row label — sticky */}
                    <td className={`sticky left-0 z-10 px-6 py-5 align-top transition-colors ${
                      isDark ? 'bg-[#111418] group-hover:bg-[#1c2027]' : 'bg-white group-hover:bg-gray-50/80'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ACCENT_DOT[row.accent]}`} />
                        <div>
                          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
        <div className="mt-4 flex flex-wrap items-center gap-5">
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
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${isDark ? 'bg-[#1c2027] text-gray-500' : 'bg-stone-100 text-stone-500'}`}>
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
