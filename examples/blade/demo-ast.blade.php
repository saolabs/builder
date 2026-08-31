@exec($__ONE_COMPONENT_REGISTRY__ = ['tasks' => $__template__ . 'sessions.tasks', 'projects' => $__template__ . 'sessions.projects', 'counter' => 'sessions.tasks.count', 'demo' => $__template__ . 'demo.fetch', 'baseLayout' => $__layout__ . 'base', 'alert' => $__blade_custom_path__]) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@let($name = 'John Doe')
@let($posts = [
    ['title'=> 'Post 1', 'content'=> 'Content of post 1'],
    ['title'=> 'Post 2', 'content'=> 'Content of post 2'],
    ['title'=> 'Post 3', 'content'=> 'Content of post 3'],
])
@wrapper
@exec($a = 10, $b = 20, $c = $a + $b)
    <div @class([$__VIEW_ID__ . '-d69e6b1d'])>
        <p @class([$__VIEW_ID__ . '-e4a2aaaf'])>Value of a: {{ $a }}</p>
        <p @class([$__VIEW_ID__ . '-96323a6c'])>Value of b: {{ $b }}</p>
        <p @class([$__VIEW_ID__ . '-7d4b4366'])>Value of c (a + b): {{ $c }}</p>
    </div>
    <div @class([$__VIEW_ID__ . '-eced4db6'])>
        @exec($email = 'Jane Smith', $age = 30)
        <p @class([$__VIEW_ID__ . '-04230c5b'])>Name: {{ $name }}</p>
        <p @class([$__VIEW_ID__ . '-8d2ed3cb'])>Email: {{ $email }}</p>
        <p @class([$__VIEW_ID__ . '-a37650dc'])>Age: {{ $age }}</p>
    </div>
    @startMarker('component', '68594f9a')
    @exec($__env->startSection($__ONE_COMPONENT_REGISTRY__['tasks'].'_0'))
@startMarker('component', 'fa6abab0')
@include($__template__ . 'demo.fetch', ['users' => $users])
@endMarker('component', 'fa6abab0')
@exec($__env->stopSection())
@exec($__tasks__0_content = $__env->yieldContent($__ONE_COMPONENT_REGISTRY__['tasks'].'_0'))
@include($__template__ . 'sessions.tasks', ['__ONE_CHILDREN_CONTENT__' => $__tasks__0_content])
@endMarker('component', '68594f9a')
    @startMarker('component', 'cdc4fc98')
    @include($__template__ . 'sessions.tasks', ['title' => 'Custom Task List'])
    @endMarker('component', 'cdc4fc98')
    @startMarker('component', 'e0f18838')
    @exec($__env->startSection($__ONE_COMPONENT_REGISTRY__['projects'].'_2'))
<div @class([$__VIEW_ID__ . '-b18fe9d7', 'header'])>
            <h2 @class([$__VIEW_ID__ . '-1c77c20b'])>My Projects @if(!($t = count($projects))) Rỗng @else ({{ $t }}) @endif</h2>
        </div>
        <div @class([$__VIEW_ID__ . '-fe28a62f', 'footer'])>
            <p @class([$__VIEW_ID__ . '-c9f0c18f'])>Total Projects: {{ count($projects) }}</p>
        </div>
        @startMarker('component', '4aac35d9')
        @exec($__env->startSection($__ONE_COMPONENT_REGISTRY__['tasks'].'_1'))
<div @class([$__VIEW_ID__ . '-727ca7d7', 'header'])>
                <h3 @class([$__VIEW_ID__ . '-8a745b38'])>Task Owners</h3>
                <p @class([$__VIEW_ID__ . '-87be49e9'])>{{ $content }}</p>
                @exec($test = 'Hello World')
                @foreach($posts as $post)
                    <p @class([$__VIEW_ID__ . "-95b8e5df-{$loop->index}"])>@startMarker('output', "fdc458ea-{$loop->index}"){{ $content }}@endMarker('output', "fdc458ea-{$loop->index}")</p>
                    @exec($content = 'This is a test')
                    <p @class([$__VIEW_ID__ . "-b36f132d-{$loop->index}"])>@startMarker('output', "a3056b3f-{$loop->index}"){{ $post->title }}@endMarker('output', "a3056b3f-{$loop->index}"): @startMarker('output', "1425822f-{$loop->index}"){{ $post->content }}@endMarker('output', "1425822f-{$loop->index}") @startMarker('output', "6bc4e3ef-{$loop->index}"){{ $content }}@endMarker('output', "6bc4e3ef-{$loop->index}")</p>
                @endforeach
            </div>
            <p @class([$__VIEW_ID__ . '-7cbd68c8'])>{{ $content }}</p>
            @startMarker('component', 'f02a36c3')
            @include($__template__ . 'demo.fetch', ['users' => $users])
            @endMarker('component', 'f02a36c3')
            @startMarker('reactive', '59eeb50a', ['stateKey' => [], 'type' => 'if'])
            @if(!($person = getPerson()))
                <p @class([$__VIEW_ID__ . '-6559f3b5'])>No person found.</p>
            @else
                <p @class([$__VIEW_ID__ . '-b9d01ee9'])>Person found: {{ $person->name }}</p>
            @endif
            @endMarker('reactive', '59eeb50a')
@exec($__env->stopSection())
@exec($__tasks__1_content = $__env->yieldContent($__ONE_COMPONENT_REGISTRY__['tasks'].'_1'))
@include($__template__ . 'sessions.tasks', ['owners' => ['Alice', 'Bob'], '__ONE_CHILDREN_CONTENT__' => $__tasks__1_content])
@endMarker('component', '4aac35d9')
@exec($__env->stopSection())
@exec($__projects__2_content = $__env->yieldContent($__ONE_COMPONENT_REGISTRY__['projects'].'_2'))
@include($__template__ . 'sessions.projects', ['projects' => $projects, '__ONE_CHILDREN_CONTENT__' => $__projects__2_content])
@endMarker('component', 'e0f18838')
    @startMarker('component', '712094c8')
    @include('sessions.tasks.count')
    @endMarker('component', '712094c8')
    @startMarker('component', '0aed4ae2')
    @include($__template__ . 'demo.fetch')
    @endMarker('component', '0aed4ae2')
    @startMarker('component', 'f06e1819')
    @include($__blade_custom_path__, ['type' => "success", 'message' => "This is a custom alert component!"])
    @endMarker('component', 'f06e1819')
@endWrapper
