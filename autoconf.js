/*
 * autoconf.js
 *
 * Copyright (c) 2010 David Herman <dherman@ccs.neu.edu>
 */


// TODO:
// 
// - local function scoping behavior (IE, Mozilla, WebKit, Opera)
// - const scoping rules
// - supports strict mode?
// - in strict mode?
// - old-style getters/setters allowed?
// - for-in enumeration order


// Rules of a good autoconf test:
// 
// - should not create any global bindings
// - should not depend on any global bindings except eval
// - should call checkEval() at the last possible moment before referring to eval
// - should not depend unnecessarily on mutable or deletable properties of standard libraries


autoconf = (function(global) {

    var dirty = 'autoconf' in global;
    var previous = global.autoconf;

    var eval = global.eval;
    if (typeof eval !== 'function')
        eval = null;

    function checkEval() {
        if (typeof eval !== 'function')
            throw new Error("no 'eval' function found");
    }

    // wrap the thunk with a memoizing version
    function memo(thunk) {
        var result;
        return function() {
            if (thunk) {
                result = thunk();
                thunk = null;
            }
            return result;
        }
    }

    // return the result of the call or false if it throws
    function truthyCall(thunk) {
        try {
            return thunk();
        } catch (e) {
            return false;
        }
    }

    // return true if calling returns, false if it throws
    function canCall(thunk) {
        return truthyCall(function() { thunk(); return true; });
    }

    // return true if eval returns, false if it throws
    function canEval(str) {
        checkEval();
        return canCall(function() { eval(str) });
    }

    // return the result of eval or false if it throws
    function truthyEval(str) {
        checkEval();
        return truthyCall(function() { return eval(str); });
    }

    var GLOBAL_FUNCTIONS = [
        "Array", "String", "Object", "Function", "Boolean", "Math", "RegExp", "Date",
        "isFinite", "isNaN", "escape", "unescape", "encodeURI", "decodeURI"
    ];

    function findGlobalFunction() {
        for (var i = 0; i < GLOBAL_FUNCTIONS.length; i++) {
            var key = GLOBAL_FUNCTIONS[i];
            if (typeof global[key] === 'function')
                return key;
        }
        throw new Error("could not find a global function");
    }

    var self = {
        restore: function() {
            if (dirty)
                global.autoconf = previous;
            else
                delete global.autoconf;
            return self;
        },
        setEval: function(f) { eval = f; },
        setFunction: function(f) { Function = f; },

        supportsLocalFunctions: memo(function() {
            return canEval("(function(){{function foo(){}}});");
        }),
        supportsLetDeclarations: memo(function() {
            return canEval("let x;");
        }),
        supportsLetBlocks: memo(function() {
            return canEval("let(x=1){}");
        }),
        supportsLetExpressions: memo(function() {
            return canEval("(let(x=1)x)");
        }),
        supportsGenerators: memo(function() {
            return canEval("(function(){yield;});");
        }),
        supportsFinalObjectCommas: memo(function() {
            return canEval("({x:1,})");
        }),
        supportsAnonymousFunctionExpressionStatements: memo(function() {
            return canEval("function(){}");
        }),
        supportsIndirectEval: memo(function() {
            checkEval();
            return canCall(function() {
                var evil = eval;
                evil('0');
            });
        }),
        indirectEvalIsGlobal: memo(function() {
            var name = findGlobalFunction();
            return truthyEval("(function(" + name + "){var evil=eval;return typeof(evil('" + name + "'))==='function'})(0)");
        }),
        supportsConst: memo(function() {
            return canEval("(function(){const x=1;});");
        }),
        constIsVar: memo(function() {
            return truthyEval("(function(){const x=0; x=1; return x===1;})()");
        }),
        supportsWith: memo(function() {
            return canEval("with({}){}");
        }),
        supportsE4X: memo(function() {
            return canEval("(function(){var x=<p></p>;});");
        }),
        supportsE4XFunctionNamespace: memo(function() {
            return canEval("(function(){function::foo;function foo(){}});");
        }),
        argumentsIsMutable: memo(function() {
            return truthyEval("(function(){arguments=1;})()");
        }),
        argumentsAliases: memo(function() {
            return truthyEval("(function(x){arguments[0]=1;return x===1;})(0)");
        }),
        supportsAssigningArguments: memo(function() {
            return canEval("(function(){arguments=1;});");
        }),
        supportsDoWhileSemicolonInsertion: memo(function() {
            return canEval("(function(){do;while(0)return;});");
        }),
        supportsGetters: memo(function() {
            return canEval("({get x(){}})");
        }),
        supportsSetters: memo(function() {
            return canEval("({set x(v){}})");
        }),
        supportsExpressionFunctions: memo(function() {
            return canEval("(function()0);");
        }),
        namedFunctionExpressionInfectsVariableObject: memo(function() {
            return truthyCall(function() {
                return (function() {
                    var x = 0;
                    return (function() {
                        (function x() {})();
                        return x;
                    })();
                })() !== 0;
            });
        }),
        supportsProtoReflection: memo(function() {
            return truthyCall(function() {
                function C() { }
                C.prototype = { };
                var x = new C();
                return x.__proto__ === C.prototype;
            });
        }),
        supportsMutableProto: memo(function() {
            return truthyCall(function() {
                function C() { }
                C.prototype = { foo: 0 };
                function D() { }
                D.prototype = { foo: 1 };
                var x = new C();
                x.__proto__ = D.prototype;
                return x.foo === 1;
            });
        })
    };
    return self;
})(this);
