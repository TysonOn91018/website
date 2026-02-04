/* 情绪点歌机 Mood Player
 * - 选心情 → 随机点歌
 * - 主题切换：颜色 + 背景粒子动效
 * - 每个心情独立“页面”：index.html?mood=relax | heartbreak | hype | quiet（或 #relax 等）
 * - 刷新：无 mood 时回首页；有 ?mood= 或 #mood 时打开对应心情页
 */

// 音频路径：GitHub Pages 会部署在子路径（如 /repo-name/），需用当前路径拼出 URL
function getAssetPath(filename) {
  const base = location.pathname.replace(/\/[^/]*$/, "") || ".";
  return base === "." ? filename : base + "/" + filename;
}
const TRACK_FILE = "chill 01.mp3";
const TRACK_URL = getAssetPath(TRACK_FILE);

const MOODS = {
  relax: {
    tag: "😌 放松",
    copy: ["放轻松，先深呼吸一下。", "把肩膀放下来，今天也辛苦了。", "这首歌，送给需要休息的你。"],
    particles: { speed: 0.35, drift: 0.25, size: [1.2, 3.2], count: 56 },
    tracks: [{ title: "夜に溶けるまま", url: getAssetPath(TRACK_FILE) }],
  },
  heartbreak: {
    tag: "💔 失恋",
    copy: ["没关系，先难过一会儿也可以。", "我懂，你不需要解释。", "听完这首，再决定要不要原谅今天。"],
    particles: { speed: 0.55, drift: 0.18, size: [1.0, 2.6], count: 70 },
    tracks: [{ title: "夜に溶けるまま", url: getAssetPath(TRACK_FILE) }],
  },
  hype: {
    tag: "🔥 想燃起来",
    copy: ["把音量调大一点。", "今天就该是主角。", "让心跳替你倒数：3，2，1。"],
    particles: { speed: 1.25, drift: 0.42, size: [1.4, 4.2], count: 92 },
    tracks: [{ title: "夜に溶けるまま", url: getAssetPath(TRACK_FILE) }],
  },
  quiet: {
    tag: "🌧 想安静一下",
    copy: ["安静也很好，世界可以先慢一点。", "就让这一首，陪你走一段路。", "不用说话，音乐会懂。"],
    particles: { speed: 0.45, drift: 0.14, size: [1.0, 2.8], count: 64 },
    tracks: [{ title: "夜に溶けるまま", url: getAssetPath(TRACK_FILE) }],
  },
  love: {
    tag: "💗 恋",
    copy: [
      "想到那个人的时候，心里会不会有点甜？",
      "喜欢一个人，就是总想多看一眼。",
      "这首歌，算是小小的告白练习。"
    ],
    particles: { speed: 0.55, drift: 0.24, size: [1.2, 3.0], count: 70 },
    tracks: [{ title: "夜に溶けるまま", url: getAssetPath(TRACK_FILE) }],
  },
  fun: {
    tag: "🎉 楽し",
    copy: [
      "今天就先别酷了，开心最重要。",
      "跟喜欢的人一起笑一笑，比什么都治愈。",
      "这首歌适合边点头边乱跳。"
    ],
    particles: { speed: 0.9, drift: 0.36, size: [1.4, 3.6], count: 88 },
    tracks: [{ title: "夜に溶けるまま", url: getAssetPath(TRACK_FILE) }],
  },
};

const STORAGE_KEY = "mood-player:lastMood";

/* 同听聊天：需配置 Supabase。在 index.html 中可写 window.MOOD_PLAYER_SUPABASE = { url: '...', anonKey: '...' }; */
const SUPABASE_CONFIG = window.MOOD_PLAYER_SUPABASE || { url: "", anonKey: "" };

const CHAT_USER_KEY = "mood-player:chatUserId";
const CHAT_NAME_KEY = "mood-player:chatUserName";

