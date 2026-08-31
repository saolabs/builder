@exec($__ONE_COMPONENT_REGISTRY__ = []) {{-- Khai báo để sử dụng các component đã đăng ký trong $__ONE_COMPONENT_REGISTRY__ --}}

@vars($users = [])
@const([$todos, $setTodos] = useState([]))
@const([$newTodo, $setNewTodo] = useState(''))
@const([$todoIndex, $setTodoIndex] = useState(0))
@wrapper
@await
<div @class([$__VIEW_ID__ . '-d69e6b1d', 'col-lg-6', 'mb-4']) @attr(['data-category' => 'basic forms'])>
        <div @class([$__VIEW_ID__ . '-6add9c13', 'example-card'])>
            <div @class([$__VIEW_ID__ . '-1ae5e1b9', 'example-header'])>
                <h3 @class([$__VIEW_ID__ . '-77c3ed9f'])>Todo List</h3>
                <div @class([$__VIEW_ID__ . '-cabd5a56', 'example-tags'])>
                    <span @class([$__VIEW_ID__ . '-9b0fa796', 'tag', 'tag-basic'])>Basic</span>
                    <span @class([$__VIEW_ID__ . '-466b2070', 'tag', 'tag-forms'])>Forms</span>
                    <span @class([$__VIEW_ID__ . '-6673d7ae', 'tag', 'tag-list'])>Lists</span>
                </div>
            </div>

            <div @class([$__VIEW_ID__ . '-83c8d08a', 'example-description'])>
                <p @class([$__VIEW_ID__ . '-d0080f1b'])>Interactive todo list with add, toggle, and delete functionality.</p>
            </div>

            <div @class([$__VIEW_ID__ . '-2508bdea', 'example-demo'])>
                <div @class([$__VIEW_ID__ . '-bbe4ff8b', 'demo-container']) @attr(['id' => 'todo-demo'])>
                    <div @class([$__VIEW_ID__ . '-82a06ccf', 'todo-app'])>
                        <div @class([$__VIEW_ID__ . '-ac52b657', 'input-group', 'mb-3'])>
                            <input @class([$__VIEW_ID__ . '-aa5f582b', 'form-control']) @attr(['type' => 'text', 'id' => 'todo-input', 'placeholder' => 'Add new todo...']) @bind($newTodo)>
                            <button @class([$__VIEW_ID__ . '-f9abb587', 'btn', 'btn-primary'])>Add</button>
                        </div>
                        <ul @class([$__VIEW_ID__ . '-4611f5bf', 'list-unstyled']) @attr(['id' => 'todo-list'])>
                            @startMarker('reactive', '1b9d8409', ['stateKey' => ['todos'], 'type' => 'foreach'])
                            @foreach($todos as $todo)
                                <li @class([$__VIEW_ID__ . "-cfcc0d01-{$loop->index}", 'todo-item', '{{', '$todo->completed', '?', ''completed'', ':', '''', '}}'])>
                                    <input @class([$__VIEW_ID__ . "-1c9bd3d5-{$loop->index}"]) @attr(['type' => 'checkbox']) @checked($todo->completed)>
                                    @startMarker('output', "a5cbb2ad-{$loop->index}"){{ $todo->text }}@endMarker('output', "a5cbb2ad-{$loop->index}")
                                    <button @class([$__VIEW_ID__ . "-57d15225-{$loop->index}", 'btn', 'btn-sm', 'btn-outline-danger'])>×</button>
                                </li>
                            @endforeach
                            @endMarker('reactive', '1b9d8409')

                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endWrapper
