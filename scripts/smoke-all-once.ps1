$ErrorActionPreference = 'Stop'

$base = 'http://localhost:5000'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tmpRoot = $env:TEMP

$createdUserId = $null
$createdTeamId = $null
$createdTaskId = $null
$jsonPath = $null
$excelPath = $null
$jsonRespFile = $null
$excelRespFile = $null
$excelGenScript = $null

$jsonStatus = ''
$excelStatus = ''
$jsonBody = ''
$excelBody = ''

try {
  $authOk = $false

  if ($token) {
    try {
      $meProbe = Invoke-RestMethod -Uri "$base/api/users/me" -Headers @{ Authorization = "Bearer $token" } -Method Get
      if ($meProbe.user -and $meProbe.user._id) { $authOk = $true }
    } catch {}
  }

  if (-not $authOk) {
    $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{
      email = 'jassalarjansingh@gmail.com'
      password = 'waheguru'
    } | ConvertTo-Json)
    $token = $login.accessToken
  }

  $h = @{ Authorization = "Bearer $token" }
  $me = Invoke-RestMethod -Uri "$base/api/users/me" -Headers $h -Method Get
  $selfId = $me.user._id
  $selfEmail = $me.user.email

  $userListResp = Invoke-RestMethod -Uri "$base/api/users?page=1&limit=500" -Headers $h -Method Get
  $allUsers = @()
  if ($userListResp.users) {
    $allUsers = $userListResp.users
  }

  $hrCandidate = $allUsers | Where-Object { $_.role -in @('admin', 'hr') } | Select-Object -First 1
  $leadCandidate = $allUsers | Where-Object { $_.role -in @('admin', 'team_lead') } | Select-Object -First 1

  $teamHrId = if ($hrCandidate -and $hrCandidate._id) { $hrCandidate._id } else { $selfId }
  $teamLeadId = if ($leadCandidate -and $leadCandidate._id) { $leadCandidate._id } else { $selfId }

  $smokeEmail = "smoke.all.$stamp@example.com"
  $newUser = Invoke-RestMethod -Uri "$base/api/users" -Method Post -Headers $h -ContentType 'application/json' -Body (@{
    full_name = "Smoke All $stamp"
    email = $smokeEmail
    password = 'ChangeMe@2024!'
    role = 'member'
  } | ConvertTo-Json)
  $createdUserId = $newUser.user._id

  $teamResp = Invoke-RestMethod -Uri "$base/api/teams" -Method Post -Headers $h -ContentType 'application/json' -Body (@{
    name = "Smoke Team $stamp"
    description = 'Temporary smoke team'
    hr_id = $teamHrId
    lead_id = $teamLeadId
  } | ConvertTo-Json)
  $createdTeamId = $teamResp.team._id

  $null = Invoke-RestMethod -Uri "$base/api/teams/$createdTeamId/members" -Method Post -Headers $h -ContentType 'application/json' -Body (@{ userId = $createdUserId } | ConvertTo-Json)
  $null = Invoke-RestMethod -Uri "$base/api/teams/$createdTeamId/members/$createdUserId" -Method Delete -Headers $h

  $dueDate = (Get-Date).AddDays(7).ToString('o')
  $taskResp = Invoke-RestMethod -Uri "$base/api/tasks" -Method Post -Headers $h -ContentType 'application/json' -Body (@{
    title = "Smoke All Task $stamp"
    description = 'Temporary smoke task'
    priority = 'medium'
    due_date = $dueDate
    assigned_to = @($createdUserId)
  } | ConvertTo-Json -Depth 5)
  $createdTaskId = $taskResp.task._id

  $null = Invoke-RestMethod -Uri "$base/api/tasks/$createdTaskId" -Method Patch -Headers $h -ContentType 'application/json' -Body (@{ assigned_to = @() } | ConvertTo-Json -Depth 3)

  $jsonPath = Join-Path $tmpRoot ("smoke-bulk-$stamp.json")
  $jsonPayload = @'
