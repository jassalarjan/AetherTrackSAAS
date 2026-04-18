import React, { useState, useEffect } from 'react';
import { BarChart3, Send, AlertCircle, Target, Zap, GitBranch, TrendingUp, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import emailHubApi from '../services/emailHubApi';

function StatCard({ icon: Icon, label, value, color, gradient }) {
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ background: 'var(--bg-raised)', border: '1.5px solid var(--border-soft)', boxShadow: '0 2px 8px var(--border-soft)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: gradient || `${color}10` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{value}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', boxShadow: '0 4px 16px var(--border-soft)' }}>
      <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{payload[0].value} emails</p>
    </div>
  );
};

export default function AnalyticsPane() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [jobPage, setJobPage] = useState(1);
  const [jobTotal, setJobTotal] = useState(0);

  useEffect(() => {
    Promise.all([
      emailHubApi.getAnalytics(),
      emailHubApi.getJobs({ page: 1, limit: 15 })
    ]).then(([aRes, jRes]) => {
      setAnalytics(aRes.data);
      setJobs(jRes.data.jobs);
      setJobTotal(jRes.data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadMoreJobs = async () => {
    const next = jobPage + 1;
    try {
      const { data } = await emailHubApi.getJobs({ page: next, limit: 15 });
      setJobs(prev => [...prev, ...data.jobs]);
      setJobPage(next);
    } catch {}
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  const chartData = (analytics?.dailyStats || []).map(d => ({
    date: d._id.slice(5),
    sent: d.count
  }));

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-[1200px] mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Analytics</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Performance overview across all email activity</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={Send} label="Total Sent" value={analytics?.totalSent || 0} color="#5A8A5A" gradient="rgba(90,138,90,0.08)" />
          <StatCard icon={AlertCircle} label="Failed" value={analytics?.totalFailed || 0} color="#B05050" gradient="rgba(176,80,80,0.08)" />
          <StatCard icon={Target} label="Campaigns" value={analytics?.totalCampaigns || 0} color="#C4713A" gradient="rgba(196,113,58,0.08)" />
          <StatCard icon={GitBranch} label="Sequences" value={analytics?.totalSequences || 0} color="#9B6A3F" gradient="rgba(155,106,63,0.08)" />
          <StatCard icon={Zap} label="Rules" value={analytics?.totalRules || 0} color="#E8A838" gradient="rgba(232,168,56,0.08)" />
        </div>

        {/* Chart */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-raised)', border: '1.5px solid var(--border-soft)', boxShadow: '0 2px 12px var(--border-soft)' }}
        >
          <div className="px-6 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-dim)' }}>
              <TrendingUp size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Emails Sent — Last 30 Days</h3>
          </div>
          <div className="p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4713A" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#C4713A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,30,22,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9A8A7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9A8A7A' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sent" stroke="#C4713A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center">
                  <Send size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No data yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Send your first email to see analytics</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-raised)', border: '1.5px solid var(--border-soft)', boxShadow: '0 2px 12px var(--border-soft)' }}
        >
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-3">
              <Send size={16} style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Recent Email Jobs</h3>
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{jobTotal} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recipient</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => {
                  const sc = j.status === 'sent' ? { bg: 'var(--success-dim)', color: 'var(--success)' } : j.status === 'failed' ? { bg: 'var(--danger-dim)', color: 'var(--danger)' } : { bg: 'var(--text-secondary)', color: 'var(--warning)' };
                  return (
                    <tr key={j._id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td className="px-6 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{j.to}</td>
                      <td className="px-6 py-3 text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{j.subject}</td>
                      <td className="px-6 py-3 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{j.type.replace(/-/g, ' ')}</td>
                      <td className="px-6 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: sc.bg, color: sc.color }}>{j.status}</span>
                      </td>
                      <td className="px-6 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {j.sentAt ? new Date(j.sentAt).toLocaleString() : j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {jobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No email jobs yet</p>
            </div>
          )}
          {jobs.length < jobTotal && (
            <div className="p-4 text-center" style={{ borderTop: '1px solid var(--border-soft)' }}>
              <button onClick={loadMoreJobs}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'var(--border-soft)', color: 'var(--text-secondary)' }}>
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
