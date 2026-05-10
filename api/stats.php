<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

require_method('GET');
json_response(['ok' => true, 'games' => summarize_games()]);

