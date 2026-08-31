import { View, ViewController, app, Application } from '@saolabs/client';

import {_} from 'saola';



const __VIEW_PATH__ = 'examples.demo-ast';
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



class DemoAstViewController extends ViewController {
    constructor(view: View) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this as any).setStaticConfig === 'function') {
            (this as any).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this as any).config = __VIEW_CONFIG__;
        }
    }
}

class DemoAstView extends View {
    constructor(__data__: any = {}, systemData: any = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, DemoAstViewController);
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
        let name = 'John Doe';
        const __VARIABLE_LIST__: any = [];


        this.__ctrl__.setUserDefinedConfig({
            name: 'DemoAst',

                doAction(action: string) {
                    if (action === 'login') {
                        alert('Login action triggered!');
                    } else if (action === 'fetchPosts') {
                        alert('Fetch Posts action triggered!');
                    }
                },

                mounting() {
                    console.log('DemoAst component mounted');
                },

                mounted() {
                    console.log('DemoAst component fully mounted');
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

                // Finally lock state updates

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
            return this.wrapper((parentElement: any) => {
            const __execArr = [];
                let a = 10; let b = 20; let c = a + b;
                __execArr.push(
                    this.html(`d69e6b1d`, "div", parentElement, {}, (parentElement: any) => [
                        this.html(`e4a2aaaf`, "p", parentElement, {}, (parentElement: any) => [
                            this.text('Value of a: '),
                            this.output(`ff7c5797`, parentElement, true, [], (parentElement: any) => a)
                        ]),
                        this.html(`96323a6c`, "p", parentElement, {}, (parentElement: any) => [
                            this.text('Value of b: '),
                            this.output(`4ed23a9a`, parentElement, true, [], (parentElement: any) => b)
                        ]),
                        this.html(`7d4b4366`, "p", parentElement, {}, (parentElement: any) => [
                            this.text('Value of c (a + b): '),
                            this.output(`7ca907d2`, parentElement, true, [], (parentElement: any) => c)
                        ])
                    ])
                );
                __execArr.push(
                    this.html(`eced4db6`, "div", parentElement, {},
                        (parentElement: any) => {
                            const __execArr = [];
                            let email = 'Jane Smith'; let age = 30;
                            __execArr.push(
                                this.html(`04230c5b`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('Name: '),
                                    this.output(`2b4809b2`, parentElement, true, [], (parentElement: any) => name)
                                ])
                            );
                            __execArr.push(
                                this.html(`8d2ed3cb`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('Email: '),
                                    this.output(`cb8ca079`, parentElement, true, [], (parentElement: any) => email)
                                ])
                            );
                            __execArr.push(
                                this.html(`a37650dc`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('Age: '),
                                    this.output(`73d53b35`, parentElement, true, [], (parentElement: any) => age)
                                ])
                            );
                            return __execArr;
                        })
                );
                __execArr.push(
                    this.include(`68594f9a`, __template__+'sessions.tasks', parentElement, [], (parentElement: any) => ({
                            __ONE_CHILDREN_CONTENT__: (parentElement: any) => [
                            this.include(`fa6abab0`, __template__+'demo.fetch', parentElement, [], (parentElement: any) => ({"users": users}))
                        ]
                        }))
                );
                __execArr.push(
                    this.include(`cdc4fc98`, __template__+'sessions.tasks', parentElement, [], (parentElement: any) => ({"title": "Custom Task List"}))
                );
                __execArr.push(
                    this.include(`e0f18838`, __template__+'sessions.projects', parentElement, [], (parentElement: any) => ({
                            "projects": projects,
                            __ONE_CHILDREN_CONTENT__: (parentElement: any) => [
                            this.html(`b18fe9d7`, "div", parentElement,
                                { classes: [{ type: 'static', value: "header" }] },
                                (parentElement: any) => [
                                this.html(`1c77c20b`, "h2", parentElement, {}, (parentElement: any) => [
                                    this.text('My Projects '),
                                    this.reactive(`6e3435ab`, "if", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                        const reactiveContents = [];
                                        let t: any;
                                        if (!(t = App.Helper.count(projects))) {
                                            reactiveContents.push(
                                            this.text(' Rỗng ')
                                            );
                                        }
                                        else {
                                            reactiveContents.push(
                                            this.text(' ('),
                                            this.output(`a48680dc`, parentElement, true, [], (parentElement: any) => t),
                                            this.text(') ')
                                            );
                                        }
                                        return reactiveContents;
                                    })
                                ])
                                ]),
                            this.html(`fe28a62f`, "div", parentElement,
                                { classes: [{ type: 'static', value: "footer" }] },
                                (parentElement: any) => [
                                this.html(`c9f0c18f`, "p", parentElement, {}, (parentElement: any) => [
                                    this.text('Total Projects: '),
                                    this.output(`0f81d2b8`, parentElement, true, [], (parentElement: any) => App.Helper.count(projects))
                                ])
                                ]),
                            this.include(`4aac35d9`, __template__+'sessions.tasks', parentElement, [], (parentElement: any) => ({
                                    "owners": ["Alice", "Bob"],
                                    __ONE_CHILDREN_CONTENT__: (parentElement: any) => [
                                    this.html(`727ca7d7`, "div", parentElement,
                                        { classes: [{ type: 'static', value: "header" }] },
                                        (parentElement: any) => {
                                            const __execArr = [];
                                            __execArr.push(
                                                this.html(`8a745b38`, "h3", parentElement, {}, (parentElement: any) => [
                                                    this.text('Task Owners')
                                                ])
                                            );
                                            __execArr.push(
                                                this.html(`87be49e9`, "p", parentElement, {}, (parentElement: any) => [
                                                    this.output(`c6fff7a4`, parentElement, true, [], (parentElement: any) => content)
                                                ])
                                            );
                                            let test = 'Hello World';
                                            __execArr.push(
                                                this.__foreach(posts, (post: any, __loopKey: any, __loopIndex: any, __loop: any) => {
                                                    const __execArr = [];
                                                    __execArr.push(
                                                        this.html(`95b8e5df-${__loopIndex + 1}`, "p", parentElement, {}, (parentElement: any) => [
                                                            this.output(`fdc458ea-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => content)
                                                        ])
                                                    );
                                                    let content = 'This is a test';
                                                    __execArr.push(
                                                        this.html(`b36f132d-${__loopIndex + 1}`, "p", parentElement, {}, (parentElement: any) => [
                                                            this.output(`a3056b3f-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => post.title),
                                                            this.text(': '),
                                                            this.output(`1425822f-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => post.content),
                                                            this.text(' '),
                                                            this.output(`6bc4e3ef-${__loopIndex + 1}`, parentElement, true, [], (parentElement: any) => content)
                                                        ])
                                                    );
                                                    return __execArr;
                                                })
                                            );
                                            return __execArr;
                                        }),
                                    this.html(`7cbd68c8`, "p", parentElement, {}, (parentElement: any) => [
                                        this.output(`17e16670`, parentElement, true, [], (parentElement: any) => content)
                                    ]),
                                    this.include(`f02a36c3`, __template__+'demo.fetch', parentElement, [], (parentElement: any) => ({"users": users})),
                                    this.reactive(`59eeb50a`, "if", parentReactive, parentElement, [], (parentReactive: any, parentElement: any) => {
                                        const reactiveContents = [];
                                        let person: any;
                                        if (!(person = App.Helper.getPerson())) {
                                            reactiveContents.push(
                                            this.html(`6559f3b5`, "p", parentElement, {}, (parentElement: any) => [
                                                this.text('No person found.')
                                            ])
                                            );
                                        }
                                        else {
                                            reactiveContents.push(
                                            this.html(`b9d01ee9`, "p", parentElement, {}, (parentElement: any) => [
                                                this.text('Person found: '),
                                                this.output(`9bf8f93c`, parentElement, true, [], (parentElement: any) => person.name)
                                            ])
                                            );
                                        }
                                        return reactiveContents;
                                    })
                                ]
                                }))
                        ]
                        }))
                );
                __execArr.push(
                    this.include(`712094c8`, 'sessions.tasks.count', parentElement, [], (parentElement: any) => ({}))
                );
                __execArr.push(
                    this.include(`0aed4ae2`, __template__+'demo.fetch', parentElement, [], (parentElement: any) => ({}))
                );
                __execArr.push(
                    this.include(`f06e1819`, __blade_custom_path__, parentElement, [], (parentElement: any) => ({"type": "success", "message": "This is a custom alert component!"}))
                );
            return __execArr;
            });
            }
        });

    }
}

// Export factory function
export function DemoAst(__data__ = {}, systemData = {}): DemoAstView {
    return new DemoAstView(__data__, systemData);
}
export default DemoAst;
