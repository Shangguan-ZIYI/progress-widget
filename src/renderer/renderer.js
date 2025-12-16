/**
 * Progress Widget - 渲染进程脚本
 * 负责UI交互、状态显示、拖拽功能
 */

// ==================== DOM 元素引用 ====================
const elements = {
  app: document.getElementById('app'),
  titlebar: document.getElementById('titlebar'),
  titleText: document.getElementById('title-text'),
  btnSettings: document.getElementById('btn-settings'),
  btnMinimize: document.getElementById('btn-minimize'),
  btnClose: document.getElementById('btn-close'),
  
  mainView: document.getElementById('main-view'),
  settingsView: document.getElementById('settings-view'),
  historyView: document.getElementById('history-view'),
  
  // 月度进度
  monthlyLabel: document.getElementById('monthly-label'),
  monthIndicator: document.getElementById('month-indicator'),
  monthlyPercent: document.getElementById('monthly-percent'),
  monthlyValues: document.getElementById('monthly-values'),
  monthlyBar: document.getElementById('monthly-bar'),
  monthlyBonus: document.getElementById('monthly-bonus'),
  
  // 年度进度
  yearlyLabel: document.getElementById('yearly-label'),
  yearlyPercent: document.getElementById('yearly-percent'),
  yearlyValues: document.getElementById('yearly-values'),
  yearlyBar: document.getElementById('yearly-bar'),
  yearlyBonus: document.getElementById('yearly-bonus'),
  
  // 输入区
  deltaInput: document.getElementById('delta-input'),
  btnAdd: document.getElementById('btn-add'),
  btnUndo: document.getElementById('btn-undo'),
  btnHistory: document.getElementById('btn-history'),
  
  toast: document.getElementById('toast'),
  
  // 历史界面
  historyList: document.getElementById('history-list'),
  btnHistoryBack: document.getElementById('btn-history-back'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnKeepYearly: document.getElementById('btn-keep-yearly'),
  
  // 确认对话框
  confirmDialog: document.getElementById('confirm-dialog'),
  confirmMessage: document.getElementById('confirm-message'),
  btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
  btnConfirmOk: document.getElementById('btn-confirm-ok'),
  
  // 设置界面元素
  currentMonthDisplay: document.getElementById('current-month-display'),
  btnNewMonth: document.getElementById('btn-new-month'),
  settingAutoNewMonth: document.getElementById('setting-auto-new-month'),
  settingTrackSelect: document.getElementById('setting-track-select'),
  settingTitle: document.getElementById('setting-title'),
  settingTotal: document.getElementById('setting-total'),
  settingCurrent: document.getElementById('setting-current'),
  btnSetCurrent: document.getElementById('btn-set-current'),
  settingAlwaysOnTop: document.getElementById('setting-always-on-top'),
  settingLockPosition: document.getElementById('setting-lock-position'),
  settingClickThrough: document.getElementById('setting-click-through'),
  settingOpacity: document.getElementById('setting-opacity'),
  opacityValue: document.getElementById('opacity-value'),
  btnThemeDark: document.getElementById('btn-theme-dark'),
  btnThemeLight: document.getElementById('btn-theme-light'),
  btnReset: document.getElementById('btn-reset'),
  btnBack: document.getElementById('btn-back')
};

// ==================== 当前状态 ====================
let currentState = null;
let toastTimer = null;
let confirmResolve = null;  // 用于确认对话框的 Promise

// ==================== 自定义确认对话框 ====================

/**
 * 显示确认对话框
 * @param {string} message - 确认消息
 * @returns {Promise<boolean>} - 用户选择结果
 */
function showConfirm(message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    elements.confirmMessage.textContent = message;
    elements.confirmDialog.classList.remove('hidden');
  });
}

/**
 * 隐藏确认对话框
 */
function hideConfirm() {
  elements.confirmDialog.classList.add('hidden');
  confirmResolve = null;
}

// ==================== 初始化 ====================
async function init() {
  // 默认收起状态
  elements.app.classList.add('collapsed');
  
  // 加载状态
  currentState = await window.api.getState();
  
  // 更新UI
  updateUI(currentState);
  
  // 绑定事件
  bindEvents();
  
  // 绑定鼠标悬停事件（由主进程检测）
  bindHoverEvents();
  
  // 监听主进程状态更新
  window.api.onStateUpdated((state) => {
    currentState = state;
    updateUI(state);
  });
}

