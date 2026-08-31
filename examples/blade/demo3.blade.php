@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@useState($isOpen, false)
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'demo3-component'])>
    Status: @startMarker('output', 'fd128df1'){{ $isOpen ? 'Open' : 'Closed' }}@endMarker('output', 'fd128df1')
</div>
@endWrapper
