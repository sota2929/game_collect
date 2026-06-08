const games = [
  {
    "id": "crystal-descent-defense",
    "title": "クリスタル防衛線",
    "href": "games/crystal-descent-defense/",
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
    "href": "games/aurora-drift/",
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
    "href": "games/glyph-garden/",
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
    "href": "games/neon-courier/",
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
    "href": "games/tide-forge/",
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
    "href": "games/aijingi/",
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
    "href": "games/arcane-duel/",
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
    "href": "games/ten-link-campus/",
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
    "href": "games/parity-sort-lab/",
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
    "href": "games/after-school-beatline/",
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
  },
  {
    "id": "stardust-merge-cafe",
    "title": "星屑マージカフェ",
    "href": "games/stardust-merge-cafe/",
    "thumb": "assets/thumbs/stardust-merge-cafe.png",
    "playHref": "stardust_merge_cafe/index.html",
    "genre": "Puzzle",
    "popularity": 11,
    "released": 11,
    "description": "3つ以上つながった同じスイーツを選んで合成する75秒マージパズル。2048風の合成と注文ボーナスが楽しい短時間ゲーム。",
    "meta": [
      "マージパズル",
      "2048風",
      "75秒",
      "スマホ対応"
    ]
  },
  {
    "id": "mini-sudoku-lounge",
    "title": "ミニ数独ラウンジ",
    "href": "games/mini-sudoku-lounge/",
    "thumb": "assets/thumbs/mini-sudoku-lounge.png",
    "playHref": "mini_sudoku_lounge/index.html",
    "genre": "Puzzle",
    "popularity": 12,
    "released": 12,
    "description": "4x4盤面に1〜4を入れる短時間ミニ数独。スマホでもPCでも遊べる無料ブラウザ脳トレゲーム。",
    "meta": [
      "ミニ数独",
      "数字パズル",
      "脳トレ",
      "スマホ対応"
    ]
  },
  {
    "id": "color-reflex-dojo",
    "title": "色彩反射道場",
    "href": "games/color-reflex-dojo/",
    "thumb": "assets/thumbs/color-reflex-dojo.png",
    "playHref": "color_reflex_dojo/index.html",
    "genre": "Brain Training",
    "popularity": 13,
    "released": 13,
    "description": "文字色・文字を読む・背景色を瞬時に見分ける45秒反射脳トレ。スマホでもPCでも遊べる短時間ミニゲーム。",
    "meta": [
      "反射神経",
      "脳トレ",
      "45秒",
      "スマホ対応"
    ]
  },
  {
    "id": "starlight-spotter",
    "title": "星灯りまちがい探し",
    "href": "games/starlight-spotter/",
    "thumb": "assets/thumbs/starlight-spotter.png",
    "playHref": "starlight_spotter/",
    "genre": "Puzzle",
    "popularity": 14,
    "released": 14,
    "description": "左右の星空シーンから5つの違いを探す観察力パズル。スマホでもPCでも遊べる無料ブラウザ間違い探しゲーム。",
    "meta": [
      "間違い探し",
      "脳トレ",
      "観察力",
      "スマホ対応"
    ]
  },
  {
    "id": "moonlit-memory-route",
    "title": "月影メモリールート",
    "href": "games/moonlit-memory-route/",
    "thumb": "assets/thumbs/moonlit-memory-route.png",
    "playHref": "moonlit_memory_route/",
    "genre": "Brain Training",
    "popularity": 15,
    "released": 15,
    "description": "月明かりで光った道順を覚えてなぞる記憶力ルートパズル。短時間で集中力を試せます。",
    "meta": [
      "記憶力",
      "迷路",
      "脳トレ",
      "スマホ対応"
    ]
  },
  {
    "id": "lantern-slide-puzzle",
    "title": "灯籠スライドパズル",
    "href": "games/lantern-slide-puzzle/",
    "thumb": "assets/thumbs/lantern-slide-puzzle.png",
    "playHref": "lantern_slide_puzzle/",
    "genre": "Puzzle",
    "popularity": 16,
    "released": 16,
    "description": "夜祭りの絵柄をスライドして完成させる脳トレパズル。スマホでもPCでも遊べる無料ブラウザゲーム。",
    "meta": [
      "スライドパズル",
      "脳トレ",
      "空間認識",
      "スマホ対応"
    ]
  },
  {
    "id": "last-train-number-hunt",
    "title": "終電ナンバーサーチ",
    "href": "games/last-train-number-hunt/",
    "thumb": "assets/thumbs/last-train-number-hunt.png",
    "playHref": "last_train_number_hunt/",
    "genre": "Brain Training",
    "popularity": 17,
    "released": 17,
    "description": "駅の発車標に散らばった数字を1から順番に探す45秒脳トレ。反射神経と視線移動でスコア更新を狙えます。",
    "meta": [
      "数字タップ",
      "脳トレ",
      "反射神経",
      "スマホ対応"
    ]
  },
  {
    "id": "galaxy-sushi-clicker",
    "title": "銀河回転寿司クリッカー",
    "href": "games/galaxy-sushi-clicker/",
    "thumb": "assets/thumbs/galaxy-sushi-clicker.png",
    "playHref": "galaxy_sushi_clicker/",
    "genre": "Casual",
    "popularity": 18,
    "released": 18,
    "description": "宇宙回転寿司で皿をタップし、4種類のアップグレードで売上を伸ばす1分クリッカー。キーボード購入で手を止めずに遊べます。",
    "meta": [
      "クリッカー",
      "アップグレード",
      "1分プレイ",
      "スマホ対応"
    ]
  },
  {
    "id": "midnight-typing-proof",
    "title": "深夜校正タイピング",
    "href": "games/midnight-typing-proof/",
    "thumb": "assets/thumbs/midnight-typing-proof.png",
    "playHref": "midnight_typing_proof/",
    "genre": "Brain Training",
    "popularity": 19,
    "released": 19,
    "description": "深夜の校正室で浮かぶ誤字をローマ字入力で封印する60秒タイピングゲーム。PCブラウザで短時間に集中できます。",
    "meta": [
      "タイピング",
      "ローマ字",
      "脳トレ",
      "PC推奨"
    ]
  },
  {
    "id": "sky-post-one-stroke",
    "title": "雲上ひとふで郵便",
    "href": "games/sky-post-one-stroke/",
    "thumb": "assets/thumbs/sky-post-one-stroke.png",
    "playHref": "sky_post_one_stroke/",
    "genre": "Puzzle",
    "popularity": 20,
    "released": 20,
    "description": "雲の郵便局を一筆書きで巡る40秒脳トレパズル。スマホでもPCでも、なぞるだけで遊べる短時間ゲームです。",
    "meta": [
      "一筆書き",
      "脳トレ",
      "40秒",
      "スマホ対応"
    ]
  },
  {
    "id": "kanji-mirage-museum",
    "title": "幻字鑑定室",
    "href": "games/kanji-mirage-museum/",
    "thumb": "assets/thumbs/kanji-mirage-museum.png",
    "playHref": "kanji_mirage_museum/",
    "genre": "Brain Training",
    "popularity": 21,
    "released": 21,
    "description": "似た漢字の中から本物を見抜く60秒の漢字まちがい探し脳トレ。スマホでもPCでも遊べる無料ブラウザゲームです。",
    "meta": [
      "漢字パズル",
      "脳トレ",
      "60秒",
      "スマホ対応"
    ]
  },
  {
    "id": "lost-call-switchboard",
    "title": "迷子電話交換室",
    "href": "games/lost-call-switchboard/",
    "thumb": "assets/thumbs/lost-call-switchboard.png",
    "playHref": "lost_call_switchboard/",
    "genre": "Puzzle",
    "popularity": 22,
    "released": 22,
    "description": "昭和レトロな電話交換台で迷子の通話を正しい相手へつなぐ70秒の線つなぎ脳トレパズル。",
    "meta": [
      "線つなぎ",
      "脳トレ",
      "70秒",
      "スマホ対応"
    ]
  },
  {
    "id": "futon-flight",
    "title": "ふとんがふっとんだ！",
    "href": "games/futon-flight/",
    "thumb": "assets/thumbs/futon-flight.png",
    "playHref": "futon_flight/",
    "genre": "Action",
    "popularity": 23,
    "released": 23,
    "description": "屋上から布団を飛ばして着地距離を競う、短時間の物理アクション。長押しと空中タップだけで遊べます。",
    "meta": [
      "物理アクション",
      "5投チャレンジ",
      "スマホ対応",
      "インストール不要"
    ]
  },
  {
    "id": "moonlit-curio-sorter",
    "title": "骨董仕分けナイト",
    "href": "games/moonlit-curio-sorter/",
    "thumb": "assets/thumbs/moonlit-curio-sorter.svg",
    "playHref": "moonlit_curio_sorter/",
    "genre": "Casual",
    "popularity": 24,
    "released": 24,
    "description": "閉店後の骨董百貨店で流れてくる珍品をその場で正しい引き出しへ送る、60秒の仕分けアクション。",
    "meta": [
      "仕分けアクション",
      "60秒シフト",
      "スマホ対応",
      "インストール不要"
    ]
  }
];

