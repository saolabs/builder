import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.counter';
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



class CounterViewController extends ViewController {
    constructor(view: View) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this as any).setStaticConfig === 'function') {
            (this as any).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this as any).config = __VIEW_CONFIG__;
        }
    }
}

class CounterView extends View {
    constructor(__data__: any = {}, systemData: any = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, CounterViewController);
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
        let {a = 0, cProp = 0} = __data__;
        __STATE__.__.register('a', a);
        __STATE__.__.register('cProp', cProp);
        let {b = 0, d = 0} = __data__;
        __STATE__.__.register('b', b);
        __STATE__.__.register('d', d);
        const set$countState = __STATE__.__.register('countState');
        let countState: any = null;
        const setCountState = (state: any) => {
            countState = state;
            set$countState(state);
        };
        __STATE__.__.setters.setCountState = setCountState;
        __STATE__.__.setters.countState = setCountState;
        const update$countState = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('countState', value);
                countState = value;
            }
        };
        const set$eState = __STATE__.__.register('eState');
        let eState: any = null;
        const setEState = (state: any) => {
            eState = state;
            set$eState(state);
        };
        __STATE__.__.setters.setEState = setEState;
        __STATE__.__.setters.eState = setEState;
        const update$eState = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('eState', value);
                eState = value;
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
        let testVar = 'This is a test variable';
        const set$message = __STATE__.__.register('message');
        let message: any = null;
        const setMessage = (state: any) => {
            message = state;
            set$message(state);
        };
        __STATE__.__.setters.setMessage = setMessage;
        __STATE__.__.setters.message = setMessage;
        const update$message = (value: any) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('message', value);
                message = value;
            }
        };
        let textContent = message+' Count is '+count;
        __UPDATE_DATA_TRAIT__.a = (value: any) => { a = value; updateStateByKey('a', value); };
        __UPDATE_DATA_TRAIT__.cProp = (value: any) => { cProp = value; updateStateByKey('cProp', value); };
        __UPDATE_DATA_TRAIT__.b = (value: any) => { b = value; updateStateByKey('b', value); };
        __UPDATE_DATA_TRAIT__.d = (value: any) => { d = value; updateStateByKey('d', value); };
        const __VARIABLE_LIST__: any = ["a", "cProp", "b", "d"];


        this.__ctrl__.setUserDefinedConfig({
            data:{},
                increment() {
                    setCount(count + 1);
                },
                decrement() {
                    setCount(count - 1);
                },
                reset() {
                    setCount(0);
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
            styles: [{"type":"code","scoped":true,"content":".counter-component {\n        text-align: center;\n        margin: 20px 0;\n    }.btn-group {\n        margin-top: 10px;\n    }\n    .btn {\n        margin: 0 5px;\n    }"}],
            resources: [],
            commitConstructorData: function(this: any) {
                // Then update states from data
                update$countState(0);
                update$eState(b);
                update$count(0);
                update$message('Hello, Saola!');
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
                if (data.hasOwnProperty('b')) { update$eState(b); }
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
                { classes: [{ type: 'static', value: "counter-component" }] },
                (parentElement: any) => [
                this.html(`beab9ba1`, "h4", parentElement, {}, (parentElement: any) => [
                    this.text('Count: '),
                    this.html(`1eafe912`, "span", parentElement,
                        { attrs: { "id": { type: 'static', value: "counter-value" }, "data-count": { type: 'binding', value: `${count}`, factory: () => `${count}`, stateKeys: ["count"] } } },
                        (parentElement: any) => [
                        this.output(`5ff3bd35`, parentElement, true, ["count"], (parentElement: any) => count)
                        ])
                ]),
                this.html(`fccc82c8`, "div", parentElement,
                    { classes: [{ type: 'static', value: "btn-group" }] },
                    (parentElement: any) => [
                    this.html(`aa23a7be`, "button", parentElement,
                        { classes: [{ type: 'static', value: "btn" }, { type: 'static', value: "btn-primary" }], events: { click: [{"handler":"decrement","params":[]}] } },
                        (parentElement: any) => [
                        this.text('-')
                        ]),
                    this.html(`9ac7c16c`, "button", parentElement,
                        { classes: [{ type: 'static', value: "btn" }, { type: 'static', value: "btn-primary" }], events: { click: [{"handler":"increment","params":[]}] } },
                        (parentElement: any) => [
                        this.text('+')
                        ]),
                    this.html(`f4cc6573`, "button", parentElement,
                        { classes: [{ type: 'static', value: "btn" }, { type: 'static', value: "btn-primary" }], events: { click: [{"handler":"reset","params":[]}] } },
                        (parentElement: any) => [
                        this.text('Reset')
                        ])
                    ])
                ])
            ]);
            }
        });

    }
}

// Export factory function
export function Counter(__data__ = {}, systemData = {}): CounterView {
    return new CounterView(__data__, systemData);
}
export default Counter;
