const BRAND = {
  accent: '#C4622D',
  parchment: '#F5F0E8',
  text: '#2C1810',
  softBorder: '#E3D3BF',
  muted: '#6D4C41',
  success: '#4B7A45',
  warning: '#B87923',
  danger: '#A8472A'
};

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const applyTokens = (template, tokenMap) => {
  let output = String(template || '');
  Object.entries(tokenMap).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    output = output.replace(regex, String(value ?? ''));
  });
  return output;
};

const section = (title, body) => `
  <div style="background:${BRAND.parchment};border:1px solid ${BRAND.softBorder};border-radius:12px;padding:16px;margin:0 0 14px;">
    <h3 style="margin:0 0 10px;font-size:15px;line-height:1.3;color:${BRAND.accent};">${escapeHtml(title)}</h3>
    ${body}
  </div>
`;

const renderProjectStats = (stats) => {
  if (!stats) return '';
  const cells = [
    ['Active Projects', stats.totalActiveProjects],
    ['Completed In Range', stats.projectsCompletedInRange],
    ['Projects At Risk', stats.projectsAtRisk],
    ['New Projects Started', stats.newProjectsStartedInRange]
  ];

  const boxes = cells.map(([label, value]) => `
    <td style="width:50%;padding:6px;vertical-align:top;">
      <div style="background:#fff;border:1px solid ${BRAND.softBorder};border-radius:10px;padding:12px;">
        <div style="font-size:11px;color:${BRAND.muted};">${escapeHtml(label)}</div>
        <div style="font-size:20px;font-weight:700;color:${BRAND.text};margin-top:4px;">${escapeHtml(value)}</div>
      </div>
    </td>
  `);

  return section('Project Stats', `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>${boxes[0]}${boxes[1]}</tr>
      <tr>${boxes[2]}${boxes[3]}</tr>
    </table>
  `);
};

const renderTaskMetrics = (metrics) => {
  if (!metrics) return '';
  const rate = Number(metrics.completionRate || 0);
  const clampedRate = Math.max(0, Math.min(100, rate));
  const statusRows = Object.entries(metrics.tasksByStatus || {})
    .map(([status, count]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(status)}</td><td style="padding:6px 8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};text-align:right;">${escapeHtml(count)}</td></tr>`)
    .join('');

  return section('Task Metrics', `
    <div style="font-size:12px;color:${BRAND.text};margin-bottom:8px;">
      Created: <strong>${escapeHtml(metrics.totalCreated)}</strong> &nbsp;|&nbsp;
      Completed: <strong>${escapeHtml(metrics.totalCompleted)}</strong> &nbsp;|&nbsp;
      Avg Completion: <strong>${escapeHtml(metrics.averageCompletionDays)} days</strong>
    </div>
    <div style="background:#fff;border:1px solid ${BRAND.softBorder};border-radius:999px;height:14px;overflow:hidden;margin-bottom:6px;">
      <div style="width:${clampedRate}%;height:100%;background:${BRAND.accent};"></div>
    </div>
    <div style="font-size:12px;color:${BRAND.muted};margin-bottom:10px;">Completion Rate: ${escapeHtml(rate)}%</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fff;border:1px solid ${BRAND.softBorder};border-radius:10px;overflow:hidden;">
      <thead>
        <tr>
          <th align="left" style="padding:8px;background:${BRAND.parchment};font-size:11px;color:${BRAND.muted};text-transform:uppercase;">Status</th>
          <th align="right" style="padding:8px;background:${BRAND.parchment};font-size:11px;color:${BRAND.muted};text-transform:uppercase;">Count</th>
        </tr>
      </thead>
      <tbody>${statusRows || '<tr><td colspan="2" style="padding:8px;font-size:12px;color:#8A6B5A;">No status breakdown available.</td></tr>'}</tbody>
    </table>
  `);
};

const renderTeamActivity = (teamRows) => {
  if (!teamRows?.length) return '';
  const rows = teamRows.map((row, index) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${index + 1}. ${escapeHtml(row.memberName)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};text-align:right;">${escapeHtml(row.tasksCompleted)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};text-align:right;">${escapeHtml(row.tasksCreated)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};text-align:right;">${escapeHtml(row.commentsPosted)}</td>
    </tr>
  `).join('');

  return section('Team Activity', `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fff;border:1px solid ${BRAND.softBorder};border-radius:10px;overflow:hidden;">
      <thead>
        <tr>
          <th align="left" style="padding:8px;background:${BRAND.parchment};font-size:11px;color:${BRAND.muted};text-transform:uppercase;">Member</th>
          <th align="right" style="padding:8px;background:${BRAND.parchment};font-size:11px;color:${BRAND.muted};text-transform:uppercase;">Completed</th>
          <th align="right" style="padding:8px;background:${BRAND.parchment};font-size:11px;color:${BRAND.muted};text-transform:uppercase;">Created</th>
          <th align="right" style="padding:8px;background:${BRAND.parchment};font-size:11px;color:${BRAND.muted};text-transform:uppercase;">Comments</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
};

const badgeColorForMilestone = (status) => {
  if (status === 'hit') return BRAND.success;
  if (status === 'missed') return BRAND.danger;
  return BRAND.warning;
};

const renderMilestones = (rows) => {
  if (!rows?.length) return '';
  const body = rows.map((row) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(row.name)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(row.project)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(new Date(row.dueDate).toLocaleDateString())}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:#fff;">
        <span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${badgeColorForMilestone(row.status)};">${escapeHtml(row.status)}</span>
      </td>
    </tr>
  `).join('');

  return section('Milestones', `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fff;border:1px solid ${BRAND.softBorder};border-radius:10px;overflow:hidden;">
      <tbody>${body}</tbody>
    </table>
  `);
};

