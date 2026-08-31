import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.test-fetch-dynamic';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: false,
    viewType: 'view',
    sections: {},
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: false,
    hasFetchData: true,
    usesVars: true,
    hasSections: false,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: [],
    renderSections: [],
    prerenderSections: []
};



class TestFetchDynamicViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class TestFetchDynamicView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TestFetchDynamicViewController);
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
        let {items = []} = __data__;
        __STATE__.__.register('items', items);
        __UPDATE_DATA_TRAIT__.items = value => { items = value; updateStateByKey('items', value); };
        const __VARIABLE_LIST__ = ["items"];


        this.__ctrl__.setUserDefinedConfig({

        });

        this.__ctrl__.setup({
            superView: null,
            subscribe: true,
            fetch: {"url": `https://api.example.com/items`, "method": "GET"},
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
            this.html(`d69e6b1d`, "div", parentElement, {}, (parentElement) => [
                this.html(`9d70118d`, "h2", parentElement, {}, (parentElement) => [
                    this.text('Items')
                ]),
                this.reactive(`d3123714`, "foreach", parentReactive, parentElement, ["items"], (parentReactive, parentElement) => {
                    return this.__foreach(items, (item, __loopKey, __loopIndex, __loop) => [
                        this.html(`c88c9722-${__loopIndex + 1}`, "p", parentElement, {}, (parentElement) => [
                            this.output(`bae8de25-${__loopIndex + 1}`, parentElement, true, [], (parentElement) => item.name)
                        ])
                    ])
                })
            ])
            ]);
            }
        });

    }
}

// Export factory function
export function TestFetchDynamic(__data__ = {}, systemData = {}) {
    return new TestFetchDynamicView(__data__, systemData);
}
export default TestFetchDynamic;
