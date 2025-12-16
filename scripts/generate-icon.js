/**
 * 图标生成脚本
 * 运行此脚本生成托盘图标
 * node scripts/generate-icon.js
 */

const fs = require('fs');
const path = require('path');

// 创建一个简单的 16x16 PNG 图标（绿色圆形进度图标）
// 这是一个预生成的 PNG 文件的 Base64 编码
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKfSURBVFiF7ZdNaBNBFMd/s5tNNkmTNGm0aRpttRURsYKCIHhQ0IIHD4oePHjw4kHw4MWDBy8ePHjx4sGLFw8ePHgQPHhQBBEUP6qitlprbbVJk6bZJNnZHWeTNJJNdjdtLfSD4e3szPzfvDfzZhYOsANCe63A/wIQ7rUCJYFQKAQg3WsgJQAZ8Hq9SJJUPL6qqnIul0On02E2m3G5XCiKoghgcFBlX9w2EREAWCwWtLS0oCiKmM1mS0YBnZ2dOJ1O+vv7CYfDKIqCLMtFW7W0tNDc3AxAKpUik8lgs9loamrC7/fXBLBaFq3d3tz8hl6v5+zZEMePH8flchGPx5mampoG+qempqYn29vb/2pvby8CqKrK0NAQqVQKs9mM3W5HVVUsFguBQIDW1lZisRjj4+NYLBZOnjxJLBarCcDjL7jxuZVTY+8K8/b5fNNer3e8t7cXgPHxceLxOJIksby8TDabJZvNYrfb6e3tZWpqitXVVQwGAy6Xi3g8jqIoBAIBAFZXV5Ekic7OziKAdDpdE8B9p0xf+rjVag0ajcbBiYkJqqqqCkA0GiUajeLz+Whvb2dyclKE3+l00tDQgMfjIRAIoCgK+Xwep9PJ2NgYqqoiSRJtbW3FaLXZbDUBrMWjbqB5bGyMXC6HxWIhFAqJGHu9XhRFIRAI4HA48Hq9hMNhcrkcFosFr9crqmN7ezu5XA6Xy1UEUBRlSwCJLADJZJKRkRGmp6fp7u4mHA6TTCbxeDwkk0l8Ph89PT0MDw9TUFBOp5OJiQmCwSChUEgUo2AwSD6fF3FfWVlhYWFhSwB6sxnwS5IkEqrRaJjzeDxks1l6enoYGRkhk8ng8XgIh8MsLCyI6riwsEAgEMBqteJ2u9c6J5PJMDExsXWa3cv/B/gN7HYHVFlDDfUAAAAASUVORK5CYII=';

// 确保 assets 目录存在
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 写入图标文件
const iconPath = path.join(assetsDir, 'tray-icon.png');
const iconBuffer = Buffer.from(iconBase64, 'base64');
fs.writeFileSync(iconPath, iconBuffer);

console.log('Tray icon generated:', iconPath);
