<?php
// Build-time metadata only: no HTTP request, controller execution or SSR data.
require $argv[1] . '/vendor/autoload.php';
$app = require $argv[1] . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$helper = $app->make(\Saola\Core\View\Services\ViewHelperService::class);
$manager = $app->make(\Saola\Core\Engines\ViewContextManager::class);
require __DIR__ . '/export-translations.php';
$loader = $app->make('translator')->getLoader();
$paths = array_unique(array_merge(
    method_exists($loader, 'paths') ? $loader->paths() : [],
    method_exists($loader, 'jsonPaths') ? $loader->jsonPaths() : [],
    [$app->resourcePath('lang'), $app->langPath()],
));
$i18n = saolaExportTranslations($paths, method_exists($loader, 'namespaces') ? $loader->namespaces() : [],
    $app->make('config')->get('app.locale', 'en'), $app->make('config')->get('app.fallback_locale', 'en'));
$result = [];
foreach (array_slice($argv, 3) as $context) {
    $state = $manager->exportContextState($context);
    $result[$context] = [
        'routes' => $helper->exportComponentRoutes($context),
        'i18n' => $i18n,
        'view' => [
            'contextViews' => $state['views'],
            'revision' => $state['revision'],
            'systemData' => $state['systemData'],
        ],
    ];
}
file_put_contents($argv[2], json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
