import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Check if we have a source image
  const sourceImage = path.join(publicDir, 'fractalIcon.avif');
  
  try {
    await fs.access(sourceImage);
    console.log('Using fractalIcon.avif as source image');
    
    // Generate different favicon sizes
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
    ];
    
    for (const { size, name } of sizes) {
      await sharp(sourceImage)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, name));
      console.log(`Generated ${name}`);
    }
    
    // Generate Open Graph image (1200x630)
    await sharp(sourceImage)
      .resize(1200, 630, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'og-image.png'));
    console.log('Generated og-image.png');
    
  } catch (error) {
    console.error('Error generating favicons:', error);
    console.log('Make sure sharp is installed: npm install sharp');
  }
}

generateFavicons();