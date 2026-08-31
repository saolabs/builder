import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.fetch-beatiful';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: true,
    viewType: 'view',
    sections: {
        "meta:title":{
            "type":"short",
            "preloader":false,
            "useVars":false,
            "script":{}
        },
        "content":{
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
    renderLongSections: ["content"],
    renderSections: [],
    prerenderSections: []
};



class FetchBeatifulViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class FetchBeatifulView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, FetchBeatifulViewController);
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
        const set$isLoading = __STATE__.__.register('isLoading');
        let isLoading = null;
        const setIsLoading = (state) => {
            isLoading = state;
            set$isLoading(state);
        };
        __STATE__.__.setters.setIsLoading = setIsLoading;
        __STATE__.__.setters.isLoading = setIsLoading;
        const update$isLoading = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('isLoading', value);
                isLoading = value;
            }
        };
        const set$error = __STATE__.__.register('error');
        let error = null;
        const setError = (state) => {
            error = state;
            set$error(state);
        };
        __STATE__.__.setters.setError = setError;
        __STATE__.__.setters.error = setError;
        const update$error = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('error', value);
                error = value;
            }
        };
        const __VARIABLE_LIST__ = [];


        this.__ctrl__.setUserDefinedConfig({
            async init() {
                    try {
                        const response = await this.App.Http.get('https://jsonplaceholder.typicode.com/users');
                        if (response && Array.isArray(response.data)) {
                            setUsers(response.data);
                        } else {
                            setError('Invalid data format received.');
                        }
                    } catch (err) {
                        setError(err.message || 'Error fetching users.');
                    } finally {
                        setIsLoading(false);
                    }
                }
        });

        this.__ctrl__.setup({
            superView: `${__layout__+'base'}`,
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
                update$isLoading(true);
                update$error(null);
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
            this.section('meta:title', { type: 'static', contentType: 'text', stateKeys: [] }, () => 'Demo Fetch Users');
            this.block('block-content', 'content', (parentElement) => [
            this.html(`e085b222`, "div", parentElement,
                { classes: [{ type: 'static', value: "container" }, { type: 'static', value: "py-5" }] },
                (parentElement) => [
                this.html(`06fe9377`, "h1", parentElement,
                    { classes: [{ type: 'static', value: "mb-4" }] },
                    (parentElement) => [
                    this.text('Fetch Users Demo')
                    ]),
                this.reactive(`97d74020`, "if", parentReactive, parentElement, ["error", "isLoading", "users"], (parentReactive, parentElement) => {
                    const reactiveContents = [];
                    if (isLoading) {
                        reactiveContents.push(
                        this.html(`44e075bd`, "div", parentElement,
                            { classes: [{ type: 'static', value: "alert" }, { type: 'static', value: "alert-info" }] },
                            (parentElement) => [
                            this.text('Đang tải users...')
                            ])
                        );
                    }
                    else if (error) {
                        reactiveContents.push(
                        this.html(`b8e33ef9`, "div", parentElement,
                            { classes: [{ type: 'static', value: "alert" }, { type: 'static', value: "alert-danger" }] },
                            (parentElement) => [
                            this.text('Error: '),
                            this.output(`f4f15243`, parentElement, true, ["error"], (parentElement) => error)
                            ])
                        );
                    }
                    else if (!users || App.Helper.count(users) === 0) {
                        reactiveContents.push(
                        this.html(`55ff6a50`, "div", parentElement,
                            { classes: [{ type: 'static', value: "alert" }, { type: 'static', value: "alert-danger" }] },
                            (parentElement) => [
                            this.text('Error không có users')
                            ])
                        );
                    }
                    else {
                        reactiveContents.push(
                        this.reactive(`93adb396`, "foreach", parentReactive, parentElement, ["users"], (parentReactive, parentElement) => {
                            return this.__foreach(users, (user, __loopKey, __loopIndex, __loop) => [
                                this.html(`0ca9f865-${__loopIndex + 1}`, "div", parentElement,
                                    { classes: [{ type: 'static', value: "user-card" }, { type: 'static', value: "mb-3" }, { type: 'static', value: "p-3" }, { type: 'static', value: "border" }, { type: 'static', value: "rounded" }] },
                                    (parentElement) => [
                                    this.html(`6f51958c-${__loopIndex + 1}`, "h6", parentElement, {}, (parentElement) => [
                                        this.output(`a25a5270-${__loopIndex + 1}`, parentElement, true, [], (parentElement) => user.name)
                                    ]),
                                    this.html(`fc55c64f-${__loopIndex + 1}`, "p", parentElement,
                                        { classes: [{ type: 'static', value: "mb-1" }] },
                                        (parentElement) => [
                                        this.output(`b266bc52-${__loopIndex + 1}`, parentElement, true, [], (parentElement) => user.email)
                                        ]),
                                    this.html(`ca9dc9a1-${__loopIndex + 1}`, "small", parentElement,
                                        { classes: [{ type: 'static', value: "text-muted" }] },
                                        (parentElement) => [
                                        this.output(`4ab011e3-${__loopIndex + 1}`, parentElement, true, [], (parentElement) => user.company.name)
                                        ])
                                    ])
                            ])
                        })
                        );
                    }
                    return reactiveContents;
                })
                ])
            ]);
            this.superViewPath = `${__layout__+'base'}`;
            return this.extendView(this.superViewPath, {});
            }
        });

    }
}

// Export factory function
export function FetchBeatiful(__data__ = {}, systemData = {}) {
    return new FetchBeatifulView(__data__, systemData);
}
export default FetchBeatiful;
