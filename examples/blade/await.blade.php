@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@vars($user = null, $counter = 0)
@await
@extends('layout')
@block('content')
    <div @class([$__VIEW_ID__ . '-e085b222'])>
        @startMarker('reactive', '97d74020', ['stateKey' => [], 'type' => 'if'])
        @if($user)
            <h1 @class([$__VIEW_ID__ . '-31dfc4e0'])>Welcome {{ $user->name }}</h1>
        @else
            <p @class([$__VIEW_ID__ . '-b1b84f18'])>Please login first</p>
        @endif
        @endMarker('reactive', '97d74020')
    </div>
    <div @class([$__VIEW_ID__ . '-d30ec74f'])>
        <button @class([$__VIEW_ID__ . '-225bae8d'])>Login</button>
        <button @class([$__VIEW_ID__ . '-b284f53d'])>Increment Counter</button>
        <p @class([$__VIEW_ID__ . '-732603d4'])>Counter: {{ $counter }}</p>
    </div>
@endblock
@block('footer')
    <footer @class([$__VIEW_ID__ . '-7b697647'])>Copyright 2026</footer>
@endblock
@section('sidebar', 'posts')
