**AetherTrack SAAS**

Sidebar Navigation --- Revised Specification

Version 2.0 · March 2026 · Status: For Review

*Supersedes v1.0 --- Workflow-Aligned Architecture*

**WHY THIS REVISION EXISTS**

The v1.0 specification was structurally sound in principle but failed at the workflow layer. The goal-based sections (Today, My Work, My Team...) described where items should live, not how users actually move through their day. Navigation that maps to org-chart thinking rather than task flow creates the same confusion it was designed to solve --- just with better labels.

> **Core Problem:** A user\'s day is not divided into \'My Work\' then \'My Team\' then \'Operations.\' It is a continuous loop of context-switches driven by incoming signals: a Slack ping, a blocked task, an approval request. The sidebar must mirror that reality, not paper over it.

This revision reorients around three principles:

-   Signal-first layout --- the sidebar surfaces what demands attention before the user has to look for it.

-   Workflow-contiguous grouping --- items that appear in sequence during a real task sit adjacent in the UI.

-   Role as context, not filter --- different roles see different depth, not just different lists.

**1. Diagnosis: Where v1.0 Navigation Logic Breaks Down**

**1.1 Sections Map to Org Structure, Not Task Flow**

\'My Work\' and \'My Team\' imply clean ownership. In practice, a Team Lead\'s tasks and their team\'s tasks are entangled. Approving a leave request is not \'My Team\' work --- it is a time-sensitive action that blocks a real person. Burying it two sections away from \'Today\' means it gets discovered late.

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **v1.0 Assumption**                                         **Actual User Behaviour**                                          **Consequence**
  ----------------------------------------------------------- ------------------------------------------------------------------ --------------------------------------------------------------------
  User completes \'My Work\' before attending to team needs   Approvals and team alerts arrive continuously throughout the day   Approval queue grows silently; user discovers backlog too late

  \'Today\' section clears by mid-morning                     Time-sensitive items arrive across all hours                       Users return to \'Today\' repeatedly, increasing nav distance

  Sections represent mental modes users switch into           Users respond to signals, not sections                             Cognitive mismatch --- users ignore section labels, hunt for items

  HR ops and Insights are separate use cases                  HR reviews a report then immediately acts on it                    Forces unnecessary navigation between two distant sections
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**1.2 Live Signals Are Decorative, Not Structural**

v1.0 adds badge counts to menu items but treats them as a visual flourish. The real insight --- that pending signals should determine item order and prominence, not static configuration --- was missed. A menu item with 0 pending items should collapse or deprioritise automatically; one with critical blockers should visually escalate without the user hunting for it.

> **Missed Opportunity:** Live signals should drive sidebar behaviour, not just annotate it. The sidebar should reorder, expand, and highlight itself based on what is actually happening right now.

**1.3 Language Improvements Were Applied But Workflow Was Not**

Renaming \'Leave Management\' to \'Request / Approve Leave\' is good. But placing it under \'My Work\' for employees and \'Operations\' for HR means two roles who collaborate on the same action navigate to completely different places. This is a workflow continuity failure. The label change masks the structural problem without fixing it.

**1.4 Removed Items Need a Better Discovery Model**

Gantt Chart, Email Center, Audit Logs and Export Tools were removed from primary nav and sent to \'contextual panels.\' That is correct in principle, but the spec does not define how users discover them --- no search affordance, no in-context trigger, no breadcrumb. For users who relied on those items, removal without discovery creates abandonment.

**REVISED ARCHITECTURE**

**2. Revised Navigation Architecture**

*The revised structure replaces static sections with a Signal-Action-Context model: what demands attention, what the user can do about it, and what supporting context they need.*

**2.1 Model Overview**

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Layer**        **Purpose**                                     **User Question Answered**                   **Behaviour**
  ---------------- ----------------------------------------------- -------------------------------------------- -------------------------------------------------------------
  Signal Rail      Live, prioritised alerts and pending actions    What needs me right now?                     Dynamic --- items appear/disappear based on real-time state

  Action Hub       Primary workflow actions for the user\'s role   What am I here to do?                        Semi-static --- role-configured, frequency-sorted

  Context Drawer   Supporting views, reports, settings             What do I need to understand or configure?   Stable --- low-frequency access, collapsible
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**2.2 Signal Rail --- Replacing the \'Today\' Section**

