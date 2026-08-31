/**
 * Expression Transformer (Pass 2)
 * 
 * Transforms Saola Syntax expressions to PHP/Blade syntax using
 * the symbol table from Pass 1.
 * 
 * Responsibilities:
 * - Add $ prefix to identifiers in symbol table
 * - Convert dot notation to -> (object) or ['key'] (array)
 * - Convert template literals `${expr}` to PHP string concatenation
 * - Handle + operator disambiguation (arithmetic vs concatenation)
 * - Convert {k: v} → ['k' => v]
 * - Convert JS-style methods (.length → count(), .join() → implode(), etc.)
 */

const { isPHPBuiltin } = require('./php-builtins');

/**
 * Tên LoopContext mà `.sao` dùng → đều map sang `$loop` của Laravel ở Blade.
 *
 * `__loop` là tên tham số callback do sao2js sinh ra
 * (`(item, __loopKey, __loopIndex, __loop) => ...`) nên đó là tên người dùng
 * viết trong template. `loop` nhận kèm cho quen tay/tương thích Blade thuần.
 * PHẢI khớp 1-1 với `_gen_foreach` trong sao2js/render_generator.py.
 */
const LOOP_ALIASES = new Set(['__loop', 'loop']);

/**
 * Directive có đối số là ĐƯỜNG DẪN VIEW → vị trí (0-based) của đối số đó.
 * Alias khai báo bằng @import được thay bằng path tại đúng vị trí này.
 * @includeIf/@includeWhen/@includeUnless/@includeFirst hiện chưa đi qua
 * preprocessor chút nào (kể cả {} → []), nên chưa đưa vào đây.
 */
const VIEW_PATH_DIRECTIVES = { extends: 0, include: 0 };

class ExpressionTransformer {
    /**
     * @param {import('./symbol-collector')} symbolCollector
     * @param {{ assetPrefix?: string }} [options]
     *   assetPrefix — tiền tố URL cho @asset, vd 'static/saola/web/assets/'.
     *   index.js dựng theo context; mặc định context-less khi gọi trực tiếp.
     */
    constructor(symbolCollector, options = {}) {
        this.symbols = symbolCollector;
        this.assetPrefix = (options.assetPrefix || 'static/saola/assets/').replace(/\/?$/, '/');
    }

