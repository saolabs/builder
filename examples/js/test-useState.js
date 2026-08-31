import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.test-useState';
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



class TestUseStateViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class TestUseStateView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TestUseStateViewController);
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
        const set$users = __STATE__.__.register('users');
        let users = null;
        const setUsers = (state) => {
            users = state;
            set$users(state);
        };
        __STATE__.__.setters.setUsers = setUsers;
        __STATE__.__.setters.users = setUsers;
        const update$users = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('users', value);
                users = value;
            }
        };
        const set$userList = __STATE__.__.register('userList');
        let userList = null;
        const setUserList = (state) => {
            userList = state;
            set$userList(state);
        };
        __STATE__.__.setters.setUserList = setUserList;
        __STATE__.__.setters.userList = setUserList;
        const update$userList = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('userList', value);
                userList = value;
            }
        };
        const set$loading = __STATE__.__.register('loading');
        let loading = null;
        const setLoading = (state) => {
            loading = state;
            set$loading(state);
        };
        __STATE__.__.setters.setLoading = setLoading;
        __STATE__.__.setters.loading = setLoading;
        const update$loading = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('loading', value);
                loading = value;
            }
        };
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
                update$users([]);
                update$userList([]);
                update$loading(false);
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
                { classes: [{ type: 'static', value: "test" }] },
                (parentElement) => [
                this.html(`9d70118d`, "h2", parentElement, {}, (parentElement) => [
                    this.text('Test '),
                    this.output(`57d9b60b`, parentElement, true, ["users"], (parentElement) => users)
                ])
                ])
            ]);
            }
        });

    }
}

// Export factory function
export function TestUseState(__data__ = {}, systemData = {}) {
    return new TestUseStateView(__data__, systemData);
}
export default TestUseState;
