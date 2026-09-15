(function(global) {
	"use strict";
	var _fireboltInstance = null;
	var _builderFactory = null;
	var _builder = null;
	var _VERSION = "9.0";

	function _get() {
        console.log("get called");
		if (!_builderFactory) {
			throw new Error("Builder not set via FireboltServiceManager.builder(). " + "The WPE extension must call FireboltServiceManager.builder(b) first.")
		}
		if (_fireboltInstance) {
			return Promise.resolve(_fireboltInstance)
		}
		return new Promise(function(resolve, reject) {
            console.log("BuilderFactory get");
			_builder = _builderFactory.get();
			if (!_builder || typeof _builder.build !== "function") {
                console.warn("Builder object must have a 'build' method");
				reject(new Error("Builder object must have a 'build' method"));
				return
			}
			_builder.build().then(function(instance) {
                console.log("Builder build successful");
				_fireboltInstance = instance;
				resolve(instance)
			}).catch(reject)
		})
	}
	var _fsm = Object.create(null);
	Object.defineProperty(_fsm, "version", {
		value: _VERSION,
		writable: false,
		configurable: false,
		enumerable: true
	});
	Object.defineProperty(_fsm, "get", {
		value: _get,
		writable: false,
		configurable: false,
		enumerable: true
	});
	Object.defineProperty(global, "FireboltServiceManager", {
		value: _fsm,
		writable: false,
		configurable: false,
		enumerable: true
	});
	return function(builderFactory) {
        console.log("Insider builder factory");
		if (_builderFactory !== null) {
            console.warn("Builder already set on FireboltServiceManager");
			throw new Error("Builder already set on FireboltServiceManager")
		}
		if (typeof builderFactory.get !== "function") {
            console.warn("Builder object must have a 'get' method");
			throw new Error("Builder object must have a 'get' method")
		}
		_builderFactory = builderFactory
        console.log("successfully set builder");
	}
})(typeof globalThis !== "undefined" ? globalThis : window);
