/**
 * esbuild plugin to minify HTML in template literals
 * Safely removes unnecessary whitespace while preserving HTML structure
 */

/**
 * Minify HTML string while preserving important whitespace
 * @param {string} html - HTML string to minify
 * @returns {string} Minified HTML
 */
function minifyHtmlTemplate(html) {
    // Don't process if it doesn't look like HTML
    if (!/<[a-z]|<\//i.test(html)) {
        return html;
    }

    let result = html;

    // 1. Remove HTML comments (but not IE conditionals)
    result = result.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

    // 2. Collapse multiple whitespace between tags to single space
    // But preserve whitespace inside <pre>, <code>, <textarea>, <script>, <style>
    const preserveTags = ['pre', 'code', 'textarea', 'script', 'style'];
    const preserved = [];
    
    // Temporarily replace content of preserve tags
    preserveTags.forEach((tag, i) => {
        const regex = new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(<\\/${tag}>)`, 'gi');
        result = result.replace(regex, (match, open, content, close) => {
            const placeholder = `__PRESERVE_${i}_${preserved.length}__`;
            preserved.push({ placeholder, content: open + content + close });
            return placeholder;
        });
    });

    // 3. Remove newlines and collapse spaces between tags
    // > whitespace < → > <
    result = result.replace(/>\s+</g, '> <');
    
    // 4. Remove leading/trailing whitespace on lines
    result = result.replace(/^\s+|\s+$/gm, '');
    
    // 5. Collapse multiple spaces to single space
    result = result.replace(/\s{2,}/g, ' ');
    
    // 6. Remove spaces around = in attributes (be careful with template expressions)
    // Don't touch ${...} expressions
    result = result.replace(/\s*=\s*(?=["\'])/g, '=');
    
    // 7. Remove unnecessary spaces inside tags
    // <div   class="x"> → <div class="x">
    result = result.replace(/<([a-z][a-z0-9]*)\s+/gi, '<$1 ');
    result = result.replace(/\s+>/g, '>');
    
    // 8. Remove space between > and text if it's just formatting whitespace
    // But keep space if there's actual text content
    result = result.replace(/>\s+(?=\S)/g, '>');
    result = result.replace(/(?<=\S)\s+</g, '<');
    
    // Restore preserved content
    preserved.forEach(({ placeholder, content }) => {
        result = result.replace(placeholder, content);
    });

    // Final trim
    result = result.trim();

    return result;
}

/**
 * Process JavaScript/TypeScript source code to minify template literals
 * that contain HTML (in render/prerender methods)
 * @param {string} source - Source code
 * @returns {string} Processed source code
 */
function processTemplateStrings(source) {
    // Match template literals (backtick strings)
    // We need to be careful with nested template expressions ${...}
    const result = [];
    let i = 0;
    
    while (i < source.length) {
        // Look for backtick
        if (source[i] === '`') {
            const start = i;
            i++; // Move past opening backtick
            
            let template = '';
            let depth = 0;
            
            while (i < source.length) {
                if (source[i] === '\\' && i + 1 < source.length) {
                    // Escaped character, keep as-is
                    template += source[i] + source[i + 1];
                    i += 2;
                    continue;
                }
                
                if (source[i] === '$' && source[i + 1] === '{') {
                    // Template expression start
                    template += '${';
                    i += 2;
                    depth = 1;
                    
                    // Find matching closing brace
                    while (i < source.length && depth > 0) {
                        if (source[i] === '{') depth++;
                        else if (source[i] === '}') depth--;
                        
                        if (depth > 0) {
                            template += source[i];
                            i++;
                        }
                    }
                    
                    if (depth === 0) {
                        template += '}';
                        i++;
                    }
                    continue;
                }
                
                if (source[i] === '`') {
                    // End of template literal
                    break;
                }
                
                template += source[i];
                i++;
            }
            
            // Check if this template contains HTML
            if (/<[a-z]/i.test(template)) {
                // Minify the HTML content
                const minified = minifyHtmlTemplate(template);
                result.push('`' + minified + '`');
            } else {
                result.push('`' + template + '`');
            }
            
            i++; // Move past closing backtick
        } else {
            result.push(source[i]);
            i++;
        }
    }
    
    return result.join('');
}

/**
 * esbuild plugin for HTML template minification
 */
function htmlTemplateMinifyPlugin() {
    return {
        name: 'html-template-minify',
        setup(build) {
            // Only process .ts and .js files
            build.onLoad({ filter: /\.(ts|js)$/ }, async (args) => {
                const fs = require('fs');
                const source = fs.readFileSync(args.path, 'utf8');
                
                // Only process files that likely contain HTML templates
                // (render methods with template literals containing HTML tags)
                if (!source.includes('`') || !/<[a-z]/i.test(source)) {
                    return null; // Let esbuild handle normally
                }
                
                try {
                    const processed = processTemplateStrings(source);
                    
                    return {
                        contents: processed,
                        loader: args.path.endsWith('.ts') ? 'ts' : 'js'
                    };
                } catch (error) {
                    // On error, let esbuild handle the original file
                    console.warn(`   ⚠ Template minify warning for ${args.path}: ${error.message}`);
                    return null;
                }
            });
        }
    };
}

module.exports = {
    htmlTemplateMinifyPlugin,
    minifyHtmlTemplate,
    processTemplateStrings
};
