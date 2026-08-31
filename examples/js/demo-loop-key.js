import { View, ViewController, app, Application } from '@saolabs/client';


const __VIEW_PATH__ = 'examples.demo-loop-key';
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



class DemoLoopKeyViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this).setStaticConfig === 'function') {
            (this).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this).config = __VIEW_CONFIG__;
        }
    }
}

class DemoLoopKeyView extends View {
    constructor(__data__ = {}, systemData = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, DemoLoopKeyViewController);
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
        let {posts = [], categories = [], postCategories = [], postTags = [], postAuthors = []} = __data__;
        __STATE__.__.register('posts', posts);
        __STATE__.__.register('categories', categories);
        __STATE__.__.register('postCategories', postCategories);
        __STATE__.__.register('postTags', postTags);
        __STATE__.__.register('postAuthors', postAuthors);
        const set$postList = __STATE__.__.register('postList');
        let postList = null;
        const setPostList = (state) => {
            postList = state;
            set$postList(state);
        };
        __STATE__.__.setters.setPostList = setPostList;
        __STATE__.__.setters.postList = setPostList;
        const update$postList = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('postList', value);
                postList = value;
            }
        };
        const set$categoryList = __STATE__.__.register('categoryList');
        let categoryList = null;
        const setCategoryList = (state) => {
            categoryList = state;
            set$categoryList(state);
        };
        __STATE__.__.setters.setCategoryList = setCategoryList;
        __STATE__.__.setters.categoryList = setCategoryList;
        const update$categoryList = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('categoryList', value);
                categoryList = value;
            }
        };
        let i = 0;
        __UPDATE_DATA_TRAIT__.posts = value => { posts = value; updateStateByKey('posts', value); };
        __UPDATE_DATA_TRAIT__.categories = value => { categories = value; updateStateByKey('categories', value); };
        __UPDATE_DATA_TRAIT__.postCategories = value => { postCategories = value; updateStateByKey('postCategories', value); };
        __UPDATE_DATA_TRAIT__.postTags = value => { postTags = value; updateStateByKey('postTags', value); };
        __UPDATE_DATA_TRAIT__.postAuthors = value => { postAuthors = value; updateStateByKey('postAuthors', value); };
        const __VARIABLE_LIST__ = ["posts", "categories", "postCategories", "postTags", "postAuthors"];


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
                update$postList(posts);
                update$categoryList(categories);
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
                if (data.hasOwnProperty('posts')) { update$postList(posts); }
                if (data.hasOwnProperty('categories')) { update$categoryList(categories); }
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
                { classes: [{ type: 'static', value: "flex" }, { type: 'static', value: "flex-col" }, { type: 'static', value: "gap-2" }] },
                (parentElement) => [
                this.__for("increment", 0, 10, (__loop) => {
                        let __forOutput = [];
                        for (let i = 0; i < 10; i++) {
                            __loop.setCurrentTimes(i);
                            __forOutput.push(
                            this.html(`75512120-${i}`, "div", parentElement,
                                { classes: [{ type: 'static', value: "flex" }, { type: 'static', value: "items-center" }, { type: 'static', value: "gap-2" }] },
                                (parentElement) => [
                                this.html(`7ac578e1-${i}`, "h2", parentElement,
                                    { classes: [{ type: 'static', value: "text-sm" }] },
                                    (parentElement) => [
                                    this.text('Title '),
                                    this.output(`1eebdc03-${i}`, parentElement, true, ["i"], (parentElement) => i)
                                    ]),
                                this.reactive(`042330d2-${i}`, "foreach", parentReactive, parentElement, ["categoryList"], (parentReactive, parentElement) => {
                                    return this.__foreach(categoryList, (categoryItem, __loopKey, __loopIndex, __loop) => [
                                        this.html(`af0882bc-${i}-${categoryItem.id}`, "div", parentElement,
                                            { classes: [{ type: 'static', value: "category-item" }] },
                                            (parentElement) => [
                                            this.html(`e8dfa113-${i}-${categoryItem.id}`, "h3", parentElement,
                                                { classes: [{ type: 'static', value: "category-name" }] },
                                                (parentElement) => [
                                                this.output(`07ace25f-${i}-${categoryItem.id}`, parentElement, true, [], (parentElement) => categoryItem.name)
                                                ]),
                                            this.html(`155bb96c-${i}-${categoryItem.id}`, "div", parentElement,
                                                { classes: [{ type: 'static', value: "post-list" }] },
                                                (parentElement) => [
                                                this.reactive(`807a32cb-${i}-${categoryItem.id}`, "foreach", parentReactive, parentElement, ["posts"], (parentReactive, parentElement) => {
                                                    return this.__foreach(categoryItem.posts, (postItem, __loopKey, __loopIndex, __loop) => [
                                                        this.html(`89e1e39d-${i}-${categoryItem.id}-${postItem.id}`, "div", parentElement,
                                                            { classes: [{ type: 'static', value: "post-item" }] },
                                                            (parentElement) => [
                                                            this.html(`5a44d3c4-${i}-${categoryItem.id}-${postItem.id}`, "h4", parentElement,
                                                                { classes: [{ type: 'static', value: "post-title" }] },
                                                                (parentElement) => [
                                                                this.output(`9a1192be-${i}-${categoryItem.id}-${postItem.id}`, parentElement, true, [], (parentElement) => postItem.title)
                                                                ]),
                                                            this.html(`2b659ba4-${i}-${categoryItem.id}-${postItem.id}`, "p", parentElement,
                                                                { classes: [{ type: 'static', value: "post-content" }] },
                                                                (parentElement) => [
                                                                this.output(`6584e3ba-${i}-${categoryItem.id}-${postItem.id}`, parentElement, true, [], (parentElement) => postItem.content)
                                                                ])
                                                            ])
                                                    ], (postItem) => postItem.id)
                                                })
                                                ])
                                            ])
                                    ], (categoryItem) => categoryItem.id)
                                })
                                ])
                            );
                        }
                        return __forOutput;
                    })
                ])
            ]);
            }
        });

    }
}

// Export factory function
export function DemoLoopKey(__data__ = {}, systemData = {}) {
    return new DemoLoopKeyView(__data__, systemData);
}
export default DemoLoopKey;
