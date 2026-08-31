@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@vars($demoList = [])
@useState($status, false)
@const([$user, $setUser] = useState(['name'=> 'Jone', 'email'=> 'jon@test.com']))
@const([$posts, $setPosts] = useState([
    ['title'=> '...', 'content'=> '...'],
    ['title'=> '...', 'content'=> '...'],
    ['title'=> '...', 'content'=> '...'],
    ['title'=> '...', 'content'=> '...'],
]))
@let($i = 0)
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'demo', 'active'=> $status]) @attr(['dataCount'=> count($demoList), 'dataUserName'=> $user->name])>
    <h1 @class([$__VIEW_ID__ . '-0c3ea1b5'])>Hello, @startMarker('output', 'e3c5d086'){{ $user->name }}@endMarker('output', 'e3c5d086')!</h1>
    <p @class([$__VIEW_ID__ . '-96323a6c'])>Your email is <span @class([$__VIEW_ID__ . '-a649093e'])>@startMarker('output', '5ce3429f'){{ $user->email }}@endMarker('output', '5ce3429f')</span>.</p>

    <button @class([$__VIEW_ID__ . '-3962518c'])>Toggle Status: @startMarker('output', '20cded4c'){{ $status ? 'On' : 'Off' }}@endMarker('output', '20cded4c')</button>

    <h2 @class([$__VIEW_ID__ . '-5b8ca3d9'])>Posts:</h2>
    <ul @class([$__VIEW_ID__ . '-c426c520'])>
        @startMarker('reactive', '08e53cbf', ['stateKey' => ['posts'], 'type' => 'if'])
        @if(count($posts) === 0)
            <li @class([$__VIEW_ID__ . '-4179f69c'])>No posts available.</li>
        @else
            @startMarker('reactive', '33b4ec90', ['stateKey' => ['posts'], 'type' => 'foreach'])
            @foreach($posts as $post)
                <li @class([$__VIEW_ID__ . "-916b3f4f-{$loop->index}"])>
                    <h3 @class([$__VIEW_ID__ . "-03b7fc5c-{$loop->index}"])>@startMarker('output', "09d3f114-{$loop->index}"){{ $post->title }}@endMarker('output', "09d3f114-{$loop->index}")</h3>
                    <p @class([$__VIEW_ID__ . "-b42d3610-{$loop->index}"])>@startMarker('output', "75b8b50d-{$loop->index}"){{ $post->content }}@endMarker('output', "75b8b50d-{$loop->index}")</p>
                </li>
            @endforeach
            @endMarker('reactive', '33b4ec90')
        @endif
        @endMarker('reactive', '08e53cbf')
    </ul>
    <div @class([$__VIEW_ID__ . '-b3c7e734', 'while-loop-demo'])>
        @startMarker('while', 'e231788c', ['start' => $i, 'end' => 5])
        @while($i < 5)
            <p @class([$__VIEW_ID__ . "-d0fe77a9-{$i}"])>Counter: @startMarker('output', "65976c5c-{$i}"){{ $i }}@endMarker('output', "65976c5c-{$i}")</p>
            @exec($i++)
        @endwhile
        @endMarker('while', 'e231788c')
    </div>

</div>
@endWrapper
