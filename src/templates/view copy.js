import { View, ViewController, app, Application } from '@saolabs/client';

[COMPONENT_IMPORTS]

const __VIEW_PATH__ = 'admin.pages.users';
const __VIEW_NAMESPACE__ = 'admin.pages.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    [VIEW_CONFIG_PLACEHOLDER]
};


[COMPONENT_SCRIPT_CONTENTS]

class [COMPONENT_NAME]ViewController extends ViewController {
    constructor(view:[TYPE:View]) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
        if (typeof (this as [TYPE:any]).setStaticConfig === 'function') {
            (this as [TYPE:any]).setStaticConfig(__VIEW_CONFIG__);
        } else {
            (this as [TYPE:any]).config = __VIEW_CONFIG__;
        }
    }
}

class [COMPONENT_NAME]View extends View {
    constructor(__data__:[TYPE:any] = {}, systemData:[TYPE:any] = {}) {
        super(__VIEW_PATH__, __VIEW_TYPE__, [COMPONENT_NAME]ViewController);
        const App:[TYPE:Application] = app("App") as [TYPE:Application];
        const __STATE__ = this.__ctrl__.states;
        const {__base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
        const __VIEW_ID__ = __data__.__SSR_VIEW_ID__ || App.View.generateViewId();

        const useState = (value:[TYPE:any]) => {
            return __STATE__.__useState(value);
        };
        const updateRealState = (state:[TYPE:any]) => {
            __STATE__.__.updateRealState(state);
        };

        const lockUpdateRealState = () => {
            __STATE__.__.lockUpdateRealState();
        };
        const updateStateByKey = (key:[TYPE:string], state:[TYPE:any]) => {
            __STATE__.__.updateStateByKey(key, state);
        };


[COMPONENT_DECLARE_VARIABLES_AND_STATES]

        this.__ctrl__.setUserDefinedConfig({
[USER_DEFINED_PROPERTIES_PLACEHOLDER]
        });

        this.__ctrl__.setup({
[VIEW_SETUP_CONFIG_PLACEHOLDER]
        });

    }
}

// Export factory function
export function [FACTORY_FUNCTION_NAME](__data__ = {}, systemData = {}):[TYPE:[COMPONENT_NAME]View] {
    return new [COMPONENT_NAME]View(__data__, systemData);
}
export default [FACTORY_FUNCTION_NAME];