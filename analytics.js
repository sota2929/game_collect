(function () {
  const measurementId = "G-R9ZQ2ZVV9H";
  const debug =
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost" ||
    location.protocol === "file:";

  const sentOnce = new Set();
  const impressionIds = new Set();
  let humanInteractionSent = false;
  let scrollWatchStart = Date.now();

  const ensureGtag = () => {
    if (typeof window.gtag === "function") return;
    if (!measurementId) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    const existing = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.append(script);
    }
    window.gtag("js", new Date());
    window.gtag("config", measurementId);
  };

  ensureGtag();

  const deviceType = () => {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width <= 767) return "mobile";
    if (width <= 1024) return "tablet";
    return "desktop";
  };

  const sourceAreaForElement = (element) =>
    element?.closest?.("[data-source-area]")?.dataset?.sourceArea || "unknown";

  const catalogFor = (gameId) => {
    const catalog = window.CollectGameCatalog || [];
    return catalog.find((game) => game.id === gameId) || null;
  };

  const baseParams = (params = {}) => {
    const profile = window.CollectPlayer?.getProfileSummary?.() || {};
    const catalog = params.game_id ? catalogFor(params.game_id) : null;
    return {
      device_type: deviceType(),
      is_returning_like: Boolean(profile.isReturningLike),
      mood_tags: Array.isArray(params.mood_tags)
        ? params.mood_tags.join("|")
        : Array.isArray(catalog?.moodTags)
          ? catalog.moodTags.join("|")
          : undefined,
      genre: params.genre || catalog?.genre,
      ...params,
    };
  };

  const track = (name, params = {}, options = {}) => {
    const onceKey = options.onceKey ? `${name}:${options.onceKey}` : "";
    if (onceKey && sentOnce.has(onceKey)) return;
    if (onceKey) sentOnce.add(onceKey);
    const payload = baseParams(params);
    if (debug) {
      console.log("[CollectAnalytics]", name, payload);
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
    }
  };

  const sendHumanInteraction = (reason = "interaction") => {
    if (humanInteractionSent) return;
    humanInteractionSent = true;
    window.CollectPlayer?.markHumanLike?.();
    track(
      "human_interaction",
      {
        interaction_reason: reason,
        source_area: "session",
      },
      { onceKey: "session" },
    );
  };

  const bindHumanSignals = () => {
    ["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
      window.addEventListener(
        eventName,
        () => sendHumanInteraction(eventName),
        { once: true, passive: true },
      );
    });
    window.addEventListener(
      "scroll",
      () => {
        const elapsed = Date.now() - scrollWatchStart;
        if (elapsed >= 5000 && window.scrollY > 100) {
          sendHumanInteraction("scroll_5s");
        }
      },
      { passive: true },
    );
  };

  const bindClickEvents = () => {
    document.addEventListener("click", (event) => {
      const play = event.target.closest("[data-play-game-id]");
      if (play) {
        sendHumanInteraction("play_click");
        const gameId = play.dataset.playGameId;
        const catalog = catalogFor(gameId);
        track("game_card_click", {
          game_id: gameId,
          game_title: play.dataset.playGameTitle || play.textContent.trim(),
          source_area: sourceAreaForElement(play),
          genre: catalog?.genre,
          mood_tags: catalog?.moodTags,
          cta_kind: "play_button",
        });
        return;
      }

      const gameLink = event.target.closest("[data-game-card-id]");
      if (gameLink) {
        const gameId = gameLink.dataset.gameCardId;
        const catalog = catalogFor(gameId);
        track("game_card_click", {
          game_id: gameId,
          game_title: gameLink.dataset.gameCardTitle || gameLink.textContent.trim(),
          source_area: sourceAreaForElement(gameLink),
          genre: catalog?.genre,
          mood_tags: catalog?.moodTags,
        });
        return;
      }

      const genreLink = event.target.closest("[data-genre]");
      if (genreLink) {
        track("genre_click", {
          genre: genreLink.dataset.genre,
          link_text: genreLink.textContent.trim(),
          source_area: sourceAreaForElement(genreLink),
        });
        return;
      }

      const related = event.target.closest("[data-related-game-id]");
      if (related) {
        track("related_game_click", {
          game_id: related.dataset.relatedGameId,
          game_title: related.textContent.trim(),
          source_area: sourceAreaForElement(related),
        });
        return;
      }

      const mood = event.target.closest("[data-mood-tag]");
      if (mood) {
        const tag = mood.dataset.moodTag;
        window.CollectPlayer?.noteMoodTag?.(tag);
        track("mood_tag_click", {
          mood_tag: tag,
          source_area: sourceAreaForElement(mood),
        });
        return;
      }

      const shareAction = event.target.closest("[data-share-action]");
      if (shareAction) {
        track("share_click", {
          source_area: sourceAreaForElement(shareAction),
          share_method: shareAction.dataset.shareAction,
          game_id: shareAction.dataset.gameId,
          game_title: shareAction.dataset.gameTitle,
        });
      }
    });
  };

  const bindImpressions = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const card = entry.target;
          const gameId = card.dataset.gameCardId;
          if (!gameId || impressionIds.has(gameId)) return;
          impressionIds.add(gameId);
          const catalog = catalogFor(gameId);
          track("game_impression", {
            game_id: gameId,
            game_title: card.dataset.gameCardTitle || catalog?.title || gameId,
            genre: catalog?.genre,
            mood_tags: catalog?.moodTags,
            source_area: sourceAreaForElement(card),
          });
          observer.unobserve(card);
        });
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.35 },
    );
    document.querySelectorAll("[data-game-card-id]").forEach((card) => observer.observe(card));
  };

  const announceReturningLike = () => {
    const profile = window.CollectPlayer?.getProfileSummary?.();
    if (!profile?.isReturningLike) return;
    track(
      "returning_user_like",
      {
        source_area: "session",
      },
      { onceKey: "returning_like_session" },
    );
  };

  window.CollectAnalytics = {
    track,
    sendHumanInteraction,
    sourceAreaForElement,
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindHumanSignals();
    bindClickEvents();
    bindImpressions();
    announceReturningLike();
  });
})();