const renderOverdue = (rows) => {
  if (!rows?.length) return '';
  const body = rows.map((row) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(row.name)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(row.project)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;color:${BRAND.text};">${escapeHtml(row.assignee)}</td>
      <td style="padding:8px;border-bottom:1px solid ${BRAND.softBorder};font-size:12px;">
        <span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${BRAND.danger};color:#fff;">${escapeHtml(row.daysOverdue)} days overdue</span>
      </td>
    </tr>
  `).join('');

  return section('Overdue Tasks', `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fff;border:1px solid ${BRAND.softBorder};border-radius:10px;overflow:hidden;">
      <tbody>${body}</tbody>
    </table>
  `);
};

export const renderReportEmail = (reportData = {}, emailConfig = {}) => {
  const month = new Date(reportData?.dateRange?.from || new Date()).toLocaleDateString('en-US', { month: 'long' });
  const tenantName = reportData?.meta?.tenantName || 'AetherTrack';
  const dateRange = reportData?.dateRange?.label || '';

  const tokenMap = {
    month,
    tenantName,
    dateRange
  };

  const subject = applyTokens(emailConfig?.subject || '{{month}} Report — AetherTrack', tokenMap);
  const headerNote = applyTokens(emailConfig?.headerNote || '', tokenMap);
  const footerNote = applyTokens(emailConfig?.footerNote || '', tokenMap);

  const html = `
    <div style="margin:0;padding:24px;background:#fff;font-family:Arial,sans-serif;color:${BRAND.text};">
      <div style="max-width:720px;margin:0 auto;">
        <div style="border-bottom:2px solid ${BRAND.softBorder};padding-bottom:12px;margin-bottom:14px;">
          <div style="font-size:20px;font-weight:700;color:${BRAND.accent};">AetherTrack</div>
          <div style="font-size:16px;font-weight:600;margin-top:4px;">${escapeHtml(subject)}</div>
          <div style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:999px;background:${BRAND.parchment};color:${BRAND.text};font-size:11px;">${escapeHtml(dateRange)}</div>
        </div>

        ${headerNote ? `<p style="font-size:13px;color:${BRAND.muted};font-style:italic;margin:0 0 14px;">${escapeHtml(headerNote)}</p>` : ''}

        ${renderProjectStats(reportData.projectStats)}
        ${renderTaskMetrics(reportData.taskMetrics)}
        ${renderTeamActivity(reportData.teamActivity)}
        ${renderMilestones(reportData.milestones)}
        ${renderOverdue(reportData.overdueTasks)}

        <div style="border-top:2px solid ${BRAND.softBorder};padding-top:12px;margin-top:14px;">
          ${footerNote ? `<p style="font-size:12px;color:${BRAND.text};margin:0 0 8px;">${escapeHtml(footerNote)}</p>` : ''}
          <p style="font-size:11px;color:${BRAND.muted};margin:0;">Sent by AetherTrack · Unsubscribe</p>
        </div>
      </div>
    </div>
  `;

  return { subject, html };
};
