/**
 * Symbol Collector (Pass 1)
 * 
 * Scans all declarations in .sao file to build a symbol table.
 * The symbol table tells the transformer which identifiers are
 * user-declared variables (need $) vs PHP built-in functions (no $).
 */

class SymbolCollector {
    constructor() {
        /** @type {Map<string, SymbolInfo>} */
        this.symbols = new Map();
        /** @type {Array<Map<string, SymbolInfo>>} scope stack for loops */
        this.scopeStack = [];
    }

    /**
     * Reset symbol table
     */
    reset() {
        this.symbols = new Map();
        this.scopeStack = [];
    }

    /**
     * Collect all symbols from .sao content
     * @param {string} content - Raw .sao file content
     * @returns {Map<string, SymbolInfo>}
     */
    collect(content) {
        this.reset();

        this._collectStateDeclarations(content);
        this._collectVarsDeclarations(content);
        this._collectLetDeclarations(content);
        this._collectConstDeclarations(content);
        this._collectAssetDeclarations(content);

        return this.symbols;
    }

    /**
     * Add a symbol to the table
     * @param {string} name 
     * @param {'state'|'setter'|'var'|'local'|'constant'|'function'|'loop_var'|'asset'} type
     * @param {string} source - e.g. '@state', '@vars', '@let', '@const', '@asset', '@foreach'
     * @param {object} [extra] - Additional metadata
     */
    addSymbol(name, type, source, extra = {}) {
        this.symbols.set(name, { type, source, ...extra });
    }