    /** @asset symbol → asset('<prefix><path>') — Blade eval SSR, Python route sang __helper.asset() cho CSR. */
    _assetCall(sym) {
        const rel = String(sym.assetPath || '').replace(/^\/+/, '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `asset('${this.assetPrefix}${rel}')`;
    }

    /**
     * Transform a full expression from Saola Syntax to PHP
     * @param {string} expr
     * @returns {string}
     */
    transformExpression(expr) {
        if (!expr || !expr.trim()) return expr;

        // Step 1: Tokenize (Template literals are processed here)
        const tokens = this._tokenize(expr);

        // Step 3: Transform tokens
        const transformed = this._transformTokens(tokens);

        return transformed;
    }

    /**
     * Transform the declarations section
     * @state(count = 0) → @useState($count, 0)
     * @vars(users, posts) → @vars($users, $posts)
     */
    transformDeclaration(declaration) {
        // @state(name = value) or @states({name: value}) → @useState($name, value)
        const stateMatch = declaration.match(/^@states?\s*\(([\s\S]*)\)$/);
        if (stateMatch) {
            return this._transformStateDeclaration(stateMatch[1]);
        }

        // @vars(a, b) → @vars($a, $b)
        const varsMatch = declaration.match(/^@(?:vars|props)\s*\(([\s\S]*)\)$/);
        if (varsMatch) {
            return this._transformVarsDeclaration(declaration, varsMatch[1]);
        }

        // @let(name = expr) → @let($name = php_expr)
        const letMatch = declaration.match(/^@let\s*\(([\s\S]*)\)$/);
        if (letMatch) {
            return this._transformAssignmentDeclaration('@let', letMatch[1]);
        }

        // @const(NAME = expr) → @const($NAME = php_expr)
        const constMatch = declaration.match(/^@const\s*\(([\s\S]*)\)$/);
        if (constMatch) {
            return this._transformAssignmentDeclaration('@const', constMatch[1]);
        }

        // @asset(...) / @assets({...}) — không sinh khai báo runtime; symbol đã
        // được collect ở Pass 1, mỗi use site bung thẳng thành asset('...').
        if (/^@assets?\s*\(/.test(declaration)) {
            return '';
        }

        // Legacy @useState — pass through
        if (declaration.startsWith('@useState')) {
            return declaration;
        }

        // @import(expr) -> @import(php_expr)
        const importMatch = declaration.match(/^@import\s*\(([\s\S]*)\)$/);
        if (importMatch) {
            return `@import(${this.transformExpression(importMatch[1])})`;
        }

        return declaration;
    }

    /**
     * Transform template content (HTML with directives)
     * Handles {{ }}, @if(), @foreach(), @click(), etc.
     * @param {string} template 
     * @returns {string}
     */
    transformTemplate(template) {
        let result = template;

        // 0. Protect blade comments {{-- --}} (must NOT be transformed)
        const bladeComments = [];
        result = result.replace(/\{\{--[\s\S]*?--\}\}/g, (match) => {
            const placeholder = `__BLADE_COMMENT_${bladeComments.length}__`;
            bladeComments.push(match);
            return placeholder;
        });

        // 0b. Protect @verbatim ... @endverbatim — nghĩa của verbatim là "giữ NGUYÊN
        // văn". Không chặn ở đây thì `{{ title }}` trong khối code minh hoạ bị thêm
        // `$` (thành `{{ $title }}`), còn `{{ $title }}` viết sẵn thành `{{ $$title }}`
        // — sai nội dung ở CẢ Blade lẫn JS. Python đã tôn trọng @verbatim, chỉ tầng
        // preprocessor Node là chưa.
        const verbatimBlocks = [];
        result = result.replace(/@verbatim[\s\S]*?@endverbatim/g, (match) => {
            const placeholder = `__VERBATIM_RAW_${verbatimBlocks.length}__`;
            verbatimBlocks.push(match);
            return placeholder;
        });

        // 1. Transform {{ expr }} → {{ php_expr }}
        result = result.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (match, expr) => {
            const transformed = this.transformExpression(expr.trim());
            return `{{ ${transformed} }}`;
        });

        // 2. Transform {!! expr !!} → {!! php_expr !!}
        result = result.replace(/\{!!\s*([\s\S]*?)\s*!!\}/g, (match, expr) => {
            const transformed = this.transformExpression(expr.trim());
            return `{!! ${transformed} !!}`;
        });

        // 3. Transform @directive(expr) — with loop scope management
        result = this._transformDirectives(result);

        // 4. Transform bound HTML attributes (:attr="expr", @event="expr")
        result = this._transformAttributeBindings(result);

        // 5. Restore blade comments + verbatim.
        // Replacement phải là HÀM: dạng chuỗi bị String.replace diễn giải `$$`/`$&`
        // trong nội dung, đúng thứ hay gặp trong khối code minh hoạ.
        for (let i = 0; i < bladeComments.length; i++) {
            result = result.replace(`__BLADE_COMMENT_${i}__`, () => bladeComments[i]);
        }
        for (let i = 0; i < verbatimBlocks.length; i++) {
            result = result.replace(`__VERBATIM_RAW_${i}__`, () => verbatimBlocks[i]);
        }

        return result;
    }

    _transformAttributeBindings(template) {
        let result = '';
        let inTag = false;
        let currentTag = '';
        let inString = false;
        // Độ sâu ngoặc tròn TRONG thẻ. Không đếm thì '>' của '=>' do directive
        // sinh ra (`@style([ 'w'=> 1 ])`) bị hiểu là đóng thẻ, và mọi thuộc
        // tính phía sau — kể cả `:attr="expr"` — rơi ra ngoài, không được xử lý.
        // Cũng che luôn `@click(a > b)`.
        let parenDepth = 0;
        let stringChar = '';
        let i = 0;

        while (i < template.length) {
            const ch = template[i];

            if (!inTag) {
                if (ch === '<' && template[i+1] && /[a-zA-Z/]/.test(template[i+1])) {
                    inTag = true;
                    parenDepth = 0;
                    const tm = template.slice(i + 1).match(/^([A-Za-z][\w.-]*)/);
                    currentTag = tm ? tm[1] : '';
                }
                result += ch;
                i++;
                continue;
            }
            
            // Inside a tag
            if (!inString) {
                if (ch === '(') parenDepth++;
                else if (ch === ')' && parenDepth > 0) parenDepth--;

                if (ch === '>' && parenDepth === 0) {
                    inTag = false;
                    result += ch;
                    i++;
                    continue;
                }
                if (ch === '"' || ch === "'") {
                    inString = true;
                    stringChar = ch;
                    result += ch;
                    i++;
                    continue;
                }
                
                // `::attr` → literal `:attr` (escape hatch, not a binding).
                if (ch === ':' && template[i + 1] === ':') {
                    result += ':';
                    i += 2;
                    continue;
                }

                // Check for attribute binding: :name="expr" or x-bind:name="expr"
                // Do NOT transform event bindings (@name="expr" or x-on:name="expr")
                // because they execute client-side and must remain JS syntax.
                let attrMatch = template.substring(i).match(/^(x-bind:|:)([A-Za-z_][\w:.\-]*)\s*=\s*(["'])/);
                if (attrMatch) {
                    const name = attrMatch[2];
                    const quote = attrMatch[3];

                    i += attrMatch[0].length;

                    // Read until matching quote
                    let exprStart = i;
                    let exprEnd = -1;
                    while (i < template.length) {
                        if (template[i] === '\\') {
                            i += 2; // skip escaped
                            continue;
                        }
                        if (template[i] === quote) {
                            exprEnd = i;
                            break;
                        }
                        i++;
                    }

                    if (exprEnd !== -1) {
                        const expr = template.substring(exprStart, exprEnd);
                        const transformed = this.transformExpression(expr.trim());
                        // Component tag → keep `:prop="expr"` for common/import_tag_resolver.py
                        // (it turns the tag into @include and needs the ':' to spot bindings).
                        // Plain element → `:attr="expr"` ≡ `attr="{{ expr }}"`; emit the echo
                        // form so BOTH sao2blade and sao2js pick it up via their existing
                        // {{ }}-in-attribute paths (no compiler changes needed).
                        const isComponent = !!(this.importAliases && this.importAliases.has(currentTag));
                        result += isComponent
                            ? `:${name}=${quote}${transformed}${quote}`
                            : `${name}=${quote}{{ ${transformed} }}${quote}`;
                        i = exprEnd + 1;
                    } else {
                        result += attrMatch[0];
                    }
                    continue;
                }
            } else {
                if (ch === '\\') {
                    result += ch;
                    if (template[i+1]) {
                        result += template[i+1];
                        i++;
                    }
                } else if (ch === stringChar) {
                    inString = false;
                }
                result += ch;
                i++;
                continue;
            }
            
            result += ch;
            i++;
        }
        
        return result;
    }

    // ========================================================================
    // Template Literals: `text ${expr} text` → 'text ' . php_expr . ' text'
    // ========================================================================

    _processTemplateLiterals(expr) {
        let result = '';
        let i = 0;

        while (i < expr.length) {
            if (expr[i] === '`') {
                const { phpExpr, endPos } = this._parseTemplateLiteral(expr, i);
                result += phpExpr;
                i = endPos + 1;
            } else {
                result += expr[i];
                i++;
            }
        }

        return result;
    }

    _parseTemplateLiteral(str, startPos) {
        const parts = [];
        let currentText = '';
        let i = startPos + 1; // skip opening `

        while (i < str.length) {
            if (str[i] === '`') {
                if (currentText) parts.push({ type: 'text', value: currentText });
                break;
            } else if (str[i] === '$' && str[i + 1] === '{') {
                if (currentText) {
                    parts.push({ type: 'text', value: currentText });
                    currentText = '';
                }
                let depth = 1;
                let j = i + 2;
                while (j < str.length && depth > 0) {
                    if (str[j] === '{') depth++;
                    else if (str[j] === '}') depth--;
                    j++;
                }
                const exprContent = str.substring(i + 2, j - 1);
                parts.push({ type: 'expr', value: exprContent });
                i = j;
            } else if (str[i] === '\\' && i + 1 < str.length) {
                currentText += str[i + 1];
                i += 2;
            } else {
                currentText += str[i];
                i++;
            }
        }

        if (parts.length === 0) {
            return { phpExpr: "''", endPos: i };
        }

        const phpParts = parts.map(part => {
            if (part.type === 'text') {
                const escaped = part.value.replace(/'/g, "\\'");
                return `'${escaped}'`;
            } else {
                // Transform the interpolated expression recursively
                return this.transformExpression(part.value);
            }
        });

        const phpExpr = phpParts.length === 1 ? phpParts[0] : phpParts.join(' . ');
        return { phpExpr, endPos: i };
    }

    // ========================================================================
    // + operator handling (Plan C: context-aware)
    // ========================================================================

    /**
     * Process + operators in an expression:
     * - If any operand at the same precedence level is a string literal → + becomes . (concat)
     * - Parentheses create separate precedence contexts
     */
    _handlePlusOperator(tokens) {
        // Track parenthesis depth and check for string literals at depth 0
        let hasStringAtDepth0 = false;
        let depth = 0;

        for (const token of tokens) {
            if (token.value === '(' || token.value === '[') depth++;
            else if (token.value === ')' || token.value === ']') depth--;
            else if (depth === 0 && token.type === 'string') {
                hasStringAtDepth0 = true;
                break;
            }
        }

        if (!hasStringAtDepth0) return tokens;

        // Transform + to PHP_CONCAT at depth 0
        depth = 0;
        const result = [];
        for (const token of tokens) {
            if (token.value === '(' || token.value === '[') depth++;
            else if (token.value === ')' || token.value === ']') depth--;

            if (token.type === 'operator' && token.value === '+' && depth === 0) {
                result.push({ type: 'php_concat', value: '.' });
            } else {
                result.push(token);
            }
        }

        return result;
    }

    // ========================================================================
    // Tokenizer
    // ========================================================================

    _tokenize(expr) {
        const tokens = [];
        let i = 0;

        while (i < expr.length) {
            // Whitespace
            if (/\s/.test(expr[i])) {
                let ws = '';
                while (i < expr.length && /\s/.test(expr[i])) {
                    ws += expr[i];
                    i++;
                }
                tokens.push({ type: 'whitespace', value: ws });
                continue;
            }

            // Template literals
            if (expr[i] === '`') {
                const { phpExpr, endPos } = this._parseTemplateLiteral(expr, i);
                tokens.push({ type: 'template_literal', value: phpExpr });
                i = endPos + 1;
                continue;
            }

            // String literals
            if (expr[i] === "'" || expr[i] === '"') {
                const quote = expr[i];
                let str = quote;
                i++;
                while (i < expr.length && !(expr[i] === quote && expr[i - 1] !== '\\')) {
                    str += expr[i];
                    i++;
                }
                if (i < expr.length) { str += expr[i]; i++; }
                tokens.push({ type: 'string', value: str });
                continue;
            }

            // Numbers
            if (/\d/.test(expr[i]) || (expr[i] === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
                let num = '';
                while (i < expr.length && /[\d.]/.test(expr[i])) {
                    num += expr[i];
                    i++;
                }
                tokens.push({ type: 'number', value: num });
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(expr[i])) {
                let id = '';
                while (i < expr.length && /[\w]/.test(expr[i])) {
                    id += expr[i];
                    i++;
                }
                const keywords = ['true', 'false', 'null', 'as', 'instanceof', 'new', 'typeof'];
                if (keywords.includes(id)) {
                    tokens.push({ type: 'keyword', value: id });
                } else {
                    tokens.push({ type: 'identifier', value: id });
                }
                continue;
            }

            // Three-char operators
            if (i + 2 < expr.length) {
                const three = expr.substring(i, i + 3);
                if (['===', '!==', '...'].includes(three)) {
                    tokens.push({ type: 'operator', value: three });
                    i += 3;
                    continue;
                }
            }

            // Two-char operators
            if (i + 1 < expr.length) {
                const two = expr.substring(i, i + 2);
                if (['==', '!=', '>=', '<=', '&&', '||', '??', '=>', '++', '--', '+=', '-=', '*=', '/='].includes(two)) {
                    tokens.push({ type: 'operator', value: two });
                    i += 2;
                    continue;
                }
            }

            // Single character
            tokens.push({ type: 'operator', value: expr[i] });
            i++;
        }

        return tokens;
    }

    // ========================================================================
    // Token Transformation
    // ========================================================================

    _transformTokens(tokens) {
        // Step 1: Handle + operator disambiguation FIRST
        tokens = this._handlePlusOperator(tokens);

        // Step 2: Transform identifiers, dot notation, etc.
        let result = '';
        let ternaryPending = 0;

        // Helper to check previous non-whitespace token
        const getPrevToken = (idx) => {
            for (let j = idx - 1; j >= 0; j--) {
                if (tokens[j].type !== 'whitespace') return tokens[j];
            }
            return null;
        };

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // Template literal
            if (token.type === 'template_literal') {
                result += token.value;
                continue;
            }

            // PHP concat (from + disambiguation)
            if (token.type === 'php_concat') {
                result += token.value;
                continue;
            }

            // Whitespace
            if (token.type === 'whitespace') {
                result += token.value;
                continue;
            }

            // String, number, keyword
            if (token.type === 'string' || token.type === 'number' || token.type === 'keyword') {
                result += token.value;
                continue;
            }

            // Identifier
            if (token.type === 'identifier') {
                const name = token.value;
                const nextNonWs = this._findNextNonWhitespace(tokens, i);
                const prevNonWs = this._findPrevNonWhitespace(tokens, i);
                const hasCallParens = nextNonWs && nextNonWs.value === '(';

                // If preceded by . (dot operator — property access), don't add $.
                // PHẢI so KIỂU token, không so value: handlePlusOperator biến '+'
                // thành token php_concat có value CŨNG là '.', nên so value thôi
                // thì `a + '-' + b` coi `b` là tên thuộc tính và nuốt mất `$`
                // → PHP 8 Fatal "Undefined constant b" (§15).
                if (prevNonWs && prevNonWs.type === 'operator' && prevNonWs.value === '.') {
                    result += name;
                    continue;
                }

                // LoopContext: `.sao` viết `__loop` (tên tham số callback mà
                // sao2js sinh ra), nhưng Blade chỉ có `$loop` do Laravel cấp
                // trong @foreach. Không map thì `{{ __loop.index }}` thành
                // `$__loop->index` — BIẾN KHÔNG TỒN TẠI phía SSR, trong khi CSR
                // chạy đúng ⇒ lệch SSR/CSR. Hai tên phải khớp 1-1 với
                // `cb_params` trong sao2js/render_generator.py::_gen_foreach.
                if (LOOP_ALIASES.has(name)) {
                    result += '$loop';
                    continue;
                }

                // If this is an object key (identifier followed by : inside {} context)
                if (nextNonWs && nextNonWs.value === ':' && ternaryPending === 0) {
                    result += "'" + name + "'";
                    continue;
                }

                if (this.symbols.has(name)) {
                    const sym = this.symbols.get(name);

                    // @asset symbol → asset('<prefix><path>') tại chỗ (SSR + CSR).
                    if (sym.type === 'asset') {
                        result += this._assetCall(sym);
                        continue;
                    }

                    if (hasCallParens) {
                        if (sym.type === 'setter' || sym.type === 'function') {
                            result += '$' + name;
                        } else if (isPHPBuiltin(name)) {
                            result += name; // PHP built-in, no $
                        } else {
                            result += '$' + name;
                        }
                    } else {
                        result += '$' + name;
                    }
                } else {
                    // Not in symbol table
                    if (hasCallParens) {
                        result += name; // Likely PHP function
                    } else {
                        // Check for reserved words that don't get $
                        const noPrefix = ['true', 'false', 'null', 'this', 'self', 'parent',
                            'event', 'console', 'window', 'document', 'Math', 'JSON',
                            'Array', 'Object', 'String', 'Number', 'Boolean', 'Date'];
                        if (noPrefix.includes(name)) {
                            result += name;
                        } else {
                            result += '$' + name;
                        }
                    }
                }
                continue;
            }

            // Dot operator → convert to ->
            if (token.type === 'operator' && token.value === '.') {
                token.transformedTo = '->';

                // Check LHS for JS globals
                const globals = ['console', 'Math', 'JSON', 'window', 'document', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date'];
                const prevNode = getPrevToken(i);
                
                if (prevNode && prevNode.type === 'identifier' && globals.includes(prevNode.value)) {
                    // LHS is exactly a JS global keyword, keep dot
                    result += '.';
                    const nextId = this._findNextNonWhitespace(tokens, i);
                    if (nextId) nextId._isProperty = true;
                    continue;
                }

                // Check for .length → count($obj) conversion
                const nextId = this._findNextNonWhitespace(tokens, i);
                if (nextId && nextId.type === 'identifier') {
                    const jsConversion = this._tryJSMethodConversion(nextId.value, tokens, i, result);
                    if (jsConversion) {
                        result = jsConversion.newResult;
                        i = jsConversion.skipTo;
                        continue;
                    }
                }

                result += '->';
                if (nextId) nextId._isProperty = true;
                continue;
            }

            // All other operators
            if (token.type === 'operator') {
                if (token.value === '?') {
                    ternaryPending++;
                } else if (token.value === ':') {
                    if (ternaryPending > 0) {
                        ternaryPending--;
                    } else {
                        // Not a ternary colon, convert to array key-value separator
                        result += '=>';
                        continue;
                    }
                } else if (token.value === '{') {
                    result += '[';
                    continue;
                } else if (token.value === '}') {
                    result += ']';
                    continue;
                }
            }

            result += token.value;
        }

        return result;
    }

    // ========================================================================
    // JS Method → PHP function conversion
    // ========================================================================

    /**
     * Try to convert JS-style method/property to PHP equivalent.
     * Returns null if no conversion applies.
     * 
     * Examples:
     *   items.length → count($items)
     *   str.upper()  → strtoupper($str)
     *   arr.join(',') → implode(',', $arr)
     */
    _tryJSMethodConversion(methodName, tokens, dotIndex, currentResult) {
        const methodTokenIdx = this._findNextNonWhitespaceIndex(tokens, dotIndex);
        if (methodTokenIdx === -1) return null;

        const afterMethodIdx = this._findNextNonWhitespaceIndex(tokens, methodTokenIdx);
        const afterMethod = afterMethodIdx !== -1 ? tokens[afterMethodIdx] : null;
        const hasParens = afterMethod && afterMethod.value === '(';

        // Extract the object expression that precedes the dot
        // We need to modify currentResult to wrap it
        const objExpr = this._extractTrailingExpression(currentResult);
        if (!objExpr) return null;

        // .length (no parens) → count($obj)
        if (methodName === 'length' && !hasParens) {
            const newResult = currentResult.slice(0, -objExpr.length) + `count(${objExpr})`;
            return { newResult, skipTo: methodTokenIdx };
        }

        // Methods with parens — need to extract args
        if (hasParens) {
            // Find matching )
            const closeParenIdx = this._findMatchingParenIndex(tokens, afterMethodIdx);
            if (closeParenIdx === -1) return null;

            // Extract args between ( and )
            let args = '';
            for (let k = afterMethodIdx + 1; k < closeParenIdx; k++) {
                args += tokens[k].value;
            }
            args = args.trim();
            // Transform args
            const phpArgs = args ? this.transformExpression(args) : '';

            const mapping = this._getMethodMapping(methodName, objExpr, phpArgs);
            if (mapping) {
                const newResult = currentResult.slice(0, -objExpr.length) + mapping;
                return { newResult, skipTo: closeParenIdx };
            }
        }

        return null;
    }

    _getMethodMapping(method, obj, args) {
        const mappings = {
            // String methods
            'upper':      () => `strtoupper(${obj})`,
            'lower':      () => `strtolower(${obj})`,
            'trim':       () => `trim(${obj})`,
            'replace':    () => `str_replace(${args}, ${obj})`, // args = old, new
            'contains':   () => `str_contains(${obj}, ${args})`,
            'startsWith': () => `str_starts_with(${obj}, ${args})`,
            'endsWith':   () => `str_ends_with(${obj}, ${args})`,
            'split':      () => `explode(${args}, ${obj})`,

            // Array methods
            'join':       () => `implode(${args}, ${obj})`,
            'includes':   () => `in_array(${args}, ${obj})`,
            'push':       () => `array_push(${obj}, ${args})`,
            'pop':        () => `array_pop(${obj})`,
            'shift':      () => `array_shift(${obj})`,
            'reverse':    () => `array_reverse(${obj})`,
            'first':      () => `reset(${obj})`,
            'last':       () => `end(${obj})`,
            'keys':       () => `array_keys(${obj})`,
            'values':     () => `array_values(${obj})`,
            'unique':     () => `array_unique(${obj})`,
            'merge':      () => `array_merge(${obj}, ${args})`,
            'filter':     () => `array_filter(${obj}, ${args})`,
            'map':        () => `array_map(${args}, ${obj})`,
            'sort':       () => `sort(${obj})`,
            'slice':      () => `array_slice(${obj}, ${args})`,
        };

        const fn = mappings[method];
        return fn ? fn() : null;
    }

    _extractTrailingExpression(str) {
        // Walk backward from end to extract the last "expression"
        // e.g., "$items" from "some code $items"
        // e.g., "$user->name" from "... $user->name"
        let i = str.length - 1;
        let depth = 0;
        let result = '';

        // Skip trailing whitespace
        while (i >= 0 && /\s/.test(str[i])) i--;

        // Collect expression (identifiers, $, ->, [], ())
        while (i >= 0) {
            const ch = str[i];
            if (ch === ')' || ch === ']') { depth++; result = ch + result; i--; continue; }
            if (ch === '(' || ch === '[') { depth--; if (depth < 0) break; result = ch + result; i--; continue; }
            if (depth > 0) { result = ch + result; i--; continue; }

            // Check for -> operator (2 chars)
            if (i >= 1 && str[i - 1] === '-' && str[i] === '>') {
                result = '->' + result;
                i -= 2;
                continue;
            }

            if (/[\w$]/.test(ch)) {
                result = ch + result;
                i--;
                continue;
            }

            break;
        }

        return result || null;
    }

    _findNextNonWhitespaceIndex(tokens, fromIndex) {
        for (let i = fromIndex + 1; i < tokens.length; i++) {
            if (tokens[i].type !== 'whitespace') return i;
        }
        return -1;
    }

    _findMatchingParenIndex(tokens, openIndex) {
        let depth = 1;
        for (let i = openIndex + 1; i < tokens.length; i++) {
            if (tokens[i].value === '(') depth++;
            else if (tokens[i].value === ')') {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    // ========================================================================
    // Directive Transformation
    // ========================================================================

    _transformDirectives(template) {
        let result = template;

        // Transform @let and @const
        result = this._replaceDirectiveArgs(result, 'let', inner => {
            const res = this._transformAssignmentDeclaration('', inner);
            return res.slice(1, -1);
        });
        result = this._replaceDirectiveArgs(result, 'const', inner => {
            const res = this._transformAssignmentDeclaration('', inner);
            return res.slice(1, -1);
        });

        // Transform @foreach — with scope management
        result = this._replaceDirectiveArgs(result, 'foreach', inner => this._transformForeachExpr(inner));

        // Transform @for
        result = this._replaceDirectiveArgs(result, 'for', inner => this._transformForExpr(inner));

        // Transform @if/@elseif
        result = this._replaceDirectiveArgs(result, 'if', inner => this.transformExpression(inner));
        result = this._replaceDirectiveArgs(result, 'elseif', inner => this.transformExpression(inner));

        // Transform @while
        result = this._replaceDirectiveArgs(result, 'while', inner => this.transformExpression(inner));

        // Transform event directives: @click(), @change(), etc.
        const eventDirectives = ['click', 'input', 'change', 'submit', 'keyup', 'keydown',
            'keypress', 'focus', 'blur', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
            'dblclick', 'contextmenu', 'wheel', 'scroll', 'resize', 'load'];
        for (const dir of eventDirectives) {
            result = this._replaceDirectiveArgs(result, dir, inner => this.transformExpression(inner));
        }

        // Transform @bind, @val, @checked, @selected, @disabled, @required, @readonly, @attr
        const bindDirectives = ['bind', 'val', 'checked', 'selected', 'disabled', 'required', 'readonly', 'attr'];
        for (const dir of bindDirectives) {
            result = this._replaceDirectiveArgs(result, dir, inner => this.transformExpression(inner));
        }

        // Transform @class, @style
        result = this._replaceDirectiveArgs(result, 'class', inner => this.transformExpression(inner));
        result = this._replaceDirectiveArgs(result, 'style', inner => this.transformExpression(inner));

        // Transform @exec
        result = this._replaceDirectiveArgs(result, 'exec', inner => this.transformExpression(inner));

        // Transform @show/@hide
        result = this._replaceDirectiveArgs(result, 'show', inner => this.transformExpression(inner));
        result = this._replaceDirectiveArgs(result, 'hide', inner => this.transformExpression(inner));

        // Transform @include — xem VIEW_PATH_DIRECTIVES bên dưới

        // Transform @switch/@case
        result = this._replaceDirectiveArgs(result, 'switch', inner => this.transformExpression(inner));
        result = this._replaceDirectiveArgs(result, 'case', inner => this.transformExpression(inner));

        // Transform Architecture Directives (@section, @block, @yield)
        // @extends nằm ở VIEW_PATH_DIRECTIVES vì đối số của nó là đường dẫn view.
        const archDirectives = ['section', 'block', 'yield'];
        for (const dir of archDirectives) {
            result = this._replaceDirectiveArgs(result, dir, inner => this.transformExpression(inner));
        }

        // Directive nhận ĐƯỜNG DẪN VIEW: gỡ alias @import trước khi transform.
        for (const [dir, viewArgIndex] of Object.entries(VIEW_PATH_DIRECTIVES)) {
            result = this._replaceDirectiveArgs(result, dir, inner =>
                this.transformExpression(this._resolveViewAlias(inner, viewArgIndex)));
        }

        return result;
    }

    /**
     * Thu thập alias từ @import trong nội dung .sao GỐC (chưa transform).
     *
     *   @import(<path> as tên)        → tên        -> <path>
     *   @import({ tên: <path>, ... }) → tên        -> <path>
     *   @import(<path>)               → tên suy ra -> <path>
     *
     * Tên suy ra dùng CÙNG luật với import_parser.py::_extract_tag_from_path.
     * test-import-alias.js gọi thẳng Python đối chiếu nên hai bản không lệch
     * âm thầm được — tên thẻ và alias phải luôn là một.
     *
     * Alias tường minh THẮNG tên suy ra khi trùng.
     */
    collectImportAliases(content) {
        this.importAliases = new Map();
        const derived = new Map();
        if (!content) return this.importAliases;

        const regex = /@import\s*\(/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            let depth = 1;
            let i = match.index + match[0].length;
            const start = i;
            while (i < content.length && depth > 0) {
                if (content[i] === '(') depth++;
                else if (content[i] === ')') depth--;
                i++;
            }
            if (depth !== 0) break;
            regex.lastIndex = i;

            const inner = content.slice(start, i - 1).trim();

            // Dạng object: @import({ counter: 'a.b', demo: __template__ + 'c' })
            if (inner.startsWith('{') && inner.endsWith('}')) {
                for (const entry of this._splitTopLevelStr(inner.slice(1, -1), ',')) {
                    const colon = entry.indexOf(':');
                    if (colon === -1) continue;
                    const name = entry.slice(0, colon).trim().replace(/^['"]|['"]$/g, '');
                    const path = entry.slice(colon + 1).trim();
                    if (name && path) this.importAliases.set(name, path);
                }
                continue;
            }

            // Dạng 'as': @import(<path> as tên)
            const asMatch = inner.match(/^([\s\S]+?)\s+as\s+([A-Za-z_][\w-]*)$/);
            if (asMatch) {
                this.importAliases.set(asMatch[2], asMatch[1].trim());
                continue;
            }

            // Không có 'as': suy tên từ path, đúng luật Python dùng cho tên thẻ.
            const derivedName = ExpressionTransformer.deriveImportName(inner);
            if (derivedName) derived.set(derivedName, inner);
        }

        for (const [name, path] of derived) {
            if (!this.importAliases.has(name)) this.importAliases.set(name, path);
        }

        return this.importAliases;
    }

    /**
     * Suy tên từ biểu thức đường dẫn @import — bản JS của
     * import_parser.py::_extract_tag_from_path.
     *
     *   __layout__ + 'docs'             → docs
     *   __layout__ + 'docs.test-layout' → test-layout
     *   'a'                             → a
     *   $__blade_custom_path__          → blade_custom_path
     */
    static deriveImportName(path) {
        path = (path || '').trim();
        if (!path) return null;

        // Chuỗi literal CUỐI trong biểu thức → đoạn sau dấu chấm cuối
        let last = null;
        for (const m of path.matchAll(/['"]([^'"]+)['"]/g)) last = m[1];
        if (last !== null) {
            const parts = last.split('.');
            return parts[parts.length - 1] || null;
        }

        // Tên biến PHP: $__custom_path__ → custom_path. '\$' là BẮT BUỘC, đúng
        // như Python: path .sao chưa có '$' nên rơi xuống nhánh cuối và giữ
        // nguyên dấu gạch dưới. Bỏ '\$' đi là JS ra 'blade_custom_path' còn
        // Python ra '__blade_custom_path__' → tên thẻ và alias trỏ hai nơi.
        const varMatch = path.match(/^\$_*([a-zA-Z][a-zA-Z0-9_]*?)_*$/);
        if (varMatch) return varMatch[1];

        const clean = path.replace(/[^a-zA-Z0-9_]/g, '');
        return clean || null;
    }

    /**
     * Thay alias ở vị trí đối số đường dẫn bằng chính biểu thức path.
     *
     * Alias là ĐIỂM NEO lúc biên dịch, không phải biến: `@extends(layout)` phải
     * thành `@extends(__layout__ + 'base')` TRƯỚC khi transformExpression chạy.
     * Không thay thì identifier trần bị thêm '$' → Blade ra `@extends($layout)`
     * (biến không tồn tại) còn JS ra `superView: layout` (ReferenceError).
     * Làm ở preprocessor vì đầu ra của nó nuôi CẢ sao2blade lẫn sao2js — hai
     * nhánh không thể trỏ hai nơi khác nhau.
     */
    _resolveViewAlias(inner, viewArgIndex) {
        if (!this.importAliases || this.importAliases.size === 0) return inner;

        const args = this._splitTopLevelStr(inner, ',');
        if (args.length <= viewArgIndex) return inner;

        const arg = args[viewArgIndex];
        const name = arg.trim();
        if (!this.importAliases.has(name)) return inner;  // chỉ khớp identifier TRẦN

        const at = arg.indexOf(name);
        args[viewArgIndex] = arg.slice(0, at) + this.importAliases.get(name) + arg.slice(at + name.length);
        return args.join(',');
    }

    _replaceDirectiveArgs(template, directiveName, transformFn) {
        const regex = new RegExp(`@${directiveName}\\s*\\(`, 'g');
        let match;
        let result = template;
        
        while ((match = regex.exec(result)) !== null) {
            let depth = 1;
            let i = match.index + match[0].length;
            const startIdx = i;
            while (i < result.length && depth > 0) {
                if (result[i] === '(') depth++;
                else if (result[i] === ')') depth--;
                i++;
            }
            if (depth === 0) {
                const inner = result.substring(startIdx, i - 1);
                const transformed = transformFn(inner);
                const before = result.substring(0, match.index);
                const after = result.substring(i);
                const replacement = `@${directiveName}(${transformed})`;
                result = before + replacement + after;
                // Adjust regex index since string length changed
                regex.lastIndex = match.index + replacement.length;
            }
        }
        return result;
    }

    _transformForeachExpr(inner) {
        // items as item  OR  items as key => item
        const asMatch = inner.match(/^(.+?)\s+as\s+(?:(\w+)\s*=>\s*)?(\w+)$/);
        if (asMatch) {
            const collection = this.transformExpression(asMatch[1].trim());
            const key = asMatch[2];
            const value = asMatch[3];

            // Add loop variables to scope
            this.symbols.pushScope();
            this.symbols.addScopedSymbol(value, 'loop_var', '@foreach');
            if (key) this.symbols.addScopedSymbol(key, 'loop_var', '@foreach');

            if (key) {
                return `${collection} as $${key} => $${value}`;
            }
            return `${collection} as $${value}`;
        }
        return this.transformExpression(inner);
    }

    _transformForExpr(inner) {
        const parts = inner.split(';');
        return parts.map(p => this.transformExpression(p.trim())).join('; ');
    }

    // ========================================================================
    // Declaration transformers
    // ========================================================================

    _transformStateDeclaration(inner) {
        let parseStr = inner.trim();
        if (parseStr.startsWith('{') && parseStr.endsWith('}')) {
            parseStr = parseStr.slice(1, -1).trim();
        }

        const parts = this._splitTopLevelStr(parseStr, ',');
        const results = [];

        for (const part of parts) {
            const colonIdx = part.indexOf(':');
            const eqIdx = this._findFirstEquals(part);
            
            let name, value;
            if (colonIdx !== -1 && (eqIdx === -1 || colonIdx < eqIdx)) {
                name = part.substring(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
                value = part.substring(colonIdx + 1).trim();
            } else if (eqIdx !== -1) {
                name = part.substring(0, eqIdx).trim();
                value = part.substring(eqIdx + 1).trim();
            } else {
                continue;
            }

            const phpValue = this.transformExpression(value);
            results.push(`@useState($${name}, ${phpValue})`);
        }

        return results.join('\n');
    }

    _transformVarsDeclaration(originalDirective, inner) {
        const directiveName = originalDirective.match(/^@(\w+)/)[1];
        return `@${directiveName}(${this.transformExpression(inner)})`;
    }

    _transformAssignmentDeclaration(directive, inner) {
        const eqIdx = this._findFirstEquals(inner);
        if (eqIdx === -1) return `${directive}(${inner})`;

        const lhs = inner.substring(0, eqIdx).trim();
        const rhs = inner.substring(eqIdx + 1).trim();

        if (lhs.startsWith('[') || lhs.startsWith('{')) {
            const phpLhs = this._transformDestructuringLhs(lhs);
            const phpRhs = this.transformExpression(rhs);
            return `${directive}(${phpLhs} = ${phpRhs})`;
        }

        const phpName = '$' + lhs.replace(/^\$/, '');
        const phpValue = this.transformExpression(rhs);
        return `${directive}(${phpName} = ${phpValue})`;
    }

    _transformDestructuringLhs(lhs) {
        const isArray = lhs.startsWith('[');
        const inner = lhs.slice(1, -1);
        const names = inner.split(',').map(n => {
            const name = n.trim().replace(/^\$/, '');
            return '$' + name;
        });
        return isArray ? `[${names.join(', ')}]` : `{${names.join(', ')}}`;
    }

    // ========================================================================
    // Helper utilities
    // ========================================================================

    _findNextNonWhitespace(tokens, fromIndex) {
        for (let i = fromIndex + 1; i < tokens.length; i++) {
            if (tokens[i].type !== 'whitespace') return tokens[i];
        }
        return null;
    }

    _findPrevNonWhitespace(tokens, fromIndex) {
        for (let i = fromIndex - 1; i >= 0; i--) {
            if (tokens[i].type !== 'whitespace') return tokens[i];
        }
        return null;
    }

    _splitTopLevelStr(str, delimiter) {
        const parts = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inString) {
                current += ch;
                if (ch === stringChar && str[i - 1] !== '\\') inString = false;
                continue;
            }
            if (ch === "'" || ch === '"' || ch === '`') {
                inString = true; stringChar = ch; current += ch; continue;
            }
            if ('([{'.includes(ch)) depth++;
            else if (')]}'.includes(ch)) depth--;

            if (ch === delimiter && depth === 0) {
                parts.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) parts.push(current);
        return parts;
    }

    _findFirstEquals(str) {
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inString) {
                if (ch === stringChar && str[i - 1] !== '\\') inString = false;
                continue;
            }
            if (ch === "'" || ch === '"' || ch === '`') { inString = true; stringChar = ch; continue; }
            if ('([{'.includes(ch)) depth++;
            else if (')]}'.includes(ch)) depth--;

            if (ch === '=' && depth === 0) {
                const next = str[i + 1] || '';
                const prev = i > 0 ? str[i - 1] : '';
                if (next === '=' || next === '>') continue;
                if (prev === '!' || prev === '<' || prev === '>') continue;
                return i;
            }
        }
        return -1;
    }

    /**
     * Check if token at given index is inside a { } object literal context
     * Scans backward from the token to find if there's an unmatched { before it
     */
    _isInsideObjectLiteral(tokens, tokenIndex) {
        let braceDepth = 0;
        let parenDepth = 0;
        let bracketDepth = 0;

        for (let i = tokenIndex - 1; i >= 0; i--) {
            const val = tokens[i].value;
            if (val === '}') braceDepth++;
            else if (val === '{') {
                braceDepth--;
                if (braceDepth < 0) return true; // Found unmatched {
            }
            else if (val === ')') parenDepth++;
            else if (val === '(') parenDepth--;
            else if (val === ']') bracketDepth++;
            else if (val === '[') bracketDepth--;
        }
        return false;
    }
}

module.exports = ExpressionTransformer;