The Signal Rail sits at the top of the sidebar and is entirely dynamic. It does not contain static items. It surfaces only items that exist right now and demand a response. When nothing is pending, it collapses to a single \'All clear\' state --- reducing visual noise and communicating system status positively.

  ----------------------------------------------------------------------------------------------------------------
  **Signal Type**      **Trigger**                       **Visual Treatment**       **Auto-Clears When**
  -------------------- --------------------------------- -------------------------- ------------------------------
  Pending Approval     Approval queue \> 0               Accent badge + item row    Queue reaches 0

  Blocked Task         Task status = blocked             Critical icon + item row   Task unblocked or reassigned

  Late Check-In        Past check-in window, no record   Warning row (self only)    Check-in recorded

  Unread HR Review     Review assigned, unread           Count badge + item row     Review opened

  Shift Conflict       Detected scheduling overlap       Warning row                Conflict resolved

  Team Member Absent   Absence affecting active tasks    Info row (leads only)      Coverage confirmed
  ----------------------------------------------------------------------------------------------------------------

> **Design Rule:** A user should be able to process every signal in the Signal Rail without leaving the sidebar context. Each signal row expands inline or opens a focused modal --- never redirects to a distant page.

**2.3 Action Hub --- Replacing Role Menu Items**

The Action Hub contains the 4--6 primary actions a user performs daily. Unlike v1.0 which grouped by ownership (My Work, My Team), the Action Hub groups by workflow phase: Start, Do, Review. This mirrors how work actually progresses through a day.

  ------------------------------------------------------------------------------------------------------------
  **Phase**   **Purpose**                          **Example Actions**
  ----------- ------------------------------------ -----------------------------------------------------------
  Start       Actions that open or initiate work   Check In, Create Task, Start Sprint, Submit Leave Request

  Do          Active work management               My Tasks, Work Board, Team Tasks, Current Projects

  Review      Validation and decision-making       Approve Requests, Review Schedule, Performance, Reports
  ------------------------------------------------------------------------------------------------------------

This grouping means that a Team Lead who checks in, works through tasks, then approves requests moves top-to-bottom through the Action Hub --- one linear flow, not three disconnected sections.

**2.4 Context Drawer --- Structured Discovery for Removed Items**

Items removed from primary nav in v1.0 are housed in the Context Drawer with a consistent discovery mechanism. The drawer is accessible via a persistent \'More\' control at the base of the sidebar. Items within it are grouped by function and searchable.

  --------------------------------------------------------------------------------------------------------------
  **Drawer Group**   **Items**                            **Access Pattern**
  ------------------ ------------------------------------ ------------------------------------------------------
  Timeline           Gantt Chart, Sprint Timeline         Surfaced contextually when a project is active

  Capacity           Resources, Shift Config              Available to leads and above; linked from team views

  Compliance         Audit Logs, Activity Reports         Admin and HR only; requires confirmation click

  Communication      Email Center, Announcements          Replaced by in-app notification layer for most flows

  Settings           Preferences, Integrations, Billing   Accessible globally from user avatar menu
  --------------------------------------------------------------------------------------------------------------

**ROLE-SPECIFIC SPECIFICATIONS**

**3. Role-Specific Navigation Specifications**

*Each role specification below lists Signal Rail triggers, Action Hub items by phase, and Context Drawer access level. The maximum item count applies to the Action Hub only --- signals are additive and capped separately at 5 concurrent items.*

**3.1 Employee / Member**

*Members need frictionless entry into work and clear visibility of personal obligations. No team oversight required.*

  ---------------------------------------------------------------------------------------------------------
  **Section**   **Menu Item**           **Trigger Condition**                   **Signal**
  ------------- ----------------------- --------------------------------------- ---------------------------
  Signal Rail   Late Check-In Warning   Past check-in window, no record found   Clears on check-in

  Signal Rail   Task Due Today          1+ tasks due within current day         Clears as tasks completed

  Start         Check In / Out          Always shown during work hours          ---

  Do            My Tasks                Always shown                            Active task count

  Do            Work Board              Always shown                            ---

  Review        My Schedule             Always shown                            Next shift date

  Review        Leave Status            Shown when request pending              Request state badge
  ---------------------------------------------------------------------------------------------------------

