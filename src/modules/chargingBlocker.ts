/**
 * Bilibili Charging Video Blocker
 * 
 * 这个模块负责拦截 B 站的“充电专属”视频（付费视频）。
 * 已经重构为遵循单一职责原则 (SRP) 的模块化结构：
 * - ChargingService: 处理 API 调用和缓存管理。
 * - ChargingUI: 处理样式注入和 DOM 视觉操作。
 * - ChargingScanner: 处理页面扫描和并发请求队列。
 */

import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ChargingService } from './charging/ChargingService';
import { ChargingUI } from './charging/ChargingUI';
import { ChargingScanner } from './charging/ChargingScanner';

let currentMode = 'off'; // 'off' | 'mask' | 'hide'
const service = ChargingService.getInstance();
const ui = new ChargingUI();
const scanner = new ChargingScanner(service, ui, currentMode);

/**
 * 启动模块
 */
function start(): void {
  ui.injectStyle();
  scanner.start();
}

/**
 * 停止模块并清理视觉效果
 */
function stop(): void {
  scanner.stop();
  ui.clearVisuals();
}

export const ChargingBlockerModule: Module = {
  init: () => {
    // 1. 加载配置设置
    chrome.storage.sync.get([STORAGE_KEYS.HIDE_CHARGING], (result) => {
      let val = result[STORAGE_KEYS.HIDE_CHARGING];
      
      // 兼容旧版的布尔值配置
      if (typeof val === 'boolean') val = val ? 'hide' : 'off';
      
      // 默认为 'hide'
      currentMode = (val || 'hide') as string;

      scanner.updateMode(currentMode);
      if (currentMode !== 'off') {
        start();
      }
    });

    // 2. 监听配置变化
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[STORAGE_KEYS.HIDE_CHARGING]) {
        let newVal = changes[STORAGE_KEYS.HIDE_CHARGING].newValue;
        
        // 兼容旧版的布尔值配置
        if (typeof newVal === 'boolean') newVal = newVal ? 'hide' : 'off';
        
        currentMode = newVal as string;
        scanner.updateMode(currentMode);

        // 重启以应用新模式（例如从“隐藏”切换到“遮罩”）
        stop();
        if (currentMode !== 'off') {
          start();
        }
      }
    });
  }
};