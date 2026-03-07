# =========================================================================
# AetherTrack – Feature-Based Architecture Migration Script
# =========================================================================
param([switch]$DryRun)
$S = "c:\Users\jassa_5gbrlvp\Documents\01_Projects\AetherTrackSAAS\frontend\src"
$log = @()
$errors = @()

function Move-FileToTarget($from, $to) {
  $src  = "$S\$from"
  $dest = "$S\$to"
  if (-not (Test-Path $src)) {
    $script:errors += "MISSING: $from"
    return
  }
  $dir = Split-Path $dest
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory $dir -Force | Out-Null }
  if (-not $DryRun) { Copy-Item $src $dest -Force }
  $script:log += "MOVE  $from → $to"
}

# ── 1. Create directory skeleton ──────────────────────────────────────────
$dirs = @(
  "app\routes","app\providers","app\layouts","app\config",

  "features\auth\pages","features\auth\context","features\auth\services","features\auth\components",
  "features\dashboard\pages","features\dashboard\components",
  "features\tasks\pages","features\tasks\components","features\tasks\hooks",
  "features\projects\pages","features\projects\components","features\projects\services","features\projects\utils",
  "features\hr\pages","features\hr\components","features\hr\services","features\hr\hooks",
  "features\notifications\pages","features\notifications\components",
  "features\notifications\hooks","features\notifications\services",
  "features\workspace\pages","features\workspace\context",
  "features\analytics\pages","features\analytics\services","features\analytics\utils",
  "features\settings\pages","features\settings\components",
  "features\admin\pages",
  "features\calendar\pages",
  "features\landing\components","features\landing\utils",

  "shared\components\ui","shared\components\layout","shared\components\responsive",
  "shared\hooks","shared\services","shared\utils","shared\constants","shared\types",
  "styles"
)
foreach ($d in $dirs) {
  if (-not $DryRun) { New-Item -ItemType Directory -Path "$S\$d" -Force | Out-Null }
  $log += "MKDIR $d"
}
Write-Host "Directories ready."

