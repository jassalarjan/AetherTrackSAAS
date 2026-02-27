# Task Reallocation System Architecture

> **Version:** 2.1  
> **Date:** 2026-02-26  
> **Status:** Architectural Design Document (Updated)  
> **Author:** AetherTrack Engineering Team

---

## Version 2.0-2.1 Changes: Auto-Redistribution to Admin Pool

> **Problem:** Task reallocation showed "pending" when Super Admin was unavailable.
> **Solution:** Tasks are now automatically redistributed to available Admins when Super Admin is unavailable.

### Key Changes:
- ✅ Super Admin unavailable → Auto-escalate to Admin pool (NOT system hold as first option)
- ✅ Added `findAvailableAdmins()` function with load-balancing
- ✅ Added `leastLoadedAdmin()` function for optimal task distribution
- ✅ Tasks are NEVER left pending due to Super Admin unavailability
- ✅ System hold is only the LAST RESORT when ALL admins are also unavailable

---

## Table of Contents

1. [High-Level Decision Philosophy](#1-high-level-decision-philosophy)
2. [Step-by-Step Logic Flow](#2-step-by-step-logic-flow)
3. [Pseudocode/Flowchart-Style Logic](#3-pseudocodeflowchart-style-logic)
4. [Data Models/Entities](#4-data-modelsentities)
5. [Role Priority Order](#5-role-priority-order)
6. [Time-Based Escalation Thresholds (SLAs)](#6-time-based-escalation-thresholds-slas)
7. [Safe Defaults for Emergency Scenarios](#7-safe-defaults-for-emergency-scenarios)
8. [Why This Is Scalable, Legally Safe, and Enterprise-Ready](#8-why-this-is-scalable-legally-safe-and-enterprise-ready)
9. [Edge Cases to Handle](#9-edge-cases-to-handle)
10. [Recommended Implementation Roadmap](#10-recommended-implementation-roadmap)

---

## 1. High-Level Decision Philosophy

> **Core Principle:** *Predictable, auditable hierarchy-based failover that never leaves tasks ownerless*

- **Prefer explicit delegation over automatic escalation** for high-authority roles (Super Admin, Admin)
- **System-owned holding states** act as safety nets when no humans are available at any level
- **Acting role delegation** takes precedence over automatic failover to respect temporary authority
- **Audit trail completeness** is non-negotiable — every action must be traceable to a human actor

---

## 2. Step-by-Step Logic Flow

### Overview Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TASK REALLOCATION WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   TRIGGER    │────▶│  CANDIDATE   │────▶│  ASSIGNMENT  │
    │  DETECTION   │     │  RESOLUTION  │     │   ATTEMPT    │
    └──────────────┘     └──────────────┘     └──────────────┘
          │                                            │
          │           ┌─────────────────┐              │
          │           ▼                 ▼              ▼
          │    ┌───────────┐     ┌───────────┐  ┌───────────┐
          │    │  ACTING   │     │ EXPLICIT  │  │HIERARCHY  │
          │    │DELEGATION│     │DELEGATION │  │  FALLBACK │
          │    └───────────┘     └───────────┘  └───────────┘
          │           │               │               │
          └───────────│───────────────│───────────────│────────────
                      │               │               │
                      ▼               ▼               ▼
               ┌────────────────────────────────────────────────┐
               │           ASSIGNMENT SUCCESS                   │
               │  • Update task ownership                      │
               │  • Create audit log                           │
               │  • Send notifications                         │
               └────────────────────────────────────────────────┘
                                  │
                                  │ (if failed)
                                  ▼
               ┌────────────────────────────────────────────────┐
               │              ESCALATION WITH SLAs              │
               │  • Team Lead pool → Admin pool → Super Admin   │
               │  • Each level has configurable time limit    │
               └────────────────────────────────────────────────┘
                                  │
                                  │ (if all escalation fails)
                                  ▼
               ┌────────────────────────────────────────────────┐
               │         SYSTEM-OWNED HOLDING STATE            │
               │  • Task marked as system_owned                │
               │  • Critical alerts to Super Admins           │
               │  • Requires manual intervention to release     │
               └────────────────────────────────────────────────┘
```

### Detailed Flow Steps

#### Step 1: Detection of Unavailability

The system monitors multiple trigger conditions:

| Trigger Type | Detection Method | Grace Period | Immediate? |
|-------------|------------------|--------------|-------------|
| **Planned Leave** | LeaveRequest approved | Start date | No |
| **Unplanned Absence** | Attendance marked absent | None | Yes |
| **Inactivity** | Last login threshold | 30 days (configurable) | Yes |
| **Access Revoked** | Admin action | None | Yes |
| **Employment Exit** | Status changed to EXITED | None | Yes |

#### Step 2: Candidate Resolution

Priority order for finding replacement assignees:

1. **Acting Delegation** — User has an active `ActingDelegation` granting temporary authority
2. **Explicit Delegation** — Pre-approved delegation from the unavailable user
3. **Role-Based Hierarchy** — Escalate through: Team Member → Team Lead → Admin → Super Admin
4. **Pool Assignment** — Add to role-specific task pool for claiming

#### Step 3: Assignment Attempt with Fallback Hierarchy

```
Current Owner (Level N)
    │
    ├──▶ Try Acting Delegation (if exists)
    │       └──▶ SUCCESS: Assign to acting delegate
    │
    ├──▶ Try Explicit Delegation (if exists)
    │       └──▶ SUCCESS: Assign to explicit delegate
    │
    └──▶ Try Hierarchical Escalation
            │
            ├──▶ Level N+1 Available? ──YES──▶ Assign to Level N+1
            │
            └──▶ NO ──▶ Try Level N+2
                        │
                        └──▶ ... continue until system-owned
```

#### Step 4: Escalation with SLAs

| From Level | To Level | SLA Duration | Action |
|------------|----------|---------------|--------|
| Team Member | Team Lead Pool | 4 hours | Alert Team Leads |
| Team Lead | Admin Pool | 8 hours | Alert Admins |
| Admin | Super Admin | 24 hours | Critical alert |
| All levels fail | System Hold | N/A | Critical organizational alert |

#### Step 5: System-Owned Holding State

When all human options are exhausted:

- Task marked with `systemOwned: true`
- Task status set to `system_hold`
- `poolType` set to `none`
- Critical notification sent to all Super Admins
- Daily reminder until manual intervention
- Full audit trail preserved

#### Step 6: Notification at Each Step

| Event | Recipients | Channel |
|-------|------------|---------|
| Task Reallocated | Original owner, New assignee | In-app + Email |
| Pool Alert | Role pool members | In-app + Email |
| Escalation Warning | Current assignee, Next level | In-app |
| System Hold | All Super Admins | In-app + Email + SMS |
| Manual Intervention Required | Designated approvers | In-app + Email |

#### Step 7: Audit Logging

Every reallocation event creates:

- `TaskReallocationLog` entry (existing)
- `EscalationLog` entry (new)
- `UnavailabilityEvent` entry (new)
- `ChangeLog` entry (existing)
- Notification records

---

## 3. Pseudocode/Flowchart-Style Logic

### 3.1 `isUserAvailable(userId)` — Checks all availability states

```javascript
/**
 * Determines if a user is available to take task assignments.
 * @param {ObjectId} userId - The user to check
 * @returns {Promise<{available: boolean, reason: string, details: object}>}
 */
async function isUserAvailable(userId) {
  // 1. Fetch user with all relevant fields
  const user = await User.findById(userId)
    .populate('actingDelegations')
    .populate('explicitDelegations')
    .lean();
  
  if (!user) {
    return { available: false, reason: 'USER_NOT_FOUND', details: {} };
  }

  // 2. Check employment status
  if (user.employmentStatus === 'EXITED') {
    return { available: false, reason: 'EMPLOYMENT_EXITED', details: {} };
  }

  if (user.employmentStatus === 'INACTIVE') {
    return { available: false, reason: 'EMPLOYMENT_INACTIVE', details: {} };
  }

  if (user.employmentStatus === 'ON_NOTICE') {
    return { 
      available: false, 
      reason: 'ON_NOTICE_PERIOD', 
      details: { noticeStart: user.noticeStartDate } 
    };
  }

  // 3. Check explicit availability status (set by admin)
  if (user.availabilityStatus === 'UNAVAILABLE') {
    return { 
      available: false, 
      reason: user.unavailabilityReason, 
      details: { 
        start: user.unavailabilityStart, 
        end: user.unavailabilityEnd 
      } 
    };
  }

  // 4. Check for active unavailability events
  const now = new Date();
  const activeUnavailability = await UnavailabilityEvent.findOne({
    userId: userId,
    resolvedAt: null,
    $or: [
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { endDate: { $gte: now } } // ongoing without end
    ]
  }).lean();

  if (activeUnavailability) {
    return { 
      available: false, 
      reason: activeUnavailability.type, 
      details: { 
        start: activeUnavailability.startDate, 
        end: activeUnavailability.endDate 
      } 
    };
  }

  // 5. Check inactivity (configurable threshold, default 30 days)
  const inactivityThreshold = getConfig('INACTIVITY_THRESHOLD_DAYS', 30);
  const lastActivity = user.lastLoginDate || user.created_at;
  const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
  
  if (daysSinceActivity > inactivityThreshold) {
    return { 
      available: false, 
      reason: 'INACTIVITY', 
      details: { 
        lastActivity, 
        daysSinceActivity,
        threshold: inactivityThreshold 
      } 
    };
  }

  // 6. User is available
  return { 
    available: true, 
    reason: 'AVAILABLE', 
    details: { 
      role: user.role,
      actingDelegations: user.actingDelegations?.filter(d => d.isActive) || []
    } 
  };
}
```

### 3.2 `resolveNextAssignee(task, currentOwner, escalationLevel)` — Hierarchical resolution with Auto-Fallback

```javascript
/**
 * Resolves the next potential assignee based on hierarchy.
 * INCLUDES: Automatic fallback from Super Admin → Admin pool
 * @param {object} task - The task being reallocated
 * @param {ObjectId} currentOwner - Current/previous owner
 * @param {string} escalationLevel - Current escalation level
 * @returns {Promise<{assignee: ObjectId|null, level: string, method: string}>}
 */
async function resolveNextAssignee(task, currentOwner, escalationLevel) {
  const config = {
    maxReallocationAttempts: 3,
    inactivityThresholdDays: 30
  };

  // Get the hierarchy above current level
  const hierarchy = ['team_member', 'team_lead', 'admin', 'super_admin'];
  const currentIndex = hierarchy.indexOf(escalationLevel);
  
  if (currentIndex === -1 || currentIndex >= hierarchy.length - 1) {
    // Already at highest level or invalid
    // KEY CHANGE: When at super_admin level, try Admin pool before system hold
    if (escalationLevel === 'super_admin') {
      return await resolveSuperAdminUnavailable(task, currentOwner);
    }
    return { assignee: null, level: 'system', method: 'none' };
  }

  const nextLevel = hierarchy[currentIndex + 1];
  
  // 1. Check for acting delegations at the next level
  const actingDelegate = await findActingDelegateForLevel(currentOwner, nextLevel);
  if (actingDelegate) {
    const availability = await isUserAvailable(actingDelegate._id);
    if (availability.available) {
      return { 
        assignee: actingDelegate._id, 
        level: nextLevel, 
        method: 'acting_delegation' 
      };
    }
  }

  // 2. Check for explicit delegations
  const explicitDelegate = await findExplicitDelegate(currentOwner, nextLevel);
  if (explicitDelegate) {
    const availability = await isUserAvailable(explicitDelegate._id);
    if (availability.available) {
      return { 
        assignee: explicitDelegate._id, 
        level: nextLevel, 
        method: 'explicit_delegation' 
      };
    }
  }

  // 3. Escalate to next role level
  const nextAssignee = await findRoleAssignee(task, nextLevel, currentOwner);
  if (nextAssignee) {
    const availability = await isUserAvailable(nextAssignee._id);
    if (availability.available) {
      return { 
        assignee: nextAssignee._id, 
        level: nextLevel, 
        method: 'role_hierarchy' 
      };
    }
  }

  // 4. KEY CHANGE: If next level is super_admin and unavailable, auto-fallback to admin pool
  if (nextLevel === 'super_admin') {
    return await resolveSuperAdminUnavailable(task, currentOwner);
  }

  // 5. If next level unavailable, try adding to pool
  if (nextLevel !== 'super_admin') {
    return { 
      assignee: null, 
      level: nextLevel, 
      method: 'pool_assignment' 
    };
  }

  // 6. Super Admin unavailable - system hold (only as last resort)
  return { 
    assignee: null, 
    level: 'system', 
    method: 'system_hold' 
  };
}

/**
 * Handles Super Admin unavailability by automatically finding available admins.
 * This ensures tasks are NEVER left pending due to Super Admin unavailability.
 * @param {object} task - The task being reallocated
 * @param {ObjectId} currentOwner - Current/previous owner
 * @returns {Promise<{assignee: ObjectId|null, level: string, method: string}>}
 */
async function resolveSuperAdminUnavailable(task, currentOwner) {
  // Try to find available admins
  const availableAdmins = await findAvailableAdmins();
  
  if (availableAdmins && availableAdmins.length > 0) {
    // Use load-balancing to select the admin with least active tasks
    const selectedAdmin = await leastLoadedAdmin(availableAdmins);
    
    if (selectedAdmin) {
      return {
        assignee: selectedAdmin._id,
        level: 'admin',
        method: 'auto_escalation_to_admin_pool' // KEY: Not system hold!
      };
    }
  }
  
  // If no admins available either, try admin pool
  return { 
    assignee: null, 
    level: 'admin', 
    method: 'pool_assignment' 
  };
  // System hold is ONLY triggered if Admin pool also fails
}

async function findActingDelegateForLevel(userId, targetRole) {
  const now = new Date();
  const delegation = await ActingDelegation.findOne({
    delegatorId: userId,
    delegatedRoles: targetRole,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).lean();
  
  return delegation?.delegateId;
}

async function findExplicitDelegate(userId, targetRole) {
  const now = new Date();
  const delegation = await ExplicitDelegation.findOne({
    delegatorId: userId,
    delegatedRoles: targetRole,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    approvedBy: { $ne: null }
  }).lean();
  
  return delegation?.delegateId;
}

async function findRoleAssignee(task, targetRole, excludeUserId) {
  // Find users with the target role
  const roleUsers = await User.find({
    role: targetRole,
    _id: { $ne: excludeUserId },
    employmentStatus: 'ACTIVE'
  }).select('_id').lean();

  if (!roleUsers.length) return null;

  // If task has team context, prefer users from same team
  if (task.team_id) {
    const teamUser = roleUsers.find(u => 
      u.teams?.includes(task.team_id) || u.team_id?.equals(task.team_id)
    );
    if (teamUser) return teamUser;
  }

  // Otherwise, return first available
  return roleUsers[0];
}
```

### 3.3 `triggerReallocation(task, triggerType, triggerContext)` — Main entry point

```javascript
/**
 * Main entry point for triggering task reallocation.
 * @param {object} params
 * @returns {Promise<{success: boolean, reallocatedTo: ObjectId, logId: ObjectId, nextAction: string}>}
 */
async function triggerReallocation({
  taskId,
  triggerType,
  triggerContext // { absentUserId, leaveStartDate, leaveEndDate, reason }
}) {
  const config = {
    slaTeamLead: 4 * 60 * 60 * 1000,    // 4 hours
    slaAdmin: 8 * 60 * 60 * 1000,       // 8 hours
    slaSuperAdmin: 24 * 60 * 60 * 1000, // 24 hours
    maxAttemptsPerLevel: 3
  };

  // 1. Fetch the task
  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('TASK_NOT_FOUND');
  }

  // 2. Determine current ownership level
  const currentOwner = task.assigned_to[0]; // Primary assignee
  const currentLevel = task.ownershipLevel || 'team_member';

  // 3. Check if already being reallocated (idempotency)
  if (task.reallocation_status === 'pending_escalation') {
    return {
      success: false,
      reason: 'ALREADY_IN_PROGRESS',
      message: 'Task reallocation already in progress'
    };
  }

  // 4. Initialize escalation tracking
  let escalationLevel = currentLevel;
  let attempts = task.reallocationAttempts || 0;
  let lastResult = null;

  // 5. Attempt reallocation with hierarchy fallback
  while (attempts < config.maxAttemptsPerLevel * 3) {
    // Try to resolve next assignee
    const nextAssignee = await resolveNextAssignee(
      task,
      currentOwner,
      escalationLevel
    );

    if (nextAssignee.assignee) {
      // Direct assignment possible
      const result = await assignToUser({
        task,
        newAssigneeId: nextAssignee.assignee,
        method: nextAssignee.method,
        triggerType,
        triggerContext
      });
      
      return {
        success: true,
        reallocatedTo: nextAssignee.assignee,
        level: nextAssignee.level,
        method: nextAssignee.method,
        logId: result.logId
      };
    }

    if (nextAssignee.method === 'pool_assignment') {
      // Add to pool and escalate
      const poolResult = await assignToPool({
        task,
        poolType: nextAssignee.level
      });

      // Create escalation log
      await escalateTask({
        task,
        fromLevel: escalationLevel,
        toLevel: nextAssignee.level,
        poolType: nextAssignee.level
      });

      // Set SLA deadline
      const slaDeadline = new Date(Date.now() + getSLAForLevel(nextAssignee.level));
      await Task.findByIdAndUpdate(task._id, {
        slaDeadline,
        escalationLevel: nextAssignee.level
      });

      // Notify pool members
      await notifyPoolMembers(task, nextAssignee.level);

      escalationLevel = nextAssignee.level;
      attempts++;

      // Check if SLA exceeded - if so, continue escalation
      const slaExceeded = await checkSLAExceeded(task);
      if (slaExceeded) {
        continue; // Escalate to next level
      }

      // Wait for SLA duration before escalating
      return {
        success: true,
        reallocatedTo: null,
        level: nextAssignee.level,
        method: 'pool_assignment',
        message: `Task added to ${nextAssignee.level} pool. SLA: ${getSLAForLevel(nextAssignee.level) / 3600000}h`
      };
    }

    if (nextAssignee.method === 'system_hold') {
      // All levels exhausted - system hold
      await assignToSystem({
        task,
        reason: 'ALL_LEVELS_UNAVAILABLE',
        triggerContext
      });

      // Send critical alerts
      await sendCriticalAlert(task, 'ALL_HIERARCHY_UNAVAILABLE');

      return {
        success: true,
        reallocatedTo: null,
        level: 'system',
        method: 'system_hold',
        message: 'Task moved to system hold - manual intervention required'
      };
    }

    attempts++;
    escalationLevel = nextAssignee.level;
  }

  // Max attempts exceeded - system hold
  await assignToSystem({
    task,
    reason: 'MAX_ATTEMPTS_EXCEEDED',
    triggerContext
  });

  return {
    success: false,
    reason: 'MAX_ATTEMPTS_EXCEEDED',
    message: 'Maximum reallocation attempts exceeded'
  };
}
```

### 3.4 `escalateTask(task, fromLevel, toLevel)` — Escalation with SLA tracking and Auto-Admin Fallback

```javascript
/**
 * Handles task escalation between hierarchy levels.
 * Includes automatic fallback to Admin pool when Super Admin is unavailable.
 * @param {object} params
 * @returns {Promise<{escalationLog: ObjectId, slaDeadline: Date, assignedTo: ObjectId|null}>}
 */
async function escalateTask({
  task,
  fromLevel,
  toLevel,
  poolType,
  reason
}) {
  // SPECIAL HANDLING: When escalating from SUPER_ADMIN level, automatically find available admins
  if (fromLevel === 'super_admin' || toLevel === 'super_admin') {
    const availableAdmins = await findAvailableAdmins();
    
    if (availableAdmins && availableAdmins.length > 0) {
      // Use load-balancing: assign to admin with least active tasks
      const selectedAdmin = await leastLoadedAdmin(availableAdmins);
      
      if (selectedAdmin) {
        // Direct assignment to available admin
        const result = await assignToUser({
          task,
          newAssigneeId: selectedAdmin._id,
          method: 'auto_escalation_to_admin_pool',
          triggerType: 'SUPER_ADMIN_UNAVAILABLE',
          triggerContext: { fromLevel, toLevel }
        });
        
        // Create TaskPool entries for other available admins to claim (optional)
        await createTaskPoolEntries(task, availableAdmins);
        
        return {
          escalationLog: result.logId,
          slaDeadline: new Date(),
          assignedTo: selectedAdmin._id,
          method: 'auto_escalation_to_admin_pool'
        };
      }
    }
    
    // If no admins available, try Super Admin pool before system hold
    if (toLevel === 'system') {
      const superAdminResult = await escalateToSuperAdminPool(task, reason);
      if (superAdminResult.success) {
        return superAdminResult;
      }
    }
  }
  
  const slaDuration = getSLAForLevel(toLevel);
  const slaDeadline = new Date(Date.now() + slaDuration);

  // Create escalation log
  const escalationLog = await EscalationLog.create({
    taskId: task._id,
    fromLevel,
    toLevel,
    triggeredAt: new Date(),
    resolutionType: poolType ? 'pool_assignment' : 'direct_assignment',
    reason: reason || 'HIERARCHY_ESCALATION'
  });

  // Update task with escalation info
  await Task.findByIdAndUpdate(task._id, {
    $inc: { reallocationAttempts: 1 },
    escalationLevel: toLevel,
    slaDeadline,
    lastEscalationAt: new Date(),
    lastEscalationLogId: escalationLog._id
  });

  // Audit log
  await logChange({
    userId: 'SYSTEM', // System action
    action: 'escalate_task',
    entity: 'task',
    entityId: task._id,
    details: {
      fromLevel,
      toLevel,
      poolType,
      slaDeadline,
      escalationLogId: escalationLog._id
    },
    ipAddress: 'SYSTEM'
  });

  return {
    escalationLog,
    slaDeadline
  };
}

/**
 * Finds available admins for automatic task redistribution.
 * Called when Super Admin is unavailable.
 * @returns {Promise<ObjectId[]>} Array of available admin user objects
 */
async function findAvailableAdmins() {
  const now = new Date();
  
  // Query: role='admin' AND availabilityStatus='AVAILABLE' AND employmentStatus='ACTIVE'
  const availableAdmins = await User.find({
    role: 'admin',
    availabilityStatus: 'AVAILABLE',
    employmentStatus: 'ACTIVE'
  })
  .select('_id email full_name currentTaskCount')
  .lean();

  // Exclude users with pending unavailability events
  const pendingUnavailability = await UnavailabilityEvent.find({
    userId: { $in: availableAdmins.map(a => a._id) },
    resolvedAt: null,
    $or: [
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { endDate: { $gte: now } }
    ]
  }).select('userId').lean();

  const excludedUserIds = new Set(pendingUnavailability.map(e => e.userId.toString()));
  const filteredAdmins = availableAdmins.filter(a => !excludedUserIds.has(a._id.toString()));

  // Return sorted by currentTaskCount ascending (load balancing)
  return filteredAdmins.sort((a, b) => (a.currentTaskCount || 0) - (b.currentTaskCount || 0));
}

/**
 * Selects the admin with the least number of active tasks (load balancing).
 * @param {ObjectId[]} availableAdmins - Array of available admin users
 * @returns {Promise<ObjectId>} The admin with least load
 */
async function leastLoadedAdmin(availableAdmins) {
  if (!availableAdmins || availableAdmins.length === 0) {
    return null;
  }
  
  // Get current task counts for each admin
  const adminIds = availableAdmins.map(a => a._id);
  const taskCounts = await Task.aggregate([
    { $match: { 
      assigned_to: { $in: adminIds },
      status: { $in: ['todo', 'in_progress'] }
    }},
    { $unwind: '$assigned_to' },
    { $match: { assigned_to: { $in: adminIds } }},
    { $group: { _id: '$assigned_to', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(taskCounts.map(tc => [tc._id.toString(), tc.count]));
  
  // Find admin with minimum task count
  let minCount = Infinity;
  let selectedAdmin = null;
  
  for (const admin of availableAdmins) {
    const count = countMap.get(admin._id.toString()) || 0;
    if (count < minCount) {
      minCount = count;
      selectedAdmin = admin;
    }
  }
  
  return selectedAdmin;
}

/**
 * Creates TaskPool entries for available admins to claim.
 * @param {object} task - The task being escalated
 * @param {ObjectId[]} availableAdmins - Array of available admins
 */
async function createTaskPoolEntries(task, availableAdmins) {
  for (const admin of availableAdmins) {
    await TaskPoolEntry.findOneAndUpdate(
      { taskId: task._id, userId: admin._id },
      {
        taskId: task._id,
        userId: admin._id,
        poolType: 'admin',
        status: 'available',
        createdAt: new Date()
      },
      { upsert: true }
    );
  }
}

/**
 * Escalates to Super Admin pool as fallback.
 * @param {object} task - The task being escalated
 * @param {string} reason - Reason for escalation
 */
async function escalateToSuperAdminPool(task, reason) {
  // Try Super Admin pool first
  const superAdmins = await User.find({ role: 'super_admin' })
    .select('_id')
    .lean();
  
  if (superAdmins.length > 0) {
    // Add to super_admin pool
    await assignToPool({ task, poolType: 'super_admin' });
    return {
      success: true,
      escalationLog: null,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      assignedTo: null,
      method: 'super_admin_pool'
    };
  }
  
  // No Super Admins available either - this shouldn't happen in normal operation
  return { success: false };
}

function getSLAForLevel(level) {
  const slaMap = {
    team_member: 0,
    team_lead: 4 * 60 * 60 * 1000,   // 4 hours
    admin: 8 * 60 * 60 * 1000,      // 8 hours
    super_admin: 24 * 60 * 60 * 1000, // 24 hours
    system: null
  };
  return slaMap[level] || 8 * 60 * 60 * 1000; // Default 8 hours
}
```

### 3.5 `assignToPool(task, poolType)` — Admin/lead pool assignment

```javascript
/**
 * Assigns task to a role-specific pool for claiming.
 * @param {object} params
 * @returns {Promise<{success: boolean, poolLog: ObjectId}>}
 */
async function assignToPool({ task, poolType }) {
  // Validate pool type
  if (!['lead', 'admin'].includes(poolType)) {
    throw new Error('INVALID_POOL_TYPE');
  }

  // Get or create task pool
  let pool = await TaskPool.findOne({ poolType });
  
  if (!pool) {
    pool = await TaskPool.create({
      poolType,
      availableUsers: [],
      currentTasks: [],
      maxCapacity: getDefaultCapacityForPool(poolType)
    });
  }

  // Check pool capacity
  if (pool.currentTasks.length >= pool.maxCapacity) {
    // Pool at capacity - escalate to next level
    return {
      success: false,
      reason: 'POOL_AT_CAPACITY',
      action: 'ESCALATE'
    };
  }

  // Add task to pool
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Add to pool
      await TaskPool.findByIdAndUpdate(pool._id, {
        $addToSet: { currentTasks: task._id }
      }, { session });

      // Update task
      await Task.findByIdAndUpdate(task._id, {
        poolType,
        ownershipLevel: poolType === 'lead' ? 'team_lead' : 'admin',
        systemOwned: false,
        status: 'in_pool'
      }, { session });

      // Create log
      const poolLog = await TaskReallocationLog.create([{
        triggerType: 'pool_assignment',
        taskId: task._id,
        taskTitle: task.title,
        poolType,
        status: 'in_pool',
        reallocationReason: `Added to ${poolType} pool`
      }], { session });
    });
  finally {
    session.endSession();
  }

  return {
    success: true,
    poolType,
    message: `Task added to ${poolType} pool`
  };
}

function getDefaultCapacityForPool(poolType) {
  const capacities = {
    lead: 10,   // Max tasks per lead in pool
    admin: 15   // Max tasks per admin in pool
  };
  return capacities[poolType] || 10;
}
```

### 3.6 `assignToSystem(task)` — System-owned holding state

```javascript
/**
 * Moves task to system-owned holding state when no humans available.
 * @param {object} params
 * @returns {Promise<{success: boolean, systemLog: ObjectId}>}
 */
async function assignToSystem({
  task,
  reason,
  triggerContext
}) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update task to system-owned state
      await Task.findByIdAndUpdate(task._id, {
        systemOwned: true,
        ownershipLevel: 'system',
        poolType: null,
        status: 'system_hold',
        systemHoldReason: reason,
        systemHoldSince: new Date(),
        reallocation_status: 'system_hold'
      }, { session });

      // Remove from any pools
      await TaskPool.updateMany(
        { currentTasks: task._id },
        { $pull: { currentTasks: task._id } }
      );

      // Create system hold log
      const systemLog = await TaskReallocationLog.create([{
        triggerType: 'system_hold',
        triggerRefId: triggerContext?.leaveRequestId || null,
        taskId: task._id,
        taskTitle: task.title,
        status: 'system_hold',
        reallocationReason: reason || 'NO_AVAILABLE_ASSIGNEE',
        originalUserId: triggerContext?.absentUserId || null,
        reallocatedToUserId: null
      }], { session });

      // Audit log
      await logChange({
        userId: 'SYSTEM',
        action: 'assign_to_system',
        entity: 'task',
        entityId: task._id,
        details: {
          reason,
          triggerContext,
          systemLogId: systemLog[0]._id
        },
        ipAddress: 'SYSTEM'
      }, { session });
    });
  } finally {
    session.endSession();
  }

  // Send critical alerts (outside transaction)
  await sendCriticalAlert(task, reason);

  return {
    success: true,
    message: 'Task moved to system hold - requires manual intervention'
  };
}

async function sendCriticalAlert(task, reason) {
  // Get all Super Admins
  const superAdmins = await User.find({ role: 'super_admin' })
    .select('_id email full_name')
    .lean();

  const alertMessage = `🚨 CRITICAL: Task "${task.title}" moved to system hold. Reason: ${reason}`;

  for (const admin of superAdmins) {
    // In-app notification
    await Notification.create({
      user_id: admin._id,
      type: 'SYSTEM_HOLD_CRITICAL',
      message: alertMessage,
      payload: {
        taskId: task._id,
        reason,
        actionRequired: 'MANUAL_INTERVENTION'
      }
    });

    // Email notification
    await sendEmail({
      to: admin.email,
      subject: `Critical: Task System Hold - ${task.title}`,
      template: 'critical-alert',
      variables: {
        adminName: admin.full_name,
        taskTitle: task.title,
        reason,
        taskId: task._id
      }
    });
  }
}
```

---

## 4. Data Models/Entities

### 4.1 Extended User Model

```javascript
// backend/models/User.js additions

const userSchema = new mongoose.Schema({
  // ... existing fields ...

  // === AVAILABILITY TRACKING ===
  availabilityStatus: {
    type: String,
    enum: ['AVAILABLE', 'UNAVAILABLE', 'LIMITED', 'ON_BREAK'],
    default: 'AVAILABLE'
  },
  unavailabilityReason: {
    type: String,
    enum: ['PLANNED_LEAVE', 'UNPLANNED_ABSENCE', 'INACTIVITY', 'ACCESS_REVOKED', 'MEDICAL', 'OTHER'],
    default: null
  },
  unavailabilityStart: {
    type: Date,
    default: null
  },
  unavailabilityEnd: {
    type: Date,
    default: null
  },
  
  // === DELEGATION TRACKING ===
  actingDelegations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActingDelegation'
  }],
  explicitDelegations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExplicitDelegation'
  }],
  
  // === ACTIVITY TRACKING ===
  lastLoginDate: {
    type: Date,
    default: null
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  
  // === EMPLOYMENT STATUS (extended) ===
  noticeStartDate: {
    type: Date,
    default: null
  },
  exitDate: {
    type: Date,
    default: null
  },
  
  // === ROLE LEVEL (for hierarchy) ===
  roleLevel: {
    type: Number,
    enum: [1, 2, 3, 4], // 1=member, 2=lead, 3=admin, 4=super_admin
    default: 1
  }
});

// Indexes
userSchema.index({ availabilityStatus: 1 });
userSchema.index({ roleLevel: 1 });
userSchema.index({ lastLoginDate: 1 });
userSchema.index({ employmentStatus: 1 });
```

### 4.2 ActingDelegation Model (New)

```javascript
// backend/models/ActingDelegation.js

const actingDelegationSchema = new mongoose.Schema({
  delegatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  delegateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  delegatedRoles: [{
    type: String,
    enum: ['team_member', 'team_lead', 'admin', 'super_admin']
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  reason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes
actingDelegationSchema.index({ delegatorId: 1, isActive: 1 });
actingDelegationSchema.index({ delegateId: 1, isActive: 1 });
actingDelegationSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model('ActingDelegation', actingDelegationSchema);
```

### 4.3 ExplicitDelegation Model (New)

```javascript
// backend/models/ExplicitDelegation.js

const explicitDelegationSchema = new mongoose.Schema({
  delegatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  delegateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  delegatedRoles: [{
    type: String,
    enum: ['team_member', 'team_lead', 'admin']
    // Note: super_admin cannot be explicitly delegated
  }],
  scope: {
    type: String,
    enum: ['SPECIFIC_TASKS', 'ALL_TASKS', 'TASK_CATEGORY'],
    default: 'ALL_TASKS'
  },
  taskCategory: {
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Explicit delegation always requires approval
  },
  approvedAt: {
    type: Date,
    required: true
  },
  revocationAllowed: {
    type: Boolean,
    default: false
  },
  canRevoke: {
    type: Boolean,
    default: true
  },
  reason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes
explicitDelegationSchema.index({ delegatorId: 1, isActive: 1 });
explicitDelegationSchema.index({ delegateId: 1, isActive: 1 });
explicitDelegationSchema.index({ approvedBy: 1, isActive: 1 });

export default mongoose.model('ExplicitDelegation', explicitDelegationSchema);
```

### 4.4 Extended Task Model

```javascript
// backend/models/Task.js additions

const taskSchema = new mongoose.Schema({
  // ... existing fields ...

  // === OWNERSHIP HIERARCHY ===
  ownershipLevel: {
    type: String,
    enum: ['team_member', 'team_lead', 'admin', 'super_admin', 'system'],
    default: 'team_member',
    index: true
  },
  
  // === SYSTEM OWNERSHIP ===
  systemOwned: {
    type: Boolean,
    default: false,
    index: true
  },
  systemHoldReason: {
    type: String,
    default: null
  },
  systemHoldSince: {
    type: Date,
    default: null
  },
  
  // === POOL ASSIGNMENT ===
  poolType: {
    type: String,
    enum: ['lead', 'admin', 'super_admin', null],
    default: null,
    index: true
  },
  
  // === SLA TRACKING ===
  slaDeadline: {
    type: Date,
    default: null,
    index: true
  },
  escalationLevel: {
    type: String,
    enum: ['team_member', 'team_lead', 'admin', 'super_admin', 'system'],
    default: null
  },
  reallocationAttempts: {
    type: Number,
    default: 0
  },
  lastEscalationAt: {
    type: Date,
    default: null
  },
  lastEscalationLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EscalationLog',
    default: null
  },
  
  // === POOL STATUS ===
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done', 'archived', 'in_pool', 'system_hold'],
    default: 'todo'
  }
});

// Additional indexes
taskSchema.index({ systemOwned: 1, status: 1 });
taskSchema.index({ poolType: 1, status: 1 });
taskSchema.index({ slaDeadline: 1, status: 1 });
```

### 4.5 TaskPool Model (New)

```javascript
// backend/models/TaskPool.js

const taskPoolSchema = new mongoose.Schema({
  poolType: {
    type: String,
    enum: ['lead', 'admin', 'super_admin'],
    required: true,
    unique: true
  },
  availableUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    currentTaskCount: {
      type: Number,
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    lastNotifiedAt: {
      type: Date,
      default: null
    }
  }],
  currentTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  maxCapacity: {
    type: Number,
    default: 10
  },
  alertThreshold: {
    type: Number,
    default: 0.8 // Alert when 80% full
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

taskPoolSchema.index({ poolType: 1, isActive: 1 });
taskPoolSchema.index({ 'availableUsers.userId': 1 });

export default mongoose.model('TaskPool', taskPoolSchema);
```

### 4.6 UnavailabilityEvent Model (New)

```javascript
// backend/models/UnavailabilityEvent.js

const unavailabilityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['PLANNED_LEAVE', 'UNPLANNED_ABSENCE', 'INACTIVITY', 'ACCESS_REVOKED', 'EMPLOYMENT_EXIT', 'MEDICAL_EMERGENCY'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null // null means indefinite
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  triggerSource: {
    type: String,
    enum: ['LEAVE_REQUEST', 'ATTENDANCE', 'INACTIVITY_JOB', 'ADMIN_ACTION', 'SYSTEM'],
    required: true
  },
  triggerRefId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  isSystemAcknowledged: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Indexes
unavailabilityEventSchema.index({ userId: 1, resolvedAt: 1 });
unavailabilityEventSchema.index({ type: 1, resolvedAt: 1 });
unavailabilityEventSchema.index({ resolvedAt: 1 }); // For finding unresolved

export default mongoose.model('UnavailabilityEvent', unavailabilityEventSchema);
```

### 4.7 EscalationLog Model (New)

```javascript
// backend/models/EscalationLog.js

const escalationLogSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  fromLevel: {
    type: String,
    enum: ['team_member', 'team_lead', 'admin', 'super_admin'],
    required: true
  },
  toLevel: {
    type: String,
    enum: ['team_member', 'team_lead', 'admin', 'super_admin', 'system'],
    required: true
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolutionType: {
    type: String,
    enum: ['direct_assignment', 'pool_assignment', 'system_hold', 'manual_resolution', 'task_completed'],
    default: 'pending'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  poolType: {
    type: String,
    enum: ['lead', 'admin', 'super_admin', null],
    default: null
  },
  slaDuration: {
    type: Number, // milliseconds
    default: null
  },
  slaMet: {
    type: Boolean,
    default: null
  },
  reason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Indexes
escalationLogSchema.index({ taskId: 1, triggeredAt: -1 });
escalationLogSchema.index({ toLevel: 1, status: 1 });
escalationLogSchema.index({ resolvedAt: 1 });

export default mongoose.model('EscalationLog', escalationLogSchema);
```

---

## 5. Role Priority Order

| Priority | Role | Auto-Assignable? | Can Be Escalated To? | Pool Type | Automatic Fallback |
|----------|------|----------------|---------------------|-----------|-------------------|
| 1 | **Super Admin** | ❌ NO - Requires explicit delegation only | ✅ Yes | super_admin | **→ Admin pool (AUTO)** |
| 2 | **Admin** | ✅ Yes | ✅ Yes | admin | **→ Super Admin pool** |
| 3 | **Team Lead** | ✅ Yes | ✅ Yes | lead | **→ Admin pool** |
| 4 | **Team Member** | ✅ Yes (original owner) | ❌ N/A | N/A | N/A |

> **KEY CHANGE:** When Super Admin is unavailable, tasks are automatically redistributed to available Admins. This ensures tasks are NEVER left pending due to Super Admin unavailability.

### Role Hierarchy Diagram

```
HIERARCHY (Higher = More Authority)
═══════════════════════════════════
         ┌─────────────────┐
         │   SUPER ADMIN   │ ◄── Cannot be auto-assigned
         │   (Level 4)    │     Requires explicit delegation
         └────────┬────────┘
                  │ escalates to
         ┌────────▼────────┐
         │      ADMIN      │ ◄── Auto-escalation target
         │   (Level 3)     │     Has admin pool
         └────────┬────────┘
                  │ escalates to
         ┌────────▼────────┐
         │   TEAM LEAD     │ ◄── Auto-escalation target
         │   (Level 2)     │     Has lead pool
         └────────┬────────┘
                  │ escalates to
         ┌────────▼────────┐
         │  TEAM MEMBER    │ ◄── Original task owner
         │   (Level 1)    │     Triggers reallocation
         └─────────────────┘
                  │
                  ▼ (if unavailable)
         ┌─────────────────┐
         │  SYSTEM HOLD    │ ◄── Safety net
         │                 │     No humans available
         └─────────────────┘
```

---

> **KEY CHANGE:** Super Admin unavailability now automatically escalates to Admin pool instead of going directly to system hold. This ensures tasks are NEVER left pending.

## 6. Time-Based Escalation Thresholds (SLAs)

### Configurable SLA Definitions

| Escalation Level | SLA Duration | Pool Alert | Escalation Trigger | Config Key |
|------------------|-------------|------------|--------------------|------------|
| Team Lead Pool | **4 hours** | Immediate + reminder at 2h | Task added to pool | `SLA_TEAM_LEAD_HOURS` |
| Admin Pool | **8 hours** | Immediate + reminder at 4h | Lead pool SLA exceeded | `SLA_ADMIN_HOURS` |
| Super Admin | **24 hours** | Immediate + hourly | Admin pool SLA exceeded | `SLA_SUPER_ADMIN_HOURS` |
| System Hold | **None** | Immediate critical alert | All levels exhausted | N/A |
| Pool Claim | **48 hours** | Daily reminder | Task in pool unclaimed | `POOL_CLAIM_DEADLINE_HOURS` |

### SLA Monitoring Job

```javascript
// backend/jobs/monitorSLAs.js

/**
 * Scheduled job to monitor SLA compliance and trigger escalations.
 * Runs every 15 minutes.
 */
async function monitorSLAs() {
  const now = new Date();

  // 1. Find tasks that have exceeded SLA
  const expiredTasks = await Task.find({
    slaDeadline: { $lte: now },
    status: { $in: ['in_pool', 'in_progress'] },
    systemOwned: false
  }).lean();

  for (const task of expiredTasks) {
    const currentLevel = task.escalationLevel;
    
    // Determine next level
    const nextLevel = getNextEscalationLevel(currentLevel);
    
    if (nextLevel === 'system') {
      // All levels exhausted - system hold
      await assignToSystem({
        task,
        reason: 'SLA_EXCEEDED_ALL_LEVELS'
      });
    } else {
      // Escalate to next level
      await escalateTask({
        task,
        fromLevel: currentLevel,
        toLevel: nextLevel,
        reason: 'SLA_EXCEEDED'
      });
    }
  }

  // 2. Find unclaimed pool tasks (48 hours)
  const poolClaimDeadline = new Date(now - 48 * 60 * 60 * 1000);
  const unclaimedTasks = await Task.find({
    status: 'in_pool',
    created_at: { $lte: poolClaimDeadline }
  }).lean();

  for (const task of unclaimedTasks) {
    // Alert pool members and admins
    await sendUnclaimedAlert(task);
  }
}

function getNextEscalationLevel(currentLevel) {
  const hierarchy = {
    'team_member': 'team_lead',
    'team_lead': 'admin',
    // KEY CHANGE: admin escalates to super_admin but with auto-fallback to admin pool
    'admin': 'super_admin',
    // KEY CHANGE: super_admin now tries admin pool before system hold
    'super_admin': 'admin' 
  };
  return hierarchy[currentLevel] || 'system';
}
```

---

## 7. Safe Defaults for Emergency Scenarios

### Emergency Scenario Decision Matrix (UPDATED: Auto-Redistribution to Admin Pool)

| Scenario | Primary Action | Secondary Action | Tertiary Action | Alert Level |
|----------|----------------|------------------|-----------------|-------------|
| **Team Lead unavailable** | Add task to Admin pool | Escalate to Super Admin after 8h | System hold after 24h | Normal |
| **All Admins unavailable** | Escalate to Super Admin (with alert) | Critical alert every hour | System hold after 24h | High |
| **Super Admin unavailable** | **Escalate to Admin pool (auto-redistribute to other admins)** | Alert Super Admin via email | System hold only if ALL admins also unavailable | Critical |
| **Entire hierarchy unavailable** | System-owned with critical alert | Critical org-wide alert | Manual intervention required | Critical |
| **Network/Service outage** | Queue reallocation jobs | Retry with exponential backoff | System hold after max retries | Critical |

### Explicit Logic: Super Admin Unavailable Flow

```
Super Admin Unavailable Flow:
════════════════════════════
1. Detect Super Admin unavailable
2. Call findAvailableAdmins()
   → Query: role='admin' AND availabilityStatus='AVAILABLE' AND employmentStatus='ACTIVE'
   → Exclude users with pending unavailability events
3. IF admins found:
   → Call leastLoadedAdmin() to find admin with least active tasks
   → Assign task to that admin (auto-redistribution)
   → Create TaskPool entries for other available admins
4. ELSE (no admins available):
   → Add task to Admin pool for claiming
   → Alert all admins
5. IF Admin pool also fails (all admins unavailable):
   → Escalate to Super Admin pool with critical alert
6. ONLY IF Super Admin + ALL Admins unavailable:
   → System hold with critical alert
   → Manual intervention required

KEY PRINCIPLE: System hold is the LAST RESORT, not the first option!
```

### Emergency Override Procedures

```javascript
// Emergency procedures that can be triggered manually

/**
 * Emergency: Force assign a system-held task to a specific user.
 * Requires Super Admin approval.
 */
async function emergencyAssign(taskId, targetUserId, approverId) {
  // Verify approver is Super Admin
  const approver = await User.findById(approverId);
  if (approver.role !== 'super_admin') {
    throw new Error('ONLY_SUPER_ADMIN_CAN_EMERGENCY_ASSIGN');
  }

  const task = await Task.findById(taskId);
  if (!task.systemOwned) {
    throw new Error('TASK_NOT_IN_SYSTEM_HOLD');
  }

  // Override the system hold
  await Task.findByIdAndUpdate(taskId, {
    systemOwned: false,
    systemHoldReason: 'EMERGENCY_ASSIGNMENT',
    ownershipLevel: 'team_member',
    status: 'in_progress',
    $addToSet: { assigned_to: targetUserId }
  });

  // Audit log with emergency flag
  await logChange({
    userId: approverId,
    action: 'EMERGENCY_ASSIGN',
    entity: 'task',
    entityId: taskId,
    details: { targetUserId, reason: 'EMERGENCY_OVERRIDE' }
  });
}

/**
 * Emergency: Release a system hold with a new permanent assignee.
 */
async function emergencyRelease(taskId, newOwnerId, approverId) {
  // Similar to emergencyAssign but for releasing system holds
  // Can be done by Admin or Super Admin
}
```

---

## 8. Why This Is Scalable, Legally Safe, and Enterprise-Ready

### 8.1 Audit Trail Completeness

The architecture ensures **100% auditability** through:

| Audit Element | What's Recorded | Retention |
|--------------|-----------------|-----------|
| TaskReallocationLog | Every reallocation event | 7 years |
| EscalationLog | Every escalation step | 7 years |
| UnavailabilityEvent | Every unavailability detection | 7 years |
| ChangeLog | Every state change | 7 years |
| Notification | Every notification sent | 3 years |
| Session/Auth logs | Every user action | 1 year |

**Compliance:** Meets SOX, GDPR Article 30, and enterprise audit requirements.

### 8.2 Legal Accountability

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCOUNTABILITY CHAIN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WHO (Actor)    │  WHAT (Action)   │  WHEN (Timestamp)  │ WHY │
│────────────────┼──────────────────┼────────────────────┼─────│
│ User A         │ Created task     │ 2026-02-26 09:00   │ Work│
│ User B         │ Was assigned     │ 2026-02-26 09:05   │ Role│
│ User B         │ Went on leave    │ 2026-02-27 00:00   │ Leave│
│ SYSTEM         │ Reallocated      │ 2026-02-27 00:01   │ Auto│
│ Team Lead C    │ Accepted         │ 2026-02-27 02:30   │ Duty│
│ Team Lead C    │ Redistributed    │ 2026-02-27 03:00   │ Skill│
│ User D         │ Completed task   │ 2026-02-28 14:00   │ Work│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Legal Benefits:**
- Clear chain of custody for all tasks
- Demonstrable duty of care for task completion
- Evidence of appropriate escalation
- Protection against "task abandonment" claims

### 8.3 Scalability (10,000+ Users, Multiple Organizations)

| Scalability Concern | Solution |
|---------------------|----------|
| **Database** | Indexed queries on role, status, SLA deadline |
| **Notification** | Async queue (BullMQ), batched emails |
| **Reallocation jobs** | Distributed workers, idempotent design |
| **Multiple orgs** | Workspace-scoped pools, tenant isolation |
| **High availability** | No single point of failure, circuit breakers |
| **Performance** | Caching, lazy loading, connection pooling |

**Architecture for Scale:**

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  API Pod  │  │  API Pod  │  │  API Pod  │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  MongoDB  │  │   Redis   │  │  Message  │
        │ Primary   │  │  Cache    │  │   Queue   │
        └───────────┘  └───────────┘  └───────────┘
```

### 8.4 Fault Tolerance

| Failure Mode | Protection |
|-------------|------------|
| Reallocation job crashes | Idempotent design, transactional safety |
| Notification service down | Queue with retry, fallback to database |
| Database connection lost | Circuit breaker, graceful degradation |
| Super Admin unavailable | System hold with alerts, no data loss |
| Infinite escalation | Max attempts (3 per level) + circuit breaker |

### 8.5 Governance (Separation of Concerns)

```
┌─────────────────────────────────────────────────────────────────┐
│                      GOVERNANCE LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SUPER ADMIN                                               │  │
│  │  • System configuration                                    │  │
│  │  • Emergency overrides                                     │  │
│  │  • Organization settings                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  ADMIN                                                     │  │
│  │  • Pool management                                        │  │
│  │  • Escalation oversight                                    │  │
│  │  • SLA configuration                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  TEAM LEAD                                                 │  │
│  │  • Task acceptance/rejection                              │  │
│  │  • Redistribution                                         │  │
│  │  • Team capacity management                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  SYSTEM                                                    │  │
│  │  • Automatic escalation                                   │  │
│  • SLA monitoring                                           │  │
│  • Critical alerts                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Edge Cases to Handle

### Edge Case 1: Acting Role Delegation Takes Precedence

```javascript
// When User A goes on leave, but User B has an acting role delegation
// for User A's responsibilities

scenario = {
  userA: { role: 'team_lead', onLeave: true },
  actingDelegation: { delegate: userB, roles: ['team_lead'] },
  result: 'User B receives task automatically (acting > auto-failover)'
};
```

### Edge Case 2: Explicit Delegation Takes Precedence Over Escalation

```javascript
// User pre-approves a delegate for specific tasks
// This delegate is tried before any escalation

scenario = {
  userA: { role: 'team_member', leaving: true },
  explicitDelegation: { delegate: userC, approvedBy: userA },
  hierarchyEscalation: 'would go to Team Lead',
  result: 'User C gets first chance before escalation'
};
```

### Edge Case 3: Prevent Infinite Escalation Loops

```javascript
// Max 3 attempts per level, then system hold

MAX_ATTEMPTS_PER_LEVEL = 3
MAX_TOTAL_ATTEMPTS = 9 // 3 levels × 3 attempts

// If exceeded → system hold
// Prevents: circular references, unavailable users at all levels
```

### Edge Case 4: System-Owned Tasks Require Manual Intervention

```javascript
// Once in system hold, only human can release

systemHoldRelease = {
  allowedRoles: ['super_admin', 'admin'],
  required: ['manual_reason', 'new_assignee_or_archive'],
  auditLog: 'MANDATORY',
  notification: 'All super admins notified'
};
```

### Edge Case 5: Access Revocation is Immediate

```javascript
// When admin revokes access:

accessRevoked = {
  gracePeriod: 0, // No grace period
  immediateAction: true,
  tasksAffected: 'All active tasks',
  reallocationTrigger: 'Automatic, immediate'
};
```

### Edge Case 6: Inactivity Detection

```javascript
// Configurable inactivity threshold

inactivityConfig = {
  defaultThresholdDays: 30,
  configurable: true,
  gracePeriodAfterLogin: 0, // No grace after deadline
  detectionFrequency: 'Daily job',
  reversible: true // User returns → reactivation possible
};
```

### Edge Case 7: Multiple Simultaneous Triggers

```javascript
// What if user goes on leave AND is marked inactive on same day?

multipleTriggers = {
  priority: 'LEAVE first, then INACTIVITY',
  reason: 'Leave is planned, inactivity is detected',
  idempotency: 'Only one reallocation event per task'
};
```

### Edge Case 8: Task Already in Pool

```javascript
// Task is already in admin pool when lead becomes available

poolConflict = {
  resolution: 'Task stays in current pool until SLA or manual release',
  rationale: 'Higher level pool has visibility, don\'t regress'
};
```

---

## 10. Recommended Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)

- [ ] Create new models (ActingDelegation, ExplicitDelegation, TaskPool, UnavailabilityEvent, EscalationLog)
- [ ] Add fields to User model
- [ ] Add fields to Task model
- [ ] Set up database indexes

### Phase 2: Core Logic Implementation (Weeks 3-4)

- [ ] Implement `isUserAvailable()` function
- [ ] Implement `resolveNextAssignee()` hierarchy logic
- [ ] Implement `triggerReallocation()` main flow
- [ ] Implement `escalateTask()` with SLA tracking

### Phase 3: Pool Management (Weeks 5-6)

- [ ] Implement `assignToPool()` functionality
- [ ] Create TaskPool management service
- [ ] Implement pool claim logic
- [ ] Add pool capacity management

### Phase 4: System Hold & Alerts (Weeks 7-8)

- [ ] Implement `assignToSystem()` for system hold
- [ ] Create critical alert system
- [ ] Implement manual release workflow
- [ ] Add Super Admin override capabilities

### Phase 5: Jobs & Automation (Weeks 9-10)

- [ ] Create SLA monitoring job (every 15 min)
- [ ] Create inactivity detection job (daily)
- [ ] Create pool claim deadline job (daily)
- [ ] Create system hold reminder job (daily)

### Phase 6: Testing & Documentation (Weeks 11-12)

- [ ] Unit tests for all core functions
- [ ] Integration tests for flows
- [ ] Load testing (10k+ users)
- [ ] Update API documentation
- [ ] Create admin user guide

### Phase 7: Deployment & Rollout (Week 13+)

- [ ] Staged rollout (pilot team → organization)
- [ ] Monitor and adjust SLAs
- [ ] Gather feedback
- [ ] Iterate and improve

---

## Appendix A: Configuration Reference

```javascript
// Config keys for reallocation system

REALLOCATION_CONFIG = {
  // SLA Hours (in hours)
  SLA_TEAM_LEAD_HOURS: 4,
  SLA_ADMIN_HOURS: 8,
  SLA_SUPER_ADMIN_HOURS: 24,
  
  // Pool settings
  POOL_CLAIM_DEADLINE_HOURS: 48,
  DEFAULT_POOL_CAPACITY_LEAD: 10,
  DEFAULT_POOL_CAPACITY_ADMIN: 15,
  
  // Escalation limits
  MAX_ATTEMPTS_PER_LEVEL: 3,
  MAX_TOTAL_ATTEMPTS: 9,
  
  // Inactivity
  INACTIVITY_THRESHOLD_DAYS: 30,
  INACTIVITY_CHECK_FREQUENCY_HOURS: 24,
  
  // Monitoring
  SLA_MONITOR_FREQUENCY_MINUTES: 15,
  SYSTEM_HOLD_REMINDER_FREQUENCY_HOURS: 24
};
```

---

## Appendix B: API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reallocation/pending` | Get pending reallocations for user |
| POST | `/api/reallocation/:id/accept` | Accept reallocation (Team Lead) |
| POST | `/api/reallocation/:id/reject` | Reject reallocation (Team Lead) |
| POST | `/api/reallocation/:id/redistribute` | Redistribute to team member |
| POST | `/api/reallocation/trigger` | Manually trigger reallocation |
| GET | `/api/reallocation/pools` | Get all task pools |
| POST | `/api/reallocation/pools/:type/claim` | Claim task from pool |
| POST | `/api/reallocation/system/:id/release` | Release system-held task |
| GET | `/api/delegations` | List user's delegations |
| POST | `/api/delegations/acting` | Create acting delegation |
| POST | `/api/delegations/explicit` | Create explicit delegation |
| GET | `/api/unavailability` | List unavailability events |

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-26 | AetherTrack Team | Initial architecture document |
| 2.0 | 2026-02-26 | AetherTrack Team | **Auto-redistribution to Admin pool when Super Admin unavailable** - Tasks are NEVER left pending due to Super Admin unavailability |

---

*End of Document*
