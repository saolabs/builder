/**
 * Saola Preprocessor - Main Entry Point
 * 
 * Transforms Saola Syntax (.sao) to PHP/Blade syntax before
 * feeding into the existing compiler pipeline.
 * 
 * Architecture:
 *   .sao (Saola Syntax)
 *       │
 *   Pass 1: Symbol Collection
 *       │  → Build symbol table from declarations
 *       │
 *   Pass 2: Expression Transform
 *       │  → declarations → PHP declarations
 *       │  → template → PHP/Blade template
 *       │
 *   Output: PHP/Blade syntax (compatible with existing compiler)
 */

const SymbolCollector = require('./symbol-collector');
const ExpressionTransformer = require('./expression-transformer');

class SaolaPreprocessor {
    constructor() {
        this.symbolCollector = new SymbolCollector();
        this.expressionTransformer = null;
    }

    /**
     * Preprocess a parsed .sao file (Saola Syntax → PHP/Blade Syntax)
     * 
     * @param {object} parts - Parsed .sao file parts from Compiler.parseSaoFile()
     *   @param {string[]} parts.declarations - Array of declaration strings
     *   @param {string} parts.blade - Template content
     *   @param {string} parts.bladeWithSSR - Template with SSR content
     *   @param {string} parts.script - Script content (untouched)
     *   @param {string} parts.style - Style content (untouched)
     * @returns {object} Transformed parts with PHP/Blade syntax
     */
    preprocess(parts, options = {}) {
        // LUÔN transform — không còn "chế độ pass-through cho cú pháp PHP cũ".
        // Trước đây `<blade>` khiến CẢ FILE (kể cả declarations nằm ngoài thẻ
        // đó) bị bỏ qua hoàn toàn. Gỡ bỏ: xem docs/05-roadmap.md §11.
        //
        // Reconstruct full content for symbol collection
        const fullContent = [
            ...parts.declarations,
            parts.blade || '',
            parts.bladeWithSSR || ''
        ].join('\n');

        // Pass 1: Collect symbols
        this.symbolCollector.collect(fullContent);
        this.expressionTransformer = new ExpressionTransformer(this.symbolCollector, options);
        // Alias @import phải lấy từ nội dung GỐC: sau transform thì `x as tên`
        // đã thành cú pháp PHP, không còn nhận ra alias nữa.
        this.expressionTransformer.collectImportAliases(fullContent);

        // Pass 2: Transform
        const transformedParts = { ...parts };

        // Transform declarations
        transformedParts.declarations = parts.declarations.map(decl =>
            this.expressionTransformer.transformDeclaration(decl)
        );

        // Transform template (blade/HTML content)
        if (parts.blade) {
            transformedParts.blade = this.expressionTransformer.transformTemplate(parts.blade);
        }
        if (parts.bladeWithSSR) {
            transformedParts.bladeWithSSR = this.expressionTransformer.transformTemplate(parts.bladeWithSSR);
        }

        // Script and style are NOT transformed (already JS/CSS)
        // transformedParts.script = parts.script;
        // transformedParts.style = parts.style;

        return transformedParts;
    }

    /**
     * Preprocess raw .sao file content string
     * (Alternative API for when parts haven't been parsed yet)
     * 
     * @param {string} content - Raw .sao file content
     * @returns {string} Preprocessed content with PHP/Blade syntax
     */
    preprocessRaw(content, options = {}) {
        // Collect symbols
        this.symbolCollector.collect(content);
        this.expressionTransformer = new ExpressionTransformer(this.symbolCollector, options);
        this.expressionTransformer.collectImportAliases(content);

        // Split into sections: declarations, template, script, style
        const sections = this._splitSections(content);

        let result = '';

        // Transform declarations
        for (const decl of sections.declarations) {
            result += this.expressionTransformer.transformDeclaration(decl) + '\n';
        }

        // Transform template
        if (sections.template) {
            result += this.expressionTransformer.transformTemplate(sections.template);
        }

        // Keep script and style unchanged
        if (sections.script) {
            result += '\n' + sections.script;
        }
        if (sections.style) {
            result += '\n' + sections.style;
        }

        return result;
    }

    // ========================================================================
    // Section Splitting (for raw content processing)
    // ========================================================================

    _splitSections(content) {
        const result = {
            declarations: [],
            template: '',
            script: null,
            style: null,
        };

        // Extract <script> block
        const scriptMatch = content.match(/<script[\s\S]*?<\/script>/i);
        if (scriptMatch) {
            result.script = scriptMatch[0];
            content = content.replace(scriptMatch[0], '');
        }

        // Extract <style> block
        const styleMatch = content.match(/<style[\s\S]*?<\/style>/i);
        if (styleMatch) {
            result.style = styleMatch[0];
            content = content.replace(styleMatch[0], '');
        }

        // Split remaining into declarations and template
        const lines = content.split('\n');
        let inTemplate = false;
        let inDeclaration = false;
        let currentDecl = '';
        let templateLines = [];

        for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            const trimmed = line.trim();

            // Currently accumulating a multi-line declaration
            if (inDeclaration) {
                currentDecl += '\n' + line;
                if (this._isBalanced(currentDecl)) {
                    result.declarations.push(currentDecl.trim());
                    currentDecl = '';
                    inDeclaration = false;
                }
                continue;
            }

            if (trimmed.startsWith('<blade') || trimmed.startsWith('<template') || trimmed.startsWith('<sao:blade')) {
                inTemplate = true;
                templateLines.push(line);
                continue;
            }

            if (inTemplate) {
                templateLines.push(line);
                if (trimmed === '</blade>' || trimmed === '</template>' || trimmed === '</sao:blade>') {
                    inTemplate = false;
                }
                continue;
            }

            // Check if line starts a declaration
            if (/^@(state|vars|props|let|const|useState|states|assets?)\s*\(/.test(trimmed)) {
                currentDecl = line;
                if (this._isBalanced(currentDecl)) {
                    // Single-line declaration
                    result.declarations.push(trimmed);
                    currentDecl = '';
                } else {
                    // Multi-line declaration — continue accumulating
                    inDeclaration = true;
                }
            } else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('{{--')) {
                // Non-declaration, non-comment line outside template tags
                // This could be bare template content (no <blade> wrapper)
                templateLines.push(line);
            }
        }

        result.template = templateLines.join('\n');
        return result;
    }

    _isBalanced(str) {
        let depth = 0;
        for (const ch of str) {
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
        }
        return depth === 0;
    }
}

module.exports = SaolaPreprocessor;
