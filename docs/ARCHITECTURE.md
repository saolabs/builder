# Kiến trúc Saola Builder

## Ranh giới

`@saolabs/builder` là orchestration layer của quá trình build, không phải
template compiler. Nó chịu trách nhiệm I/O và vòng đời công cụ; toàn bộ ngữ
nghĩa `.sao` thuộc package Composer `saola/compiler`.

```text
.sao + sao.config.json
        |
        v
@saolabs/builder
  - tìm file / watch
  - gọi vendor/bin/saoc
  - ghi Blade + JS/TS
  - sinh registry
  - bundle qua Vite/Webpack
        |
        v
saola/compiler
  - parse một lần
  - emit Blade + JS/TS
  - trả CompileResult JSON
```

## Transport

Build thường gọi:

```bash
php vendor/bin/saoc compile - --json [options]
```

Source đi qua stdin, `CompileResult` JSON đi qua stdout, warning đi qua stderr.
Watch mode dùng `php vendor/bin/saoc serve` và NDJSON để tái sử dụng process PHP.

## Nguyên tắc phụ thuộc

- Builder không import mã nguồn compiler và không phụ thuộc Python.
- Compiler không biết Vite, Webpack, registry hay layout thư mục ứng dụng.
- Ứng dụng cài `saola/compiler` bằng Composer; builder chỉ tìm `vendor/bin/saoc`.
- `SAOLA_PHP_COMPILER` chỉ dành cho CI hoặc workspace đặc biệt.
- `.reference/python/` là dữ liệu local bị ignore, không thuộc sản phẩm.
