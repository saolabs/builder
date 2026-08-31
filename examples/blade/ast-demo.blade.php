@exec($__ONE_COMPONENT_REGISTRY__ = ['ast1' => $__template__ . 'ast1', 'ast2' => $__template__ . 'ast2', 'ast3' => $__template__ . 'ast3']) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

<?php if(!isset($test) || (!$test && $test !== false)) $test = "test"; if(!isset($test1) || (!$test1 && $test1 !== false)) $test1 = "test1"; ?>
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'ast-demo'])>
        <p @class([$__VIEW_ID__ . '-e4a2aaaf'])>{{ $test }}</p>
        <p @class([$__VIEW_ID__ . '-96323a6c'])>{{ $test1 }}</p>
        @startMarker('component', '64cf91d6')
        @exec($__env->startSection($__ONE_COMPONENT_REGISTRY__['ast1'].'_0'))
@startMarker('component', 'ac3059ef')
@include($__template__ . 'ast2')
@endMarker('component', 'ac3059ef')
            @startMarker('component', '527115c9')
            @include($__template__ . 'ast3')
            @endMarker('component', '527115c9')
@exec($__env->stopSection())
@exec($__ast1__0_content = $__env->yieldContent($__ONE_COMPONENT_REGISTRY__['ast1'].'_0'))
@include($__template__ . 'ast1', ['__ONE_CHILDREN_CONTENT__' => $__ast1__0_content])
@endMarker('component', '64cf91d6')
    </div>
@endWrapper
