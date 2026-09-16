(function(global) {
	"use strict";
	var _fireboltInstance = null;
	var _builderFactory = null;
	var _builder = null;
	var _VERSION = "9.0";
	var _buildResolvers = [];
	var _building = false;

	function _get() {
		if (!_builderFactory) {
			throw new Error("Builder not set via FireboltServiceManager.builder(). " + "The WPE extension must call FireboltServiceManager.builder(b) first.")
		}
		if (_fireboltInstance) {
			return Promise.resolve(_fireboltInstance)
		}
		return new Promise(function(resolve, reject) {
			_builder = _builderFactory.get();
			if (!_builder || typeof _builder.build !== "function") {
                console.warn("Builder object must have a 'build' method");
				reject(new Error("Builder object must have a 'build' method"));
				return
			}
			if (!_building) {
				_building = true;
				_builder.build().then(function(instance) {
					_building = false;
					_fireboltInstance = instance;
					resolve(instance);
					_buildResolvers.forEach(function(resolver) {
						resolver[0](instance);
					});
					_buildResolvers = [];
				}).catch(function(error) {
					_building = false;
					reject(error);
					_buildResolvers.forEach(function(resolver) {
						resolver[1](error);
					});
					_buildResolvers = [];
				});
			} else {
				_buildResolvers.push([resolve, reject]);
			}
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
		if (_builderFactory !== null) {
            console.warn("Builder already set on FireboltServiceManager");
			throw new Error("Builder already set on FireboltServiceManager")
		}
		if (typeof builderFactory.get !== "function") {
            console.warn("Builder object must have a 'get' method");
			throw new Error("Builder object must have a 'get' method")
		}
		_builderFactory = builderFactory
	}
})(typeof globalThis !== "undefined" ? globalThis : window);
