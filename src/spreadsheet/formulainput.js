(function(f, define){
    define([ "../kendo.core" ], f);
})(function(){

(function(kendo, window) {

    /* jshint eqnull:true */
    /* jshint latedef: nofunc */

    var $ = kendo.jQuery;
    var Widget = kendo.ui.Widget;
    var ns = ".kendoFormulaInput";
    var keys = kendo.keys;
    var classNames = {
        wrapper: "k-spreadsheet-formula-input"
    };
    var styles = [
        "font-family",
        "font-size",
        "font-stretch",
        "font-style",
        "font-weight",
        "letter-spacing",
        "text-transform",
        "line-height"
    ];

    //move to core
    var KEY_NAMES = {
        27: 'esc',
        37: 'left',
        39: 'right',
        35: 'end',
        36: 'home',
        32: 'spacebar'
    };

    var PRIVATE_FORMULA_CHECK = /[a-z0-9]$/i;
    var FORMULA_START_SYMBOLS = {
        "=": true,
        "(": true,
        ",": true,
        " ": true
    };

    var FormulaInput = Widget.extend({
        init: function(element, options) {
            Widget.call(this, element, options);

            element = this.element;

            element.addClass(FormulaInput.classNames.wrapper)
                .attr("contenteditable", true)
                .attr("spellcheck", false);

            if (this.options.autoScale) {
                element.on("input", this.scale.bind(this));
            }

            this._formulaSource();

            this._formulaList();

            this._popup();

            element
                .on("keydown", this._keydown.bind(this))
                .on("keyup", this._keyup.bind(this))
                .on("blur", this._blur.bind(this))
                .on("input", this._input.bind(this));
        },

        options: {
            name: "FormulaInput",
            autoScale: false,
            filterOperator: "startswith",
            scalePadding: 30,
            minLength: 1
        },

        getPos: function() {
            var div = this.element[0];
            var sel = window.getSelection();
            var a = lookup(sel.focusNode, sel.focusOffset);
            var b = lookup(sel.anchorNode, sel.anchorOffset);
            if (a != null && b != null) {
                if (a > b) {
                    var tmp = a;
                    a = b;
                    b = tmp;
                }
                return { begin: a, end: b, collapsed: a == b };
            }
            function lookup(lookupNode, pos) {
                try {
                    (function loop(node){
                        if (node === lookupNode) {
                            throw pos;
                        } else if (node.nodeType == 1 /* Element */) {
                            for (var i = node.firstChild; i; i = i.nextSibling) {
                                loop(i);
                            }
                        } else if (node.nodeType == 3 /* Text */) {
                            pos += node.nodeValue.length;
                        }
                    })(div);
                } catch(index) {
                    return index;
                }
            }
        },

        setPos: function(begin, end) {
            var eiv = this.element[0];
            begin = lookup(eiv, begin);
            if (end != null) {
                end = lookup(eiv, end);
            } else {
                end = begin;
            }
            if (begin && end) {
                var r = document.createRange();
                r.setStart(begin.node, begin.pos);
                r.setEnd(end.node, end.pos);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(r);
            }
            function lookup(node, pos) {
                try {
                    (function loop(node){
                        if (node.nodeType == 3 /* Text */) {
                            var len = node.nodeValue.length;
                            if (len >= pos) {
                                throw node;
                            }
                            pos -= len;
                        } else if (node.nodeType == 1 /* Element */) {
                            for (var i = node.firstChild; i; i = i.nextSibling) {
                                loop(i);
                            }
                        }
                    })(node);
                } catch(el) {
                    return { node: el, pos: pos };
                }
            }
        },

        // length: function() {
        //     return this.element.text().length;
        // },

        _formulaSource: function() {
            var result = [];
            var value;

            for (var key in kendo.spreadsheet.calc.runtime.FUNCS) {
                if (PRIVATE_FORMULA_CHECK.test(key)) {
                    value = key.toUpperCase();
                    result.push({ value: value, text: value });
                }
            }

            this.formulaSource = new kendo.data.DataSource({ data: result });
        },

        _formulaList: function() {
            this.list = new kendo.ui.StaticList($('<ul class="k-spreadsheet-formula-list" />').insertAfter(this.element), {
                autoBind: false,
                selectable: true,
                change: this._formulaListChange.bind(this),
                dataSource: this.formulaSource,
                dataValueField: "value",
                template: "#:data.value#"
            });

            this.list.element.on("mousedown", function(e) {
                e.preventDefault();
            });
        },

        _formulaListChange: function() {
            var pos = this.getPos();
            if (!pos || this._mute) {
                return;
            }
            var completion = this.list.value()[0];
            var value = this.value();
            var begin = this._startIdx(value, pos.begin);
            var end = this._endIdx(value, pos.end);
            if (value.charAt(end) != "(") {
                completion += "(";
            }
            value = value.substr(0, begin) + completion + value.substr(end);
            this.value(value);

            this.scale();
            this.popup.close();
            this.setPos(begin + completion.length);
            this._sync();
        },

        _popup: function() {
            this.popup = new kendo.ui.Popup(this.list.element, {
                anchor: this.element
            });
        },

        _blur: function() {
            this.popup.close();
        },

        _isFormula: function() {
            return /^=\s*\S/.test(this.value());
        },

        _keydown: function(e) {
            var key = e.keyCode;

            if (KEY_NAMES[key]) {
                this.popup.close();
                this._navigated = true;
            } else  if (this._move(key)) {
                this._navigated = true;
                e.preventDefault();
            }

            setTimeout(this._syntaxHighlight.bind(this));
        },

        _keyup: function() {
            var value;
            var popup = this.popup;

            if (this._isFormula() && !this._navigated) {
                value = this._searchValue();

                this.filter(value);

                if (!value || !this.formulaSource.view().length) {
                    popup.close();

                } else {
                    popup[popup.visible() ? "position" : "open"]();
                    this.list.focusFirst();
                }
            }

            this._navigated = false;
            this._syntaxHighlight();
        },

        _input: function() {
            this._syntaxHighlight();
        },

        _startIdx: function(value, idx) {
            while (idx > 0) {
                if (FORMULA_START_SYMBOLS[value[idx - 1]]) {
                    break;
                }
                idx--;
            }
            return idx;
        },

        _endIdx: function(value, idx) {
            while (idx < value.length) {
                if (FORMULA_START_SYMBOLS[value[idx]]) {
                    break;
                }
                idx++;
            }
            return idx;
        },

        _move: function(key) {
            var list = this.list;
            var pressed = false;

            if (key === keys.DOWN) {
                list.focusNext();
                if (!list.focus()) {
                    list.focusFirst();
                }
                pressed = true;
            } else if (key === keys.UP) {
                list.focusPrev();
                if (!list.focus()) {
                    list.focusLast();
                }
                pressed = true;
            } else if (key === keys.ENTER) {
                list.select(list.focus());
                this.popup.close();
                pressed = true;
            } else if (key === keys.TAB) {
                list.select(list.focus());
                this.popup.close();
                pressed = true;
            } else if (key === keys.PAGEUP) {
                list.focusFirst();
                pressed = true;
            } else if (key === keys.PAGEDOWN) {
                list.focusLast();
                pressed = true;
            }

            return pressed;
        },

        _searchValue: function() {
            var value = this.value();
            var pos = this.getPos();
            if (!pos || !pos.collapsed) {
                return;
            }
            return value.substr(this._startIdx(value, pos.begin), this._endIdx(value, pos.begin) - 1);
        },

        _sync: function() {
            if (this._editorToSync && this.isActive()) {
                this._editorToSync.value(this.value());
            }
        },

        _textContainer: function() {
            var computedStyles = kendo.getComputedStyles(this.element[0], styles);

            computedStyles.position = "absolute";
            computedStyles.visibility = "hidden";
            computedStyles.top = -3333;
            computedStyles.left = -3333;

            this._span = $("<span/>").css(computedStyles).insertAfter(this.element);
        },

        isActive: function() {
            return this.element.is(":focus");
        },

        filter: function(value) {
            if (!value || value.length < this.options.minLength) {
                return;
            }

            this._mute = true;
            this.list.select(-1);
            this._mute = false;

            this.formulaSource.filter({
                field: this.list.options.dataValueField,
                operator: this.options.filterOperator,
                value: value
            });
        },

        hide: function() {
            this.element.hide();
        },

        show: function() {
            this.element.show();
        },

        position: function(rectangle) {
            if (!rectangle) {
                return;
            }

            this.element
                .show()
                .css({
                    "top": rectangle.top + "px",
                    "left": rectangle.left + "px"
                });
        },

        canInsertRef: function() {
            var point = this.getPos();
            if (point && this._isFormula()) {
                if (point.begin === 0) {
                    return null;
                }
                var value = this.value();
                var tokens = kendo.spreadsheet.calc.tokenize(value);
                for (var i = 0; i < tokens.length; ++i) {
                    var tok = tokens[i];
                    if (atPoint(tok)) {
                        var operation = canReplace(tok);
                        if (operation) {
                            return operation;
                        }
                    }
                    if (afterPoint(tok)) {
                        return canInsertAfter(tok, tok = tokens[i - 1]);
                    }
                }
                return canInsertAfter(null, tok);
            }
            return null;

            function atPoint(tok) {
                return tok.begin <= point.begin && tok.end >= point.end;
            }
            function afterPoint(tok) {
                return tok.begin >= point.begin;
            }
            function canReplace(tok) {
                if (/^(?:num|str|bool|sym|ref)$/.test(tok.type)) {
                    return { replace: true, token: tok, end: tok.end };
                }
            }
            function canInsertAfter(current, tok) {
                if (tok == null && current) {
                    return (/^(?:op)/.test(current.type) ?
                            { token: tok, end: point.end } : null);
                }
                if (/^(?:ref|op|punc)$/.test(tok.type) && current) {
                    var tmp = canReplace(current);
                    if (tmp) {
                        return tmp;
                    }
                    return { token: tok, end: point.end };
                }
                if (/^(?:punc|op)$/.test(tok.type)) {
                    return (/^[,;({]$/.test(tok.value) ?
                            { token: tok, end: point.end } : null);
                }
                return false;
            }
        },

        refAtPoint: function(ref) {
            var x = this.canInsertRef();
            if (x) {
                ref = ref.simplify().toString();
                var value = this.value();
                var tok = x.token;
                var rest = value.substr(x.end);
                value = value.substr(0, x.replace ? tok.begin : x.end) + ref;
                var point = value.length;
                value += rest;
                this.value(value);
                this.setPos(point);
                this.scale();
                this._sync();
            }
        },

        resize: function(rectangle) {
            if (!rectangle) {
                return;
            }

            this.element.css({
                width: rectangle.width,
                height: rectangle.height
            });
        },

        syncWith: function(formulaInput) {
            var eventName = "input" + ns;

            this._editorToSync = formulaInput;
            this.element.off(eventName).on(eventName, this._sync.bind(this));
        },

        scale: function() {
            var element = this.element;
            var width;

            if (!this._span) {
                this._textContainer();
            }

            this._span.html(element.html());

            width = this._span.width() + this.options.scalePadding;

            if (width > element.width()) {
                element.width(width);
            }
        },

        value: function(value) {
            if (value === undefined) {
                return this.element.text();
            }

            this.element.text(value);
            this._syntaxHighlight();
        },

        _syntaxHighlight: function() {
            var value = this.value();
            if (!/^=\s*\S/.test(value)) {
                return;
            }
            var pos = this.getPos();
            var tokens = kendo.spreadsheet.calc.tokenize(value);
            var refClasses = kendo.spreadsheet.Pane.classNames.series;
            var refIndex = 0;
            var parens = [];
            tokens.forEach(function(tok){
                if (tok.type == "ref") {
                    tok.cls = " " + refClasses[(refIndex++) % refClasses.length];
                }
                if (pos && tok.type == "punc") {
                    if (isOpenParen(tok.value)) {
                        parens.unshift(tok);
                    } else if (isCloseParen(tok.value)) {
                        var open = parens.shift();
                        if (open) {
                            if (isMatchingParen(tok.value, open.value)) {
                                if (touches(tok, pos) || touches(open, pos)) {
                                    tok.cls = " k-syntax-paren-match";
                                    open.cls = " k-syntax-paren-match";
                                }
                            } else {
                                tok.cls = " k-syntax-error";
                                open.cls = " k-syntax-error";
                            }
                        } else {
                            tok.cls = " k-syntax-error";
                        }
                    }
                } else if (pos && touches(tok, pos)) {
                    tok.cls = " k-syntax-at-point";
                }
                if (tok.type == "func" && !knownFunction(tok.value) && (!pos || !touches(tok, pos))) {
                    tok.cls += " k-syntax-error";
                }
            });
            tokens.reverse().forEach(function(tok){
                var begin = tok.begin, end = tok.end;
                var text = kendo.htmlEncode(value.substring(begin, end));
                value = value.substr(0, begin) +
                    "<span class='k-syntax-" + tok.type +
                    tok.cls + "'>" + text + "</span>" +
                    value.substr(end);
            });
            this.element.html(value);
            if (pos) {
                this.setPos(pos.begin, pos.end);
            }
        },

        destroy: function() {
            this._editorToSync = null;

            this.element.off(ns);

            this.popup.destroy();
            this.popup = null;

            Widget.fn.destroy.call(this);
        }
    });

    function isOpenParen(ch) {
        return ch == "(" || ch == "[" || ch == "{";
    }

    function isCloseParen(ch) {
        return ch == ")" || ch == "]" || ch == "}";
    }

    function isMatchingParen(close, open) {
        return open == "(" ? close == ")"
            :  open == "[" ? close == "]"
            :  open == "{" ? close == "}"
            :  false;
    }

    function touches(pos, target) {
        return pos.begin <= target.begin && pos.end >= target.end;
    }

    function knownFunction(name) {
        return kendo.spreadsheet.calc.runtime.FUNCS[name.toLowerCase()];
    }

    kendo.spreadsheet.FormulaInput = FormulaInput;
    $.extend(true, FormulaInput, { classNames: classNames });
})(kendo, window);
}, typeof define == 'function' && define.amd ? define : function(_, f){ f(); });