**3.2 Team Lead**

*Team Leads live in a constant loop between personal delivery and team unblocking. The Start→Do→Review flow must surface team signals before personal tasks --- leads are blockers for others.*

  -----------------------------------------------------------------------------------------------------------------
  **Section**   **Menu Item**           **Trigger Condition**                **Signal**
  ------------- ----------------------- ------------------------------------ --------------------------------------
  Signal Rail   Pending Approvals       Approval queue \> 0                  Count badge; clears to 0

  Signal Rail   Blocked Team Tasks      Any task status = blocked            Critical icon; clears when resolved

  Signal Rail   Late Check-Ins (Team)   Team member past window, no record   Info badge; clears on their check-in

  Start         Check In / Out          Shown during work hours              ---

  Do            My Tasks                Always shown                         Personal task count

  Do            Team Tasks              Always shown                         Blocked count (highlighted if \> 0)

  Do            Work Board              Always shown                         ---

  Review        Approve Requests        Always shown                         Pending count

  Review        Team Schedule           Always shown                         Conflicts highlighted
  -----------------------------------------------------------------------------------------------------------------

**3.3 HR**

*HR workflows span initiation and completion of the same process --- a leave request goes from submission to approval to attendance record in one cognitive arc. Items must reflect that continuity.*

  -------------------------------------------------------------------------------------------------------------
  **Section**   **Menu Item**           **Trigger Condition**               **Signal**
  ------------- ----------------------- ----------------------------------- -----------------------------------
  Signal Rail   Pending Leave Reviews   Leave request awaiting HR action    Count badge; clears on action

  Signal Rail   Pending HR Reviews      Performance/compliance review due   Count badge; clears on completion

  Start         People Overview         Always shown                        Active headcount

  Do            Manage Attendance       Always shown                        Exceptions count

  Do            Manage Leaves           Always shown                        Pending count

  Do            Manage Shifts           Always shown                        Conflicts badge

  Review        HR Reports              Always shown                        ---

  Review        Approve Requests        Always shown                        Pending count
  -------------------------------------------------------------------------------------------------------------

**3.4 Admin**

*Admins monitor system health and respond to operational failures. Signal Rail is their primary work surface --- they should rarely need to navigate away from it for critical items.*

  ------------------------------------------------------------------------------------------------------
  **Section**   **Menu Item**           **Trigger Condition**               **Signal**
  ------------- ----------------------- ----------------------------------- ----------------------------
  Signal Rail   Active System Alerts    Alert severity ≥ warning            Critical icon; count badge

  Signal Rail   Pending User Requests   User onboarding or access request   Count badge

  Start         Operations Dashboard    Always shown                        Alert count

  Do            Manage Workspaces       Always shown                        ---

  Do            Manage People           Always shown                        Pending onboarding count

  Do            System Settings         Always shown                        ---

  Review        Business Analytics      Always shown                        ---
  ------------------------------------------------------------------------------------------------------

**3.5 Community Admin**

*Community Admins have a narrow but critical scope: member lifecycle and community health. Simplicity is paramount.*

  ----------------------------------------------------------------------------------------------------------------
  **Section**   **Menu Item**             **Trigger Condition**                              **Signal**
  ------------- ------------------------- -------------------------------------------------- ---------------------
  Signal Rail   Pending Member Requests   Membership application or access request pending   Count badge

  Start         Community Overview        Always shown                                       Active member count

  Do            Community Members         Always shown                                       Pending count

  Do            Manage Community          Always shown                                       ---

  Review        Community Reports         Always shown                                       ---
  ----------------------------------------------------------------------------------------------------------------

**WORKFLOW CONTINUITY**

**4. Workflow Continuity Patterns**

*These patterns define how the sidebar behaves during the most common cross-role task sequences. Each pattern must complete without a navigation dead-end.*

