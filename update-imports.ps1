# =========================================================================
# AetherTrack – Import Path Updater
# Updates all JS/JSX files in src/ to use @/ aliases after restructuring
# =========================================================================
$S = "c:\Users\jassa_5gbrlvp\Documents\01_Projects\AetherTrackSAAS\frontend\src"

# Each entry: @(regex-fragment-for-old-path, new-alias-path)
# The regex fragment must match the path after any number of ../ segments
$replacements = @(
  # ── Auth ─────────────────────────────────────────────────────────────
  @("context/AuthContext",              "@/features/auth/context/AuthContext"),
  @("api/tokenStore",                   "@/features/auth/services/tokenStore"),
  @("utils/secureTokenStorage",         "@/features/auth/services/secureTokenStorage"),
  @("routes/ProtectedRoute",            "@/app/routes/ProtectedRoute"),
  @("pages/Login",                      "@/features/auth/pages/Login"),
  @("pages/VerifyEmail",                "@/features/auth/pages/VerifyEmail"),
  @("pages/ForgotPassword",             "@/features/auth/pages/ForgotPassword"),
  @("pages/ResetPassword",              "@/features/auth/pages/ResetPassword"),

  # ── Dashboard ─────────────────────────────────────────────────────────
  @("pages/Workspace",                  "@/features/dashboard/pages/Workspace"),
  @("components/ActivityFeed",          "@/features/dashboard/components/ActivityFeed"),
  @("components/KPICard",               "@/features/dashboard/components/KPICard"),
  @("components/AIInsight",             "@/features/dashboard/components/AIInsight"),
  @("components/AISuggestion",          "@/features/dashboard/components/AISuggestion"),

  # ── Tasks ─────────────────────────────────────────────────────────────
  @("pages/Tasks",                      "@/features/tasks/pages/Tasks"),
  @("pages/Kanban",                     "@/features/tasks/pages/Kanban"),
  @("components/TaskCard",              "@/features/tasks/components/TaskCard"),
  @("components/CommandPalette",        "@/features/tasks/components/CommandPalette"),
  @("components/ShortcutsOverlay",      "@/features/tasks/components/ShortcutsOverlay"),
  @("hooks/useDragAndDrop",             "@/features/tasks/hooks/useDragAndDrop"),
  @("hooks/useInlineEdit",              "@/features/tasks/hooks/useInlineEdit"),

  # ── Projects ──────────────────────────────────────────────────────────
  @("pages/ProjectDashboard",           "@/features/projects/pages/ProjectDashboard"),
  @("pages/MyProjects",                 "@/features/projects/pages/MyProjects"),
  @("pages/ProjectDetail",              "@/features/projects/pages/ProjectDetail"),
  @("pages/ProjectGantt",               "@/features/projects/pages/ProjectGantt"),
  @("pages/SprintManagement",           "@/features/projects/pages/SprintManagement"),
  @("pages/ResourceWorkload",           "@/features/projects/pages/ResourceWorkload"),
  @("pages/ReallocationDashboard",      "@/features/projects/pages/ReallocationDashboard"),
  @("components/ProjectLabel",          "@/features/projects/components/ProjectLabel"),
  @("components/SprintLabel",           "@/features/projects/components/SprintLabel"),
  @("api/projectsApi",                  "@/features/projects/services/projectsApi"),
  @("utils/calendarEngine",             "@/features/projects/utils/calendarEngine"),
  @("utils/ganttNormalization",         "@/features/projects/utils/ganttNormalization"),
  @("utils/ganttDebugger",              "@/features/projects/utils/ganttDebugger"),

  # ── HR ────────────────────────────────────────────────────────────────
  @("pages/HRDashboard",                "@/features/hr/pages/HRDashboard"),
  @("pages/AttendancePage",             "@/features/hr/pages/AttendancePage"),
  @("pages/SelfAttendance",             "@/features/hr/pages/SelfAttendance"),
  @("pages/HRCalendar",                 "@/features/hr/pages/HRCalendar"),
  @("pages/LeavesPage",                 "@/features/hr/pages/LeavesPage"),
  @("pages/EmailCenter",                "@/features/hr/pages/EmailCenter"),
  @("pages/VerificationSettings",       "@/features/hr/pages/VerificationSettings"),
  @("pages/GeofenceManagement",         "@/features/hr/pages/GeofenceManagement"),
  @("components/AttendanceReviewModal", "@/features/hr/components/AttendanceReviewModal"),
  @("components/LocationCapture",       "@/features/hr/components/LocationCapture"),
  @("components/PhotoCapture",          "@/features/hr/components/PhotoCapture"),
  @("components/MapView",               "@/features/hr/components/MapView"),
  @("api/attendanceApi",                "@/features/hr/services/attendanceApi"),
  @("api/geofenceApi",                  "@/features/hr/services/geofenceApi"),
  @("hooks/useShifts",                  "@/features/hr/hooks/useShifts"),
  @("hooks/useVerification",            "@/features/hr/hooks/useVerification"),

  # ── Notifications ─────────────────────────────────────────────────────
  @("pages/Notifications",                 "@/features/notifications/pages/Notifications"),
  @("components/NotificationPrompt",       "@/features/notifications/components/NotificationPrompt"),
  @("components/NotificationSettings",     "@/features/notifications/components/NotificationSettings"),
  @("hooks/useNotifications",              "@/features/notifications/hooks/useNotifications"),
  @("hooks/usePushNotifications",          "@/features/notifications/hooks/usePushNotifications"),
  @("utils/notificationService",           "@/features/notifications/services/notificationService"),

  # ── Workspace ─────────────────────────────────────────────────────────
  @("pages/Teams",                      "@/features/workspace/pages/Teams"),
  @("pages/UserManagement",             "@/features/workspace/pages/UserManagement"),
  @("context/SidebarContext",           "@/features/workspace/context/SidebarContext"),

  # ── Analytics ─────────────────────────────────────────────────────────
  @("pages/Analytics",                           "@/features/analytics/pages/Analytics"),
  @("utils/reportGenerator",                     "@/features/analytics/services/reportGenerator"),
  @("utils/comprehensiveReportGenerator",        "@/features/analytics/services/comprehensiveReportGenerator"),
  @("utils/mockDataGenerator",                   "@/features/analytics/utils/mockDataGenerator"),

  # ── Settings ──────────────────────────────────────────────────────────
  @("pages/Settings",                    "@/features/settings/pages/Settings"),
  @("components/SessionSettings",        "@/features/settings/components/SessionSettings"),

  # ── Admin ─────────────────────────────────────────────────────────────
  @("pages/AuditLog",                    "@/features/admin/pages/AuditLog"),
  @("pages/ChangeLog",                   "@/features/admin/pages/ChangeLog"),
  @("pages/FeatureMatrix",               "@/features/admin/pages/FeatureMatrix"),

  # ── Calendar ──────────────────────────────────────────────────────────
  @("pages/Calendar",                    "@/features/calendar/pages/Calendar"),

  # ── Landing ───────────────────────────────────────────────────────────
  @("components/landing/ConversionFooter",  "@/features/landing/components/ConversionFooter"),
  @("components/landing/HeroSection",       "@/features/landing/components/HeroSection"),
  @("components/landing/LandingNav",        "@/features/landing/components/LandingNav"),
  @("components/landing/Philosophy",        "@/features/landing/components/Philosophy"),
  @("components/landing/PricingComparison", "@/features/landing/components/PricingComparison"),
  @("components/landing/ProductExperience", "@/features/landing/components/ProductExperience"),
  @("components/landing/TrustArchitecture", "@/features/landing/components/TrustArchitecture"),
  @("utils/landingUtils",                   "@/features/landing/utils/landingUtils"),

  # ── Shared UI ─────────────────────────────────────────────────────────
  @("components/Avatar",              "@/shared/components/ui/Avatar"),
  @("components/Button",              "@/shared/components/ui/Button"),
  @("components/Dialog",              "@/shared/components/ui/Dialog"),
  @("components/Drawer",              "@/shared/components/ui/Drawer"),
  @("components/Input",               "@/shared/components/ui/Input"),
  @("components/Popover",             "@/shared/components/ui/Popover"),
  @("components/ProgressBar",         "@/shared/components/ui/ProgressBar"),
  @("components/Spinner",             "@/shared/components/ui/Spinner"),
  @("components/Toast",               "@/shared/components/ui/Toast"),
  @("components/DataTable",           "@/shared/components/ui/DataTable"),
  @("components/InlineEdit",          "@/shared/components/ui/InlineEdit"),
  @("components/ThemeToggle",         "@/shared/components/ui/ThemeToggle"),
  @("components/modals/ConfirmModal",       "@/shared/components/ui/ConfirmModal"),
  @("components/modals/MeetingDetailPanel", "@/shared/components/ui/MeetingDetailPanel"),
  @("components/modals/MeetingFormModal",   "@/shared/components/ui/MeetingFormModal"),

  # ── Shared layout ─────────────────────────────────────────────────────
  @("components/Navbar",                  "@/shared/components/layout/Navbar"),
  @("components/AppHeader",               "@/shared/components/layout/AppHeader"),
  @("components/GlobalSidebar",           "@/shared/components/layout/GlobalSidebar"),
  @("components/Sidebar",                 "@/shared/components/layout/Sidebar"),
  @("components/TeamLabel",               "@/shared/components/layout/TeamLabel"),
  @("components/LatestCommentPreview",    "@/shared/components/layout/LatestCommentPreview"),

  # ── Shared responsive (index.js barrel) ──────────────────────────────
  @("components/layouts",                 "@/shared/components/responsive"),
  @("components/layouts/ResponsiveCard",  "@/shared/components/responsive/ResponsiveCard"),
  @("components/layouts/ResponsiveGrid",  "@/shared/components/responsive/ResponsiveGrid"),
  @("components/layouts/ResponsiveModal", "@/shared/components/responsive/ResponsiveModal"),
  @("components/layouts/ResponsivePageLayout", "@/shared/components/responsive/ResponsivePageLayout"),

  # ── Shared hooks ──────────────────────────────────────────────────────
  @("hooks/useConfirmModal",        "@/shared/hooks/useConfirmModal"),
  @("hooks/useKeyboardShortcuts",   "@/shared/hooks/useKeyboardShortcuts"),
  @("hooks/useOptimisticUpdate",    "@/shared/hooks/useOptimisticUpdate"),
  @("hooks/usePageShortcuts",       "@/shared/hooks/usePageShortcuts"),
  @("hooks/useActivityTracker",     "@/shared/hooks/useActivityTracker"),
  @("hooks/useMobileCapabilities",  "@/shared/hooks/useMobileCapabilities"),
  @("hooks/useMobileFileUpload",    "@/shared/hooks/useMobileFileUpload"),
  @("hooks/useAppAutoUpdate",       "@/shared/hooks/useAppAutoUpdate"),
  @("hooks/useMeetings",            "@/shared/hooks/useMeetings"),
  @("hooks/useRealtimePresence",    "@/shared/hooks/useRealtimePresence"),
  @("hooks/useRealtimeSync",        "@/shared/hooks/useRealtimeSync"),
  @("utils/useClickOutside",        "@/shared/hooks/useClickOutside"),
  @("utils/useDebounce",            "@/shared/hooks/useDebounce"),

  # ── Shared services ───────────────────────────────────────────────────
  @("api/axios",                    "@/shared/services/axios"),
  @("utils/mobileSocketManager",    "@/shared/services/mobileSocketManager"),
  @("utils/autoUpdate",             "@/shared/services/autoUpdate"),

  # ── Shared utils ──────────────────────────────────────────────────────
  @("utils/cn",                     "@/shared/utils/cn"),
  @("utils/dateNormalization",      "@/shared/utils/dateNormalization"),

  # ── App providers ─────────────────────────────────────────────────────
  @("context/ThemeContext",         "@/app/providers/ThemeProvider"),

  # ── Styles ────────────────────────────────────────────────────────────
  @("./index.css",                  "@/styles/index.css"),
  @("./animations.css",             "@/styles/animations.css"),
  @("./mobile-responsive.css",      "@/styles/mobile-responsive.css")
)

