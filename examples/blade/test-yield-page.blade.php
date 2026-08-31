@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@useState($count, 0)
@useState($name, 'World')
@extends($__layout__ . 'test-yield-layout')
@block('title')
    Page Title - @startMarker('output', 'ee7f8e00'){{ $name }}@endMarker('output', 'ee7f8e00')
@endblock
@block('nav')
    <a @class([$__VIEW_ID__ . '-2627e073']) @attr(['href' => '/'])>Home</a>
    <a @class([$__VIEW_ID__ . '-098bef20']) @attr(['href' => '/about'])>About</a>
@endblock
@block('content')
    <div @class([$__VIEW_ID__ . '-e085b222', 'content-area'])>
        <h2 @class([$__VIEW_ID__ . '-dea81b3e'])>Hello, @startMarker('output', '2ecb12cd'){{ $name }}@endMarker('output', '2ecb12cd')!</h2>
        <p @class([$__VIEW_ID__ . '-f0393273'])>Count: @startMarker('output', '4a27f886'){{ $count }}@endMarker('output', '4a27f886')</p>
        <button @class([$__VIEW_ID__ . '-21f51b84'])>Increment</button>
    </div>
@endblock
@block('footer')
    <p @class([$__VIEW_ID__ . '-cd16ec4a'])>Custom Footer for @startMarker('output', '8cfe315a'){{ $name }}@endMarker('output', '8cfe315a')</p>
@endblock
