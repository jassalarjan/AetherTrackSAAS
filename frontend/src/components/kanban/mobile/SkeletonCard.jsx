import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="min-h-16 rounded-md border border-[var(--border-soft)] bg-[var(--bg-surface)] p-3">
      <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-[var(--text-muted)]/20" />
      <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-[var(--text-muted)]/20" />
      <div className="h-8 animate-pulse rounded bg-[var(--text-muted)]/15" />
    </div>
  );
}