// ==================== UI 更新 ====================

/**
 * 更新整个UI
 * @param {Object} state - 当前状态
 */
function updateUI(state) {
  if (!state) return;
  
  // 更新主题（保持collapsed、settings-open和history-open状态）
  const isCollapsed = elements.app.classList.contains('collapsed');
  const isSettingsOpen = elements.app.classList.contains('settings-open');
  const isHistoryOpen = elements.app.classList.contains('history-open');
  elements.app.className = `theme-${state.theme}`;
  if (isCollapsed) elements.app.classList.add('collapsed');
  if (isSettingsOpen) elements.app.classList.add('settings-open');
  if (isHistoryOpen) elements.app.classList.add('history-open');
  
  // 更新标题栏（显示月度标题）
  elements.titleText.textContent = state.monthly?.title || '进度小部件';
  
  // 更新月度进度显示
  updateProgress('monthly', state.monthly);
  
  // 更新年度进度显示
  updateProgress('yearly', state.yearly);
  
  // 更新设置界面
  updateSettingsUI(state);
}

/**
 * 更新进度条和数值显示
 * @param {string} track - 进度类型 'monthly' 或 'yearly'
 * @param {Object} trackData - 进度数据
 */
function updateProgress(track, trackData) {
  if (!trackData) return;
  
  const { current, total, title, month } = trackData;
  
  // 计算百分比
  const percent = total > 0 ? (current / total) * 100 : 0;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  
  if (track === 'monthly') {
    elements.monthlyLabel.textContent = title;
    // 更新月份指示器
    if (month && elements.monthIndicator) {
      elements.monthIndicator.textContent = `${month}月`;
    }
    
    // 月度进度支持超过100%显示 Bonus
    if (percent > 100) {
      const bonusPercent = (percent - 100).toFixed(1);
      elements.monthlyPercent.textContent = `100%`;
      // 在进度条旁边显示 Bonus
      if (elements.monthlyBonus) {
        elements.monthlyBonus.textContent = `Bonus +${bonusPercent}%`;
        elements.monthlyBonus.classList.remove('hidden');
      }
    } else {
      elements.monthlyPercent.textContent = `${clampedPercent.toFixed(1)}%`;
      // 隐藏 Bonus
      if (elements.monthlyBonus) {
        elements.monthlyBonus.classList.add('hidden');
      }
    }
    
    // 显示实际值（不截断，如 200/100）
    elements.monthlyValues.textContent = `${formatNumber(current)} / ${formatNumber(total)}`;
    elements.monthlyBar.style.width = `${clampedPercent}%`;
    
    if (percent >= 100) {
      elements.monthlyBar.classList.add('complete');
    } else {
      elements.monthlyBar.classList.remove('complete');
    }
  } else if (track === 'yearly') {
    elements.yearlyLabel.textContent = title;
    
    // 年度进度支持超过100%显示 Bonus
    if (percent > 100) {
      const bonusPercent = (percent - 100).toFixed(1);
      elements.yearlyPercent.textContent = `100%`;
      // 在进度条旁边显示 Bonus
      if (elements.yearlyBonus) {
        elements.yearlyBonus.textContent = `Bonus +${bonusPercent}%`;
        elements.yearlyBonus.classList.remove('hidden');
      }
    } else {
      elements.yearlyPercent.textContent = `${clampedPercent.toFixed(1)}%`;
      // 隐藏 Bonus
      if (elements.yearlyBonus) {
        elements.yearlyBonus.classList.add('hidden');
      }
    }
    
    elements.yearlyValues.textContent = `${formatNumber(current)} / ${formatNumber(total)}`;
    elements.yearlyBar.style.width = `${clampedPercent}%`;
    
    if (percent >= 100) {
      elements.yearlyBar.classList.add('complete');
    } else {
      elements.yearlyBar.classList.remove('complete');
    }
  }
}

/**
 * 更新设置界面UI
 * @param {Object} state - 当前状态
 */
