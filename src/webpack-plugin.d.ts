/**
 * Saola Webpack Plugin
 */

import { Compiler } from 'webpack';

export interface SaolaWebpackPluginOptions {
    /**
     * Context to compile
     * @default 'default'
     */
    context?: string | 'all';
    
    /**
     * Minify HTML in template strings
     * @default true
     */
    minifyHtml?: boolean;
    
    /**
     * Watch .sao files for changes
     * @default true
     */
    watch?: boolean;
    
    /**
     * Custom path to sao.config.json
     */
    configPath?: string;
}

/**
 * Saola Webpack Plugin
 */
declare class SaolaWebpackPlugin {
    constructor(options?: SaolaWebpackPluginOptions);
    apply(compiler: Compiler): void;
}

export default SaolaWebpackPlugin;
export { SaolaWebpackPlugin };
