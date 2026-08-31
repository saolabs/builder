@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

<?php if(!isset($a) || (!$a && $a !== false)) $a = 0; if(!isset($cProp) || (!$cProp && $cProp !== false)) $cProp = 0; ?>
<?php if(!isset($b) || (!$b && $b !== false)) $b = 0; if(!isset($d) || (!$d && $d !== false)) $d = 0; ?>
@useState($countState, 0)
@useState($eState, $b)
@const([$count, $setCount] = useState(0))
@let($testVar = 'This is a test variable')
@const([$message, $setMessage] = useState('Hello, Saola!'))
@let($textContent = $message . ' Count is ' . $count)
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'counter-component'])>
    <h4 @class([$__VIEW_ID__ . '-beab9ba1'])>Count: <span @class([$__VIEW_ID__ . '-1eafe912']) @attr(['id' => 'counter-value', 'data-count' => $count])>@startMarker('output', '5ff3bd35'){{ $count }}@endMarker('output', '5ff3bd35')</span></h4>
    <div @class([$__VIEW_ID__ . '-fccc82c8', 'btn-group'])>
        <button @class([$__VIEW_ID__ . '-aa23a7be', 'btn', 'btn-primary'])>-</button>
        <button @class([$__VIEW_ID__ . '-9ac7c16c', 'btn', 'btn-primary'])>+</button>
        <button @class([$__VIEW_ID__ . '-f4cc6573', 'btn', 'btn-primary'])>Reset</button>
    </div>
</div>
@endWrapper
