@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@const([$items, $setItems] = useState([
    ['id'=> 1, 'name'=> 'Apple', 'category'=> 'fruit', 'price'=> 2, 'tags'=> ['red', 'sweet']],
    ['id'=> 2, 'name'=> 'Carrot', 'category'=> 'vegetable', 'price'=> 1, 'tags'=> ['orange']],
    ['id'=> 3, 'name'=> 'Banana', 'category'=> 'fruit', 'price'=> 3, 'tags'=> ['yellow', 'sweet', 'tropical']],
    ['id'=> 4, 'name'=> 'Broccoli', 'category'=> 'vegetable', 'price'=> 4, 'tags'=> ['green', 'healthy']]
]))
@const([$status, $setStatus] = useState('active'))
@const([$count, $setCount] = useState(0))
@const([$showDetails, $setShowDetails] = useState(true))
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'nested-reactive-demo'])>
    {{-- Level 1: @if with output --}}
    <h2 @class([$__VIEW_ID__ . '-9d70118d'])>Total items: @startMarker('output', '57d9b60b'){{ count($items) }}@endMarker('output', '57d9b60b')</h2>
    <p @class([$__VIEW_ID__ . '-96323a6c'])>Status: @startMarker('output', '4ed23a9a'){{ $status }}@endMarker('output', '4ed23a9a')</p>

    {{-- Level 1: @if block → Level 2: @foreach → Level 3: @if + output --}}
    @startMarker('reactive', '8304c314', ['stateKey' => ['showDetails'], 'type' => 'if'])
    @if($showDetails)
        <div @class([$__VIEW_ID__ . '-c0d851d9', 'details-panel'])>
            <h3 @class([$__VIEW_ID__ . '-e240b46f'])>Item Details (count: @startMarker('output', 'a4ea9243'){{ $count }}@endMarker('output', 'a4ea9243'))</h3>
            @startMarker('reactive', '902f863d', ['stateKey' => ['items'], 'type' => 'foreach'])
            @foreach($items as $item)
                <div @class([$__VIEW_ID__ . "-b694ec4d-{$loop->index}", 'item-card']) @attr(['data-id' => $item->id])>
                    <strong @class([$__VIEW_ID__ . "-09a1f0cb-{$loop->index}"])>@startMarker('output', "1bbdf8ed-{$loop->index}"){{ $item->name }}@endMarker('output', "1bbdf8ed-{$loop->index}")</strong> - $@startMarker('output', "02ce1872-{$loop->index}"){{ $item->price }}@endMarker('output', "02ce1872-{$loop->index}")

                    {{-- Level 3: nested @if inside @foreach inside @if --}}
                    @startMarker('reactive', "cd817d05-{$loop->index}", ['stateKey' => [], 'type' => 'if'])
                    @if($item->price > 2)
                        <span @class([$__VIEW_ID__ . "-3c490cef-{$loop->index}", 'badge', 'expensive'])>Expensive</span>
                    @else
                        <span @class([$__VIEW_ID__ . "-5ba7666b-{$loop->index}", 'badge', 'cheap'])>Affordable</span>
                    @endif
                    @endMarker('reactive', "cd817d05-{$loop->index}")

                    {{-- Level 3: nested @foreach inside @foreach (tags) --}}
                    <div @class([$__VIEW_ID__ . "-096ac143-{$loop->index}", 'tags'])>
                        @foreach($item->tags as $tag)
                            <span @class([$__VIEW_ID__ . "-69ab6ad3-{$loop->index}-{$loop->index}", 'tag'])>@startMarker('output', "95cfba3f-{$loop->index}-{$loop->index}"){{ $tag }}@endMarker('output', "95cfba3f-{$loop->index}-{$loop->index}")</span>
                        @endforeach
                    </div>
                </div>
            @endforeach
            @endMarker('reactive', '902f863d')
        </div>
    @else
        <p @class([$__VIEW_ID__ . '-f08cfbae'])>Details hidden. Click to show.</p>
    @endif
    @endMarker('reactive', '8304c314')

    {{-- Level 1: @switch block --}}
    @startMarker('reactive', '87da1671', ['stateKey' => ['status'], 'type' => 'switch'])
    @switch($status)
        @case('active')
            <div @class([$__VIEW_ID__ . '-17b81f01', 'status-active'])>
                <p @class([$__VIEW_ID__ . '-d566c824'])>System is active</p>
                {{-- Level 2: @for inside @switch --}}
                @startMarker('reactive', 'fecf94b7', ['stateKey' => ['count'], 'type' => 'for'])
                @for($i = 0; $i < $count; $i++)
                    <div @class([$__VIEW_ID__ . "-c89d0a72-{$i}", 'counter-item'])>
                        Item #@startMarker('output', "2cbe2f68-{$i}"){{ $i + 1 }}@endMarker('output', "2cbe2f68-{$i}")
                        @startMarker('reactive', "308be5af-{$i}", ['stateKey' => [], 'type' => 'if'])
                        @if($i % 2 === 0)
                            <span @class([$__VIEW_ID__ . "-2dbe1b86-{$i}"])>(even)</span>
                        @else
                            <span @class([$__VIEW_ID__ . "-85813a75-{$i}"])>(odd)</span>
                        @endif
                        @endMarker('reactive', "308be5af-{$i}")
                    </div>
                @endfor
                @endMarker('reactive', 'fecf94b7')
            </div>
            @break
        @case('inactive')
            <div @class([$__VIEW_ID__ . '-5e0e01f9', 'status-inactive'])>
                <p @class([$__VIEW_ID__ . '-ff6f5732'])>System is inactive</p>
            </div>
            @break
        @default
            <div @class([$__VIEW_ID__ . '-e624844c', 'status-unknown'])>
                <p @class([$__VIEW_ID__ . '-a9edb396'])>Unknown status: @startMarker('output', '12037c02'){{ $status }}@endMarker('output', '12037c02')</p>
            </div>
    @endswitch
    @endMarker('reactive', '87da1671')

    {{-- Level 1: @foreach with complex nesting --}}
    <div @class([$__VIEW_ID__ . '-6b7c3ec4', 'category-groups'])>
        @startMarker('reactive', '9e7541ab', ['stateKey' => ['items'], 'type' => 'foreach'])
        @foreach($items as $key => $item)
            <div @class([$__VIEW_ID__ . "-a5dc4800-{$loop->index}", 'group'])>
                <h4 @class([$__VIEW_ID__ . "-257a304c-{$loop->index}"])>[@startMarker('output', "9358af9a-{$loop->index}"){{ $key }}@endMarker('output', "9358af9a-{$loop->index}")] @startMarker('output', "20fe2a71-{$loop->index}"){{ $item->name }}@endMarker('output', "20fe2a71-{$loop->index}") (@startMarker('output', "5b06d485-{$loop->index}"){{ $item->category }}@endMarker('output', "5b06d485-{$loop->index}"))</h4>

                {{-- Level 2: @switch inside @foreach --}}
                @startMarker('reactive', "be70c31c-{$loop->index}", ['stateKey' => [], 'type' => 'switch'])
                @switch($item->category)
                    @case('fruit')
                        <span @class([$__VIEW_ID__ . "-6c67bd33-{$loop->index}", 'icon'])>🍎</span>
                        @break
                    @case('vegetable')
                        <span @class([$__VIEW_ID__ . "-75a19431-{$loop->index}", 'icon'])>🥦</span>
                        @break
                @endswitch
                @endMarker('reactive', "be70c31c-{$loop->index}")

                {{-- Level 2: @if with nested @foreach --}}
                @startMarker('reactive', "6600da4e-{$loop->index}", ['stateKey' => [], 'type' => 'if'])
                @if(count($item->tags) > 1)
                    <ul @class([$__VIEW_ID__ . "-887408bb-{$loop->index}"])>
                        @foreach($item->tags as $idx => $tag)
                            <li @class([$__VIEW_ID__ . "-51b02d05-{$loop->index}-{$loop->index}"])>
                                Tag @startMarker('output', "0d1cbbf5-{$loop->index}-{$loop->index}"){{ $idx }}@endMarker('output', "0d1cbbf5-{$loop->index}-{$loop->index}"): @startMarker('output', "455eb528-{$loop->index}-{$loop->index}"){{ $tag }}@endMarker('output', "455eb528-{$loop->index}-{$loop->index}")
                                @startMarker('reactive', "809bb5e9-{$loop->index}-{$loop->index}", ['stateKey' => [], 'type' => 'if'])
                                @if($tag === 'sweet')
                                    <em @class([$__VIEW_ID__ . "-27607e6e-{$loop->index}-{$loop->index}"])> ← popular!</em>
                                @endif
                                @endMarker('reactive', "809bb5e9-{$loop->index}-{$loop->index}")
                            </li>
                        @endforeach
                    </ul>
                @else
                    <p @class([$__VIEW_ID__ . "-89200765-{$loop->index}"])>Only one tag: @startMarker('output', "07a1cb6f-{$loop->index}"){{ $item->tags[0] }}@endMarker('output', "07a1cb6f-{$loop->index}")</p>
                @endif
                @endMarker('reactive', "6600da4e-{$loop->index}")
            </div>
        @endforeach
        @endMarker('reactive', '9e7541ab')
    </div>

    {{-- Include with state vars --}}
    @startMarker('component', '64cf91d6')
    @include('components.item-card', ['items'=> $items, 'count'=> $count])
    @endMarker('component', '64cf91d6')
</div>
@endWrapper