[{"full_name":"Smoke Duplicate","email":"__EMAIL__","password":"ChangeMe@2024!","role":"member","team":"Smoke Team","employment_status":"ACTIVE"}]
'@.Replace('__EMAIL__', $selfEmail)
  [System.IO.File]::WriteAllText($jsonPath, $jsonPayload, (New-Object System.Text.UTF8Encoding($false)))

  $jsonRespFile = Join-Path $tmpRoot ("smoke-bulk-json-resp-$stamp.json")
  $jsonStatus = curl.exe -sS -o "$jsonRespFile" -w "%{http_code}" -X POST "$base/api/users/bulk-import/json" -H "Authorization: Bearer $token" -F "file=@$jsonPath;type=application/json"
  $jsonBody = Get-Content -Raw $jsonRespFile

  $excelPath = Join-Path $tmpRoot ("smoke-bulk-$stamp.xlsx")
  $excelGenScript = Join-Path $tmpRoot ("smoke-gen-xlsx-$stamp.cjs")
  $excelGenCode = @"
const path = require('path');
const ExcelJS = require(path.join(process.cwd(), 'node_modules', 'exceljs'));
(async () => {
  const p = process.argv[2];
  const email = process.argv[3];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Users');
  ws.addRow(['full_name','email','password','role','team','employment_status']);
  ws.addRow(['Smoke Duplicate', email, 'ChangeMe@2024!', 'member', 'Smoke Team', 'ACTIVE']);
  await wb.xlsx.writeFile(p);
})().catch((err) => { console.error(err); process.exit(1); });
"@
  [System.IO.File]::WriteAllText($excelGenScript, $excelGenCode, (New-Object System.Text.UTF8Encoding($false)))

  Push-Location backend
  node "$excelGenScript" "$excelPath" "$selfEmail"
  Pop-Location

  $excelRespFile = Join-Path $tmpRoot ("smoke-bulk-excel-resp-$stamp.json")
  $excelStatus = curl.exe -sS -o "$excelRespFile" -w "%{http_code}" -X POST "$base/api/users/bulk-import/excel" -H "Authorization: Bearer $token" -F "file=@$excelPath;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  $excelBody = Get-Content -Raw $excelRespFile

  $legacy = Invoke-RestMethod -Uri "$base/api/changelog/legacy?page=1&limit=300" -Headers $h -Method Get
  $legacyLogs = @()
  if ($legacy.logs) { $legacyLogs = $legacy.logs }

  $L_taskAssigned = ($legacyLogs | Where-Object { $_.event_type -eq 'task_assigned' -and $_.target_id -eq $createdTaskId } | Select-Object -First 1)
  $L_taskUnassigned = ($legacyLogs | Where-Object { $_.event_type -eq 'task_unassigned' -and $_.target_id -eq $createdTaskId } | Select-Object -First 1)
  $L_notification = ($legacyLogs | Where-Object { $_.event_type -eq 'notification_sent' -and $_.target_id -eq $createdTaskId } | Select-Object -First 1)
  $L_teamAdded = ($legacyLogs | Where-Object { $_.event_type -eq 'team_member_added' -and $_.target_id -eq $createdTeamId } | Select-Object -First 1)
  $L_teamRemoved = ($legacyLogs | Where-Object { $_.event_type -eq 'team_member_removed' -and $_.target_id -eq $createdTeamId } | Select-Object -First 1)
  $L_bulkJson = ($legacyLogs | Where-Object { $_.event_type -eq 'bulk_import' -and $_.target_id -eq 'bulk-import-json' -and $_.action -eq 'BULK_IMPORT_JSON' } | Select-Object -First 1)
  $L_bulkExcel = ($legacyLogs | Where-Object { $_.event_type -eq 'bulk_import' -and $_.target_id -eq 'bulk-import-excel' -and $_.action -eq 'BULK_IMPORT_EXCEL' } | Select-Object -First 1)

  $unified = Invoke-RestMethod -Uri "$base/api/changelog?page=1&limit=400&includeAudit=true" -Headers $h -Method Get
  $uItems = @()
  if ($unified.items) { $uItems = $unified.items }
  $uAudit = $uItems | Where-Object { $_.source -eq 'audit' }

  $U_taskAssigned = ($uAudit | Where-Object { $_.entityId -eq $createdTaskId -and $_.diff.event_type -eq 'task_assigned' } | Select-Object -First 1)
  $U_taskUnassigned = ($uAudit | Where-Object { $_.entityId -eq $createdTaskId -and $_.diff.event_type -eq 'task_unassigned' } | Select-Object -First 1)
  $U_notification = ($uAudit | Where-Object { $_.entityId -eq $createdTaskId -and $_.diff.event_type -eq 'notification_sent' } | Select-Object -First 1)
  $U_teamAdded = ($uAudit | Where-Object { $_.entityId -eq $createdTeamId -and $_.diff.event_type -eq 'team_member_added' } | Select-Object -First 1)
  $U_teamRemoved = ($uAudit | Where-Object { $_.entityId -eq $createdTeamId -and $_.diff.event_type -eq 'team_member_removed' } | Select-Object -First 1)
  $U_bulkJson = ($uAudit | Where-Object { $_.entityId -eq 'bulk-import-json' -and $_.action -eq 'bulk_import_json' } | Select-Object -First 1)
  $U_bulkExcel = ($uAudit | Where-Object { $_.entityId -eq 'bulk-import-excel' -and $_.action -eq 'bulk_import_excel' } | Select-Object -First 1)

  "RUN_STAMP=$stamp"
  "ARTIFACT_IDS user=$createdUserId team=$createdTeamId task=$createdTaskId"
  "UPLOAD_JSON_STATUS=$jsonStatus"
  "UPLOAD_JSON_BODY=$jsonBody"
  "UPLOAD_EXCEL_STATUS=$excelStatus"
  "UPLOAD_EXCEL_BODY=$excelBody"
  "LEGACY task_assigned=$([int]($null -ne $L_taskAssigned)) task_unassigned=$([int]($null -ne $L_taskUnassigned)) notification_sent=$([int]($null -ne $L_notification)) team_member_added=$([int]($null -ne $L_teamAdded)) team_member_removed=$([int]($null -ne $L_teamRemoved)) bulk_import_json=$([int]($null -ne $L_bulkJson)) bulk_import_excel=$([int]($null -ne $L_bulkExcel))"
  "UNIFIED task_assigned=$([int]($null -ne $U_taskAssigned)) task_unassigned=$([int]($null -ne $U_taskUnassigned)) notification_sent=$([int]($null -ne $U_notification)) team_member_added=$([int]($null -ne $U_teamAdded)) team_member_removed=$([int]($null -ne $U_teamRemoved)) bulk_import_json=$([int]($null -ne $U_bulkJson)) bulk_import_excel=$([int]($null -ne $U_bulkExcel))"

} catch {
  "SMOKE_ERROR=$($_.Exception.Message)"
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    "SMOKE_ERROR_DETAILS=$($_.ErrorDetails.Message)"
  }
} finally {
  try {
    if ($createdTaskId) {
      $null = Invoke-RestMethod -Uri "$base/api/tasks/$createdTaskId" -Method Delete -Headers @{ Authorization = "Bearer $token" }
    }
  } catch {}

  try {
    if ($createdTeamId) {
      $null = Invoke-RestMethod -Uri "$base/api/teams/$createdTeamId" -Method Delete -Headers @{ Authorization = "Bearer $token" }
    }
  } catch {}

  try {
    if ($createdUserId) {
      $null = Invoke-RestMethod -Uri "$base/api/users/$createdUserId" -Method Delete -Headers @{ Authorization = "Bearer $token" }
    }
  } catch {}

  foreach ($p in @($jsonPath, $excelPath, $jsonRespFile, $excelRespFile, $excelGenScript)) {
    if ($p -and (Test-Path $p)) {
      Remove-Item $p -ErrorAction SilentlyContinue
    }
  }

  'CLEANUP_DONE=1'
}