const els = {
  bgCanvas: document.getElementById("bgCanvas"),
  panel: document.querySelector(".panel"),
  burst: document.getElementById("burst"),
  pickLeft: document.getElementById("pickLeft"),
  pickRight: document.getElementById("pickRight"),
  playerLeft: document.getElementById("playerLeft"),
  playerRight: document.getElementById("playerRight"),
  trackList: document.getElementById("trackList"),
  playlistSub: document.getElementById("playlistSub"),
  leftPill: document.getElementById("leftPill"),
  moodTag: document.getElementById("moodTag"),
  moodCopy: document.getElementById("moodCopy"),
  trackTitle: document.getElementById("trackTitle"),
  playBtn: document.getElementById("playBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  repeatBtn: document.getElementById("repeatBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  volumeMute: document.getElementById("volumeMute"),
  volumeSlider: document.getElementById("volumeSlider"),
  progressBar: document.getElementById("progressBar"),
  chatBtn: document.getElementById("chatBtn"),
  chatPanel: document.getElementById("chatPanel"),
  chatClose: document.getElementById("chatClose"),
  chatMessages: document.getElementById("chatMessages"),
  chatInput: document.getElementById("chatInput"),
  chatSend: document.getElementById("chatSend"),
  backLink: document.getElementById("backLink"),
  backBtn: document.getElementById("backBtn"),
  resetBtn: document.getElementById("resetBtn"),
  shareBtn: document.getElementById("shareBtn"),
  resetBtn2: document.getElementById("resetBtn2"),
  shareBtn2: document.getElementById("shareBtn2"),
  progressInner: document.getElementById("progressInner"),
  timeNow: document.getElementById("timeNow"),
  timeDur: document.getElementById("timeDur"),
  detailArtist: document.getElementById("detailArtist"),
  detailAlbum: document.getElementById("detailAlbum"),
  detailTime: document.getElementById("detailTime"),
  audio: document.getElementById("audio"),
};

let state = {
  mood: null,
  currentTrack: null,
  trackHistory: [],
  repeatMode: "off",
  shuffle: false,
  volumeBeforeMute: 1,
  canChat: false,
  chatRoomId: null,
};

/* ---------------------------
 * UI：切屏
 * --------------------------- */
function showPick() {
  els.playerLeft?.classList.remove("view--active");
  els.playerRight?.classList.remove("view--active");
  els.pickLeft?.classList.add("view--active");
  els.pickRight?.classList.add("view--active");
  document.body.classList.add("is-index");
  document.body.classList.remove("is-player");
  document.body.classList.remove("is-playing");
  bgFX.setBreathing(false);
}

function showPlayer() {
  els.pickLeft?.classList.remove("view--active");
  els.pickRight?.classList.remove("view--active");
  els.playerLeft?.classList.add("view--active");
  els.playerRight?.classList.add("view--active");
  document.body.classList.remove("is-index");
  document.body.classList.add("is-player");
  bgFX.setBreathing(true);
}

/* ---------------------------
 * 业务：选心情 & 点歌
 * --------------------------- */
function setMood(moodKey, { autoplay = true, pushUrl = true, burst = true, burstOrigin = null } = {}) {
  if (!MOODS[moodKey]) return;

  state.mood = moodKey;
  document.body.setAttribute("data-mood", moodKey);
  document.body.classList.remove("is-index");
  localStorage.setItem(STORAGE_KEY, moodKey);

  els.moodTag.textContent = MOODS[moodKey].tag;
  els.moodCopy.textContent = pickRandom(MOODS[moodKey].copy);
  if (els.playlistSub) els.playlistSub.textContent = `Mood: ${MOODS[moodKey].tag}`;
  if (els.leftPill) els.leftPill.textContent = "Now playing";
  if (els.detailArtist) els.detailArtist.textContent = "Mood Player";
  if (els.detailAlbum) els.detailAlbum.textContent = `Album: ${moodKey.toUpperCase()} Session`;

  if (pushUrl) setUrlMood(moodKey);
  bgFX.setPreset(moodKey);

  if (burst) runEnterBurst(burstOrigin);

  renderTrackList();

  // 每次切 mood 自动换一首（进入时音乐淡入）
  pickTrack({ autoplay, fadeIn: true });
  showPlayer();
}

function getCurrentTrackIndex() {
  const mood = MOODS[state.mood];
  if (!mood || !state.currentTrack) return -1;
  return mood.tracks.findIndex((t) => t.url === state.currentTrack.url);
}

function goNext({ autoplay = true, fadeIn = false } = {}) {
  const mood = MOODS[state.mood];
  if (!mood) return;
  const tracks = mood.tracks;
  if (tracks.length === 0) return;

  let next;
  if (state.shuffle && tracks.length > 1) {
    const prevUrl = state.currentTrack?.url;
    for (let i = 0; i < 8; i++) {
      const candidate = pickRandom(tracks);
      if (candidate.url !== prevUrl) {
        next = candidate;
        break;
      }
    }
    next = next || tracks[(getCurrentTrackIndex() + 1) % tracks.length];
  } else {
    const idx = getCurrentTrackIndex();
    next = tracks[(idx + 1) % tracks.length];
  }

  state.currentTrack = next;
  state.trackHistory.push({ mood: state.mood, url: next.url, at: Date.now() });

  const willCrossfade = !fadeIn && !els.audio.paused && !prefersReducedMotion();
  if (willCrossfade) {
    fadeAudio(els.audio, 1, 0, 180).then(() => {
      loadTrack(next, { autoplay, fadeIn: false });
      fadeAudio(els.audio, 0, 1, 220);
    });
  } else {
    loadTrack(next, { autoplay, fadeIn });
  }
}

function goPrev({ autoplay = true } = {}) {
  const mood = MOODS[state.mood];
  if (!mood) return;
  const tracks = mood.tracks;
  if (tracks.length === 0) return;

  const idx = getCurrentTrackIndex();
  const prevIndex = idx <= 0 ? tracks.length - 1 : idx - 1;
  const next = tracks[prevIndex];

  state.currentTrack = next;
  state.trackHistory.push({ mood: state.mood, url: next.url, at: Date.now() });

  const willCrossfade = !els.audio.paused && !prefersReducedMotion();
  if (willCrossfade) {
    fadeAudio(els.audio, 1, 0, 180).then(() => {
      loadTrack(next, { autoplay, fadeIn: false });
      fadeAudio(els.audio, 0, 1, 220);
    });
  } else {
    loadTrack(next, { autoplay, fadeIn: false });
  }
}

function pickTrack({ autoplay = true, fadeIn = false } = {}) {
  const mood = MOODS[state.mood];
  if (!mood) return;

  const tracks = mood.tracks;
  const prevUrl = state.currentTrack?.url;
  let next = null;

  if (tracks.length <= 1) {
    next = tracks[0];
  } else if (state.shuffle) {
    for (let i = 0; i < 8; i++) {
      const candidate = pickRandom(tracks);
      if (candidate.url !== prevUrl) {
        next = candidate;
        break;
      }
    }
    next = next || tracks[(tracks.findIndex((t) => t.url === prevUrl) + 1) % tracks.length];
  } else {
    const idx = getCurrentTrackIndex();
    next = tracks[(idx + 1) % tracks.length];
  }

  state.currentTrack = next;
  state.trackHistory.push({ mood: state.mood, url: next.url, at: Date.now() });

  const willCrossfade = !fadeIn && !els.audio.paused && !prefersReducedMotion();
  if (willCrossfade) {
    fadeAudio(els.audio, 1, 0, 180).then(() => {
      loadTrack(next, { autoplay, fadeIn: false });
      fadeAudio(els.audio, 0, 1, 220);
    });
  } else {
    loadTrack(next, { autoplay, fadeIn });
  }
}

function loadTrack(track, { autoplay = true, fadeIn = false } = {}) {
  try {
    chatLeaveRoom();
  } catch (_) {}
  els.trackTitle.textContent = track.title;
  els.audio.src = track.url || "";
  els.audio.currentTime = 0;
  if (els.progressInner) els.progressInner.style.width = "0%";
  els.timeNow.textContent = "0:00";
  els.timeDur.textContent = "0:00";
  if (els.detailTime) els.detailTime.textContent = "—";
  setPlayBtn(false);
  highlightCurrentTrack();

  if (autoplay) {
    if (fadeIn) {
      els.audio.volume = 0;
    } else {
      els.audio.volume = 1;
    }
    const p = els.audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        setPlayBtn(true);
        if (fadeIn) fadeAudio(els.audio, 0, 1, 680);
      }).catch(() => {
        setPlayBtn(false);
        els.audio.volume = 1;
      });
    }
  }
  try {
    chatJoinRoom();
  } catch (_) {}
}

