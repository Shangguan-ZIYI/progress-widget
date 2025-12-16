/**
 * Progress Widget - 状态管理模块
 * 负责数据持久化、状态校验、默认值处理
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

// 状态版本号（用于未来的版本兼容）
const STATE_VERSION = 3;  // 版本升级支持月度历史

/**
 * 获取当前年月
 */
function getCurrentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1  // 1-12
  };
}

// 默认状态
const DEFAULT_STATE = {
  version: STATE_VERSION,
  
  // 当前月度进度
  monthly: {
    title: '月度进度',
    total: 100,
    current: 0,
    history: [],
    year: getCurrentYearMonth().year,
    month: getCurrentYearMonth().month
  },
  
  // 年度进度
  yearly: {
    title: '年度进度',
    total: 1000,
    current: 0,
    history: [],
    year: getCurrentYearMonth().year
  },
  
  // 历史月度记录
  monthlyArchive: [],  // [{year, month, title, total, current, completedAt}]
  
  // 自动开始新月
  autoNewMonth: true,
  
  alwaysOnTop: true,
  lockPosition: false,
  clickThrough: false,
  opacity: 1.0,
  theme: 'dark',
  windowBounds: {
    x: null,
    y: null,
    width: 360,
    height: 180
  }
};

// 当前状态
let currentState = null;

// 状态文件路径
let stateFilePath = null;

/**
 * 获取状态文件路径
 * @returns {string}
 */
