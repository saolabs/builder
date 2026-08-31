/**
 * Saola Vite Plugin
 */

export interface SaolaVitePluginOptions {
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
     * Watch .sao files for changes in dev mode
     * @default true
     */
    watch?: boolean;
    
    /**
     * Custom path to sao.config.json
     */
    configPath?: string;
}

/**
 * Saola Vite plugin
 * @param options Plugin options
 */
declare function saolaPlugin(options?: SaolaVitePluginOptions): import('vite').Plugin;

export default saolaPlugin;
export { saolaPlugin };
