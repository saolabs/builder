@exec($__ONE_COMPONENT_REGISTRY__ = ['tasks' => $__template__ . 'sessions.tasks', 'projects' => $__template__ . 'sessions.projects', 'counter' => 'sessions.tasks.count', 'demo' => $__template__ . 'demo.fetch', 'baseLayout' => $__layout__ . 'base', 'alert' => $__blade_custom_path__]) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@wrapper
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
            <h2 @class([$__VIEW_ID__ . '-1c77c20b'])>My Projects</h2>
        </div>
        <div @class([$__VIEW_ID__ . '-fe28a62f', 'footer'])>
            <p @class([$__VIEW_ID__ . '-c9f0c18f'])>Total Projects: {{ count($projects) }}</p>
        </div>
        @startMarker('component', '4aac35d9')
        @exec($__env->startSection($__ONE_COMPONENT_REGISTRY__['tasks'].'_1'))
<div @class([$__VIEW_ID__ . '-727ca7d7', 'header'])>
                <h3 @class([$__VIEW_ID__ . '-8a745b38'])>Task Owners</h3>
            </div>
            @startMarker('component', 'f02a36c3')
            @include($__template__ . 'demo.fetch', ['users' => $users])
            @endMarker('component', 'f02a36c3')
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
