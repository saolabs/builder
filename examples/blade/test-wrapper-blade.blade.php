@useState($c, 3)

@wrapper
<div @hydrate('div-1')>@startMarker('output', 'div-1-output-1'){{ $c }}@endMarker('output', 'div-1-output-1')</div>
    @foreach($users as $user)
        <p @hydrate("foreach-1-{$loop->index}-p-1")>{{ $user['name'] }}</p>
    @endforeach
@endWrapper