**4.1 Leave Request Lifecycle**

  -----------------------------------------------------------------------------------------------------------------------------------------
  **Step**              **Actor**   **Sidebar Entry Point**                               **Expected Next State**
  --------------------- ----------- ----------------------------------------------------- -------------------------------------------------
  1\. Submit Request    Employee    Start → Check In/Out area → Request Leave CTA         Signal Rail shows \'Leave Pending\' to employee

  2\. Signal Raised     Team Lead   Signal Rail → Pending Approvals (auto-surfaced)       Lead reviews and approves inline

  3\. HR Notification   HR          Signal Rail → Pending Leave Reviews (auto-surfaced)   HR records attendance impact

  4\. Confirmation      Employee    Review → Leave Status (state updates to Approved)     Signal clears; status badge updates
  -----------------------------------------------------------------------------------------------------------------------------------------

> **Key Fix vs v1.0:** In v1.0, Step 2 required the Team Lead to navigate to \'My Team → Approve Requests\' --- two clicks away from wherever they were. In v2.0 the signal auto-surfaces in the Signal Rail; one tap.

**4.2 Task Escalation and Reassignment**

  ----------------------------------------------------------------------------------------------------------------------------------------
  **Step**            **Actor**   **Sidebar Entry Point**                            **Expected Next State**
  ------------------- ----------- -------------------------------------------------- -----------------------------------------------------
  1\. Task blocked    Member      Signal Rail → Blocked Task (auto-surfaced)         Member flags blocker; Signal raised for lead

  2\. Lead notified   Team Lead   Signal Rail → Blocked Team Tasks (critical icon)   Lead taps to reassign inline or navigate to task

  3\. Reassignment    Team Lead   Do → Team Tasks (contextual action)                Task status updates; signals clear for both parties
  ----------------------------------------------------------------------------------------------------------------------------------------

**4.3 New Employee Onboarding**

  -------------------------------------------------------------------------------------------------------------------------------
  **Step**             **Actor**   **Sidebar Entry Point**                                       **Expected Next State**
  -------------------- ----------- ------------------------------------------------------------- --------------------------------
  1\. User created     Admin       Signal Rail → Pending User Requests                           Admin provisions access inline

  2\. Shift assigned   HR          Do → Manage Shifts                                            HR assigns to team schedule

  3\. First check-in   Employee    Signal Rail → Late Check-In (if missed) or Start → Check In   Record created; signal clears
  -------------------------------------------------------------------------------------------------------------------------------

**SIGNAL ARCHITECTURE**

**5. Signal Architecture --- Technical Requirements**

**5.1 Signal Priority Ordering**

When multiple signals are active simultaneously, the Signal Rail renders them in priority order. Maximum 5 signals shown; additional signals collapse into an overflow control.

  --------------------------------------------------------------------------------------------------------------------------
  **Priority**      **Signal Type**                              **Visual Treatment**        **Max Concurrent**
  ----------------- -------------------------------------------- --------------------------- -------------------------------
  P0 --- Critical   System alerts, blocked tasks with no owner   Red background row + icon   3

  P1 --- High       Pending approvals, unread reviews            Accent badge + row          5

  P2 --- Medium     Late check-ins, schedule conflicts           Warning icon + row          5

  P3 --- Info       Team absences, task due today                Muted row                   5 (collapsed if P0/P1 active)
  --------------------------------------------------------------------------------------------------------------------------

**5.2 Delivery Requirements**

-   Real-time updates via WebSocket connection for P0 and P1 signals.

-   30-second polling fallback for P2 and P3 signals.

-   Signal state persists across page refreshes via server-side state --- no reliance on localStorage.

-   Signals must be dismissible by the user; dismissal is logged and does not delete the underlying record.

-   Signal count caps: no role sees more than 5 concurrent signal rows. Overflow shows \'+N more\' with count.

**5.3 Signal-Action Inline Patterns**

