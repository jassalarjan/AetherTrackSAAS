import React from 'react';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import AutomationPane from '../components/AutomationPane';

export default function SystemAutomationsPage() {

  return (
    <ResponsivePageLayout
      title="Automations"
      subtitle="System workflow control center"
      noPadding
    >
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6 lg:px-8 lg:pt-7">
        <AutomationPane />
      </div>
    </ResponsivePageLayout>
  );
}