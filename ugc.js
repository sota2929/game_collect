(() => {
  const STORAGE_KEY = "collectArcade.local.v2";
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
  };

  const remote = {
    games: {},
    reviews: {},
    loading: false,
    error: "",
  };

  const readStore = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === "object") return { games: parsed.games || {} };
    } catch {
      // Local data should never break the arcade.
    }
    return { games: {} };
  };

  const writeStore = (store) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    notify();
  };

  const notify = () => {
    window.dispatchEvent(new CustomEvent("collect:ugc-updated"));
  };

  const nowLabel = () =>
    new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

  const ensureLocalGame = (store, gameId) => {
    if (!store.games[gameId]) {
      store.games[gameId] = {
        favorite: false,
        plays: [],
      };
    }
    return store.games[gameId];
  };

  const updateLocalGame = (gameId, updater) => {
    const store = readStore();
    const game = ensureLocalGame(store, gameId);
    updater(game);
    writeStore(store);
    return game;
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
    const local = ensureLocalGame(store, gameId);
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
      apiReady: !remote.error,
      apiError: remote.error,
    };
  };

  const popularityScoreFor = (game) => {
    const stats = remote.games[game.id];
    if (stats && Number(stats.popularityScore) > 0) {
      return Number(stats.popularityScore);
    }
    return Math.max(0, 80 - (Number(game.popularity) || 10) * 8);
  };

  const localRecentPlays = (gameId) => {
    const store = readStore();
    return ensureLocalGame(store, gameId).plays;
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

  const recordPlay = (gameId, title = gameNames[gameId] || gameId, href = "") => {
    let shouldPost = false;
    updateLocalGame(gameId, (game) => {
      if (game.plays[0]?.time && Date.now() - game.plays[0].time < 5000) return;
      shouldPost = true;
      game.plays.unshift({
        title,
        href,
        date: nowLabel(),
        time: Date.now(),
      });
      game.plays = game.plays.slice(0, MAX_LOCAL_PLAYS);
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
    const score = make(
      "p",
      "ugc-score",
      `全体評価 ${ratingLabel} ・ 評価 ${summary.ratingCount}件 ・ レビュー ${summary.reviewCount}件 ・ プレイ ${summary.playCount}回`,
    );
    titleBox.append(score);
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
    favorite.addEventListener("click", () => {
      updateLocalGame(gameId, (game) => {
        game.favorite = !game.favorite;
      });
      renderPanel(panel);
    });
    actions.append(favorite);

    const reviewForm = make("form", "ugc-form");
    reviewForm.append(make("h3", "", "レビュー"));
    const reviewInput = make("textarea");
    reviewInput.name = "review";
    reviewInput.maxLength = 500;
    reviewInput.rows = 3;
    reviewInput.placeholder = "良かった点やおすすめポイントを500字以内で書く";
    const reviewButton = make("button", "", "レビューを投稿");
    reviewButton.type = "submit";
    reviewForm.append(reviewInput, reviewButton);

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

    reviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = clampText(reviewInput.value, 500);
      if (!text) return;
      reviewButton.disabled = true;
      try {
        await postReview(gameId, text);
      } finally {
        renderPanel(panel);
      }
    });

    panel.append(head, stars, actions, reviewForm, lists);
  };

  const bindPlayLinks = () => {
    document.querySelectorAll("[data-play-game-id]").forEach((link) => {
      link.addEventListener("click", () => {
        recordPlay(link.dataset.playGameId, link.dataset.playGameTitle, link.getAttribute("href") || "");
      });
    });
  };

  const currentGameId = document.currentScript?.dataset.currentGame;

  window.CollectUGC = {
    readStore,
    summaryFor,
    popularityScoreFor,
    recordPlay,
    renderPanel,
    fetchStats,
    fetchReviews,
  };

  document.addEventListener("DOMContentLoaded", () => {
    fetchStats();
    if (currentGameId) {
      recordPlay(currentGameId, gameNames[currentGameId] || currentGameId, window.location.pathname);
    }
    document.querySelectorAll("[data-ugc-panel]").forEach((panel) => {
      renderPanel(panel);
      fetchReviews(panel.dataset.gameId);
    });
    bindPlayLinks();
  });
})();
