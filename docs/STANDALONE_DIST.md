# Đóng gói SPA độc lập

`sao-dist` là lệnh chung của `@saolabs/builder`, áp dụng cho mọi ứng dụng và
context Saola. Bản xuất có một `index.html`, mã JavaScript đã bundle và assets;
phục vụ trên static host, kết nối Laravel khi cần dữ liệu.

## Chạy build

Thêm `"dist": "sao-dist"` vào scripts của package.json. Dự án cần
`@saolabs/builder`, `@saolabs/client`, Vite và Composer compiler.

```bash
npm run dist                 # web nếu có, hoặc context đầu tiên
npm run dist -- web
npm run dist -- mobile
npm run dist -- all          # mọi context chưa tắt dist
```

Dùng lại `sao.config.json` để compile. Builder bootstrap Laravel ở thời điểm
build, lấy SPA component routes đã đăng ký và cấu hình view của đúng context
(namespace, revision, contextViews). Không cần khai báo lại routes hay namespace.
Không thực thi controller, không lấy SSR data hoặc dữ liệu phiên đăng nhập.
PHP/Composer và cấu hình môi trường Laravel cần ở máy build; static host không
cần PHP. Có thể chọn PHP qua biến môi trường `SAOLA_PHP_BINARY`.

## Cấu hình bổ sung tùy chọn

Không bắt buộc tạo file cấu hình khác. Thêm `dist` trong context hiện có:

```json
{
  "contexts": {
    "web": {
      "dist": {
        "baseUrl": "/",
        "apiUrl": "https://server.example.com",
        "apiKey": "public-client-key"
      }
    }
  }
}
```

Đây là đoạn bổ sung; giữ nguyên các trường app/views/compiled đang có.
Có thể đặt `dist` ở cấp gốc để dùng chung cho các context, rồi ghi đè trong
`contexts.<name>.dist`. Cấp gốc còn hỗ trợ `outDir` (mặc định `dist`) và
`defaultContext`. `enabled: false` trong context.dist loại context khỏi build all.

- `baseUrl`: đường dẫn triển khai shell và assets, mặc định `/`, kết thúc bằng `/`.
- `apiUrl`: URL server cho `App.API` và yêu cầu page-data ngầm của `@await`.
  Page-data giữ pathname/query hiện tại, ví dụ `/users/3?q=a` gửi tới
  `https://server.example.com/users/3?q=a`. Nếu API và page-data dùng hai prefix
  khác nhau, ghi đè `view.dataEndpoint` riêng.
- `apiKey`: gửi trong header `X-API-Key` cho App.API và page-data; đổi tên qua
  `apiKeyHeader`. Đây là key công khai dành cho client, không phải secret server.

Không khai báo API URL thì giữ hành vi cùng origin. URL explicit trong `@await`
không bị remap. Mã gọi trực tiếp `App.Http` vẫn dùng cấu hình service trong
bootstrap ứng dụng. Server phải hỗ trợ CORS và xác thực phù hợp khi khác origin.
Mọi cấu hình đóng gói đều có thể đọc từ trình duyệt.

## Ngôn ngữ

Build tự đọc các nguồn dịch Laravel (`lang/`, `resources/lang/` và các đường dẫn
translation đã đăng ký), gồm PHP groups, JSON câu dịch và package namespaces.
Locale mặc định/fallback lấy từ `config/app.php`. Không phải cấu hình lại locale.

Bản dịch được chuyển thành dữ liệu trong JavaScript boot đã bundle, không phải
file JSON tải bằng fetch. Đổi ngôn ngữ dùng dữ liệu có sẵn, không gọi mạng để đọc
từ điển. File dịch hỏng, không đọc được hoặc sai kiểu dữ liệu làm build dừng,
giữ nguyên bản dist thành công trước đó.

Nếu chỉ muốn đóng gói một số ngôn ngữ, thêm `"locales": ["en", "vi"]` trong dist.
Locale mặc định và fallback luôn được giữ lại. Không đặt trường này thì build
đóng gói mọi locale tìm thấy.

View dùng các helper thông thường:

