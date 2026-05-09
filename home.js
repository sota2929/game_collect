const games = [
  {
    "title": "クリスタル防衛線",
    "href": "games/crystal-descent-defense/index.html",
    "thumb": "assets/thumbs/crystal-descent-defense.png",
    "playHref": "tower_defense/index.html",
    "genre": "Strategy",
    "popularity": 1,
    "released": 1,
    "description": "タワーを配置・合成して鉱脈を守る防衛ゲーム。じっくり遊びたい時におすすめ。",
    "meta": [
      "Wave制",
      "タワー合成",
      "ルート構築"
    ]
  },
  {
    "title": "オーロラ航路",
    "href": "games/aurora-drift/index.html",
    "thumb": "assets/thumbs/aurora-drift.png",
    "playHref": "aurora_drift/index.html",
    "genre": "Action",
    "popularity": 2,
    "released": 2,
    "description": "流星を避けながら星粒を集める反射アクション。Dashの使いどころが勝負。",
    "meta": [
      "短時間",
      "キーボード対応",
      "ベストスコア"
    ]
  },
  {
    "title": "紋章の庭",
    "href": "games/glyph-garden/index.html",
    "thumb": "assets/thumbs/glyph-garden.png",
    "playHref": "glyph_garden/index.html",
    "genre": "Puzzle",
    "popularity": 3,
    "released": 3,
    "description": "3個以上つながった紋章を消して連鎖を狙う盤面パズル。スマホでも遊びやすい設計。",
    "meta": [
      "3個消し",
      "コンボ",
      "詰み判定"
    ]
  },
  {
    "title": "ネオン配達便",
    "href": "games/neon-courier/index.html",
    "thumb": "assets/thumbs/neon-courier.png",
    "playHref": "neon_courier/index.html",
    "genre": "Action",
    "popularity": 4,
    "released": 4,
    "description": "雨のネオン街で荷物を拾いながら走る4レーン配達ラン。短時間でスコア更新を狙えます。",
    "meta": [
      "レーン移動",
      "Boost",
      "コンボ"
    ]
  },
  {
    "title": "潮汐の鍛冶場",
    "href": "games/tide-forge/index.html",
    "thumb": "assets/thumbs/tide-forge.png",
    "playHref": "tide_forge/index.html",
    "genre": "Timing",
    "popularity": 5,
    "released": 5,
    "description": "潮汐炉で刃を鍛えるタイミングゲーム。針とゾーンを合わせてPerfectを重ねます。",
    "meta": [
      "タイミング",
      "Perfect判定",
      "連鎖"
    ]
  }
];

const list = document.querySelector("#gameList");
const tabs = document.querySelectorAll(".tab");
const search = document.querySelector("#search");
let sort = "popular";

const initialQuery = new URLSearchParams(window.location.search).get("q");
if (initialQuery) {
  search.value = initialQuery;
}

function render() {
  const query = search.value.trim().toLowerCase();
  const sorted = [...games]
    .filter((game) => {
      const text = `${game.title} ${game.genre} ${game.description} ${game.meta.join(" ")}`.toLowerCase();
      return text.includes(query);
    })
    .sort((a, b) => {
      if (sort === "new") return b.released - a.released;
      if (sort === "title") return a.title.localeCompare(b.title);
      return a.popularity - b.popularity;
    });

  list.innerHTML = sorted
    .map(
      (game, index) => `
        <article class="game-card game-card-with-thumb">
          <a class="game-thumb" href="${game.href}" aria-label="${game.title}の詳細を見る">
            <img src="${game.thumb}" alt="${game.title}のプレイ中サムネイル" loading="lazy" width="360" height="210" />
          </a>
          <div>
            <div class="game-card-header">
              <span class="rank">${index + 1}</span>
              <h2><a href="${game.href}">${game.title}</a></h2>
              <span class="tag">${game.genre}</span>
            </div>
            <p class="game-description">${game.description}</p>
            <div class="game-meta">${game.meta.map((item) => `<span>${item}</span>`).join("")}</div>
          </div>
          <div class="game-actions compact">
            <a class="secondary-link" href="${game.href}">詳細</a>
            <a class="play-link" href="${game.playHref}">遊ぶ</a>
          </div>
        </article>
      `,
    )
    .join("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    sort = tab.dataset.sort;
    tabs.forEach((item) => item.classList.toggle("selected", item === tab));
    render();
  });
});

search.addEventListener("input", render);
render();
