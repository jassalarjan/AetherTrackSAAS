$ErrorActionPreference = 'Stop'

$base = 'http://localhost:5000'

try {
  $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{
    email = 'jassalarjansingh@gmail.com'
    password = 'waheguru'
  } | ConvertTo-Json)

  $token = $login.accessToken
  $headers = @{ Authorization = "Bearer $token" }
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

  try {
    $badTeamBody = @{ name = "Bad Team $stamp"; hr_id = '000000000000000000000000'; lead_id = '000000000000000000000000' } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/teams" -Method Post -Headers $headers -ContentType 'application/json' -Body $badTeamBody | Out-Null
    'FAIL_REQUEST_STATUS=unexpected_success'
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    "FAIL_REQUEST_STATUS=$statusCode"
  }

  $clickResp = Invoke-RestMethod -Uri "$base/api/changelog/client-event" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    event_type = 'user_action'
    action = 'FRONTEND_CLICK'
    target_type = 'ui_click'
    target_id = "smoke-click-$stamp"
    target_name = 'Smoke Button'
    description = 'Smoke click event'
    metadata = @{ source = 'smoke_test'; page = '/smoke' }
  } | ConvertTo-Json -Depth 6)
  "CLICK_EVENT_OK=$($clickResp.success)"

  $auditResp = Invoke-RestMethod -Uri "$base/api/audit/errors" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    level = 'error'
    category = 'frontend_runtime_error'
    message = "Smoke frontend error $stamp"
    request = @{ method = 'BROWSER'; path = '/smoke'; status_code = $null; ip = '' }
    error = @{ name = 'SmokeError'; stack = 'stack:smoke' }
    metadata = @{ source = 'smoke_test' }
  } | ConvertTo-Json -Depth 6)
  "AUDIT_EVENT_OK=$($auditResp.success)"

  $chg = Invoke-RestMethod -Uri "$base/api/changelog/legacy?page=1&limit=120&search=smoke" -Method Get -Headers $headers
  $hasClick = ($chg.logs | Where-Object { $_.action -eq 'FRONTEND_CLICK' -and $_.target_id -eq "smoke-click-$stamp" } | Measure-Object).Count -gt 0
  "CHANGELOG_CLICK_FOUND=$([int]$hasClick)"

  $failedReqLog = Invoke-RestMethod -Uri "$base/api/changelog/legacy?page=1&limit=120&search=_FAILED" -Method Get -Headers $headers
  $hasFailedReq = ($failedReqLog.logs | Where-Object { $_.action -like '*_FAILED' -and $_.metadata.source -eq 'api_audit_logger' } | Measure-Object).Count -gt 0
  "CHANGELOG_FAILED_REQUEST_FOUND=$([int]$hasFailedReq)"

  $auditLogs = Invoke-RestMethod -Uri "$base/api/audit/logs?page=1&limit=50&search=Smoke frontend error $stamp" -Method Get -Headers $headers
  $hasFrontendAudit = ($auditLogs.logs | Where-Object { $_.category -eq 'frontend_runtime_error' -and $_.message -like "*$stamp*" } | Measure-Object).Count -gt 0
  "AUDIT_FRONTEND_ERROR_FOUND=$([int]$hasFrontendAudit)"

  $auditFailLogs = Invoke-RestMethod -Uri "$base/api/audit/logs?page=1&limit=80&category=api_request_failure" -Method Get -Headers $headers
  $hasBackendFailure = ($auditFailLogs.logs | Where-Object { $_.source -eq 'backend' -and $_.category -eq 'api_request_failure' } | Measure-Object).Count -gt 0
  "AUDIT_BACKEND_FAILURE_FOUND=$([int]$hasBackendFailure)"
} catch {
  "SMOKE_ERROR=$($_.Exception.Message)"
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    "SMOKE_ERROR_DETAILS=$($_.ErrorDetails.Message)"
  }
}