const moodTagsById = {
  "crystal-descent-defense": ["頭を使う", "じっくり遊ぶ", "PCで腰を据える"],
  "aurora-drift": ["反射神経", "スコア更新したい", "1分だけ遊ぶ"],
  "glyph-garden": ["頭を使う", "のんびり遊ぶ", "スマホで片手"],
  "neon-courier": ["反射神経", "スコア更新したい", "集中したい"],
  "tide-forge": ["音なしで遊べる", "集中したい", "タイミング勝負"],
  aijingi: ["頭を使う", "PCで腰を据える", "じっくり遊ぶ"],
  "arcane-duel": ["頭を使う", "PCで腰を据える", "じっくり遊ぶ"],
  "ten-link-campus": ["1分だけ遊ぶ", "頭を使う", "スマホで片手"],
  "parity-sort-lab": ["1分だけ遊ぶ", "頭を使う", "スマホで片手"],
  "after-school-beatline": ["反射神経", "音ゲー気分", "スコア更新したい"],
  "stardust-merge-cafe": ["のんびり遊ぶ", "頭を使う", "スマホで片手"],
  "mini-sudoku-lounge": ["頭を使う", "音なしで遊べる", "のんびり遊ぶ"],
  "color-reflex-dojo": ["反射神経", "集中したい", "1分だけ遊ぶ"],
  "starlight-spotter": ["のんびり遊ぶ", "頭を使う", "音なしで遊べる"],
  "moonlit-memory-route": ["集中したい", "頭を使う", "スマホで片手"],
  "lantern-slide-puzzle": ["頭を使う", "音なしで遊べる", "のんびり遊ぶ"],
  "last-train-number-hunt": ["1分だけ遊ぶ", "頭を使う", "スコア更新したい"],
  "galaxy-sushi-clicker": ["のんびり遊ぶ", "スコア更新したい", "スマホで片手"],
  "midnight-typing-proof": ["タイピング", "集中したい", "PCで腰を据える"],
  "sky-post-one-stroke": ["頭を使う", "音なしで遊べる", "スマホで片手"],
  "kanji-mirage-museum": ["頭を使う", "集中したい", "1分だけ遊ぶ"],
  "lost-call-switchboard": ["頭を使う", "のんびり遊ぶ", "スマホで片手"],
  "futon-flight": ["今日の運試し", "反射神経", "スコア更新したい"],
  "moonlit-curio-sorter": ["スマホで片手", "反射神経", "集中したい"],
};

