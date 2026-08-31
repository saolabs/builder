@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@vars($__ONE_CHILDREN_CONTENT__ = '')
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'ast-1'])>
        <h1 @class([$__VIEW_ID__ . '-0c3ea1b5'])>This is title</h1>
        <p @class([$__VIEW_ID__ . '-96323a6c'])>This is content</p>
        <button @class([$__VIEW_ID__ . '-3962518c'])>Click me</button>
        {!! $__ONE_CHILDREN_CONTENT__ !!}
    </div>
@endWrapper