function updateSettingsUI(state) {
  // 更新当前月份显示
  if (state.monthly && elements.currentMonthDisplay) {
    const { year, month } = state.monthly;
    elements.currentMonthDisplay.textContent = `${year}年${month}月`;
  }
  
  // 更新自动新月开关
  if (elements.settingAutoNewMonth) {
    elements.settingAutoNewMonth.checked = state.autoNewMonth !== false;
  }
  
  // 获取当前选中的 track
  const selectedTrack = elements.settingTrackSelect?.value || 'monthly';
  const trackData = state[selectedTrack];
  
  if (trackData) {
    elements.settingTitle.value = trackData.title || '';
    elements.settingTotal.value = trackData.total || 100;
    elements.settingCurrent.value = trackData.current || 0;
  }
  
  elements.settingAlwaysOnTop.checked = state.alwaysOnTop;
  elements.settingLockPosition.checked = state.lockPosition;
  elements.settingClickThrough.checked = state.clickThrough;
  elements.settingOpacity.value = Math.round(state.opacity * 100);
  elements.opacityValue.textContent = `${Math.round(state.opacity * 100)}%`;
  
  // 更新主题按钮状态
  elements.btnThemeDark.classList.toggle('active', state.theme === 'dark');
  elements.btnThemeLight.classList.toggle('active', state.theme === 'light');
}

/**
 * 格式化数字显示
 * @param {number} num - 数字
 * @returns {string}
 */
function formatNumber(num) {
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return num.toFixed(1);
}

// ==================== 事件绑定 ====================

function bindEvents() {
  // 窗口控制按钮
  elements.btnSettings.addEventListener('click', () => {
    showSettings();
  });
  
  elements.btnMinimize.addEventListener('click', () => {
    window.api.minimizeWindow();
  });
  
  elements.btnClose.addEventListener('click', () => {
    window.api.closeWindow();
  });
  
  // 添加操作（只添加到月度，自动同步到年度）
  elements.btnAdd.addEventListener('click', () => {
    handleAdd();
  });
  
  // Enter 键提交
  elements.deltaInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  });
  
  // 撤销（只撤销月度，自动同步撤销年度）
  elements.btnUndo.addEventListener('click', async () => {
    const trackData = currentState.monthly;
    
    if (!trackData || trackData.history.length === 0) {
      showToast('没有可撤销的操作', 'error');
      return;
    }
    currentState = await window.api.undo('monthly');
    updateUI(currentState);
    showToast('已撤销');
  });
  
  // 查看历史
  elements.btnHistory.addEventListener('click', () => {
    showHistory();
  });
  
  // 确认对话框按钮
  elements.btnConfirmCancel.addEventListener('click', () => {
    if (confirmResolve) {
      confirmResolve(false);
    }
    hideConfirm();
  });
  
  elements.btnConfirmOk.addEventListener('click', () => {
    if (confirmResolve) {
      confirmResolve(true);
    }
    hideConfirm();
  });
  
  // 设置界面事件
  bindSettingsEvents();
  
  // 历史界面事件
  bindHistoryEvents();
  
  // 拖拽事件
  bindDragEvents();
}

/**
 * 绑定设置界面事件
 */
