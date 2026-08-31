@useState($d, 4)

@wrapper
<div @hydrate('div-1')>@startMarker('output', 'div-1-output-1'){{ $d }}@endMarker('output', 'div-1-output-1')</div>
@foreach($items as $item)
    <span @hydrate("foreach-1-{$loop->index}-span-1")>{{ $item }}</span>
@endforeach
@endWrapper