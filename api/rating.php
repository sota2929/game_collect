<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

require_method('POST');
$body = read_json_body();
$gameKey = game_key_from($body);
$rating = (int)($body['rating'] ?? 0);

if ($rating < 1 || $rating > 5) {
    json_response(['ok' => false, 'error' => 'invalid_rating'], 400);
}

$stmt = db()->prepare("
    INSERT INTO game_ratings (game_key, rating, visitor_hash)
    VALUES (:game_key, :rating, :visitor_hash)
    ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        updated_at = CURRENT_TIMESTAMP
");
$stmt->execute([
    ':game_key' => $gameKey,
    ':rating' => $rating,
    ':visitor_hash' => visitor_hash(),
]);

json_response(['ok' => true, 'games' => summarize_games($gameKey)]);

