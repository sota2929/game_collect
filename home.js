const games = [
  {
    "id": "crystal-descent-defense",
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
    "id": "aurora-drift",
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
    "id": "glyph-garden",
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
    "id": "neon-courier",
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
    "id": "tide-forge",
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
  },
  {
    "id": "aijingi",
    "title": "合陣戯",
    "href": "games/aijingi/index.html",
    "thumb": "assets/thumbs/aijingi.svg",
    "playHref": "aijingi/index.html",
    "genre": "Strategy",
    "popularity": 6,
    "released": 6,
    "description": "PC専用。20×20盤面で陣形を組み、結合値と攻撃線を読み合う戦略ボードゲーム。陣形AIと対戦できます。",
    "meta": [
      "20×20盤面",
      "PC専用",
      "陣形AI",
      "5行動制"
    ]
  },
  {
    "id": "arcane-duel",
    "title": "Arcane Duel",
    "href": "games/arcane-duel/index.html",
    "thumb": "assets/thumbs/arcane-duel.png",
    "playHref": "arcane_duel/index.html",
    "genre": "Strategy",
    "popularity": 7,
    "released": 7,
    "description": "PC専用。敵の魔法陣を解析し、属性と特殊線で迎撃する5レーン魔法バトル。",
    "meta": [
      "PC専用",
      "魔法陣解析",
      "5レーン",
      "CPU対戦"
    ]
  },
  {
    "id": "ten-link-campus",
    "title": "10リンク・キャンパス",
    "href": "games/ten-link-campus/index.html",
    "thumb": "assets/thumbs/ten-link-campus.png",
    "playHref": "ten_link_campus/index.html",
    "genre": "Puzzle",
    "popularity": 8,
    "released": 8,
    "description": "数字カードをクリックして合計10を作る1分脳トレパズル。授業の合間や通学中の暇つぶしにおすすめ。",
    "meta": [
      "数字パズル",
      "脳トレ",
      "1分プレイ",
      "スマホ対応"
    ]
  },
  {
    "id": "parity-sort-lab",
    "title": "奇偶ソートラボ",
    "href": "games/parity-sort-lab/index.html",
    "thumb": "assets/thumbs/parity-sort-lab.png",
    "playHref": "parity_sort_lab/index.html",
    "genre": "Puzzle",
    "popularity": 9,
    "released": 9,
    "description": "奇数と偶数を見分けて数字カードを正しい順番に並べる短時間脳トレパズル。",
    "meta": [
      "数字パズル",
      "脳トレ",
      "タイムアタック",
      "スマホ対応"
    ]
  },
  {
    "id": "after-school-beatline",
    "title": "放課後ビートライン",
    "href": "games/after-school-beatline/index.html",
    "thumb": "assets/thumbs/after-school-beatline.png",
    "playHref": "after_school_beatline/index.html",
    "genre": "Timing",
    "popularity": 10,
    "released": 10,
    "description": "8レーンのノーツを叩くライフ制リズムゲーム。Level 1〜5の速度で遊べます。",
    "meta": [
      "リズムゲーム",
      "音ゲー",
      "8レーン",
      "ライフ制",
      "スマホ対応"
    ]
  }
];

const list = document.querySelector("#gameList");
const personalLibrary = document.querySelector("#personalLibrary");
const tabs = document.querySelectorAll(".tab");
const search = document.querySelector("#search");
let sort = "popular";

const initialQuery = new URLSearchParams(window.location.search).get("q");
if (initialQuery) {
  search.value = initialQuery;
}

function renderPersonalLibrary() {
  const store = window.CollectUGC.readStore();
  const favorites = games.filter((game) => window.CollectUGC.summaryFor(game.id).favorite);
  const played = games
    .map((game) => ({ game, summary: window.CollectUGC.summaryFor(game.id) }))
    .filter((item) => item.summary.lastPlayed)
    .sort((a, b) => {
      const aTime = store.games[a.game.id]?.plays?.[0]?.time || 0;
      const bTime = store.games[b.game.id]?.plays?.[0]?.time || 0;
      return bTime - aTime;
    })
    .slice(0, 5)
    .map((item) => item.game);

  const sections = [
    ["お気に入り", favorites],
    ["最近遊んだ", played],
  ];

  personalLibrary.innerHTML = sections
    .map(
      ([title, items]) => `
        <article class="library-card">
          <h3>${title}</h3>
          ${
            items.length
              ? `<div class="library-links">${items
                  .map((game) => `<a href="${game.href}">${game.title}</a>`)
                  .join("")}</div>`
              : `<p>まだありません。</p>`
          }
        </article>
      `,
    )
    .join("");
}

function render() {
  renderPersonalLibrary();
  const query = search.value.trim().toLowerCase();
  const sorted = [...games]
    .filter((game) => {
      const text = `${game.title} ${game.genre} ${game.description} ${game.meta.join(" ")}`.toLowerCase();
      return text.includes(query);
    })
    .sort((a, b) => {
      if (sort === "new") return b.released - a.released;
      if (sort === "title") return a.title.localeCompare(b.title);
      return window.CollectUGC.popularityScoreFor(b) - window.CollectUGC.popularityScoreFor(a);
    });

  list.innerHTML = sorted
    .map(
      (game, index) => {
        const summary = window.CollectUGC.summaryFor(game.id);
        const rating = summary.ratingCount ? `${summary.averageRating.toFixed(1)} / 5` : "未評価";
        const rankLabel = sort === "popular" ? `人気ランキング ${index + 1}位` : `表示順 ${index + 1}番目`;
        const saved = [
          summary.favorite ? "お気に入り" : "",
        ].filter(Boolean);
        return `
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
            <div class="ugc-mini" aria-label="${game.title}のローカル評価">
              <span>全体評価 ${rating}</span>
              <span>${rankLabel}</span>
              <span>レビュー ${summary.reviewCount}件</span>
              <span>プレイ ${summary.playCount}回</span>
              ${saved.map((item) => `<span class="saved">${item}</span>`).join("")}
            </div>
          </div>
          <div class="game-actions compact">
            <a class="secondary-link" href="${game.href}">詳細</a>
            <a class="play-link" href="${game.playHref}" data-play-game-id="${game.id}" data-play-game-title="${game.title}">遊ぶ</a>
          </div>
        </article>
      `;
      },
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
window.addEventListener("collect:ugc-updated", render);
render();
