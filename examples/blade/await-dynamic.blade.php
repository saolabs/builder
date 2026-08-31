@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@vars($users = null, $posts = [])
@wrapper
@await
<div @class([$__VIEW_ID__ . '-d69e6b1d'])>
    @startMarker('reactive', '8304c314', ['stateKey' => [], 'type' => 'if'])
    @if($user)
        <h1 @class([$__VIEW_ID__ . '-3a671613'])>Welcome {{ $user->name }}</h1>
        @foreach($postList as $post)
            <div @class([$__VIEW_ID__ . "-ac013aeb-{$loop->index}"])>@startMarker('output', "33b75e1c-{$loop->index}"){{ $post->title }}@endMarker('output', "33b75e1c-{$loop->index}")</div>
        @endforeach
    @else
        <p @class([$__VIEW_ID__ . '-f08cfbae'])>Please login first</p>
    @endif
    @endMarker('reactive', '8304c314')
</div>
<div @class([$__VIEW_ID__ . '-eced4db6'])>
    <button @class([$__VIEW_ID__ . '-c480ac03'])>Login</button>
    <button @class([$__VIEW_ID__ . '-300dfb10'])>Fetch Posts</button>
</div>
@endWrapper
