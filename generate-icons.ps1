# Generate App Icons from Logo
# Requires ImageMagick: https://imagemagick.org/script/download.php#windows
# Install: winget install ImageMagick.ImageMagick

$logoPath = ".\frontend\public\logo.png"
$publicDir = ".\frontend\public"
$iconsDir = ".\frontend\public\icons"

Write-Host "Generating app icons from $logoPath..." -ForegroundColor Cyan

# Check if ImageMagick is installed
try {
    $null = magick --version
} catch {
    Write-Host "❌ ImageMagick not found. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install ImageMagick.ImageMagick" -ForegroundColor Yellow
    exit 1
}

# Create icons directory if it doesn't exist
if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

# Generate favicon.ico (16x16, 32x32, 48x48 in one file)
Write-Host "Generating favicon.ico..." -ForegroundColor Green
magick convert $logoPath -resize 16x16 -define icon:auto-resize=16,32,48 "$publicDir\logo.ico"

# Generate PWA icons
Write-Host "Generating PWA icons..." -ForegroundColor Green
magick convert $logoPath -resize 64x64 "$iconsDir\pwa-64x64.png"
magick convert $logoPath -resize 192x192 "$iconsDir\pwa-192x192.png"
magick convert $logoPath -resize 512x512 "$iconsDir\pwa-512x512.png"

# Generate Apple Touch Icon
Write-Host "Generating Apple Touch Icon..." -ForegroundColor Green
magick convert $logoPath -resize 180x180 "$iconsDir\apple-touch-icon-180x180.png"

# Generate Maskable Icon (with padding for safe area)
Write-Host "Generating Maskable Icon..." -ForegroundColor Green
magick convert $logoPath -resize 410x410 -gravity center -extent 512x512 -background white "$iconsDir\maskable-icon-512x512.png"

Write-Host "`n✅ All icons generated successfully!" -ForegroundColor Green
Write-Host "Icons created in: $iconsDir" -ForegroundColor Cyan
