/**
 * Progress Widget - Electron 主进程
 * 负责窗口管理、托盘、全局快捷键、IPC通信
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, screen } = require('electron');
const path = require('path');
const stateManager = require('./stateManager');

// 保持对窗口对象的全局引用，避免被垃圾回收
let mainWindow = null;
let tray = null;
let isQuitting = false;

/**
 * 创建主窗口
 */
function createMainWindow() {
  const state = stateManager.getState();
  
  // 获取屏幕尺寸，确保窗口在可视范围内
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // 窗口默认位置（右下角）
  let x = state.windowBounds?.x ?? screenWidth - 380;
  let y = state.windowBounds?.y ?? screenHeight - 200;
  
  // 确保窗口在屏幕范围内
  x = Math.max(0, Math.min(x, screenWidth - 360));
  y = Math.max(0, Math.min(y, screenHeight - 180));

  mainWindow = new BrowserWindow({
    width: 360,
    height: 100,  // 初始为收起状态高度（双进度条）
    x: x,
    y: y,
    frame: false,                    // 无边框
    transparent: true,               // 透明背景
    alwaysOnTop: true,               // 始终启用，由级别控制
    skipTaskbar: true,               // 不在任务栏显示
    resizable: false,                // 不可调整大小
    minimizable: false,
    maximizable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,        // 安全：禁用Node集成
      contextIsolation: true,        // 安全：启用上下文隔离
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载HTML后设置置顶级别
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 设置置顶级别（'screen-saver' 是 Windows 上最高级别）
  if (state.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    mainWindow.setAlwaysOnTop(false);
  }

  // 设置初始透明度
  mainWindow.setOpacity(state.opacity);

  // 设置点击穿透
  if (state.clickThrough) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  // 窗口关闭时的处理
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // 窗口移动后保存位置
  mainWindow.on('moved', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      stateManager.updateState({
        windowBounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 创建系统托盘
 */
function createTray() {
  // 使用内置图标或自定义图标
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    // 如果图标文件不存在，使用空的 nativeImage
    const { nativeImage } = require('electron');
    // 创建一个简单的 16x16 图标
    const icon = nativeImage.createFromBuffer(createSimpleTrayIcon());
    tray = new Tray(icon);
  }

  updateTrayMenu();
  
  tray.setToolTip('Progress Widget');
  
  // 双击托盘图标显示/隐藏窗口
  tray.on('double-click', () => {
    toggleWindowVisibility();
  });
}

/**
 * 创建简单的托盘图标（16x16 PNG buffer）
 */
function createSimpleTrayIcon() {
  // 创建一个简单的 16x16 绿色圆形图标的 PNG buffer
  // 这是一个最小的有效 PNG 文件
  const width = 16;
  const height = 16;
  
  // 简单的 PNG 数据（绿色方块）
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(6, 9);  // color type (RGBA)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  
  // 为简化，返回一个空的图标占位符
  // 实际项目中应该使用真实的图标文件
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF,
    0x61, 0x00, 0x00, 0x00, 0x01, 0x73, 0x52, 0x47,
    0x42, 0x00, 0xAE, 0xCE, 0x1C, 0xE9, 0x00, 0x00,
    0x00, 0x44, 0x49, 0x44, 0x41, 0x54, 0x38, 0x4F,
    0x63, 0x94, 0xE1, 0xE0, 0x60, 0x60, 0xB8, 0xC0,
    0xC0, 0xC0, 0xF0, 0x1F, 0x08, 0x18, 0x19, 0x19,
    0x19, 0xFE, 0x03, 0x69, 0x06, 0x46, 0x20, 0xCD,
    0x00, 0xA4, 0x19, 0xC1, 0x34, 0x10, 0x30, 0x82,
    0x69, 0x26, 0x20, 0xCD, 0x04, 0xA6, 0x19, 0xC1,
    0x34, 0x23, 0x98, 0x66, 0x02, 0xD3, 0x40, 0xC0,
    0x08, 0xA6, 0x81, 0x00, 0x00, 0x4E, 0x12, 0x07,
    0x01, 0x1D, 0xE1, 0x58, 0xE7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60,
    0x82
  ]);
}

/**
 * 更新托盘菜单
 */
function updateTrayMenu() {
  const state = stateManager.getState();
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide Widget' : 'Show Widget',
      click: () => toggleWindowVisibility()
    },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: state.alwaysOnTop,
      click: () => toggleAlwaysOnTop()
    },
    {
      label: 'Click-through',
      type: 'checkbox',
      checked: state.clickThrough,
      click: () => toggleClickThrough()
    },
    { type: 'separator' },
    {
      label: 'Reset Progress',
      click: () => {
        resetProgress();
        notifyRenderer();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * 切换窗口显示/隐藏
 */
function toggleWindowVisibility() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    updateTrayMenu();
  }
}

/**
 * 切换置顶状态
 */
function toggleAlwaysOnTop() {
  const state = stateManager.getState();
  const newValue = !state.alwaysOnTop;
  
  stateManager.updateState({ alwaysOnTop: newValue });
  
  if (mainWindow) {
    if (newValue) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      mainWindow.setAlwaysOnTop(false);
    }
  }
  
  updateTrayMenu();
  notifyRenderer();
  
  return stateManager.getState();
}

/**
 * 切换点击穿透
 */
function toggleClickThrough() {
  const state = stateManager.getState();
  const newValue = !state.clickThrough;
  
  stateManager.updateState({ clickThrough: newValue });
  
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(newValue, { forward: true });
  }
  
  updateTrayMenu();
  notifyRenderer();
  
  return stateManager.getState();
}