```blade
<p>{{ __('messages.welcome', ['name' => 'Lan']) }}</p>
<p>@lang('messages.title')</p>
<p>@choice('messages.apples', 2)</p>
```

Client cũng có `App.Helper.trans()`, `lang()`, `trans_choice()`,
`getLocale()` và `setLocale('vi')`. Key không có sẽ thử fallback, rồi trả lại key.
JSON keys được tra theo nguyên câu; PHP keys dùng `group.item` hoặc
`package::group.item`. Hỗ trợ tham số `:name`, `:Name`, `:NAME` và các khoảng
số nhiều `{0}`, `{1}`, `[2,*]`.

`setLocale()` cập nhật `<html lang>`, gửi `Accept-Language` qua App.API/App.Http,
xóa cache trang và dựng lại trang/layout qua CSR (state cục bộ của view được
khởi tạo lại). Phát sự kiện DOM `saola:locale-change` để ứng dụng xử lý thêm.
Ứng dụng tự quyết định cách lưu lựa chọn locale hoặc chuyển URL ngôn ngữ.
Các yêu cầu dữ liệu server vẫn có thể phát sinh khi view dùng `@await`; chỉ bộ
dịch không cần request.

## Tài nguyên và tùy chỉnh

Builder tự compile `resources/css/app.css` nếu có, dùng Tailwind plugin đã cài
trong dự án. Có thể chỉ định `css: ["resources/css/custom.css"]` hoặc `css: false`.

Builder chỉ đóng gói view đi từ component routes của context đến layout,
include và component được tham chiếu. Registry riêng của dist được tạo trong
staging; registry phục vụ SSR không bị thay đổi. Mọi route đã đăng ký đều là
điểm vào, kể cả trang chưa được người dùng mở.

Tài nguyên được Vite import sẽ được bundle bình thường. Với URL trỏ tới file
trong `public/static` hoặc `public/assets`, builder chỉ copy file được tham
chiếu trong các module còn lại và HTML/CSS đầu ra. Tiếp tục theo `@import`,
`url()` của CSS và import của script để giữ ảnh, font và file phụ thuộc.
Không copy nguyên thư mục public, bundle SSR cũ, manifest cũ hoặc theme khác.
Phần tự tìm không đi theo symlink.

URL hoặc tên view tạo hoàn toàn từ dữ liệu chạy thực tế không thể luôn suy
ra khi build. Khai báo `assets` để giữ thêm tài nguyên và `includeViews` để
giữ thêm view (tên đầy đủ hoặc tiền tố nhóm). Biểu thức namespace cộng tên
động được giữ cả nhóm tương ứng để tránh thiếu view. Ví dụ:

```json
{
  "dist": {
    "styles": ["/assets/css/app.css"],
    "scripts": ["/assets/js/plugins.js"],
    "assets": [{ "from": "public/static/editor", "to": "static/editor" }],
    "includeViews": ["web.components.dynamic"]
  }
}
```

`assets` bổ sung vào phần tự tìm; chỉ khai báo file hoặc nhóm thực sự cần.
Không copy toàn bộ public, PHP, .env hoặc vendor. Không tải tài nguyên CDN.
CSS giữ cấu trúc URL tương đối. View có URL hardcode cần phù hợp vị trí triển
khai; baseUrl không tự viết lại URL bên trong view. History routes dưới
`/portal/` cần routes và link tương ứng prefix đó; hash routes nằm sau `#`.

Các tùy chọn nâng cao: `html` (title/lang/containerId/bodyClass/template),
`router.mode` (`history` hoặc `hash`), `view.dataEndpoint`, `view.fetchOptions`,
`api` (headers/endpoints/timeout), `entry`, `sourcemap`, `vite` (plugins/alias/target).
Builder quản lý Vite root/input/publicDir/base/outDir và không nạp Laravel plugin.
Mặc định entry là compiler output `paths.compiled/app.<context>.js`, giữ bootstrap
chung và bootstrap riêng của context.

