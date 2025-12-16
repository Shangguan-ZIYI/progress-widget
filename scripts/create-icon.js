/**
 * 创建 512x512 PNG 图标（使用 zlib 压缩）
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG 文件头
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// CRC32 计算
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 创建 PNG chunk
function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

// 创建图标
function createIcon(size = 512) {
  const width = size;
  const height = size;
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  // 创建像素数据
  const rowSize = 1 + width * 4; // filter byte + RGBA
  const rawData = Buffer.alloc(rowSize * height);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.4;
  const ringWidth = width * 0.08;
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter byte
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 圆环进度条
      if (dist >= radius - ringWidth && dist <= radius) {
        const angle = Math.atan2(dx, -dy);
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
        
        if (normalizedAngle <= 0.75) {
          // 青色 #10b981
          rawData[pixelOffset] = 16;
          rawData[pixelOffset + 1] = 185;
          rawData[pixelOffset + 2] = 129;
          rawData[pixelOffset + 3] = 255;
        } else {
          // 深灰色
          rawData[pixelOffset] = 60;
          rawData[pixelOffset + 1] = 60;
          rawData[pixelOffset + 2] = 70;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // 透明
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }
  
  // 使用 zlib 压缩
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  
  // 组装 PNG
  const chunks = [
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0))
  ];
  
  return Buffer.concat(chunks);
}

// 生成并保存图标
const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
const icon = createIcon(512);
fs.writeFileSync(iconPath, icon);
console.log(`Icon created: ${iconPath} (${icon.length} bytes, 512x512)`);