games.forEach((game) => {
  game.moodTags = moodTagsById[game.id] || ["1分だけ遊ぶ", "インストール不要", "気軽に遊ぶ"];
});

window.CollectGameCatalog = games;

const list = document.querySelector("#gameList");
const personalLibrary = document.querySelector("#personalLibrary");
const tabs = document.querySelectorAll(".tab");
const search = document.querySelector("#search");
const challengeRoot = document.querySelector("#dailyChallenge");
const playerSnapshot = document.querySelector("#playerSnapshot");
const moodExplorer = document.querySelector("#moodExplorer");
let sort = "popular";
let activeMood = "";

const initialQuery = new URLSearchParams(window.location.search).get("q");
if (initialQuery) {
  search.value = initialQuery;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  return [...value].reduce((acc, char) => (acc * 33 + char.charCodeAt(0)) % 2147483647, 7);
}

const challengePool = [
  "last-train-number-hunt",
  "galaxy-sushi-clicker",
  "kanji-mirage-museum",
  "color-reflex-dojo",
  "stardust-merge-cafe",
  "moonlit-curio-sorter",
  "futon-flight",
  "lost-call-switchboard",
];

const moodLeadCopy = {
  "1分だけ遊ぶ": "短時間で区切りやすいゲームだけを集めました。まず1本遊びたいときの入口です。",
  "頭を使う": "考える気分の日に向いた、脳トレやパズル中心のラインです。",
  "反射神経": "テンポよく判断したい日に。短時間でも手応えが出やすいゲームを並べています。",
  "スマホで片手": "通学中や休憩中でも触りやすい、片手操作に向いたゲームです。",
  "音なしで遊べる": "静かな場所でも遊びやすい、視覚中心のミニゲームを選べます。",
  タイピング: "キーボードで遊びたい日に。PC向けの集中系ゲームをまとめています。",
  "今日の運試し": "勢いで一発伸ばしたい気分向け。結果を共有したくなるスコア系です。",
  "スコア更新したい": "ハイスコアを詰める楽しさが強いゲームを集めています。",
  "のんびり遊ぶ": "急がず遊びたい日に。落ち着いたテンポのゲームを選べます。",
  "集中したい": "短時間で頭を切り替えたい時向け。静かに没頭しやすいゲームです。",
  "PCで腰を据える": "大きい画面でじっくり遊ぶ、PC向けのゲームをまとめています。",
  "音ゲー気分": "リズム感やテンポを楽しみたい日にちょうどいい入口です。",
  "タイミング勝負": "押す瞬間の気持ちよさで遊びたい日に向いています。",
};

