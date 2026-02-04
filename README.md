# 情绪点歌机 Mood Player

概念：**不是选歌，而是选“心情”**。  
流程：选情绪 → 网站自动“点歌” → 页面颜色与背景动效一起变。

## 运行方式（最简单）

- 直接双击打开 `index.html`（用浏览器打开即可）

## 功能点

- 四种情绪：😌 放松 / 💔 失恋 / 🔥 想燃起来 / 🌧 想安静一下
- 随机点歌：同心情下点“换一首”随机换歌（尽量避免连续重复）
- 主题切换：颜色主题与背景粒子动效随心情变化
- 分享直达：复制链接后可用 `?mood=relax|heartbreak|hype|quiet` 直达
- **每个心情独立页面**：  
  - 放松：`index.html?mood=relax` 或 `index.html#relax`  
  - 失恋：`index.html?mood=heartbreak` 或 `index.html#heartbreak`  
  - 想燃起来：`index.html?mood=hype` 或 `index.html#hype`  
  - 想安静一下：`index.html?mood=quiet` 或 `index.html#quiet`  
- **刷新行为**：无 `?mood=` / `#mood` 时始终回到首页；有则打开对应心情页
- 快捷键：
  - `Enter`：播放/暂停
  - `N`：换一首
  - `Esc`：换心情

## 替换成你自己的音乐

在 `script.js` 里找到 `MOODS` 对象，把每个情绪下的 `tracks: [{ title, url }]` 的 `url` 换成：

- 你的本地相对路径（例如 `./assets/relax-1.mp3`），或
- 你自己的可直接访问的音频直链

