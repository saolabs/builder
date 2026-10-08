<?php
/** Read translation sources during build; never served or fetched by the browser. */
function saolaExportTranslations(array $paths, array $namespaces, string $locale, string $fallback): array
{
    $messages = [];
    $validate = function ($value, string $file) use (&$validate): void {
        if (is_array($value)) {
            foreach ($value as $item) $validate($item, $file);
        } elseif (!is_string($value)) {
            throw new RuntimeException("Translation values must be strings: {$file}");
        }
    };
    $scan = function (string $root, ?string $namespace = null) use (&$messages, $validate): void {
        if (!file_exists($root)) return;
        if (!is_dir($root) || !is_readable($root)) throw new RuntimeException("Cannot read translation directory: {$root}");
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
            if (!$file->isFile()) continue;
            $relative = str_replace('\\', '/', substr($file->getPathname(), strlen(rtrim($root, '/\\')) + 1));
            if ($namespace === null && str_starts_with($relative, 'vendor/')) continue;
            if (preg_match('/^([\w-]+)\.json$/', $relative, $match) && $namespace === null) {
                $contents = file_get_contents($file->getPathname());
                if ($contents === false) throw new RuntimeException("Cannot read translation file: {$file}");
                try { $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR); }
                catch (Throwable $error) { throw new RuntimeException("Invalid translation JSON: {$file}", 0, $error); }
                if (!is_array($data) || !str_starts_with(ltrim($contents), '{')) throw new RuntimeException("Translation JSON must be an object: {$file}");
                foreach ($data as $value) if (!is_string($value)) throw new RuntimeException("JSON translation values must be strings: {$file}");
                $code = $match[1];
                $messages[$code]['json'] = array_replace($messages[$code]['json'] ?? [], $data);
            } elseif (preg_match('/^([\w-]+)\/(.+)\.php$/', $relative, $match)) {
                if (!is_readable($file->getPathname())) throw new RuntimeException("Cannot read translation file: {$file}");
                try { $data = (static function ($source) { return require $source; })($file->getPathname()); }
                catch (Throwable $error) { throw new RuntimeException("Invalid translation PHP: {$file}: {$error->getMessage()}", 0, $error); }
                if (!is_array($data)) throw new RuntimeException("Translation PHP must return an array: {$file}");
                $validate($data, $file->getPathname());
                $code = $match[1];
                $group = ($namespace ? $namespace . '::' : '') . str_replace('/', '.', $match[2]);
                $messages[$code]['groups'][$group] = array_replace_recursive($messages[$code]['groups'][$group] ?? [], $data);
            }
        }
    };
    foreach ($paths as $root) $scan($root);
    foreach ($namespaces as $name => $root) {
        $scan($root, $name);
        foreach ($paths as $path) $scan($path . '/vendor/' . $name, $name);
    }
    $messages[$locale] ??= ['json' => [], 'groups' => []];
    $messages[$fallback] ??= ['json' => [], 'groups' => []];
    return ['locale' => $locale, 'fallbackLocale' => $fallback, 'messages' => $messages];
}
