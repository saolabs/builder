@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@vars($users, $posts)
@useState($editMode, false)
@useState($todos, [
    ['id'=> 1, 'task'=> 'Buy groceries', 'completed'=> false],
    ['id'=> 2, 'task'=> 'Walk the dog', 'completed'=> true],
    ['id'=> 3, 'task'=> 'Read a book', 'completed'=> false],
    ])
@useState($newTodo, '')
@useState($nextTodoIndex, 4)
@useState($products, [
    ['id'=> 1, 'name'=> 'Apple', 'category'=> 'fruit', 'price'=> 2, 'tags'=> ['red', 'sweet']],
    ['id'=> 2, 'name'=> 'Carrot', 'category'=> 'vegetable', 'price'=> 1, 'tags'=> ['orange']],
    ['id'=> 3, 'name'=> 'Banana', 'category'=> 'fruit', 'price'=> 3, 'tags'=> ['yellow', 'sweet', 'tropical']],
    ['id'=> 4, 'name'=> 'Broccoli', 'category'=> 'vegetable', 'price'=> 4, 'tags'=> ['green', 'healthy']]
])
@useState($inventory, [
    ['id'=> 1, 'name'=> 'Apple', 'category'=> 'fruit', 'price'=> 2, 'tags'=> ['red', 'sweet']],
    ['id'=> 2, 'name'=> 'Carrot', 'category'=> 'vegetable', 'price'=> 1, 'tags'=> ['orange']],
    ['id'=> 3, 'name'=> 'Banana', 'category'=> 'fruit', 'price'=> 3, 'tags'=> ['yellow', 'sweet', 'tropical']],
    ['id'=> 4, 'name'=> 'Broccoli', 'category'=> 'vegetable', 'price'=> 4, 'tags'=> ['green', 'healthy']]
])
@useState($catalog, [
    ['id'=> 1, 'name'=> 'Apple', 'category'=> 'fruit', 'price'=> 2, 'tags'=> ['red', 'sweet']],
    ['id'=> 2, 'name'=> 'Carrot', 'category'=> 'vegetable', 'price'=> 1, 'tags'=> ['orange']],
    ['id'=> 3, 'name'=> 'Banana', 'category'=> 'fruit', 'price'=> 3, 'tags'=> ['yellow', 'sweet', 'tropical']],
    ['id'=> 4, 'name'=> 'Broccoli', 'category'=> 'vegetable', 'price'=> 4, 'tags'=> ['green', 'healthy']]
])
@const($MAX_COUNT = 10)
@let($n = 0)
@wrapper
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'input-demo'])>
        <h2 @class([$__VIEW_ID__ . '-9d70118d'])>Input State Demo</h2>
        <div @class([$__VIEW_ID__ . '-fccc82c8', 'users'])>
            <h3 @class([$__VIEW_ID__ . '-bb95914d'])>Users</h3>
            <ul @class([$__VIEW_ID__ . '-fabeb0e6'])>
                @foreach($users as $user)
                    <li @class([$__VIEW_ID__ . "-51785291-{$loop->index}"])>@startMarker('output', "2eba362a-{$loop->index}"){{ $user->name }}@endMarker('output', "2eba362a-{$loop->index}") (@startMarker('output', "158fdf32-{$loop->index}"){{ $user->email }}@endMarker('output', "158fdf32-{$loop->index}"))</li>
                @endforeach
            </ul>
        </div>
        <div @class([$__VIEW_ID__ . '-6b7c3ec4', 'posts'])>
            <h3 @class([$__VIEW_ID__ . '-3c11cc9f'])>Posts</h3>
            <ul @class([$__VIEW_ID__ . '-03a5e96a'])>
                @foreach($posts as $post)
                    <li @class([$__VIEW_ID__ . "-4f286c4f-{$loop->index}"])><strong @class([$__VIEW_ID__ . "-b2511220-{$loop->index}"])>@startMarker('output', "134a7ae9-{$loop->index}"){{ $post->title }}@endMarker('output', "134a7ae9-{$loop->index}")</strong>: @startMarker('output', "90ab339b-{$loop->index}"){{ $post->content }}@endMarker('output', "90ab339b-{$loop->index}")</li>
                @endforeach
            </ul>
        </div>
    </div>
    <div @class([$__VIEW_ID__ . '-eced4db6', 'todos-demo'])>
        <h2 @class([$__VIEW_ID__ . '-e2fbe38d'])>Todos</h2>
        <ul @class([$__VIEW_ID__ . '-bcf6c3a3'])>
            @startMarker('reactive', '9605f90b', ['stateKey' => ['todos'], 'type' => 'foreach'])
            @foreach($todos as $todo)
                <li @class([$__VIEW_ID__ . "-d8484f9d-{$loop->index}"])>
                    <label @class([$__VIEW_ID__ . "-9d96460a-{$loop->index}"])>
                        <input @class([$__VIEW_ID__ . "-f73b73c3-{$loop->index}"]) @attr(['type' => 'checkbox']) @bind($todo->completed) @checked($todo->completed) />
                        @startMarker('output', "22697e74-{$loop->index}"){{ $todo->task }}@endMarker('output', "22697e74-{$loop->index}")
                    </label>

                </li>
            @endforeach
            @endMarker('reactive', '9605f90b')
        </ul>
        <div @class([$__VIEW_ID__ . '-a582380a', 'is-edit-mode'])>
            <input @class([$__VIEW_ID__ . '-f4cf2d24']) @attr(['type' => 'text', 'placeholder' => 'Nhập công việc mới']) @bind($newTodo) />
            <button @class([$__VIEW_ID__ . '-fecec939'])>+</button>
        </div>
    </div>
    <div @class([$__VIEW_ID__ . '-559b51aa', 'products-demo'])>
        <h2 @class([$__VIEW_ID__ . '-b2282b82'])>Products @startMarker('output', '4ec44176'){{ count($products) }}@endMarker('output', '4ec44176')</h2>
        @startMarker('reactive', '6c1b628b', ['stateKey' => ['products'], 'type' => 'if'])
        @if(count($products) === 0)
            <p @class([$__VIEW_ID__ . '-6fb21822'])>No products available.</p>
        @else
            <ul @class([$__VIEW_ID__ . '-e5c6fe78'])>
                @startMarker('reactive', 'cbf33dd6', ['stateKey' => ['products'], 'type' => 'foreach'])
                @foreach($products as $product)
                    <li @class([$__VIEW_ID__ . "-f5bde316-{$loop->index}"])>
                        @startMarker('output', "459e9ee4-{$loop->index}"){{ $product->name }}@endMarker('output', "459e9ee4-{$loop->index}") - $@startMarker('output', "783a24e9-{$loop->index}"){{ $product->price }}@endMarker('output', "783a24e9-{$loop->index}")
                        @startMarker('reactive', "5c1d8559-{$loop->index}", ['stateKey' => [], 'type' => 'if'])
                        @if($product->tags && count($product->tags) > 0)
                            <div @class([$__VIEW_ID__ . "-8b2a29e5-{$loop->index}", 'tags'])>
                                @foreach($product->tags as $tag)
                                    <span @class([$__VIEW_ID__ . "-b82d8442-{$loop->index}-{$loop->index}", 'tag'])>@startMarker('output', "3ffbaf01-{$loop->index}-{$loop->index}"){{ $tag }}@endMarker('output', "3ffbaf01-{$loop->index}-{$loop->index}")</span>
                                @endforeach
                            </div>
                        @endif
                        @endMarker('reactive', "5c1d8559-{$loop->index}")
                    </li>
                @endforeach
                @endMarker('reactive', 'cbf33dd6')
            </ul>
        @endif
        @endMarker('reactive', '6c1b628b')
    </div>
    {{-- for --}}
    <div @class([$__VIEW_ID__ . '-3c2aeb7e', 'for-loop'])>
        <h2 @class([$__VIEW_ID__ . '-93e3f970'])>Inventory (For Loop Demo)</h2>
        <ul @class([$__VIEW_ID__ . '-073fbc1b'])>
            @startMarker('reactive', '3ea87d0d', ['stateKey' => ['inventory'], 'type' => 'for'])
            @for($i = 0; $i < count($inventory); $i++)
                <li @class([$__VIEW_ID__ . "-44293bc7-{$i}"])>
                    @startMarker('output', "88a7713e-{$i}"){{ $inventory[$i]->name }}@endMarker('output', "88a7713e-{$i}") - $@startMarker('output', "da4f77c1-{$i}"){{ $inventory[$i]->price }}@endMarker('output', "da4f77c1-{$i}")
                    @startMarker('reactive', "e04813ce-{$i}", ['stateKey' => ['inventory'], 'type' => 'if'])
                    @if($inventory[$i]->tags && count($inventory[$i]->tags) > 0)
                        <div @class([$__VIEW_ID__ . "-171b943a-{$i}", 'tags'])>
                            @startMarker('reactive', "87621184-{$i}", ['stateKey' => ['inventory'], 'type' => 'for'])
                            @for($j = 0; $j < count($inventory[$i]->tags); $j++)
                                <span @class([$__VIEW_ID__ . "-8184c7f7-{$i}-{$j}", 'tag'])>@startMarker('output', "acfd5bfd-{$i}-{$j}"){{ $inventory[$i]->tags[$j] }}@endMarker('output', "acfd5bfd-{$i}-{$j}")</span>
                            @endfor
                            @endMarker('reactive', "87621184-{$i}")
                        </div>
                    @endif
                    @endMarker('reactive', "e04813ce-{$i}")
                </li>
            @endfor
            @endMarker('reactive', '3ea87d0d')
        </ul>
    </div>
    {{-- while --}}
    <div @class([$__VIEW_ID__ . '-f6964623', 'while-loop'])>
        <h2 @class([$__VIEW_ID__ . '-16850172'])>Catalog (While Loop Demo)</h2>
        <ul @class([$__VIEW_ID__ . '-dd6923de'])>
            @for($i = 0; $i < $MAX_COUNT; $i++)
                @startMarker('reactive', "224ef3d8-{$i}", ['stateKey' => ['catalog'], 'type' => 'if'])
                @if($i >= count($catalog))
                    @break
                @endif
                @endMarker('reactive', "224ef3d8-{$i}")
                <li @class([$__VIEW_ID__ . "-11279227-{$i}"])>
                    @startMarker('output', "f95db8df-{$i}"){{ $catalog[$i]->name }}@endMarker('output', "f95db8df-{$i}") - $@startMarker('output', "2fa1fe3e-{$i}"){{ $catalog[$i]->price }}@endMarker('output', "2fa1fe3e-{$i}")
                    @startMarker('reactive', "dd829808-{$i}", ['stateKey' => ['catalog'], 'type' => 'if'])
                    @if($catalog[$i]->tags && count($catalog[$i]->tags) > 0)
                        <div @class([$__VIEW_ID__ . "-1aa7593b-{$i}", 'tags'])>
                            @startMarker('reactive', "3c930e17-{$i}", ['stateKey' => ['catalog'], 'type' => 'for'])
                            @for($j = 0; $j < count($catalog[$i]->tags); $j++)
                                <span @class([$__VIEW_ID__ . "-b5b8a19f-{$i}-{$j}", 'tag'])>@startMarker('output', "41c63ad1-{$i}-{$j}"){{ $catalog[$i]->tags[$j] }}@endMarker('output', "41c63ad1-{$i}-{$j}")</span>
                            @endfor
                            @endMarker('reactive', "3c930e17-{$i}")
                        </div>
                    @endif
                    @endMarker('reactive', "dd829808-{$i}")
                </li>
            @endfor
        </ul>
        @exec($n = 0)
        <h3 @class([$__VIEW_ID__ . '-098c0117'])>While Loop Example</h3>
        <ul @class([$__VIEW_ID__ . '-03dc9e8b'])>
            @startMarker('while', '292d3fbb', ['start' => $n])
            @while($n < $MAX_COUNT)
                <li @class([$__VIEW_ID__ . "-62fd1c37-{$n}"])>
                    Item #@startMarker('output', "effacc62-{$n}"){{ $n + 1 }}@endMarker('output', "effacc62-{$n}")
                </li>
                @exec($n++)
            @endwhile
            @endMarker('while', '292d3fbb')
        </ul>
    </div>
    @startMarker('component', '68594f9a')
    @include('esamples/partial.sao', ['data'=> $products])
    @endMarker('component', '68594f9a')
    {{-- Level 1: @if block --}}
@endWrapper
