<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

const GAME_KEYS = [
    'crystal-descent-defense',
    'aurora-drift',
    'glyph-garden',
    'neon-courier',
    'tide-forge',
    'aijingi',
];

const GAME_CATALOG = [
    'crystal-descent-defense' => ['title' => 'クリスタル防衛線', 'slug' => 'crystal-descent-defense', 'genre' => 'Strategy'],
    'aurora-drift' => ['title' => 'オーロラ航路', 'slug' => 'aurora-drift', 'genre' => 'Action'],
    'glyph-garden' => ['title' => '紋章の庭', 'slug' => 'glyph-garden', 'genre' => 'Puzzle'],
    'neon-courier' => ['title' => 'ネオン配達便', 'slug' => 'neon-courier', 'genre' => 'Action'],
    'tide-forge' => ['title' => '潮汐の鍛冶場', 'slug' => 'tide-forge', 'genre' => 'Timing'],
    'aijingi' => ['title' => '合陣戯', 'slug' => 'aijingi', 'genre' => 'Strategy'],
];

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    if (DB_PASS === '' || str_contains(DB_PASS, 'ここに')) {
        json_response(['ok' => false, 'error' => 'db_config_missing'], 500);
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(['ok' => false, 'error' => 'invalid_json'], 400);
    }

    return $decoded;
}

function game_key_from(array $data): string
{
    $gameKey = (string)($data['game_key'] ?? $_GET['game_key'] ?? '');
    if (!in_array($gameKey, GAME_KEYS, true)) {
        json_response(['ok' => false, 'error' => 'invalid_game_key'], 400);
    }
    return $gameKey;
}

function visitor_hash(): string
{
    $cookieName = 'collect_visitor_id';
    $visitorId = $_COOKIE[$cookieName] ?? '';
    if (!is_string($visitorId) || !preg_match('/^[a-f0-9]{32}$/', $visitorId)) {
        $visitorId = bin2hex(random_bytes(16));
        setcookie($cookieName, $visitorId, [
            'expires' => time() + 60 * 60 * 24 * 365,
            'path' => '/',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    return hash('sha256', $visitorId);
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        json_response(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }
}

function ensure_games_seeded(PDO $pdo): void
{
    static $seeded = false;
    if ($seeded) {
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO games (game_key, title, slug, genre, is_active)
        VALUES (:game_key, :title, :slug, :genre, 1)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            slug = VALUES(slug),
            genre = VALUES(genre),
            is_active = 1
    ");

    foreach (GAME_CATALOG as $gameKey => $game) {
        $stmt->execute([
            ':game_key' => $gameKey,
            ':title' => $game['title'],
            ':slug' => $game['slug'],
            ':genre' => $game['genre'],
        ]);
    }

    $seeded = true;
}

function summarize_games(?string $gameKey = null): array
{
    $pdo = db();
    ensure_games_seeded($pdo);
    $visitorHash = visitor_hash();
    $params = [];
    $where = '';

    if ($gameKey !== null) {
        $where = 'WHERE g.game_key = :game_key';
        $params[':game_key'] = $gameKey;
    }

    $sql = "
        SELECT
            g.game_key,
            g.title,
            COALESCE(AVG(gr.rating), 0) AS average_rating,
            COUNT(DISTINCT gr.id) AS rating_count,
            COUNT(DISTINCT rv.id) AS review_count,
            COUNT(DISTINCT pe.id) AS play_count,
            MAX(CASE WHEN own.rating IS NULL THEN 0 ELSE own.rating END) AS user_rating
        FROM games g
        LEFT JOIN game_ratings gr ON gr.game_key = g.game_key
        LEFT JOIN game_reviews rv ON rv.game_key = g.game_key AND rv.status = 'approved'
        LEFT JOIN game_play_events pe ON pe.game_key = g.game_key
        LEFT JOIN game_ratings own ON own.game_key = g.game_key AND own.visitor_hash = :visitor_hash
        {$where}
        GROUP BY g.game_key, g.title
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':visitor_hash', $visitorHash);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    $summaries = [];
    foreach ($stmt->fetchAll() as $row) {
        $average = round((float)$row['average_rating'], 2);
        $ratingCount = (int)$row['rating_count'];
        $reviewCount = (int)$row['review_count'];
        $playCount = (int)$row['play_count'];
        $summaries[$row['game_key']] = [
            'averageRating' => $average,
            'ratingCount' => $ratingCount,
            'reviewCount' => $reviewCount,
            'playCount' => $playCount,
            'userRating' => (int)$row['user_rating'],
            'popularityScore' => round($average * 24 + $ratingCount * 6 + $reviewCount * 10 + min($playCount, 500) * 0.6, 2),
        ];
    }

    return $summaries;
}
