<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

require_method('POST');
$body = read_json_body();
$gameKey = game_key_from($body);

$stmt = db()->prepare("
    INSERT INTO game_play_events (game_key, visitor_hash)
    VALUES (:game_key, :visitor_hash)
");
$stmt->execute([
    ':game_key' => $gameKey,
    ':visitor_hash' => visitor_hash(),
]);

json_response(['ok' => true, 'games' => summarize_games($gameKey)]);