function bindSettingsEvents() {
  // 返回主界面
  elements.btnBack.addEventListener('click', () => {
    hideSettings();
  });
  
  // 开始新月
  elements.btnNewMonth.addEventListener('click', async () => {
    const confirmed = await showConfirm('确定要开始新的一个月吗？当前月度进度将被归档。');
    if (confirmed) {
      currentState = await window.api.startNewMonth();
      updateUI(currentState);
      showToast('已开始新的月度');
    }
  });
  
  // 自动新月开关
  elements.settingAutoNewMonth.addEventListener('change', async () => {
    currentState = await window.api.updateSettings({ 
      autoNewMonth: elements.settingAutoNewMonth.checked 
    });
    updateUI(currentState);
  });
  
  // 切换设置的进度类型
  elements.settingTrackSelect.addEventListener('change', () => {
    updateSettingsUI(currentState);
  });
  
  // 标题更改
  elements.settingTitle.addEventListener('change', async () => {
    const selectedTrack = elements.settingTrackSelect.value;
    const title = elements.settingTitle.value.trim() || (selectedTrack === 'monthly' ? '月度进度' : '年度进度');
    currentState = await window.api.updateSettings({ 
      [selectedTrack]: { 
        ...currentState[selectedTrack],
        title 
      } 
    });
    updateUI(currentState);
  });
  
  // 目标值更改
  elements.settingTotal.addEventListener('change', async () => {
    const selectedTrack = elements.settingTrackSelect.value;
    const total = parseFloat(elements.settingTotal.value);
    if (isNaN(total) || total <= 0) {
      showToast('目标值必须大于0', 'error');
      elements.settingTotal.value = currentState[selectedTrack].total;
      return;
    }
    currentState = await window.api.updateSettings({ 
      [selectedTrack]: { 
        ...currentState[selectedTrack],
        total 
      } 
    });
    updateUI(currentState);
    showToast('目标值已更新');
  });
  
  // 手动设置当前值
  elements.btnSetCurrent.addEventListener('click', async () => {
    const selectedTrack = elements.settingTrackSelect.value;
    const value = parseFloat(elements.settingCurrent.value);
    if (isNaN(value)) {
      showToast('无效的数值', 'error');
      return;
    }
    currentState = await window.api.setCurrent(value, selectedTrack);
    updateUI(currentState);
    showToast('当前值已设置');
  });
  
  // Always on top
  elements.settingAlwaysOnTop.addEventListener('change', async () => {
    currentState = await window.api.updateSettings({ 
      alwaysOnTop: elements.settingAlwaysOnTop.checked 
    });
    updateUI(currentState);
  });
  
  // Lock position
  elements.settingLockPosition.addEventListener('change', async () => {
    currentState = await window.api.updateSettings({ 
      lockPosition: elements.settingLockPosition.checked 
    });
    updateUI(currentState);
  });
  
  // Click-through
  elements.settingClickThrough.addEventListener('change', async () => {
    currentState = await window.api.updateSettings({ 
      clickThrough: elements.settingClickThrough.checked 
    });
    updateUI(currentState);
    if (currentState.clickThrough) {
      showToast('使用 Ctrl+Shift+T 关闭', 'info');
    }
  });
  
  // Opacity
  elements.settingOpacity.addEventListener('input', async () => {
    const opacity = parseInt(elements.settingOpacity.value) / 100;
    elements.opacityValue.textContent = `${elements.settingOpacity.value}%`;
    currentState = await window.api.updateSettings({ opacity });
  });
  
  // Theme buttons
  elements.btnThemeDark.addEventListener('click', async () => {
    currentState = await window.api.updateSettings({ theme: 'dark' });
    updateUI(currentState);
  });
  
  elements.btnThemeLight.addEventListener('click', async () => {
    currentState = await window.api.updateSettings({ theme: 'light' });
    updateUI(currentState);
  });
  
  // Reset（重置当前选中的进度）
  elements.btnReset.addEventListener('click', async () => {
    const selectedTrack = elements.settingTrackSelect.value;
    const trackName = selectedTrack === 'monthly' ? '月度' : '年度';
    const confirmed = await showConfirm(`确定要重置${trackName}进度为0并清除历史记录吗？`);
    if (confirmed) {
      currentState = await window.api.reset(selectedTrack);
      updateUI(currentState);
      showToast('进度已重置');
    }
  });
}

/**
 * 绑定历史界面事件
 */
function bindHistoryEvents() {
  // 返回主界面
  elements.btnHistoryBack.addEventListener('click', () => {
    hideHistory();
  });
  
  // 清除历史记录
  elements.btnClearHistory.addEventListener('click', async () => {
    const confirmed = await showConfirm('确定要清除所有历史记录吗？此操作不可撤销。');
    if (confirmed) {
      currentState = await window.api.clearHistory();
      updateUI(currentState);
      showHistory(); // 刷新历史列表
      showToast('历史记录已清除');
    }
  });
  
  // 保留年记录
  elements.btnKeepYearly.addEventListener('click', async () => {
    const confirmed = await showConfirm('确定要归档当前月度并重置吗？年度进度将保留。');
    if (confirmed) {
      currentState = await window.api.keepYearlyRecord();
      updateUI(currentState);
      showHistory(); // 刷新历史列表
      showToast('月度已归档，年度进度保留');
    }
  });
}

/**
 * 绑定拖拽事件
 */
