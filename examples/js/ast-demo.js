import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.ast-demo';
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



class AstDemoViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class AstDemoView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, AstDemoViewController);
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
        let {test = "test", test1 = "test1"} = __data__;
        __STATE__.__.register('test', test);
        __STATE__.__.register('test1', test1);
        __UPDATE_DATA_TRAIT__.test = value => { test = value; updateStateByKey('test', value); };
        __UPDATE_DATA_TRAIT__.test1 = value => { test1 = value; updateStateByKey('test1', value); };
        const __VARIABLE_LIST__ = ["test", "test1"];


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
            this.html(`d69e6b1d`, "div", parentElement,
                { classes: [{ type: 'static', value: "ast-demo" }] },
                (parentElement) => [
                this.html(`e4a2aaaf`, "p", parentElement, {}, (parentElement) => [
                    this.output(`ff7c5797`, parentElement, true, ["test"], (parentElement) => test)
                ]),
                this.html(`96323a6c`, "p", parentElement, {}, (parentElement) => [
                    this.output(`4ed23a9a`, parentElement, true, ["test1"], (parentElement) => test1)
                ]),
                this.include(`64cf91d6`, __template__+'ast1', parentElement, [], (parentElement) => ({
                        __ONE_CHILDREN_CONTENT__: (parentElement) => [
                        this.include(`ac3059ef`, __template__+'ast2', parentElement, [], (parentElement) => ({})),
                        this.include(`527115c9`, __template__+'ast3', parentElement, [], (parentElement) => ({}))
                    ]
                    }))
                ])
            ]);
            }
        });

    }
}

// Export factory function
export function AstDemo(__data__ = {}, systemData = {}) {
    return new AstDemoView(__data__, systemData);
}
export default AstDemo;
