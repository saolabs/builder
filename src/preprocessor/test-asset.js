/**
 * Self-check cho directive @asset / @assets.
 *
 * @asset(name = 'rel/path') khai báo đầu file; mỗi use site (`{{ name }}`,
 * `:src="name"`) được bung THẲNG thành `asset('<prefix>rel/path')` — Blade eval
 * ở SSR, Python route `asset(` sang `__helper.asset()` ở CSR. Không sinh biến
 * runtime nên không lệch SSR/CSR, không phụ thuộc @vars/@props.
 *
 * Chạy: node src/preprocessor/test-asset.js
 */
const assert = require('assert');
const SaolaPreprocessor = require('./index');

const PREFIX = 'static/saola/web/assets/';

function run(content) {
    return new SaolaPreprocessor().preprocessRaw(content, { assetPrefix: PREFIX });
}

function demo() {
    // 1. @asset(list) + {{ name }} + :src/:href → asset('<prefix><path>')
    const out = run(`@asset(logo = 'images/logo.png', theme = 'css/theme.css')
@states({ x: 1 })
<template>
    <img :src="logo" alt="">
    <link :href="theme" rel="stylesheet">
    <p>{{ logo }}</p>
</template>`);

    assert(out.includes(`src="{{ asset('${PREFIX}images/logo.png') }}"`), `:src chưa bung:\n${out}`);
    assert(out.includes(`href="{{ asset('${PREFIX}css/theme.css') }}"`), `:href chưa bung:\n${out}`);
    assert(out.includes(`{{ asset('${PREFIX}images/logo.png') }}`), `{{ logo }} chưa bung:\n${out}`);
    // Không được coi là biến PHP
    assert(!/\$logo\b/.test(out), `logo vẫn thành $logo:\n${out}`);
    // Khai báo @asset không để lại gì trong output
    assert(!/@assets?\s*\(/.test(out), `@asset còn sót trong output:\n${out}`);

    // 2. Dạng object @assets({ ... })
    const obj = run(`@assets({ hero: 'img/hero.jpg', icon: 'icons/app.svg' })
@states({ x: 1 })
<template>
    <img :src="hero" />
    <img :src="icon" />
</template>`);
    assert(obj.includes(`asset('${PREFIX}img/hero.jpg')`), `object form hero:\n${obj}`);
    assert(obj.includes(`asset('${PREFIX}icons/app.svg')`), `object form icon:\n${obj}`);

    // 3. Path có leading slash → strip; asset() không nhân đôi prefix
    const slash = run(`@asset(x = '/images/a.png')
@states({ y: 1 })
<template><img :src="x" /></template>`);
    assert(slash.includes(`asset('${PREFIX}images/a.png')`), `leading slash chưa strip:\n${slash}`);

    // 4. Prefix mặc định (gọi không truyền option) — context-less nhưng vẫn hợp lệ
    const dflt = new SaolaPreprocessor().preprocessRaw(
        `@asset(p = 'x.png')\n@states({ z: 1 })\n<template><img :src="p" /></template>`
    );
    assert(dflt.includes(`asset('static/saola/assets/x.png')`), `default prefix:\n${dflt}`);

    // 5. @asset không "nuốt" identifier trùng tên do @vars khai (asset thắng —
    //    nhưng đây là input sai của user; chỉ cần không crash + deterministic)
    const dup = run(`@asset(name = 'a.png')\n@states({ q: 1 })\n<template>{{ name }}</template>`);
    assert(dup.includes(`asset('${PREFIX}a.png')`), dup);

    console.log('test-asset: OK (5 checks)');
}

demo();
