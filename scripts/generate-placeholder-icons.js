import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePlaceholderIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Create a simple gradient background for the icons
  const svgIcon = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#333;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)"/>
      <text x="256" y="280" font-family="Georgia, serif" font-size="180" fill="white" text-anchor="middle">M</text>
    </svg>
  `;
  
  // Generate different favicon sizes
  const sizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
  ];
  
  for (const { size, name } of sizes) {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`Generated ${name}`);
  }
  
  // Generate Open Graph image with Met branding
  const ogSvg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1a1a1a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bgGrad)"/>
      <text x="600" y="250" font-family="Georgia, serif" font-size="72" fill="white" text-anchor="middle">Open Metropolitan</text>
      <text x="600" y="350" font-family="Arial, sans-serif" font-size="36" fill="#ccc" text-anchor="middle">Explore The Met's Art Collection</text>
      <text x="600" y="420" font-family="Arial, sans-serif" font-size="24" fill="#999" text-anchor="middle">Interactive Visual Galaxy of Masterpieces</text>
    </svg>
  `;
  
  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated og-image.png');
}

generatePlaceholderIcons().catch(console.error);