function getChallengeGame() {
  const key = localDateKey();
  const gameId = challengePool[hashString(key) % challengePool.length];
  return games.find((game) => game.id === gameId) || games[0];
}

function challengeLabel(game) {
  const labels = {
    "last-train-number-hunt": "今日の10秒集中チャレンジ",
    "galaxy-sushi-clicker": "今日の売上チャレンジ",
    "kanji-mirage-museum": "今日の見抜きチャレンジ",
    "color-reflex-dojo": "今日の反射チャレンジ",
    "stardust-merge-cafe": "今日の連鎖チャレンジ",
    "moonlit-curio-sorter": "今日の仕分けチャレンジ",
    "futon-flight": "今日の一投チャレンジ",
    "lost-call-switchboard": "今日の接続チャレンジ",
  };
  return labels[game.id] || "今日のチャレンジ";
}

function favoriteButton(game) {
  const summary = window.CollectUGC.summaryFor(game.id);
  return `
    <button
      class="favorite-toggle${summary.favorite ? " active" : ""}"
      type="button"
      data-favorite-toggle="${game.id}"
      aria-pressed="${summary.favorite ? "true" : "false"}"
      aria-label="${game.title}をお気に入りに保存"
    >
      ${summary.favorite ? "お気に入り済み" : "お気に入り"}
    </button>
  `;
}

