import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.test-nested-reactive';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: false,
    viewType: 'view',
    sections: {},
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: false,
    hasFetchData: false,
    usesVars: false,
    hasSections: false,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: [],
    renderSections: [],
    prerenderSections: []
};



class TestNestedReactiveViewController extends ViewController {
    constructor(view: View) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this as any).setStaticConfig === 'function') {
            (this as any).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this as any).config = __VIEW_CONFIG__;
        }
    }
}

class TestNestedReactiveView extends View {
    constructor(__data__: any = {}, systemData: any = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TestNestedReactiveViewController);
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
        const set$items = __STATE__.__.register('items');
        let items: any = null;
        const setItems = (state: any) => {
            items = state;
            set$items(state);
        };
        __STATE__.__.setters.setItems = setItems;
        __STATE__.__.setters.items = setItems;
        const update$items = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('items', value);
                items = value;
            }
        };
        const set$status = __STATE__.__.register('status');
        let status: any = null;
        const setStatus = (state: any) => {
            status = state;
            set$status(state);
        };
        __STATE__.__.setters.setStatus = setStatus;
        __STATE__.__.setters.status = setStatus;
        const update$status = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('status', value);
                status = value;
            }
        };
        const set$count = __STATE__.__.register('count');
        let count: any = null;
        const setCount = (state: any) => {
            count = state;
            set$count(state);
        };
        __STATE__.__.setters.setCount = setCount;
        __STATE__.__.setters.count = setCount;
        const update$count = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('count', value);
                count = value;
            }
        };
        const set$showDetails = __STATE__.__.register('showDetails');
        let showDetails: any = null;
        const setShowDetails = (state: any) => {
            showDetails = state;
            set$showDetails(state);
        };
        __STATE__.__.setters.setShowDetails = setShowDetails;
        __STATE__.__.setters.showDetails = setShowDetails;
        const update$showDetails = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('showDetails', value);
                showDetails = value;
            }
        };
        const __VARIABLE_LIST__: any = [];


        this.__ctrl__.setUserDefinedConfig({
            data: {},
                addItem() {
                    setItems([...items, {
                        id: items.length + 1,
                        name: 'New Item',
                        category: 'fruit',
                        price: 5,
                        tags: ['new']
                    }]);
                },
                toggleDetails() {
                    setShowDetails(!showDetails);
                },
                incrementCount() {
                    setCount(count + 1);
                },
                changeStatus(newStatus: string) {
                    setStatus(newStatus);
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
                update$items([{"id": 1, "name": "Apple", "category": "fruit", "price": 2, "tags": ["red", "sweet"]}, {"id": 2, "name": "Carrot", "category": "vegetable", "price": 1, "tags": ['orange']}, {"id": 3, "name": "Banana", "category": "fruit", "price": 3, "tags": ["yellow", "sweet", "tropical"]}, {"id": 4, "name": "Broccoli", "category": "vegetable", "price": 4, "tags": ["green", "healthy"]}]);
                update$status('active');
                update$count(0);
                update$showDetails(true);
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
                { classes: [{ type: 'static', value: "nested-reactive-demo" }] },
                (parentElement: any) => [
                this.html(`9d70118d`, "h2", parentElement, {}, (parentElement: any) => [
                    this.text('Total items: '),
                    this.output(`57d9b60b`, parentElement, true, ["count", "items"], (parentElement: any) => App.Helper.count(items))
                ]),
                this.html(`96323a6c`, "p", parentElement, {}, (parentElement: any) => [
                    this.text('Status: '),
                    this.output(`4ed23a9a`, parentElement, true, ["status"], (parentElement: any) => status)
                ]),
                this.reactive(`8304c314`, "if", parentReactive, parentElement, ["showDetails"], (parentReactive: any, parentElement: any) => {
                    const reactiveContents = [];
                    if (showDetails) {
                        reactiveContents.push(
                        this.html(`c0d851d9`, "div", parentElement,
                            { classes: [{ type: 'static', value: "details-panel" }] },
                            (parentElement: any) => [
                            this.html(`e240b46f`, "h3", parentElement, {}, (parentElement: any) => [
                                this.text('Item Details (count: '),
                                this.output(`a4ea9243`, parentElement, true, ["count"], (parentElement: any) => count),
                                this.text(')')
                            ]),
                            this.reactive(`902f863d`, "foreach", parentReactive, parentElement, ["items"], (parentReactive: any, parentElement: any) => {
                                return this.__foreach(items, (item: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                                    this.html(`b694ec4d-${__loopIndex + 1}`, "div", parentElement,
                                        { classes: [{ type: 'static', value: "item-card" }], attrs: { "data-id": { type: 'binding', value: `${item.id}`, factory: () => `${item.id}`, stateKeys: [] } } },
                                        (parentElement: any) => [
                                        this.html(`09a1f0cb-${__loopIndex + 1}`, "strong", parentElement, {}, (parentElement: any) => [
                                            this.output(`1bbdf8ed-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => item.name)
                                        ]),
                                        this.text(' - $'),
                                        this.output(`02ce1872-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => item.price),
                                        this.reactive(`cd817d05-${__loopIndex + 1}`, "if", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                            const reactiveContents = [];
                                            if (item.price > 2) {
                                                reactiveContents.push(
                                                this.html(`3c490cef-${__loopIndex + 1}`, "span", parentElement,
                                                    { classes: [{ type: 'static', value: "badge" }, { type: 'static', value: "expensive" }] },
                                                    (parentElement: any) => [
                                                    this.text('Expensive')
                                                    ])
                                                );
                                            }
                                            else {
                                                reactiveContents.push(
                                                this.html(`5ba7666b-${__loopIndex + 1}`, "span", parentElement,
                                                    { classes: [{ type: 'static', value: "badge" }, { type: 'static', value: "cheap" }] },
                                                    (parentElement: any) => [
                                                    this.text('Affordable')
                                                    ])
                                                );
                                            }
                                            return reactiveContents;
                                        }),
                                        this.html(`096ac143-${__loopIndex + 1}`, "div", parentElement,
                                            { classes: [{ type: 'static', value: "tags" }] },
                                            (parentElement: any) => [
                                            this.__foreach(item.tags, (tag: any, __loopKey: any, __loopIndex: any, __loop: any) => [
                                                    this.html(`69ab6ad3-${__loopIndex + 1}-${__loopIndex + 1}`, "span", parentElement,
                                                        { classes: [{ type: 'static', value: "tag" }] },
                                                        (parentElement: any) => [
                                                        this.output(`95cfba3f-${__loopIndex + 1}-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => tag)
                                                        ])
                                            ])
                                            ])
                                        ])
                                ])
                            })
                            ])
                        );
                    }
                    else {
                        reactiveContents.push(
                        this.html(`f08cfbae`, "p", parentElement, {}, (parentElement: any) => [
                            this.text('Details hidden. Click to show.')
                        ])
                        );
                    }
                    return reactiveContents;
                }),
                this.reactive(`87da1671`, "switch", parentReactive, parentElement, ["status"], (parentReactive: any, parentElement: any) => {
                    const reactiveContents = [];
                    switch (status) {
                        case 'active':
                            reactiveContents.push(
                            this.html(`17b81f01`, "div", parentElement,
                                { classes: [{ type: 'static', value: "status-active" }] },
                                (parentElement: any) => [
                                this.html(`d566c824`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('System is active')
                                ]),
                                this.reactive(`fecf94b7`, "for", parentReactive, parentElement, ["count"], (parentReactive: any, parentElement: any) => {
                                    return this.__for("increment", 0, count, (__loop: any) => {
                                        let __forOutput = [];
                                        for (let i = 0; i < count; i++) {
                                            __loop.setCurrentTimes(i);
                                            __forOutput.push(
                                            this.html(`c89d0a72-${i}`, "div", parentElement,
                                                { classes: [{ type: 'static', value: "counter-item" }] },
                                                (parentElement: any) => [
                                                this.text('Item #'),
                                                this.output(`2cbe2f68-${i}`, parentElement, true, ["i"], (parentElement: any) => i + 1),
                                                this.reactive(`308be5af-${i}`, "if", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                                    const reactiveContents = [];
                                                    if (i % 2 === 0) {
                                                        reactiveContents.push(
                                                        this.html(`2dbe1b86-${i}`, "span", parentElement, {}, (parentElement: any) => [
                                                            this.text('(even)')
                                                        ])
                                                        );
                                                    }
                                                    else {
                                                        reactiveContents.push(
                                                        this.html(`85813a75-${i}`, "span", parentElement, {}, (parentElement: any) => [
                                                            this.text('(odd)')
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
                            );
                            break;
                        case 'inactive':
                            reactiveContents.push(
                            this.html(`5e0e01f9`, "div", parentElement,
                                { classes: [{ type: 'static', value: "status-inactive" }] },
                                (parentElement: any) => [
                                this.html(`ff6f5732`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('System is inactive')
                                ])
                                ])
                            );
                            break;
                        default:
                            reactiveContents.push(
                            this.html(`e624844c`, "div", parentElement,
                                { classes: [{ type: 'static', value: "status-unknown" }] },
                                (parentElement: any) => [
                                this.html(`a9edb396`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('Unknown status: '),
                                    this.output(`12037c02`, parentElement, true, ["status"], (parentElement: any) => status)
                                ])
                                ])
                            );
                            break;
                    }
                    return reactiveContents;
                }),
                this.html(`6b7c3ec4`, "div", parentElement,
                    { classes: [{ type: 'static', value: "category-groups" }] },
                    (parentElement: any) => [
                    this.reactive(`9e7541ab`, "foreach", parentReactive, parentElement, ["items"], (parentReactive: any, parentElement: any) => {
                        return this.__foreach(items, (item: any, key: any, __loopIndex: any, __loop: any) => [
                            this.html(`a5dc4800-${__loopIndex + 1}`, "div", parentElement,
                                { classes: [{ type: 'static', value: "group" }] },
                                (parentElement: any) => [
                                this.html(`257a304c-${__loopIndex + 1}`, "h4", parentElement, {}, (parentElement: any) => [
                                    this.text('['),
                                    this.output(`9358af9a-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => key),
                                    this.text('] '),
                                    this.output(`20fe2a71-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => item.name),
                                    this.text(' ('),
                                    this.output(`5b06d485-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => item.category),
                                    this.text(')')
                                ]),
                                this.reactive(`be70c31c-${__loopIndex + 1}`, "switch", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                    const reactiveContents = [];
                                    switch (item.category) {
                                        case 'fruit':
                                            reactiveContents.push(
                                            this.html(`6c67bd33-${__loopIndex + 1}`, "span", parentElement,
                                                { classes: [{ type: 'static', value: "icon" }] },
                                                (parentElement: any) => [
                                                this.text('🍎')
                                                ])
                                            );
                                            break;
                                        case 'vegetable':
                                            reactiveContents.push(
                                            this.html(`75a19431-${__loopIndex + 1}`, "span", parentElement,
                                                { classes: [{ type: 'static', value: "icon" }] },
                                                (parentElement: any) => [
                                                this.text('🥦')
                                                ])
                                            );
                                            break;
                                    }
                                    return reactiveContents;
                                }),
                                this.reactive(`6600da4e-${__loopIndex + 1}`, "if", parentReactive, parentElement, ["count"], (parentReactive: any, parentElement: any) => {
                                    const reactiveContents = [];
                                    if (App.Helper.count(item.tags) > 1) {
                                        reactiveContents.push(
                                        this.html(`887408bb-${__loopIndex + 1}`, "ul", parentElement, {}, (parentElement: any) => [
                                            this.__foreach(item.tags, (tag: any, idx: any, __loopIndex: any, __loop: any) => [
                                                    this.html(`51b02d05-${__loopIndex + 1}-${__loopIndex + 1}`, "li", parentElement, {}, (parentElement: any) => [
                                                        this.text('Tag '),
                                                        this.output(`0d1cbbf5-${__loopIndex + 1}-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => idx),
                                                        this.text(': '),
                                                        this.output(`455eb528-${__loopIndex + 1}-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => tag),
                                                        this.reactive(`809bb5e9-${__loopIndex + 1}-${__loopIndex + 1}`, "if", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                                            const reactiveContents = [];
                                                            if (tag === 'sweet') {
                                                                reactiveContents.push(
                                                                this.html(`27607e6e-${__loopIndex + 1}-${__loopIndex + 1}`, "em", parentElement, {}, (parentElement: any) => [
                                                                    this.text(' ← popular!')
                                                                ])
                                                                );
                                                            }
                                                            return reactiveContents;
                                                        })
                                                    ])
                                            ])
                                        ])
                                        );
                                    }
                                    else {
                                        reactiveContents.push(
                                        this.html(`89200765-${__loopIndex + 1}`, "p", parentElement, {}, (parentElement: any) => [
                                            this.text('Only one tag: '),
                                            this.output(`07a1cb6f-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => item.tags[0])
                                        ])
                                        );
                                    }
                                    return reactiveContents;
                                })
                                ])
                        ])
                    })
                    ]),
                this.include(`64cf91d6`, components.item-card, parentElement, ["count", "items"], (parentElement: any) => ({"items": items, "count": count}))
                ])
            ]);
            }
        });

    }
}

// Export factory function
export function TestNestedReactive(__data__ = {}, systemData = {}): TestNestedReactiveView {
    return new TestNestedReactiveView(__data__, systemData);
}
export default TestNestedReactive;
