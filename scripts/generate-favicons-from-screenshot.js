import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFaviconsFromScreenshot() {
  const publicDir = path.join(__dirname, '..', 'public');
  const sourceImage = path.join(publicDir, 'screenshot.png');
  
  try {
    // Generate different favicon sizes
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
      { size: 192, name: 'android-chrome-192x192.png' },
      { size: 512, name: 'android-chrome-512x512.png' },
    ];
    
    for (const { size, name } of sizes) {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(path.join(publicDir, name));
      console.log(`Generated ${name}`);
    }
    
    // Also generate a new favicon.ico from the high-res source
    await sharp(sourceImage)
      .resize(32, 32)
      .toFile(path.join(publicDir, 'favicon-32.png'));
    
    console.log('All favicon sizes generated successfully from screenshot.png!');
    
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFaviconsFromScreenshot().catch(console.error);