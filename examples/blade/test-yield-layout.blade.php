@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@pageStart
@wrapper
{{-- Layout template sử dụng @yield --}}

<div @class([$__VIEW_ID__ . '-d69e6b1d', 'app-layout'])>
    <header @class([$__VIEW_ID__ . '-b4c38ce1'])>
        <h1 @class([$__VIEW_ID__ . '-a5affa9a'])>@yield('title', 'Default Title')</h1>
        <nav @class([$__VIEW_ID__ . '-dc5dcde4'])>@yield('nav')</nav>
    </header>

    <main @class([$__VIEW_ID__ . '-338c536e'])>
        @startMarker('yield', 'efa5f298')
        @yield('content')
        @endMarker('yield', 'efa5f298')
    </main>

    <footer @class([$__VIEW_ID__ . '-04d65fe4'])>
        @startMarker('yield', '71c047e9')
        @yield('footer', '<p>Default Footer</p>')
        @endMarker('yield', '71c047e9')
    </footer>
</div>
@endWrapper

@pageEnd