function getStateFilePath() {
  if (!stateFilePath) {
    const userDataPath = app.getPath('userData');
    stateFilePath = path.join(userDataPath, 'state.json');
  }
  return stateFilePath;
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * 校验单个进度 track（monthly 或 yearly）
 * @param {Object} track - 进度数据
 * @param {Object} defaultTrack - 默认进度数据
 * @param {boolean} allowExceedTotal - 是否允许 current 超过 total（月度进度允许）
 * @returns {Object} - 校验后的进度数据
 */
function validateTrack(track, defaultTrack, allowExceedTotal = false) {
  if (!track || typeof track !== 'object') {
    return { ...defaultTrack };
  }
  
  const validated = { ...track };
  
  // 校验 title
  if (typeof validated.title !== 'string' || validated.title.trim() === '') {
    validated.title = defaultTrack.title;
  }
  
  // 校验 total（必须大于 0）
  if (typeof validated.total !== 'number' || validated.total <= 0 || isNaN(validated.total)) {
    validated.total = defaultTrack.total;
  }
  
  // 校验 current（月度允许超过 total，年度不允许）
  if (typeof validated.current !== 'number' || isNaN(validated.current)) {
    validated.current = 0;
  }
  if (allowExceedTotal) {
    // 月度进度：只限制下限为 0
    validated.current = Math.max(0, validated.current);
  } else {
    // 年度进度：限制在 0 到 total 之间
    validated.current = Math.max(0, Math.min(validated.current, validated.total));
  }
  
  // 校验 history（数组，最多20条）
  if (!Array.isArray(validated.history)) {
    validated.history = [];
  } else {
    validated.history = validated.history.slice(0, 20).filter(item => {
      return item && typeof item.delta === 'number' && typeof item.ts === 'number';
    });
  }
  
  return validated;
}

/**
 * 校验并修正状态
 * @param {Object} state - 要校验的状态
 * @returns {Object} - 校验后的状态
 */
function validateState(state) {
  const validated = { ...state };

  // 校验 version
  if (typeof validated.version !== 'number') {
    validated.version = STATE_VERSION;
  }

  // 迁移旧版本数据（v1 -> v2）
  if (validated.version < 2 && validated.total !== undefined) {
    // 将旧的单进度数据迁移到 monthly
    validated.monthly = {
      title: validated.title || DEFAULT_STATE.monthly.title,
      total: validated.total,
      current: validated.current || 0,
      history: validated.history || []
    };
    validated.yearly = { ...DEFAULT_STATE.yearly };
    // 清理旧字段
    delete validated.title;
    delete validated.total;
    delete validated.current;
    delete validated.history;
    validated.version = STATE_VERSION;
  }

  // 校验月度进度（允许超过 total）
  validated.monthly = validateTrack(validated.monthly, DEFAULT_STATE.monthly, true);
  
  // 校验年度进度（允许超过 total）
  validated.yearly = validateTrack(validated.yearly, DEFAULT_STATE.yearly, true);

  // 校验布尔值
  validated.alwaysOnTop = Boolean(validated.alwaysOnTop);
  validated.lockPosition = Boolean(validated.lockPosition);
  validated.clickThrough = Boolean(validated.clickThrough);

  // 校验 opacity（0.3 ~ 1.0）
  if (typeof validated.opacity !== 'number' || isNaN(validated.opacity)) {
    validated.opacity = DEFAULT_STATE.opacity;
  }
  validated.opacity = Math.max(0.3, Math.min(1.0, validated.opacity));

  // 校验 theme
  if (validated.theme !== 'dark' && validated.theme !== 'light') {
    validated.theme = DEFAULT_STATE.theme;
  }

  // 校验 windowBounds
  if (!validated.windowBounds || typeof validated.windowBounds !== 'object') {
    validated.windowBounds = { ...DEFAULT_STATE.windowBounds };
  } else {
    validated.windowBounds = {
      x: validated.windowBounds.x,
      y: validated.windowBounds.y,
      width: validated.windowBounds.width || DEFAULT_STATE.windowBounds.width,
      height: validated.windowBounds.height || DEFAULT_STATE.windowBounds.height
    };
  }

  // 校验 monthlyArchive
  if (!Array.isArray(validated.monthlyArchive)) {
    validated.monthlyArchive = [];
  }

  // 校验 autoNewMonth
  if (typeof validated.autoNewMonth !== 'boolean') {
    validated.autoNewMonth = true;
  }

  // 添加年月信息（如果缺失）
  const { year, month } = getCurrentYearMonth();
  if (!validated.monthly.year) validated.monthly.year = year;
  if (!validated.monthly.month) validated.monthly.month = month;
  if (!validated.yearly.year) validated.yearly.year = year;

  return validated;
}

/**
 * 从文件加载状态
 * @returns {Object}
 */
function loadFromFile() {
  try {
    const filePath = getStateFilePath();
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      
      // 合并默认值和加载的值
      const merged = deepMerge(DEFAULT_STATE, parsed);
      
      // 校验并返回
      return validateState(merged);
    }
  } catch (error) {
    console.error('Failed to load state from file:', error);
  }
  
  // 返回默认状态
  return { ...DEFAULT_STATE };
}

/**
 * 保存状态到文件
 * @param {Object} state - 要保存的状态
 */
function saveToFile(state) {
  try {
    const filePath = getStateFilePath();
    const dirPath = path.dirname(filePath);
    
    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save state to file:', error);
  }
}

// ==================== 导出的 API ====================

/**
 * 初始化状态管理器
 */
function init() {
  currentState = loadFromFile();
  
  // 检查是否需要自动开始新月
  checkAndStartNewMonth();
  
  console.log('State manager initialized:', currentState);
}

/**
 * 检查是否需要开始新月
 * 只有当系统月份超过记录月份时才自动开始新月
 */
function checkAndStartNewMonth() {
  if (!currentState || !currentState.autoNewMonth) return;
  
  const { year: sysYear, month: sysMonth } = getCurrentYearMonth();
  const currentMonthly = currentState.monthly;
  const recYear = currentMonthly.year;
  const recMonth = currentMonthly.month;
  
  // 只有当系统日期超过记录日期时才触发
  // 比如记录是2025年12月，系统是2026年1月，才触发
  const sysTotal = sysYear * 12 + sysMonth;
  const recTotal = recYear * 12 + recMonth;
  
  if (sysTotal > recTotal) {
    // 系统月份超过记录月份，开始新月（设置为系统当前月份）
    startNewMonthToCurrentDate();
  }
}

