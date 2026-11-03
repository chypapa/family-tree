<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo '{"sent":false}';
    exit;
}

$fields = [];
foreach (['name' => 500, 'contact' => 500, 'ancestors' => 20000] as $key => $limit) {
    $value = $_POST[$key] ?? '';
    if (!is_string($value) || strlen($value) > $limit) {
        http_response_code(422);
        echo '{"sent":false}';
        exit;
    }
    $fields[$key] = trim($value);
}

if ($fields['contact'] === '' || ($_POST['agree'] ?? '') !== 'on') {
    http_response_code(422);
    echo '{"sent":false}';
    exit;
}

$body = "Имя: {$fields['name']}\nКонтакт: {$fields['contact']}\n"
    . "Сведения о предках:\n{$fields['ancestors']}\n";
$subject = '=?UTF-8?B?' . base64_encode('Новая заявка с сайта') . '?=';
$headers = "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n"
    . "Content-Transfer-Encoding: base64";

$sent = function_exists('mail') && mail(
    'rastorguyeva.t@bk.ru',
    $subject,
    chunk_split(base64_encode($body)),
    $headers
);
http_response_code($sent ? 200 : 503);
echo $sent ? '{"sent":true}' : '{"sent":false}';