/**
 * 重置进度
 */
function resetProgress(track = 'monthly') {
  const state = stateManager.getState();
  const trackData = state[track];
  
  if (trackData) {
    const updateData = {
      ...trackData,
      current: 0,
      history: []
    };
    
    // 如果重置月度进度，同时恢复到系统当前月份
    if (track === 'monthly') {
      const { year, month } = stateManager.getCurrentYearMonth();
      updateData.year = year;
      updateData.month = month;
    }
    
    stateManager.updateState({
      [track]: updateData
    });
  }
  return stateManager.getState();
}

/**
 * 通知渲染进程状态更新
 */
function notifyRenderer() {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('state-updated', stateManager.getState());
  }
}

/**
 * 注册全局快捷键
 */
function registerGlobalShortcuts() {
  // Ctrl+Shift+P: 显示/隐藏窗口
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    toggleWindowVisibility();
  });

  // Ctrl+Shift+C: 切换点击穿透
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    toggleClickThrough();
  });
}

/**
 * 设置 IPC 处理器
 */
function setupIpcHandlers() {
  // 获取状态
  ipcMain.handle('get-state', () => {
    return stateManager.getState();
  });

  // 更新设置
  ipcMain.handle('update-settings', (event, partial) => {
    // 处理特殊设置项
    if (partial.alwaysOnTop !== undefined && mainWindow) {
      if (partial.alwaysOnTop) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      } else {
        mainWindow.setAlwaysOnTop(false);
      }
    }
    
    if (partial.opacity !== undefined && mainWindow) {
      mainWindow.setOpacity(partial.opacity);
    }
    
    if (partial.clickThrough !== undefined && mainWindow) {
      mainWindow.setIgnoreMouseEvents(partial.clickThrough, { forward: true });
    }
    
    stateManager.updateState(partial);
    updateTrayMenu();
    return stateManager.getState();
  });

  // 添加增量（月度进度会自动累加到年度）
  ipcMain.handle('add-delta', (event, delta, track = 'monthly') => {
    const state = stateManager.getState();
    const trackData = state[track];
    
    if (!trackData) return state;
    
    // 计算新的 current 值
    let newCurrent = trackData.current + delta;
    
    // 月度和年度进度都可以超过 total（允许 Bonus），但不低于 0
    newCurrent = Math.max(0, newCurrent);
    
    // 实际增加的量
    const actualDelta = newCurrent - trackData.current;
    
    // 添加历史记录（最多保留20条）
    const newHistory = [
      { delta: actualDelta, ts: Date.now() },
      ...trackData.history
    ].slice(0, 20);
    
    const updates = {
      [track]: {
        ...trackData,
        current: newCurrent,
        history: newHistory
      }
    };
    
    // 如果是月度进度，同时更新年度进度
    if (track === 'monthly' && actualDelta !== 0) {
      const yearlyData = state.yearly;
      let newYearlyCurrent = yearlyData.current + actualDelta;
      newYearlyCurrent = Math.max(0, newYearlyCurrent);  // 允许超过 total
      
      updates.yearly = {
        ...yearlyData,
        current: newYearlyCurrent,
        history: [
          { delta: actualDelta, ts: Date.now(), fromMonthly: true },
          ...yearlyData.history
        ].slice(0, 20)
      };
    }
    
    stateManager.updateState(updates);
    
    return stateManager.getState();
  });

  // 撤销（月度撤销也会撤销年度）
  ipcMain.handle('undo', (event, track = 'monthly') => {
    const state = stateManager.getState();
    const trackData = state[track];
    
    if (!trackData || trackData.history.length === 0) {
      return state;
    }
    
    // 获取最后一次操作
    const lastAction = trackData.history[0];
    
    // 回退 current
    let newCurrent = trackData.current - lastAction.delta;
    newCurrent = Math.max(0, Math.min(newCurrent, trackData.total));
    
    // 移除最后一条历史
    const newHistory = trackData.history.slice(1);
    
    const updates = {
      [track]: {
        ...trackData,
        current: newCurrent,
        history: newHistory
      }
    };
    
    // 如果是月度进度撤销，同时撤销年度进度
    if (track === 'monthly') {
      const yearlyData = state.yearly;
      let newYearlyCurrent = yearlyData.current - lastAction.delta;
      newYearlyCurrent = Math.max(0, Math.min(newYearlyCurrent, yearlyData.total));
      
      // 移除年度历史中对应的记录
      const newYearlyHistory = yearlyData.history.filter((h, i) => {
        if (i === 0 && h.fromMonthly && Math.abs(h.ts - lastAction.ts) < 1000) {
          return false;
        }
        return true;
      });
      
      updates.yearly = {
        ...yearlyData,
        current: newYearlyCurrent,
        history: newYearlyHistory
      };
    }
    
    stateManager.updateState(updates);
    
    return stateManager.getState();
  });

  // 重置
  ipcMain.handle('reset', (event, track = 'monthly') => {
    const state = stateManager.getState();
    const trackData = state[track];
    
    if (!trackData) return state;
    
    const updateData = {
      ...trackData,
      current: 0,
      history: []
    };
    
    // 如果重置月度进度，同时恢复到系统当前月份
    if (track === 'monthly') {
      const { year, month } = stateManager.getCurrentYearMonth();
      updateData.year = year;
      updateData.month = month;
    }
    
    stateManager.updateState({
      [track]: updateData
    });
    
    return stateManager.getState();
  });

  // 手动设置 current
  ipcMain.handle('set-current', (event, value, track = 'monthly') => {
    const state = stateManager.getState();
    const trackData = state[track];
    
    if (!trackData) return state;
    
    // 校验并 clamp
    let newCurrent = parseFloat(value);
    if (isNaN(newCurrent)) {
      return state;
    }
    
    newCurrent = Math.max(0, Math.min(newCurrent, trackData.total));
    
    stateManager.updateState({
      [track]: {
        ...trackData,
        current: newCurrent
      }
    });
    
    return stateManager.getState();
  });

  // 开始新的一个月
  ipcMain.handle('start-new-month', () => {
    return stateManager.startNewMonth();
  });

  // 获取月度归档
  ipcMain.handle('get-monthly-archive', () => {
    const state = stateManager.getState();
    return state.monthlyArchive || [];
  });

  // 清除所有历史记录
  ipcMain.handle('clear-history', () => {
    const state = stateManager.getState();
    stateManager.updateState({
      monthlyArchive: [],
      monthly: {
        ...state.monthly,
        history: []
      },
      yearly: {
        ...state.yearly,
        history: []
      }
    });
    return stateManager.getState();
  });

  // 保留年记录（归档当前月度并重置月度进度，保留年度进度）
  ipcMain.handle('keep-yearly-record', () => {
    const state = stateManager.getState();
    const monthly = state.monthly;
    
    // 归档当前月度数据
    const archiveItem = {
      year: monthly.year,
      month: monthly.month,
      title: monthly.title,
      total: monthly.total,
      current: monthly.current,
      completedAt: Date.now()
    };
    
    const newArchive = [archiveItem, ...(state.monthlyArchive || [])];
    
    // 重置月度进度，保留年度进度不变
    stateManager.updateState({
      monthlyArchive: newArchive,
      monthly: {
        ...monthly,
        current: 0,
        history: []
      }
      // 年度进度保持不变
    });
    
    return stateManager.getState();
  });

  // 切换点击穿透
  ipcMain.handle('toggle-click-through', () => {
    return toggleClickThrough();
  });

  // 切换置顶
  ipcMain.handle('toggle-always-on-top', () => {
    return toggleAlwaysOnTop();
  });

  // 窗口拖拽移动
  ipcMain.on('window-move', (event, { deltaX, deltaY }) => {
    if (mainWindow) {
      const state = stateManager.getState();
      if (state.lockPosition) {
        return; // 锁定位置时不允许移动
      }
      
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        x: bounds.x + deltaX,
        y: bounds.y + deltaY,
        width: bounds.width,
        height: bounds.height
      });
    }
  });

  // 关闭窗口（隐藏到托盘）
  ipcMain.on('window-close', () => {
    if (mainWindow) {
      mainWindow.hide();
      updateTrayMenu();
    }
  });

  // 最小化窗口
  ipcMain.on('window-minimize', () => {
    if (mainWindow) {
      mainWindow.hide();
      updateTrayMenu();
    }
  });

  // 调整窗口大小（用于收起/展开效果）
  ipcMain.on('window-resize', (event, { width, height }) => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: width,
        height: height
      });
    }
  });

  // 鼠标悬停检测（用于展开/收起）
  let hoverCheckInterval = null;
  let isWindowExpanded = false;
  let isSettingsOpen = false;
  let lastMouseInside = false;
  const COLLAPSED_HEIGHT = 100;   // 收起时高度（双进度条）
  const EXPANDED_HEIGHT = 220;    // 展开时高度（双进度条 + 输入区）
  const SETTINGS_HEIGHT = 400;    // 设置界面高度
  const WINDOW_WIDTH = 360;

  // 安全调整窗口大小（保持 alwaysOnTop 状态）
  function safeSetBounds(bounds) {
    if (!mainWindow) return;
    const state = stateManager.getState();
    mainWindow.setBounds(bounds);
    // 重新应用 alwaysOnTop 状态（使用 screen-saver 级别）
    if (state.alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }

  ipcMain.on('start-hover-detection', () => {
    if (hoverCheckInterval) return;
    
    hoverCheckInterval = setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      
      const cursorPos = screen.getCursorScreenPoint();
      const windowBounds = mainWindow.getBounds();
      
      // 检查鼠标是否在窗口区域内（使用展开后的高度区域）
      const checkHeight = isSettingsOpen ? SETTINGS_HEIGHT : EXPANDED_HEIGHT;
      const checkBounds = {
        x: windowBounds.x,
        y: windowBounds.y,
        width: WINDOW_WIDTH,
        height: checkHeight
      };
      
      const isMouseInside = 
        cursorPos.x >= checkBounds.x && 
        cursorPos.x <= checkBounds.x + checkBounds.width &&
        cursorPos.y >= checkBounds.y && 
        cursorPos.y <= checkBounds.y + checkBounds.height;
      
      // 状态变化时才执行操作
      if (isMouseInside !== lastMouseInside) {
        lastMouseInside = isMouseInside;
        
        if (isMouseInside && !isWindowExpanded) {
          // 展开
          isWindowExpanded = true;
          safeSetBounds({
            x: windowBounds.x,
            y: windowBounds.y,
            width: WINDOW_WIDTH,
            height: EXPANDED_HEIGHT
          });
          mainWindow.webContents.send('hover-state-changed', true);
        } else if (!isMouseInside && isWindowExpanded) {
          // 检查是否在设置界面
          mainWindow.webContents.send('check-can-collapse');
        }
      }
    }, 50); // 每50ms检查一次
  });

  ipcMain.on('do-collapse', () => {
    if (mainWindow && isWindowExpanded && !isSettingsOpen) {
      isWindowExpanded = false;
      const bounds = mainWindow.getBounds();
      safeSetBounds({
        x: bounds.x,
        y: bounds.y,
        width: WINDOW_WIDTH,
        height: COLLAPSED_HEIGHT
      });
      mainWindow.webContents.send('hover-state-changed', false);
    }
  });

  // 设置界面打开
  ipcMain.on('settings-opened', () => {
    isSettingsOpen = true;
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      safeSetBounds({
        x: bounds.x,
        y: bounds.y,
        width: WINDOW_WIDTH,
        height: SETTINGS_HEIGHT
      });
    }
  });

  // 设置界面关闭
  ipcMain.on('settings-closed', () => {
    isSettingsOpen = false;
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      // 恢复到展开高度
      safeSetBounds({
        x: bounds.x,
        y: bounds.y,
        width: WINDOW_WIDTH,
        height: EXPANDED_HEIGHT
      });
      isWindowExpanded = true;
      lastMouseInside = true;
    }
  });

  // 强制展开窗口（从设置界面操作后调用）
  ipcMain.on('force-expand', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const targetHeight = isSettingsOpen ? SETTINGS_HEIGHT : EXPANDED_HEIGHT;
      safeSetBounds({
        x: bounds.x,
        y: bounds.y,
        width: WINDOW_WIDTH,
        height: targetHeight
      });
      isWindowExpanded = true;
      lastMouseInside = true;
      mainWindow.webContents.send('hover-state-changed', true);
    }
  });

  ipcMain.on('stop-hover-detection', () => {
    if (hoverCheckInterval) {
      clearInterval(hoverCheckInterval);
      hoverCheckInterval = null;
    }
  });
}

// ==================== App 生命周期 ====================

app.whenReady().then(() => {
  // 初始化状态管理器
  stateManager.init();
  
  // 创建窗口
  createMainWindow();
  
  // 创建托盘
  createTray();
  
  // 注册快捷键
  registerGlobalShortcuts();
  
  // 设置 IPC
  setupIpcHandlers();

  // macOS: 点击 Dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 非 macOS 不退出，保持托盘运行
    // app.quit();
  }
});

// 应用退出前保存状态
app.on('before-quit', () => {
  isQuitting = true;
  stateManager.save();
});

// 应用退出时注销快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 如果尝试启动第二个实例，显示已有窗口
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });
}
