<?php
// A fresh, anonymous HTTP request per page; no browser/session state is reused.
require $argv[1] . '/vendor/autoload.php';
$app = require $argv[1] . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$request = \Illuminate\Http\Request::create($argv[2], 'GET');
$response = $kernel->handle($request);
$type = $response->headers->get('Content-Type', '');
if ($response->getStatusCode() !== 200 || !str_contains($type, 'text/html')) {
    fwrite(STDERR, "Cannot prerender {$argv[2]}: HTTP {$response->getStatusCode()} ($type)\n");
    exit(1);
}
file_put_contents($argv[3], $response->getContent());
$kernel->terminate($request, $response);
