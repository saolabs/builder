# @saolabs/builder

Lớp build-time của hệ sinh thái Saola. Package này đọc `sao.config.json`, tìm
view `.sao`, gọi compiler PHP `saola/compiler`, ghi đồng thời Blade +
JavaScript/TypeScript, sinh registry và tích hợp với Vite/Webpack.

Builder không chứa và không chạy compiler Python.

## Cài đặt

Ứng dụng cần cả package npm và package Composer:

```bash
npm install --save-dev @saolabs/builder
composer require saola/compiler
```

Composer tạo `vendor/bin/saoc`; builder tự tìm CLI theo thứ tự:

1. `SAOLA_PHP_COMPILER` nếu được khai báo.
2. `<project>/vendor/bin/saoc`.
3. `<project>/vendor/saola/compiler/bin/saoc`.
4. `compiler/bin/saoc` — sibling trong monorepo phát triển hệ sinh thái.

Có thể đổi PHP binary bằng `SAOLA_PHP_BINARY`.

## Sử dụng

```bash
npx sao-compile web
npx sao-compile all
npx sao-compile web --watch
npx sao-build web --minify
npx sao-dev web
```

Vite:

```js
import saolaBuilder from '@saolabs/builder/vite';

export default {
    plugins: [saolaBuilder({ context: 'web', watch: true })],
};
```

Webpack:

```js
const SaolaBuilderPlugin = require('@saolabs/builder/webpack');

module.exports = {
    plugins: [new SaolaBuilderPlugin({ context: 'web' })],
};
```

## Trách nhiệm package

- `@saolabs/builder`: filesystem, watch mode, registry, bundling, Vite/Webpack.
- `saola/compiler`: parse `.sao`, emit Blade/JS/TS, marker hydration và warnings.
- `@saolabs/client`: runtime phía trình duyệt.

Mỗi file `.sao` được gửi một lần tới `saola/compiler`; một `CompileResult` trả
về cả Blade và JS/TS để hai output dùng cùng marker.

## Phát triển

```bash
npm test
npm run publish-dry-run
```

Compiler Python cũ chỉ được giữ local tại `.reference/python/` để đối chiếu khi
cần. `.reference/` và mọi file `*.py` đều bị `.gitignore`; không được publish
hoặc commit vào repository này.

Xem thêm [kiến trúc](docs/ARCHITECTURE.md).

## License

MIT
