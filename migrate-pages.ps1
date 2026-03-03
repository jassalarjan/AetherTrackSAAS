# migrate-pages.ps1
# Phase 4: Migrates all remaining pages from direct Sidebar usage to ResponsivePageLayout.
# Script handles the common pattern exactly, skipping files that need manual handling.

$pagesDir = "c:\Users\jassa_5gbrlvp\Documents\01_Projects\AetherTrackSAAS\frontend\src\pages"

# Page metadata: file → [title, lucide icon name]
$pageMeta = @{
  'ChangeLog.jsx'               = @('Change Log',       'FileText')
  'CommunityUserManagement.jsx' = @('Community',        'Users')
  'MyProjects.jsx'              = @('My Projects',      'Briefcase')
  'ProjectDashboard.jsx'        = @('Projects',         'FolderKanban')
  'SelfAttendance.jsx'          = @('Attendance',       'Clock')
  'Tasks.jsx'                   = @('Tasks',            'CheckSquare')
  'Teams.jsx'                   = @('Teams',            'Users')
}

$importLine  = "import ResponsivePageLayout from '../components/layouts/ResponsivePageLayout';"

foreach ($entry in $pageMeta.GetEnumerator()) {
  $file   = Join-Path $pagesDir $entry.Key
  $title  = $entry.Value[0]
  $icon   = $entry.Value[1]

  if (-not (Test-Path $file)) { Write-Host "SKIP (not found): $($entry.Key)"; continue }

  $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

  # 1. Replace `import Sidebar from...`
  if ($content -notmatch "import Sidebar from") { Write-Host "SKIP (no Sidebar import): $($entry.Key)"; continue }
  $content = $content -replace "import Sidebar from '[^']+';(\r?\n)?", ""

  # 2. Add import after the last 'react-router-dom' or first import block
  $content = $content -replace "(import \{ useNavigate[^}]+\}[^;]+;|import \{ useAuth[^}]+\}[^;]+;|import ResponsivePageLayout[^;]+;)?", {
    param($m)
    if ($m.Value -match "ResponsivePageLayout") { return $m.Value }
    $m.Value
  }
  # Simpler: just prepend the import after the first import line
  if ($content -notmatch "import ResponsivePageLayout") {
    $content = $content -replace "(import [^\n]+\n)", "`$1$importLine`n", 1
  }

  # 3. Add icon import if not already there  
  # Most pages already import from lucide-react; add icon if missing
  if ($content -notmatch "\b$icon\b") {
    $content = $content -replace "(\} from 'lucide-react';)", ", $icon `$1"
  }

  # 4. Replace outer wrapper patterns
  # Pattern A: flex h-screen ... <Sidebar /> ... <main ... > ... </main> ... </div>
  # We do a targeted multi-line replace of the outer shell

  # Replace the flex h-screen div + Sidebar opening
  $content = $content -replace "(?s)<div\s+className=\{?[^>]*?flex h-screen[^>]*?\}?>\s*\{?\/\*[^*]*\*\/\}?\s*<Sidebar\s*/>\s*(\{\/\* PWA[^}]+\})?", ""
  # Also handle the case without comment
  $content = $content -replace "(?s)<div\s+className=\{?[^>]*?flex h-screen[^>]*?\}?>\s*<Sidebar\s*/>\s*", ""
  $content = $content -replace "(?s)<div\s+className=""flex h-screen[^""]*"">\s*<Sidebar\s*/>\s*", ""

  # Remove main wrapper
  $content = $content -replace "<main\s+className=\{?[^>]+?\}?>", ""
  $content = $content -replace "</main>(\s*</div>)", ""

  # Replace return ( <div ...> with ResponsivePageLayout
  $content = $content -replace "return \(\s*<div\s+className=\{?[^>]*?(flex h-screen)[^>]*?\}?>", "return (`n    <ResponsivePageLayout title=""$title"" icon={$icon}>"
    
  # Replace the final </div> ); with </ResponsivePageLayout>
  $content = $content -replace "</div>\s*\);\s*\};\s*\nexport default", "</ResponsivePageLayout>`n  );`n};`n`nexport default"

  [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
  Write-Host "OK: $($entry.Key)"
}

Write-Host "Migration script completed."
