/**
 * 创建应用图标 - 简单的 PNG 图标生成器
 * 使用纯 JavaScript 创建一个 256x256 的 PNG 图标
 */

const fs = require('fs');
const path = require('path');

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

// Adler-32 checksum
function adler32(data) {
  let a = 1, b = 0;
  const MOD = 65521;
  
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD;
    b = (b + a) % MOD;
  }
  
  return (b << 16) | a;
}

// 简单的 deflate 压缩（无压缩模式）
function deflate(data) {
  const chunks = [];
  const CHUNK_SIZE = 65535;
  
  // zlib header
  chunks.push(Buffer.from([0x78, 0x01]));
  
  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const chunkSize = Math.min(remaining, CHUNK_SIZE);
    const isLast = offset + chunkSize >= data.length;
    
    // Block header
    const header = Buffer.alloc(5);
    header[0] = isLast ? 0x01 : 0x00;
    header.writeUInt16LE(chunkSize, 1);
    header.writeUInt16LE(chunkSize ^ 0xFFFF, 3);
    
    chunks.push(header);
    chunks.push(data.slice(offset, offset + chunkSize));
    
    offset += chunkSize;
  }
  
  // Adler-32 checksum
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(adler32(data), 0);
  chunks.push(checksum);
  
  return Buffer.concat(chunks);
}

// 创建图标
function createIcon(size = 256) {
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
  const rawData = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.4;
  const ringWidth = width * 0.08;
  
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 圆环进度条
      if (dist >= radius - ringWidth && dist <= radius) {
        // 计算角度 (从顶部开始，顺时针)
        const angle = Math.atan2(dx, -dy);
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
        
        // 75% 进度用青色，剩下的用深灰色
        if (normalizedAngle <= 0.75) {
          // 青色 #10b981
          rawData.push(16, 185, 129, 255);
        } else {
          // 深灰色背景
          rawData.push(60, 60, 70, 255);
        }
      } else {
        // 透明背景
        rawData.push(0, 0, 0, 0);
      }
    }
  }
  
  const rawBuffer = Buffer.from(rawData);
  const compressed = deflate(rawBuffer);
  
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
const icon = createIcon(256);
fs.writeFileSync(iconPath, icon);
console.log(`Icon created: ${iconPath} (${icon.length} bytes)`);
