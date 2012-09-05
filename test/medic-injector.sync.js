
var assert = require('assert');

var InjectorLib = require('../index')
  , Injector = InjectorLib.InjectorSync;

describe('InjectionMapping', function(){

    describe('#toValue()', function(){
        it('should return the value', function(){
            var injector = new Injector();
            var injectionMapping = injector.addMapping('test').toValue(10);
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
        });
    });// end "#toValue()" tests

    describe('no resolution scheme', function(){
        it('should return `null`', function(){
            var injector = new Injector();
            var injectionMapping = injector.addMapping('test');
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(null, injectionValue);
        });
    });// end "no resolution scheme" tests

    describe('#toProvider()', function(){
        it('should return the Provider returned value', function(){
            var injector = new Injector();
            var counter = 0;
            var injectionMapping = injector.addMapping('test').toProvider(function() {
                counter++;
                return 10;
            });
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            assert.strictEqual(1, counter);
        });
        it('should received injected args too', function(){
            var injector = new Injector();
            var counter = 0;
            injector.addMapping('injection1').toValue(-10);
            injector.addMapping('injection2').toValue(-20);
            var injectionMapping = injector.addMapping('test').toProvider(function(injection1, dummy1, injection2, dummy2) {
                counter++;
                assert.strictEqual(-10, injection1);
                assert.strictEqual(null, dummy1);
                assert.strictEqual(-20, injection2);
                assert.strictEqual(null, dummy2);
                return 10;
            });
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            assert.strictEqual(1, counter);
        });
        it('should trigger the Provider function multiple times for multiple Injections resolutions requests', function(){
            var injector = new Injector();
            var counter = 0;
            var injectionMapping = injector.addMapping('test').toProvider(function() {
                counter++;
                return 10;
            });
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            assert.strictEqual(1, counter);
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            assert.strictEqual(2, counter);
        });
    });// end "#toProvider()" tests

    describe('#asSingleton()', function(){
        it('should normally return the value when used with #toValue', function(){
            var injector = new Injector();
            var injectionMapping = injector.addMapping('test').toValue(10).asSingleton();
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
        });
        it('should return the *same* value with only one Provider trigger when a Provider result is used multiple times', function(){
            var injector = new Injector();
            var counter = 0;
            var injectionMapping = injector.addMapping('test')
                .toProvider(function() {
                    counter++;
                    return 10;
                })
                .asSingleton();
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            assert.strictEqual(1, counter);
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(10, injectionValue);
            assert.strictEqual(1, counter);//the counter stays at "1", because the Provider is triggered only once
        });
    })// end "#asSingleton()" tests

    describe('#toType()', function(){

        var JsType = function()
        {
            this.counter = ++JsType._instanceCounter;
        };
        JsType._instanceCounter = 0;

        it('should return a new instance of the given JS type', function(){
            var injector = new Injector();
            JsType._instanceCounter = 0;
            var injectionMapping = injector.addMapping('test').toType(JsType);
            var injectionValue = injectionMapping.resolveInjection();
            assert(injectionValue instanceof JsType);
            assert.strictEqual(1, injectionValue.counter);
            var injectionValue = injectionMapping.resolveInjection();
            assert(injectionValue instanceof JsType);
            assert.strictEqual(2, injectionValue.counter);
        });
        it('should return a shared lazy-loaded singleton instance of the given JS type when used with #asSingleton()', function(){
            var injector = new Injector();
            JsType._instanceCounter = 0;
            var injectionMapping = injector.addMapping('test').toType(JsType).asSingleton();
            var injectionValue;
            injectionValue = injectionMapping.resolveInjection();
            assert(injectionValue instanceof JsType);
            assert.strictEqual(1, injectionValue.counter);
            injectionValue = injectionMapping.resolveInjection();
            assert(injectionValue instanceof JsType);
            assert.strictEqual(1, injectionValue.counter);
        });
    });// end "#toType()" tests

    describe('#seal()/#unseal()', function(){
        it('should seal', function(){
            var injector = new Injector();
            var injectionMapping = injector.addMapping('test').toValue(10);
            injectionMapping.seal();
            assert(injectionMapping.isSealed());
            assert.throws(
                function () {
                    injector.asSingleton();
                },
                Error
            );
            assert.throws(
                function () {
                    injector.toValue(20);
                },
                Error
            );
            assert.throws(
                function () {
                    injector.toProvider(function() {return 30;});
                },
                Error
            );
            var injectionValue = injectionMapping.resolveInjection();
            assert.strictEqual(injectionValue, 10);
        });
        it('should not unseal with an invalid key', function(){
            var injector = new Injector();
            var injectionMapping = injector.addMapping('test').toValue(10);
            injectionMapping.seal();
            assert(injectionMapping.isSealed());
            assert.throws(
                function () {
                    injector.unseal(null);
                },
                Error
            );
            assert.throws(
                function () {
                    injector.unseal({});
                },
                Error
            );
        });
        it('should successfully unseal with the seal key', function(){
            var injector = new Injector();
            var injectionMapping = injector.addMapping('test').toValue(10);
            var sealKey = injectionMapping.seal();
            assert(injectionMapping.isSealed());
            injectionMapping.unseal(sealKey);
            assert(!injectionMapping.isSealed());
        });

    });// end "#seal()/#unseal()" tests

});//end "InjectionMapping" tests

