(function() {
	"use strict";
	let _commonStringify = JSON.stringify;
	let _commonParse = JSON.parse;
	let _commonArrayCheck = Array.isArray;
	var _transport = null;
	var _transportSet = false;
	var _connecting = false;
	var _connected = false;
	var _fireboltInstance = null;
	var _connectionResolvers = [];
	var _nextId = 1;
	var _pendingCalls = Object.create(null);
	var _eventListeners = Object.create(null);
	var _extensionSchema = null;
	var _debug = false;
	var _VERSION = "9.0";

	function _onMessage(raw) {
		var message;
		try {
			message = _commonParse(raw)
			if(_debug) {
				console.log("-->" + raw);
			}
		} catch (e) {
			return
		}
		if (message.id !== undefined) {
			var pending = _pendingCalls[message.id];
			if (!pending) return;
			delete _pendingCalls[message.id];
			if (message.error) {
				var errMsg = (message.error.message || "Firebolt error") + " (code: " + message.error.code + ")";
				if (pending.isSubscribe) {
					var listeners = _eventListeners[pending.eventName];
					if (listeners) {
						var idx = listeners.indexOf(pending.callback);
						if (idx !== -1) listeners.splice(idx, 1)
					}
				}
				pending.reject(new Error(errMsg));
				return
			}
			if (pending.isSubscribe) {
				pending.resolve(pending.unsubscribeFn);
				return
			}
			pending.resolve(message.result);
			return
		}
		if (message.method) {
			var eventName = message.method;
			var cbs = _eventListeners[eventName];
			if (cbs) {
				var payload = message.params && Object.prototype.hasOwnProperty.call(message.params, "value")
					? message.params.value
					: message.params;
				for (var i = 0; i < cbs.length; i++) {
					cbs[i](payload,false)
				}
			}
		}
	}

	function _onOpen() {
		console.log("Firebolt transport opened");
		_connected = true;
		if (!_fireboltInstance) {
				_fireboltInstance = _buildFireboltInstance()
			}
			var resolvers = _connectionResolvers.splice(0);
			for (var i = 0; i < resolvers.length; i++) {
				resolvers[i](_fireboltInstance)
		}
	}

	function _onClose() {
		console.log("Firebolt transport closed");
		_connected = false;
	}

	function _onError(error) {
		console.error("Firebolt transport error:", error);
		clearPendingCalls();
		clearEventListeners();
		_connected = false;
		_connect()
	}

	function _connect() {
		if (_connected){
			return false;
		}
		try {
			_transport.open();
			_connecting = true;
		} catch (e) {
			console.error("Firebolt transport error:", e);
			throw e;
		}
		
	}

	function _notConnectedError() {
		return new Error("Not connected");
	}
	
	function _send(data, failureCallback) {
		try {
			_transport.send(data);
			if(_debug) {
				console.log("<--" + data);
			}
		} catch(e) {
			if (failureCallback) {
				failureCallback(e);
			}
		}
	}

	function _rpcCall(methodName, params) {
		if (!_connected) {
			return Promise.reject(_notConnectedError());
		}
		return new Promise(function(resolve, reject) {
			var id = _nextId++;
			_pendingCalls[id] = {
				isSubscribe: false,
				resolve,
				reject
			};
			var msg = _commonStringify({
				jsonrpc: "2.0",
				id,
				method: methodName,
				params: params || {}
			});
			_send(msg,(e) => {
				delete _pendingCalls[id];
				reject(e);
			});
		})
	}

	function _subscribe(eventName, callback) {
		if (!_connected) {
			return Promise.reject(_notConnectedError());
		}
		if (!_eventListeners[eventName]) {
			_eventListeners[eventName] = []
		}
		_eventListeners[eventName].push(callback);
		return new Promise(function(resolve, reject) {
			var id = _nextId++;

			function unsubscribeFn() {
				var ls = _eventListeners[eventName];
				if (ls) {
					var i = ls.indexOf(callback);
					if (i !== -1) ls.splice(i, 1)
				}
				if (!ls || ls.length === 0) {
					var unsubId = _nextId++;
					_pendingCalls[unsubId] = {
						isSubscribe: true,
						eventName,
						callback: null,
						unsubscribeFn: null,
						resolve: function() {},
						reject: function() {}
					};
					var unsubMsg = _commonStringify({
						jsonrpc: "2.0",
						id: unsubId,
						method: eventName,
						params: {
							listen: false
						}
					});
					_send(unsubMsg, (e) => {
						console.error("Failed to unsubscribe from event:", eventName, e);
					});
				}
			}
			_pendingCalls[id] = {
				isSubscribe: true,
				eventName,
				callback,
				unsubscribeFn,
				resolve,
				reject
			};
			var msg = _commonStringify({
				jsonrpc: "2.0",
				id,
				method: eventName,
				params: {
					listen: true
				}
			});
			_send(msg, (e) => {
				delete _pendingCalls[id];
				var ls = _eventListeners[eventName];
				if (ls) {
					var i = ls.indexOf(callback);
					if (i !== -1) ls.splice(i, 1)
				}
				reject(e);
			});
		})
	}
	var _fireboltRegistry = Object.create(null);

	function _addMethodNoParams(module, methodName, moduleName) {
		Object.defineProperty(module, methodName, {
			value: function() {
				return _rpcCall(moduleName + "." + methodName, {})
			},
			writable: false,
			enumerable: true,
			configurable: false
		})
	}

	function _addMethodWithObjectParam(module, methodName, moduleName) {
		Object.defineProperty(module, methodName, {
			value: function(params) {
				return _rpcCall(moduleName + "." + methodName, params || {})
			},
			writable: false,
			enumerable: true,
			configurable: false
		})
	}

	function _addEvent(module, eventName, moduleName) {
		Object.defineProperty(module, eventName, {
			value: function(callback) {
				return _subscribe(moduleName + "." + eventName, callback)
			},
			writable: false,
			enumerable: true,
			configurable: false
		})
	}

	function _registerModule(moduleName, module) {
		Object.defineProperty(_fireboltRegistry, moduleName, {
			value: module,
			writable: false,
			enumerable: true,
			configurable: false
		})
	}
	var _accessibilityModule = Object.create(null);
	_addMethodNoParams(_accessibilityModule, "audioDescription", "Accessibility");
	_addEvent(_accessibilityModule, "onAudioDescriptionChanged", "Accessibility");
	_addMethodNoParams(_accessibilityModule, "closedCaptionsSettings", "Accessibility");
	_addEvent(_accessibilityModule, "onClosedCaptionsSettingsChanged", "Accessibility");
	_addMethodNoParams(_accessibilityModule, "highContrast", "Accessibility");
	_addEvent(_accessibilityModule, "onHighContrastChanged", "Accessibility");
	_addMethodNoParams(_accessibilityModule, "voiceGuidanceSettings", "Accessibility");
	_addEvent(_accessibilityModule, "onVoiceGuidanceSettingsChanged", "Accessibility");
	_registerModule("Accessibility", _accessibilityModule);
	var _actionsModule = Object.create(null);
	_addMethodWithObjectParam(_actionsModule, "start", "Actions");
	_addMethodWithObjectParam(_actionsModule, "intent", "Actions");
	_addEvent(_actionsModule, "onIntent", "Actions");
	_registerModule("Actions", _actionsModule);
	var _advertisingModule = Object.create(null);
	_addMethodNoParams(_advertisingModule, "advertisingId", "Advertising");
	_registerModule("Advertising", _advertisingModule);
	var _deviceModule = Object.create(null);
	_addMethodNoParams(_deviceModule, "uid", "Device");
	_addMethodNoParams(_deviceModule, "deviceClass", "Device");
	_addMethodNoParams(_deviceModule, "uptime", "Device");
	_addMethodNoParams(_deviceModule, "hdr", "Device");
	_addEvent(_deviceModule, "onHdrChanged", "Device");
	_addMethodNoParams(_deviceModule, "dolbyAtmosExperienceAvailable", "Device");
	_addEvent(_deviceModule, "onDolbyAtmosExperienceAvailableChanged", "Device");
	_addMethodNoParams(_deviceModule, "brandName", "Device");
	_addMethodNoParams(_deviceModule, "modelId", "Device");
	_addMethodNoParams(_deviceModule, "osName", "Device");
	_addMethodNoParams(_deviceModule, "osVersion", "Device");
	_addMethodNoParams(_deviceModule, "firmware", "Device");
	_addMethodNoParams(_deviceModule, "name", "Device");
	_addEvent(_deviceModule, "onNameChanged", "Device");
	_registerModule("Device", _deviceModule);
	var _discoveryModule = Object.create(null);
	_addMethodWithObjectParam(_discoveryModule, "watched", "Discovery");
	_registerModule("Discovery", _discoveryModule);
	var _displayModule = Object.create(null);
	_addMethodNoParams(_displayModule, "colorimetry", "Display");
	_addMethodNoParams(_displayModule, "videoResolutions", "Display");
	_registerModule("Display", _displayModule);
	var _localizationModule = Object.create(null);
	_addMethodNoParams(_localizationModule, "country", "Localization");
	_addEvent(_localizationModule, "onCountryChanged", "Localization");
	_addMethodNoParams(_localizationModule, "preferredAudioLanguages", "Localization");
	_addEvent(_localizationModule, "onPreferredAudioLanguagesChanged", "Localization");
	_addMethodNoParams(_localizationModule, "presentationLanguage", "Localization");
	_addEvent(_localizationModule, "onPresentationLanguageChanged", "Localization");
	_addMethodNoParams(_localizationModule, "timeZone", "Localization");
	_addEvent(_localizationModule, "onTimeZoneChanged", "Localization");
	_registerModule("Localization", _localizationModule);
	var _metricsModule = Object.create(null);
	_addMethodNoParams(_metricsModule, "ready", "Metrics");
	_addMethodNoParams(_metricsModule, "signIn", "Metrics");
	_addMethodNoParams(_metricsModule, "signOut", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "startContent", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "stopContent", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "page", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "error", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaLoadStart", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaPlay", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaPause", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaWaiting", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaSeeking", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaSeeked", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaRateChanged", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaRenditionChanged", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "mediaEnded", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "event", "Metrics");
	_addMethodWithObjectParam(_metricsModule, "appInfo", "Metrics");
	_registerModule("Metrics", _metricsModule);
	var _networkModule = Object.create(null);
	_addMethodNoParams(_networkModule, "connected", "Network");
	_addEvent(_networkModule, "onConnectedChanged", "Network");
	_registerModule("Network", _networkModule);
	var _videoOutputModule = Object.create(null);
	_addMethodNoParams(_videoOutputModule, "resolution", "VideoOutput");
	_addEvent(_videoOutputModule, "onResolutionChanged", "VideoOutput");
	_addMethodNoParams(_videoOutputModule, "hdcp", "VideoOutput");
	_addEvent(_videoOutputModule, "onHdcpChanged", "VideoOutput");
	_registerModule("VideoOutput", _videoOutputModule);
	Object.defineProperty(_fireboltRegistry, "cleanup", {
		value: function() {
			// only cleans up local state, not the global firebolt object
			reset();
		},
		writable: false,
		enumerable: true,
		configurable: false
	});

	function _addExtensions() {
		if (_extensionSchema) {
			var methodCheck = function(method) {
				return typeof method === "string" && method.length > 0
			};
			var fullcheck = function(module, method) {
				return methodCheck(method) && (!_fireboltRegistry[module] || !_fireboltRegistry[module][method])
			};
			var loadMethods = function(obj, mfn, ifn, moduleName) {
				if (_commonArrayCheck(obj)) {
					obj.forEach(o => {
						var c = mfn(o);
						if (fullcheck(moduleName, c)) {
							ifn(o, c);
							console.log("Extended Method " + c + " added to module " + moduleName)
						} else {
							console.warn("Method " + c + " already exists in module " + moduleName)
						}
					})
				}
			};
			_extensionSchema.forEach(schema => {
				if (schema) {
					if (typeof schema.name === "string" && schema.name.length > 0) {
						let moduleName = schema.name;
						var existingModule = false;
						if (_fireboltRegistry[moduleName]) {
							existingModule = true
						}
						let module = _fireboltRegistry[moduleName] || Object.create(null);
						loadMethods(schema.methods, method => method, (o, c) => _addMethodNoParams(module, c, moduleName), moduleName);
						loadMethods(schema.events, event => event, (o, c) => _addEvent(module, c, moduleName), moduleName);
						loadMethods(schema.methodsWithObject, method => method, (o, c) => _addMethodWithObjectParam(module, c, moduleName), moduleName);
						if (!existingModule) {
							_registerModule(moduleName, module)
						}
					}
				}
			})
		}
	}

	function _buildFireboltInstance() {
		_addExtensions();
		_fireboltInstance = Object.freeze(_fireboltRegistry);
		return _fireboltInstance
	}

	function clearPendingCalls() {
		for (var id in _pendingCalls) {
			var pending = _pendingCalls[id];
			pending.reject(new Error("Disconnected"))
		}
		_pendingCalls = Object.create(null);
	}

	function clearEventListeners() {
		const eventListeners = Object.assign({}, _eventListeners);
		_eventListeners = Object.create(null);
		for (var eventName in eventListeners) {
			for (var i = 0; i < eventListeners[eventName].length; i++) {
				console.warn("send cancelled event to listener for " + eventName);
				eventListeners[eventName][i](null, true);
			}
		}
	}

	function reset() {
		clearEventListeners();
		clearPendingCalls();
	}

	return function({
		transport,
		extensionSchema,
		enableDebug
	}) {
		if (!transport) {
			throw new Error("Transport is required")
		}
		if (typeof extensionSchema === "string" && extensionSchema.length > 0) {
			try {
				let parsedExtensionSchema = _commonParse(extensionSchema);
				if (_commonArrayCheck(parsedExtensionSchema)) {
					_extensionSchema = parsedExtensionSchema
				} else {
					console.warn("invalid extension after parsing")
				}
			} catch (error) {
				console.warn("Error parsing extension schema: " + error);
			}
		}
	
		var requiredMethods = ["send", "open", "close"];
		for (var i = 0; i < requiredMethods.length; i++) {
			var method = requiredMethods[i];
			if (!transport[method]) {
				throw new Error("Transport object must have a '" + method + "' method. " + "Missing method: " + method);
			} else {
				if (typeof transport[method] === "function") {
					continue;
				} else {
					throw new Error("Transport object must have a '" + method + "' method. " + "Missing or invalid method: " + method);
				}
			}
		}
		_transport = transport;

		if (enableDebug && enableDebug === true) {
			_debug = true;
			window.___fireboltTransport___ = _transport;
		}
		return {
			build: function() {
				if (_connected && _fireboltInstance) {
					return Promise.resolve(_fireboltInstance)
				}
				let rejectFn;
				var p = new Promise(function(resolve, reject) {
					rejectFn = reject;
					_connectionResolvers.push(resolve)
				});
				if (!_connecting) {
					if (!_transportSet) {
						_transport.onMessage = _onMessage;
						_transport.onOpen = _onOpen;
						_transport.onClose = _onClose;
						_transport.onError = _onError;
						_transportSet = true;
					}
					try {
						_connect();
					} catch (e) {
						rejectFn(e);
					}
				}
				return p
			}
		}
	}
})();
