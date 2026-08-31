import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.await-dynamic';
const __VIEW_NAMESPACE__ = 'examples.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: false,
    viewType: 'view',
    sections: {},
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: true,
    hasFetchData: false,
    usesVars: true,
    hasSections: false,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: [],
    renderSections: [],
    prerenderSections: []
};



class AwaitDynamicViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class AwaitDynamicView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, AwaitDynamicViewController);
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
        let {users = null, posts = []} = __data__;
        __STATE__.__.register('users', users);
        __STATE__.__.register('posts', posts);
        __UPDATE_DATA_TRAIT__.users = value => { users = value; updateStateByKey('users', value); };
        __UPDATE_DATA_TRAIT__.posts = value => { posts = value; updateStateByKey('posts', value); };
        const __VARIABLE_LIST__ = ["users", "posts"];


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
            this.html(`d69e6b1d`, "div", parentElement, {}, (parentElement) => [
                this.reactive(`8304c314`, "if", parentReactive, parentElement, [], (parentReactive, parentElement) => {
                    const reactiveContents = [];
                    if (user) {
                        reactiveContents.push(
                        this.html(`3a671613`, "h1", parentElement, {}, (parentElement) => [
                            this.text('Welcome '),
                            this.output(`c50431c8`, parentElement, true, [], (parentElement) => user.name)
                        ]),
                        this.__foreach(postList, (post, __loopKey, __loopIndex, __loop) => [
                                this.html(`ac013aeb-${__loopIndex + 1}`, "div", parentElement, {}, (parentElement) => [
                                    this.output(`33b75e1c-${__loopIndex + 1}`, parentElement, true, [], (parentElement) => post.title)
                                ])
                        ])
                        );
                    }
                    else {
                        reactiveContents.push(
                        this.html(`f08cfbae`, "p", parentElement, {}, (parentElement) => [
                            this.text('Please login first')
                        ])
                        );
                    }
                    return reactiveContents;
                })
            ]),
            this.html(`eced4db6`, "div", parentElement, {}, (parentElement) => [
                this.html(`c480ac03`, "button", parentElement,
                    { events: { click: [{"handler":"doAction","params":["login"]}] } },
                    (parentElement) => [
                    this.text('Login')
                    ]),
                this.html(`300dfb10`, "button", parentElement,
                    { events: { click: [{"handler":"doAction","params":["fetchPosts"]}] } },
                    (parentElement) => [
                    this.text('Fetch Posts')
                    ])
            ])
            ]);
            }
        });

    }
}

// Export factory function
export function AwaitDynamic(__data__ = {}, systemData = {}) {
    return new AwaitDynamicView(__data__, systemData);
}
export default AwaitDynamic;