function renderDailyChallenge() {
  const game = getChallengeGame();
  const state = window.CollectPlayer.getTodayChallengeState(game.id);
  const profile = window.CollectPlayer.getProfileSummary();
  const record = window.CollectPlayer.getGameRecord(game.id);
  const isToday = state.dateKey === localDateKey();
  const alreadyStarted = isToday && state.gameId === game.id && state.started;
  const completed = isToday && state.gameId === game.id && state.completed;
  const bestLabel = record.bestScore ? `${record.bestScore.toLocaleString()} 点` : "未挑戦";
  const actionLabel = completed ? "記録を更新する" : alreadyStarted ? "続けて挑戦" : "今すぐ挑戦";
  const statusLabel = completed
    ? "今日は挑戦済みです。自己ベスト更新を狙えます。"
    : alreadyStarted
      ? "今日はすでに遊んでいます。もう一度伸ばせます。"
      : "今日はこの1本から始めるのがおすすめです。";

  challengeRoot.innerHTML = `
    <div class="challenge-copy">
      <p class="eyebrow">Daily Challenge</p>
      <h2>${challengeLabel(game)}</h2>
      <p class="challenge-lead">今日のお題は <strong>${game.title}</strong>。${game.description}</p>
      <div class="challenge-stats">
        <span><strong>${bestLabel}</strong><small>自己ベスト</small></span>
        <span><strong>${profile.streakDays}日</strong><small>連続挑戦</small></span>
        <span><strong>${profile.totalPlays}回</strong><small>総プレイ回数</small></span>
      </div>
      <p class="challenge-status">${statusLabel}</p>
      <div class="hero-actions">
        <a
          class="play-link challenge-link"
          href="/${game.playHref}"
          data-play-game-id="${game.id}"
          data-play-game-title="${game.title}"
          data-source-area="daily_challenge"
        >${actionLabel}</a>
        <a class="secondary-link" href="/${game.href}" data-game-card-id="${game.id}" data-game-card-title="${game.title}" data-source-area="daily_challenge">記録を見る</a>
        ${favoriteButton(game)}
      </div>
    </div>
    <aside class="challenge-preview">
      <img src="${game.thumb}" alt="${game.title}のサムネイル" width="360" height="210" loading="lazy" />
      <div class="challenge-preview-copy">
        <strong>${game.title}</strong>
        <span>${game.genre}</span>
        <p>${game.moodTags.join(" / ")}</p>
      </div>
    </aside>
  `;
}

function renderPlayerSnapshot() {
  const profile = window.CollectPlayer.getProfileSummary();
  const badgeItems = profile.badges.length
    ? profile.badges
        .slice(-4)
        .reverse()
        .map((badge) => `<li>${badge.label}</li>`)
        .join("")
    : "<li>まだバッジはありません</li>";

  playerSnapshot.innerHTML = `
    <div class="section-head">
      <div>
        <h2>あなたの記録</h2>
        <p>記録はこの端末に保存されます。少しずつ遊ぶほど、続きが育っていきます。</p>
      </div>
      <span class="player-chip">${profile.isReturningLike ? "再訪ユーザー" : "はじめての記録"}</span>
    </div>
    <div class="player-stats-grid">
      <article><strong>${profile.totalPlays}回</strong><span>総プレイ回数</span></article>
      <article><strong>${profile.gamesPlayedToday}本</strong><span>今日遊んだゲーム</span></article>
      <article><strong>${profile.bestUpdates}回</strong><span>自己ベスト更新</span></article>
      <article><strong>${profile.streakDays}日</strong><span>連続挑戦</span></article>
    </div>
    <div class="player-badges">
      <h3>最近のバッジ</h3>
      <ul>${badgeItems}</ul>
    </div>
  `;
}

function renderMoodExplorer() {
  const allMoodTags = [...new Set(games.flatMap((game) => game.moodTags))];
  const visibleGames = activeMood ? games.filter((game) => game.moodTags.includes(activeMood)).slice(0, 4) : games.slice(0, 4);
  const intro = activeMood
    ? moodLeadCopy[activeMood] || `${activeMood}の気分に合うゲームをまとめています。`
    : "ジャンルではなく、その時の気分からゲームを選べます。1タップで絞り込める入口です。";

  moodExplorer.innerHTML = `
    <div class="section-head">
      <div>
        <h2>気分で選ぶ</h2>
        <p>${intro}</p>
      </div>
      ${activeMood ? '<button class="secondary-link mood-reset" type="button">絞り込みを外す</button>' : ""}
    </div>
    <div class="mood-tag-list">
      ${allMoodTags
        .map(
          (tag) => `
            <button
              class="mood-tag-button${tag === activeMood ? " active" : ""}"
              type="button"
              data-mood-tag="${tag}"
              aria-pressed="${tag === activeMood ? "true" : "false"}"
            >${tag}</button>
          `,
        )
        .join("")}
    </div>
    <div class="mood-results">
      ${visibleGames
        .map(
          (game) => `
            <a href="/${game.href}" class="mood-result-card" data-game-card-id="${game.id}" data-game-card-title="${game.title}" data-source-area="mood_section">
              <strong>${game.title}</strong>
              <span>${game.description}</span>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
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
                  .map((game) => `<a href="/${game.href}" data-game-card-id="${game.id}" data-game-card-title="${game.title}">${game.title}</a>`)
                  .join("")}</div>`
              : `<p>まだありません。</p>`
          }
        </article>
      `,
    )
    .join("");
}

