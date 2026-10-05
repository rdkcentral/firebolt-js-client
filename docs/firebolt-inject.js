(function(global) {

  "use strict";

  // ---------------------------------------------------------------------------
  // Common function references
  // ---------------------------------------------------------------------------
  let _commonStringify = JSON.stringify;
  let _commonParse = JSON.parse;
  let _commonArrayCheck = Array.isArray;

  // ---------------------------------------------------------------------------
  // Private state
  // ---------------------------------------------------------------------------
  var _transport = null;
  var _transportSet = false;
  var _connecting = false;
  var _connected = false;
  var _fireboltInstance = null;
  var _connectionResolvers = [];
  var _connectionRejectors = [];
  var _nextId = 1;
  var _pendingCalls = Object.create(null);
  var _eventListeners = Object.create(null);
  var _extensionSchema = null;
  var _debug = false;
  var _VERSION = "9.0";

  // ---------------------------------------------------------------------------
  // Transport layer
  // ---------------------------------------------------------------------------
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
          cbs[i](payload, false)
        }
      }
    }
  }

  function _onOpen() {
    console.log("Firebolt transport opened");
    _connected = true;
    _connecting = false;
    if (!_fireboltInstance) {
      _fireboltInstance = _buildFireboltInstance()
    }
    var resolvers = _connectionResolvers.splice(0);
    _connectionRejectors.splice(0);
    for (var i = 0; i < resolvers.length; i++) {
      resolvers[i](_fireboltInstance)
    }
  }

  function _onClose() {
    console.log("Firebolt transport closed");
    _connected = false;
    _connecting = false;
  }

  function _onError(error) {
    console.error("Firebolt transport error:", error);
    clearPendingCalls();
    clearEventListeners();
    _connected = false;
    try {
      _connect()
    } catch (error) {
      var rejectors = _connectionRejectors.splice(0);
      _connectionResolvers.splice(0);
      for (var i = 0; i < rejectors.length; i++) {
        rejectors[i](error)
      }
      throw error;
    }
  }

  function _connect() {
    if (_connected){
      return false;
    }
    _connecting = true;
    try {
      _transport.open();
    } catch (error) {
      _connecting = false;
      throw error;
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
            resolve: function(){},
            reject: function(){}
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

  // ---------------------------------------------------------------------------
  // Stub factories
  // ---------------------------------------------------------------------------
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

  function _addMethodWithPrimitiveWrap(module, methodName, moduleName, paramName) {
    Object.defineProperty(module, methodName, {
      value: function(primitiveValue) {
        return _rpcCall(moduleName + "." + methodName, { [paramName]: primitiveValue });
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

  // ---------------------------------------------------------------------------
  // Extension schema loading
  // ---------------------------------------------------------------------------
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
            // Extension schemas can specify methodsWithPrimitiveWrap as array of { method, param } objects
            if (schema.methodsWithPrimitiveWrap && _commonArrayCheck(schema.methodsWithPrimitiveWrap)) {
              schema.methodsWithPrimitiveWrap.forEach(item => {
                if (item && item.method && item.param) {
                  var c = item.method;
                  if (fullcheck(moduleName, c)) {
                    _addMethodWithPrimitiveWrap(module, c, moduleName, item.param);
                    console.log("Extended Method " + c + " added to module " + moduleName + " with primitive-wrap pattern");
                  } else {
                    console.warn("Method " + c + " already exists in module " + moduleName);
                  }
                }
              });
            }
            if (!existingModule) {
              _registerModule(moduleName, module)
            }
          }
        }
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Registry and instance building
  // ---------------------------------------------------------------------------
  var _fireboltRegistry = Object.create(null);

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
    var eventListeners = _eventListeners;
    _eventListeners = Object.create(null);
    for (var eventName in eventListeners) {
      for (var i = 0; i < eventListeners[eventName].length; i++) {
        try {
          eventListeners[eventName][i](null, true);
        } catch (error) {
          console.error("Firebolt event cancellation callback failed:", error);
        }
      }
    }
  }


  // --- Static module definitions ---
  // Module: Accessibility
  var _Accessibility = Object.create(null);
  _addMethodNoParams(_Accessibility, "audioDescription", "Accessibility");
  _addEvent(_Accessibility, "onAudioDescriptionChanged", "Accessibility");
  _addMethodNoParams(_Accessibility, "closedCaptionsSettings", "Accessibility");
  _addEvent(_Accessibility, "onClosedCaptionsSettingsChanged", "Accessibility");
  _addMethodNoParams(_Accessibility, "highContrastUI", "Accessibility");
  _addEvent(_Accessibility, "onHighContrastUIChanged", "Accessibility");
  _addMethodNoParams(_Accessibility, "voiceGuidanceSettings", "Accessibility");
  _addEvent(_Accessibility, "onVoiceGuidanceSettingsChanged", "Accessibility");
  _registerModule("Accessibility", _Accessibility);

  // Module: Actions
  var _Actions = Object.create(null);
  _addMethodWithObjectParam(_Actions, "start", "Actions");
  _addMethodNoParams(_Actions, "intent", "Actions");
  _addEvent(_Actions, "onIntent", "Actions");
  _registerModule("Actions", _Actions);

  // Module: Advertising
  var _Advertising = Object.create(null);
  _addMethodNoParams(_Advertising, "advertisingId", "Advertising");
  _registerModule("Advertising", _Advertising);

  // Module: Device
  var _Device = Object.create(null);
  _addMethodNoParams(_Device, "uid", "Device");
  _addMethodNoParams(_Device, "deviceClass", "Device");
  _addMethodNoParams(_Device, "brandName", "Device");
  _addMethodNoParams(_Device, "modelId", "Device");
  _addMethodNoParams(_Device, "osName", "Device");
  _addMethodNoParams(_Device, "osVersion", "Device");
  _addMethodNoParams(_Device, "firmware", "Device");
  _addMethodNoParams(_Device, "name", "Device");
  _addEvent(_Device, "onNameChanged", "Device");
  _addMethodNoParams(_Device, "hdr", "Device");
  _addEvent(_Device, "onHdrChanged", "Device");
  _addMethodNoParams(_Device, "dolbyAtmosExperienceAvailable", "Device");
  _addEvent(_Device, "onDolbyAtmosExperienceAvailableChanged", "Device");
  _registerModule("Device", _Device);

  // Module: Discovery
  var _Discovery = Object.create(null);
  _addMethodWithObjectParam(_Discovery, "watched", "Discovery");
  _registerModule("Discovery", _Discovery);

  // Module: Display
  var _Display = Object.create(null);
  _addMethodNoParams(_Display, "colorimetry", "Display");
  _addMethodNoParams(_Display, "videoResolutions", "Display");
  _registerModule("Display", _Display);

  // Module: Localization
  var _Localization = Object.create(null);
  _addMethodNoParams(_Localization, "country", "Localization");
  _addEvent(_Localization, "onCountryChanged", "Localization");
  _addMethodNoParams(_Localization, "preferredAudioLanguages", "Localization");
  _addEvent(_Localization, "onPreferredAudioLanguagesChanged", "Localization");
  _addMethodNoParams(_Localization, "presentationLanguage", "Localization");
  _addEvent(_Localization, "onPresentationLanguageChanged", "Localization");
  _registerModule("Localization", _Localization);

  // Module: Metrics
  var _Metrics = Object.create(null);
  _addMethodNoParams(_Metrics, "ready", "Metrics");
  _addMethodWithObjectParam(_Metrics, "startContent", "Metrics");
  _addMethodWithObjectParam(_Metrics, "stopContent", "Metrics");
  _addMethodWithObjectParam(_Metrics, "page", "Metrics");
  _addMethodWithObjectParam(_Metrics, "error", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaLoadStart", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaPlay", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaPlaying", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaPause", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaWaiting", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaSeeking", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaSeeked", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaRateChanged", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaRenditionChanged", "Metrics");
  _addMethodWithObjectParam(_Metrics, "mediaEnded", "Metrics");
  _addMethodWithObjectParam(_Metrics, "event", "Metrics");
  _addMethodWithPrimitiveWrap(_Metrics, "appInfo", "Metrics", "build");
  _registerModule("Metrics", _Metrics);

  // Module: Network
  var _Network = Object.create(null);
  _addMethodNoParams(_Network, "connected", "Network");
  _addEvent(_Network, "onConnectedChanged", "Network");
  _registerModule("Network", _Network);

  // Module: VideoOutput
  var _VideoOutput = Object.create(null);
  _addMethodNoParams(_VideoOutput, "resolution", "VideoOutput");
  _addEvent(_VideoOutput, "onResolutionChanged", "VideoOutput");
  _addMethodNoParams(_VideoOutput, "hdcp", "VideoOutput");
  _addEvent(_VideoOutput, "onHdcpChanged", "VideoOutput");
  _registerModule("VideoOutput", _VideoOutput);

  // --- End static module definitions ---

  Object.defineProperty(_fireboltRegistry, "cleanup", {
    value: function() {
      clearEventListeners();
      clearPendingCalls();
    },
    writable: false,
    enumerable: true,
    configurable: false
  });

  var factory = function({
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
  
    var requiredMethods = ["send", "open"];
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
        var connectionResolver;
        var rejectBuild;
        var p = new Promise(function(resolve, reject) {
          connectionResolver = resolve;
          rejectBuild = reject;
          _connectionResolvers.push(resolve);
          _connectionRejectors.push(reject)
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
          } catch (error) {
            var resolverIndex = _connectionResolvers.indexOf(connectionResolver);
            if (resolverIndex !== -1) {
              _connectionResolvers.splice(resolverIndex, 1);
              _connectionRejectors.splice(resolverIndex, 1)
            }
            _connecting = false;
            rejectBuild(error);
          }
        }
        return p
      }
    }
  };

  Object.defineProperty(global, "factory", {
    value: factory,
    writable: false,
    configurable: false,
    enumerable: true
  });

  return factory;

})(typeof globalThis !== "undefined" ? globalThis : window);