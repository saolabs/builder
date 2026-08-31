import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.home';
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



class HomeViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class HomeView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, HomeViewController);
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
        const __VARIABLE_LIST__ = [];


        this.__ctrl__.setUserDefinedConfig({

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
            commitConstructorData: function() {
                // Then update states from data

                // Finally lock state updates

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
            this.include(`68594f9a`, __template__+'sessions.tasks', parentElement, [], (parentElement) => ({
                    __ONE_CHILDREN_CONTENT__: (parentElement) => [
                    this.include(`fa6abab0`, __template__+'demo.fetch', parentElement, [], (parentElement) => ({"users": users}))
                ]
                })),
            this.include(`cdc4fc98`, __template__+'sessions.tasks', parentElement, [], (parentElement) => ({"title": "Custom Task List"})),
            this.include(`e0f18838`, __template__+'sessions.projects', parentElement, [], (parentElement) => ({
                    "projects": projects,
                    __ONE_CHILDREN_CONTENT__: (parentElement) => [
                    this.html(`b18fe9d7`, "div", parentElement,
                        { classes: [{ type: 'static', value: "header" }] },
                        (parentElement) => [
                        this.html(`1c77c20b`, "h2", parentElement, {}, (parentElement) => [
                            this.text('My Projects')
                        ])
                        ]),
                    this.html(`fe28a62f`, "div", parentElement,
                        { classes: [{ type: 'static', value: "footer" }] },
                        (parentElement) => [
                        this.html(`c9f0c18f`, "p", parentElement, {}, (parentElement) => [
                            this.text('Total Projects: '),
                            this.output(`0f81d2b8`, parentElement, true, [], (parentElement) => App.Helper.count(projects))
                        ])
                        ]),
                    this.include(`4aac35d9`, __template__+'sessions.tasks', parentElement, [], (parentElement) => ({
                            "owners": ["Alice", "Bob"],
                            __ONE_CHILDREN_CONTENT__: (parentElement) => [
                            this.html(`727ca7d7`, "div", parentElement,
                                { classes: [{ type: 'static', value: "header" }] },
                                (parentElement) => [
                                this.html(`8a745b38`, "h3", parentElement, {}, (parentElement) => [
                                    this.text('Task Owners')
                                ])
                                ]),
                            this.include(`f02a36c3`, __template__+'demo.fetch', parentElement, [], (parentElement) => ({"users": users}))
                        ]
                        }))
                ]
                })),
            this.include(`712094c8`, 'sessions.tasks.count', parentElement, [], (parentElement) => ({})),
            this.include(`0aed4ae2`, __template__+'demo.fetch', parentElement, [], (parentElement) => ({})),
            this.include(`f06e1819`, __blade_custom_path__, parentElement, [], (parentElement) => ({"type": "success", "message": "This is a custom alert component!"}))
            ]);
            }
        });

    }
}

// Export factory function
export function Home(__data__ = {}, systemData = {}) {
    return new HomeView(__data__, systemData);
}
export default Home;
