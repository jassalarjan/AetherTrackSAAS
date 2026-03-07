# Folder Structure Reference — AetherTrack SaaS
> Version: 2.0

---

```
frontend/src/
│
├── app/
│   ├── config/
│   ├── layouts/
│   ├── pages/
│   │   └── NotFound.jsx
│   ├── providers/
│   │   ├── AppProviders.jsx       ← Single provider composition root
│   │   └── ThemeProvider.jsx
│   └── routes/
│       ├── ProtectedRoute.jsx
│       └── index.js
│
├── features/
│   │
│   ├── auth/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── VerifyEmail.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── services/
│   │   │   ├── tokenStore.js
│   │   │   └── secureTokenStorage.js
│   │   └── index.js               ← Feature public API
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── ActivityFeed.jsx
│   │   │   ├── KPICard.jsx
│   │   │   ├── AIInsight.jsx
│   │   │   └── AISuggestion.jsx
│   │   ├── pages/
│   │   │   └── Workspace.jsx
│   │   └── index.js
│   │
│   ├── tasks/
│   │   ├── components/
│   │   │   ├── TaskCard.jsx
│   │   │   ├── CommandPalette.jsx
│   │   │   └── ShortcutsOverlay.jsx
│   │   ├── hooks/
│   │   │   ├── useDragAndDrop.js
│   │   │   └── useInlineEdit.js
│   │   ├── pages/
│   │   │   ├── Tasks.jsx
│   │   │   └── Kanban.jsx
│   │   └── index.js
│   │
│   ├── projects/
│   │   ├── components/
│   │   │   ├── ProjectLabel.jsx
│   │   │   └── SprintLabel.jsx
│   │   ├── pages/
│   │   │   ├── ProjectDashboard.jsx
│   │   │   ├── MyProjects.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   ├── ProjectGantt.jsx
│   │   │   ├── SprintManagement.jsx
│   │   │   ├── ResourceWorkload.jsx
│   │   │   └── ReallocationDashboard.jsx
│   │   ├── services/
│   │   │   └── projectsApi.js
│   │   ├── utils/
│   │   │   ├── calendarEngine.js
│   │   │   ├── ganttNormalization.js
│   │   │   └── ganttDebugger.jsx
│   │   └── index.js
│   │
│   ├── hr/
│   │   ├── components/
│   │   │   ├── AttendanceReviewModal.jsx
│   │   │   ├── LocationCapture.jsx
│   │   │   ├── PhotoCapture.jsx
│   │   │   └── MapView.jsx
│   │   ├── hooks/
│   │   │   ├── useShifts.js
│   │   │   └── useVerification.js
│   │   ├── pages/
│   │   │   ├── HRDashboard.jsx
│   │   │   ├── AttendancePage.jsx
│   │   │   ├── SelfAttendance.jsx
│   │   │   ├── HRCalendar.jsx
│   │   │   ├── LeavesPage.jsx
│   │   │   ├── EmailCenter.jsx
│   │   │   ├── VerificationSettings.jsx
│   │   │   └── GeofenceManagement.jsx
│   │   ├── services/
│   │   │   ├── attendanceApi.js
│   │   │   └── geofenceApi.js
│   │   └── index.js
│   │
│   ├── notifications/
│   │   ├── components/
│   │   │   ├── NotificationPrompt.jsx
│   │   │   └── NotificationSettings.jsx
│   │   ├── hooks/
│   │   │   ├── useNotifications.js
│   │   │   └── usePushNotifications.js
│   │   ├── pages/
│   │   │   └── Notifications.jsx
│   │   ├── services/
│   │   │   └── notificationService.js
│   │   └── index.js
│   │
│   ├── workspace/
│   │   ├── context/
│   │   │   └── SidebarContext.jsx
│   │   ├── pages/
│   │   │   ├── Teams.jsx
│   │   │   └── UserManagement.jsx
│   │   └── index.js
│   │
│   ├── analytics/
│   │   ├── pages/
│   │   │   └── Analytics.jsx
│   │   ├── services/
│   │   │   ├── reportGenerator.js
│   │   │   └── comprehensiveReportGenerator.js
│   │   ├── utils/
│   │   │   └── mockDataGenerator.js
│   │   └── index.js
│   │
│   ├── settings/
│   │   ├── components/
│   │   │   └── SessionSettings.jsx
│   │   ├── pages/
│   │   │   └── Settings.jsx
│   │   └── index.js
│   │
│   ├── admin/
│   │   ├── pages/
│   │   │   ├── AuditLog.jsx
│   │   │   ├── ChangeLog.jsx
│   │   │   ├── FeatureMatrix.jsx
│   │   │   └── ScreenshotDemo.jsx
│   │   └── index.js
│   │
│   ├── calendar/
│   │   ├── pages/
│   │   │   └── Calendar.jsx
│   │   └── index.js
│   │
│   └── landing/
│       ├── components/
│       │   ├── ConversionFooter.jsx
│       │   ├── HeroSection.jsx
│       │   ├── LandingNav.jsx
│       │   ├── Philosophy.jsx
│       │   ├── PricingComparison.jsx
│       │   ├── ProductExperience.jsx
│       │   └── TrustArchitecture.jsx
│       ├── utils/
│       │   └── landingUtils.js
│       └── index.js
│
├── shared/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.jsx
│   │   │   ├── GlobalSidebar.jsx
│   │   │   ├── LatestCommentPreview.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TeamLabel.jsx
│   │   │   └── index.js
│   │   ├── responsive/
│   │   │   ├── ResponsiveCard.jsx
│   │   │   ├── ResponsiveGrid.jsx
│   │   │   ├── ResponsiveModal.jsx
│   │   │   ├── ResponsivePageLayout.jsx
│   │   │   └── index.js
│   │   └── ui/
│   │       ├── Avatar.jsx
│   │       ├── Button.jsx
│   │       ├── ConfirmModal.jsx
│   │       ├── DataTable.jsx
│   │       ├── Dialog.jsx
│   │       ├── Drawer.jsx
│   │       ├── InlineEdit.jsx
│   │       ├── Input.jsx
│   │       ├── MeetingDetailPanel.jsx
│   │       ├── MeetingFormModal.jsx
│   │       ├── Popover.jsx
│   │       ├── ProgressBar.jsx
│   │       ├── Spinner.jsx
│   │       ├── ThemeToggle.jsx
│   │       ├── Toast.jsx
│   │       └── index.js
│   ├── constants/
│   │   └── pages.json
│   ├── hooks/
│   │   ├── useActivityTracker.js
│   │   ├── useAppAutoUpdate.js
│   │   ├── useClickOutside.js
│   │   ├── useConfirmModal.js
│   │   ├── useDebounce.js
│   │   ├── useKeyboardShortcuts.js
│   │   ├── useMeetings.js
│   │   ├── useMobileCapabilities.js
│   │   ├── useMobileFileUpload.js
│   │   ├── useOptimisticUpdate.js
│   │   ├── usePageShortcuts.js
│   │   ├── useRealtimePresence.js
│   │   ├── useRealtimeSync.js
│   │   └── index.js
│   ├── services/
│   │   ├── autoUpdate.js
│   │   ├── axios.js
│   │   ├── mobileSocketManager.js
│   │   └── index.js
│   ├── types/
│   └── utils/
│       ├── cn.js
│       ├── dateNormalization.js
│       └── index.js
│
├── styles/
│   ├── aethertrack-reference.css
│   ├── animations.css
│   ├── design-tokens.css
│   ├── index.css
│   ├── mobile-responsive.css
│   ├── tokens.css
│   └── ui-system.css
│
├── App.jsx          ← Route definitions
└── main.jsx         ← React entry point
```
