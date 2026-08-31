@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@useState($count, 0)
@let($message = 'Hello')
@const($MAX = 100)
@vars($temp)
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'test-component'])>
    <h3 @class([$__VIEW_ID__ . '-6ff016ee'])>State: @startMarker('output', '4c3e6fc4'){{ $count }}@endMarker('output', '4c3e6fc4')</h3>
    <p @class([$__VIEW_ID__ . '-96323a6c'])>Message: {{ $message }}</p>
    <p @class([$__VIEW_ID__ . '-7d4b4366'])>Max: {{ $MAX }}</p>
    
    @startMarker('reactive', '8304c314', ['stateKey' => ['count'], 'type' => 'if'])
    @if($count > 5)
        <div @class([$__VIEW_ID__ . '-c0d851d9'])>Count is greater than 5</div>
    @else
        <div @class([$__VIEW_ID__ . '-425fc843'])>Count is 5 or less</div>
    @endif
    @endMarker('reactive', '8304c314')
    
    @foreach([1, 2, 3] as $item)
        <div @class([$__VIEW_ID__ . "-9f765099-{$loop->index}"])>Item: @startMarker('output', "c2080d34-{$loop->index}"){{ $item }}@endMarker('output', "c2080d34-{$loop->index}")</div>
    @endforeach
    
    <button @class([$__VIEW_ID__ . '-55484cc3'])>Increment</button>
</div>
@endWrapper