describe('Injector', function(){

    describe('#triggerFunctionWithInjectedParams()', function(){
        it('should handle a given context successfully', function(done){
            var injector = new Injector();
            injector.addMapping('injection1').toValue(10);
            injector.addMapping('injection2').toProvider(function () {return 20;});
            var targetFunctionContext = {
                'contextProp': -1
            };
            var targetFunction = function (injection1, injection2)
            {
                assert.strictEqual(10, injection1);
                assert.strictEqual(20, injection2);
                assert.strictEqual(-1, this.contextProp);
                done();
            };
            injector.triggerFunctionWithInjectedParams(targetFunction, targetFunctionContext);
        });
        it('should be able to resolve misc injected params', function(done){
            // We already tested each of these InjectionsMappings, we can mix them from now on
            var injector = new Injector();

            var JsType = function()
            {
                this.counter = ++JsType._instanceCounter;
            };
            JsType._instanceCounter = 0;

            injector.addMapping('injection1').toValue(10);
            injector.addMapping('injection2').toProvider(function () {return 20;});
            injector.addMapping('injection3').toProvider(function () {
                return 30;
            });
            injector.addMapping('injection4').toProvider(function (injection8) {//this provider is itself "injected"
                assert.strictEqual(1, injection8.counter);
                return 40;
            });
            injector.addMapping('injection5').toProvider(function (injection4, injection8) {//this provider is itself "injected" with the "injected" previous one
                assert.strictEqual(2, injection8.counter);
                return injection4+10;
            });
            injector.addMapping('injection6').toProvider(function (injection5, injection9) {//this provider is itself "injected" with the "injected" previous one
                assert.strictEqual(3, injection9.counter);//injection 9 is singleton
                return injection5+10;
            }).asSingleton();
            injector.addMapping('injection7').toProvider(function (injection9) {//this provider is itself "injected" with the "injected" previous one
                assert.strictEqual(3, injection9.counter);//injection 9 is singleton
                return 70;
            });
            injector.addMapping('injection8').toType(JsType);
            injector.addMapping('injection9').toType(JsType).asSingleton();

            var targetFunction = function (injection2, injection1, unmatchedInjection, injection6, injection3, injection7)
            {
                assert.strictEqual(10, injection1);
                assert.strictEqual(20, injection2);
                assert.strictEqual(30, injection3);
                assert.strictEqual(60, injection6);
                assert.strictEqual(70, injection7);
                assert.strictEqual(null, unmatchedInjection);
                done();
            };

            injector.triggerFunctionWithInjectedParams(targetFunction);
        });
    });// end "#triggerFunctionWithInjectedParams()" tests

    describe('#removeMapping()', function(){
        it('should remove a given mapping', function(){
            var injector = new Injector();
            assert(!injector.hasMapping('injection1'));
            injector.addMapping('injection1').toValue(10);
            assert(injector.hasMapping('injection1'));
            injector.removeMapping('injection1');
            assert(!injector.hasMapping('injection1'));
        });
        it('should not remove a sealed mapping', function(){
            var injector = new Injector();
            injector.addMapping('injection1').toValue(10).seal();
            assert(injector.hasMapping('injection1'));
            assert.throws(
                function () {
                    injector.removeMapping('injection1');
                },
                Error
            );
            assert(injector.hasMapping('injection1'));
        });
        it('should remove an unsealed mapping', function(){
            var injector = new Injector();
            var sealKey = injector.addMapping('injection1').toValue(10).seal();
            assert(injector.hasMapping('injection1'));
            injector.getMapping('injection1').unseal(sealKey);
            injector.removeMapping('injection1');
            assert(!injector.hasMapping('injection1'));
        });
    });// end "#removeMapping()" tests

    describe('#injectInto()', function(){
        it('should inject a simple "null" injection point, and ignore other properties', function(){
            var injector = new Injector();
            var JsType = function()
            {
                this.injection1 = null;
                this.injection2 = 'not null';
                this.injection3 = null;
            };
            injector.addMapping('injection1').toValue(10);
            injector.addMapping('injection2').toValue(20);
            var jsTypeInstance = new JsType();
            injector.injectInto(jsTypeInstance);
            assert.strictEqual(10, jsTypeInstance.injection1);
            assert.strictEqual('not null', jsTypeInstance.injection2);
            assert.strictEqual(null, jsTypeInstance.injection3);
        });
        it('should trigger the given callback after injection', function(){
            var injector = new Injector();
            var JsType = function()
            {
                this.injection1 = null;
                this.injection2 = null;
            };
            var counter = 0;
            injector.addMapping('injection1').toValue(10);
            var jsTypeInstance = new JsType();
            injector.injectInto(jsTypeInstance);
            assert.strictEqual(10, jsTypeInstance.injection1);
            assert.strictEqual(null, jsTypeInstance.injection2);
            assert.strictEqual(0, counter);
        });
        it('should trigger the JS object "postInjections()" method after injection', function(){
            var injector = new Injector();
            var nbPostInjectionsTriggered = 0;
            var JsType = function()
            {
                this.injection1 = null;
                this.injection2 = null;
                this.postInjections = function() {
                    nbPostInjectionsTriggered++;
                };
                this.customPostInjectionsMethod = function() {
                    nbPostInjectionsTriggered++;
                };
            };
            injector.addMapping('injection1').toValue(10);
            var jsTypeInstance = new JsType();
            injector.injectInto(jsTypeInstance);
            assert.strictEqual(10, jsTypeInstance.injection1);
            assert.strictEqual(1, nbPostInjectionsTriggered);
        });
        it('should trigger the JS object custom "postInjections()" method after injection', function(){
            var injector = new Injector();
            injector.instancePostInjectionsCallbackName = 'customPostInjectionsMethod';
            var nbPostInjectionsTriggered = 0;
            var JsType = function()
            {
                this.injection1 = null;
                this.injection2 = null;
                this.customPostInjectionsMethod = function() {
                    assert.strictEqual(1, ++nbPostInjectionsTriggered);
                };
            };
            injector.addMapping('injection1').toValue(10);
            var jsTypeInstance = new JsType();
            injector.injectInto(jsTypeInstance);
            assert.strictEqual(10, jsTypeInstance.injection1);
            assert.strictEqual(2, ++nbPostInjectionsTriggered);
        });
        it('should proceed to injections in the "postInjections()" method after injection, if asked', function(done){
            var injector = new Injector();
            var JsType = function()
            {
                this.injection1 = null;
                this.postInjections = function(injection1, injection2) {
                    assert.strictEqual(10, this.injection1);
                    assert.strictEqual(10, injection1);
                    assert.strictEqual(20, injection2);
                    done();
                };
            };
            injector.addMapping('injection1').toValue(10);
            injector.addMapping('injection2').toProvider(function() {
                return 20;
            });
            var jsTypeInstance = new JsType();
            injector.injectInto(jsTypeInstance, true);//we enable the "proceedToInjectionsInPostInjectionsMethodToo" flag
        });
    });// end "#injectInto()" tests

    describe('#createInjectedInstance()', function(){
        it('should give a fully "injected" object instance', function(){
            var injector = new Injector();
            var JsType = function()
            {
                this.injection1 = null;
                this.customValueFromPostInjectionsMethod = null;
                this.postInjections = function(injection2) {
                    this.customValueFromPostInjectionsMethod = injection2;
                };
            };
            injector.addMapping('injection1').toValue(10);
            injector.addMapping('injection2').toProvider(function() {
                return 20;
            });
            var jsTypeInstance = injector.createInjectedInstance(JsType, true);//we enable the "proceedToInjectionsInPostInjectionsMethodToo" flag
            assert(jsTypeInstance instanceof JsType);
            assert.strictEqual(10, jsTypeInstance.injection1);
            assert.strictEqual(20, jsTypeInstance.customValueFromPostInjectionsMethod);
        });
    });// end "#createInjectedInstance()" tests

    describe('#parseStr()', function(){
        it('should successfully replace ${injectionName} patterns', function(){
            var injector = new Injector();
            injector.addMapping('injection1').toValue(10);
            injector.addMapping('injection2').toProvider(function() {
                return 20;
            });
            injector.addMapping('injection3').toValue(null);
            var sourceStr = '${injection1}::${injection2}::${injection3}';
            var injectedStr = injector.parseStr(sourceStr);
            assert.strictEqual('10::20::', injectedStr);
        });
    });// end "#parseStr()" tests

});//end "Injector" tests