function filteredGames() {
  const query = search.value.trim().toLowerCase();
  return [...games]
    .filter((game) => {
      const text = `${game.title} ${game.genre} ${game.description} ${game.meta.join(" ")} ${game.moodTags.join(" ")}`.toLowerCase();
      const matchesQuery = text.includes(query);
      const matchesMood = !activeMood || game.moodTags.includes(activeMood);
      return matchesQuery && matchesMood;
    })
    .sort((a, b) => {
      if (sort === "new") return b.released - a.released;
      if (sort === "title") return a.title.localeCompare(b.title, "ja");
      return window.CollectUGC.popularityScoreFor(b) - window.CollectUGC.popularityScoreFor(a);
    });
}

function renderList() {
  const sorted = filteredGames();
  list.innerHTML = sorted
    .map((game, index) => {
      const summary = window.CollectUGC.summaryFor(game.id);
      const rating = summary.ratingCount ? `${summary.averageRating.toFixed(1)} / 5` : "未評価";
      const rankLabel = sort === "popular" ? `人気ランキング ${index + 1}位` : `表示順 ${index + 1}番目`;
      const saved = [summary.favorite ? "お気に入り" : ""].filter(Boolean);

      return `
        <article class="game-card game-card-with-thumb">
          <a
            class="game-thumb"
            href="/${game.href}"
            aria-label="${game.title}の詳細を見る"
            data-game-card-id="${game.id}"
            data-game-card-title="${game.title}"
            data-source-area="game_grid"
          >
            <img src="${game.thumb}" alt="${game.title}のプレイ中サムネイル" loading="lazy" width="360" height="210" />
          </a>
          <div>
            <div class="game-card-header">
              <span class="rank">${index + 1}</span>
              <h2><a href="/${game.href}" data-game-card-id="${game.id}" data-game-card-title="${game.title}" data-source-area="game_grid">${game.title}</a></h2>
              <span class="tag">${game.genre}</span>
            </div>
            <p class="game-description">${game.description}</p>
            <div class="game-meta">${game.meta.map((item) => `<span>${item}</span>`).join("")}</div>
            <div class="game-meta mood-inline">${game.moodTags.map((item) => `<span>${item}</span>`).join("")}</div>
            <div class="ugc-mini" aria-label="${game.title}のローカル評価">
              <span>全体評価 ${rating}</span>
              <span>${rankLabel}</span>
              <span>レビュー ${summary.reviewCount}件</span>
              <span>プレイ ${summary.playCount}回</span>
              ${saved.map((item) => `<span class="saved">${item}</span>`).join("")}
            </div>
          </div>
          <div class="game-actions compact">
            ${favoriteButton(game)}
            <a class="secondary-link" href="/${game.href}" data-game-card-id="${game.id}" data-game-card-title="${game.title}" data-source-area="game_grid">詳細</a>
            <a class="play-link" href="/${game.playHref}" data-play-game-id="${game.id}" data-play-game-title="${game.title}" data-source-area="game_grid">遊ぶ</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderDailyChallenge();
  renderPlayerSnapshot();
  renderMoodExplorer();
  renderPersonalLibrary();
  renderList();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    sort = tab.dataset.sort;
    tabs.forEach((item) => item.classList.toggle("selected", item === tab));
    renderList();
  });
});

search.addEventListener("input", renderList);

document.addEventListener("click", (event) => {
  const favorite = event.target.closest("[data-favorite-toggle]");
  if (favorite) {
    const gameId = favorite.dataset.favoriteToggle;
    const summary = window.CollectUGC.summaryFor(gameId);
    window.CollectPlayer.noteFavorite(gameId, !summary.favorite);
    render();
    return;
  }

  const moodButton = event.target.closest("[data-mood-tag]");
  if (moodButton) {
    activeMood = moodButton.dataset.moodTag;
    window.CollectPlayer.noteMoodTag(activeMood);
    renderMoodExplorer();
    renderList();
    return;
  }

  if (event.target.closest(".mood-reset")) {
    activeMood = "";
    renderMoodExplorer();
    renderList();
  }
});

window.addEventListener("collect:ugc-updated", render);
render();