Nếu cần cấu hình JavaScript, vẫn có thể dùng file tùy chọn `sao.dist.config.mjs`
(export default) hoặc `.json` với `contexts: { web: { ... } }`. Các giá trị này
ghi đè inline dist; `.mjs` được ưu tiên. `--config <filename>` chọn file riêng.
Không cần khai báo routes lại trong file này. Dự án chỉ có client, không có Laravel,
đặt router.routes trong cấu hình context hiện có; xem ví dụ standalone.

HTML template là file HTML thuần trong dự án, có hai marker
`<!-- saola:head -->`, `<!-- saola:boot -->` và container ID, mặc định
`<div id="app-root"></div>`.

## Triển khai

```text
dist/web/index.html
dist/web/assets/
dist/web/saola-dist.json
```

Copy nội dung `dist/<context>/` lên static host, phục vụ qua HTTP.
History router cần fallback để mở trực tiếp và refresh route:

```nginx
location / { try_files $uri $uri/ /index.html; }
```

Hash router không cần fallback. Bản này dùng CSR, không prerender HTML và không
đóng gói backend. Build SSR Laravel hiện tại vẫn dùng lệnh build cũ.

Build trong staging; chỉ thay output đã được đánh dấu Saola sau khi compile,
bundle và copy assets thành công. Build lỗi giữ bản dist thành công trước đó.

Ví dụ hai context dùng một file cấu hình: [standalone](../examples/standalone/).

## HTML tĩnh từ routes

Thống nhất scripts `dist: "sao-dist"`, `dist:web: "sao-dist web"`,
`dist:admin: "sao-dist admin"`, `dist:all: "sao-dist all"` theo context của dự án:

```bash
npm run dist
npm run dist:web
npm run dist:all
npm run dist -- --static
npm run dist:web -- --static
npm run dist:all -- --static
```

`--static` dùng cùng cấu hình, tự đọc component routes của context. Sau khi
compile/bundle, builder gửi từng yêu cầu GET ẩn danh vào Laravel HTTP kernel
trong process mới, lấy HTML hoàn chỉnh rồi thay script server bằng boot đã build.
Không cần chạy HTTP server ở máy build. Nội dung có sẵn trong file trước khi
JavaScript chạy; client CSR dựng lại trang để tiếp tục tương tác và điều hướng.
Script inline riêng của Blade bị bỏ; chuyển logic tương tác sang view client
hoặc khai báo `scripts` trong dist. CSRF token và boot/config SSR không xuất ra.
CSS inline được giữ; stylesheet và script toàn trang dùng cấu hình dist.

Output mặc định `dist-static/<context>/`, độc lập với bản SPA trong `dist/`.
Có thể đổi bằng `dist.staticOutDir` cấp gốc. Mapping:

| URL | File |
|---|---|
| `/` | `index.html` |
| `/vn` hoặc `/vn/` | `vn/index.html` |
| `/guide.html` | `guide.html` |
| `/vn/terms.html` | `vn/terms.html` |
| `/docs/start` | `docs/start/index.html` |

Hai routes tạo cùng một file làm build dừng. Route tham số bị bỏ qua và được
báo trong log/manifest; cung cấp URL cụ thể qua `contexts.<name>.dist.static.paths`.
`static.exclude` loại URL không phù hợp xuất tĩnh (đăng nhập, trang theo phiên).
`static.origin` là origin HTTP dùng khi render, mặc định `http://localhost`.
Ví dụ `static: { paths: ["/articles/hello.html"], exclude: ["/account.html"] }`.
Các route render lỗi, redirect, cần đăng nhập hoặc không trả HTML 200 làm build
dừng; bản thành công trước vẫn được giữ. Controller có thể chạy truy vấn hoặc
tác vụ trong GET, nên dùng môi trường build có dữ liệu công khai phù hợp.

Static host chỉ cần phục vụ file và directory index; các URL đã xuất không cần
SPA fallback. Route động chưa xuất vẫn cần server. Tài nguyên ngoài CDN không
được tải về; các stylesheet/script mong muốn phải khai báo trong dist như bản SPA.

## Xem trực tiếp bằng file://

Cả hai chế độ build hỗ trợ xem file cục bộ. Giữ nguyên cấu trúc thư mục output:

