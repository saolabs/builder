import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.test-yield-page';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: true,
    viewType: 'view',
    sections: {
        "title":{
            "type":"long",
            "preloader":false,
            "useVars":true,
            "script":{}
        },
        "nav":{
            "type":"long",
            "preloader":false,
            "useVars":false,
            "script":{}
        },
        "content":{
            "type":"long",
            "preloader":false,
            "useVars":true,
            "script":{}
        },
        "footer":{
            "type":"long",
            "preloader":false,
            "useVars":true,
            "script":{}
        }
    },
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: false,
    hasFetchData: false,
    usesVars: false,
    hasSections: true,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: ["title","nav","content","footer"],
    renderSections: [],
    prerenderSections: []
};



class TestYieldPageViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class TestYieldPageView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TestYieldPageViewController);
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
        const set$count = __STATE__.__.register('count');
        let count = null;
        const setCount = (state) => {
            count = state;
            set$count(state);
        };
        __STATE__.__.setters.setCount = setCount;
        __STATE__.__.setters.count = setCount;
        const update$count = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('count', value);
                count = value;
            }
        };
        const set$name = __STATE__.__.register('name');
        let name = null;
        const setName = (state) => {
            name = state;
            set$name(state);
        };
        __STATE__.__.setters.setName = setName;
        __STATE__.__.setters.name = setName;
        const update$name = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('name', value);
                name = value;
            }
        };
        const __VARIABLE_LIST__ = [];


        this.__ctrl__.setUserDefinedConfig({

        });

        this.__ctrl__.setup({
            superView: `${__layout__+'test-yield-layout'}`,
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
                update$count(0);
                update$name('World');
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
            this.block('block-title', 'title', (parentElement) => [
            this.text('Page Title - '),
            this.output(`ee7f8e00`, parentElement, true, ["name"], (parentElement) => name)
            ]);
            this.block('block-nav', 'nav', (parentElement) => [
            this.html(`2627e073`, "a", parentElement,
                { attrs: { "href": { type: 'static', value: "/" } } },
                (parentElement) => [
                this.text('Home')
                ]),
            this.html(`098bef20`, "a", parentElement,
                { attrs: { "href": { type: 'static', value: "/about" } } },
                (parentElement) => [
                this.text('About')
                ])
            ]);
            this.block('block-content', 'content', (parentElement) => [
            this.html(`e085b222`, "div", parentElement,
                { classes: [{ type: 'static', value: "content-area" }] },
                (parentElement) => [
                this.html(`dea81b3e`, "h2", parentElement, {}, (parentElement) => [
                    this.text('Hello, '),
                    this.output(`2ecb12cd`, parentElement, true, ["name"], (parentElement) => name),
                    this.text('!')
                ]),
                this.html(`f0393273`, "p", parentElement, {}, (parentElement) => [
                    this.text('Count: '),
                    this.output(`4a27f886`, parentElement, true, ["count"], (parentElement) => count)
                ]),
                this.html(`21f51b84`, "button", parentElement,
                    { events: { click: [(event) => setCount(count + 1)] } },
                    (parentElement) => [
                    this.text('Increment')
                    ])
                ])
            ]);
            this.block('block-footer', 'footer', (parentElement) => [
            this.html(`cd16ec4a`, "p", parentElement, {}, (parentElement) => [
                this.text('Custom Footer for '),
                this.output(`8cfe315a`, parentElement, true, ["name"], (parentElement) => name)
            ])
            ]);
            this.superViewPath = `${__layout__+'test-yield-layout'}`;
            return this.extendView(this.superViewPath, {});
            }
        });

    }
}

// Export factory function
export function TestYieldPage(__data__ = {}, systemData = {}) {
    return new TestYieldPageView(__data__, systemData);
}
export default TestYieldPage;
