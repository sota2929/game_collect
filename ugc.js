(() => {
  const STORAGE_KEY = "collectArcade.local.v3";
  const LEGACY_STORAGE_KEY = "collectArcade.local.v2";
  const MAX_LOCAL_PLAYS = 20;
  const scriptUrl = document.currentScript?.src || `${window.location.origin}/ugc.js`;
  const API_BASE = new URL("api/", scriptUrl).toString();

  const gameNames = {
    "crystal-descent-defense": "クリスタル防衛線",
    "aurora-drift": "オーロラ航路",
    "glyph-garden": "紋章の庭",
    "neon-courier": "ネオン配達便",
    "tide-forge": "潮汐の鍛冶場",
    "aijingi": "合陣戯",
    "arcane-duel": "Arcane Duel",
    "ten-link-campus": "10リンク・キャンパス",
    "parity-sort-lab": "奇偶ソートラボ",
    "after-school-beatline": "放課後ビートライン",
    "stardust-merge-cafe": "星屑マージカフェ",
    "mini-sudoku-lounge": "ミニ数独ラウンジ",
    "color-reflex-dojo": "色彩反射道場",
    "starlight-spotter": "星灯りまちがい探し",
    "moonlit-memory-route": "月影メモリールート",
    "lantern-slide-puzzle": "灯籠スライドパズル",
    "last-train-number-hunt": "終電ナンバーサーチ",
    "galaxy-sushi-clicker": "銀河回転寿司クリッカー",
    "midnight-typing-proof": "深夜校正タイピング",
    "sky-post-one-stroke": "雲上ひとふで郵便",
    "kanji-mirage-museum": "幻字鑑定室",
    "lost-call-switchboard": "迷子電話交換室",
    "futon-flight": "ふとんがふっとんだ！",
    "moonlit-curio-sorter": "骨董仕分けナイト",
  };

  const BADGES = [
    { id: "first-play", label: "はじめてのプレイ" },
    { id: "three-plays", label: "3回プレイ" },
    { id: "ten-plays", label: "10回プレイ" },
    { id: "same-game-three", label: "お気に入りの一本" },
    { id: "best-update", label: "自己ベスト更新" },
    { id: "share-score", label: "スコア共有デビュー" },
    { id: "daily-first", label: "今日のチャレンジ初達成" },
    { id: "daily-streak-3", label: "3日連続チャレンジ" },
    { id: "variety-5", label: "5タイトル制覇" },
  ];

  const remote = {
    games: {},
    reviews: {},
    loading: false,
    error: "",
  };

  let toastRoot = null;
  let injectedUi = false;

  const safeStorage = {
    read(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore storage failures.
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore storage failures.
      }
    },
  };

  const notify = (name = "collect:ugc-updated", detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    if (name !== "collect:ugc-updated") {
      window.dispatchEvent(new CustomEvent("collect:ugc-updated", { detail }));
    }
  };

  const nowLabel = () =>
    new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

  const localDateKey = (time = Date.now()) => {
    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const createEmptyStore = () => ({
    version: 3,
    games: {},
    profile: {
      firstVisitAt: 0,
      lastVisitAt: 0,
      lastVisitDate: "",
      totalPlayCount: 0,
      totalCompletionCount: 0,
      totalShareCount: 0,
      realUserLike: false,
      moodTagClicks: {},
    },
    daily: {
      history: {},
      lastCompletedDate: "",
      streak: 0,
    },
    badges: {},
  });

  const ensureGame = (store, gameId) => {
    if (!store.games[gameId]) {
      store.games[gameId] = {
        favorite: false,
        plays: [],
        playCount: 0,
        completionCount: 0,
        bestScore: 0,
        lastPlayedAt: 0,
        lastPlayedDate: "",
        sharedCount: 0,
      };
    }
    return store.games[gameId];
  };

  const migrateStore = (parsed) => {
    const fresh = createEmptyStore();
    if (!parsed || typeof parsed !== "object") return fresh;

    if (parsed.version === 3) {
      return {
        ...fresh,
        ...parsed,
        games: parsed.games && typeof parsed.games === "object" ? parsed.games : {},
        profile: { ...fresh.profile, ...(parsed.profile || {}) },
        daily: {
          ...fresh.daily,
          ...(parsed.daily || {}),
          history: parsed.daily?.history && typeof parsed.daily.history === "object" ? parsed.daily.history : {},
        },
        badges: parsed.badges && typeof parsed.badges === "object" ? parsed.badges : {},
      };
    }

    const legacyGames = parsed.games && typeof parsed.games === "object" ? parsed.games : {};
    Object.entries(legacyGames).forEach(([gameId, value]) => {
      const game = ensureGame(fresh, gameId);
      game.favorite = Boolean(value.favorite);
      game.plays = Array.isArray(value.plays) ? value.plays.slice(0, MAX_LOCAL_PLAYS) : [];
      game.playCount = game.plays.length;
      game.lastPlayedAt = Number(game.plays[0]?.time) || 0;
      game.lastPlayedDate = game.lastPlayedAt ? localDateKey(game.lastPlayedAt) : "";
      fresh.profile.totalPlayCount += game.playCount;
    });
    return fresh;
  };

  const readStore = () => {
    const raw = safeStorage.read(STORAGE_KEY);
    if (raw) {
      try {
        return migrateStore(JSON.parse(raw));
      } catch {
        return createEmptyStore();
      }
    }
    const legacyRaw = safeStorage.read(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const migrated = migrateStore(JSON.parse(legacyRaw));
        safeStorage.write(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      } catch {
        return createEmptyStore();
      }
    }
    return createEmptyStore();
  };

  const writeStore = (store) => {
    safeStorage.write(STORAGE_KEY, JSON.stringify(store));
    notify();
  };

  const updateStore = (updater) => {
    const store = readStore();
    updater(store);
    writeStore(store);
    return store;
  };

  const ensureUi = () => {
    if (injectedUi) return;
    injectedUi = true;
    const style = document.createElement("style");
    style.textContent = `
      .collect-toast-root {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 80;
        display: grid;
        gap: 10px;
        pointer-events: none;
      }

      .collect-toast {
        min-width: 240px;
        max-width: min(86vw, 340px);
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(8, 119, 216, 0.18);
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 18px 34px rgba(17, 37, 62, 0.14);
        color: #17202a;
        transform: translateY(10px);
        opacity: 0;
        transition: opacity 180ms ease, transform 180ms ease;
      }

      .collect-toast.show {
        opacity: 1;
        transform: translateY(0);
      }

      .collect-toast strong {
        display: block;
        margin-bottom: 4px;
        font-size: 0.95rem;
      }

      .collect-toast span {
        display: block;
        color: #5f6f82;
        font-size: 0.86rem;
        line-height: 1.55;
      }
    `;
    document.head.append(style);
  };

  const showToast = (title, body) => {
    ensureUi();
    if (!toastRoot) {
      toastRoot = document.createElement("div");
      toastRoot.className = "collect-toast-root";
      document.body.append(toastRoot);
    }
    const toast = document.createElement("article");
    toast.className = "collect-toast";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = body;
    toast.append(strong, span);
    toastRoot.append(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 220);
    }, 2800);
  };

  const unlockBadge = (store, badgeId) => {
    if (store.badges[badgeId]) return null;
    const badgeMeta = BADGES.find((badge) => badge.id === badgeId);
    if (!badgeMeta) return null;
    store.badges[badgeId] = {
      id: badgeId,
      label: badgeMeta.label,
      unlockedAt: Date.now(),
    };
    showToast("バッジ獲得", badgeMeta.label);
    notify("collect:badge-unlocked", { badge: store.badges[badgeId] });
    window.CollectAnalytics?.track?.("badge_unlock", {
      badge_id: badgeId,
      badge_label: badgeMeta.label,
      source_area: "badge_system",
    });
    return store.badges[badgeId];
  };

  const evaluateBadges = (store, gameId, context = {}) => {
    const game = ensureGame(store, gameId);
    const distinctPlayed = Object.values(store.games).filter((value) => value.playCount > 0).length;
    if (store.profile.totalPlayCount >= 1) unlockBadge(store, "first-play");
    if (store.profile.totalPlayCount >= 3) unlockBadge(store, "three-plays");
    if (store.profile.totalPlayCount >= 10) unlockBadge(store, "ten-plays");
    if (game.playCount >= 3) unlockBadge(store, "same-game-three");
    if (distinctPlayed >= 5) unlockBadge(store, "variety-5");
    if (context.bestUpdated) unlockBadge(store, "best-update");
    if (context.shared) unlockBadge(store, "share-score");
    if (context.dailyCompleted) unlockBadge(store, "daily-first");
    if ((store.daily.streak || 0) >= 3) unlockBadge(store, "daily-streak-3");
  };

  const markVisit = () => {
    const today = localDateKey();
    const store = updateStore((draft) => {
      if (!draft.profile.firstVisitAt) draft.profile.firstVisitAt = Date.now();
      draft.profile.lastVisitAt = Date.now();
      draft.profile.lastVisitDate = today;
    });
    return store.profile;
  };

  const markHumanLike = () => {
    updateStore((store) => {
      store.profile.realUserLike = true;
    });
  };

  const getProfileSummary = () => {
    const store = readStore();
    const today = localDateKey();
    const playedToday = Object.values(store.games).filter((game) => game.lastPlayedDate === today).length;
    const badges = Object.values(store.badges).sort((a, b) => b.unlockedAt - a.unlockedAt);
    const hasPlayedBefore = store.profile.totalPlayCount > 0;
    return {
      totalPlayCount: store.profile.totalPlayCount || 0,
      totalCompletionCount: store.profile.totalCompletionCount || 0,
      totalShareCount: store.profile.totalShareCount || 0,
      playedToday,
      streak: store.daily.streak || 0,
      badges,
      favoriteCount: Object.values(store.games).filter((game) => game.favorite).length,
      isReturningLike: hasPlayedBefore,
      firstVisitAt: store.profile.firstVisitAt || 0,
      lastVisitAt: store.profile.lastVisitAt || 0,
      realUserLike: Boolean(store.profile.realUserLike),
    };
  };

  const getGameRecord = (gameId) => ensureGame(readStore(), gameId);

  const noteFavorite = (gameId, active) => {
    updateStore((store) => {
      const game = ensureGame(store, gameId);
      game.favorite = active;
    });
    if (active) {
      window.CollectAnalytics?.track?.("favorite_add", {
        game_id: gameId,
        game_title: gameNames[gameId] || gameId,
        source_area: "ugc_panel",
      });
    }
  };

  const noteMoodTag = (tag) => {
    updateStore((store) => {
      const next = (store.profile.moodTagClicks[tag] || 0) + 1;
      store.profile.moodTagClicks[tag] = next;
    });
  };

  const noteShare = (gameId) => {
    updateStore((store) => {
      const game = ensureGame(store, gameId);
      game.sharedCount = (game.sharedCount || 0) + 1;
      store.profile.totalShareCount += 1;
      evaluateBadges(store, gameId, { shared: true });
    });
  };

  const recordPlay = (gameId, title = gameNames[gameId] || gameId, href = "") => {
    let shouldPost = false;
    let payload = null;
    updateStore((store) => {
      const game = ensureGame(store, gameId);
      if (game.plays[0]?.time && Date.now() - game.plays[0].time < 4000) return;
      shouldPost = true;
      const now = Date.now();
      game.playCount += 1;
      game.lastPlayedAt = now;
      game.lastPlayedDate = localDateKey(now);
      game.plays.unshift({
        title,
        href,
        date: nowLabel(),
        time: now,
      });
      game.plays = game.plays.slice(0, MAX_LOCAL_PLAYS);
      store.profile.totalPlayCount += 1;
      evaluateBadges(store, gameId);
      payload = { game_id: gameId, game_title: title, href };
    });

    if (shouldPost) {
      request("play.php", {
        method: "POST",
        body: JSON.stringify({ game_key: gameId }),
      })
        .then(mergeStats)
        .catch((error) => {
          remote.error = error.message;
          notify();
        });
    }

    if (payload) {
      window.CollectAnalytics?.track?.("game_start", {
        game_id: payload.game_id,
        game_title: payload.game_title,
        source_area: "game_start",
      });
    }
  };

  const recordCompletion = (gameId, details = {}) => {
    const title = details.title || gameNames[gameId] || gameId;
    let bestUpdated = false;
    updateStore((store) => {
      const game = ensureGame(store, gameId);
      game.completionCount += 1;
      store.profile.totalCompletionCount += 1;
      if (typeof details.score === "number" && details.score > (game.bestScore || 0)) {
        game.bestScore = details.score;
        bestUpdated = true;
      }
      if (details.dailyCompleted) {
        evaluateDailyChallenge(store, gameId, details.score || 0);
      }
      evaluateBadges(store, gameId, {
        bestUpdated,
        dailyCompleted: details.dailyCompleted,
      });
    });
    window.CollectAnalytics?.track?.("game_complete", {
      game_id: gameId,
      game_title: title,
      score: details.score || 0,
      play_time: details.playTime || 0,
      source_area: details.sourceArea || "result_screen",
    });
    window.CollectAnalytics?.track?.("post_score", {
      game_id: gameId,
      game_title: title,
      score: details.score || 0,
      play_time: details.playTime || 0,
      source_area: details.sourceArea || "result_screen",
    });
    return { bestUpdated, bestScore: getGameRecord(gameId).bestScore || 0 };
  };

  const recordRestart = (gameId, sourceArea = "result_screen") => {
    window.CollectAnalytics?.track?.("game_restart", {
      game_id: gameId,
      game_title: gameNames[gameId] || gameId,
      source_area: sourceArea,
    });
  };

  const getTodayChallengeState = (gameId, dateKey = localDateKey()) => {
    const store = readStore();
    const todayState = store.daily.history[dateKey];
    const game = ensureGame(store, gameId);
    return {
      gameBest: game.bestScore || 0,
      started: Boolean(todayState?.gameId === gameId && todayState.startedAt),
      completed: Boolean(todayState?.gameId === gameId && todayState.completedAt),
      bestScore: Number(todayState?.bestScore) || 0,
      streak: store.daily.streak || 0,
    };
  };

  const markDailyChallengeStart = (gameId, title = gameNames[gameId] || gameId, dateKey = localDateKey()) => {
    updateStore((store) => {
      const current = store.daily.history[dateKey] || {};
      if (!current.startedAt || current.gameId !== gameId) {
        store.daily.history[dateKey] = {
          ...current,
          gameId,
          title,
          startedAt: Date.now(),
          bestScore: current.bestScore || 0,
        };
      }
    });
    window.CollectAnalytics?.track?.("daily_challenge_start", {
      game_id: gameId,
      game_title: title,
      source_area: "daily_challenge",
    });
  };

  const evaluateDailyChallenge = (store, gameId, score) => {
    const dateKey = localDateKey();
    const current = store.daily.history[dateKey] || {};
    const wasCompleted = Boolean(current.completedAt);
    store.daily.history[dateKey] = {
      ...current,
      gameId,
      title: gameNames[gameId] || gameId,
      startedAt: current.startedAt || Date.now(),
      completedAt: Date.now(),
      bestScore: Math.max(Number(current.bestScore) || 0, score || 0),
    };
    if (!wasCompleted) {
      const previous = store.daily.lastCompletedDate;
      const yesterday = localDateKey(Date.now() - 24 * 60 * 60 * 1000);
      store.daily.streak = previous === yesterday ? (store.daily.streak || 0) + 1 : 1;
      store.daily.lastCompletedDate = dateKey;
      window.CollectAnalytics?.track?.("daily_challenge_complete", {
        game_id: gameId,
        game_title: gameNames[gameId] || gameId,
        score: score || 0,
        source_area: "daily_challenge",
      });
    }
  };

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `request_failed_${response.status}`);
    }
    return payload;
  };

  const mergeStats = (payload) => {
    if (payload?.games && typeof payload.games === "object") {
      remote.games = { ...remote.games, ...payload.games };
    }
    remote.error = "";
    notify();
  };

  const fetchStats = async () => {
    remote.loading = true;
    try {
      mergeStats(await request("stats.php"));
    } catch (error) {
      remote.error = error.message;
      notify();
    } finally {
      remote.loading = false;
    }
  };

  const fetchReviews = async (gameId) => {
    try {
      const payload = await request(`reviews.php?game_key=${encodeURIComponent(gameId)}`, {
        headers: {},
      });
      remote.reviews[gameId] = Array.isArray(payload.reviews) ? payload.reviews : [];
      mergeStats(payload);
    } catch (error) {
      remote.error = error.message;
      notify();
    }
  };

  const clampText = (value, max) => value.trim().replace(/\s+/g, " ").slice(0, max);

  const summaryFor = (gameId) => {
    const store = readStore();
    const local = ensureGame(store, gameId);
    const stats = remote.games[gameId] || {};
    const averageRating = Number(stats.averageRating) || 0;
    const userRating = Number(stats.userRating) || 0;
    return {
      averageRating,
      rating: userRating,
      ratingCount: Number(stats.ratingCount) || 0,
      favorite: Boolean(local.favorite),
      reviewCount: Number(stats.reviewCount) || 0,
      playCount: Number(stats.playCount) || 0,
      lastPlayed: local.plays[0]?.date || "",
      bestScore: Number(local.bestScore) || 0,
      apiReady: !remote.error,
      apiError: remote.error,
    };
  };

  const popularityScoreFor = (game) => {
    const stats = remote.games[game.id];
    if (stats && Number(stats.popularityScore) > 0) {
      return Number(stats.popularityScore);
    }
    const local = getGameRecord(game.id);
    return Math.max(0, 80 - (Number(game.popularity) || 10) * 8 + local.playCount * 4 + (local.bestScore ? 6 : 0));
  };

  const localRecentPlays = (gameId) => {
    const store = readStore();
    return ensureGame(store, gameId).plays;
  };

  const postRating = async (gameId, rating) => {
    mergeStats(
      await request("rating.php", {
        method: "POST",
        body: JSON.stringify({ game_key: gameId, rating }),
      }),
    );
  };

  const postReview = async (gameId, text) => {
    const summary = summaryFor(gameId);
    mergeStats(
      await request("reviews.php", {
        method: "POST",
        body: JSON.stringify({
          game_key: gameId,
          body: text,
          rating: summary.rating || null,
        }),
      }),
    );
    await fetchReviews(gameId);
  };

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const makeButton = (className, text, pressed = false) => {
    const button = make("button", className, text);
    button.type = "button";
    button.setAttribute("aria-pressed", String(pressed));
    return button;
  };

  const renderStars = (wrap, gameId) => {
    wrap.replaceChildren();
    const summary = summaryFor(gameId);
    for (let value = 1; value <= 5; value += 1) {
      const button = makeButton("star-button", value <= summary.rating ? "★" : "☆", value <= summary.rating);
      button.setAttribute("aria-label", `${value}点で評価`);
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await postRating(gameId, value);
        } finally {
          renderPanel(wrap.closest("[data-ugc-panel]"));
        }
      });
      wrap.append(button);
    }
  };

  const renderList = (root, items, emptyText) => {
    root.replaceChildren();
    if (!items.length) {
      root.append(make("p", "ugc-empty", emptyText));
      return;
    }
    items.forEach((item) => {
      const article = make("article", "ugc-entry");
      article.append(make("p", "ugc-entry-text", item.text));
      article.append(make("span", "ugc-entry-date", item.date));
      root.append(article);
    });
  };

  const renderHistoryList = (root, plays) => {
    root.replaceChildren();
    if (!plays.length) {
      root.append(make("p", "ugc-empty", "この端末ではまだプレイ履歴がありません。"));
      return;
    }
    plays.slice(0, 6).forEach((play) => {
      const row = make("div", "history-row");
      const title = play.href ? make("a", "", play.title) : make("span", "", play.title);
      if (play.href) title.href = play.href;
      row.append(title, make("span", "", play.date));
      root.append(row);
    });
  };

  const renderPanel = (panel) => {
    if (!panel) return;
    const gameId = panel.dataset.gameId;
    const title = panel.dataset.gameTitle || gameNames[gameId] || "このゲーム";
    const playHref = panel.dataset.playHref || "";
    const summary = summaryFor(gameId);
    const reviews = remote.reviews[gameId] || [];

    panel.replaceChildren();
    const head = make("div", "ugc-head");
    const titleBox = make("div");
    titleBox.append(make("p", "eyebrow", "User voice"));
    titleBox.append(make("h2", "", "レビュー・お気に入り"));
    const ratingLabel = summary.ratingCount ? `${summary.averageRating.toFixed(1)} / 5` : "- / 5";
    titleBox.append(
      make(
        "p",
        "ugc-score",
        `全体評価 ${ratingLabel} ・ 評価 ${summary.ratingCount}件 ・ レビュー ${summary.reviewCount}件 ・ プレイ ${summary.playCount}回`,
      ),
    );
    if (summary.apiError) {
      titleBox.append(make("p", "ugc-empty", "DB接続設定後に全体評価が表示されます。"));
    }
    const play = make("a", "play-link", "遊んで集計する");
    play.href = playHref || "#";
    play.dataset.playGameId = gameId;
    play.dataset.playGameTitle = title;
    head.append(titleBox, play);

    const stars = make("div", "star-row");
    renderStars(stars, gameId);

    const actions = make("div", "ugc-actions");
    const favorite = makeButton("secondary-link ugc-toggle", summary.favorite ? "お気に入り済み" : "お気に入り", summary.favorite);
    favorite.dataset.favoriteAction = gameId;
    favorite.addEventListener("click", () => {
      noteFavorite(gameId, !summary.favorite);
      renderPanel(panel);
    });
    actions.append(favorite);

    const reviewPolicy = make("div", "ugc-form");
    reviewPolicy.append(make("h3", "", "レビューについて"));
    reviewPolicy.append(
      make(
        "p",
        "ugc-empty",
        "現在、レビュー本文の新規投稿は一時停止しています。AdSense 審査と運営体制の見直しに合わせて、個人情報やスパムを防ぎやすい形へ整えてから再開予定です。5段階評価とプレイ記録は継続して利用できます。",
      ),
    );

    const lists = make("div", "ugc-lists");
    const reviewList = make("div", "ugc-list");
    const historyList = make("div", "ugc-list");
    reviewList.append(make("h3", "", "みんなのレビュー"));
    historyList.append(make("h3", "", "この端末のプレイ履歴"));
    const reviewItems = make("div");
    const historyItems = make("div");
    reviewList.append(reviewItems);
    historyList.append(historyItems);
    lists.append(reviewList, historyList);

    renderList(reviewItems, reviews, "まだレビューはありません。");
    renderHistoryList(historyItems, localRecentPlays(gameId));

    panel.append(head, stars, actions, reviewPolicy, lists);
  };

  const bindPlayLinks = () => {
    document.querySelectorAll("[data-play-game-id]").forEach((link) => {
      if (link.dataset.ugcBound === "true") return;
      link.dataset.ugcBound = "true";
      link.addEventListener("click", () => {
        recordPlay(link.dataset.playGameId, link.dataset.playGameTitle, link.getAttribute("href") || "");
      });
    });
  };

  markVisit();

  window.CollectUGC = {
    readStore,
    summaryFor,
    popularityScoreFor,
    recordPlay,
    recordCompletion,
    recordRestart,
    renderPanel,
    fetchStats,
    fetchReviews,
    getProfileSummary,
    getGameRecord,
    getTodayChallengeState,
    markDailyChallengeStart,
    noteShare,
    noteMoodTag,
    noteFavorite,
    markHumanLike,
  };

  window.CollectPlayer = {
    readStore,
    getProfileSummary,
    getGameRecord,
    recordPlay,
    recordCompletion,
    recordRestart,
    getTodayChallengeState,
    markDailyChallengeStart,
    noteShare,
    noteMoodTag,
    noteFavorite,
    markHumanLike,
  };

  document.addEventListener("DOMContentLoaded", () => {
    fetchStats();
    document.querySelectorAll("[data-ugc-panel]").forEach((panel) => {
      renderPanel(panel);
      fetchReviews(panel.dataset.gameId);
    });
    bindPlayLinks();
  });
})();
