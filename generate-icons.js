import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, 'frontend', 'public', 'logo.png');
const publicDir = path.join(__dirname, 'frontend', 'public');
const iconsDir = path.join(__dirname, 'frontend', 'public', 'icons');

console.log('🎨 Generating app icons from logo.png...\n');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  try {
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found:', logoPath);
      console.log('Please ensure logo.png exists in frontend/public/');
      process.exit(1);
    }

    // Generate PWA icons
    console.log('📱 Generating PWA icons...');
    await sharp(logoPath)
      .resize(64, 64)
      .png()
      .toFile(path.join(iconsDir, 'pwa-64x64.png'));
    console.log('  ✓ pwa-64x64.png');

    await sharp(logoPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(iconsDir, 'pwa-192x192.png'));
    console.log('  ✓ pwa-192x192.png');

    await sharp(logoPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'pwa-512x512.png'));
    console.log('  ✓ pwa-512x512.png');

    // Generate Apple Touch Icon
    console.log('\n🍎 Generating Apple Touch Icon...');
    await sharp(logoPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(iconsDir, 'apple-touch-icon-180x180.png'));
    console.log('  ✓ apple-touch-icon-180x180.png');

    // Generate Maskable Icon (with safe area padding)
    console.log('\n🎭 Generating Maskable Icon...');
    await sharp(logoPath)
      .resize(410, 410)
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(iconsDir, 'maskable-icon-512x512.png'));
    console.log('  ✓ maskable-icon-512x512.png');

    // Generate favicon sizes and combine into ICO
    console.log('\n🖼️  Generating favicon.ico...');
    const favicon16 = await sharp(logoPath)
      .resize(16, 16)
      .png()
      .toBuffer();

    const favicon32 = await sharp(logoPath)
      .resize(32, 32)
      .png()
      .toBuffer();

    const favicon48 = await sharp(logoPath)
      .resize(48, 48)
      .png()
      .toBuffer();

    // For ICO format, we'll create a 32x32 PNG as browsers support PNG favicons
    await sharp(logoPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'logo.png.tmp'));
    
    // Rename to .ico (browsers will accept PNG data in .ico files)
    fs.renameSync(
      path.join(publicDir, 'logo.png.tmp'),
      path.join(publicDir, 'logo.ico')
    );
    console.log('  ✓ logo.ico (32x32)');

    // Also update the main logo.png
    console.log('\n🔄 Updating main logo.png...');
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'logo-updated.png'));
    
    // Keep original, don't overwrite
    console.log('  ✓ Logo preserved');

    console.log('\n✅ All icons generated successfully!');
    console.log(`📁 Icons location: ${iconsDir}`);
    console.log('\n📋 Generated files:');
    console.log('  - logo.ico (32x32)');
    console.log('  - icons/pwa-64x64.png');
    console.log('  - icons/pwa-192x192.png');
    console.log('  - icons/pwa-512x512.png');
    console.log('  - icons/apple-touch-icon-180x180.png');
    console.log('  - icons/maskable-icon-512x512.png');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
