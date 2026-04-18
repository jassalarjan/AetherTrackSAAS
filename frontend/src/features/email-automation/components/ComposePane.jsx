import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Send, Clock, TestTube, FileText, Eye, EyeOff,
  Sparkles, X, Check, Loader2, Calendar, PenSquare, Bold, Italic, Link as LinkIcon, List
} from 'lucide-react';
import emailHubApi from '../services/emailHubApi';
import { AVAILABLE_VARIABLES, TEMPLATE_CATEGORIES } from '../constants/hubConfig';
import sanitizeHtml from '@/shared/utils/sanitizeHtml';

function FloatingLabel({ label, value, children }) {
  return (
    <div className="group">
      <label 
        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ml-1 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ComposePane() {
  const editorRef = useRef(null);
  const [to, setTo] = useState('');
  const [toName, setToName] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    emailHubApi.getTemplatesList().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    if (!editorRef.current || showPreview) return;
    if (editorRef.current.innerHTML !== body) {
      editorRef.current.innerHTML = body || '';
    }
  }, [body, showPreview]);

  const interpolateBody = (text, vars = {}) => {
    let out = text;
    AVAILABLE_VARIABLES.forEach(v => {
      out = out.replace(new RegExp(v.key.replace(/[{}]/g, '\\$&'), 'g'), vars[v.key] || v.example);
    });
    return out;
  };

  const handleSend = useCallback(async () => {
    if (!to.trim() || !subject.trim()) return;
    setSending(true); setResult(null);
    try {
      await emailHubApi.sendEmail({
        to: to.trim(), toName: toName.trim(),
        cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        subject, body
      });
      setResult({ type: 'success', message: 'Email sent successfully!' });
      setTimeout(() => { setTo(''); setToName(''); setCc(''); setSubject(''); setBody(''); setResult(null); }, 3000);
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to send' });
    } finally { setSending(false); }
  }, [to, toName, cc, subject, body]);

  const handleSchedule = useCallback(async () => {
    if (!to.trim() || !subject.trim() || !scheduledAt) return;
    setSending(true); setResult(null);
    try {
      await emailHubApi.scheduleEmail({
        to: to.trim(), toName: toName.trim(),
        cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        subject, body, scheduledAt
      });
      setResult({ type: 'success', message: `Scheduled for ${new Date(scheduledAt).toLocaleString()}` });
      setShowSchedule(false);
      setTimeout(() => { setTo(''); setToName(''); setCc(''); setSubject(''); setBody(''); setScheduledAt(''); setResult(null); }, 3000);
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to schedule' });
    } finally { setSending(false); }
  }, [to, toName, cc, subject, body, scheduledAt]);

  const handleTestSend = useCallback(async () => {
    if (!subject.trim() || !body.trim()) return;
    setSendingTest(true);
    try {
      await emailHubApi.testSend({ subject, body });
      setResult({ type: 'success', message: 'Test email sent to your inbox' });
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setResult({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to send test email. Check email provider configuration.'
      });
    }
    finally { setSendingTest(false); }
  }, [subject, body]);

  const loadTemplate = (tpl) => {
    setSubject(tpl.subject || '');
    setBody(tpl.body || tpl.htmlContent || '');
    setShowTemplatePicker(false);
  };

  const insertVariable = (v) => {
    if (editorRef.current && !showPreview) {
      editorRef.current.focus();
      document.execCommand('insertText', false, v.key);
      setBody(editorRef.current.innerHTML);
    } else {
      setBody(prev => prev + v.key);
    }
    setShowVariables(false);
  };

  const applyEditorCommand = (command) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (command === 'createLink') {
      const url = window.prompt('Enter link URL');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand(command, false);
    }
    setBody(editorRef.current.innerHTML);
  };

  const isEditorEmpty = !body || !body.replace(/<[^>]*>/g, '').trim();

  const inputStyle = {
    background: 'var(--bg-raised)',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border-soft)',
    boxShadow: '0 1px 3px var(--border-soft)',
    transition: 'all 0.2s ease'
  };

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--bg-canvas)' }}>
      {/* Main compose area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[900px] mx-auto px-8 py-8">
            
            {/* Compose Card */}
            <div 
              className="rounded-3xl overflow-hidden shadow-xl"
              style={{ 
                background: 'var(--bg-raised)',
                boxShadow: '0 4px 24px var(--border-soft), 0 1px 3px var(--border-soft)',
              }}
            >
              {/* Card Header */}
              <div 
                className="px-7 py-5 flex items-center justify-between"
                style={{ 
                  background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-canvas))',
                  borderBottom: '1px solid var(--border-soft)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                  >
                    <PenSquare size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                      Compose Email
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Simple mode by default. Open advanced controls only when needed.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                    style={{ 
                      background: showTemplatePicker ? 'var(--warning-dim)' : 'var(--border-soft)',
                      color: showTemplatePicker ? 'var(--warning)' : 'var(--text-secondary)'
                    }}
                  >
                    <FileText size={14} />
                    Templates
                  </button>
                </div>
              </div>

              {/* Template Picker Dropdown */}
              {showTemplatePicker && (
                <div 
                  className="px-7 py-4 border-b overflow-x-auto"
                  style={{ 
                    borderColor: 'var(--border-soft)',
                    background: 'linear-gradient(135deg, var(--warning-dim), var(--brand-glow))'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} style={{ color: 'var(--warning)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--warning)' }}>QUICK TEMPLATES</span>
                  </div>
                  <div className="flex gap-2">
                    {templates.slice(0, 6).map(tpl => {
                      const cat = TEMPLATE_CATEGORIES.find(c => c.id === tpl.category);
                      return (
                        <button
                          key={tpl._id}
                          onClick={() => loadTemplate(tpl)}
                          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
                          style={{ 
                            background: 'var(--bg-raised)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-soft)',
                            boxShadow: '0 1px 4px var(--border-soft)'
                          }}
                        >
                          <span className="block truncate max-w-[120px]">{tpl.name}</span>
                          <span className="text-[10px] font-medium mt-0.5 block" style={{ color: cat?.color || 'var(--text-muted)' }}>
                            {cat?.label || tpl.category}
                          </span>
                        </button>
                      );
                    })}
                    {templates.length === 0 && (
                      <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No templates yet — create one in the Templates tab</p>
                    )}
                  </div>
                </div>
              )}

              {/* Fields */}
              <div className="px-7 py-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>To</span>
                  </div>
                  <div className="flex-1 flex gap-3">
                    <input
                      type="email"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="recipient@example.com"
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C4713A]/20"
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={toName}
                      onChange={(e) => setToName(e.target.value)}
                      placeholder="Name (optional)"
                      className="w-44 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C4713A]/20"
                      style={inputStyle}
                    />
                  </div>
                </div>
                {showAdvanced && (
                <div className="flex items-center gap-4">
                  <div className="w-16 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cc</span>
                  </div>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc emails, comma separated"
                    className="flex-1 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C4713A]/20"
                    style={inputStyle}
                  />
                </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-16 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Type a clear subject..."
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#C4713A]/20"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border"
                      style={{ borderColor: 'var(--border-soft)', color: 'var(--text-secondary)', background: 'var(--bg-raised)' }}
                    >
                      {showAdvanced ? 'Basic Mode' : 'Advanced'}
                    </button>
                  </div>
                </div>
              </div>

              {showAdvanced && (
                <div className="px-7 py-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-raised)' }}>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => applyEditorCommand('bold')} className="p-2 rounded-lg hover:bg-[var(--border-soft)]" style={{ color: 'var(--text-secondary)' }}><Bold size={14} /></button>
                    <button type="button" onClick={() => applyEditorCommand('italic')} className="p-2 rounded-lg hover:bg-[var(--border-soft)]" style={{ color: 'var(--text-secondary)' }}><Italic size={14} /></button>
                    <button type="button" onClick={() => applyEditorCommand('insertUnorderedList')} className="p-2 rounded-lg hover:bg-[var(--border-soft)]" style={{ color: 'var(--text-secondary)' }}><List size={14} /></button>
                    <button type="button" onClick={() => applyEditorCommand('createLink')} className="p-2 rounded-lg hover:bg-[var(--border-soft)]" style={{ color: 'var(--text-secondary)' }}><LinkIcon size={14} /></button>
                    <button
                      type="button"
                      onClick={() => setShowVariables(!showVariables)}
                      className="ml-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                      style={{
                        background: showVariables ? 'var(--brand-dim)' : 'transparent',
                        color: showVariables ? 'var(--brand)' : 'var(--text-secondary)'
                      }}
                    >
                      Insert Variables
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: showPreview ? 'var(--brand-dim)' : 'var(--border-soft)',
                      color: showPreview ? 'var(--brand)' : 'var(--text-secondary)'
                    }}
                  >
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPreview ? 'Back to Editor' : 'Preview'}
                  </button>
                </div>
              )}

              {/* Variable Insert Panel */}
              {showVariables && (
                <div 
                  className="px-7 py-4 border-t"
                  style={{ 
                    borderColor: 'var(--border-soft)',
                    background: 'linear-gradient(135deg, var(--brand-dim), var(--bg-surface))'
                  }}
                >
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_VARIABLES.map(v => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v)}
                        className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95"
                        style={{ 
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--brand-dim)',
                          boxShadow: '0 1px 4px var(--border-soft)'
                        }}
                      >
                        <code className="font-mono font-bold text-[11px]" style={{ color: 'var(--brand)' }}>{v.key}</code>
                        <span style={{ color: 'var(--text-muted)' }}>{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Body / Preview */}
              <div className="relative" style={{ minHeight: '320px' }}>
                {showPreview ? (
                  <div className="px-7 py-6" style={{ background: 'var(--bg-canvas)' }}>
                    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-raised)', boxShadow: '0 1px 8px var(--border-soft)' }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Subject</p>
                      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{subject || '(no subject)'}</p>
                      <div className="w-full h-px mb-4" style={{ background: 'var(--border-soft)' }} />
                      <div 
                        className="prose prose-sm max-w-none"
                        style={{ color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(interpolateBody(body) || '<p style="color:var(--text-muted)">Nothing to preview yet...</p>') }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative min-h-[320px]">
                    {isEditorEmpty && (
                      <div className="absolute left-7 top-6 pointer-events-none text-sm" style={{ color: 'var(--text-muted)' }}>
                        Write your message here. Keep it simple and friendly.
                      </div>
                    )}
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => setBody(e.currentTarget.innerHTML)}
                      className="w-full h-full min-h-[320px] px-7 py-6 text-sm outline-none leading-relaxed"
                      style={{
                        background: 'var(--bg-raised)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-body)',
                        caretColor: '#C4713A'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Footer / Actions */}
              <div 
                className="px-7 py-5 flex items-center justify-between border-t"
                style={{ 
                  borderColor: 'var(--border-soft)',
                  background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-canvas))'
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Result toast */}
                  {result && (
                    <div 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold animate-[slideIn_0.2s_ease]"
                      style={{ 
                        background: result.type === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)',
                        color: result.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${result.type === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)'}`
                      }}
                    >
                      {result.type === 'success' ? <Check size={14} /> : <X size={14} />}
                      {result.message}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Test send */}
                  <button
                    onClick={handleTestSend}
                    disabled={sendingTest || !subject.trim() || !body.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-40"
                    style={{ 
                      background: 'var(--brand-dim)',
                      color: 'var(--brand)',
                      border: '1px solid var(--brand-dim)'
                    }}
                  >
                    {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
                    Test to Self
                  </button>

                  {/* Schedule */}
                  {showSchedule ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="px-3 py-2.5 rounded-xl text-xs outline-none"
                        style={{ ...inputStyle, width: '200px' }}
                      />
                      <button
                        onClick={handleSchedule}
                        disabled={!to.trim() || !subject.trim() || !scheduledAt}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200 disabled:opacity-40 hover:scale-[1.02] active:scale-95"
                        style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                      >
                        <Calendar size={14} />
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowSchedule(false)}
                        className="p-2.5 rounded-xl hover:bg-[rgba(42,30,22,0.05)] transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSchedule(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      style={{ 
                        background: 'var(--border-soft)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-soft)'
                      }}
                    >
                      <Clock size={14} />
                      Schedule
                    </button>
                  )}

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={sending || !to.trim() || !subject.trim()}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 hover:scale-[1.02] active:scale-95 shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--brand), var(--brand-light))',
                      boxShadow: '0 4px 14px var(--brand-dim)'
                    }}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