function bindDragEvents() {
  let isDragging = false;
  let startX, startY;
  
  elements.titlebar.addEventListener('mousedown', (e) => {
    // 如果位置被锁定，不允许拖拽
    if (currentState && currentState.lockPosition) {
      return;
    }
    
    // 不在按钮上才允许拖拽
    if (e.target.closest('.titlebar-buttons')) {
      return;
    }
    
    isDragging = true;
    startX = e.screenX;
    startY = e.screenY;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.screenX - startX;
    const deltaY = e.screenY - startY;
    
    if (deltaX !== 0 || deltaY !== 0) {
      window.api.moveWindow(deltaX, deltaY);
      startX = e.screenX;
      startY = e.screenY;
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

/**
 * 绑定鼠标悬停事件（展开/收起窗口）
 * 使用主进程检测鼠标位置，避免窗口大小变化导致的闪烁
 */
function bindHoverEvents() {
  // 启动主进程的悬停检测
  window.api.startHoverDetection();
  
  // 监听悬停状态变化
  window.api.onHoverStateChanged((isExpanded) => {
    // 主进程已经处理了窗口大小，这里只需要更新 UI 状态
    if (isExpanded) {
      elements.app.classList.remove('collapsed');
    } else {
      elements.app.classList.add('collapsed');
    }
  });
  
  // 监听收起检查请求
  window.api.onCheckCanCollapse(() => {
    // 如果设置界面打开，不收起
    if (elements.app.classList.contains('settings-open')) {
      return;
    }
    // 立即收起
    window.api.doCollapse();
  });
}

// ==================== 操作处理 ====================

/**
 * 处理添加操作
 */
async function handleAdd() {
  const inputValue = elements.deltaInput.value.trim();
  
  // 验证输入
  if (inputValue === '') {
    showToast('请输入数值', 'error');
    elements.deltaInput.focus();
    return;
  }
  
  const delta = parseFloat(inputValue);
  
  if (isNaN(delta)) {
    showToast('无效的数字', 'error');
    elements.deltaInput.focus();
    return;
  }
  
  // 始终添加到月度进度（会自动同步到年度进度）
  currentState = await window.api.addDelta(delta, 'monthly');
  updateUI(currentState);
  
  // 清空输入框
  elements.deltaInput.value = '';
  elements.deltaInput.focus();
  
  // 显示反馈
  const sign = delta >= 0 ? '+' : '';
  showToast(`${sign}${formatNumber(delta)} (月度+年度同步)`);
}

// ==================== 视图切换 ====================

/**
 * 显示设置界面
 */
function showSettings() {
  elements.app.classList.add('settings-open');
  elements.app.classList.remove('collapsed');
  elements.mainView.classList.add('hidden');
  elements.settingsView.classList.remove('hidden');
  // 通知主进程设置界面打开，调整窗口高度
  window.api.settingsOpened();
  updateSettingsUI(currentState);
}

/**
 * 隐藏设置界面
 */
function hideSettings() {
  elements.app.classList.remove('settings-open');
  elements.settingsView.classList.add('hidden');
  elements.mainView.classList.remove('hidden');
  // 通知主进程设置界面关闭，恢复窗口高度
  window.api.settingsClosed();
  elements.deltaInput.focus();
}

// ==================== 历史记录视图 ====================

/**
 * 显示历史记录视图
 */
async function showHistory() {
  const archive = await window.api.getMonthlyArchive();
  
  // 渲染历史记录列表
  if (archive && archive.length > 0) {
    elements.historyList.innerHTML = archive.map(item => {
      const percent = item.total > 0 ? (item.current / item.total * 100).toFixed(1) : 0;
      return `
        <div class="history-item">
          <div class="history-item-date">${item.year}年${item.month}月</div>
          <div class="history-item-progress">
            <span class="history-item-values">${formatNumber(item.current)} / ${formatNumber(item.total)}</span>
            <span class="history-item-percent">${percent}%</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    elements.historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
  }
  
  // 切换视图
  elements.app.classList.add('history-open');
  elements.app.classList.remove('collapsed');
  elements.mainView.classList.add('hidden');
  elements.historyView.classList.remove('hidden');
  
  // 通知主进程调整窗口高度（使用设置界面的高度）
  window.api.settingsOpened();
}

/**
 * 隐藏历史记录视图
 */
function hideHistory() {
  elements.app.classList.remove('history-open');
  elements.historyView.classList.add('hidden');
  elements.mainView.classList.remove('hidden');
  // 通知主进程恢复窗口高度
  window.api.settingsClosed();
  elements.deltaInput.focus();
}

// ==================== Toast 提示 ====================

/**
 * 显示 Toast 提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型 ('info' | 'error')
 */
function showToast(message, type = 'info') {
  // 清除之前的定时器
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  
  elements.toast.textContent = message;
  elements.toast.className = 'toast show';
  
  if (type === 'error') {
    elements.toast.classList.add('error');
  }
  
  // 2秒后隐藏
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2000);
}

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', init);