# Get ALL .js and .jsx files in the new feature/shared/app structure
# Also include App.jsx and main.jsx at the src root
$files = Get-ChildItem -Path $S -Recurse -Include "*.js","*.jsx" | Where-Object {
  $_.FullName -notlike "*node_modules*" -and
  $_.FullName -notlike "*dist*" -and
  $_.FullName -notlike "*dev-dist*"
}

$totalFiles = $files.Count
$changed = 0

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw -Encoding UTF8
  $original = $content

  foreach ($r in $replacements) {
    $oldFrag = $r[0]
    $newPath = $r[1]

    # Match: from '...any relative prefix.../oldFrag' (with or without extension, with or without quotes style)
    # Handles both: '../../../context/AuthContext' and './context/AuthContext'
    $escapedFrag = [regex]::Escape($oldFrag)
    # Replace in static imports: from "...path..."
    $pattern = "(['""])(?:\.\.?\/)+$escapedFrag(?:\.jsx?)?(['""])"
    $replacement = "`${1}$newPath`${2}"
    $content = [regex]::Replace($content, $pattern, $replacement)

    # Replace in dynamic imports: import('...path...')
    $dynPattern = "\((['""])(?:\.\.?\/)+$escapedFrag(?:\.jsx?)?(['""])\)"
    $dynReplacement = "(`${1}$newPath`${2})"
    $content = [regex]::Replace($content, $dynPattern, $dynReplacement)
  }

  if ($content -ne $original) {
    Set-Content $file.FullName $content -Encoding UTF8 -NoNewline
    $changed++
  }
}

Write-Host "Import update complete. Files scanned: $totalFiles | Files updated: $changed"
