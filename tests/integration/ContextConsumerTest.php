<?php

/** Real Laravel SSR of the source built by the installed builder artifact. No admin/web package. */
use Illuminate\Support\Facades\View;
use Orchestra\Testbench\TestCase;
use Saola\Core\Engines\ViewContextManager;
use Saola\Core\Providers\SaolaServiceProvider;
use Saola\Core\Services\{BundleManifest, ContextSource, ThemeService};
use Saola\Core\View\Services\ViewHelperService;

final class ContextConsumerTest extends TestCase
{
    protected function getPackageProviders($app): array { return [SaolaServiceProvider::class]; }

    public function test_compiled_source_renders_with_core_and_exports_real_hydration_data(): void
    {
        $root = getenv('SAOLA_CONTEXT_CONSUMER_ROOT');
        $this->app->usePublicPath($root.'/public');
        View::getFinder()->setPaths([$root.'/resources/views']);
        config(['view.compiled' => $root.'/storage/views', 'cache.default' => 'array',
            'saola-contexts' => ['default' => 'auto', 'modes' => [], 'themes' => []]]);
        @mkdir($root.'/storage/views', 0777, true);
        $manager = app(ViewContextManager::class);
        $manager->registerContext('studio', ['base' => 'studio']);
        $this->app['router']->get('/', function () use ($manager) {
            app(ThemeService::class)->apply('studio');
            return $manager->renderPage('studio', '', 'home');
        });
        $html = $this->get('/')->assertOk()->assertSee('id="value"', false)->assertSee('id="inc"', false)->getContent();
        $definition = app(ContextSource::class)->definition('studio');
        $this->assertSame(getenv('SAOLA_CONTEXT_CONSUMER_MODE'), $definition['mode']);
        $this->assertSame(getenv('SAOLA_CONTEXT_CONSUMER_THEME') ?: null, $definition['theme']);
        $namespace = $definition['theme'] ? 'studio.themes.'.$definition['theme'].'.views' : 'studio.views';
        $this->assertSame($namespace, $manager->getBaseDirectory('studio', 'base'));
        $helper = app(ViewHelperService::class);
        $boot = ['container' => '#app-root', 'bundles' => [],
            'router' => ['mode' => 'history', 'base' => '/', 'routes' => [['path' => '/', 'component' => $namespace.'.pages.home']]],
            'view' => ['systemData' => $manager->exportContextState('studio')['systemData'],
                'ssrData' => $helper->exportApplicationViewData()]];
        $ssr = $helper->renderSSRBoot();
        $this->assertStringContainsString($namespace.'.pages.home', $ssr);
        $json = json_encode($boot, JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP);
        $css = app(BundleManifest::class)->cssUrl('studio');
        $this->assertNotNull($css);
        $this->assertStringContainsString('/static/saola/studio/', $css);
        $cssPath = $root.'/public'.parse_url($css, PHP_URL_PATH);
        $this->assertFileExists($cssPath);
        $expectedColor = match (getenv('SAOLA_CONTEXT_CONSUMER_THEME')) {
            'night' => '#fff', 'paper' => '#000', default => '#222',
        };
        $this->assertStringContainsString('color:'.$expectedColor, file_get_contents($cssPath));
        file_put_contents($root.'/ssr.html', '<!doctype html><html><head><link rel="stylesheet" href="'.htmlspecialchars($css).'"></head><body><div id="app-root" data-server-rendered="true">'.$html.'</div><script>window.APP_CONFIGS='.$json.';</script>'.$ssr.'</body></html>');
    }
}