function togglePlay() {
  if (!state.currentTrack) return;
  if (els.audio.paused) {
    if (els.audio.volume < 0.1) els.audio.volume = 1;
    els.audio
      .play()
      .then(() => setPlayBtn(true))
      .catch(() => setPlayBtn(false));
  } else {
    els.audio.pause();
    setPlayBtn(false);
  }
}

function setPlayBtn(isPlaying) {
  els.playBtn.textContent = isPlaying ? "⏸ 暂停" : "▶ 播放";
}

/* ---------------------------
 * URL：分享 / 直达
 * --------------------------- */
function setUrlMood(moodKey) {
  const url = new URL(window.location.href);
  url.searchParams.set("mood", moodKey);
  url.hash = moodKey;
  history.replaceState({}, "", url);
}

function getUrlMood() {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("mood");
  if (fromQuery && MOODS[fromQuery]) return fromQuery;
  const hash = (window.location.hash || "").replace(/^#/, "").trim();
  if (hash && MOODS[hash]) return hash;
  return null;
}

async function copyShareLink() {
  const url = new URL(window.location.href);
  if (state.mood) url.searchParams.set("mood", state.mood);
  const text = url.toString();

  try {
    await navigator.clipboard.writeText(text);
    toast("已复制链接");
  } catch {
    // 回退：prompt 让用户手动复制
    window.prompt("复制这个链接：", text);
  }
}

/* ---------------------------
 * 进度条 & 时间
 * --------------------------- */
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function syncProgress() {
  const dur = els.audio.duration || 0;
  const cur = els.audio.currentTime || 0;
  if (dur > 0) {
    if (els.progressInner) els.progressInner.style.width = `${Math.min(100, (cur / dur) * 100)}%`;
    els.timeDur.textContent = formatTime(dur);
    if (els.detailTime) els.detailTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
  } else {
    if (els.progressInner) els.progressInner.style.width = "0%";
    els.timeDur.textContent = "0:00";
    if (els.detailTime) els.detailTime.textContent = "—";
  }
  els.timeNow.textContent = formatTime(cur);
}

/* ---------------------------
 * 背景：轻量粒子（不依赖库）
 * --------------------------- */
function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const bgFX = (() => {
  const canvas = els.bgCanvas;
  const ctx = canvas.getContext("2d", { alpha: true });
  let raf = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let particles = [];
  let preset = "relax";
  let breathing = false;

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
  }

  function rebuild() {
    const p = MOODS[preset]?.particles || MOODS.relax.particles;
    const count = prefersReducedMotion() ? Math.floor(p.count * 0.35) : p.count;
    particles = new Array(count).fill(0).map(() => spawnOne(p));
  }

  function spawnOne(p) {
    const [smin, smax] = p.size;
    const r = rand(smin, smax);
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r,
      vx: rand(-p.drift, p.drift),
      vy: rand(p.speed * 0.4, p.speed * 1.1),
      a: rand(0.05, 0.14),
      tw: rand(0.2, 0.9),
    };
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    ctx.clearRect(0, 0, w, h);

    // 让粒子颜色随主题变一点点（用当前 CSS 变量读取）
    const accent = getCssVar("--accent") || "#74b9ff";
    const accent2 = getCssVar("--accent-2") || "#00f5d4";

    const grad = ctx.createRadialGradient(w * 0.2, h * 0.2, 10, w * 0.2, h * 0.2, Math.max(w, h));
    grad.addColorStop(0, withAlpha(accent, 0.10));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (const pt of particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      if (breathing) pt.tw += 0.02;

      // 环绕
      if (pt.y - pt.r > h) pt.y = -pt.r;
      if (pt.x - pt.r > w) pt.x = -pt.r;
      if (pt.x + pt.r < 0) pt.x = w + pt.r;

      const pulse = breathing ? 0.5 + 0.5 * Math.sin(pt.tw) : 0.22;
      const alpha = pt.a * (0.65 + pulse * 0.6);

      const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 6);
      g.addColorStop(0, withAlpha(accent2, alpha));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function setPreset(nextPreset) {
    preset = nextPreset;
    rebuild();
  }

  function setBreathing(next) {
    breathing = Boolean(next);
  }

  function start() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
  }

  window.addEventListener("resize", resize, { passive: true });

  return { start, stop, resize, setPreset, setBreathing };
})();

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function withAlpha(hex, a) {
  // hex like #rrggbb
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${a})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${a})`;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/* ---------------------------
 * 小工具：淡入淡出 / 随机 / toast
 * --------------------------- */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fadeAudio(audioEl, from, to, ms) {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      audioEl.volume = to;
      resolve();
      return;
    }
    const start = performance.now();
    audioEl.volume = clamp(from, 0, 1);
    const step = (t) => {
      const p = clamp((t - start) / ms, 0, 1);
      audioEl.volume = from + (to - from) * p;
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

let toastTimer = 0;
function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }

  el.textContent = msg;
  el.classList.add("toast--show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("toast--show");
  }, 1100);
}

/* ---------------------------
 * 事件绑定
 * --------------------------- */
function bind() {
  document.querySelectorAll(".moodCard").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const mood = btn.getAttribute("data-mood");
      setMood(mood, {
        autoplay: true,
        pushUrl: true,
        burst: true,
        burstOrigin: { clientX: e.clientX, clientY: e.clientY },
      });
    });
  });

  els.playBtn.addEventListener("click", togglePlay);
  els.prevBtn?.addEventListener("click", () => {
    if (!state.mood) return;
    els.moodCopy.textContent = pickRandom(MOODS[state.mood].copy);
    goPrev({ autoplay: true });
  });
  els.nextBtn.addEventListener("click", () => {
    if (!state.mood) return;
    els.moodCopy.textContent = pickRandom(MOODS[state.mood].copy);
    goNext({ autoplay: true, fadeIn: false });
  });

  // 进度条点击 / 拖动寻址
  els.progressBar?.addEventListener("click", (e) => {
    if (!els.audio.duration || !Number.isFinite(els.audio.duration)) return;
    const rect = els.progressBar.getBoundingClientRect();
    const p = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    els.audio.currentTime = p * els.audio.duration;
  });

  // 音量
  els.volumeSlider?.addEventListener("input", () => {
    const v = Number(els.volumeSlider.value) / 100;
    els.audio.volume = v;
    if (els.volumeMute) {
      els.volumeMute.textContent = v === 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
    }
  });
  els.volumeMute?.addEventListener("click", () => {
    if (els.audio.volume > 0) {
      state.volumeBeforeMute = els.audio.volume;
      els.audio.volume = 0;
      els.volumeSlider.value = 0;
      els.volumeMute.textContent = "🔇";
    } else {
      els.audio.volume = state.volumeBeforeMute;
      els.volumeSlider.value = Math.round(state.volumeBeforeMute * 100);
      els.volumeMute.textContent = state.volumeBeforeMute < 0.5 ? "🔉" : "🔊";
    }
  });

  // 循环：off -> one -> all
  els.repeatBtn?.addEventListener("click", () => {
    const modes = ["off", "one", "all"];
    const i = modes.indexOf(state.repeatMode);
    state.repeatMode = modes[(i + 1) % modes.length];
    els.repeatBtn.textContent = state.repeatMode === "off" ? "🔁" : state.repeatMode === "one" ? "🔂" : "🔁";
    els.repeatBtn.title = state.repeatMode === "off" ? "循环关闭" : state.repeatMode === "one" ? "单曲循环" : "列表循环";
  });

  // 随机
  els.shuffleBtn?.addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    els.shuffleBtn.classList.toggle("btn--active", state.shuffle);
    els.shuffleBtn.title = state.shuffle ? "随机开" : "随机关";
  });

  els.chatBtn?.addEventListener("click", () => {
    if (state.canChat) openChatPanel();
  });
  els.chatClose?.addEventListener("click", closeChatPanel);
  els.chatSend?.addEventListener("click", () => {
    const t = els.chatInput?.value?.trim();
    if (t) {
      chatSendMessage(t);
      els.chatInput.value = "";
    }
  });
  els.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const t = els.chatInput?.value?.trim();
      if (t) {
        chatSendMessage(t);
        els.chatInput.value = "";
      }
    }
  });

  els.backLink?.addEventListener("click", (e) => {
    e.preventDefault();
    resetToPick();
  });
  els.backBtn?.addEventListener("click", resetToPick);
  els.resetBtn?.addEventListener("click", resetToPick);
  els.shareBtn?.addEventListener("click", copyShareLink);
  els.resetBtn2?.addEventListener("click", resetToPick);
  els.shareBtn2?.addEventListener("click", copyShareLink);

  els.audio.addEventListener("timeupdate", syncProgress);
  els.audio.addEventListener("loadedmetadata", syncProgress);
  els.audio.addEventListener("ended", () => {
    if (state.repeatMode === "one" && state.currentTrack) {
      els.audio.currentTime = 0;
      els.audio.play().then(() => setPlayBtn(true)).catch(() => setPlayBtn(false));
      return;
    }
    setPlayBtn(false);
    document.body.classList.remove("is-playing");
    if (state.repeatMode === "all") {
      goNext({ autoplay: true, fadeIn: true });
    } else {
      const idx = getCurrentTrackIndex();
      const total = MOODS[state.mood]?.tracks?.length ?? 0;
      const isLast = total > 0 && idx === total - 1;
      if (!isLast) goNext({ autoplay: true, fadeIn: true });
    }
  });
  els.audio.addEventListener("play", () => {
    setPlayBtn(true);
    document.body.classList.add("is-playing");
  });
  els.audio.addEventListener("pause", () => {
    setPlayBtn(false);
    document.body.classList.remove("is-playing");
  });
  els.audio.addEventListener("error", () => {
    setPlayBtn(false);
    toast("无法播放音频，请确认 music 文件夹内有 MP3 并用本地服务器打开（如 npx serve .）");
  });

  window.addEventListener("keydown", (e) => {
    // 避免在输入框里劫持（本项目基本没有输入框，但还是做一下）
    const t = e.target;
    const isTyping =
      t &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable === true);
    if (isTyping) return;

    if (e.key === "Escape") {
      resetToPick();
      return;
    }
    if (e.key === "Enter") {
      togglePlay();
      return;
    }
    if (e.key.toLowerCase() === "n") {
      if (state.mood) {
        els.moodCopy.textContent = pickRandom(MOODS[state.mood].copy);
        goNext({ autoplay: true, fadeIn: false });
      }
      return;
    }
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "p") {
      if (state.mood) goPrev({ autoplay: true });
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    }
  });
}

function resetToPick() {
  els.audio.pause();
  setPlayBtn(false);
  showPick();
  // 不清空 mood，让背景保持最后主题也可以；这里回到默认（更像“换心情”）
  document.body.removeAttribute("data-mood");
  document.body.classList.add("is-index");
  const url = new URL(window.location.href);
  url.searchParams.delete("mood");
  url.hash = "";
  history.replaceState({}, "", url);
  state.mood = null;
  state.currentTrack = null;
  if (els.leftPill) els.leftPill.textContent = "Select mood";
  chatLeaveRoom();
  closeChatPanel();
  toast("已返回选择心情");
}

/* ---------------------------
 * 同听聊天：只有与正在听同一首歌的人才能打开聊天
 * 依赖 Supabase（Presence + 表 chat_messages）
 *
 * Supabase 建表 SQL（在 SQL Editor 中执行）：
 *   create table chat_messages (
 *     id uuid default gen_random_uuid() primary key,
 *     room_id text not null,
 *     user_id text not null,
 *     user_name text not null,
 *     message text not null,
 *     created_at timestamptz default now()
 *   );
 *   alter publication supabase_realtime add table chat_messages;
 * 然后在 index.html 前加：<script>window.MOOD_PLAYER_SUPABASE={url:'你的项目URL',anonKey:'你的anon key'};</script>
 * --------------------------- */
let chatPresenceChannel = null;
let chatMessagesSub = null;

function getRoomId() {
  if (!state.mood || !state.currentTrack?.url) return null;
  return state.mood + "|" + state.currentTrack.url;
}

function getRoomIdHash(roomId) {
  if (!roomId) return "";
  let h = 0;
  for (let i = 0; i < roomId.length; i++) h = ((h << 5) - h + roomId.charCodeAt(i)) | 0;
  return "r_" + Math.abs(h).toString(36);
}

function getChatUserId() {
  let id = localStorage.getItem(CHAT_USER_KEY);
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(CHAT_USER_KEY, id);
  }
  return id;
}

function getChatUserName() {
  let name = localStorage.getItem(CHAT_NAME_KEY);
  if (!name) {
    name = "User_" + Math.random().toString(36).slice(2, 6);
    localStorage.setItem(CHAT_NAME_KEY, name);
  }
  return name;
}

function getSupabase() {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    console.log("[Chat] Supabase config missing - url:", !!SUPABASE_CONFIG.url, "key:", !!SUPABASE_CONFIG.anonKey);
    return null;
  }
  if (!window.supabaseClient) {
    const { createClient } = window.supabase || {};
    if (!createClient) {
      console.error("[Chat] Supabase JS library not loaded");
      return null;
    }
    const url = SUPABASE_CONFIG.url.replace(/\/$/, "");
    try {
      window.supabaseClient = createClient(url, SUPABASE_CONFIG.anonKey);
      console.log("[Chat] Supabase client created:", url);
    } catch (e) {
      console.error("[Chat] Failed to create Supabase client:", e);
      return null;
    }
  }
  return window.supabaseClient || null;
}

function chatJoinRoom() {
  chatLeaveRoom();
  const roomId = getRoomId();
  if (!roomId) {
    console.log("[Chat] No roomId - mood:", state.mood, "track:", state.currentTrack);
    updateChatButton(false, "未选择曲目");
    return;
  }
  const supabase = getSupabase();
  if (!supabase) {
    console.log("[Chat] Supabase not configured");
    updateChatButton(false, "配置 Supabase 后可启用同听聊天");
    return;
  }

  state.chatRoomId = roomId;
  const roomHash = getRoomIdHash(roomId);
  const channelName = "room:" + roomHash;
  console.log("[Chat] Joining room:", roomId, "hash:", roomHash, "channel:", channelName);
  
  chatPresenceChannel = supabase.channel(channelName, {
    config: { presence: { key: getChatUserId() } },
  });

  chatPresenceChannel
    .on("presence", { event: "sync" }, () => {
      const presence = chatPresenceChannel?.presenceState?.() || {};
      const count = Object.values(presence).reduce((n, arr) => n + (arr?.length || 0), 0);
      console.log("[Chat] Presence sync - count:", count, "presence:", presence);
      state.canChat = count >= 2;
      updateChatButton(state.canChat, state.canChat ? `有 ${count} 人同听，可聊天` : `当前 ${count} 人，需要至少 2 人才能聊天`);
    })
    .subscribe(async (status) => {
      console.log("[Chat] Channel status:", status);
      if (status === "SUBSCRIBED") {
        try {
          await chatPresenceChannel?.track({
            userId: getChatUserId(),
            userName: getChatUserName(),
            mood: state.mood,
            trackUrl: state.currentTrack?.url,
          });
          console.log("[Chat] Presence tracked");
        } catch (e) {
          console.error("[Chat] Presence track error:", e);
          toast("Presence 上报失败：" + (e.message || e));
        }
      }
      if (status === "CHANNEL_ERROR") {
        console.error("[Chat] Channel error");
        toast("Supabase 连接异常，请检查 URL 与 key（可尝试使用 anon JWT key）");
      }
      if (status === "TIMED_OUT" || status === "CLOSED") {
        console.warn("[Chat] Channel closed/timed out:", status);
        toast("Supabase 连接超时，请检查网络或 Realtime 是否启用");
      }
    });
}

function chatLeaveRoom() {
  if (chatPresenceChannel) {
    chatPresenceChannel.unsubscribe();
    chatPresenceChannel = null;
  }
  if (chatMessagesSub) {
    chatMessagesSub.unsubscribe();
    chatMessagesSub = null;
  }
  state.chatRoomId = null;
  state.canChat = false;
  updateChatButton(false);
}

function updateChatButton(canOpen, tooltip) {
  if (!els.chatBtn) return;
  els.chatBtn.disabled = !canOpen;
  els.chatBtn.title = tooltip || (canOpen ? "与同听这首歌的人聊天" : "暂无其他人同时收听此曲，无法打开聊天");
}

function chatLoadMessages() {
  if (!els.chatMessages || !state.chatRoomId) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const roomId = state.chatRoomId;
  const roomHash = getRoomIdHash(roomId);
  supabase
    .from("chat_messages")
    .select("id, user_name, message, created_at")
    .eq("room_id", roomHash)
    .order("created_at", { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.warn("Supabase chat load:", error);
        if (els.chatMessages) els.chatMessages.innerHTML = "<div class=\"chatMsg\">加载失败，请检查 Supabase 配置与 chat_messages 表</div>";
        return;
      }
      if (!data) return;
      els.chatMessages.innerHTML = data
        .map((row) => {
          const time = row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          const name = escapeHtml(String(row.user_name || "?"));
          const msg = escapeHtml(String(row.message || ""));
          return `<div class="chatMsg"><span class="chatMsg__meta">${name} ${time}</span><div class="chatMsg__text">${msg}</div></div>`;
        })
        .join("");
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    })
    .catch((e) => {
      console.warn("Supabase chat load:", e);
      if (els.chatMessages) els.chatMessages.innerHTML = "<div class=\"chatMsg\">请求失败，请确认 URL/key 正确且表已创建</div>";
    });
}

function chatSubscribeMessages() {
  if (!state.chatRoomId) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const roomHash = getRoomIdHash(state.chatRoomId);
  chatMessagesSub = supabase
    .channel("chat:" + roomHash)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: "room_id=eq." + roomHash },
      (payload) => {
        const row = payload.new;
        if (!row || !els.chatMessages) return;
        const time = row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        const name = escapeHtml(String(row.user_name || "?"));
        const msg = escapeHtml(String(row.message || ""));
        const div = document.createElement("div");
        div.className = "chatMsg";
        div.innerHTML = `<span class="chatMsg__meta">${name} ${time}</span><div class="chatMsg__text">${msg}</div>`;
        els.chatMessages.appendChild(div);
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
      }
    )
    .subscribe();
}

function chatSendMessage(text) {
  const t = String(text).trim();
  if (!t || !state.chatRoomId) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const roomId = state.chatRoomId;
  const roomHash = getRoomIdHash(roomId);
  supabase
    .from("chat_messages")
    .insert({
      room_id: roomHash,
      user_id: getChatUserId(),
      user_name: getChatUserName(),
      message: t,
    })
    .then(() => {});
}

function openChatPanel() {
  if (!state.canChat || !els.chatPanel) return;
  els.chatPanel.classList.add("chatPanel--open");
  els.chatPanel.setAttribute("aria-hidden", "false");
  chatLoadMessages();
  chatSubscribeMessages();
  setTimeout(() => els.chatInput?.focus(), 100);
}

function closeChatPanel() {
  if (chatMessagesSub) {
    chatMessagesSub.unsubscribe();
    chatMessagesSub = null;
  }
  if (els.chatPanel) {
    els.chatPanel.classList.remove("chatPanel--open");
    els.chatPanel.setAttribute("aria-hidden", "true");
  }
}

function renderTrackList() {
  if (!els.trackList || !state.mood) return;
  const tracks = MOODS[state.mood].tracks || [];
  els.trackList.innerHTML = tracks
    .map((t, i) => {
      const idx = String(i + 1).padStart(2, "0");
      const safeTitle = escapeHtml(t.title);
      return `
        <button class="listItem trackItem" type="button" data-track-index="${i}" role="listitem">
          <div class="listItem__idx">${idx}</div>
          <div class="listItem__icon">♪</div>
          <div class="listItem__meta">
            <div class="listItem__title">${safeTitle}</div>
            <div class="listItem__desc">${escapeHtml(MOODS[state.mood].tag)}</div>
          </div>
          <div class="listItem__dur">—</div>
        </button>
      `;
    })
    .join("");

  els.trackList.querySelectorAll(".trackItem").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = Number(btn.getAttribute("data-track-index"));
      const track = MOODS[state.mood].tracks[i];
      if (!track) return;
      runEnterBurst({ clientX: e.clientX, clientY: e.clientY });
      loadTrack(track, { autoplay: true, fadeIn: true });
    });
  });
}

function highlightCurrentTrack() {
  if (!els.trackList || !state.currentTrack) return;
  const url = state.currentTrack.url;
  els.trackList.querySelectorAll(".trackItem").forEach((btn) => {
    const i = Number(btn.getAttribute("data-track-index"));
    const track = MOODS[state.mood]?.tracks?.[i];
    const isCurrent = track && track.url === url;
    btn.setAttribute("aria-current", isCurrent ? "true" : "false");
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function runEnterBurst(origin) {
  // 设置爆发中心点：优先用点击位置（相对 panel），否则默认 50%/45%
  if (els.panel) {
    const r = els.panel.getBoundingClientRect();
    if (origin && Number.isFinite(origin.clientX) && Number.isFinite(origin.clientY)) {
      const x = clamp(origin.clientX - r.left, 0, r.width);
      const y = clamp(origin.clientY - r.top, 0, r.height);
      document.body.style.setProperty("--burst-x", `${x}px`);
      document.body.style.setProperty("--burst-y", `${y}px`);
    } else {
      document.body.style.setProperty("--burst-x", "50%");
      document.body.style.setProperty("--burst-y", "45%");
    }
  }

  document.body.classList.remove("is-entering");
  // 触发重排，确保连续点击也能重播动画
  void document.body.offsetWidth;
  document.body.classList.add("is-entering");
  window.clearTimeout(runEnterBurst._t);
  runEnterBurst._t = window.setTimeout(() => {
    document.body.classList.remove("is-entering");
  }, 820);
}
runEnterBurst._t = 0;

/* ---------------------------
 * 启动
 * --------------------------- */
function init() {
  bind();
  bgFX.resize();
  bgFX.start();
  bgFX.setBreathing(false);

  // 仅根据 URL 决定：有 ?mood= 或 #mood 才打开该心情页，否则一律显示首页（不再用 localStorage 恢复）
  const initial = getUrlMood();
  if (initial) {
    setMood(initial, { autoplay: false, pushUrl: true, burst: true, burstOrigin: null });
  } else {
    showPick();
  }
}

init();

