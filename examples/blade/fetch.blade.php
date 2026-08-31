@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@const([$users, $setUsers] = useState([]),
    [$isLoading, $setIsLoading] = useState(true),
    [$error, $setError] = useState(null))
@extends($__layout__ . 'base')
@section('meta:title', 'Demo Fetch Users')
@block('content')
    <div @class([$__VIEW_ID__ . '-e085b222', 'container', 'py-5'])>
        <h1 @class([$__VIEW_ID__ . '-06fe9377', 'mb-4'])>Fetch Users Demo</h1>
        @startMarker('reactive', '97d74020', ['stateKey' => ['isLoading'], 'type' => 'if'])
        @if($isLoading)
            <div @class([$__VIEW_ID__ . '-44e075bd', 'alert', 'alert-info'])>Đang tải users...</div>
        @elseif($error)
            <div @class([$__VIEW_ID__ . '-b8e33ef9', 'alert', 'alert-danger'])>Error: @startMarker('output', 'f4f15243'){{ $error }}@endMarker('output', 'f4f15243')</div>
        @elseif(!$users || count($users) === 0)
            <div @class([$__VIEW_ID__ . '-55ff6a50', 'alert', 'alert-danger'])>Error không có users</div>
        @else
            @startMarker('reactive', '93adb396', ['stateKey' => ['users'], 'type' => 'foreach'])
            @foreach($users as $user)
                <div @class([$__VIEW_ID__ . "-0ca9f865-{$loop->index}", 'user-card', 'mb-3', 'p-3', 'border', 'rounded'])>
                    <h6 @class([$__VIEW_ID__ . "-6f51958c-{$loop->index}"])>@startMarker('output', "a25a5270-{$loop->index}"){{ $user->name }}@endMarker('output', "a25a5270-{$loop->index}")</h6>
                    <p @class([$__VIEW_ID__ . "-fc55c64f-{$loop->index}", 'mb-1'])>@startMarker('output', "b266bc52-{$loop->index}"){{ $user->email }}@endMarker('output', "b266bc52-{$loop->index}")</p>
                    <small @class([$__VIEW_ID__ . "-ca9dc9a1-{$loop->index}", 'text-muted'])>@startMarker('output', "4ab011e3-{$loop->index}"){{ $user->company->name }}@endMarker('output', "4ab011e3-{$loop->index}")</small>
                </div>
            @endforeach
            @endMarker('reactive', '93adb396')
        @endif
        @endMarker('reactive', '97d74020')
    </div>
@endblock
