const games = [
  {
    title: "Crystal Descent Defense",
    href: "tower_defense/index.html",
    genre: "Strategy",
    popularity: 1,
    released: 1,
    description: "タワーを配置・合成して鉱脈を守る防衛ゲーム。じっくり遊びたい時におすすめ。",
    meta: ["Wave制", "タワー合成", "難易度上昇"],
  },
  {
    title: "Aurora Drift",
    href: "aurora_drift/index.html",
    genre: "Action",
    popularity: 2,
    released: 2,
    description: "流星を避けながら星粒を集める反射アクション。Dashの使いどころが勝負。",
    meta: ["短時間", "キーボード対応", "ベストスコア"],
  },
  {
    title: "Glyph Garden",
    href: "glyph_garden/index.html",
    genre: "Puzzle",
    popularity: 3,
    released: 3,
    description: "3個以上つながった紋章を消して連鎖を狙う盤面パズル。スマホでも遊びやすい設計。",
    meta: ["3個消し", "コンボ", "詰み判定"],
  },
];

const list = document.querySelector("#gameList");
const tabs = document.querySelectorAll(".tab");
const search = document.querySelector("#search");
let sort = "popular";

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
        <article class="game-card">
          <div>
            <div class="game-card-header">
              <span class="rank">${index + 1}</span>
              <h2>${game.title}</h2>
              <span class="tag">${game.genre}</span>
            </div>
            <p class="game-description">${game.description}</p>
            <div class="game-meta">${game.meta.map((item) => `<span>${item}</span>`).join("")}</div>
          </div>
          <a class="play-link" href="${game.href}">遊ぶ</a>
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
