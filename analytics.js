(function () {
  const measurementId = "G-R9ZQ2ZVV9H";

  // GA4の測定IDを変更する場合は、この値と既存HTMLのgtag config IDを同じ値にしてください。
  if (measurementId && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
    window.gtag("js", new Date());
    window.gtag("config", measurementId);
  }

  function sendEvent(name, params) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params || {});
    }
  }

  document.addEventListener("click", (event) => {
    const play = event.target.closest("[data-play-game-id]");
    if (play) {
      sendEvent("game_start", {
        game_id: play.dataset.playGameId,
        game_title: play.dataset.playGameTitle || play.textContent.trim(),
      });
      return;
    }

    const gameLink = event.target.closest("[data-game-card-id]");
    if (gameLink) {
      sendEvent("game_card_click", {
        game_id: gameLink.dataset.gameCardId,
        game_title: gameLink.dataset.gameCardTitle || gameLink.textContent.trim(),
      });
      return;
    }

    const genreLink = event.target.closest("[data-genre]");
    if (genreLink) {
      sendEvent("genre_click", {
        genre: genreLink.dataset.genre,
        link_text: genreLink.textContent.trim(),
      });
      return;
    }

    const related = event.target.closest("[data-related-game-id]");
    if (related) {
      sendEvent("related_game_click", {
        game_id: related.dataset.relatedGameId,
        game_title: related.textContent.trim(),
      });
    }
  });
})();
