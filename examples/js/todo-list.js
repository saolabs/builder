import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.todo-list';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: false,
    viewType: 'view',
    sections: {},
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: true,
    hasFetchData: false,
    usesVars: true,
    hasSections: false,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: [],
    renderSections: [],
    prerenderSections: []
};



class TodoListViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class TodoListView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TodoListViewController);
        const App = app("App");
        const __STATE__ = this.__ctrl__.states;
        const {__base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
        const __VIEW_ID__ = __data__.__SSR_VIEW_ID__ || App.View.generateViewId();

        const useState = (value) => {
            return __STATE__.__useState(value);
        };
        const updateRealState = (state) => {
            __STATE__.__.updateRealState(state);
        };

        const lockUpdateRealState = () => {
            __STATE__.__.lockUpdateRealState();
        };
        const updateStateByKey = (key, state) => {
            __STATE__.__.updateStateByKey(key, state);
        };


        const __UPDATE_DATA_TRAIT__ = {};
        let {users = []} = __data__;
        __STATE__.__.register('users', users);
        const set$todos = __STATE__.__.register('todos');
        let todos = null;
        const setTodos = (state) => {
            todos = state;
            set$todos(state);
        };
        __STATE__.__.setters.setTodos = setTodos;
        __STATE__.__.setters.todos = setTodos;
        const update$todos = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('todos', value);
                todos = value;
            }
        };
        const set$newTodo = __STATE__.__.register('newTodo');
        let newTodo = null;
        const setNewTodo = (state) => {
            newTodo = state;
            set$newTodo(state);
        };
        __STATE__.__.setters.setNewTodo = setNewTodo;
        __STATE__.__.setters.newTodo = setNewTodo;
        const update$newTodo = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('newTodo', value);
                newTodo = value;
            }
        };
        const set$todoIndex = __STATE__.__.register('todoIndex');
        let todoIndex = null;
        const setTodoIndex = (state) => {
            todoIndex = state;
            set$todoIndex(state);
        };
        __STATE__.__.setters.setTodoIndex = setTodoIndex;
        __STATE__.__.setters.todoIndex = setTodoIndex;
        const update$todoIndex = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('todoIndex', value);
                todoIndex = value;
            }
        };
        __UPDATE_DATA_TRAIT__.users = value => { users = value; updateStateByKey('users', value); };
        const __VARIABLE_LIST__ = ["users"];


        this.__ctrl__.setUserDefinedConfig({
            addTodo() {
                    if (newTodo.trim()) {
                        const _newTodos = [...todos, {
                            id: todoIndex,
                            text: newTodo,
                            completed: false
                        }];
                        setTodos(_newTodos);
                        setNewTodo('');
                        setTodoIndex(todoIndex + 1);
                    }
                },
                toggleTodo(index) {
                    const updatedTodos = [...todos];
                    updatedTodos[index].completed = !updatedTodos[index].completed;
                    setTodos(updatedTodos);
                },
                deleteTodo(index) {
                    const filteredTodos = todos.filter((_, i) => i !== index);
                    setTodos(filteredTodos);
                },
                addTodoByEnter(event) {
                    if (event.key === 'Enter') {
                        this.addTodo();
                    }
                }
        });

        this.__ctrl__.setup({
            superView: null,
            subscribe: true,
            fetch: null,
            data: __data__,
            viewId: __VIEW_ID__,
            path: __VIEW_PATH__,
            scripts: [],
            styles: [{"type":"code","content":".todo-item {\n        display: flex;\n        align-items: center;\n        gap: 0.75rem;\n        padding: 0.75rem;\n        border: 1px solid var(--border-color);\n        border-radius: 0.5rem;\n        margin-bottom: 0.5rem;\n    }\n\n    .todo-item.completed .todo-text {\n        text-decoration: line-through;\n        opacity: 0.6;\n    }"}],
            resources: [],
            commitConstructorData: function() {
                // Then update states from data
                update$todos([]);
                update$newTodo('');
                update$todoIndex(0);
                // Finally lock state updates
                lockUpdateRealState();
            },
            updateVariableData: function(data) {
                // Update all variables first
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        // Call updateVariableItemData directly from config
                        if (typeof this.config.updateVariableItemData === 'function') {
                            this.config.updateVariableItemData.call(this, key, data[key]);
                        }
                    }
                }
                // Re-derive CHỈ state phụ thuộc data — state literal của instance KHÔNG reset

                // Finally lock state updates
                lockUpdateRealState();
            },
            updateVariableItemData: function(key, value) {
                this.data[key] = value;
                if (typeof __UPDATE_DATA_TRAIT__[key] === "function") {
                    __UPDATE_DATA_TRAIT__[key](value);
                }
            },
            prerender: function() {
            return null;
            },
            render: function () {
            let parentElement = this.parentElement;
            let parentReactive = null;
            return this.wrapper((parentElement) => [
            this.html(`d69e6b1d`, "div", parentElement,
                { classes: [{ type: 'static', value: "col-lg-6" }, { type: 'static', value: "mb-4" }], attrs: { "data-category": { type: 'static', value: "basic forms" } } },
                (parentElement) => [
                this.html(`6add9c13`, "div", parentElement,
                    { classes: [{ type: 'static', value: "example-card" }] },
                    (parentElement) => [
                    this.html(`1ae5e1b9`, "div", parentElement,
                        { classes: [{ type: 'static', value: "example-header" }] },
                        (parentElement) => [
                        this.html(`77c3ed9f`, "h3", parentElement, {}, (parentElement) => [
                            this.text('Todo List')
                        ]),
                        this.html(`cabd5a56`, "div", parentElement,
                            { classes: [{ type: 'static', value: "example-tags" }] },
                            (parentElement) => [
                            this.html(`9b0fa796`, "span", parentElement,
                                { classes: [{ type: 'static', value: "tag" }, { type: 'static', value: "tag-basic" }] },
                                (parentElement) => [
                                this.text('Basic')
                                ]),
                            this.html(`466b2070`, "span", parentElement,
                                { classes: [{ type: 'static', value: "tag" }, { type: 'static', value: "tag-forms" }] },
                                (parentElement) => [
                                this.text('Forms')
                                ]),
                            this.html(`6673d7ae`, "span", parentElement,
                                { classes: [{ type: 'static', value: "tag" }, { type: 'static', value: "tag-list" }] },
                                (parentElement) => [
                                this.text('Lists')
                                ])
                            ])
                        ]),
                    this.html(`83c8d08a`, "div", parentElement,
                        { classes: [{ type: 'static', value: "example-description" }] },
                        (parentElement) => [
                        this.html(`d0080f1b`, "p", parentElement, {}, (parentElement) => [
                            this.text('Interactive todo list with add, toggle, and delete functionality.')
                        ])
                        ]),
                    this.html(`2508bdea`, "div", parentElement,
                        { classes: [{ type: 'static', value: "example-demo" }] },
                        (parentElement) => [
                        this.html(`bbe4ff8b`, "div", parentElement,
                            { classes: [{ type: 'static', value: "demo-container" }], attrs: { "id": { type: 'static', value: "todo-demo" } } },
                            (parentElement) => [
                            this.html(`82a06ccf`, "div", parentElement,
                                { classes: [{ type: 'static', value: "todo-app" }] },
                                (parentElement) => [
                                this.html(`ac52b657`, "div", parentElement,
                                    { classes: [{ type: 'static', value: "input-group" }, { type: 'static', value: "mb-3" }] },
                                    (parentElement) => [
                                    this.html(`aa5f582b`, "input", parentElement, { classes: [{ type: 'static', value: "form-control" }], attrs: { "type": { type: 'static', value: "text" }, "id": { type: 'static', value: "todo-input" }, "placeholder": { type: 'static', value: "Add new todo..." }, "bind": { type: 'static', value: true }, "newTodo": { type: 'static', value: true } }, events: { keydown: [{"handler":"addTodoByEnter","params":[() => event]}] } }),
                                    this.html(`f9abb587`, "button", parentElement,
                                        { classes: [{ type: 'static', value: "btn" }, { type: 'static', value: "btn-primary" }], events: { click: [{"handler":"addTodo","params":[]}] } },
                                        (parentElement) => [
                                        this.text('Add')
                                        ])
                                    ]),
                                this.html(`4611f5bf`, "ul", parentElement,
                                    { classes: [{ type: 'static', value: "list-unstyled" }], attrs: { "id": { type: 'static', value: "todo-list" } } },
                                    (parentElement) => [
                                    this.reactive(`1b9d8409`, "foreach", parentReactive, parentElement, ["todos"], (parentReactive, parentElement) => {
                                        return this.__foreach(todos, (todo, __loopKey, __loopIndex, __loop) => [
                                            this.html(`cfcc0d01-${__loopIndex + 1}`, "li", parentElement,
                                                { classes: [{ type: 'static', value: "todo-item" }, { type: 'static', value: "{{" }, { type: 'static', value: "$todo->completed" }, { type: 'static', value: "?" }, { type: 'static', value: "'completed'" }, { type: 'static', value: ":" }, { type: 'static', value: "''" }, { type: 'static', value: "}}" }] },
                                                (parentElement) => [
                                                this.html(`1c9bd3d5-${__loopIndex + 1}`, "input", parentElement, { attrs: { "type": { type: 'static', value: "checkbox" } }, props: { "checked": { type: 'binding', factory: () => todo.completed, stateKeys: [] } }, events: { change: [{"handler":"toggleTodo","params":[todo.id]}] } }),
                                                this.output(`a5cbb2ad-${__loopIndex + 1}`, parentElement, true, [], (parentElement) => todo.text),
                                                this.html(`57d15225-${__loopIndex + 1}`, "button", parentElement,
                                                    { classes: [{ type: 'static', value: "btn" }, { type: 'static', value: "btn-sm" }, { type: 'static', value: "btn-outline-danger" }], events: { click: [{"handler":"deleteTodo","params":[todo.id]}] } },
                                                    (parentElement) => [
                                                    this.text('×')
                                                    ])
                                                ])
                                        ])
                                    })
                                    ])
                                ])
                            ])
                        ])
                    ])
                ])
            ]);
            }
        });

    }
}

// Export factory function
export function TodoList(__data__ = {}, systemData = {}) {
    return new TodoListView(__data__, systemData);
}
export default TodoList;