/**
 * 获取下一个月的年月
 */
function getNextYearMonth() {
  const currentMonthly = currentState ? currentState.monthly : null;
  if (currentMonthly && currentMonthly.year && currentMonthly.month) {
    // 基于当前月度记录计算下个月
    let nextMonth = currentMonthly.month + 1;
    let nextYear = currentMonthly.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    return { year: nextYear, month: nextMonth };
  }
  // 如果没有记录，使用当前日期的下个月
  const now = new Date();
  let nextMonth = now.getMonth() + 2; // getMonth() 是 0-11，+2 得到下个月的 1-12
  let nextYear = now.getFullYear();
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}

/**
 * 自动开始新月（设置为系统当前月份）
 * 用于自动检测时
 */
function startNewMonthToCurrentDate() {
  if (!currentState) init();
  
  const { year, month } = getCurrentYearMonth();
  const oldMonthly = currentState.monthly;
  
  // 归档当前月度数据
  const archive = {
    year: oldMonthly.year,
    month: oldMonthly.month,
    title: oldMonthly.title,
    total: oldMonthly.total,
    current: oldMonthly.current,
    completedAt: Date.now()
  };
  
  // 添加到归档（最多保留24个月）
  const newArchive = [archive, ...currentState.monthlyArchive].slice(0, 24);
  
  // 重置月度进度，设置为系统当前月份
  currentState.monthly = {
    title: oldMonthly.title,
    total: oldMonthly.total,
    current: 0,
    history: [],
    year: year,
    month: month
  };
  
  currentState.monthlyArchive = newArchive;
  
  saveToFile(currentState);
  
  return { ...currentState };
}

/**
 * 开始新的一个月
 * @returns {Object} - 更新后的状态
 */
function startNewMonth() {
  if (!currentState) init();
  
  const { year: nextYear, month: nextMonth } = getNextYearMonth();
  const oldMonthly = currentState.monthly;
  
  // 归档当前月度数据
  const archive = {
    year: oldMonthly.year,
    month: oldMonthly.month,
    title: oldMonthly.title,
    total: oldMonthly.total,
    current: oldMonthly.current,
    completedAt: Date.now()
  };
  
  // 添加到归档（最多保留24个月）
  const newArchive = [archive, ...currentState.monthlyArchive].slice(0, 24);
  
  // 重置月度进度，保留目标值，设置为下个月
  currentState.monthly = {
    title: oldMonthly.title,
    total: oldMonthly.total,
    current: 0,
    history: [],
    year: nextYear,
    month: nextMonth
  };
  
  currentState.monthlyArchive = newArchive;
  
  saveToFile(currentState);
  
  return { ...currentState };
}

/**
 * 获取当前状态
 * @returns {Object}
 */
function getState() {
  if (!currentState) {
    init();
  }
  return { ...currentState };
}

/**
 * 更新状态
 * @param {Object} partial - 要更新的部分状态
 * @returns {Object} - 更新后的完整状态
 */
function updateState(partial) {
  if (!currentState) {
    init();
  }
  
  // 合并状态
  currentState = deepMerge(currentState, partial);
  
  // 校验
  currentState = validateState(currentState);
  
  // 保存到文件
  saveToFile(currentState);
  
  return { ...currentState };
}

/**
 * 手动保存当前状态
 */
function save() {
  if (currentState) {
    saveToFile(currentState);
  }
}

/**
 * 重置为默认状态
 * @returns {Object}
 */
function resetToDefault() {
  currentState = { ...DEFAULT_STATE };
  saveToFile(currentState);
  return { ...currentState };
}

module.exports = {
  init,
  getState,
  updateState,
  save,
  resetToDefault,
  startNewMonth,
  getCurrentYearMonth,
  DEFAULT_STATE
};
