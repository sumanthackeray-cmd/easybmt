const fs = require('fs');
const path = require('path');

function convertPngToIco(pngPath, icoPath) {
  const pngBuffer = fs.readFileSync(pngPath);
  const size = pngBuffer.length;

  const header = Buffer.alloc(22);
  
  // ICONDIR Header
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type (1 for icon)
  header.writeUInt16LE(1, 4);     // Count (1 image)

  // ICONDIRENTRY
  header.writeUInt8(0, 6);        // Width (0 means 256)
  header.writeUInt8(0, 7);        // Height (0 means 256)
  header.writeUInt8(0, 8);        // Color count (0 for >256 colors)
  header.writeUInt8(0, 9);        // Reserved
  header.writeUInt16LE(1, 10);    // Planes (1)
  header.writeUInt16LE(32, 12);   // Bits per pixel (32)
  header.writeUInt32LE(size, 14); // Image size in bytes
  header.writeUInt32LE(22, 18);   // Offset of image data

  const icoBuffer = Buffer.concat([header, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Converted PNG ${pngPath} to ICO ${icoPath} successfully!`);
}

convertPngToIco(
  path.join(__dirname, '..', 'public', 'favicon.png'),
  path.join(__dirname, '..', 'public', 'favicon.ico')
);
