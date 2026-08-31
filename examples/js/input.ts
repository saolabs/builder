import { View, ViewController, app, Application } from '@saolabs/client';

import { ref } from 'saola';



const __VIEW_PATH__ = 'examples.input';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: false,
    viewType: 'view',
    sections: {},
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: false,
    hasFetchData: false,
    usesVars: true,
    hasSections: false,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: [],
    renderSections: [],
    prerenderSections: []
};



class InputViewController extends ViewController {
    constructor(view: View) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this as any).setStaticConfig === 'function') {
            (this as any).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this as any).config = __VIEW_CONFIG__;
        }
    }
}

class InputView extends View {
    constructor(__data__: any = {}, systemData: any = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, InputViewController);
        const App: Application = app("App") as Application;
        const __STATE__ = this.__ctrl__.states;
        const {__base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
        const __VIEW_ID__ = __data__.__SSR_VIEW_ID__ || App.View.generateViewId();

        const useState = (value: any) => {
            return __STATE__.__useState(value);
        };
        const updateRealState = (state: any) => {
            __STATE__.__.updateRealState(state);
        };

        const lockUpdateRealState = () => {
            __STATE__.__.lockUpdateRealState();
        };
        const updateStateByKey = (key: string, state: any) => {
            __STATE__.__.updateStateByKey(key, state);
        };


        const __UPDATE_DATA_TRAIT__: any = {};
        let {users, posts} = __data__;
        __STATE__.__.register('users', users);
        __STATE__.__.register('posts', posts);
        const set$editMode = __STATE__.__.register('editMode');
        let editMode: any = null;
        const setEditMode = (state: any) => {
            editMode = state;
            set$editMode(state);
        };
        __STATE__.__.setters.setEditMode = setEditMode;
        __STATE__.__.setters.editMode = setEditMode;
        const update$editMode = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('editMode', value);
                editMode = value;
            }
        };
        const set$todos = __STATE__.__.register('todos');
        let todos: any = null;
        const setTodos = (state: any) => {
            todos = state;
            set$todos(state);
        };
        __STATE__.__.setters.setTodos = setTodos;
        __STATE__.__.setters.todos = setTodos;
        const update$todos = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('todos', value);
                todos = value;
            }
        };
        const set$newTodo = __STATE__.__.register('newTodo');
        let newTodo: any = null;
        const setNewTodo = (state: any) => {
            newTodo = state;
            set$newTodo(state);
        };
        __STATE__.__.setters.setNewTodo = setNewTodo;
        __STATE__.__.setters.newTodo = setNewTodo;
        const update$newTodo = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('newTodo', value);
                newTodo = value;
            }
        };
        const set$nextTodoIndex = __STATE__.__.register('nextTodoIndex');
        let nextTodoIndex: any = null;
        const setNextTodoIndex = (state: any) => {
            nextTodoIndex = state;
            set$nextTodoIndex(state);
        };
        __STATE__.__.setters.setNextTodoIndex = setNextTodoIndex;
        __STATE__.__.setters.nextTodoIndex = setNextTodoIndex;
        const update$nextTodoIndex = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('nextTodoIndex', value);
                nextTodoIndex = value;
            }
        };
        const set$products = __STATE__.__.register('products');
        let products: any = null;
        const setProducts = (state: any) => {
            products = state;
            set$products(state);
        };
        __STATE__.__.setters.setProducts = setProducts;
        __STATE__.__.setters.products = setProducts;
        const update$products = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('products', value);
                products = value;
            }
        };
        const set$inventory = __STATE__.__.register('inventory');
        let inventory: any = null;
        const setInventory = (state: any) => {
            inventory = state;
            set$inventory(state);
        };
        __STATE__.__.setters.setInventory = setInventory;
        __STATE__.__.setters.inventory = setInventory;
        const update$inventory = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('inventory', value);
                inventory = value;
            }
        };
        const set$catalog = __STATE__.__.register('catalog');
        let catalog: any = null;
        const setCatalog = (state: any) => {
            catalog = state;
            set$catalog(state);
        };
        __STATE__.__.setters.setCatalog = setCatalog;
        __STATE__.__.setters.catalog = setCatalog;
        const update$catalog = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('catalog', value);
                catalog = value;
            }
        };
        const MAX_COUNT = 10;
        let n = 0;
        __UPDATE_DATA_TRAIT__.users = (value: any) => { users = value; updateStateByKey('users', value); };
        __UPDATE_DATA_TRAIT__.posts = (value: any) => { posts = value; updateStateByKey('posts', value); };
        const __VARIABLE_LIST__: any = ["users", "posts"];


        this.__ctrl__.setUserDefinedConfig({
            methods: {
                    handleNewTodoKeyDown(event: KeyboardEvent) {
                        if (event.key === 'Enter') {
                            this.addTodo();
                        }
                    },
                    addTodo() {
                        if (this.newTodo.trim() !== '') {
                            this.todos.push({
                                id: this.nextTodoIndex,
                                task: this.newTodo.trim(),
                                completed: false
                            });
                            this.nextTodoIndex++;
                            this.newTodo = '';
                        }
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
            styles: [],
            resources: [],
            commitConstructorData: function(this: any) {
                // Then update states from data
                update$editMode(false);
                update$todos([{"id": 1, "task": "Buy groceries", "completed": false}, {"id": 2, "task": "Walk the dog", "completed": true}, {"id": 3, "task": "Read a book", "completed": false}]);
                update$newTodo('');
                update$nextTodoIndex(4);
                update$products([{"id": 1, "name": "Apple", "category": "fruit", "price": 2, "tags": ["red", "sweet"]}, {"id": 2, "name": "Carrot", "category": "vegetable", "price": 1, "tags": ['orange']}, {"id": 3, "name": "Banana", "category": "fruit", "price": 3, "tags": ["yellow", "sweet", "tropical"]}, {"id": 4, "name": "Broccoli", "category": "vegetable", "price": 4, "tags": ["green", "healthy"]}]);
                update$inventory([{"id": 1, "name": "Apple", "category": "fruit", "price": 2, "tags": ["red", "sweet"]}, {"id": 2, "name": "Carrot", "category": "vegetable", "price": 1, "tags": ['orange']}, {"id": 3, "name": "Banana", "category": "fruit", "price": 3, "tags": ["yellow", "sweet", "tropical"]}, {"id": 4, "name": "Broccoli", "category": "vegetable", "price": 4, "tags": ["green", "healthy"]}]);
                update$catalog([{"id": 1, "name": "Apple", "category": "fruit", "price": 2, "tags": ["red", "sweet"]}, {"id": 2, "name": "Carrot", "category": "vegetable", "price": 1, "tags": ['orange']}, {"id": 3, "name": "Banana", "category": "fruit", "price": 3, "tags": ["yellow", "sweet", "tropical"]}, {"id": 4, "name": "Broccoli", "category": "vegetable", "price": 4, "tags": ["green", "healthy"]}]);
                // Finally lock state updates
                lockUpdateRealState();
            },
            updateVariableData: function(this: any, data: any) {
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
            updateVariableItemData: function(this: any, key: string, value: any) {
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
            return this.wrapper((parentElement: any) => [
            this.html(`d69e6b1d`, "div", parentElement,
                { classes: [{ type: 'static', value: "input-demo" }] },
                (parentElement: any) => [
                this.html(`9d70118d`, "h2", parentElement, {}, (parentElement: any) => [
                    this.text('Input State Demo')
                ]),
                this.html(`fccc82c8`, "div", parentElement,
                    { classes: [{ type: 'static', value: "users" }] },
                    (parentElement: any) => [
                    this.html(`bb95914d`, "h3", parentElement, {}, (parentElement: any) => [
                        this.text('Users')
                    ]),
                    this.html(`fabeb0e6`, "ul", parentElement, {}, (parentElement: any) => [
                        this.reactive(`feb8d2aa`, "foreach", parentReactive, parentElement, ["users"], (parentReactive: any, parentElement: any) => {
                            return this.__foreach(users, (user: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                                this.html(`51785291-${__loopIndex + 1}`, "li", parentElement, {}, (parentElement: any) => [
                                    this.output(`2eba362a-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => user.name),
                                    this.text(' ('),
                                    this.output(`158fdf32-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => user.email),
                                    this.text(')')
                                ])
                            ])
                        })
                    ])
                    ]),
                this.html(`6b7c3ec4`, "div", parentElement,
                    { classes: [{ type: 'static', value: "posts" }] },
                    (parentElement: any) => [
                    this.html(`3c11cc9f`, "h3", parentElement, {}, (parentElement: any) => [
                        this.text('Posts')
                    ]),
                    this.html(`03a5e96a`, "ul", parentElement, {}, (parentElement: any) => [
                        this.reactive(`ff83d1ec`, "foreach", parentReactive, parentElement, ["posts"], (parentReactive: any, parentElement: any) => {
                            return this.__foreach(posts, (post: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                                this.html(`4f286c4f-${__loopIndex + 1}`, "li", parentElement, {}, (parentElement: any) => [
                                    this.html(`b2511220-${__loopIndex + 1}`, "strong", parentElement, {}, (parentElement: any) => [
                                        this.output(`134a7ae9-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => post.title)
                                    ]),
                                    this.text(': '),
                                    this.output(`90ab339b-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => post.content)
                                ])
                            ])
                        })
                    ])
                    ])
                ]),
            this.html(`eced4db6`, "div", parentElement,
                { classes: [{ type: 'static', value: "todos-demo" }] },
                (parentElement: any) => [
                this.html(`e2fbe38d`, "h2", parentElement, {}, (parentElement: any) => [
                    this.text('Todos')
                ]),
                this.html(`bcf6c3a3`, "ul", parentElement, {}, (parentElement: any) => [
                    this.reactive(`9605f90b`, "foreach", parentReactive, parentElement, ["todos"], (parentReactive: any, parentElement: any) => {
                        return this.__foreach(todos, (todo: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                            this.html(`d8484f9d-${__loopIndex + 1}`, "li", parentElement, {}, (parentElement: any) => [
                                this.html(`9d96460a-${__loopIndex + 1}`, "label", parentElement, {}, (parentElement: any) => [
                                    this.html(`f73b73c3-${__loopIndex + 1}`, "input", parentElement, { attrs: { "type": { type: 'static', value: "checkbox" }, "bind": { type: 'static', value: true }, "todo.completed": { type: 'static', value: true } }, props: { "checked": { type: 'binding', factory: () => todo.completed, stateKeys: [] } } }),
                                    this.output(`22697e74-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => todo.task)
                                ])
                            ])
                        ])
                    })
                ]),
                this.html(`a582380a`, "div", parentElement,
                    { classes: [{ type: 'static', value: "is-edit-mode" }] },
                    (parentElement: any) => [
                    this.html(`f4cf2d24`, "input", parentElement, { attrs: { "type": { type: 'static', value: "text" }, "bind": { type: 'static', value: true }, "newTodo": { type: 'static', value: true }, "placeholder": { type: 'static', value: "Nhập công việc mới" } }, events: { keydown: [{"handler":"handleNewTodoKeyDown","params":[() => event]}] } }),
                    this.html(`fecec939`, "button", parentElement,
                        { events: { click: [{"handler":"addTodo","params":[]}] } },
                        (parentElement: any) => [
                        this.text('+')
                        ])
                    ])
                ]),
            this.html(`559b51aa`, "div", parentElement,
                { classes: [{ type: 'static', value: "products-demo" }] },
                (parentElement: any) => [
                this.html(`b2282b82`, "h2", parentElement, {}, (parentElement: any) => [
                    this.text('Products '),
                    this.output(`4ec44176`, parentElement, true, ["products"], (parentElement: any) => App.Helper.count(products))
                ]),
                this.reactive(`6c1b628b`, "if", parentReactive, parentElement, ["products"], (parentReactive: any, parentElement: any) => {
                    const reactiveContents = [];
                    if (App.Helper.count(products) === 0) {
                        reactiveContents.push(
                        this.html(`6fb21822`, "p", parentElement, {}, (parentElement: any) => [
                            this.text('No products available.')
                        ])
                        );
                    }
                    else {
                        reactiveContents.push(
                        this.html(`e5c6fe78`, "ul", parentElement, {}, (parentElement: any) => [
                            this.reactive(`cbf33dd6`, "foreach", parentReactive, parentElement, ["products"], (parentReactive: any, parentElement: any) => {
                                return this.__foreach(products, (product: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                                    this.html(`f5bde316-${__loopIndex + 1}`, "li", parentElement, {}, (parentElement: any) => [
                                        this.output(`459e9ee4-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => product.name),
                                        this.text(' - $'),
                                        this.output(`783a24e9-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => product.price),
                                        this.reactive(`5c1d8559-${__loopIndex + 1}`, "if", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                            const reactiveContents = [];
                                            if (product.tags && App.Helper.count(product.tags) > 0) {
                                                reactiveContents.push(
                                                this.html(`8b2a29e5-${__loopIndex + 1}`, "div", parentElement,
                                                    { classes: [{ type: 'static', value: "tags" }] },
                                                    (parentElement: any) => [
                                                    this.__foreach(product.tags, (tag: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                                                            this.html(`b82d8442-${__loopIndex + 1}-${__loopIndex + 1}`, "span", parentElement,
                                                                { classes: [{ type: 'static', value: "tag" }] },
                                                                (parentElement: any) => [
                                                                this.output(`3ffbaf01-${__loopIndex + 1}-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => tag)
                                                                ])
                                                    ])
                                                    ])
                                                );
                                            }
                                            return reactiveContents;
                                        })
                                    ])
                                ])
                            })
                        ])
                        );
                    }
                    return reactiveContents;
                })
                ]),
            this.html(`3c2aeb7e`, "div", parentElement,
                { classes: [{ type: 'static', value: "for-loop" }] },
                (parentElement: any) => [
                this.html(`93e3f970`, "h2", parentElement, {}, (parentElement: any) => [
                    this.text('Inventory (For Loop Demo)')
                ]),
                this.html(`073fbc1b`, "ul", parentElement, {}, (parentElement: any) => [
                    this.reactive(`3ea87d0d`, "for", parentReactive, parentElement, ["inventory"], (parentReactive: any, parentElement: any) => {
                        return this.__for("increment", 0, App.Helper.count(inventory), (__loop: any) => {
                            let __forOutput = [];
                            for (let i = 0; i < App.Helper.count(inventory); i++) {
                                __loop.setCurrentTimes(i);
                                __forOutput.push(
                                this.html(`44293bc7-${i}`, "li", parentElement, {}, (parentElement: any) => [
                                    this.output(`88a7713e-${i}`, parentElement, true, ["inventory"], (parentElement: any) => inventory[i].name),
                                    this.text(' - $'),
                                    this.output(`da4f77c1-${i}`, parentElement, true, ["inventory"], (parentElement: any) => inventory[i].price),
                                    this.reactive(`e04813ce-${i}`, "if", parentReactive, parentElement, ["inventory"], (parentReactive: any, parentElement: any) => {
                                        const reactiveContents = [];
                                        if (inventory[i].tags && App.Helper.count(inventory[i].tags) > 0) {
                                            reactiveContents.push(
                                            this.html(`171b943a-${i}`, "div", parentElement,
                                                { classes: [{ type: 'static', value: "tags" }] },
                                                (parentElement: any) => [
                                                this.reactive(`87621184-${i}`, "for", parentReactive, parentElement, ["inventory"], (parentReactive: any, parentElement: any) => {
                                                    return this.__for("increment", 0, App.Helper.count(inventory[i].tags), (__loop: any) => {
                                                        let __forOutput = [];
                                                        for (let j = 0; j < App.Helper.count(inventory[i].tags); j++) {
                                                            __loop.setCurrentTimes(j);
                                                            __forOutput.push(
                                                            this.html(`8184c7f7-${i}-${j}`, "span", parentElement,
                                                                { classes: [{ type: 'static', value: "tag" }] },
                                                                (parentElement: any) => [
                                                                this.output(`acfd5bfd-${i}-${j}`, parentElement, true, ["inventory"], (parentElement: any) => inventory[i].tags[j])
                                                                ])
                                                            );
                                                        }
                                                        return __forOutput;
                                                    })
                                                })
                                                ])
                                            );
                                        }
                                        return reactiveContents;
                                    })
                                ])
                                );
                            }
                            return __forOutput;
                        })
                    })
                ])
                ]),
            this.html(`f6964623`, "div", parentElement,
                { classes: [{ type: 'static', value: "while-loop" }] },
                (parentElement: any) => {
                    const __execArr = [];
                    __execArr.push(
                        this.html(`16850172`, "h2", parentElement, {}, (parentElement: any) => [
                            this.text('Catalog (While Loop Demo)')
                        ])
                    );
                    __execArr.push(
                        this.html(`dd6923de`, "ul", parentElement, {}, (parentElement: any) => [
                            this.__for("increment", 0, MAX_COUNT, (__loop: any) => {
                                    let __forOutput = [];
                                    for (let i = 0; i < MAX_COUNT; i++) {
                                        __loop.setCurrentTimes(i);
                                        __forOutput.push(
                                        this.reactive(`224ef3d8-${i}`, "if", parentReactive, parentElement, ["catalog"], (parentReactive: any, parentElement: any) => {
                                            const reactiveContents = [];
                                            if (i >= App.Helper.count(catalog)) {
                                            }
                                            return reactiveContents;
                                        }),
                                        this.html(`11279227-${i}`, "li", parentElement, {}, (parentElement: any) => [
                                            this.output(`f95db8df-${i}`, parentElement, true, ["catalog"], (parentElement: any) => catalog[i].name),
                                            this.text(' - $'),
                                            this.output(`2fa1fe3e-${i}`, parentElement, true, ["catalog"], (parentElement: any) => catalog[i].price),
                                            this.reactive(`dd829808-${i}`, "if", parentReactive, parentElement, ["catalog"], (parentReactive: any, parentElement: any) => {
                                                const reactiveContents = [];
                                                if (catalog[i].tags && App.Helper.count(catalog[i].tags) > 0) {
                                                    reactiveContents.push(
                                                    this.html(`1aa7593b-${i}`, "div", parentElement,
                                                        { classes: [{ type: 'static', value: "tags" }] },
                                                        (parentElement: any) => [
                                                        this.reactive(`3c930e17-${i}`, "for", parentReactive, parentElement, ["catalog"], (parentReactive: any, parentElement: any) => {
                                                            return this.__for("increment", 0, App.Helper.count(catalog[i].tags), (__loop: any) => {
                                                                let __forOutput = [];
                                                                for (let j = 0; j < App.Helper.count(catalog[i].tags); j++) {
                                                                    __loop.setCurrentTimes(j);
                                                                    __forOutput.push(
                                                                    this.html(`b5b8a19f-${i}-${j}`, "span", parentElement,
                                                                        { classes: [{ type: 'static', value: "tag" }] },
                                                                        (parentElement: any) => [
                                                                        this.output(`41c63ad1-${i}-${j}`, parentElement, true, ["catalog"], (parentElement: any) => catalog[i].tags[j])
                                                                        ])
                                                                    );
                                                                }
                                                                return __forOutput;
                                                            })
                                                        })
                                                        ])
                                                    );
                                                }
                                                return reactiveContents;
                                            })
                                        ])
                                        );
                                    }
                                    return __forOutput;
                                })
                        ])
                    );
                    let n = 0;
                    __execArr.push(
                        this.html(`098c0117`, "h3", parentElement, {}, (parentElement: any) => [
                            this.text('While Loop Example')
                        ])
                    );
                    __execArr.push(
                        this.html(`03dc9e8b`, "ul", parentElement, {}, (parentElement: any) => [
                            this.__while((loopCtx) => {
                                let __whileOutput = [];
                                while (n < MAX_COUNT) {
                                    loopCtx.setCurrentTimes(n);
                                    __whileOutput.push(
                                        this.html(`62fd1c37-${n}`, "li", parentElement, {}, (parentElement: any) => [
                                            this.text('Item #'),
                                            this.output(`effacc62-${n}`, parentElement, true, ["n"], (parentElement: any) => n + 1)
                                        ])
                                    );
                                        n++;
                                }
                                return __whileOutput;
                            })
                        ])
                    );
                    return __execArr;
                }),
            this.include(`68594f9a`, esamples/partial.sao, parentElement, ["products"], (parentElement: any) => ({"data": products}))
            ]);
            }
        });

    }
}

// Export factory function
export function Input(__data__ = {}, systemData = {}): InputView {
    return new InputView(__data__, systemData);
}
export default Input;
