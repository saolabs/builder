# Publish @saolabs/builder lên npm

Repository: https://github.com/saolabs/builder
Package: `@saolabs/builder`.
Hướng dẫn cập nhật ngày 2026-10-02.

## Tài khoản

Dùng npm account có quyền publish trong scope `@saolabs` (tạo organization nếu chưa có).
Publish tương tác yêu cầu 2FA; CI có thể dùng trusted publishing theo cấu hình của npm.

```bash
npm login
npm whoami
npm view @saolabs/builder versions --json
```

Kiểm tra ngày 2026-10-02: truy vấn công khai trả `E404`; cần đăng nhập để xác minh quyền scope và package.

`E404` có thể là package chưa tồn tại hoặc không có quyền truy cập; không kết luận chỉ từ lỗi này.

## Kiểm tra và chọn version

```bash
cd builder # từ workspace saola-ecosystem
npm ci
npm run check
npm pack --dry-run --ignore-scripts
```

`prepublishOnly` chạy test builder. Compiler PHP là package riêng: ứng dụng tiêu thụ cần `composer require saola/compiler`, không được nhét compiler/reference Python vào npm package.

Chọn version chưa được phát hành. `package.json` là nguồn version; đồng bộ `package-lock.json`.
Với breaking change chọn major, tính năng tương thích chọn minor, bugfix chọn patch.
Ví dụ dưới dùng `1.2.3`; thay bằng version đã duyệt, chưa tồn tại trên registry:

```bash
npm version 1.2.3 --no-git-tag-version
npm run publish-dry-run
git add package.json package-lock.json
git commit -m "chore: release @saolabs/builder 1.2.3"
git tag -a v1.2.3 -m "Release @saolabs/builder 1.2.3"
git push origin HEAD
git push origin v1.2.3
npm publish --access public
npm view @saolabs/builder@1.2.3 version
```

`publishConfig.access` đã đặt `public`. npm không cho publish lại cùng name/version.
Dry-run kiểm nội dung package; nó không chứng minh quyền publish hay 2FA.
Bản thử nghiệm có thể dùng version prerelease và `npm publish --access public --tag next`.

## Consumer sạch

```bash
npm install @saolabs/builder@1.2.3
```

Ứng dụng còn cần `composer require saola/compiler` và PHP để chạy `sao-compile`.

Nguồn: [npm scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [yêu cầu 2FA](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