Signals that require a single decision (approve/reject, acknowledge, check-in) must resolve inline from the Signal Rail without full-page navigation. Only actions requiring multi-step forms or detailed context should navigate away.

  -------------------------------------------------------------------------------------------------------------
  **Signal**             **Inline Action Available**     **When Full Navigation Required**
  ---------------------- ------------------------------- ------------------------------------------------------
  Pending Approval       Approve / Reject with comment   When approver needs to review linked task detail

  Late Check-In (team)   Send reminder inline            Never --- reminder only, no further action needed

  Blocked Task           Reassign to dropdown            When lead wants to view full task before reassigning

  Pending Leave Review   Approve / Request Info          When HR needs to review attendance history first
  -------------------------------------------------------------------------------------------------------------

**OPEN QUESTIONS FOR STAKEHOLDER REVIEW**

**6. Open Questions --- Decisions Required Before Implementation**

> **Q1:** Should the Signal Rail be role-scoped or support cross-role delegation? For example: if a Team Lead is out, should their pending approvals surface to their manager? This has UX, permissions, and data model implications.
>
> **Q2:** The Context Drawer \'Compliance\' group requires a confirmation click to access Audit Logs. Is this sufficient for your security posture, or does it require a separate auth step (e.g., password re-entry)?
>
> **Q3:** AI-powered predictive suggestions (v1.0 Section 8) are architecturally sound but were not validated by user research. Recommend piloting with one role (suggested: Team Lead) before system-wide rollout. Agree?
>
> **Q4:** v1.0 projected Year 1 ROI of 1,220% on a 100-user org. This figure should be stress-tested against your actual user base size and avg. hourly cost before being used in stakeholder presentations.

**IMPLEMENTATION DELTA**

**7. What Changes from v1.0 to v2.0**

  --------------------------------------------------------------------------------------------------------------------------------------------------------
  **Component**          **v1.0 Approach**                        **v2.0 Approach**                           **Effort Delta**
  ---------------------- ---------------------------------------- ------------------------------------------- --------------------------------------------
  Navigation structure   5 static goal-based sections             3-layer Signal-Action-Context model         +1 sprint

  Today section          Static items with badge counts           Dynamic Signal Rail (appears/disappears)    +2 sprints for signal engine

  Section grouping       My Work / My Team / Operations           Start / Do / Review phases                  Refactor only --- same data, new structure

  Removed items          Moved to contextual panels (undefined)   Context Drawer with search and grouping     +1 sprint for drawer component

  Inline actions         Not specified                            P0/P1 signals resolve inline                +1.5 sprints for inline action modals

  AI suggestions         Phase 3 (Weeks 9--12)                    Pilot with Team Lead only; validate first   Scope reduced --- saves 1 sprint
  --------------------------------------------------------------------------------------------------------------------------------------------------------

Net implementation effort change from v1.0: approximately +3 sprints for the signal engine and inline actions, offset by --1 sprint from reducing AI scope. Total revised estimate: 19 weeks vs 16 weeks. Additional time is concentrated in infrastructure (signal engine, WebSocket reliability) which has compounding value beyond the sidebar.

**8. Revised Success Metrics**

  ------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Metric**                           **v1.0 Target**   **v2.0 Target**                                                  **Measurement Method**
  ------------------------------------ ----------------- ---------------------------------------------------------------- ------------------------------------
  Approval response time (Team Lead)   Not measured      \< 2 hours from signal creation                                  Signal creation → action timestamp

  Signal-to-action rate                Not defined       \> 80% of signals actioned without page nav                      Event tracking

  Navigation error rate                12% → 3%          \< 2% (fewer paths = fewer wrong turns)                          Error tracking

  Time to primary task                 45s → 15s         \< 10s for signal-driven tasks                                   Session analytics

  Context Drawer discovery             Not defined       \> 60% of power users discover contextual items within 2 weeks   Usage analytics

  User satisfaction (nav)              3.2 → 4.5/5       \> 4.5/5                                                         Quarterly survey
  ------------------------------------------------------------------------------------------------------------------------------------------------------------

**9. Document Approval**

  ------------------------------------------------------------------------
  **Role**           **Name**          **Decision**      **Date**
  ------------------ ----------------- ----------------- -----------------
  Product Owner                                          

  UX Lead                                                

  Engineering Lead                                       

  Stakeholder                                            
  ------------------------------------------------------------------------

*This document supersedes AetherTrack Sidebar Redesign Specification v1.0 dated March 2026.*