<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $gameKey = game_key_from([]);
    $stmt = db()->prepare("
        SELECT body, rating, created_at
        FROM game_reviews
        WHERE game_key = :game_key AND status = 'approved'
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $stmt->execute([':game_key' => $gameKey]);

    $reviews = array_map(static function (array $row): array {
        return [
            'text' => $row['body'],
            'rating' => $row['rating'] === null ? null : (int)$row['rating'],
            'date' => date('m/d H:i', strtotime((string)$row['created_at'])),
        ];
    }, $stmt->fetchAll());

    json_response(['ok' => true, 'reviews' => $reviews, 'games' => summarize_games($gameKey)]);
}

require_method('POST');
$body = read_json_body();
$gameKey = game_key_from($body);
$text = trim((string)($body['body'] ?? ''));
$rating = isset($body['rating']) ? (int)$body['rating'] : null;

if ($text === '' || mb_strlen($text) > 500) {
    json_response(['ok' => false, 'error' => 'invalid_review'], 400);
}

if ($rating !== null && ($rating < 1 || $rating > 5)) {
    $rating = null;
}

$stmt = db()->prepare("
    INSERT INTO game_reviews (game_key, rating, body, visitor_hash, status)
    VALUES (:game_key, :rating, :body, :visitor_hash, 'approved')
");
$stmt->execute([
    ':game_key' => $gameKey,
    ':rating' => $rating,
    ':body' => mb_substr($text, 0, 500),
    ':visitor_hash' => visitor_hash(),
]);

json_response(['ok' => true, 'games' => summarize_games($gameKey)]);

