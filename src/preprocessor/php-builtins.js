/**
 * PHP Built-in Functions Registry
 * 
 * Functions listed here will NOT get $ prefix when transforming
 * Saola Syntax to Blade/PHP. Any identifier not in this list
 * AND not in the symbol table will be treated as an unknown variable.
 */

const PHP_BUILTINS = new Set([
    // Array functions
    'count', 'sizeof', 'array_merge', 'array_push', 'array_pop',
    'array_shift', 'array_unshift', 'array_slice', 'array_splice',
    'array_keys', 'array_values', 'array_unique', 'array_reverse',
    'array_filter', 'array_map', 'array_reduce', 'array_search',
    'array_key_exists', 'array_combine', 'array_chunk', 'array_pad',
    'array_fill', 'array_flip', 'array_intersect', 'array_diff',
    'array_column', 'array_sum', 'array_product', 'array_rand',
    'array_walk', 'sort', 'rsort', 'asort', 'arsort', 'ksort', 'krsort',
    'usort', 'uasort', 'uksort', 'shuffle', 'compact', 'extract',
    'range', 'list', 'each', 'reset', 'end', 'next', 'prev', 'current',
    'in_array', 'implode', 'explode',

    // String functions
    'strlen', 'substr', 'strpos', 'strrpos', 'strstr', 'stristr',
    'str_replace', 'str_ireplace', 'str_pad', 'str_repeat',
    'str_word_count', 'str_contains', 'str_starts_with', 'str_ends_with',
    'strtolower', 'strtoupper', 'ucfirst', 'lcfirst', 'ucwords',
    'trim', 'ltrim', 'rtrim', 'nl2br', 'wordwrap', 'chunk_split',
    'sprintf', 'printf', 'sscanf', 'number_format',
    'md5', 'sha1', 'crc32', 'base64_encode', 'base64_decode',
    'urlencode', 'urldecode', 'rawurlencode', 'rawurldecode',
    'htmlspecialchars', 'htmlentities', 'html_entity_decode',
    'strip_tags', 'addslashes', 'stripslashes', 'quotemeta',
    'preg_match', 'preg_match_all', 'preg_replace', 'preg_split',

    // Math functions
    'abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'sqrt',
    'log', 'log2', 'log10', 'exp', 'fmod', 'intdiv',
    'rand', 'mt_rand', 'random_int',

    // Type functions
    'isset', 'empty', 'unset', 'is_null', 'is_array', 'is_string',
    'is_numeric', 'is_int', 'is_float', 'is_bool', 'is_object',
    'is_callable', 'gettype', 'settype', 'intval', 'floatval',
    'strval', 'boolval',

    // JSON
    'json_encode', 'json_decode',

    // Date/Time
    'date', 'time', 'mktime', 'strtotime', 'now', 'today',

    // Laravel helpers
    'view', 'route', 'url', 'asset', 'mix', 'config', 'env',
    'auth', 'request', 'response', 'session', 'cache', 'cookie',
    'redirect', 'back', 'abort', 'app', 'resolve',
    'collect', 'dd', 'dump', 'logger', 'old', 'csrf_token',
    'trans', '__', 'e', 'event', 'dispatch', 'broadcast',
    'storage_path', 'resource_path', 'public_path', 'base_path',
    'class_basename',

    // Blade-specific
    'slot', 'component',
]);

/**
 * Check if a name is a PHP built-in function
 * @param {string} name
 * @returns {boolean}
 */
function isPHPBuiltin(name) {
    return PHP_BUILTINS.has(name);
}

module.exports = { PHP_BUILTINS, isPHPBuiltin };
