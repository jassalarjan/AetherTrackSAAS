import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, Eye, Save, X, FileText, Search, Sparkles, Loader2 } from 'lucide-react';
import emailHubApi from '../services/emailHubApi';
import { TEMPLATE_CATEGORIES, AVAILABLE_VARIABLES } from '../constants/hubConfig';
import sanitizeHtml from '@/shared/utils/sanitizeHtml';

export default function TemplatesPane() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    setLoadError('');
    emailHubApi.getTemplatesList()
      .then((list) => setTemplates(list))
      .catch((err) => {
        setTemplates([]);
        setLoadError(err?.response?.data?.message || 'Unable to load templates');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    try {
      const data = { name, subject, body, category };
      if (editing) await emailHubApi.updateTemplate(editing, data);
      else await emailHubApi.createTemplate(data);
      setEditing(null); setName(''); setSubject(''); setBody(''); setCategory('general');
      setShowEditor(false); fetchTemplates();
    } finally { setSaving(false); }
  };

  const handleEdit = (tpl) => {
    setEditing(tpl._id); setName(tpl.name); setSubject(tpl.subject);
    setBody(tpl.body); setCategory(tpl.category || 'general');
    setShowEditor(true); setPreview(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    await emailHubApi.deleteTemplate(id); fetchTemplates();
  };

  const handleNew = () => {
    setEditing(null); setName(''); setSubject(''); setBody(''); setCategory('general');
    setShowEditor(true); setPreview(null);
  };

  const insertVariable = (v) => setBody(prev => prev + v.key);

  const filtered = templates.filter(t => {
    if (filterCat !== 'all' && t.category !== filterCat) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inputStyle = { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
      {/* Template list */}
      {!showEditor && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 p-6 border-b" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Template Library</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{loading ? 'Loading templates...' : `${templates.length} templates available`}</p>
              </div>
              <button onClick={handleNew}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 2px 10px var(--brand-dim)' }}>
                <Plus size={15} />New Template
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C4713A]/20"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }} />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {[{ id: 'all', label: 'All', color: 'var(--brand)' }, ...TEMPLATE_CATEGORIES].map(c => (
                  <button key={c.id} onClick={() => setFilterCat(c.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                    style={{
                      background: filterCat === c.id ? `${c.color}10` : 'transparent',
                      color: filterCat === c.id ? c.color : 'var(--text-muted)',
                      border: filterCat === c.id ? `1.5px solid ${c.color}20` : '1.5px solid transparent'
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadError && (
              <div className="col-span-full rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--danger-dim)', background: 'var(--danger-dim)', color: 'var(--danger)' }}>
                {loadError}
              </div>
            )}
            {loading && !loadError && (
              <div className="col-span-full text-center py-20">
                <Loader2 size={24} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--brand)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Fetching templates...</p>
              </div>
            )}
            {filtered.map(tpl => {
              const cat = TEMPLATE_CATEGORIES.find(c => c.id === tpl.category);
              return (
                <div key={tpl._id} onClick={() => setPreview(tpl)}
                  className="group rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'var(--bg-raised)', border: '1.5px solid var(--border-soft)', boxShadow: '0 2px 8px var(--border-soft)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                      style={{ background: `${cat?.color || 'var(--text-muted)'}08`, color: cat?.color || 'var(--text-muted)' }}>
                      {cat?.label || tpl.category}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                        className="p-1.5 rounded-lg hover:bg-[var(--brand-dim)]" style={{ color: 'var(--brand)' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(tpl._id); }}
                        className="p-1.5 rounded-lg hover:bg-[var(--danger-dim)]" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm mb-1.5 truncate" style={{ color: 'var(--text-primary)' }}>{tpl.name}</h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{tpl.subject}</p>
                </div>
              );
            })}
            {!loading && filtered.length === 0 && (
              <div className="col-span-full text-center py-20">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-dim)' }}>
                  <FileText size={28} style={{ color: 'var(--brand-dim)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No templates found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !showEditor && (
        <div className="w-[420px] h-full flex flex-col border-l shrink-0" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-soft)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{preview.name}</h3>
            <button onClick={() => setPreview(null)} className="p-2 rounded-xl hover:bg-[var(--border-soft)]" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Subject</p>
            <p className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>{preview.subject}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Body</p>
            <div className="prose prose-sm max-w-none rounded-2xl p-5" style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1.5px solid var(--border-soft)' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.body) }} />
          </div>
          <div className="p-5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <button onClick={() => handleEdit(preview)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 2px 10px var(--brand-dim)' }}>
              <Edit3 size={14} />Edit Template
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      {showEditor && (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[700px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                {editing ? 'Edit Template' : 'New Template'}
              </h3>
              <button onClick={() => { setShowEditor(false); setEditing(null); }} className="p-2 rounded-xl hover:bg-[var(--border-soft)]" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Template name..."
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C4713A]/20" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
                    {TEMPLATE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject with {{variables}}..."
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#C4713A]/20" style={inputStyle} />
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl" style={{ background: 'var(--brand-dim)', border: '1px solid var(--brand-dim)' }}>
                <Sparkles size={14} style={{ color: 'var(--warning)' }} className="mr-1" />
                {AVAILABLE_VARIABLES.map(v => (
                  <button key={v.key} onClick={() => insertVariable(v)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all hover:scale-105"
                    style={{ background: 'var(--bg-raised)', color: 'var(--brand)', border: '1px solid var(--brand-dim)' }}>
                    {v.key}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Body (HTML)</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="<h1>Hello {{firstName}}</h1><p>...</p>" rows={10}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono focus:ring-2 focus:ring-[#C4713A]/20" style={inputStyle} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowEditor(false); setEditing(null); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-secondary)', background: 'var(--border-soft)' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !name.trim() || !subject.trim()}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:scale-[1.02] shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))', boxShadow: '0 4px 14px var(--brand-dim)' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