# ── 2. File move map ──────────────────────────────────────────────────────
$moves = @(
  # AUTH
  @("pages\Login.jsx",                  "features\auth\pages\Login.jsx"),
  @("pages\VerifyEmail.jsx",            "features\auth\pages\VerifyEmail.jsx"),
  @("pages\ForgotPassword.jsx",         "features\auth\pages\ForgotPassword.jsx"),
  @("pages\ResetPassword.jsx",          "features\auth\pages\ResetPassword.jsx"),
  @("context\AuthContext.jsx",          "features\auth\context\AuthContext.jsx"),
  @("api\tokenStore.js",                "features\auth\services\tokenStore.js"),
  @("utils\secureTokenStorage.js",      "features\auth\services\secureTokenStorage.js"),
  @("routes\ProtectedRoute.jsx",        "app\routes\ProtectedRoute.jsx"),

  # DASHBOARD
  @("pages\Workspace.jsx",              "features\dashboard\pages\Workspace.jsx"),
  @("components\ActivityFeed.jsx",      "features\dashboard\components\ActivityFeed.jsx"),
  @("components\KPICard.jsx",           "features\dashboard\components\KPICard.jsx"),
  @("components\AIInsight.jsx",         "features\dashboard\components\AIInsight.jsx"),
  @("components\AISuggestion.jsx",      "features\dashboard\components\AISuggestion.jsx"),

  # TASKS
  @("pages\Tasks.jsx",                  "features\tasks\pages\Tasks.jsx"),
  @("pages\Kanban.jsx",                 "features\tasks\pages\Kanban.jsx"),
  @("components\TaskCard.jsx",          "features\tasks\components\TaskCard.jsx"),
  @("components\CommandPalette.jsx",    "features\tasks\components\CommandPalette.jsx"),
  @("components\ShortcutsOverlay.jsx",  "features\tasks\components\ShortcutsOverlay.jsx"),
  @("hooks\useDragAndDrop.js",          "features\tasks\hooks\useDragAndDrop.js"),
  @("hooks\useInlineEdit.js",           "features\tasks\hooks\useInlineEdit.js"),

  # PROJECTS
  @("pages\ProjectDashboard.jsx",       "features\projects\pages\ProjectDashboard.jsx"),
  @("pages\MyProjects.jsx",             "features\projects\pages\MyProjects.jsx"),
  @("pages\ProjectDetail.jsx",          "features\projects\pages\ProjectDetail.jsx"),
  @("pages\ProjectGantt.jsx",           "features\projects\pages\ProjectGantt.jsx"),
  @("pages\SprintManagement.jsx",       "features\projects\pages\SprintManagement.jsx"),
  @("pages\ResourceWorkload.jsx",       "features\projects\pages\ResourceWorkload.jsx"),
  @("pages\ReallocationDashboard.jsx",  "features\projects\pages\ReallocationDashboard.jsx"),
  @("components\ProjectLabel.jsx",      "features\projects\components\ProjectLabel.jsx"),
  @("components\SprintLabel.jsx",       "features\projects\components\SprintLabel.jsx"),
  @("api\projectsApi.js",               "features\projects\services\projectsApi.js"),
  @("utils\calendarEngine.js",          "features\projects\utils\calendarEngine.js"),
  @("utils\ganttNormalization.js",      "features\projects\utils\ganttNormalization.js"),
  @("utils\ganttDebugger.jsx",          "features\projects\utils\ganttDebugger.jsx"),

  # HR
  @("pages\HRDashboard.jsx",            "features\hr\pages\HRDashboard.jsx"),
  @("pages\AttendancePage.jsx",         "features\hr\pages\AttendancePage.jsx"),
  @("pages\SelfAttendance.jsx",         "features\hr\pages\SelfAttendance.jsx"),
  @("pages\HRCalendar.jsx",             "features\hr\pages\HRCalendar.jsx"),
  @("pages\LeavesPage.jsx",             "features\hr\pages\LeavesPage.jsx"),
  @("pages\EmailCenter.jsx",            "features\hr\pages\EmailCenter.jsx"),
  @("pages\VerificationSettings.jsx",   "features\hr\pages\VerificationSettings.jsx"),
  @("pages\GeofenceManagement.jsx",     "features\hr\pages\GeofenceManagement.jsx"),
  @("components\AttendanceReviewModal.jsx","features\hr\components\AttendanceReviewModal.jsx"),
  @("components\LocationCapture.jsx",   "features\hr\components\LocationCapture.jsx"),
  @("components\PhotoCapture.jsx",      "features\hr\components\PhotoCapture.jsx"),
  @("components\MapView.jsx",           "features\hr\components\MapView.jsx"),
  @("api\attendanceApi.js",             "features\hr\services\attendanceApi.js"),
  @("api\geofenceApi.js",               "features\hr\services\geofenceApi.js"),
  @("hooks\useShifts.js",               "features\hr\hooks\useShifts.js"),
  @("hooks\useVerification.js",         "features\hr\hooks\useVerification.js"),

  # NOTIFICATIONS
  @("pages\Notifications.jsx",              "features\notifications\pages\Notifications.jsx"),
  @("components\NotificationPrompt.jsx",    "features\notifications\components\NotificationPrompt.jsx"),
  @("components\NotificationSettings.jsx",  "features\notifications\components\NotificationSettings.jsx"),
  @("hooks\useNotifications.js",            "features\notifications\hooks\useNotifications.js"),
  @("hooks\usePushNotifications.js",        "features\notifications\hooks\usePushNotifications.js"),
  @("utils\notificationService.js",         "features\notifications\services\notificationService.js"),

  # WORKSPACE
  @("pages\Teams.jsx",                  "features\workspace\pages\Teams.jsx"),
  @("pages\UserManagement.jsx",         "features\workspace\pages\UserManagement.jsx"),
  @("context\SidebarContext.jsx",       "features\workspace\context\SidebarContext.jsx"),

  # ANALYTICS
  @("pages\Analytics.jsx",                        "features\analytics\pages\Analytics.jsx"),
  @("utils\reportGenerator.js",                   "features\analytics\services\reportGenerator.js"),
  @("utils\comprehensiveReportGenerator.js",       "features\analytics\services\comprehensiveReportGenerator.js"),
  @("utils\mockDataGenerator.js",                  "features\analytics\utils\mockDataGenerator.js"),

  # SETTINGS
  @("pages\Settings.jsx",               "features\settings\pages\Settings.jsx"),
  @("components\SessionSettings.jsx",   "features\settings\components\SessionSettings.jsx"),

  # ADMIN
  @("pages\AuditLog.jsx",               "features\admin\pages\AuditLog.jsx"),
  @("pages\ChangeLog.jsx",              "features\admin\pages\ChangeLog.jsx"),
  @("pages\FeatureMatrix.jsx",          "features\admin\pages\FeatureMatrix.jsx"),

  # CALENDAR
  @("pages\Calendar.jsx",               "features\calendar\pages\Calendar.jsx"),

  # LANDING
  @("components\landing\ConversionFooter.jsx", "features\landing\components\ConversionFooter.jsx"),
  @("components\landing\HeroSection.jsx",      "features\landing\components\HeroSection.jsx"),
  @("components\landing\LandingNav.jsx",        "features\landing\components\LandingNav.jsx"),
  @("components\landing\Philosophy.jsx",        "features\landing\components\Philosophy.jsx"),
  @("components\landing\PricingComparison.jsx", "features\landing\components\PricingComparison.jsx"),
  @("components\landing\ProductExperience.jsx", "features\landing\components\ProductExperience.jsx"),
  @("components\landing\TrustArchitecture.jsx", "features\landing\components\TrustArchitecture.jsx"),
  @("utils\landingUtils.js",                    "features\landing\utils\landingUtils.js"),

  # SHARED – UI components
  @("components\Avatar.jsx",            "shared\components\ui\Avatar.jsx"),
  @("components\Button.jsx",            "shared\components\ui\Button.jsx"),
  @("components\Dialog.jsx",            "shared\components\ui\Dialog.jsx"),
  @("components\Drawer.jsx",            "shared\components\ui\Drawer.jsx"),
  @("components\Input.jsx",             "shared\components\ui\Input.jsx"),
  @("components\Popover.jsx",           "shared\components\ui\Popover.jsx"),
  @("components\ProgressBar.jsx",       "shared\components\ui\ProgressBar.jsx"),
  @("components\Spinner.jsx",           "shared\components\ui\Spinner.jsx"),
  @("components\Toast.jsx",             "shared\components\ui\Toast.jsx"),
  @("components\DataTable.jsx",         "shared\components\ui\DataTable.jsx"),
  @("components\InlineEdit.jsx",        "shared\components\ui\InlineEdit.jsx"),
  @("components\ThemeToggle.jsx",       "shared\components\ui\ThemeToggle.jsx"),
  @("components\modals\ConfirmModal.jsx",       "shared\components\ui\ConfirmModal.jsx"),
  @("components\modals\MeetingDetailPanel.jsx", "shared\components\ui\MeetingDetailPanel.jsx"),
  @("components\modals\MeetingFormModal.jsx",   "shared\components\ui\MeetingFormModal.jsx"),

  # SHARED – layout components
  @("components\Navbar.jsx",                "shared\components\layout\Navbar.jsx"),
  @("components\AppHeader.jsx",             "shared\components\layout\AppHeader.jsx"),
  @("components\GlobalSidebar.jsx",         "shared\components\layout\GlobalSidebar.jsx"),
  @("components\Sidebar.jsx",               "shared\components\layout\Sidebar.jsx"),
  @("components\TeamLabel.jsx",             "shared\components\layout\TeamLabel.jsx"),
  @("components\LatestCommentPreview.jsx",  "shared\components\layout\LatestCommentPreview.jsx"),

  # SHARED – responsive layout
  @("components\layouts\ResponsiveCard.jsx",        "shared\components\responsive\ResponsiveCard.jsx"),
  @("components\layouts\ResponsiveGrid.jsx",        "shared\components\responsive\ResponsiveGrid.jsx"),
  @("components\layouts\ResponsiveModal.jsx",       "shared\components\responsive\ResponsiveModal.jsx"),
  @("components\layouts\ResponsivePageLayout.jsx",  "shared\components\responsive\ResponsivePageLayout.jsx"),

  # SHARED – hooks
  @("hooks\useConfirmModal.js",       "shared\hooks\useConfirmModal.js"),
  @("hooks\useKeyboardShortcuts.js",  "shared\hooks\useKeyboardShortcuts.js"),
  @("hooks\useOptimisticUpdate.js",   "shared\hooks\useOptimisticUpdate.js"),
  @("hooks\usePageShortcuts.js",      "shared\hooks\usePageShortcuts.js"),
  @("hooks\useActivityTracker.js",    "shared\hooks\useActivityTracker.js"),
  @("hooks\useMobileCapabilities.js", "shared\hooks\useMobileCapabilities.js"),
  @("hooks\useMobileFileUpload.js",   "shared\hooks\useMobileFileUpload.js"),
  @("hooks\useAppAutoUpdate.js",      "shared\hooks\useAppAutoUpdate.js"),
  @("hooks\useMeetings.js",           "shared\hooks\useMeetings.js"),
  @("hooks\useRealtimePresence.js",   "shared\hooks\useRealtimePresence.js"),
  @("hooks\useRealtimeSync.js",       "shared\hooks\useRealtimeSync.js"),
  @("utils\useClickOutside.js",       "shared\hooks\useClickOutside.js"),
  @("utils\useDebounce.js",           "shared\hooks\useDebounce.js"),

  # SHARED – services
  @("api\axios.js",                   "shared\services\axios.js"),
  @("utils\mobileSocketManager.js",   "shared\services\mobileSocketManager.js"),
  @("utils\autoUpdate.js",            "shared\services\autoUpdate.js"),

  # SHARED – utils
  @("utils\cn.js",                    "shared\utils\cn.js"),
  @("utils\dateNormalization.js",     "shared\utils\dateNormalization.js"),

  # SHARED – constants
  @("data\pages.json",                "shared\constants\pages.json"),

  # APP providers
  @("context\ThemeContext.jsx",       "app\providers\ThemeProvider.jsx"),

  # STYLES
  @("index.css",                      "styles\index.css"),
  @("animations.css",                 "styles\animations.css"),
  @("mobile-responsive.css",          "styles\mobile-responsive.css"),
  @("design-tokens.css",              "styles\design-tokens.css"),
  @("tokens.css",                     "styles\tokens.css"),
  @("ui-system.css",                  "styles\ui-system.css"),
  @("aethertrack-reference.css",      "styles\aethertrack-reference.css")
)

foreach ($m in $moves) { Move-FileToTarget $m[0] $m[1] }

# ── 3. Report ──────────────────────────────────────────────────────────────
$log | Set-Content "$S\..\migrate-log.txt" -Encoding UTF8
if ($errors.Count -gt 0) {
  $errors | Set-Content "$S\..\migrate-errors.txt" -Encoding UTF8
  Write-Host "Errors: $($errors.Count)" -ForegroundColor Yellow
  $errors | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
  Write-Host "All files moved. No errors." -ForegroundColor Green
}
Write-Host "Moved $($log.Count) items."
