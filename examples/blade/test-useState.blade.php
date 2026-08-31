@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@useState($users, [])
@const([$userList, $setUserList] = useState([]))
@let([$loading, $setLoading] = useState(false))
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'test'])>
    <h2 @class([$__VIEW_ID__ . '-9d70118d'])>Test @startMarker('output', '57d9b60b'){{ $users }}@endMarker('output', '57d9b60b')</h2>
</div>
@endWrapper
