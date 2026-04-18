import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PenSquare,
  GitBranch,
  Megaphone,
  FileText,
  Zap,
  BarChart3,
  Bell,
  ArrowRight,
  Send,
  UserCheck
} from 'lucide-react';
import { HUB_TABS } from '../constants/hubConfig';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import ComposePane from '../components/ComposePane';
import SequencesPane from '../components/SequencesPane';
import CampaignsPane from '../components/CampaignsPane';
import TemplatesPane from '../components/TemplatesPane';
import AutomationPane from '../components/AutomationPane';
import AnalyticsPane from '../components/AnalyticsPane';

const iconMap = { PenSquare, GitBranch, Megaphone, FileText, Zap, BarChart3 };
const PRIMARY_TAB_IDS = ['center', 'compose', 'campaigns', 'templates'];
const SECONDARY_TAB_IDS = ['sequences', 'analytics'];

const TAB_HINTS = {
  center: 'Templates, recipients, and approval-ready communication',
  compose: 'Instant sends and scheduled emails',
  sequences: 'Multi-step nurturing workflows',
  campaigns: 'Bulk outreach with launch controls',
  templates: 'Reusable branded content blocks',
  analytics: 'Delivery and engagement analytics',
};

const T = {
  brand: 'var(--brand)',
  brandLight: 'var(--brand-light)',
  brandDim: 'var(--brand-dim)',
  bgCanvas: 'var(--bg-canvas)',
  bgBase: 'var(--bg-base)',
  bgRaised: 'var(--bg-raised)',
  bgSurface: 'var(--bg-surface)',
  borderSoft: 'var(--border-soft)',
  borderMid: 'var(--border-mid)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  fontHeading: 'var(--font-heading)',
};

function useAmbientStatus() {
  // Wire to real Redux/context state later
  return { drafts: 3, activeCampaigns: 1 };
}

