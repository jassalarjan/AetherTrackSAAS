import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import path from 'path';
import fs from 'fs';

// Generate Excel Report
export const generateExcelReport = async (tasks, analytics) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TaskFlow System';
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: '667EEA' } }
  });

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
    { header: 'Percentage', key: 'percentage', width: 15 }
  ];

  const completionRate = analytics.totalTasks > 0 
    ? ((analytics.completedTasks / analytics.totalTasks) * 100).toFixed(1)
    : '0.0';
  const overdueRate = analytics.totalTasks > 0
    ? ((analytics.overdueTasks / analytics.totalTasks) * 100).toFixed(1)
    : '0.0';

  summarySheet.addRows([
    { metric: 'Total Tasks', value: analytics.totalTasks, percentage: '100%' },
    { metric: 'Completed Tasks', value: analytics.completedTasks, percentage: `${completionRate}%` },
    { metric: 'In Progress Tasks', value: analytics.inProgressTasks, percentage: '' },
    { metric: 'Overdue Tasks', value: analytics.overdueTasks, percentage: `${overdueRate}%` },
    { metric: 'Active Teams', value: analytics.activeTeams || 0, percentage: '' },
    { metric: 'Active Users', value: analytics.activeUsers || 0, percentage: '' },
  ]);

  // Style header row
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '667EEA' }
  };

  // Sheet 2: All Tasks
  const tasksSheet = workbook.addWorksheet('All Tasks', {
    properties: { tabColor: { argb: '48BB78' } }
  });

  tasksSheet.columns = [
    { header: '#', key: 'index', width: 5 },
    { header: 'Task Title', key: 'title', width: 35 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Assigned To', key: 'assigned', width: 25 },
    { header: 'Team', key: 'team', width: 20 },
    { header: 'Due Date', key: 'dueDate', width: 15 },
    { header: 'Is Overdue', key: 'isOverdue', width: 12 },
  ];

  tasks.forEach((task, index) => {
    tasksSheet.addRow({
      index: index + 1,
      title: task.title,
      description: task.description || 'No description',
      status: task.status.replace('_', ' ').toUpperCase(),
      priority: task.priority.toUpperCase(),
      assigned: task.assigned_to && task.assigned_to.length > 0
        ? task.assigned_to.map(u => u.full_name).join(', ')
        : 'Unassigned',
      team: task.team_id?.name || 'No Team',
      dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date',
      isOverdue: isTaskOverdue(task) ? 'Yes' : 'No',
    });
  });

  // Style tasks header
  tasksSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  tasksSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '48BB78' }
  };

  // Sheet 3: Overdue Tasks
  const overdueTasks = tasks.filter(isTaskOverdue);
  if (overdueTasks.length > 0) {
    const overdueSheet = workbook.addWorksheet('Overdue Tasks', {
      properties: { tabColor: { argb: 'F56565' } }
    });

    overdueSheet.columns = [
      { header: '#', key: 'index', width: 5 },
      { header: 'Task Title', key: 'title', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Assigned To', key: 'assigned', width: 25 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Days Overdue', key: 'daysOverdue', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    overdueTasks.forEach((task, index) => {
      const daysOverdue = Math.abs(calculateDaysUntilDue(task.due_date));
      overdueSheet.addRow({
        index: index + 1,
        title: task.title,
        priority: task.priority.toUpperCase(),
        assigned: task.assigned_to && task.assigned_to.length > 0
          ? task.assigned_to.map(u => u.full_name).join(', ')
          : 'Unassigned',
        dueDate: new Date(task.due_date).toLocaleDateString(),
        daysOverdue: daysOverdue,
        status: task.status.replace('_', ' ').toUpperCase(),
      });
    });

    // Style overdue header
    overdueSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    overdueSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F56565' }
    };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

// Generate PDF Report
export const generatePDFReport = (tasks, analytics) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('TaskFlow Weekly Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text(getWeekDateRange(), pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Summary Statistics
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text('Summary Statistics', 15, yPosition);
  yPosition += 10;

  const completionRate = analytics.totalTasks > 0 
    ? ((analytics.completedTasks / analytics.totalTasks) * 100).toFixed(1)
    : '0.0';
  const overdueRate = analytics.totalTasks > 0
    ? ((analytics.overdueTasks / analytics.totalTasks) * 100).toFixed(1)
    : '0.0';

  const summaryData = [
    ['Total Tasks', analytics.totalTasks.toString()],
    ['Completed Tasks', `${analytics.completedTasks} (${completionRate}%)`],
    ['In Progress Tasks', analytics.inProgressTasks.toString()],
    ['Overdue Tasks', `${analytics.overdueTasks} (${overdueRate}%)`],
    ['Active Teams', (analytics.activeTeams || 0).toString()],
    ['Active Users', (analytics.activeUsers || 0).toString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [102, 126, 234], fontStyle: 'bold' },
    margin: { left: 15, right: 15 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // Status Distribution
  if (analytics.statusDistribution && analytics.statusDistribution.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Status Distribution', 15, yPosition);
    yPosition += 10;

    const statusData = analytics.statusDistribution.map(item => [
      item.name || item._id,
      item.value.toString(),
      ((item.value / analytics.totalTasks) * 100).toFixed(1) + '%'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Count', 'Percentage']],
      body: statusData,
      theme: 'grid',
      headStyles: { fillColor: [72, 187, 120] },
      margin: { left: 15, right: 15 },
    });

    yPosition = doc.lastAutoTable.finalY + 15;
  }

  // Overdue Tasks
  const overdueTasks = tasks.filter(isTaskOverdue);
  if (overdueTasks.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(245, 101, 101);
    doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Critical: Overdue Tasks', pageWidth / 2, yPosition + 2, { align: 'center' });
    
    yPosition += 10;
    doc.setTextColor(0);

    const overdueData = overdueTasks.slice(0, 20).map(task => [
      task.title.substring(0, 30) + (task.title.length > 30 ? '...' : ''),
      task.priority.toUpperCase(),
      task.assigned_to && task.assigned_to.length > 0
        ? task.assigned_to[0].full_name.substring(0, 18)
        : 'Unassigned',
      new Date(task.due_date).toLocaleDateString(),
      Math.abs(calculateDaysUntilDue(task.due_date)).toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Task', 'Priority', 'Assigned To', 'Due Date', 'Days Overdue']],
      body: overdueData,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        4: { textColor: [239, 68, 68], fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 },
    });

    if (overdueTasks.length > 20) {
      yPosition = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`... and ${overdueTasks.length - 20} more overdue tasks`, 15, yPosition);
    }
  }

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount} | TaskFlow Report | ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('arraybuffer');
};

// Helper Functions
export const isTaskOverdue = (task) => {
  if (!task.due_date || task.status === 'done') return false;
  return new Date(task.due_date) < new Date();
};

export const calculateDaysUntilDue = (dueDate) => {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getWeekDateRange = () => {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return `${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}`;
};

export default {
  generateExcelReport,
  generatePDFReport,
  isTaskOverdue,
  calculateDaysUntilDue
};



