import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Play, Pause, Copy, Trash2, Users, Clock, Mail, Edit3, Save, X,
  ArrowRight, ChevronRight, Loader2, GitBranch, Sparkles, GripVertical
} from 'lucide-react';
import emailHubApi from '../services/emailHubApi';

function StepCard({ step, index, onChange, onRemove, total, isNew }) {
  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{
        background: 'var(--bg-raised)',
        border: '1.5px solid var(--border-soft)',
        boxShadow: '0 2px 8px var(--border-soft)'
      }}
    >
      {/* Terracotta accent bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: 'linear-gradient(180deg, var(--brand), var(--brand-light))' }}
      />
      
      <div className="pl-5 pr-5 py-5">
        {/* Step header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 2px 8px var(--brand-dim)' }}
            >
              {index + 1}
            </div>
            <div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Step {index + 1}
              </span>
              {index > 0 && (
                <span className="ml-2 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  +{step.delayDays}d {step.delayHours > 0 ? `${step.delayHours}h` : ''} after Step {index}
                </span>
              )}
              {index === 0 && (
                <span className="ml-2 text-[11px] font-medium" style={{ color: 'var(--success)' }}>Sends immediately</span>
              )}
            </div>
          </div>
          {total > 1 && (
            <button 
              onClick={() => onRemove(index)} 
              className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-[rgba(176,80,80,0.06)]"
              style={{ color: 'var(--danger)' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Delay config (not for first step) */}
        {index > 0 && (
          <div 
            className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface)' }}
          >
            <Clock size={14} style={{ color: 'var(--warning)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Wait</span>
            <input
              type="number" min="0" value={step.delayDays}
              onChange={(e) => onChange(index, 'delayDays', parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1.5 rounded-lg text-xs text-center outline-none font-semibold"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>days</span>
            <input
              type="number" min="0" max="23" value={step.delayHours}
              onChange={(e) => onChange(index, 'delayHours', parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1.5 rounded-lg text-xs text-center outline-none font-semibold"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>hours</span>
            <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-muted)' }}>then send</span>
          </div>
        )}

        {/* Subject */}
        <div className="mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Subject Line</label>
          <input
            type="text" value={step.subject}
            onChange={(e) => onChange(index, 'subject', e.target.value)}
            placeholder="Step subject line..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C4713A]/20 transition-all"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email Body</label>
          <textarea
            value={step.body}
            onChange={(e) => onChange(index, 'body', e.target.value)}
            placeholder="Email body with {{variables}}..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-[#C4713A]/20 transition-all leading-relaxed"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
          />
        </div>
      </div>

      {/* Arrow connector to next step */}
      {index < total - 1 && (
        <div className="flex justify-center py-2" style={{ background: 'var(--bg-surface)' }}>
          <ArrowRight size={18} style={{ color: 'var(--brand-light)', transform: 'rotate(90deg)' }} />
        </div>
      )}
    </div>
  );
}

function EnrollModal({ sequence, onClose, onEnroll }) {
  const [emails, setEmails] = useState('');
  const [names, setNames] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async () => {
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
    const nameList = names.split(',').map(n => n.trim());
    if (emailList.length === 0) return;
    setEnrolling(true);
    const contacts = emailList.map((email, i) => ({ email, name: nameList[i] || '' }));
    await onEnroll(contacts);
    setEnrolling(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-surface)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-3xl p-8 w-[460px] max-h-[80vh] overflow-y-auto"
        style={{ 
          background: 'var(--bg-raised)', 
          boxShadow: '0 24px 80px var(--text-secondary)',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand-dim), var(--bg-surface))' }}
          >
            <Users size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Enroll Contacts</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add contacts to "{sequence.name}"</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Emails (comma separated)</label>
            <textarea
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="john@example.com, jane@example.com"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-[#C4713A]/20"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Names (comma separated, optional)</label>
            <textarea
              value={names}
              onChange={e => setNames(e.target.value)}
              placeholder="John Doe, Jane Smith"
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-[#C4713A]/20"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-secondary)', background: 'var(--border-soft)' }}>
            Cancel
          </button>
          <button
            onClick={handleEnroll}
            disabled={enrolling || !emails.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 4px 14px var(--brand-dim)' }}
          >
            {enrolling ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Enroll Contacts
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SequencesPane() {
  const [sequences, setSequences] = useState([]);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([{ delayDays: 0, delayHours: 0, subject: '', body: '', templateId: null }]);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchSequences = useCallback(() => {
    emailHubApi.getSequences().then(r => setSequences(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchSequences(); }, []);

  const handleStepChange = (index, field, value) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { delayDays: 3, delayHours: 0, subject: '', body: '', templateId: null }]);
  };

  const removeStep = (index) => {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const stepData = steps.map((s, i) => ({ ...s, order: i }));
      if (editing) {
        await emailHubApi.updateSequence(editing, { name, steps: stepData });
      } else {
        await emailHubApi.createSequence({ name, steps: stepData });
      }
      setEditing(null); setName('');
      setSteps([{ delayDays: 0, delayHours: 0, subject: '', body: '', templateId: null }]);
      fetchSequences();
    } finally { setSaving(false); }
  };

  const handleEdit = (seq) => {
    setEditing(seq._id);
    setName(seq.name);
    setSteps(seq.steps.length > 0 ? seq.steps : [{ delayDays: 0, delayHours: 0, subject: '', body: '' }]);
  };

  const handleToggleStatus = async (seq) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';
    await emailHubApi.updateSequence(seq._id, { status: newStatus });
    fetchSequences();
  };

  const handleClone = async (id) => { await emailHubApi.cloneSequence(id); fetchSequences(); };
  const handleDelete = async (id) => {
    if (!confirm('Delete this sequence?')) return;
    await emailHubApi.deleteSequence(id); fetchSequences();
  };

  const handleEnroll = async (contacts) => {
    if (!enrollTarget) return;
    await emailHubApi.enrollSequence(enrollTarget._id, contacts);
    fetchSequences();
  };

  const statusConfig = {
    draft:    { bg: 'var(--brand-dim)', color: 'var(--text-muted)', label: 'Draft', dot: 'var(--text-muted)' },
    active:   { bg: 'var(--success-dim)',   color: 'var(--success)', label: 'Active', dot: 'var(--success)' },
    paused:   { bg: 'var(--text-secondary)',  color: 'var(--warning)', label: 'Paused', dot: 'var(--warning)' },
    archived: { bg: 'var(--brand-dim)', color: 'var(--text-muted)', label: 'Archived', dot: 'var(--text-muted)' },
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
      {/* Sequence List */}
      <div className="w-[380px] h-full flex flex-col border-r shrink-0" style={{ borderColor: 'var(--border-soft)' }}>
        {/* Header */}
        <div 
          className="shrink-0 p-5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-3">
            <GitBranch size={18} style={{ color: 'var(--brand)' }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Sequences</h2>
          </div>
          <button
            onClick={() => { setEditing(null); setName(''); setSteps([{ delayDays: 0, delayHours: 0, subject: '', body: '' }]); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 2px 8px var(--brand-dim)' }}
          >
            <Plus size={16} className="text-white" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sequences.map(seq => {
            const sc = statusConfig[seq.status] || statusConfig.draft;
            const isActive = editing === seq._id;
            return (
              <div
                key={seq._id}
                className="p-4 rounded-2xl cursor-pointer transition-all duration-200 group"
                style={{
                  background: isActive ? 'var(--bg-raised)' : 'transparent',
                  border: isActive ? '1.5px solid var(--brand-dim)' : '1.5px solid transparent',
                  boxShadow: isActive ? '0 4px 16px var(--border-soft)' : 'none'
                }}
                onClick={() => handleEdit(seq)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{seq.name}</span>
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                    {sc.label}
                  </div>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  {seq.steps.length} step{seq.steps.length !== 1 ? 's' : ''} · {seq.enrolledContacts?.length || 0} contact{seq.enrolledContacts?.length !== 1 ? 's' : ''}
                </p>
                {/* Steps preview */}
                <div className="flex gap-1 mb-3">
                  {seq.steps.slice(0, 5).map((s, i) => (
                    <div 
                      key={i}
                      className="flex-1 h-1.5 rounded-full"
                      style={{ background: i === 0 ? 'var(--brand)' : 'var(--brand-dim)' }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(seq); }}
                    className="p-2 rounded-xl transition-colors hover:bg-[rgba(42,30,22,0.04)]"
                    style={{ color: seq.status === 'active' ? 'var(--warning)' : 'var(--success)' }}
                    title={seq.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    {seq.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEnrollTarget(seq); }}
                    className="p-2 rounded-xl transition-colors hover:bg-[rgba(42,30,22,0.04)]"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Enroll contacts"
                  >
                    <Users size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClone(seq._id); }}
                    className="p-2 rounded-xl transition-colors hover:bg-[rgba(42,30,22,0.04)]"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Clone"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(seq._id); }}
                    className="p-2 rounded-xl transition-colors hover:bg-[rgba(176,80,80,0.06)]"
                    style={{ color: 'var(--danger)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {sequences.length === 0 && (
            <div className="text-center py-16">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--brand-dim)' }}
              >
                <GitBranch size={28} style={{ color: 'var(--brand-dim)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No sequences yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Create your first drip sequence</p>
            </div>
          )}
        </div>
      </div>

      {/* Step Editor */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[600px] mx-auto">
          {/* Name input */}
          <div className="mb-8">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>Sequence Name</label>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. New Client Onboarding Drip"
              className="w-full px-5 py-4 rounded-2xl text-lg font-bold outline-none focus:ring-2 focus:ring-[#C4713A]/20 transition-all"
              style={{ 
                background: 'var(--bg-raised)', 
                color: 'var(--text-primary)', 
                border: '1.5px solid var(--border-soft)',
                boxShadow: '0 2px 8px var(--border-soft)',
                fontFamily: 'var(--font-heading)'
              }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, i) => (
              <StepCard
                key={i} step={step} index={i} total={steps.length}
                onChange={handleStepChange} onRemove={removeStep}
              />
            ))}
          </div>

          {/* Add step + Save */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={addStep}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
              style={{ 
                background: 'var(--bg-raised)',
                color: 'var(--brand)',
                border: '2px dashed var(--brand-dim)',
                boxShadow: '0 2px 8px var(--border-soft)'
              }}
            >
              <Plus size={16} />
              Add Step
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, var(--brand), var(--brand-light))',
                boxShadow: '0 4px 16px var(--brand-dim)'
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? 'Update Sequence' : 'Create Sequence'}
            </button>
          </div>
        </div>
      </div>

      {enrollTarget && (
        <EnrollModal sequence={enrollTarget} onClose={() => setEnrollTarget(null)} onEnroll={handleEnroll} />
      )}
    </div>
  );
}