- HTML tĩnh: mở `index.html` hoặc file con như `vn/guide.html`. CSS, ảnh, font
  được đóng gói dùng đường dẫn tương đối; các liên kết tới trang đã xuất dẫn tới
  file tương ứng. Nội dung prerender được giữ; không chạy boot CSR/module ở chế
  độ file để tránh CORS. Script classic toàn trang vẫn chạy.
- SPA: mở `index.html`. Builder tạo thêm `saola-file.js` dạng classic IIFE, gộp
  các module để không cần tải ES modules bằng file origin. Router dùng hash
  trong chế độ xem file; chạy HTTP vẫn dùng cấu hình router ban đầu.
- Route có tham số không thể truy cập trong SPA file preview: navigation guard
  hiện thông báo cần chạy HTTP. Trong HTML tĩnh, liên kết tới URL chưa được
  xuất cũng hiện thông báo; URL cụ thể đã xuất bằng `static.paths` vẫn mở được.

Dữ liệu dịch đã nằm trong bundle. File preview không đóng gói server/API hoặc
sao chép CDN: chức năng cần API vẫn phụ thuộc kết nối và chính sách CORS của
server, font/script CDN vẫn cần mạng. Không dùng file preview để thay cho
kiểm tra đầy đủ chức năng qua HTTP.

## Cấu hình dist bằng môi trường

Builder tự đọc `.env`, `.env.local`, `.env.production`, `.env.production.local`
tại thư mục ứng dụng. File sau ghi đè file trước; biến môi trường của shell/CI
ưu tiên cao nhất. Hỗ trợ `${VARIABLE}` như dotenv; không sửa `process.env` của
ứng dụng hoặc đưa các biến Laravel khác vào bundle.

```dotenv
SAOLA_DIST_BASE_URL=/
SAOLA_DIST_API_URL=https://backend.example.com/api
SAOLA_DIST_DATA_URL=https://backend.example.com
# Chỉ đặt khi server cần key công khai dành cho trình duyệt:
SAOLA_DIST_API_KEY=public-client-key
SAOLA_DIST_API_KEY_HEADER=X-API-Key
```

Không cần `sao.dist.config.mjs` để đọc các biến này. Biến có mặt ghi đè cấu hình
JSON/module; biến không có giữ cấu hình đang dùng. Ghi đè theo context:

```dotenv
SAOLA_DIST_WEB_BASE_URL=/portal/
SAOLA_DIST_WEB_API_URL=https://web-backend.example.com/api
SAOLA_DIST_WEB_DATA_URL=https://web-backend.example.com
SAOLA_DIST_ADMIN_API_URL=https://admin-backend.example.com/api
```

Tiền tố context là tên viết hoa, đổi dấu `-` thành `_`. Biến riêng của context
ưu tiên hơn biến chung. `BASE_URL` là pathname kết thúc bằng `/`, không phải
domain đầy đủ. `API_URL` đặt `App.API.baseUrl`; `DATA_URL` đặt
`view.dataEndpoint` cho page-data ngầm của `@await`. Ví dụ route `/users/3?q=a`
sẽ lấy dữ liệu từ `https://backend.example.com/users/3?q=a`; API gọi `/users`
sẽ gửi tới `https://backend.example.com/api/users`.

Nếu không có `DATA_URL`/`view.dataEndpoint` riêng, `@await` dùng `API_URL`.
URL khai báo trực tiếp trong `@await` và service `App.Http` không tự remap.
API key/header được áp dụng cho cả App.API và fetch page-data. Server vẫn cần
JSON đúng định dạng Saola, CORS và cơ chế xác thực phù hợp. Cookie page-data
có thể cấu hình qua `view.fetchOptions.credentials: 'include'`.

Mặc định mode là `production`; chọn `.env.staging`/`.env.staging.local` bằng:

```bash
npm run dist:web -- --mode staging
npm run dist:web -- --static --mode staging
```

Mode này chỉ chọn cấu hình đóng gói, không thay `APP_ENV` của Laravel. Tất cả
giá trị là cấu hình tại thời điểm build; đổi env phải build lại. `.env` không
được copy vào output; các giá trị được ánh xạ vẫn đọc được trong bundle client.
