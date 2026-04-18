import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Play, Trash2, Check, AlertCircle, FileSpreadsheet, Zap, Clock, Send, Loader2, X, ChevronRight, ChevronLeft
} from 'lucide-react';
import emailHubApi from '../services/emailHubApi';
import { useAuth } from '@/features/auth/context/AuthContext';

const STEPS = ['Upload', 'Map', 'Preview', 'Launch'];

function CampaignList({ campaigns, onLaunch, onDelete }) {
  const statusConfig = {
    draft:     { bg: 'var(--brand-dim)', color: 'var(--text-muted)', label: 'Draft', dot: 'var(--text-muted)' },
    sending:   { bg: 'var(--text-secondary)',  color: 'var(--warning)', label: 'Sending', dot: 'var(--warning)' },
    completed: { bg: 'var(--success-dim)',   color: 'var(--success)', label: 'Completed', dot: 'var(--success)' },
    paused:    { bg: 'var(--text-secondary)',  color: 'var(--warning)', label: 'Paused', dot: 'var(--warning)' },
  };

  return (
    <div className="p-5 space-y-3">
      {campaigns.map(c => {
        const sc = statusConfig[c.status] || statusConfig.draft;
        return (
          <div
            key={c._id}
            className="group p-5 rounded-2xl flex items-center justify-between transition-all duration-200 hover:shadow-lg"
            style={{ 
              background: 'var(--bg-raised)', 
              border: '1.5px solid var(--border-soft)',
              boxShadow: '0 2px 8px var(--border-soft)'
            }}
          >
            <div>
              <span className="text-sm font-bold block mb-1" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ background: sc.bg, color: sc.color }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                  {sc.label}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.stats?.total || 0} contacts</span>
                {c.stats?.sent > 0 && <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>{c.stats.sent} sent</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {c.status === 'draft' && (
                <button
                  onClick={() => onLaunch(c._id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-md"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 2px 8px var(--brand-dim)' }}
                >
                  <Play size={12} />
                  Launch
                </button>
              )}
              <button onClick={() => onDelete(c._id)} className="p-2 rounded-xl hover:bg-[var(--danger-dim)] transition-colors" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
      {campaigns.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-dim)' }}>
            <Send size={28} style={{ color: 'var(--brand-dim)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No campaigns yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Create your first campaign to reach contacts</p>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPane() {
  const { socket } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [creating, setCreating] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [csvData, setCsvData] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [mappedContacts, setMappedContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [launchProgress, setLaunchProgress] = useState(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const fileInputRef = useRef(null);

  const fetchCampaigns = useCallback(() => {
    emailHubApi.getCampaigns().then(r => setCampaigns(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCampaigns();
    emailHubApi.getTemplatesList().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setLaunchProgress(data);
    socket.on('email-hub:campaign-progress', handler);
    return () => socket.off('email-hub:campaign-progress', handler);
  }, [socket]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      setCsvHeaders(headers); setCsvData(rows);
      const emailCol = headers.find(h => h.toLowerCase().includes('email'));
      if (emailCol) setFieldMapping({ email: emailCol });
      const nameCol = headers.find(h => h.toLowerCase().includes('name'));
      if (nameCol) setFieldMapping(prev => ({ ...prev, name: nameCol }));
      setWizardStep(1);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (csvData && fieldMapping.email) {
      const contacts = csvData.map(row => {
        const mergeData = {};
        csvHeaders.forEach(h => { mergeData[h] = row[h]; });
        return { email: row[fieldMapping.email] || '', name: fieldMapping.name ? row[fieldMapping.name] : '', mergeData };
      }).filter(c => c.email);
      setMappedContacts(contacts);
    }
  }, [csvData, fieldMapping, csvHeaders]);

  const handleCreateCampaign = async () => {
    if (!name.trim() || mappedContacts.length === 0) return;
    setCreatingCampaign(true);
    try {
      await emailHubApi.createCampaign({ name, subject, body, contacts: mappedContacts, fieldMapping });
      setCreating(false); setName(''); setSubject(''); setBody('');
      setCsvData(null); setCsvHeaders([]); setFieldMapping({}); setMappedContacts([]); setWizardStep(0);
      fetchCampaigns();
    } catch { console.error('Failed'); }
    finally { setCreatingCampaign(false); }
  };

  const handleLaunch = async (id) => {
    setLaunchProgress({ campaignId: id, progress: 0, total: 0, sent: 0, failed: 0 });
    try { await emailHubApi.launchCampaign(id); fetchCampaigns(); }
    catch { setLaunchProgress(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await emailHubApi.deleteCampaign(id); fetchCampaigns();
  };

  const inputStyle = { background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)', boxShadow: '0 1px 3px var(--border-soft)' };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-[1200px] mx-auto p-8">
        {!creating ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Campaigns</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Bulk email campaigns with CSV upload</p>
              </div>
              <button
                onClick={() => { setCreating(true); setWizardStep(0); }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 4px 16px var(--brand-dim)' }}
              >
                <Zap size={16} />
                New Campaign
              </button>
            </div>

            {/* Progress bar */}
            {launchProgress && launchProgress.total > 0 && (
              <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--bg-surface)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--warning)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>
                    Sending {launchProgress.sent}/{launchProgress.total}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(launchProgress.sent / launchProgress.total) * 100}%`, background: 'linear-gradient(90deg, var(--warning), var(--brand))' }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  {launchProgress.sent} sent · {launchProgress.failed} failed
                </p>
              </div>
            )}

            <CampaignList campaigns={campaigns} onLaunch={handleLaunch} onDelete={handleDelete} />
          </>
        ) : (
          /* Wizard */
          <div>
            {/* Stepper */}
            <div className="flex items-center justify-center gap-0 mb-8">
              {STEPS.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300"
                      style={{
                        background: wizardStep >= i ? 'linear-gradient(135deg, var(--brand), var(--brand-light))' : 'var(--bg-raised)',
                        color: wizardStep >= i ? 'var(--bg-raised)' : 'var(--text-muted)',
                        boxShadow: wizardStep >= i ? '0 2px 10px var(--brand-dim)' : '0 1px 4px var(--border-soft)',
                        border: wizardStep >= i ? 'none' : '1.5px solid var(--border-soft)'
                      }}
                    >
                      {wizardStep > i ? <Check size={16} /> : i + 1}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: wizardStep >= i ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="w-12 h-px mx-2" style={{ background: wizardStep > i ? 'var(--brand)' : 'var(--border-soft)' }} />}
                </React.Fragment>
              ))}
            </div>

            {/* Content */}
            <div className="max-w-[700px] mx-auto">
              {/* Step 0: Upload */}
              {wizardStep === 0 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>Campaign Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Q1 Product Launch" className="w-full px-5 py-4 rounded-2xl text-base font-semibold outline-none focus:ring-2 focus:ring-[#C4713A]/20" style={inputStyle} />
                  </div>
                  <div
                    className="border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-200 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-dim)]"
                    style={{ borderColor: 'var(--border-soft)' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-dim)' }}>
                      <FileSpreadsheet size={28} style={{ color: 'var(--brand)' }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Drop your CSV file here</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>or click to browse · First row = headers</p>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>
              )}

              {/* Step 1: Map */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Map CSV columns to fields</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['email', 'name'].map(field => (
                      <div key={field}>
                        <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>{field} Column {field === 'email' ? '*' : ''}</label>
                        <select value={fieldMapping[field] || ''} onChange={e => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="">Select...</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>{mappedContacts.length} contacts ready</p>
                  <div className="flex gap-3">
                    <button onClick={() => setWizardStep(0)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      <ChevronLeft size={14} className="inline mr-1" />Back
                    </button>
                    <button onClick={() => setWizardStep(2)} disabled={!fieldMapping.email}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand)' }}>
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>Subject</label>
                    <div className="flex gap-2 mb-2">
                      <select onChange={e => { const t = templates.find(t => t._id === e.target.value); if (t) { setSubject(t.subject); setBody(t.body); } }}
                        className="px-3 py-2 rounded-xl text-xs" style={inputStyle}>
                        <option value="">Load template...</option>
                        {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject with {{variables}}..."
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>Body</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Body with {{variables}}..."
                      rows={8} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                  </div>
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--border-soft)' }}>
                    <table className="w-full text-xs">
                      <thead><tr style={{ background: 'var(--bg-surface)' }}>
                        <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Email</th>
                        <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Preview</th>
                      </tr></thead>
                      <tbody>
                        {mappedContacts.slice(0, 5).map((c, i) => {
                          let ms = subject;
                          if (c.mergeData) for (const [k, v] of Object.entries(c.mergeData)) ms = ms.replace(new RegExp(`{{${k}}}`, 'g'), v);
                          return (<tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                            <td className="p-3" style={{ color: 'var(--text-primary)' }}>{c.email}</td>
                            <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{ms}</td>
                          </tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setWizardStep(1)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      <ChevronLeft size={14} className="inline mr-1" />Back
                    </button>
                    <button onClick={() => setWizardStep(3)} disabled={!subject.trim() || !body.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand)' }}>
                      Review <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Launch */}
              {wizardStep === 3 && (
                <div className="text-center space-y-6">
                  <div className="p-8 rounded-3xl" style={{ background: 'var(--bg-raised)', border: '1.5px solid var(--border-soft)', boxShadow: '0 4px 24px var(--border-soft)' }}>
                    <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{name}</h3>
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div className="p-4 rounded-2xl" style={{ background: 'var(--brand-dim)' }}>
                        <p className="text-3xl font-bold" style={{ color: 'var(--brand)' }}>{mappedContacts.length}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Recipients</p>
                      </div>
                      <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-surface)' }}>
                        <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>{csvHeaders.length}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>CSV Fields</p>
                      </div>
                      <div className="p-4 rounded-2xl" style={{ background: 'var(--success-dim)' }}>
                        <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>1</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Email</p>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subject: <strong>{subject}</strong></p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => setWizardStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      <ChevronLeft size={14} className="inline mr-1" />Back
                    </button>
                    <button onClick={handleCreateCampaign} disabled={creatingCampaign}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                      style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 4px 16px var(--brand-dim)' }}>
                      {creatingCampaign ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      Create Campaign
                    </button>
                    <button onClick={() => { setCreating(false); setWizardStep(0); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
