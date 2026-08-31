/**
 * @verbatim phải đi qua preprocessor NGUYÊN VĂN.
 *
 * Khối @verbatim trong docs là code minh hoạ: nội dung của nó không phải biểu
 * thức để dịch. Preprocessor từng thêm `$` cho mọi identifier trong `{{ }}` kể
 * cả bên trong verbatim, làm trang docs hiện sai cú pháp nó đang dạy:
 *   {{ title }}  → {{ $title }}      (đáng lẽ là cú pháp .sao)
 *   {{ $title }} → {{ $$title }}     (đáng lẽ là cú pháp Blade)
 *
 * Chạy: node tests/test_verbatim_preprocessor.js
 */
const SaolaPreprocessor = require('../src/preprocessor');

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
    if (cond) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}  ${detail}`); failed++; }
};

function run(template) {
    const p = new SaolaPreprocessor();
    return p.preprocess({
        declarations: ['@states({ title: 0 })'],
        blade: template,
        bladeWithSSR: '',
    }).blade;
}

console.log('\n@verbatim giữ nguyên văn qua preprocessor');

const saoSyntax = '<template>\n@verbatim{{ title }}@endverbatim\n</template>';
check('cú pháp .sao không bị thêm $', run(saoSyntax).includes('{{ title }}'), run(saoSyntax));

const bladeSyntax = '<template>\n@verbatim{{ $title }}@endverbatim\n</template>';
check('cú pháp Blade không bị nhân đôi $', run(bladeSyntax).includes('{{ $title }}')
    && !run(bladeSyntax).includes('$$title'), run(bladeSyntax));

const dollarPair = '<template>\n@verbatim$$ và $& giữ nguyên@endverbatim\n</template>';
check('$$ / $& không bị String.replace nuốt', run(dollarPair).includes('$$ và $&'), run(dollarPair));

const directive = '<template>\n@verbatim@children@endverbatim\n</template>';
check('directive trong verbatim không bị dịch', run(directive).includes('@children'), run(directive));

// Ngoài verbatim vẫn phải dịch như cũ
const outside = '<template>{{ title }}</template>';
check('ngoài verbatim vẫn thêm $', run(outside).includes('{{ $title }}'), run(outside));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
