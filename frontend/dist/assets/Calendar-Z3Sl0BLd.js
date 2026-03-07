import{u as P,a as $,j as e,X as f}from"./index-Ck7Afdj0.js";import{r as n}from"./react-vendor-DiHo6jH6.js";import{C as E,m as O,h as R}from"./react-big-calendar-CvjkYAVl.js";import{R as I,a as H}from"./ResponsivePageLayout-D6zb1-Nd.js";import{u as U}from"./useRealtimeSync-p-j1cUoB.js";import{u as F}from"./usePageShortcuts-TBpW8aU0.js";import{S as V}from"./ShortcutsOverlay-C5vwkLKb.js";import{C as j}from"./calendar-DDIryqKm.js";import{P as B}from"./plus-DFExIwXn.js";import{F as G}from"./filter-De2QySec.js";import"./socket-vendor-BlgWwLEk.js";import"./capacitor-core-Dzn3_rKv.js";import"./defineProperty-CmgRNwQ4.js";import"./slicedToArray-tZ5WlHw6.js";import"./GlobalSidebar-CNw9A4bk.js";const W=O(R),ce=()=>{const{user:i}=P(),{theme:X}=$(),[u,y]=n.useState([]),[c,w]=n.useState([]),[a,N]=n.useState(null),[k,p]=n.useState(!1),[s,l]=n.useState({status:"",priority:"",showMyTasksOnly:!1}),[h,x]=n.useState(!0),[S,v]=n.useState(new Date),g=[{key:"t",label:"Go to Today",description:"Navigate the calendar to today",action:()=>v(new Date)},{key:"f",label:"Toggle Legend",description:"Show/hide the colour legend",action:()=>x(r=>!r)},{key:"r",label:"Refresh",description:"Reload all calendar events",action:()=>d()}],{showHelp:C,setShowHelp:_}=F(g);n.useEffect(()=>{d()},[]),n.useEffect(()=>{T()},[u,s]),U({onTaskCreated:()=>d(),onTaskUpdated:()=>d(),onTaskDeleted:()=>d()});const d=async()=>{try{const r=await api.get("/tasks");y(r.data.tasks)}catch(r){console.error("Error fetching tasks:",r)}},T=()=>{let r=[...u];s.status&&(r=r.filter(t=>t.status===s.status)),s.priority&&(r=r.filter(t=>t.priority===s.priority)),s.showMyTasksOnly&&(r=r.filter(t=>t.assigned_to?(Array.isArray(t.assigned_to)?t.assigned_to.map(b=>typeof b=="object"?b._id:b):[typeof t.assigned_to=="object"?t.assigned_to._id:t.assigned_to]).includes(i==null?void 0:i.id):!1));const o=r.filter(t=>t.due_date).map(t=>({id:t._id,title:t.title,start:new Date(t.due_date),end:new Date(t.due_date),resource:t,allDay:!0}));w(o)},A=r=>{const o={todo:"#6b7280",in_progress:"#C4713A",review:"#eab308",done:"#22c55e",archived:"#ef4444"};return o[r]||o.todo},D=r=>{const o={low:"#10b981",medium:"#f59e0b",high:"#f97316",urgent:"#dc2626"};return o[r]||o.medium},z=r=>{const o=r.resource,t=A(o.status),m=D(o.priority);return{style:{backgroundColor:t,borderRadius:"0.125rem",opacity:.95,color:"white",border:`2px solid ${m}`,borderLeft:`4px solid ${m}`,display:"block",fontWeight:"600",fontSize:"0.75rem",padding:"2px 6px",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}},M=r=>{N(r.resource),p(!0)},L=r=>{window.location.href=`/tasks?create=true&date=${r.start.toISOString()}`};return e.jsxs(I,{title:"Calendar",icon:j,noPadding:!0,children:[e.jsxs("header",{className:"border-b border-[var(--border-soft)] bg-[var(--bg-base)] shrink-0",children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-[var(--text-primary)] text-xl font-bold leading-tight",children:"Calendar View"}),e.jsx("p",{className:"text-[var(--text-muted)] text-xs mt-1",children:"Visualize tasks by due date"})]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>x(!h),className:"flex items-center justify-center rounded h-9 px-3 bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] hover:border-[var(--border-mid)] transition-colors",title:"Toggle Legend",children:e.jsx(H,{size:20})}),e.jsxs("button",{onClick:()=>window.location.href="/tasks?create=true",className:"flex items-center justify-center rounded h-9 px-4 bg-[#C4713A] text-white gap-2 text-sm font-bold hover:bg-[#A35C28] transition-colors shadow-sm shadow-blue-900/20",children:[e.jsx(B,{size:20}),e.jsx("span",{children:"Create Task"})]})]})]}),e.jsxs("div",{className:"flex items-center gap-4 px-6 pb-4 overflow-x-auto",children:[e.jsxs("div",{className:"flex items-center gap-2 min-w-fit",children:[e.jsx(G,{size:16,className:"text-[var(--text-muted)]"}),e.jsx("span",{className:"text-sm text-[var(--text-primary)] font-medium",children:"Filters:"})]}),e.jsxs("select",{value:s.status,onChange:r=>l({...s,status:r.target.value}),className:"h-9 px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#C4713A] focus:border-transparent",children:[e.jsx("option",{value:"",children:"All Statuses"}),e.jsx("option",{value:"todo",children:"To Do"}),e.jsx("option",{value:"in_progress",children:"In Progress"}),e.jsx("option",{value:"review",children:"Review"}),e.jsx("option",{value:"done",children:"Done"})]}),e.jsxs("select",{value:s.priority,onChange:r=>l({...s,priority:r.target.value}),className:"h-9 px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[#C4713A] focus:border-transparent",children:[e.jsx("option",{value:"",children:"All Priorities"}),e.jsx("option",{value:"low",children:"Low"}),e.jsx("option",{value:"medium",children:"Medium"}),e.jsx("option",{value:"high",children:"High"}),e.jsx("option",{value:"urgent",children:"Urgent"})]}),e.jsx("button",{onClick:()=>l({...s,showMyTasksOnly:!s.showMyTasksOnly}),className:`h-9 px-4 rounded text-sm font-medium transition-colors ${s.showMyTasksOnly?"bg-[#C4713A] text-white border-[#C4713A]":"bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text-primary)]"} border`,children:s.showMyTasksOnly?"My Tasks Only":"All Tasks"}),e.jsxs("div",{className:"ml-auto text-sm text-[var(--text-muted)]",children:[e.jsx("span",{className:"font-medium text-[var(--text-primary)]",children:c.length})," task",c.length!==1?"s":""," with due dates"]})]})]}),e.jsxs("div",{className:"flex-1 overflow-auto p-6",children:[h&&e.jsxs("div",{className:"bg-[var(--bg-raised)] rounded border border-[var(--border-soft)] p-4 mb-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("h3",{className:"text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider",children:"Legend"}),e.jsx("button",{onClick:()=>x(!1),className:"text-[var(--text-muted)] hover:text-[var(--text-primary)]",children:e.jsx(f,{size:18})})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2",children:"Status (Background)"}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[#6b7280] rounded"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"To Do"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[#C4713A] rounded"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"In Progress"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[#eab308] rounded"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"Review"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[#22c55e] rounded"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"Done"})]})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2",children:"Priority (Border)"}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#10b981]"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"Low"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#f59e0b]"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"Medium"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#f97316]"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"High"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-4 h-4 bg-[var(--bg-surface)] rounded border-2 border-[#dc2626]"}),e.jsx("span",{className:"text-sm text-[var(--text-muted)]",children:"Urgent"})]})]})]})]})]}),e.jsx("div",{className:"bg-[var(--bg-raised)] rounded border border-[var(--border-soft)] p-4 calendar-container",children:e.jsx(E,{localizer:W,events:c,startAccessor:"start",endAccessor:"end",style:{height:700,minHeight:500},eventPropGetter:z,onSelectEvent:M,onSelectSlot:L,selectable:!0,views:["month","week","day","agenda"],defaultView:"month",date:S,onNavigate:r=>v(r),popup:!0,tooltipAccessor:r=>`${r.title} - ${r.resource.priority}`})})]}),k&&a&&e.jsx("div",{className:"fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4",children:e.jsxs("div",{className:"bg-[var(--bg-raised)] rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-soft)]",children:[e.jsxs("div",{className:"flex justify-between items-center mb-6",children:[e.jsx("h2",{className:"text-2xl font-bold text-[var(--text-primary)]",children:a.title}),e.jsx("button",{onClick:()=>p(!1),className:"text-[var(--text-muted)] hover:text-[var(--text-primary)]",children:e.jsx(f,{size:24})})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{children:e.jsx("p",{className:"text-[var(--text-secondary)]",children:a.description||"No description"})}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("span",{className:`inline-block px-3 py-1 rounded text-xs font-semibold uppercase ${a.status==="todo"?"bg-slate-500/20 text-slate-300":a.status==="in_progress"?"bg-blue-500/20 text-blue-400":a.status==="review"?"bg-yellow-500/20 text-yellow-400":"bg-green-500/20 text-green-400"}`,children:a.status.replace("_"," ")}),e.jsx("span",{className:`inline-block px-3 py-1 rounded text-xs font-semibold uppercase ${a.priority==="low"?"bg-green-500/20 text-green-400":a.priority==="medium"?"bg-yellow-500/20 text-yellow-400":a.priority==="high"?"bg-orange-500/20 text-orange-400":"bg-red-500/20 text-red-400"}`,children:a.priority})]}),e.jsxs("div",{className:"space-y-3 border-t border-[var(--border-soft)] pt-4",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-[var(--text-muted)] mb-1",children:e.jsx("span",{className:"font-medium",children:"Due Date:"})}),e.jsxs("p",{className:"text-sm text-[var(--text-primary)] flex items-center gap-2",children:[e.jsx(j,{size:14}),new Date(a.due_date).toLocaleDateString("en-US",{weekday:"short",year:"numeric",month:"short",day:"numeric"})]})]}),a.created_by&&e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-[var(--text-muted)] mb-1",children:e.jsx("span",{className:"font-medium",children:"Created by:"})}),e.jsx("p",{className:"text-sm text-[var(--text-primary)]",children:a.created_by.full_name||"Unknown"})]})]}),a.assigned_to&&a.assigned_to.length>0&&e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-[var(--text-muted)] mb-2",children:e.jsx("span",{className:"font-medium",children:"Assigned to:"})}),e.jsx("div",{className:"flex flex-wrap gap-2",children:a.assigned_to.map(r=>e.jsx("span",{className:"inline-block bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20",children:r.full_name},r._id))})]}),a.team_id&&e.jsxs("div",{children:[e.jsx("p",{className:"text-sm text-[var(--text-muted)] mb-1",children:e.jsx("span",{className:"font-medium",children:"Team:"})}),e.jsx("p",{className:"text-sm text-[var(--text-primary)]",children:a.team_id.name})]})]}),e.jsx("button",{onClick:()=>window.location.href="/tasks",className:"w-full px-6 py-2 bg-[var(--brand)] text-white rounded hover:bg-[var(--brand-light)] transition-colors font-semibold",children:"View in Tasks"})]})]})}),e.jsx("style",{dangerouslySetInnerHTML:{__html:`
        .calendar-container .rbc-calendar {
          font-family: 'Inter', sans-serif;
          color: var(--text-primary);
        }
        .calendar-container .rbc-header {
          padding: 12px;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg-surface);
          color: var(--text-muted);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-today {
          background-color: var(--brand-dim);
        }
        .calendar-container .rbc-off-range-bg {
          background: var(--bg-sunken);
        }
        .calendar-container .rbc-date-cell {
          color: var(--text-secondary);
          padding: 4px;
        }
        .calendar-container .rbc-off-range {
          color: var(--text-muted);
        }
        .calendar-container .rbc-month-view {
          background: var(--bg-base);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-day-bg {
          background: var(--bg-base);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-event {
          transition: all 0.2s ease;
        }
        .calendar-container .rbc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .calendar-container .rbc-toolbar {
          color: var(--text-primary);
          margin-bottom: 20px;
          padding: 12px;
          background: var(--bg-canvas);
          border-radius: 0.125rem;
        }
        .calendar-container .rbc-toolbar button {
          color: var(--text-muted);
          background: var(--bg-raised);
          border: 1px solid var(--border-mid);
          border-radius: 0.125rem;
          padding: 6px 12px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .calendar-container .rbc-toolbar button:hover {
          background: var(--bg-surface);
          color: var(--text-primary);
        }
        .calendar-container .rbc-toolbar button.rbc-active {
          background: var(--brand);
          color: #fff;
          border-color: var(--brand);
        }
        .calendar-container .rbc-agenda-view {
          background: var(--bg-base);
        }
        .calendar-container .rbc-agenda-view table {
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-agenda-table tbody > tr > td {
          color: var(--text-secondary);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-agenda-date-cell,
        .calendar-container .rbc-agenda-time-cell {
          color: var(--text-muted);
        }
        .calendar-container .rbc-time-view {
          background: var(--bg-base);
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-time-header-content {
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-time-content {
          border-color: var(--border-soft);
        }
        .calendar-container .rbc-time-slot {
          border-color: var(--border-hair);
        }
        .calendar-container .rbc-current-time-indicator {
          background-color: var(--brand);
        }
      `}}),e.jsx(V,{show:C,onClose:()=>_(!1),shortcuts:g,pageName:"Calendar"})]})};export{ce as default};
