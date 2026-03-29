/**
 * AetherTrack Workspace Page
 * Exact replica of the reference HTML UI from ui_inspire.html
 * 
 * This page reproduces the dashboard with:
 * - Exact CSS classes from reference (shell, sidebar, header, main, etc.)
 * - Same layout structure (content-grid with left/right columns)
 * - Same components (KPIs, AI Insight, Tasks, Kanban, Velocity, Activity, Leave, Attendance, Team, Projects)
 * - Same interactions (tabs, command palette, toasts, theme toggle)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SectionLoader } from '@/shared/components/ui/Spinner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useSidebar } from '@/features/workspace/context/SidebarContext';
import api from '@/shared/services/axios';
import { MobileKanbanRoot } from '@/components/kanban/mobile';
import '@/styles/aethertrack-reference.css';
import ResponsivePageLayout from '@/shared/components/responsive/ResponsivePageLayout';
import ALL_PAGES from '@/shared/constants/pages.json';

// Sparkline SVG component
const Sparkline = ({ color = 'var(--brand)', data = [] }) => {
  const points = data.length > 0 ? data : [26, 20, 22, 16, 14, 9, 6, 4, 4];
  const width = 120;
  const height = 30;
  const maxVal = Math.max(...points);
  const minVal = Math.min(...points);
  const range = maxVal - minVal || 1;
  
  const areaPath = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((val - minVal) / range) * (height - 4) - 2;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L${width} ${height} L0 ${height} Z`;
  
  const linePath = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((val - minVal) / range) * (height - 4) - 2;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path className="spark-area" style={{ fill: color }} d={areaPath} />
      <path className="spark-line" style={{ stroke: color }} d={linePath} />
    </svg>
  );
};

// Progress Ring component
const ProgressRing = ({ progress = 0, size = 24, color = 'var(--brand)' }) => {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="ring" aria-label={`${progress}% complete`}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle className="ring-track" cx="12" cy="12" r={radius} />
        <circle 
          className="ring-fill" 
          style={{ stroke: color }} 
          cx="12" 
          cy="12" 
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-pct">{progress}</div>
    </div>
  );
};

// Project Ring component
const ProjectRing = ({ progress = 0, color = 'var(--brand)' }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="proj-ring" aria-label={`${progress}% complete`}>
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle 
          fill="none" 
          stroke="var(--border-soft)" 
          strokeWidth="3" 
          cx="18" 
          cy="18" 
          r={radius}
        />
        <circle 
          fill="none" 
          stroke={color} 
          strokeWidth="3" 
          strokeLinecap="round"
          cx="18" 
          cy="18" 
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div className="proj-ring-c">{progress}%</div>
    </div>
  );
};

// Radial Progress component
const RadialProgress = ({ current, total, color = 'var(--brand)' }) => {
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const progress = current / total;
  const offset = circumference - progress * circumference;
  
  return (
    <div className="radial-wrap" aria-label={`${current} of ${total} days`}>
      <svg width="66" height="66" viewBox="0 0 66 66">
        <circle className="r-track" cx="33" cy="33" r={radius} />
        <circle 
          className="r-arc" 
          cx="33" 
          cy="33" 
          r={radius}
          style={{ stroke: color }}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="r-center">
        <div className="r-val">{current}</div>
        <div className="r-of">/ {total}</div>
      </div>
    </div>
  );
};

// KPI Card component
const KPICard = ({ icon, value, label, delta, deltaType, color = 'var(--brand)', bgColor = 'var(--brand-dim)', sparkData }) => {
  return (
    <div className="kpi" style={{ '--kpi-color': color, '--kpi-bg': bgColor }}>
      <div className="kpi-top">
        <div className="kpi-icon" aria-hidden="true">{icon}</div>
        <div className={`kpi-delta ${deltaType}`}>{delta}</div>
      </div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-label">{label}</div>
      <Sparkline color={color} data={sparkData} />
    </div>
  );
};

// AI Insight component
const AIInsight = ({ onDismiss }) => {
  return (
    <div className="ai-insight" role="region" aria-label="AI insight">
      <div className="ai-spark" aria-hidden="true">✦</div>
      <div className="ai-body">
        <div className="ai-label">AI Insight</div>
        <div className="ai-text">
          Sprint 14 is tracking <strong>18% behind velocity</strong>. Priya has 3 overdue tasks across 2 projects. Reassigning <strong>Token System Audit</strong> would reduce risk before Friday's deadline — estimated impact: saves 2 days.
        </div>
        <div className="ai-btns">
          <button className="btn btn-sm" style={{ background: 'var(--ai-dim)', color: 'var(--ai-color)', borderColor: 'rgba(122,106,170,0.2)' }}>View plan</button>
          <button className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss</button>
        </div>
      </div>
      <button className="ai-dismiss" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
};

// Task Card component
const TaskCard = ({ priority, project, title, assignees, due, progress, tags, onComplete, onEdit }) => {
  const priorityColors = {
    critical: 'var(--danger)',
    high: 'var(--warning)',
    normal: 'var(--brand)',
    medium: 'var(--brand)',
    low: 'var(--success)',
  };
  
  const dueClass = due === 'Overdue' ? 'r' : due.includes('Today') ? 'r' : due.includes('days') ? 'y' : 'g';
  const pipColor = priorityColors[priority?.toLowerCase()] || 'var(--brand)';
  
  return (
    <div className="task-card" role="listitem" tabIndex="0">
      <div className="task-pip" style={{ '--pip': pipColor }}></div>
      <div className="tc-body">
        <div className="tc-meta">
          <span className="tc-proj">{project}</span>
          {tags}
        </div>
        <div className="tc-title">{title}</div>
        <div className="tc-foot">
          <div className="av-stack" aria-hidden="true">
            {assignees.map((a, i) => (
              <div key={i} className="av-mini" style={{ background: a.color }}>{a.initials}</div>
            ))}
          </div>
          <div className={`due ${dueClass}`}>📅 {due}</div>
        </div>
      </div>
      <ProgressRing progress={progress} color={pipColor} />
      <div className="task-qa">
        <button className="qa-btn" title="Complete" onClick={() => onComplete && onComplete()}>✓</button>
        <button className="qa-btn" title="Edit" onClick={() => onEdit && onEdit()}>✎</button>
        <button className="qa-btn" title="More">⋯</button>
      </div>
    </div>
  );
};

// Tasks Panel component
const TasksPanel = ({ tasks, loading, onTaskComplete, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('inprogress');
  
  // Filter tasks by status - guard against non-array
  const taskArray = Array.isArray(tasks) ? tasks : [];
  const inProgressTasks = taskArray.filter(t => t.status === 'in_progress' || t.status === 'inprogress');
  const todoTasks = taskArray.filter(t => t.status === 'todo' || t.status === 'pending');
  const doneTasks = taskArray.filter(t => t.status === 'done' || t.status === 'completed');
  
  const getFilteredTasks = () => {
    switch(activeTab) {
      case 'inprogress': return inProgressTasks;
      case 'todo': return todoTasks;
      case 'done': return doneTasks;
      default: return inProgressTasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const dueTodayCount = inProgressTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  }).length;

  // Transform API task to UI format
  const transformTask = (task) => {
    const priority = task.priority || 'normal';
    const projectName = task.project_id?.name || 'No Project';
    const assignees = task.assigned_to ? [{
      initials: task.assigned_to.full_name?.split(' ').map(n => n[0]).join('') || 'U',
      color: 'var(--brand)',
      name: task.assigned_to.full_name
    }] : [];
    
    let due = '';
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) due = 'Overdue';
      else if (diffDays === 0) due = 'Today';
      else if (diffDays === 1) due = '1 day';
      else if (diffDays <= 7) due = `${diffDays} days`;
      else due = `${diffDays} days`;
    }
    
    const progress = task.progress || 0;
    
    const tagClass = priority === 'critical' ? 'tag-r' : priority === 'high' ? 'tag-y' : priority === 'medium' ? 'tag-b' : 'tag-g';
    const tag = <span className={`tag ${tagClass}`}>{priority}</span>;
    
    return {
      priority,
      project: projectName,
      title: task.title,
      assignees,
      due,
      progress,
      tag,
      task
    };
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">My Tasks</div>
          <div className="panel-sub">{tasks.length} tasks · {dueTodayCount} due today</div>
        </div>
        <div className="panel-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab(activeTab === 'inprogress' ? 'todo' : activeTab === 'todo' ? 'done' : 'inprogress')}>Filter</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('/tasks')}>All →</button>
        </div>
      </div>
      
      <div className="tab-row" role="tablist">
        <button
          className={`tab ${activeTab === 'inprogress' ? 'on' : ''}`}
          role="tab"
          aria-selected={activeTab === 'inprogress'}
          tabIndex={activeTab === 'inprogress' ? 0 : -1}
          onClick={() => setActiveTab('inprogress')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('inprogress'); } }}
        >
          In Progress <span className="tab-count">{inProgressTasks.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'todo' ? 'on' : ''}`}
          role="tab"
          aria-selected={activeTab === 'todo'}
          tabIndex={activeTab === 'todo' ? 0 : -1}
          onClick={() => setActiveTab('todo')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('todo'); } }}
        >
          Todo <span className="tab-count">{todoTasks.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'done' ? 'on' : ''}`}
          role="tab"
          aria-selected={activeTab === 'done'}
          tabIndex={activeTab === 'done' ? 0 : -1}
          onClick={() => setActiveTab('done')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('done'); } }}
        >
          Done <span className="tab-count">{doneTasks.length}</span>
        </button>
      </div>
      
      <div className="task-list" role="list">
        {loading ? (
          <SectionLoader label="Loading tasks…" minHeight="80px" />
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state-inline">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ color: 'var(--text-faint)', margin: '0 auto var(--s2)' }}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tasks match this filter</p>
          </div>
        ) : (
          filteredTasks.slice(0, 5).map((task, i) => (
            <TaskCard 
              key={task._id || i} 
              {...transformTask(task)} 
              onComplete={() => onTaskComplete && onTaskComplete(task._id, 'done')}
              onEdit={() => onNavigate && onNavigate('/tasks')}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Kanban Card component
const KanbanCard = ({ title, tag, due, borderColor, opacity = 1 }) => {
  return (
    <div className="kb-card" style={{ borderLeft: borderColor ? `3px solid ${borderColor}` : undefined, opacity }}>
      <div className="kb-card-title">{title}</div>
      <div className="kb-card-foot">
        <span className="tag tag-b">{tag}</span>
        <div className="due g" style={{ fontSize: '10px' }}>📅 {due}</div>
      </div>
    </div>
  );
};

// Kanban Panel component
const KanbanPanel = ({ tasks, sprint, onNavigate, isMobile = false, onTaskMove }) => {
  const taskArray = Array.isArray(tasks) ? tasks : [];
  const todoTasks = taskArray.filter(t => t.status === 'todo' || t.status === 'pending');
  const inProgressTasks = taskArray.filter(t => t.status === 'in_progress' || t.status === 'inprogress');
  const doneTasks = taskArray.filter(t => t.status === 'done' || t.status === 'completed');

  const mobileColumns = useMemo(() => {
    const colorMap = {
      todo: '#64748b',
      in_progress: '#C4713A',
      done: '#22c55e',
    };

    return [
      { id: 'todo', title: 'To Do', color: colorMap.todo, cards: todoTasks },
      { id: 'in_progress', title: 'In Progress', color: colorMap.in_progress, cards: inProgressTasks },
      { id: 'done', title: 'Done', color: colorMap.done, cards: doneTasks },
    ].map((column) => ({
      id: column.id,
      title: column.title,
      color: column.color,
      cards: column.cards.map((task) => ({
        id: task._id || task.id,
        title: task.title || task.name || 'Untitled task',
        assignee: Array.isArray(task.assigned_to) ? task.assigned_to[0] || null : task.assigned_to || null,
        priority: task.priority,
        tags: task.tags || [],
        dueDate: task.due_date || task.dueDate,
        description: task.description || '',
        columnId: column.id,
        columnColor: column.color,
        rawTask: task,
      })),
    }));
  }, [todoTasks, inProgressTasks, doneTasks]);

  const handleMobileCardMove = async (cardId, toColumnId) => {
    if (!onTaskMove) return;
    await onTaskMove(cardId, toColumnId);
  };

  const handleMobileCardAdd = async () => {
    onNavigate && onNavigate('/kanban?create=true');
  };

  const handleMobileCardEdit = async () => {
    onNavigate && onNavigate('/kanban');
  };

  const handleMobileCardDelete = async () => {
    onNavigate && onNavigate('/kanban');
  };
  
  const formatTaskDue = (dueDate) => {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d';
    if (diffDays < 0) return 'Overdue';
    return `${diffDays}d`;
  };
  
  const getTaskBorderColor = (dueDate, status) => {
    if (status === 'done' || status === 'completed') return undefined;
    if (!dueDate) return undefined;
    
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'var(--danger)';
    if (diffDays === 0) return 'var(--danger)';
    if (diffDays <= 2) return 'var(--warning)';
    return 'var(--brand)';
  };
  
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">{sprint?.name || 'Kanban Board'}</div>
          <div className="panel-sub">{taskArray.length} tasks · {inProgressTasks.length} in progress</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('/kanban')}>Full board →</button>
      </div>
      {isMobile ? (
        <MobileKanbanRoot
          columns={mobileColumns}
          loading={false}
          onCardMove={handleMobileCardMove}
          onCardAdd={handleMobileCardAdd}
          onCardEdit={handleMobileCardEdit}
          onCardDelete={handleMobileCardDelete}
          onCardAssign={() => {}}
        />
      ) : (
      <div className="kanban">
        <div className="kb-col">
          <div className="kb-col-hd">
            <div className="kb-title">
              <div className="kb-dot" style={{ background: 'var(--text-faint)' }}></div>
              To Do
            </div>
            <span className="kb-count">{todoTasks.length}</span>
          </div>
          <div className="wip"><div className="wip-fill" style={{ width: `${Math.min(todoTasks.length * 20, 100)}%`, background: 'var(--text-faint)' }}></div></div>
          {todoTasks.slice(0, 3).map(task => (
            <KanbanCard 
              key={task._id}
              title={task.title || task.name}
              tag={task.priority || 'normal'}
              due={formatTaskDue(task.due_date)}
            />
          ))}
          {todoTasks.length === 0 && (
            <div className="empty-state-inline">
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nothing to do — add a task to get started</p>
            </div>
          )}
        </div>
        <div className="kb-col">
          <div className="kb-col-hd">
            <div className="kb-title">
              <div className="kb-dot" style={{ background: 'var(--warning)' }}></div>
              In Progress
            </div>
            <span className="kb-count">{inProgressTasks.length}</span>
          </div>
          <div className="wip"><div className="wip-fill" style={{ width: `${Math.min(inProgressTasks.length * 25, 100)}%`, background: 'var(--warning)' }}></div></div>
          {inProgressTasks.slice(0, 3).map(task => (
            <KanbanCard 
              key={task._id}
              title={task.title || task.name}
              tag={task.priority || 'active'}
              due={formatTaskDue(task.due_date)}
              borderColor={getTaskBorderColor(task.due_date, task.status)}
            />
          ))}
          {inProgressTasks.length === 0 && (
            <div className="empty-state-inline">
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No tasks in progress</p>
            </div>
          )}
        </div>
        <div className="kb-col">
          <div className="kb-col-hd">
            <div className="kb-title">
              <div className="kb-dot" style={{ background: 'var(--success)' }}></div>
              Done
            </div>
            <span className="kb-count">{doneTasks.length}</span>
          </div>
          <div className="wip"><div className="wip-fill" style={{ width: '100%', background: 'var(--success)' }}></div></div>
          {doneTasks.slice(0, 3).map(task => (
            <KanbanCard 
              key={task._id}
              title={task.title || task.name}
              tag="✓ Done"
              due=""
              opacity={0.55}
            />
          ))}
          {doneTasks.length === 0 && (
            <div className="empty-state-inline">
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No completed tasks yet</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

// Velocity Panel component
const VelocityPanel = ({ projects, sprint, onNavigate }) => {
  // Transform projects to velocity metrics
  const metrics = projects.slice(0, 5).map((p, i) => {
    const colors = ['var(--brand)', 'var(--success)', 'var(--warning)', 'var(--danger)', '#7A9ABB'];
    // Calculate progress from task completion or use stored progress field
    const pct = p.progress != null ? p.progress
      : p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100)
      : 0;
    return {
      name: p.name || 'Untitled Project',
      pct,
      color: colors[i % colors.length]
    };
  });

  // Use default metrics if no projects
  const displayMetrics = metrics.length > 0 ? metrics : [
    { name: 'No projects', pct: 0, color: 'var(--text-faint)' }
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Project Velocity</div>
          <div className="panel-sub">{sprint?.name || 'Sprint'} · completion rate by area</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('/projects')}>Full report →</button>
      </div>
      <div className="metric-list">
        {displayMetrics.map((m, i) => (
          <div className="metric-row" key={i}>
            <div className="metric-name">{m.name}</div>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{ width: `${m.pct}%`, background: m.color }}></div>
            </div>
            <div className="metric-pct" style={{ color: m.color }}>{m.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Activity Feed Item component
const FeedItem = ({ initials, color, name, action, time, isLive }) => {
  return (
    <div className="feed-item">
      <div className="feed-av" style={{ background: color }}>{initials}</div>
      <div>
        <div className="feed-text">
          {isLive && <span className="live-ring" aria-hidden="true"></span>}
          <strong>{name}</strong> {action}
        </div>
        <div className="feed-time">{time}</div>
      </div>
    </div>
  );
};

// Activity Feed component
const ActivityFeed = ({ activities, loading }) => {
  // Transform changelog data to activity format
  const getActivities = () => {
    if (!Array.isArray(activities) || activities.length === 0) {
      return null; // signals empty state below
    }
    
    const colors = ['var(--brand)', '#5A8A6A', '#7A6AAA', '#C49A3A', '#7A9ABB', '#8B5E3C'];
    
    return activities.map((activity, i) => {
      // Support both populated user_id and direct user fields
      const user = activity.user_id || activity.user;
      const userName = activity.user_name || user?.full_name || user?.email?.split('@')[0] || 'User';
      const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
      
      // Format action text - use description if available, otherwise construct from action and target
      let action = activity.description || activity.action || 'performed an action';
      if (!activity.description && activity.target_type) {
        action = `${activity.action || 'modified'} ${activity.target_type}`;
        if (activity.target_name) {
          action += `: ${activity.target_name}`;
        }
      }
      
      // Format time
      const time = activity.created_at || activity.createdAt || activity.timestamp;
      const timeAgo = time ? formatTimeAgo(new Date(time)) : '';
      
      return {
        initials,
        color: colors[i % colors.length],
        name: userName,
        action,
        time: timeAgo,
        isLive: i === 0 // First item is "live"
      };
    });
  };
  
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const displayActivities = getActivities();

  return (
    <div className="panel" style={{ marginBottom: 'var(--s6)' }}>
      <div className="panel-head">
        <div>
          <div className="panel-title"><span className="live-ring" aria-hidden="true"></span>Live Activity</div>
          <div className="panel-sub">Real-time updates</div>
        </div>
      </div>
      {loading ? (
        <SectionLoader label="Loading activity…" minHeight="80px" />
      ) : displayActivities === null ? (
        <div className="empty-state-inline">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No recent activity — actions you and your team take will appear here.</p>
        </div>
      ) : (
        <div role="log" aria-live="polite" aria-label="Activity feed">
          {displayActivities.map((a, i) => (
            <FeedItem key={i} {...a} />
          ))}
        </div>
      )}
    </div>
  );
};

// Leave Balances component
const LeaveBalances = ({ leaveBalances, loading, onNavigate }) => {
  // Transform leave balances to radial data
  const getBalances = () => {
    if (!leaveBalances || leaveBalances.length === 0) {
      return [
        { type: 'Annual', current: 12, total: 20, color: 'var(--brand)' },
        { type: 'Sick', current: 6, total: 10, color: 'var(--success)' },
        { type: 'Comp Off', current: 2, total: 5, color: 'var(--warning)' },
      ];
    }
    
    return leaveBalances.slice(0, 3).map((balance, i) => {
      const colors = ['var(--brand)', 'var(--success)', 'var(--warning)'];
      return {
        type: balance.leaveTypeId?.name || 'Leave',
        current: balance.available || 0,
        total: balance.leaveTypeId?.annualQuota || 20,
        color: colors[i % colors.length]
      };
    });
  };

  const balances = getBalances();

  return (
    <div className="panel" style={{ marginBottom: 'var(--s6)' }}>
      <div className="panel-head">
        <div className="panel-title">Leave Balances</div>
        <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('/hr/leaves')}>Apply</button>
      </div>
      {loading ? (
        <SectionLoader label="Loading leave balances…" minHeight="80px" />
      ) : (
        <div className="radials">
          {balances.map((b, i) => (
            <div className="radial-item" key={i}>
              <RadialProgress current={b.current} total={b.total} color={b.color} />
              <div className="r-label">{b.type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Attendance Heatmap component
const AttendanceHeatmap = ({ attendance, loading, onNavigate }) => {
  // Transform attendance records to weekly data
  const getWeekData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    if (!attendance || attendance.length === 0) {
      return days.map(day => ({
        day,
        status: '-',
        class: 'att-h'
      }));
    }
    
    return days.map((day, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const record = attendance.find(r => {
        const recordDate = new Date(r.date);
        return recordDate.toDateString() === date.toDateString();
      });
      
      if (!record) {
        return { day, status: '-', class: 'att-h' };
      }
      
      const statusMap = {
        present: { status: 'P', class: 'att-p' },
        absent: { status: 'A', class: 'att-a' },
        leave: { status: 'L', class: 'att-l' },
        half_day: { status: 'HD', class: 'att-l' },
        wfh: { status: 'WFH', class: 'att-p' }
      };
      
      const statusInfo = statusMap[record.status] || { status: '-', class: 'att-h' };
      return { day, ...statusInfo };
    });
  };

  const week = getWeekData();

  const statusLabels = [
    { class: 'att-p', label: 'Present', color: 'var(--success-dim)' },
    { class: 'att-a', label: 'Absent', color: 'var(--danger-dim)' },
    { class: 'att-l', label: 'Leave', color: 'var(--warning-dim)' },
    { class: 'att-h', label: 'Holiday', color: 'var(--bg-surface)' },
  ];

  return (
    <div className="panel" style={{ marginBottom: 'var(--s6)' }}>
      <div className="panel-head">
        <div className="panel-title">Attendance — This Week</div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('/hr/attendance')}>Details →</button>
      </div>
      <div className="att-week" role="table" aria-label="Weekly attendance">
        {week.map((d, i) => (
          <div className="att-day" key={i}>
            <div className="att-day-label">{d.day}</div>
            <div className={`att-cell ${d.class}`} title={d.status === 'P' ? 'Present' : d.status === 'L' ? 'Leave' : 'Holiday'}>{d.status}</div>
          </div>
        ))}
      </div>
      <div className="divider"></div>
      <div style={{ padding: '0 var(--s5) var(--s4)', display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap' }}>
        {statusLabels.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, border: '1px solid rgba(0,0,0,0.1)' }}></div>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// Team Member component
const TeamMember = ({ initials, color, name, status }) => {
  const statusColors = {
    online: 'var(--success)',
    meeting: 'var(--warning)',
    away: 'var(--warning)',
    offline: 'var(--text-faint)',
  };
  
  return (
    <div className="person" role="listitem" tabIndex="0" aria-label={`${name} — ${status}`}>
      <div className="person-av" style={{ background: color }}>
        {initials}
        <div className="p-status" style={{ background: statusColors[status] || statusColors.offline }}></div>
      </div>
      <div className="person-name">{name}</div>
    </div>
  );
};

// Team Grid component
const TeamGrid = ({ teamMembers, loading }) => {
  // Transform team members to UI format
  const getMembers = () => {
    if (!teamMembers || teamMembers.length === 0) {
      return null; // signals empty state below
    }
    
    return teamMembers.slice(0, 6).map((member, i) => {
      const colors = ['var(--brand)', '#5A8A6A', '#7A6AAA', '#C49A3A', '#7A9ABB', '#8B5E3C'];
      return {
        initials: member.full_name?.split(' ').map(n => n[0]).join('') || member.email?.[0]?.toUpperCase() || 'U',
        color: colors[i % colors.length],
        name: member.full_name || member.email?.split('@')[0] || 'User',
        status: member.isOnline || member.is_online ? 'online' : 'offline'
      };
    });
  };

  const members = getMembers();
  const onlineCount = members ? members.filter(m => m.status === 'online').length : 0;

  return (
    <div className="panel" style={{ marginBottom: 'var(--s6)' }}>
      <div className="panel-head">
        <div className="panel-title">Team Today</div>
        <span className="tag tag-g">{onlineCount} present</span>
      </div>
      {loading ? (
        <SectionLoader label="Loading team…" minHeight="80px" />
      ) : members === null ? (
        <div className="empty-state-inline">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No team members yet — invite colleagues to see them here.</p>
        </div>
      ) : (
        <div className="team-grid" role="list">
          {members.map((m, i) => (
            <TeamMember key={i} {...m} />
          ))}
        </div>
      )}
    </div>
  );
};

// Project Card component
const ProjectCard = ({ name, meta, progress, color, onClick }) => {
  return (
    <div
      className="proj-card"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(); } }}
    >
      <div className="proj-color" style={{ background: color }}></div>
      <div className="proj-info">
        <div className="proj-name">{name}</div>
        <div className="proj-meta">{meta}</div>
      </div>
      <ProjectRing progress={progress} color={color} />
    </div>
  );
};

// Projects List component
const ProjectsList = ({ projects, loading, onNavigate }) => {
  // Transform projects to UI format
  const getProjects = () => {
    if (!projects || projects.length === 0) {
      return null; // signals empty state below
    }
    
    return projects.slice(0, 3).map((p, i) => {
      const colors = ['var(--brand)', 'var(--success)', '#7A9ABB'];
      const memberCount = p.team_members?.length || 0;
      const progress = p.progress != null ? p.progress
        : p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100)
        : 0;
      return {
        id: p._id,
        name: p.name || 'Untitled Project',
        meta: `${memberCount} member${memberCount !== 1 ? 's' : ''} · ${p.status || 'Active'}`,
        progress,
        color: colors[i % colors.length]
      };
    });
  };

  const projectList = getProjects();

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Active Projects</div>
        <button className="btn btn-ghost btn-sm">All →</button>
      </div>
      {loading ? (
        <SectionLoader label="Loading projects…" minHeight="80px" />
      ) : projectList === null ? (
        <div className="empty-state-inline">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No active projects — create one to start tracking progress.</p>
        </div>
      ) : (
        <div>
          {projectList.map((p, i) => (
            <ProjectCard key={i} {...p} onClick={() => onNavigate && onNavigate(p.id ? `/projects/${p.id}` : '/projects')} />
          ))}
        </div>
      )}
    </div>
  );
};

// Status icon helpers
const taskStatusIcon = (status) => {
  const map = { done: '✓', in_progress: '◑', review: '◐', todo: '○', cancelled: '✕' };
  return map[status] || '○';
};
const priorityIcon = (p) => ({ urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '·');

// Command Palette component
const CommandPalette = ({ isOpen, onClose, onNavigate, onToggleTheme, tasks = [], projects = [], teamMembers = [] }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const q = debouncedQuery.toLowerCase().trim();

  // ── Build result sections ────────────────────────────────────────────────
  const matchedPages = q
    ? ALL_PAGES.filter(p =>
        p.label.toLowerCase().includes(q) ||
        p.hint.toLowerCase().includes(q) ||
        p.keywords.includes(q)
      ).slice(0, 6)
    : ALL_PAGES.slice(0, 8); // Show top pages when no query

  const matchedTasks = q
    ? tasks
        .filter(t =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.status || '').includes(q) ||
          (t.priority || '').toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  const matchedProjects = q
    ? projects
        .filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.status || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedPeople = q
    ? teamMembers
        .filter(u =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedActions = !q
    ? [
        { icon: '☽', label: 'Toggle dark / light mode', hint: 'Theme', path: null, isTheme: true },
        { icon: '+', label: 'Go to Tasks → Create task', hint: '⌘N', path: '/tasks' },
      ]
    : [];

  // Flatten all items for keyboard nav
  const flatItems = [
    ...matchedPages.map(i => ({ ...i, _type: 'page' })),
    ...matchedTasks.map(i => ({ ...i, _type: 'task' })),
    ...matchedProjects.map(i => ({ ...i, _type: 'project' })),
    ...matchedPeople.map(i => ({ ...i, _type: 'person' })),
    ...matchedActions.map(i => ({ ...i, _type: 'action' })),
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = flatItems[selectedIndex];
      if (!sel) return;
      if (sel.isTheme) onToggleTheme();
      else if (sel._type === 'task') onNavigate(`/tasks`);
      else if (sel._type === 'project') onNavigate(`/projects/${sel._id || ''}`);
      else if (sel._type === 'person') onNavigate(`/users`);
      else if (sel.path) onNavigate(sel.path);
      onClose();
    }
  };

  const handleItemClick = (item) => {
    if (item.isTheme) onToggleTheme();
    else if (item._type === 'task') onNavigate(`/tasks`);
    else if (item._type === 'project') onNavigate(`/projects/${item._id || ''}`);
    else if (item._type === 'person') onNavigate(`/users`);
    else if (item.path) onNavigate(item.path);
    onClose();
  };

  const isEmpty = flatItems.length === 0;
  let runningIdx = 0;

  const renderItem = (item, localIdx) => {
    const globalIdx = runningIdx++;
    const isSel = selectedIndex === globalIdx;
    return (
      <div
        key={`${item._type}-${localIdx}`}
        className={`cmd-item ${isSel ? 'sel' : ''}`}
        role="option"
        aria-selected={isSel}
        tabIndex="0"
        onMouseEnter={() => setSelectedIndex(globalIdx)}
        onClick={() => handleItemClick(item)}
      >
        <div className="cmd-item-icon" aria-hidden="true">{item.icon}</div>
        <div className="cmd-item-label">{item.label}</div>
        <div className="cmd-item-hint">{item.hint}</div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="cmd-overlay open"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cmd-box">
        {/* Search input */}
        <div className="cmd-in-wrap">
          <span className="cmd-icon" aria-hidden="true">⌕</span>
          <input
            className="cmd-input"
            type="text"
            placeholder="Search tasks, projects, people, pages…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {query && (
            <button
              className="kbd"
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px 6px' }}
              onClick={() => { setQuery(''); setSelectedIndex(0); }}
              aria-label="Clear"
            >✕</button>
          )}
          {!query && <span className="kbd">Esc</span>}
        </div>

        {/* Results */}
        <div className="cmd-results" role="listbox">
          {isEmpty && q && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Pages */}
          {matchedPages.length > 0 && (
            <>
              <div className="cmd-group">{q ? 'Pages' : 'Quick Access'}</div>
              {matchedPages.map((item, i) => renderItem({ ...item, _type: 'page' }, i))}
            </>
          )}

          {/* Tasks */}
          {matchedTasks.length > 0 && (
            <>
              <div className="cmd-group">Tasks</div>
              {matchedTasks.map((task, i) => {
                const globalIdx = runningIdx;
                const isSel = selectedIndex === globalIdx;
                runningIdx++;
                return (
                  <div
                    key={`task-${task._id}`}
                    className={`cmd-item ${isSel ? 'sel' : ''}`}
                    role="option"
                    aria-selected={isSel}
                    tabIndex="0"
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => { onNavigate('/tasks'); onClose(); }}
                  >
                    <div className="cmd-item-icon" aria-hidden="true">{taskStatusIcon(task.status)}</div>
                    <div className="cmd-item-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </div>
                    <div className="cmd-item-hint" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <span>{priorityIcon(task.priority)}</span>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>{task.status?.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Projects */}
          {matchedProjects.length > 0 && (
            <>
              <div className="cmd-group">Projects</div>
              {matchedProjects.map((project, i) => {
                const globalIdx = runningIdx;
                const isSel = selectedIndex === globalIdx;
                runningIdx++;
                return (
                  <div
                    key={`proj-${project._id}`}
                    className={`cmd-item ${isSel ? 'sel' : ''}`}
                    role="option"
                    aria-selected={isSel}
                    tabIndex="0"
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => { onNavigate(project._id ? `/projects/${project._id}` : '/projects'); onClose(); }}
                  >
                    <div className="cmd-item-icon" aria-hidden="true">◈</div>
                    <div className="cmd-item-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </div>
                    <div className="cmd-item-hint" style={{ fontSize: '11px', opacity: 0.7, flexShrink: 0 }}>
                      {project.status?.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* People */}
          {matchedPeople.length > 0 && (
            <>
              <div className="cmd-group">People</div>
              {matchedPeople.map((person, i) => {
                const globalIdx = runningIdx;
                const isSel = selectedIndex === globalIdx;
                runningIdx++;
                return (
                  <div
                    key={`person-${person._id}`}
                    className={`cmd-item ${isSel ? 'sel' : ''}`}
                    role="option"
                    aria-selected={isSel}
                    tabIndex="0"
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    onClick={() => { onNavigate('/users'); onClose(); }}
                  >
                    <div className="cmd-item-icon" aria-hidden="true">◉</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div className="cmd-item-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {person.full_name}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {person.email}
                      </div>
                    </div>
                    <div className="cmd-item-hint" style={{ fontSize: '11px', opacity: 0.7, flexShrink: 0 }}>
                      {person.role?.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Actions (shown when no query) */}
          {matchedActions.length > 0 && (
            <>
              <div className="cmd-group">Actions</div>
              {matchedActions.map((item, i) => renderItem({ ...item, _type: 'action' }, i))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="cmd-foot">
          <div className="cmd-hint"><span className="kbd">↑</span><span className="kbd">↓</span> Navigate</div>
          <div className="cmd-hint"><span className="kbd">↵</span> Select</div>
          <div className="cmd-hint"><span className="kbd">Esc</span> Close</div>
          {q && flatItems.length > 0 && (
            <div className="cmd-hint" style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.5 }}>
              {flatItems.length} result{flatItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mobile Navigation component
const MobileNav = ({ activeTab, onNavigate }) => {
  const tabs = [
    { id: 'home', icon: '⬡', label: 'Home' },
    { id: 'tasks', icon: '◫', label: 'Tasks' },
    { id: 'new', icon: '⊕', label: 'New', isAction: true },
    { id: 'hr', icon: '◉', label: 'HR' },
    { id: 'projects', icon: '◈', label: 'Projects' },
  ];

  return (
    <nav className="mob-nav" aria-label="Mobile navigation">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`mob-btn ${activeTab === tab.id ? 'on' : ''}`}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          onClick={() => onNavigate(tab.id)}
          style={tab.isAction ? { color: 'var(--brand)', fontSize: '22px' } : undefined}
        >
          <span>{tab.icon}</span>
          <span className="mob-lbl">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

// Main Workspace Page component
const Workspace = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMobile, showBottomNav, toggleMobileSidebar } = useSidebar();
  const navigate = useNavigate();
  
  const [showAI, setShowAI] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('home');
  const [toasts, setToasts] = useState([]);

  // Data state
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activeSprint, setActiveSprint] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState({
    tasks: true,
    projects: true,
    teamMembers: true,
    leaveBalances: true,
    attendance: true,
    stats: true,
    activity: true
  });
  
  // Error states
  const [errors, setErrors] = useState({});
  
  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user data
        try {
          const userRes = await api.get('/users/me');
          if (userRes.data?.user) {
            setCurrentUser(userRes.data.user);
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }
        
        // Fetch tasks
        try {
          const tasksRes = await api.get('/tasks');
          setTasks(tasksRes.data?.tasks || []);
        } catch (err) {
          console.error('Error fetching tasks:', err);
          setErrors(prev => ({ ...prev, tasks: 'Failed to load tasks' }));
        } finally {
          setLoading(prev => ({ ...prev, tasks: false }));
        }
        
        // Fetch projects
        try {
          const projectsRes = await api.get('/projects');
          setProjects(projectsRes.data || []);
        } catch (err) {
          console.error('Error fetching projects:', err);
          setErrors(prev => ({ ...prev, projects: 'Failed to load projects' }));
        } finally {
          setLoading(prev => ({ ...prev, projects: false }));
        }
        
        // Fetch team members (users)
        try {
          const usersRes = await api.get('/users');
          setTeamMembers(usersRes.data?.users || usersRes.data || []);
        } catch (err) {
          console.error('Error fetching users:', err);
          setErrors(prev => ({ ...prev, teamMembers: 'Failed to load team' }));
        } finally {
          setLoading(prev => ({ ...prev, teamMembers: false }));
        }
        
        // Fetch leave balances
        try {
          const leaveRes = await api.get('/hr/leaves/balance');
          setLeaveBalances(leaveRes.data?.balances || []);
        } catch (err) {
          console.error('Error fetching leave balances:', err);
          setErrors(prev => ({ ...prev, leaveBalances: 'Failed to load leave balances' }));
        } finally {
          setLoading(prev => ({ ...prev, leaveBalances: false }));
        }
        
        // Fetch attendance (current month)
        try {
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();
          const attendRes = await api.get(`/hr/attendance?month=${month}&year=${year}`);
          setAttendance(attendRes.data?.records || []);
        } catch (err) {
          console.error('Error fetching attendance:', err);
          setErrors(prev => ({ ...prev, attendance: 'Failed to load attendance' }));
        } finally {
          setLoading(prev => ({ ...prev, attendance: false }));
        }
        
        // Fetch dashboard stats
        try {
          const statsRes = await api.get('/projects/dashboard-stats');
          setDashboardStats(statsRes.data || null);
        } catch (err) {
          console.error('Error fetching stats:', err);
        } finally {
          setLoading(prev => ({ ...prev, stats: false }));
        }
        
        // Fetch active sprint
        try {
          const sprintRes = await api.get('/sprints/active');
          setActiveSprint(sprintRes.data || null);
        } catch (err) {
          console.error('Error fetching sprint:', err);
        }
        
        // Fetch recent activity (changelog)
        try {
          const activityRes = await api.get('/changelog?limit=6');
          setRecentActivity(activityRes.data?.logs || []);
        } catch (err) {
          console.error('Error fetching activity:', err);
          // If changelog fails (e.g., not admin), use fallback empty array
          setRecentActivity([]);
        } finally {
          setLoading(prev => ({ ...prev, activity: false }));
        }
        
      } catch (err) {
        console.error('Error fetching workspace data:', err);
      }
    };
    
    fetchData();
  }, []);
  
  // Toast function - local to this page for the reference UI
  const toast = useCallback((msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  }, []);
  
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's name - prefer API user data, fallback to auth context
  const displayUser = currentUser || user;
  const userName = displayUser?.full_name?.split(' ')[0] || displayUser?.name?.split(' ')[0] || 'User';
  const userInitials = displayUser?.full_name?.split(' ').map(n => n[0]).join('') || displayUser?.name?.split(' ').map(n => n[0]).join('') || 'U';
  const userRole = displayUser?.role === 'admin' ? 'Administrator' : displayUser?.role === 'hr' ? 'HR Manager' : displayUser?.role === 'team_lead' ? 'Team Lead' : 'Member';
  
  // Date formatting
  const formattedDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
  };

  const handleTaskComplete = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => (t._id === taskId || t.id === taskId) ? { ...t, status: newStatus } : t));
      toast(newStatus === 'done' ? 'Task marked as done ✓' : 'Task status updated ✓');
    } catch (err) {
      console.error('Error updating task:', err);
      toast('Failed to update task');
    }
  };

  const handleMobileNav = (tabId) => {
    const routes = {
      home: '/dashboard',
      tasks: '/tasks',
      hr: '/hr/dashboard',
      projects: '/projects',
    };
    if (tabId === 'new') {
      navigate('/tasks');
    } else {
      setMobileTab(tabId);
      if (routes[tabId]) navigate(routes[tabId]);
    }
  };

  return (
    <>
      <ResponsivePageLayout
        title="Dashboard"
        subtitle={`${getGreeting()}, ${userName} · ${formattedDate}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors bg-[var(--bg-base)] border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--border-hair)] hover:text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-body)' }}
              onClick={() => toast('Report exported ✓')}
            >
              ↗ Export
            </button>
            <button
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold bg-[#C4713A] text-white hover:bg-[#A35C28] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
              onClick={() => navigate('/tasks')}
            >
              + New Task
            </button>
          </div>
        }
      >
        <div
          style={{
            paddingBottom: showBottomNav ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined,
          }}
        >
          <div className="page">
            
            {/* AI Insight */}
            {showAI && <AIInsight onDismiss={() => setShowAI(false)} />}
            
            {/* KPI Row */}
            <div className="kpi-row" role="region" aria-label="Key metrics">
              <KPICard 
                icon="◫" 
                value={String(dashboardStats?.capacity?.percentage || (tasks.filter ? tasks.filter(t => t.status === 'done').length : 0) || 0)} 
                label="Tasks completed this month" 
                delta={dashboardStats?.capacity?.percentage > 50 ? "↑ 12%" : "↓ 5%"}
                deltaType={dashboardStats?.capacity?.percentage > 50 ? "up" : "dn"}
                color="var(--brand)"
                bgColor="var(--brand-dim)"
                sparkData={[26, 20, 22, 16, 14, 9, 6, 4, 4]}
              />
              <KPICard 
                icon="●" 
                value={String(Math.round((Array.isArray(attendance) ? attendance.filter(a => a.status === 'present').length : 0) / Math.max(Array.isArray(attendance) ? attendance.length : 1, 1) * 100) || 94)} 
                label="Team attendance rate" 
                delta="↑ 3%" 
                deltaType="up"
                color="var(--success)"
                bgColor="var(--success-dim)"
                sparkData={[10, 8, 6, 8, 5, 4, 3, 3, 2]}
              />
              <KPICard 
                icon="⬟" 
                value={String(dashboardStats?.risks?.critical || 0)} 
                label="Sprints at risk" 
                delta={dashboardStats?.risks?.critical > 3 ? "↑ 18%" : "↓ 18%"}
                deltaType={dashboardStats?.risks?.critical > 3 ? "up" : "dn"}
                color="var(--warning)"
                bgColor="var(--warning-dim)"
                sparkData={[18, 14, 16, 12, 18, 22, 16, 20, 22]}
              />
              <KPICard 
                icon="◈" 
                value={String(dashboardStats?.projects?.active || projects.length || 0)} 
                label="Active projects" 
                delta={dashboardStats?.projects?.change ? `${dashboardStats.projects.change > 0 ? '↑' : '↓'} ${Math.abs(dashboardStats.projects.change)}%` : "→ 0%"}
                deltaType={dashboardStats?.projects?.change > 0 ? "up" : dashboardStats?.projects?.change < 0 ? "dn" : "nt"}
                color="#7A9ABB"
                bgColor="rgba(122,154,187,0.10)"
                sparkData={[15, 13, 15, 13, 15, 13, 15, 13, 13]}
              />
            </div>
            
            {/* Content Grid */}
            <div className="content-grid">
              
              {/* Left Column */}
              <div>
                <TasksPanel tasks={tasks} loading={loading.tasks} onTaskComplete={handleTaskComplete} onNavigate={handleNavigate} />
                <KanbanPanel tasks={tasks} sprint={activeSprint} onNavigate={handleNavigate} isMobile={isMobile} onTaskMove={handleTaskComplete} />
                <VelocityPanel projects={projects} sprint={activeSprint} onNavigate={handleNavigate} />
              </div>
              
              {/* Right Column */}
              <div>
                <ActivityFeed activities={recentActivity} loading={loading.activity} />
                <LeaveBalances leaveBalances={leaveBalances} loading={loading.leaveBalances} onNavigate={handleNavigate} />
                <AttendanceHeatmap attendance={attendance} loading={loading.attendance} onNavigate={handleNavigate} />
                <TeamGrid teamMembers={teamMembers} loading={loading.teamMembers} />
                <ProjectsList projects={projects} loading={loading.projects} onNavigate={handleNavigate} />
              </div>
              
            </div>
            
          </div>{/* .page */}
        </div>{/* scroll wrapper */}
      </ResponsivePageLayout>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={cmdOpen} 
        onClose={() => setCmdOpen(false)}
        onNavigate={handleNavigate}
        onToggleTheme={toggleTheme}
        tasks={tasks}
        projects={projects}
        teamMembers={teamMembers}
      />
      
      {/* Toast Stack */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span className="toast-icon">✓</span>
            <span className="toast-msg">{t.msg}</span>
            <button 
              className="toast-x" 
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Mobile Navigation — only shown on phones < 768px */}
      {showBottomNav && (
        <MobileNav 
          activeTab={mobileTab} 
          onNavigate={handleMobileNav}
        />
      )}
    </>
  );
};

export default Workspace;
