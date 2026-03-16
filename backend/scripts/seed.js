import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PRESERVE_EMAIL = 'jassalarjansigh@gmail.com';
const DEMO_PASSWORD = 'Demo@1234';
const WORKSPACE_NAME = 'Nexus Corp (Demo)';
const WORKSPACE_SLUG = 'nexus-demo';
const WORKSPACE_PLAN = 'enterprise';

async function importModel(modelName, relativePath) {
  try {
    const module = await import(new URL(relativePath, import.meta.url));
    const model = module?.default ?? module;

    if (!model?.schema) {
      throw new Error(`Imported module is not a valid mongoose model: ${relativePath}`);
    }

    return model;
  } catch (error) {
    console.error(`❌ Model import failed for ${modelName} (${relativePath}): ${error.message}`);
    throw error;
  }
}

function ensureRequiredField(modelName, model, fieldPath) {
  const pathDef = model.schema.path(fieldPath);
  if (!pathDef) {
    const error = new Error(`${modelName} missing required seed field: ${fieldPath}`);
    console.error(`❌ ${error.message}`);
    throw error;
  }
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function atTime(date, hours, minutes) {
  const copy = new Date(date);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

function pickRandomAround(base, deltaMinutes) {
  return new Date(base.getTime() + Math.floor(Math.random() * deltaMinutes) * 60 * 1000);
}

async function runSeed() {
  let exitCode = 0;

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ Missing environment variable: MONGODB_URI');
      process.exit(1);
    }

    const [
      User,
      Team,
      Shift,
      EmployeeShiftAssignment,
      GeofenceLocation,
      Project,
      Sprint,
      Task,
      Attendance,
      LeaveType,
      LeaveRequest,
      Holiday,
      Meeting,
      Notification,
      ChangeLog,
      WorkspaceSettings,
      VerificationSettings,
    ] = await Promise.all([
      importModel('User', '../models/User.js'),
      importModel('Team', '../models/Team.js'),
      importModel('Shift', '../models/Shift.js'),
      importModel('EmployeeShiftAssignment', '../models/EmployeeShiftAssignment.js'),
      importModel('GeofenceLocation', '../models/GeofenceLocation.js'),
      importModel('Project', '../models/Project.js'),
      importModel('Sprint', '../models/Sprint.js'),
      importModel('Task', '../models/Task.js'),
      importModel('Attendance', '../models/Attendance.js'),
      importModel('LeaveType', '../models/LeaveType.js'),
      importModel('LeaveRequest', '../models/LeaveRequest.js'),
      importModel('Holiday', '../models/Holiday.js'),
      importModel('Meeting', '../models/Meeting.js'),
      importModel('Notification', '../models/Notification.js'),
      importModel('ChangeLog', '../models/ChangeLog.js'),
      importModel('WorkspaceSettings', '../models/WorkspaceSettings.js'),
      importModel('VerificationSettings', '../models/VerificationSettings.js'),
    ]);

    // Validate fields that this seed depends on. If any are missing, fail fast.
    ensureRequiredField('User', User, 'full_name');
    ensureRequiredField('User', User, 'email');
    ensureRequiredField('User', User, 'password_hash');
    ensureRequiredField('User', User, 'role');
    ensureRequiredField('User', User, 'workspaceId');
    ensureRequiredField('User', User, 'isEmailVerified');

    ensureRequiredField('Team', Team, 'name');
    ensureRequiredField('Team', Team, 'hr_id');
    ensureRequiredField('Team', Team, 'lead_id');
    ensureRequiredField('Team', Team, 'members');

    ensureRequiredField('Shift', Shift, 'shift_name');
    ensureRequiredField('Shift', Shift, 'start_time');
    ensureRequiredField('Shift', Shift, 'end_time');
    ensureRequiredField('Shift', Shift, 'total_hours');
    ensureRequiredField('Shift', Shift, 'created_by');

    ensureRequiredField('EmployeeShiftAssignment', EmployeeShiftAssignment, 'user_id');
    ensureRequiredField('EmployeeShiftAssignment', EmployeeShiftAssignment, 'shift_id');
    ensureRequiredField('EmployeeShiftAssignment', EmployeeShiftAssignment, 'effective_from');
    ensureRequiredField('EmployeeShiftAssignment', EmployeeShiftAssignment, 'assigned_by');

    ensureRequiredField('GeofenceLocation', GeofenceLocation, 'workspaceId');
    ensureRequiredField('GeofenceLocation', GeofenceLocation, 'name');
    ensureRequiredField('GeofenceLocation', GeofenceLocation, 'location.coordinates');
    ensureRequiredField('GeofenceLocation', GeofenceLocation, 'radiusMeters');

    ensureRequiredField('Project', Project, 'name');
    ensureRequiredField('Project', Project, 'status');
    ensureRequiredField('Project', Project, 'due_date');
    ensureRequiredField('Project', Project, 'created_by');

    ensureRequiredField('Sprint', Sprint, 'workspace');
    ensureRequiredField('Sprint', Sprint, 'project');
    ensureRequiredField('Sprint', Sprint, 'name');
    ensureRequiredField('Sprint', Sprint, 'startDate');
    ensureRequiredField('Sprint', Sprint, 'endDate');
    ensureRequiredField('Sprint', Sprint, 'status');

    ensureRequiredField('Task', Task, 'title');
    ensureRequiredField('Task', Task, 'project_id');
    ensureRequiredField('Task', Task, 'sprint_id');
    ensureRequiredField('Task', Task, 'assigned_to');
    ensureRequiredField('Task', Task, 'status');
    ensureRequiredField('Task', Task, 'priority');
    ensureRequiredField('Task', Task, 'created_by');
    ensureRequiredField('Task', Task, 'due_date');

    ensureRequiredField('Attendance', Attendance, 'userId');
    ensureRequiredField('Attendance', Attendance, 'date');
    ensureRequiredField('Attendance', Attendance, 'checkIn');
    ensureRequiredField('Attendance', Attendance, 'checkOut');
    ensureRequiredField('Attendance', Attendance, 'status');

    ensureRequiredField('LeaveType', LeaveType, 'name');
    ensureRequiredField('LeaveType', LeaveType, 'code');
    ensureRequiredField('LeaveType', LeaveType, 'annualQuota');

    ensureRequiredField('LeaveRequest', LeaveRequest, 'userId');
    ensureRequiredField('LeaveRequest', LeaveRequest, 'leaveTypeId');
    ensureRequiredField('LeaveRequest', LeaveRequest, 'startDate');
    ensureRequiredField('LeaveRequest', LeaveRequest, 'endDate');
    ensureRequiredField('LeaveRequest', LeaveRequest, 'days');
    ensureRequiredField('LeaveRequest', LeaveRequest, 'reason');
    ensureRequiredField('LeaveRequest', LeaveRequest, 'status');

    ensureRequiredField('Holiday', Holiday, 'name');
    ensureRequiredField('Holiday', Holiday, 'date');

    ensureRequiredField('Meeting', Meeting, 'title');
    ensureRequiredField('Meeting', Meeting, 'start_time');
    ensureRequiredField('Meeting', Meeting, 'end_time');
    ensureRequiredField('Meeting', Meeting, 'created_by');
    ensureRequiredField('Meeting', Meeting, 'organizer_role');
    ensureRequiredField('Meeting', Meeting, 'meeting_type');
    ensureRequiredField('Meeting', Meeting, 'status');

    ensureRequiredField('Notification', Notification, 'user_id');
    ensureRequiredField('Notification', Notification, 'type');
    ensureRequiredField('Notification', Notification, 'message');

    ensureRequiredField('ChangeLog', ChangeLog, 'event_type');
    ensureRequiredField('ChangeLog', ChangeLog, 'action');
    ensureRequiredField('ChangeLog', ChangeLog, 'description');

    ensureRequiredField('WorkspaceSettings', WorkspaceSettings, 'workspace_id');
    ensureRequiredField('WorkspaceSettings', WorkspaceSettings, 'general.name');
    ensureRequiredField('WorkspaceSettings', WorkspaceSettings, 'billing.plan');

    ensureRequiredField('VerificationSettings', VerificationSettings, 'workspaceId');

    await mongoose.connect(MONGODB_URI);

    // Generate all seed IDs up front for stable cross-references.
    const workspaceId = new mongoose.Types.ObjectId();

    const ids = {
      adminUser: new mongoose.Types.ObjectId(),
      hrUser: new mongoose.Types.ObjectId(),
      engLeadUser: new mongoose.Types.ObjectId(),
      designLeadUser: new mongoose.Types.ObjectId(),
      member1User: new mongoose.Types.ObjectId(),
      member2User: new mongoose.Types.ObjectId(),

      engTeam: new mongoose.Types.ObjectId(),
      designTeam: new mongoose.Types.ObjectId(),

      morningShift: new mongoose.Types.ObjectId(),
      eveningShift: new mongoose.Types.ObjectId(),

      hqGeofence: new mongoose.Types.ObjectId(),

      project1: new mongoose.Types.ObjectId(),
      project2: new mongoose.Types.ObjectId(),

      sprint1: new mongoose.Types.ObjectId(),
      sprint2: new mongoose.Types.ObjectId(),

      leaveTypeCasual: new mongoose.Types.ObjectId(),
      leaveTypeSick: new mongoose.Types.ObjectId(),
      leaveTypeEarned: new mongoose.Types.ObjectId(),

      leave1: new mongoose.Types.ObjectId(),
      leave2: new mongoose.Types.ObjectId(),

      holiday1: new mongoose.Types.ObjectId(),
      holiday2: new mongoose.Types.ObjectId(),
      holiday3: new mongoose.Types.ObjectId(),

      meeting1: new mongoose.Types.ObjectId(),

      notification1: new mongoose.Types.ObjectId(),
      notification2: new mongoose.Types.ObjectId(),
      notification3: new mongoose.Types.ObjectId(),

      changelog1: new mongoose.Types.ObjectId(),

      task1: new mongoose.Types.ObjectId(),
      task2: new mongoose.Types.ObjectId(),
      task3: new mongoose.Types.ObjectId(),
      task4: new mongoose.Types.ObjectId(),
      task5: new mongoose.Types.ObjectId(),
      task6: new mongoose.Types.ObjectId(),
      task7: new mongoose.Types.ObjectId(),
      task8: new mongoose.Types.ObjectId(),

      shiftAssign1: new mongoose.Types.ObjectId(),
      shiftAssign2: new mongoose.Types.ObjectId(),
      shiftAssign3: new mongoose.Types.ObjectId(),
      shiftAssign4: new mongoose.Types.ObjectId(),

      workspaceSettings: new mongoose.Types.ObjectId(),
      verificationSettings: new mongoose.Types.ObjectId(),
    };

    // Compute date anchors.
    const now = new Date();
    const today = startOfDay(now);
    const thirtyDaysAgo = addDays(today, -30);
    const sixtyDaysFromNow = addDays(today, 60);
    const sevenDaysAgo = addDays(today, -7);
    const fortyFiveDaysFromNow = addDays(today, 45);
    const fourteenDaysAgo = addDays(today, -14);
    const sevenDaysFromNow = addDays(today, 7);

    const leave1Start = addDays(today, 3);
    const leave1End = addDays(today, 4);
    const leave2Date = addDays(today, 10);

    const meetingStart = atTime(addDays(today, 3), 11, 0);
    const meetingEnd = atTime(addDays(today, 3), 12, 0);

    const currentYear = today.getFullYear();

    // Build attendance days for Mon-Fri inside the last 7 calendar days.
    const workingDays = [];
    for (let offset = -6; offset <= 0; offset += 1) {
      const d = addDays(today, offset);
      const weekday = d.getDay();
      if (weekday >= 1 && weekday <= 5) {
        workingDays.push(d);
      }
    }

    const attendanceCount = workingDays.length * 6;
    const attendanceIds = Array.from(
      { length: attendanceCount },
      () => new mongoose.Types.ObjectId()
    );

    // Always destructive reset for all seeded collections.
    await Promise.all([
      Attendance.deleteMany({}),
      LeaveRequest.deleteMany({}),
      LeaveType.deleteMany({}),
      Holiday.deleteMany({}),
      Meeting.deleteMany({}),
      Notification.deleteMany({}),
      ChangeLog.deleteMany({}),
      Task.deleteMany({}),
      Sprint.deleteMany({}),
      Project.deleteMany({}),
      GeofenceLocation.deleteMany({}),
      EmployeeShiftAssignment.deleteMany({}),
      Shift.deleteMany({}),
      Team.deleteMany({}),
      VerificationSettings.deleteMany({}),
      WorkspaceSettings.deleteMany({ workspace_id: WORKSPACE_SLUG }),
      User.deleteMany({ email: { $ne: PRESERVE_EMAIL } }),
    ]);

    console.log('🗑  Cleared existing data...');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // NOTE: There is no Workspace/Organization model in backend/models.
    // NOTE: User schema has workspaceId but no workspace slug field, so "nexus-demo"
    // cannot be embedded directly per-user without inventing schema fields.
    const users = [
      {
        _id: ids.adminUser,
        full_name: 'Alex Morgan',
        email: 'admin@nexusdemo.com',
        password_hash: passwordHash,
        role: 'admin',
        workspaceId,
        team_id: null,
        teams: [],
        isEmailVerified: true,
      },
      {
        _id: ids.hrUser,
        full_name: 'Priya Sharma',
        email: 'hr@nexusdemo.com',
        password_hash: passwordHash,
        // NOTE: Requested role "hr_manager" does not exist in User enum.
        role: 'hr',
        workspaceId,
        team_id: null,
        teams: [],
        isEmailVerified: true,
      },
      {
        _id: ids.engLeadUser,
        full_name: 'Jordan Lee',
        email: 'lead.eng@nexusdemo.com',
        password_hash: passwordHash,
        role: 'team_lead',
        workspaceId,
        team_id: ids.engTeam,
        teams: [ids.engTeam],
        isEmailVerified: true,
      },
      {
        _id: ids.designLeadUser,
        full_name: 'Sofia Reyes',
        email: 'lead.design@nexusdemo.com',
        password_hash: passwordHash,
        role: 'team_lead',
        workspaceId,
        team_id: ids.designTeam,
        teams: [ids.designTeam],
        isEmailVerified: true,
      },
      {
        _id: ids.member1User,
        full_name: 'Ethan Brooks',
        email: 'ethan@nexusdemo.com',
        password_hash: passwordHash,
        role: 'member',
        workspaceId,
        team_id: ids.engTeam,
        teams: [ids.engTeam],
        isEmailVerified: true,
      },
      {
        _id: ids.member2User,
        full_name: 'Aisha Nwosu',
        email: 'aisha@nexusdemo.com',
        password_hash: passwordHash,
        role: 'member',
        workspaceId,
        team_id: ids.designTeam,
        teams: [ids.designTeam],
        isEmailVerified: true,
      },
    ];

    await User.insertMany(users, { ordered: true });

    const teams = [
      {
        _id: ids.engTeam,
        name: 'Engineering Squad',
        hr_id: ids.hrUser,
        lead_id: ids.engLeadUser,
        members: [ids.engLeadUser, ids.member1User],
      },
      {
        _id: ids.designTeam,
        name: 'Design Collective',
        hr_id: ids.hrUser,
        lead_id: ids.designLeadUser,
        members: [ids.designLeadUser, ids.member2User],
      },
    ];

    await Team.insertMany(teams, { ordered: true });

    const shifts = [
      {
        _id: ids.morningShift,
        shift_name: 'Morning Shift',
        start_time: '09:00',
        end_time: '18:00',
        total_hours: 8,
        shift_type: 'morning',
        created_by: ids.hrUser,
        notes: 'Mon-Fri shift',
      },
      {
        _id: ids.eveningShift,
        shift_name: 'Evening Shift',
        start_time: '13:00',
        end_time: '22:00',
        total_hours: 8,
        shift_type: 'evening',
        created_by: ids.hrUser,
        notes: 'Mon-Fri shift',
      },
    ];

    await Shift.insertMany(shifts, { ordered: true });

    // Shift schema has no direct user assignment field; assignments are seeded separately.
    const shiftAssignments = [
      {
        _id: ids.shiftAssign1,
        user_id: ids.engLeadUser,
        shift_id: ids.morningShift,
        effective_from: thirtyDaysAgo,
        assignment_type: 'fixed',
        assigned_by: ids.hrUser,
      },
      {
        _id: ids.shiftAssign2,
        user_id: ids.member1User,
        shift_id: ids.morningShift,
        effective_from: thirtyDaysAgo,
        assignment_type: 'fixed',
        assigned_by: ids.hrUser,
      },
      {
        _id: ids.shiftAssign3,
        user_id: ids.designLeadUser,
        shift_id: ids.eveningShift,
        effective_from: thirtyDaysAgo,
        assignment_type: 'fixed',
        assigned_by: ids.hrUser,
      },
      {
        _id: ids.shiftAssign4,
        user_id: ids.member2User,
        shift_id: ids.eveningShift,
        effective_from: thirtyDaysAgo,
        assignment_type: 'fixed',
        assigned_by: ids.hrUser,
      },
    ];

    await EmployeeShiftAssignment.insertMany(shiftAssignments, { ordered: true });

    const geofences = [
      {
        _id: ids.hqGeofence,
        workspaceId,
        name: 'Nexus HQ',
        description: 'Primary demo office geofence (New Delhi)',
        location: {
          type: 'Point',
          coordinates: [77.209, 28.6139],
        },
        radiusMeters: 200,
        isActive: true,
        createdBy: ids.adminUser,
      },
    ];

    // NOTE: Geofence schema has no user-assignment field; assigning to all users is skipped.
    await GeofenceLocation.insertMany(geofences, { ordered: true });

    const projects = [
      {
        _id: ids.project1,
        name: 'Platform Revamp',
        description: 'Modernize the internal tooling platform with new architecture and UI.',
        // NOTE: Requested status "in_progress" is not in Project enum; using "active".
        status: 'active',
        priority: 'high',
        start_date: thirtyDaysAgo,
        due_date: sixtyDaysFromNow,
        created_by: ids.adminUser,
        team_members: [
          { user: ids.engLeadUser, role: 'lead' },
          { user: ids.member1User, role: 'member' },
        ],
      },
      {
        _id: ids.project2,
        name: 'Brand Identity 2026',
        description: 'Complete rebrand including logo, color system, and component library.',
        status: 'active',
        priority: 'medium',
        start_date: sevenDaysAgo,
        due_date: fortyFiveDaysFromNow,
        created_by: ids.adminUser,
        team_members: [
          { user: ids.designLeadUser, role: 'lead' },
          { user: ids.member2User, role: 'member' },
        ],
      },
    ];

    await Project.insertMany(projects, { ordered: true });

    const sprints = [
      {
        _id: ids.sprint1,
        workspace: workspaceId,
        project: ids.project1,
        name: 'Sprint 1 - Foundation',
        status: 'active',
        startDate: fourteenDaysAgo,
        endDate: today,
      },
      {
        _id: ids.sprint2,
        workspace: workspaceId,
        project: ids.project2,
        name: 'Sprint 1 - Discovery',
        status: 'active',
        startDate: sevenDaysAgo,
        endDate: sevenDaysFromNow,
      },
    ];

    await Sprint.insertMany(sprints, { ordered: true });

    const tasks = [
      {
        _id: ids.task1,
        title: 'Set up CI/CD pipeline',
        status: 'done',
        priority: 'high',
        project_id: ids.project1,
        sprint_id: ids.sprint1,
        assigned_to: [ids.member1User],
        team_id: ids.engTeam,
        created_by: ids.engLeadUser,
        due_date: addDays(today, 3),
      },
      {
        _id: ids.task2,
        title: 'Refactor authentication module',
        status: 'in_progress',
        priority: 'high',
        project_id: ids.project1,
        sprint_id: ids.sprint1,
        assigned_to: [ids.engLeadUser],
        team_id: ids.engTeam,
        created_by: ids.engLeadUser,
        due_date: addDays(today, 6),
      },
      {
        _id: ids.task3,
        title: 'Write API integration tests',
        status: 'todo',
        priority: 'medium',
        project_id: ids.project1,
        sprint_id: ids.sprint1,
        assigned_to: [ids.member1User],
        team_id: ids.engTeam,
        created_by: ids.engLeadUser,
        due_date: addDays(today, 8),
      },
      {
        _id: ids.task4,
        title: 'Performance audit - dashboard',
        status: 'todo',
        priority: 'low',
        project_id: ids.project1,
        sprint_id: ids.sprint1,
        assigned_to: [ids.engLeadUser],
        team_id: ids.engTeam,
        created_by: ids.engLeadUser,
        due_date: addDays(today, 10),
      },
      {
        _id: ids.task5,
        title: 'Competitive design audit',
        status: 'done',
        priority: 'medium',
        project_id: ids.project2,
        sprint_id: ids.sprint2,
        assigned_to: [ids.member2User],
        team_id: ids.designTeam,
        created_by: ids.designLeadUser,
        due_date: addDays(today, 4),
      },
      {
        _id: ids.task6,
        title: 'Logo concepts - Round 1',
        status: 'in_progress',
        priority: 'high',
        project_id: ids.project2,
        sprint_id: ids.sprint2,
        assigned_to: [ids.designLeadUser],
        team_id: ids.designTeam,
        created_by: ids.designLeadUser,
        due_date: addDays(today, 7),
      },
      {
        _id: ids.task7,
        title: 'Define color palette and typography',
        status: 'todo',
        priority: 'high',
        project_id: ids.project2,
        sprint_id: ids.sprint2,
        assigned_to: [ids.member2User],
        team_id: ids.designTeam,
        created_by: ids.designLeadUser,
        due_date: addDays(today, 9),
      },
      {
        _id: ids.task8,
        title: 'Design system component library kickoff',
        status: 'todo',
        priority: 'medium',
        project_id: ids.project2,
        sprint_id: ids.sprint2,
        assigned_to: [ids.designLeadUser],
        team_id: ids.designTeam,
        created_by: ids.designLeadUser,
        due_date: addDays(today, 11),
      },
    ];

    await Task.insertMany(tasks, { ordered: true });

    const usersForAttendance = [
      ids.adminUser,
      ids.hrUser,
      ids.engLeadUser,
      ids.designLeadUser,
      ids.member1User,
      ids.member2User,
    ];

    const attendance = [];
    let attendanceIndex = 0;

    for (const date of workingDays) {
      for (const userId of usersForAttendance) {
        const checkInBase = atTime(date, 9, 5);
        const checkOutBase = atTime(date, 18, 10);

        const checkIn = pickRandomAround(checkInBase, 10);
        const checkOut = pickRandomAround(checkOutBase, 15);

        attendance.push({
          _id: attendanceIds[attendanceIndex],
          userId,
          date: startOfDay(date),
          checkIn,
          checkOut,
          status: 'present',
          workMode: 'onsite',
          verificationStatus: 'auto_approved',
          // NOTE: Attendance schema has no verifiedBy field for geofence ObjectId.
          // We store geofence context in notes and GPS payload instead.
          notes: `Verified via geofence ${ids.hqGeofence.toString()}`,
          verification: {
            gpsLocation: {
              latitude: 28.6139 + (Math.random() - 0.5) * 0.001,
              longitude: 77.209 + (Math.random() - 0.5) * 0.001,
              accuracy: 15,
              timestamp: checkIn,
            },
            serverTimestamp: checkIn,
          },
        });

        attendanceIndex += 1;
      }
    }

    await Attendance.insertMany(attendance, { ordered: true });

    const leaveTypes = [
      {
        _id: ids.leaveTypeCasual,
        name: 'Casual Leave',
        code: 'CL',
        annualQuota: 12,
        description: 'Casual Leave - 12 days/year',
      },
      {
        _id: ids.leaveTypeSick,
        name: 'Sick Leave',
        code: 'SL',
        annualQuota: 10,
        description: 'Sick Leave - 10 days/year',
      },
      {
        _id: ids.leaveTypeEarned,
        name: 'Earned Leave',
        code: 'EL',
        annualQuota: 15,
        description: 'Earned Leave - 15 days/year',
      },
    ];

    await LeaveType.insertMany(leaveTypes, { ordered: true });

    const leaves = [
      {
        _id: ids.leave1,
        userId: ids.member2User,
        leaveTypeId: ids.leaveTypeSick,
        startDate: leave1Start,
        endDate: leave1End,
        days: 2,
        reason: 'Fever and recovery',
        status: 'approved',
        approvedBy: ids.hrUser,
        approvedAt: now,
      },
      {
        _id: ids.leave2,
        userId: ids.member1User,
        leaveTypeId: ids.leaveTypeCasual,
        startDate: leave2Date,
        endDate: leave2Date,
        days: 1,
        reason: 'Personal work',
        status: 'pending',
        approvedBy: null,
      },
    ];

    await LeaveRequest.insertMany(leaves, { ordered: true });

    const holidays = [
      {
        _id: ids.holiday1,
        name: 'Holi',
        date: new Date(currentYear, 2, 25),
        isRecurring: true,
        description: 'Festival of colors',
      },
      {
        _id: ids.holiday2,
        name: 'Independence Day',
        date: new Date(currentYear, 7, 15),
        isRecurring: true,
        description: 'National holiday',
      },
      {
        _id: ids.holiday3,
        name: 'Diwali',
        date: new Date(currentYear, 9, 20),
        isRecurring: true,
        description: 'Festival of lights',
      },
    ];

    await Holiday.insertMany(holidays, { ordered: true });

    const meetings = [
      {
        _id: ids.meeting1,
        title: 'Q2 Planning Kickoff',
        description: 'Cross-functional planning alignment for Q2',
        start_time: meetingStart,
        end_time: meetingEnd,
        created_by: ids.adminUser,
        organizer_role: 'admin',
        participant_users: usersForAttendance,
        meeting_type: 'all_hands',
        status: 'scheduled',
        visibility_scope: 'org_wide',
      },
    ];

    await Meeting.insertMany(meetings, { ordered: true });

    const notifications = [
      {
        _id: ids.notification1,
        user_id: ids.engLeadUser,
        type: 'task_updated',
        message: 'Sprint 1 is now active. Start logging progress.',
      },
      {
        _id: ids.notification2,
        user_id: ids.member2User,
        type: 'leave_approved',
        message: 'Your sick leave request has been approved.',
      },
      {
        _id: ids.notification3,
        user_id: ids.member1User,
        type: 'task_assigned',
        task_id: ids.task3,
        message: 'New task assigned: Write API integration tests.',
      },
    ];

    await Notification.insertMany(notifications, { ordered: true });

    const changelog = [
      {
        _id: ids.changelog1,
        event_type: 'system_event',
        user_id: ids.adminUser,
        user_email: 'admin@nexusdemo.com',
        user_name: 'Alex Morgan',
        user_role: 'admin',
        target_type: 'system',
        target_id: 'seed-script',
        target_name: 'Demo Environment Initialized',
        action: 'Seed data initialization',
        description: 'Full seed data loaded for client demo and QA testing.',
        metadata: {
          version: '2.1.0',
          title: 'Demo Environment Initialized',
          workspaceName: WORKSPACE_NAME,
          workspaceSlug: WORKSPACE_SLUG,
          plan: WORKSPACE_PLAN,
        },
        created_at: now,
      },
    ];

    await ChangeLog.insertMany(changelog, { ordered: true });

    await WorkspaceSettings.create({
      _id: ids.workspaceSettings,
      workspace_id: WORKSPACE_SLUG,
      general: {
        name: WORKSPACE_NAME,
        description: 'Demo workspace for client demos and QA testing',
        timezone: 'Asia/Kolkata',
        date_format: 'DD/MM/YYYY',
        language: 'en',
      },
      billing: {
        plan: WORKSPACE_PLAN,
        billing_cycle: 'annual',
        seats_used: 6,
        seats_limit: 50,
      },
    });

    await VerificationSettings.create({
      _id: ids.verificationSettings,
      workspaceId,
      photoVerification: {
        enabled: false,
        mandatory: false,
      },
      gpsVerification: {
        enabled: true,
        mandatory: true,
        accuracyThresholdMeters: 100,
      },
      createdBy: ids.adminUser,
      updatedBy: ids.adminUser,
    });

    const seededAtIso = new Date().toISOString();
    const environment = process.env.NODE_ENV || 'development';

    console.log('');
    console.log('========================================');
    console.log('  ✅ AETHERTRACK SEED COMPLETE');
    console.log('========================================');
    console.log(`  Workspace  : ${WORKSPACE_NAME}`);
    console.log(`  Environment: ${environment}`);
    console.log(`  Seeded at  : ${seededAtIso}`);
    console.log('----------------------------------------');
    console.log('  DEMO CREDENTIALS  (password: Demo@1234)');
    console.log('----------------------------------------');
    console.log('  Admin       : admin@nexusdemo.com');
    console.log('  HR Manager  : hr@nexusdemo.com');
    console.log('  Eng Lead    : lead.eng@nexusdemo.com');
    console.log('  Design Lead : lead.design@nexusdemo.com');
    console.log('  Member 1    : ethan@nexusdemo.com');
    console.log('  Member 2    : aisha@nexusdemo.com');
    console.log('----------------------------------------');
    console.log('  RECORDS INSERTED');
    console.log('----------------------------------------');
    console.log('  Users           6');
    console.log('  Teams           2');
    console.log('  Shifts          2');
    console.log('  Geofences       1');
    console.log('  Projects        2');
    console.log('  Sprints         2');
    console.log('  Tasks           8');
    console.log(`  Attendance      up to 30 (6 × working days) | inserted ${attendance.length}`);
    console.log('  Leave Types     3');
    console.log('  Leaves          2');
    console.log('  Holidays        3');
    console.log('  Meetings        1');
    console.log('  Notifications   3');
    console.log('  Changelog       1');
    console.log('========================================');
  } catch (error) {
    exitCode = 1;
    console.error('❌ Seed failed:', error.message);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      exitCode = 1;
      console.error(`❌ Failed to disconnect mongoose: ${disconnectError.message}`);
    }

    process.exit(exitCode);
  }
}

runSeed();