    /**
     * Check if a name is in the symbol table (including scope stack)
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
        if (this.symbols.has(name)) return true;
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            if (this.scopeStack[i].has(name)) return true;
        }
        return false;
    }

    /**
     * Get symbol info
     * @param {string} name
     * @returns {SymbolInfo|undefined}
     */
    get(name) {
        if (this.symbols.has(name)) return this.symbols.get(name);
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            if (this.scopeStack[i].has(name)) return this.scopeStack[i].get(name);
        }
        return undefined;
    }

    /**
     * Push a new scope (for @foreach loop variables)
     */
    pushScope() {
        this.scopeStack.push(new Map());
    }

    /**
     * Pop the current scope
     */
    popScope() {
        this.scopeStack.pop();
    }

    /**
     * Add a symbol to the current scope (top of stack)
     */
    addScopedSymbol(name, type, source) {
        if (this.scopeStack.length === 0) {
            this.addSymbol(name, type, source);
        } else {
            this.scopeStack[this.scopeStack.length - 1].set(name, { type, source });
        }
    }

    // ========================================================================
    // Private: Parse each declaration type
    // ========================================================================

    /**
     * Parse @state declarations
     * Formats:
     *   @state(count = 0)
     *   @state(isOpen = false, name = '')
     *   @state(\n  count = 0,\n  isOpen = false\n)
     */
    _collectStateDeclarations(content) {
        const regex = /@states?\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const inner = this._extractBalancedParens(content, match.index + match[0].length - 1);
            if (!inner) continue;

            let parseStr = inner.trim();
            if (parseStr.startsWith('{') && parseStr.endsWith('}')) {
                parseStr = parseStr.slice(1, -1).trim();
            }

            const parts = this._splitTopLevel(parseStr, ',');
            for (const part of parts) {
                const colonIdx = part.indexOf(':');
                const eqIdx = this._findAssignmentEquals(part);
                
                let name = '';
                if (colonIdx !== -1 && (eqIdx === -1 || colonIdx < eqIdx)) {
                    name = part.substring(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
                } else if (eqIdx !== -1) {
                    name = part.substring(0, eqIdx).trim().replace(/^\$/, '');
                }
                
                if (name) {
                    this.addSymbol(name, 'state', '@states');
                    const setterName = 'set' + name.charAt(0).toUpperCase() + name.slice(1);
                    this.addSymbol(setterName, 'setter', '@states', { stateOf: name });
                }
            }
        }

        // Also support legacy @useState($name, value)
        const legacyRegex = /@useState\s*\(/g;
        while ((match = legacyRegex.exec(content)) !== null) {
            const inner = this._extractBalancedParens(content, match.index + match[0].length - 1);
            if (!inner) continue;

            // Parse: $name, value  or  name, value
            const parts = this._splitTopLevel(inner, ',');
            if (parts.length >= 1) {
                const name = parts[0].trim().replace(/^\$/, '');
                this.addSymbol(name, 'state', '@useState');
                const setterName = 'set' + name.charAt(0).toUpperCase() + name.slice(1);
                this.addSymbol(setterName, 'setter', '@useState', { stateOf: name });
            }
        }
    }

    /**
     * Parse @vars declarations
     * Formats:
     *   @vars(users, posts, currentUser)
     */
    _collectVarsDeclarations(content) {
        const regex = /@(?:vars|props)\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const inner = this._extractBalancedParens(content, match.index + match[0].length - 1);
            if (!inner) continue;

            // Check if it's array/object format: ['key' => default, ...] or {key: default}
            const trimmed = inner.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                // Array/Object format
                const innerBody = trimmed.slice(1, -1).trim();
                const parts = this._splitTopLevel(innerBody, ',');
                for (const part of parts) {
                    const p = part.trim();
                    // 'key' => default  or  key => default  or  key: default or key = default
                    const match = p.match(/^['"]?(\w+)['"]?\s*(?:=>|:|(?<![=!<>])=)\s*/);
                    if (match) {
                        this.addSymbol(match[1], 'var', '@vars');
                    } else if (/^\w+$/.test(p)) {
                        this.addSymbol(p, 'var', '@vars');
                    }
                }
            } else {
                // Simple format: @vars(a, b, c) — may have $ prefix
                const parts = this._splitTopLevel(inner, ',');
                for (const part of parts) {
                    let name = part.trim().replace(/^\$/, '');
                    // `@vars(a = 1)` là dạng ĐANG DÙNG THẬT, không phải
                    // @let/@const (chú thích cũ ghi ngược). Bỏ sót nên tên khai
                    // kiểu này không vào bảng ký hiệu: tên thường vẫn thoát nhờ
                    // nhánh mặc định thêm '$', nhưng tên trùng NO_PREFIX
                    // (`event`, `console`, `Date`...) thì rơi mất '$' ⇒ PHP 8
                    // Fatal. `@vars(a)` trần vốn đã đúng — đây là cho dạng '='
                    // theo kịp.
                    if (name.includes('=')) {
                        name = name.slice(0, name.indexOf('=')).trim();
                    }
                    if (name && /^\w+$/.test(name)) {
                        this.addSymbol(name, 'var', '@vars');
                    }
                }
            }
        }
    }

    /**
     * Parse @let declarations
     * Formats:
     *   @let(total = price * 2)
     *   @let(handler = function(e) { ... })
     *   @let(cb = () => { ... })
     */
    _collectLetDeclarations(content) {
        const regex = /@let\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const inner = this._extractBalancedParens(content, match.index + match[0].length - 1);
            if (!inner) continue;

            // Extract name = value
            const eqIdx = inner.indexOf('=');
            if (eqIdx === -1) continue;

            // Handle destructuring: [$a, $b] = ...  or  [a, b] = ...
            const lhs = inner.substring(0, eqIdx).trim();
            const rhs = inner.substring(eqIdx + 1).trim();

            if (lhs.startsWith('[') || lhs.startsWith('{')) {
                this._collectDestructured(lhs, rhs, '@let');
            } else {
                const name = lhs.replace(/^\$/, '');
                const isFunc = this._isFunctionExpression(rhs);
                this.addSymbol(name, isFunc ? 'function' : 'local', '@let');
            }
        }
    }

    /**
     * Parse @const declarations
     * Formats:
     *   @const(API_URL = '/api')
     *   @const([count, setCount] = useState(0))
     *   @const({host, port} = config)
     */
    _collectConstDeclarations(content) {
        const regex = /@const\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const inner = this._extractBalancedParens(content, match.index + match[0].length - 1);
            if (!inner) continue;

            const eqIdx = this._findAssignmentEquals(inner);
            if (eqIdx === -1) continue;

            const lhs = inner.substring(0, eqIdx).trim();
            const rhs = inner.substring(eqIdx + 1).trim();

            if (lhs.startsWith('[') || lhs.startsWith('{')) {
                this._collectDestructured(lhs, rhs, '@const');
            } else {
                const name = lhs.replace(/^\$/, '');
                const isFunc = this._isFunctionExpression(rhs);
                this.addSymbol(name, isFunc ? 'function' : 'constant', '@const');
            }
        }
    }

    /**
     * Parse @asset / @assets declarations — each name maps to a path relative to
     * the context's assets/ dir. Không sinh biến runtime: mọi use site được
     * transformer bung thẳng thành asset('<prefix>/<path>') (chạy cả SSR lẫn CSR).
     * Formats:
     *   @asset(logo = 'images/logo.png', theme = 'css/theme.css')
     *   @assets({ logo: 'images/logo.png', theme: 'css/theme.css' })
     */
    _collectAssetDeclarations(content) {
        const regex = /@assets?\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const inner = this._extractBalancedParens(content, match.index + match[0].length - 1);
            if (!inner) continue;

            let parseStr = inner.trim();
            if (parseStr.startsWith('{') && parseStr.endsWith('}')) {
                parseStr = parseStr.slice(1, -1).trim();
            }

            for (const part of this._splitTopLevel(parseStr, ',')) {
                const p = part.trim();
                if (!p) continue;

                const colonIdx = p.indexOf(':');
                const eqIdx = this._findAssignmentEquals(p);

                let name = '', rawVal = '';
                if (eqIdx !== -1 && (colonIdx === -1 || eqIdx < colonIdx)) {
                    name = p.slice(0, eqIdx);
                    rawVal = p.slice(eqIdx + 1);
                } else if (colonIdx !== -1) {
                    name = p.slice(0, colonIdx);
                    rawVal = p.slice(colonIdx + 1);
                } else {
                    continue;
                }

                name = name.trim().replace(/^['"]|['"]$/g, '').replace(/^\$/, '');
                const assetPath = rawVal.trim().replace(/^['"]|['"]$/g, '');

                if (name && /^\w+$/.test(name) && assetPath) {
                    this.addSymbol(name, 'asset', '@asset', { assetPath });
                }
            }
        }
    }

    /**
     * Collect symbols from destructuring patterns
     * [a, setA] = useState()  or  {host, port} = config
     */
    _collectDestructured(lhs, rhs, source) {
        // Strip outer brackets
        let inner;
        if (lhs.startsWith('[')) {
            inner = lhs.slice(1, -1);
        } else {
            inner = lhs.slice(1, -1);
        }

        const isUseState = /\buseState\s*\(/.test(rhs);
        const names = this._splitTopLevel(inner, ',');

        for (const rawName of names) {
            const name = rawName.trim().replace(/^\$/, '');
            if (!name || !/^\w+$/.test(name)) continue;

            if (isUseState) {
                // [x, setX] = useState() pattern
                const isSetterPattern = /^set[A-Z]/.test(name);
                this.addSymbol(name, isSetterPattern ? 'setter' : 'state', source, { pattern: 'destructured' });
            } else {
                this.addSymbol(name, 'local', source, { pattern: 'destructured' });
            }
        }
    }

    // ========================================================================
    // Utility methods
    // ========================================================================

    /**
     * Extract content inside balanced parentheses starting at given position
     * @param {string} str 
     * @param {number} openPos - Position of '('
     * @returns {string|null} Content between parens, or null
     */
    _extractBalancedParens(str, openPos) {
        if (str[openPos] !== '(') return null;
        let depth = 1;
        let i = openPos + 1;
        while (i < str.length && depth > 0) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') depth--;
            i++;
        }
        if (depth !== 0) return null;
        return str.substring(openPos + 1, i - 1);
    }

    /**
     * Split string by delimiter at top level (respecting nested parens/brackets/braces/quotes)
     */
    _splitTopLevel(str, delimiter) {
        const parts = [];
        let current = '';
        let depth = 0;  // ( )
        let sqDepth = 0; // [ ]
        let brDepth = 0; // { }
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];

            if (inString) {
                current += ch;
                if (ch === stringChar && str[i - 1] !== '\\') {
                    inString = false;
                }
                continue;
            }

            if (ch === "'" || ch === '"' || ch === '`') {
                inString = true;
                stringChar = ch;
                current += ch;
                continue;
            }

            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            else if (ch === '[') sqDepth++;
            else if (ch === ']') sqDepth--;
            else if (ch === '{') brDepth++;
            else if (ch === '}') brDepth--;

            if (ch === delimiter && depth === 0 && sqDepth === 0 && brDepth === 0) {
                parts.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) parts.push(current);
        return parts;
    }

    /**
     * Find the first = that is an assignment (not ==, !=, >=, <=, =>)
     */
    _findAssignmentEquals(str) {
        let depth = 0, sqDepth = 0, brDepth = 0;
        let inString = false, stringChar = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];

            if (inString) {
                if (ch === stringChar && str[i - 1] !== '\\') inString = false;
                continue;
            }
            if (ch === "'" || ch === '"' || ch === '`') {
                inString = true;
                stringChar = ch;
                continue;
            }

            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            else if (ch === '[') sqDepth++;
            else if (ch === ']') sqDepth--;
            else if (ch === '{') brDepth++;
            else if (ch === '}') brDepth--;

            if (ch === '=' && depth === 0 && sqDepth === 0 && brDepth === 0) {
                // Skip ==, ===, =>, !=, !==, >=, <=
                const prev = i > 0 ? str[i - 1] : '';
                const next = i < str.length - 1 ? str[i + 1] : '';
                if (next === '=' || next === '>') continue; // ==, ===, =>
                if (prev === '!' || prev === '<' || prev === '>') continue; // !=, <=, >=
                return i;
            }
        }
        return -1;
    }

    /**
     * Check if a value expression is a function
     */
    _isFunctionExpression(value) {
        if (!value) return false;
        const v = value.trim();
        if (v.startsWith('function')) return true;
        // Arrow function: (...) => or x =>
        if (/^\(.*\)\s*=>/.test(v)) return true;
        if (/^\w+\s*=>/.test(v)) return true;
        return false;
    }

    /**
     * Parse "name = value, name2 = value2" into [{name, value}]
     */
    _parseAssignmentList(str) {
        const assignments = [];
        const parts = this._splitTopLevel(str, ',');
        for (const part of parts) {
            const eqIdx = this._findAssignmentEquals(part);
            if (eqIdx !== -1) {
                const name = part.substring(0, eqIdx).trim().replace(/^\$/, '');
                const value = part.substring(eqIdx + 1).trim();
                assignments.push({ name, value });
            }
        }
        return assignments;
    }
}

module.exports = SymbolCollector;
