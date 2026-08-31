/**
 * Saola Webpack Loader
 * Minifies HTML templates in JavaScript/TypeScript files
 * 
 * Usage in webpack.config.js:
 * 
 * module.exports = {
 *   module: {
 *     rules: [
 *       {
 *         test: /\.(ts|js)$/,
 *         use: ['saola/webpack-loader'],
 *         include: /one\/.*views/
 *       }
 *     ]
 *   }
 * };
 */

module.exports = function saolaLoader(source) {
    // Check if contains HTML templates
    if (!source.includes('`') || !/<[a-z]/i.test(source)) {
        return source;
    }

    try {
        const { processTemplateStrings } = require('./html-minify-plugin');
        return processTemplateStrings(source);
    } catch (error) {
        this.emitWarning(new Error(`Saola HTML minify warning: ${error.message}`));
        return source;
    }
};
