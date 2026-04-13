# CONTEXT.md

## 当前进度
- 已完成全工程网站元素选择器的抽象与重构。
- 修复了时长筛选功能在重构后因选择器范围过广导致的误隐藏问题。
- 已统一管理 `selectors.ts` 和 `dom.ts`。

## 上次停点
- 完成了对 `durationFilter.ts`、`ChargingUI.ts`、`coverPreview.ts`、`ThumbnailFavButton.ts` 和 `toolbarManager.ts` 的重构与验证。

## 近期关键决定
- **选择器分层**：将 `VIDEO_CARD` 选择器拆分为 `ENTITY`（扫描专用）和 `ANCESTORS`（向上查找专用），解决了 `durationFilter` 误伤父容器的问题。
- 封装了 `findTitleInCard` 和 `extractBvid` 等通用工具，提高了新功能的开发效率和代码复用性。
