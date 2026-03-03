$base = "c:\Users\jassa_5gbrlvp\Documents\01_Projects\AetherTrackSAAS"

$files = Get-ChildItem "$base\frontend\src" -Recurse -Include "*.jsx","*.tsx","*.js","*.ts" |
  Where-Object { $_.Name -notmatch "Sidebar_(FIXED|BROKEN)" } |
  Select-Object -ExpandProperty FullName

# Ordered so longer strings replace before shorter substrings
$pairs = @(
  @('--color-brand-primary-hover',  '--brand-light'),
  @('--color-brand-subtle',        '--brand-dim'),
  @('--color-brand-primary',       '--brand'),
  @('--color-error-subtle',        '--danger-dim'),
  @('--color-focus-ring',          '--brand'),
  @('--color-surface-elevated',    '--bg-raised'),
  @('--color-surface-muted',       '--bg-surface'),
  @('--color-surface-subtle',      '--bg-base'),
  @('--color-surface-hover',       '--bg-base'),
  @('--color-surface-base',        '--bg-canvas'),
  @('--color-border-default',      '--border-soft'),
  @('--color-border-subtle',       '--border-hair'),
  @('--color-text-placeholder',    '--text-faint'),
  @('--color-text-tertiary',       '--text-muted'),
  @('--color-text-secondary',      '--text-secondary'),
  @('--color-text-primary',        '--text-primary'),
  @('--color-text-default',        '--text-primary'),
  @('--color-text-inverse',        '--bg-canvas'),
  @('--color-text-muted',          '--text-muted'),
  @('--color-danger-subtle',       '--danger-dim'),
  @('--color-warning-subtle',      '--warning-dim'),
  @('--color-caution-subtle',      '--warning-dim'),
  @('--color-success-subtle',      '--success-dim'),
  @('--color-priority-urgent',     '--danger'),
  @('--color-priority-high',       '--brand'),
  @('--color-priority-medium',     '--warning'),
  @('--color-priority-low',        '--success'),
  @('--color-status-in-progress',  '--brand'),
  @('--color-status-review',       '--ai-color'),
  @('--color-status-done',         '--success'),
  @('--color-status-todo',         '--text-muted'),
  @('--color-error',               '--danger'),
  @('--color-danger',              '--danger'),
  @('--color-caution',             '--warning'),
  @('--color-warning',             '--warning'),
  @('--color-success',             '--success'),
  @('--color-info',                '--ai-color'),
  @('--radius-button',             '--r-md'),
  @('--radius-dialog',             '--r-xl'),
  @('--radius-lg',                 '--r-lg'),
  @('--radius-md',                 '--r-md'),
  @('--radius-sm',                 '--r-sm'),
  @('--duration-default',          '--base'),
  @('--duration-fast',             '--fast'),
  @('--shadow-float',              '--shadow-xl'),
  @('[var(--z-toast)]',            '[9000]'),
  @('[var(--z-command)]',          '[9100]')
)

foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
  foreach ($pair in $pairs) {
    $content = $content.Replace($pair[0], $pair[1])
  }
  [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
  Write-Host "OK: $($file.Split('\')[-1])"
}
Write-Host "Done."
