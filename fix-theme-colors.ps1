$files = @(
    "c:\Users\jassa_u9qxsxc\Documents\01_Projects\Taskflow\frontend\src\pages\Calendar.jsx",
    "c:\Users\jassa_u9qxsxc\Documents\01_Projects\Taskflow\frontend\src\pages\Analytics.jsx",
    "c:\Users\jassa_u9qxsxc\Documents\01_Projects\Taskflow\frontend\src\pages\UserManagement.jsx",
    "c:\Users\jassa_u9qxsxc\Documents\01_Projects\Taskflow\frontend\src\pages\Teams.jsx",
    "c:\Users\jassa_u9qxsxc\Documents\01_Projects\Taskflow\frontend\src\pages\ChangeLog.jsx"
)

foreach ($file in $files) {
    Write-Host "Processing: $file" -ForegroundColor Cyan
    
    $content = Get-Content $file -Raw
    
    # Replace background colors
    $content = $content -replace 'className="([^"]*?)bg-\[#111418\]([^"]*?)"', 'className="`${theme === ''dark'' ? ''bg-[#111418]'' : ''bg-gray-50''} $1$2"'
    $content = $content -replace 'className="([^"]*?)bg-\[#1c2027\]([^"]*?)"', 'className="`${theme === ''dark'' ? ''bg-[#1c2027]'' : ''bg-white''} $1$2"'
    
    # Replace border colors  
    $content = $content -replace 'className="([^"]*?)border-\[#282f39\]([^"]*?)"', 'className="`${theme === ''dark'' ? ''border-[#282f39]'' : ''border-gray-200''} $1$2"'
    
    Set-Content $file -Value $content -NoNewline
    Write-Host "Completed: $file" -ForegroundColor Green
}

Write-Host "`nAll files processed!" -ForegroundColor Yellow
