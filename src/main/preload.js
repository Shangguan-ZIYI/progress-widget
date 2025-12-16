/**
 * Progress Widget - 预加载脚本
 * 在渲染进程中安全地暴露 IPC API
 * contextIsolation: true, nodeIntegration: false
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露给渲染进程的安全 API
 * 通过 window.api 访问
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * 获取当前状态
   * @returns {Promise<State>}
   */
  getState: () => ipcRenderer.invoke('get-state'),

  /**
   * 更新设置
   * @param {Partial<State>} partial - 要更新的设置项
   * @returns {Promise<State>}
   */
  updateSettings: (partial) => ipcRenderer.invoke('update-settings', partial),

  /**
   * 添加增量
   * @param {number} delta - 本次完成量（可为负数）
   * @param {string} track - 进度类型 'monthly' 或 'yearly'
   * @returns {Promise<State>}
   */
  addDelta: (delta, track = 'monthly') => ipcRenderer.invoke('add-delta', delta, track),

  /**
   * 撤销上一次操作
   * @param {string} track - 进度类型 'monthly' 或 'yearly'
   * @returns {Promise<State>}
   */
  undo: (track = 'monthly') => ipcRenderer.invoke('undo', track),

  /**
   * 重置进度
   * @param {string} track - 进度类型 'monthly' 或 'yearly'
   * @returns {Promise<State>}
   */
  reset: (track = 'monthly') => ipcRenderer.invoke('reset', track),

  /**
   * 手动设置当前值
   * @param {number} value - 要设置的值
   * @param {string} track - 进度类型 'monthly' 或 'yearly'
   * @returns {Promise<State>}
   */
  setCurrent: (value, track = 'monthly') => ipcRenderer.invoke('set-current', value, track),

  /**
   * 开始新的一个月
   * @returns {Promise<State>}
   */
  startNewMonth: () => ipcRenderer.invoke('start-new-month'),

  /**
   * 获取月度归档
   * @returns {Promise<Array>}
   */
  getMonthlyArchive: () => ipcRenderer.invoke('get-monthly-archive'),

  /**
   * 清除所有历史记录
   * @returns {Promise<State>}
   */
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  /**
   * 保留年记录（归档当前月度并重置月度进度）
   * @returns {Promise<State>}
   */
  keepYearlyRecord: () => ipcRenderer.invoke('keep-yearly-record'),

  /**
   * 切换点击穿透
   * @returns {Promise<State>}
   */
  toggleClickThrough: () => ipcRenderer.invoke('toggle-click-through'),

  /**
   * 切换置顶
   * @returns {Promise<State>}
   */
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),

  // ==================== 窗口控制 ====================

  /**
   * 移动窗口
   * @param {number} deltaX - X轴移动量
   * @param {number} deltaY - Y轴移动量
   */
  moveWindow: (deltaX, deltaY) => {
    ipcRenderer.send('window-move', { deltaX, deltaY });
  },

  /**
   * 关闭窗口（隐藏到托盘）
   */
  closeWindow: () => {
    ipcRenderer.send('window-close');
  },

  /**
   * 最小化窗口
   */
  minimizeWindow: () => {
    ipcRenderer.send('window-minimize');
  },

  /**
   * 调整窗口大小
   * @param {number} width - 窗口宽度
   * @param {number} height - 窗口高度
   */
  resizeWindow: (width, height) => {
    ipcRenderer.send('window-resize', { width, height });
  },

  // ==================== 悬停检测 ====================

  /**
   * 启动悬停检测
   */
  startHoverDetection: () => {
    ipcRenderer.send('start-hover-detection');
  },

  /**
   * 停止悬停检测
   */
  stopHoverDetection: () => {
    ipcRenderer.send('stop-hover-detection');
  },

  /**
   * 执行收起
   */
  doCollapse: () => {
    ipcRenderer.send('do-collapse');
  },

  /**
   * 通知设置界面打开
   */
  settingsOpened: () => {
    ipcRenderer.send('settings-opened');
  },

  /**
   * 通知设置界面关闭
   */
  settingsClosed: () => {
    ipcRenderer.send('settings-closed');
  },

  /**
   * 强制展开窗口
   */
  forceExpand: () => {
    ipcRenderer.send('force-expand');
  },

  /**
   * 监听悬停状态变化
   * @param {Function} callback - 回调函数
   */
  onHoverStateChanged: (callback) => {
    ipcRenderer.on('hover-state-changed', (event, isExpanded) => {
      callback(isExpanded);
    });
  },

  /**
   * 监听收起检查请求
   * @param {Function} callback - 回调函数
   */
  onCheckCanCollapse: (callback) => {
    ipcRenderer.on('check-can-collapse', () => {
      callback();
    });
  },

  // ==================== 事件监听 ====================

  /**
   * 监听状态更新事件
   * @param {Function} callback - 回调函数
   */
  onStateUpdated: (callback) => {
    ipcRenderer.on('state-updated', (event, state) => {
      callback(state);
    });
  },

  /**
   * 移除状态更新监听
   */
  removeStateUpdatedListener: () => {
    ipcRenderer.removeAllListeners('state-updated');
  }
});