export default function EmailAutomationHub({ initialTab = 'center', automationOnly = false }) {
  const [activeTab, setActiveTab] = useState(automationOnly ? 'automation' : initialTab);
  const navigate = useNavigate();
  const location = useLocation();
  const now = new Date();
  const isMondayMorning = now.getDay() === 1 && now.getHours() < 12;
  const month = now.getMonth();
  const isLeaveSeason = month === 10 || month === 11 || month === 0;

  const hasDraftCampaign = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const routeDraftFlag =
      location.state?.hasDraftCampaign ||
      location.state?.campaignDraftExists ||
      search.get('draftCampaign') === '1';

    if (routeDraftFlag) {
      return true;
    }

    try {
      return window.localStorage.getItem('emailCampaignDraftExists') === '1';
    } catch {
      return false;
    }
  }, [location.search, location.state]);

  useEffect(() => {
    if (automationOnly) {
      setActiveTab('automation');
      return;
    }
    if (location.pathname.includes('/hr/email-center')) {
      setActiveTab('compose');
      return;
    }
    if (location.pathname === '/email') {
      setActiveTab(initialTab || 'center');
    }
  }, [automationOnly, initialTab, location.pathname]);

  const unifiedTabs = useMemo(() => ([
    {
      id: 'center',
      label: 'HR Center',
      icon: Bell,
      helper: 'Templates, recipients, and approval-ready communication'
    },
    ...HUB_TABS.filter((tab) => tab.id !== 'automation').map((tab) => ({
      ...tab,
      icon: iconMap[tab.icon] || FileText,
      helper:
        tab.id === 'compose' ? 'Instant sends and scheduled emails' :
        tab.id === 'sequences' ? 'Multi-step nurturing workflows' :
        tab.id === 'campaigns' ? 'Bulk outreach with launch controls' :
        tab.id === 'templates' ? 'Reusable branded content blocks' :
        'Delivery and engagement analytics'
    }))
  ]), []);

  const status = useAmbientStatus();
  const primaryTabs = unifiedTabs.filter((t) => PRIMARY_TAB_IDS.includes(t.id));
  const secondaryTabs = unifiedTabs.filter((t) => SECONDARY_TAB_IDS.includes(t.id));

  const renderPane = () => {
    switch (activeTab) {
      case 'center':
        return (
          <HrOperationsPane
            onOpenTab={setActiveTab}
            onNavigate={navigate}
            hasDraftCampaign={hasDraftCampaign}
            isMondayMorning={isMondayMorning}
            isLeaveSeason={isLeaveSeason}
          />
        );
      case 'compose':    return <ComposePane />;
      case 'sequences':  return <SequencesPane />;
      case 'campaigns':  return <CampaignsPane />;
      case 'templates':  return <TemplatesPane />;
      case 'analytics':  return <AnalyticsPane />;
      default:           return <ComposePane />;
    }
  };

  if (automationOnly) {
    return (
      <ResponsivePageLayout
        title="Automation Control Center"
        subtitle="Dedicated workspace for event and report automations"
      >
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 lg:px-8 pb-8">
          <div
            className="rounded-3xl border overflow-visible p-2 sm:p-3 lg:p-4"
            style={{ borderColor: T.borderSoft, background: T.bgRaised }}
          >
            <AutomationPane />
          </div>
        </div>
      </ResponsivePageLayout>
    );
  }

  return (
    <ResponsivePageLayout
      title="Email Command Center"
      subtitle="Unified HR communication and automation workspace"
    >
      <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-4 sm:gap-5 px-3 sm:px-5 lg:px-8 pb-8" style={{ background: `linear-gradient(180deg, ${T.bgCanvas} 0%, ${T.bgBase} 45%, ${T.bgRaised} 100%)` }}>

        {/* Ambient Status Bar */}
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 rounded-2xl border"
          style={{ background: T.bgRaised, borderColor: T.borderSoft }}
        >
          <div className="flex flex-col gap-0.5">
            <h1
              className="text-base sm:text-lg tracking-tight"
              style={{ fontFamily: T.fontHeading, fontWeight: 700, color: T.textPrimary }}
            >
              Email Command Center
            </h1>
            <p className="text-xs" style={{ color: T.textMuted }}>
              Active: <span style={{ color: T.textPrimary, fontWeight: 600 }}>
                {unifiedTabs.find((t) => t.id === activeTab)?.label}
              </span>
            </p>
          </div>
          <div
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold"
            style={{ background: T.bgSurface, borderColor: T.borderSoft, color: T.textSecondary }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--bg-surface)', flexShrink: 0 }} />
            {status.drafts} drafts pending · {status.activeCampaigns} campaign live
          </div>
        </div>

        {/* Tab Rail */}
        <div
          className="sticky top-2 z-10 rounded-3xl border px-4 sm:px-5 py-3"
          style={{ background: T.bgSurface, borderColor: T.borderSoft }}
        >
          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {primaryTabs.map((tab) => {
              const Icon = tab.icon || FileText;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 border transition-all"
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${T.brand}, ${T.brandLight})`,
                    color: 'var(--bg-raised)',
                    borderColor: 'transparent',
                    boxShadow: '0 4px 14px var(--brand-dim)',
                  } : {
                    background: 'transparent',
                    color: T.textSecondary,
                    borderColor: T.borderSoft,
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}

            <div className="h-6 mx-1.5 shrink-0" style={{ width: '0.5px', background: T.borderMid }} />

            {secondaryTabs.map((tab) => {
              const Icon = tab.icon || FileText;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-all"
                  style={isActive ? {
                    background: T.brandDim,
                    color: T.brand,
                    borderColor: 'var(--brand-dim)',
                  } : {
                    background: 'transparent',
                    color: T.textMuted,
                    borderColor: T.borderSoft,
                  }}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mobile */}
          <div className="sm:hidden">
            <label htmlFor="email-unified-tab" className="sr-only">Select tab</label>
            <select
              id="email-unified-tab"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-semibold"
              style={{ borderColor: T.borderMid, color: T.textPrimary, background: T.bgRaised }}
            >
              {[...primaryTabs, ...secondaryTabs].map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>

          <p className="hidden sm:block mt-2 text-xs" style={{ color: T.textMuted }}>
            {TAB_HINTS[activeTab]}
          </p>
        </div>

        {/* Pane */}
        <div
          className="rounded-3xl border overflow-visible p-2 sm:p-3 lg:p-4"
          style={{ borderColor: T.borderSoft, background: T.bgRaised, position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
        >
          {renderPane()}
        </div>

      </div>
    </ResponsivePageLayout>
  );
}

function HrOperationsPane({ onOpenTab, onNavigate }) {
  const shortcuts = [
    { id: 'compose', title: 'Compose HR Email', desc: 'Start with recipients and send a one-off HR communication.', icon: Send, cta: 'Open Compose' },
    { id: 'templates', title: 'Manage HR Templates', desc: 'Create and maintain templates for onboarding, leave, and attendance.', icon: FileText, cta: 'Open Templates' },
    { id: 'campaigns', title: 'Announcement Campaigns', desc: 'Launch structured broadcasts for policy updates and org-wide notices.', icon: Megaphone, cta: 'Open Campaigns' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4">

      {/* Hero strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ background: 'linear-gradient(140deg, var(--brand) 0%, var(--brand) 100%)', borderColor: T.borderSoft }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: T.brandDim }}>
            <Bell size={16} style={{ color: T.brand }} />
          </div>
          <h3 className="text-base mb-1.5" style={{ fontFamily: T.fontHeading, fontWeight: 700, color: T.textPrimary }}>
            HR Communication Workspace
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>
            Email Center and Email Hub are now merged here. Choose a workflow below or jump directly to any advanced tab from the rail above.
          </p>
        </div>

        <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: T.bgSurface, borderColor: T.borderSoft }}>
          <p className="text-xs mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: T.textMuted }}>
            Quick Access
          </p>
          {[
            { label: 'Delivery Analytics', action: () => onOpenTab('analytics') },
            { label: 'Sequence Flows', action: () => onOpenTab('sequences') },
            { label: 'HR Leaves Page', action: () => onNavigate('/hr/leaves') },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all"
              style={{ background: T.bgRaised, borderColor: T.borderSoft, color: T.textPrimary }}
            >
              {item.label}
              <ArrowRight size={14} style={{ color: T.textMuted }} />
            </button>
          ))}
        </div>
      </div>

      {/* Shortcut cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.route ? onNavigate(item.route) : onOpenTab(item.id))}
              className="text-left rounded-2xl border p-4 flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: T.bgRaised, borderColor: T.borderSoft }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: T.brandDim }}>
                <Icon size={15} style={{ color: T.brand }} />
              </div>
              <h4 className="text-xs mb-1.5" style={{ fontFamily: T.fontHeading, fontWeight: 700, color: T.textPrimary }}>
                {item.title}
              </h4>
              <p className="text-xs leading-relaxed flex-1" style={{ color: T.textSecondary }}>
                {item.desc}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide" style={{ color: T.brand }}>
                {item.cta} <ArrowRight size={10} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Tip bar */}
      <div className="flex items-start gap-3 rounded-xl border p-3" style={{ background: T.bgCanvas, borderColor: T.borderSoft }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.brandDim }}>
          <UserCheck size={13} style={{ color: T.brand }} />
        </div>
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: T.textPrimary }}>HR Workflow Tip</p>
          <p className="text-xs leading-relaxed" style={{ color: T.textSecondary }}>
            Use Templates for approved HR content, then switch to Compose or Campaigns for distribution. Track outcomes in Analytics to close the loop.
          </p>
        </div>
      </div>

    </div>
  );
}
