var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/shared/constants.ts
var PLUGIN_NAME = "altv-esbuild";
var RESOURCE_CONTROL_ALTV_NAME = "__altv-esbuild-resource-control";

// src/shared/net-event-manager/class.ts
var EventManager = class {
  receiver;
  sender;
  constructor(communicator, handlers, onError) {
    if (this.isCommunicatorSenderAndReceiver(communicator)) {
      this.sender = communicator.sender ?? null;
      this.receiver = communicator.receiver ?? null;
    } else {
      this.sender = communicator;
      this.receiver = communicator;
    }
    this.receiver?.on("data", (data) => {
      data = data.toString();
      for (const chunk of data.split("|")) {
        if (!chunk)
          continue;
        try {
          const {
            event,
            args
          } = JSON.parse(chunk);
          const handler = handlers[event];
          if (!handler) {
            onError(`received unknown event: ${event}`);
            return;
          }
          handler(...args);
        } catch (e) {
          onError(`failed to handle chunk: '${chunk}' error: ${e?.stack}`);
        }
      }
    });
    this.receiver?.on("error", (e) => {
      if (e?.code === "ECONNRESET" || e?.code === "ECONNREFUSED") {
        console.log("[DEBUG] [EventManager] socket disconnect");
        return;
      }
      onError(`socket error: ${e.stack}`, e);
    });
  }
  send(event, ...args) {
    if (!this.sender)
      throw new Error("EventManager cannot send since sender was not provided");
    const eventJSON = {
      args,
      event
    };
    this.sender.write(JSON.stringify(eventJSON) + "|");
  }
  destroy() {
    this.receiver?.removeAllListeners("data");
    this.receiver?.removeAllListeners("error");
  }
  isCommunicatorSenderAndReceiver(value) {
    return !!(value["sender"] || value["receiver"]);
  }
};

// src/altv-inject/shared/logger.ts
var alt = ___altvEsbuild_altvInject_alt___;
var Logger = class {
  constructor(name) {
    this.name = name;
    if (true) {
      this.debug = (...args) => {
        this.info("[DEBUG]", ...args);
      };
    } else
      this.debug = () => {
      };
  }
  debug;
  info(...args) {
    alt.log(`~bl~[${PLUGIN_NAME}][${this.name}]~w~`, ...args);
  }
  error(...args) {
    alt.logError(`[${PLUGIN_NAME}][${this.name}]`, ...args);
  }
  warn(...args) {
    alt.logWarning(`[${PLUGIN_NAME}][${this.name}]`, ...args);
  }
};

// src/altv-inject/shared/util-inspect.ts
var primordials = {};
var colorRegExp = /\u001b\[\d\d?m/g;
var {
  defineProperty: ReflectDefineProperty,
  getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
  ownKeys: ReflectOwnKeys
} = Reflect;
var { apply, bind, call } = Function.prototype;
var uncurryThis = bind.bind(call);
primordials.uncurryThis = uncurryThis;
var applyBind = bind.bind(apply);
primordials.applyBind = applyBind;
var varargsMethods = [
  // 'ArrayPrototypeConcat' is omitted, because it performs the spread
  // on its own for arrays and array-likes with a truthy
  // @@isConcatSpreadable symbol property.
  "ArrayOf",
  "ArrayPrototypePush",
  "ArrayPrototypeUnshift",
  // 'FunctionPrototypeCall' is omitted, since there's 'ReflectApply'
  // and 'FunctionPrototypeApply'.
  "MathHypot",
  "MathMax",
  "MathMin",
  "StringPrototypeConcat",
  "TypedArrayOf"
];
function getNewKey(key) {
  return typeof key === "symbol" ? `Symbol${key.description[7].toUpperCase()}${key.description.slice(8)}` : `${key[0].toUpperCase()}${key.slice(1)}`;
}
function copyAccessor(dest, prefix, key, { enumerable, get, set }) {
  ReflectDefineProperty(dest, `${prefix}Get${key}`, {
    __proto__: null,
    value: uncurryThis(get),
    enumerable
  });
  if (set !== void 0) {
    ReflectDefineProperty(dest, `${prefix}Set${key}`, {
      __proto__: null,
      value: uncurryThis(set),
      enumerable
    });
  }
}
function copyPropsRenamed(src, dest, prefix) {
  for (const key of ReflectOwnKeys(src)) {
    const newKey = getNewKey(key);
    const desc = ReflectGetOwnPropertyDescriptor(src, key);
    if ("get" in desc)
      copyAccessor(dest, prefix, newKey, desc);
    else {
      const name = `${prefix}${newKey}`;
      ReflectDefineProperty(dest, name, { __proto__: null, ...desc });
      if (varargsMethods.includes(name)) {
        ReflectDefineProperty(dest, `${name}Apply`, {
          __proto__: null,
          // `src` is bound as the `this` so that the static `this` points
          // to the object it was defined on,
          // e.g.: `ArrayOfApply` gets a `this` of `Array`:
          value: applyBind(desc.value, src)
        });
      }
    }
  }
}
function copyPropsRenamedBound(src, dest, prefix) {
  for (const key of ReflectOwnKeys(src)) {
    const newKey = getNewKey(key);
    const desc = ReflectGetOwnPropertyDescriptor(src, key);
    if ("get" in desc)
      copyAccessor(dest, prefix, newKey, desc);
    else {
      const { value } = desc;
      if (typeof value === "function")
        desc.value = value.bind(src);
      const name = `${prefix}${newKey}`;
      ReflectDefineProperty(dest, name, { __proto__: null, ...desc });
      if (varargsMethods.includes(name)) {
        ReflectDefineProperty(dest, `${name}Apply`, {
          __proto__: null,
          value: applyBind(value, src)
        });
      }
    }
  }
}
function copyPrototype(src, dest, prefix) {
  for (const key of ReflectOwnKeys(src)) {
    const newKey = getNewKey(key);
    const desc = ReflectGetOwnPropertyDescriptor(src, key);
    if ("get" in desc)
      copyAccessor(dest, prefix, newKey, desc);
    else {
      const { value } = desc;
      if (typeof value === "function")
        desc.value = uncurryThis(value);
      const name = `${prefix}${newKey}`;
      ReflectDefineProperty(dest, name, { __proto__: null, ...desc });
      if (varargsMethods.includes(name)) {
        ReflectDefineProperty(dest, `${name}Apply`, {
          __proto__: null,
          value: applyBind(value)
        });
      }
    }
  }
}
["Proxy", "globalThis"].forEach((name) => {
  primordials[name] = globalThis[name];
});
[decodeURI, decodeURIComponent, encodeURI, encodeURIComponent].forEach((fn) => {
  primordials[fn.name] = fn;
});
[escape, eval, unescape].forEach((fn) => {
  primordials[fn.name] = fn;
});
["JSON", "Math", "Proxy", "Reflect"].forEach((name) => {
  copyPropsRenamed(globalThis[name], primordials, name);
});
[
  "AggregateError",
  "Array",
  "ArrayBuffer",
  "BigInt",
  "BigInt64Array",
  "BigUint64Array",
  "Boolean",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "FinalizationRegistry",
  "Float32Array",
  "Float64Array",
  "Function",
  "Int16Array",
  "Int32Array",
  "Int8Array",
  "Map",
  "Number",
  "Object",
  "RangeError",
  "ReferenceError",
  "RegExp",
  "Set",
  "String",
  "Symbol",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Uint16Array",
  "Uint32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "WeakMap",
  "WeakRef",
  "WeakSet"
].forEach((name) => {
  const original = globalThis[name];
  primordials[name] = original;
  copyPropsRenamed(original, primordials, name);
  copyPrototype(original.prototype, primordials, `${name}Prototype`);
});
["Promise"].forEach((name) => {
  const original = globalThis[name];
  primordials[name] = original;
  copyPropsRenamedBound(original, primordials, name);
  copyPrototype(original.prototype, primordials, `${name}Prototype`);
});
[
  { name: "TypedArray", original: Reflect.getPrototypeOf(Uint8Array) },
  {
    name: "ArrayIterator",
    original: {
      prototype: Reflect.getPrototypeOf(Array.prototype[Symbol.iterator]())
    }
  },
  {
    name: "StringIterator",
    original: {
      prototype: Reflect.getPrototypeOf(String.prototype[Symbol.iterator]())
    }
  }
].forEach(({ name, original }) => {
  primordials[name] = original;
  copyPrototype(original, primordials, name);
  copyPrototype(original.prototype, primordials, `${name}Prototype`);
});
var {
  ArrayPrototypeForEach = Array.prototype.forEach.call,
  FinalizationRegistry = FinalizationRegistry,
  FunctionPrototypeCall = Function.prototype.call,
  Map: Map2 = Map2,
  ObjectFreeze = Object2.freeze.call,
  ObjectSetPrototypeOf = Object2.setPrototypeOf,
  Promise: Promise2 = Promise2,
  PromisePrototypeThen = Promise2.prototype.then,
  Set: Set2 = Set2,
  SymbolIterator = Symbol.iterator,
  WeakMap = WeakMap,
  WeakRef = WeakRef,
  WeakSet: WeakSet2 = WeakSet2
} = primordials;
var createSafeIterator = (factory, next) => {
  class SafeIterator {
    constructor(iterable) {
      this._iterator = factory(iterable);
    }
    next() {
      return next(this._iterator);
    }
    [SymbolIterator]() {
      return this;
    }
  }
  ObjectSetPrototypeOf(SafeIterator.prototype, null);
  ObjectFreeze(SafeIterator.prototype);
  ObjectFreeze(SafeIterator);
  return SafeIterator;
};
primordials.SafeArrayIterator = createSafeIterator(
  primordials.ArrayPrototypeSymbolIterator,
  primordials.ArrayIteratorPrototypeNext
);
primordials.SafeStringIterator = createSafeIterator(
  primordials.StringPrototypeSymbolIterator,
  primordials.StringIteratorPrototypeNext
);
var copyProps = (src, dest) => {
  ArrayPrototypeForEach(ReflectOwnKeys(src), (key) => {
    if (!ReflectGetOwnPropertyDescriptor(dest, key)) {
      ReflectDefineProperty(dest, key, {
        __proto__: null,
        ...ReflectGetOwnPropertyDescriptor(src, key)
      });
    }
  });
};
var makeSafe = (unsafe, safe) => {
  if (SymbolIterator in unsafe.prototype) {
    const dummy = new unsafe();
    let next;
    ArrayPrototypeForEach(ReflectOwnKeys(unsafe.prototype), (key) => {
      if (!ReflectGetOwnPropertyDescriptor(safe.prototype, key)) {
        const desc = ReflectGetOwnPropertyDescriptor(unsafe.prototype, key);
        if (typeof desc.value === "function" && desc.value.length === 0 && SymbolIterator in (FunctionPrototypeCall(desc.value, dummy) ?? {})) {
          const createIterator = uncurryThis(desc.value);
          next ??= uncurryThis(createIterator(dummy).next);
          const SafeIterator = createSafeIterator(createIterator, next);
          desc.value = function() {
            return new SafeIterator(this);
          };
        }
        ReflectDefineProperty(safe.prototype, key, {
          __proto__: null,
          ...desc
        });
      }
    });
  } else
    copyProps(unsafe.prototype, safe.prototype);
  copyProps(unsafe, safe);
  ObjectSetPrototypeOf(safe.prototype, null);
  ObjectFreeze(safe.prototype);
  ObjectFreeze(safe);
  return safe;
};
primordials.makeSafe = makeSafe;
primordials.SafeMap = makeSafe(
  Map2,
  class SafeMap extends Map2 {
    constructor(i) {
      super(i);
    }
    // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeWeakMap = makeSafe(
  WeakMap,
  class SafeWeakMap extends WeakMap {
    constructor(i) {
      super(i);
    }
    // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeSet = makeSafe(
  Set2,
  class SafeSet extends Set2 {
    constructor(i) {
      super(i);
    }
    // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeWeakSet = makeSafe(
  WeakSet2,
  class SafeWeakSet extends WeakSet2 {
    constructor(i) {
      super(i);
    }
    // eslint-disable-line no-useless-constructor
  }
);
primordials.SafeFinalizationRegistry = makeSafe(
  FinalizationRegistry,
  class SafeFinalizationRegistry extends FinalizationRegistry {
    // eslint-disable-next-line no-useless-constructor
    constructor(cleanupCallback) {
      super(cleanupCallback);
    }
  }
);
primordials.SafeWeakRef = makeSafe(
  WeakRef,
  class SafeWeakRef extends WeakRef {
    // eslint-disable-next-line no-useless-constructor
    constructor(target) {
      super(target);
    }
  }
);
var SafePromise = makeSafe(
  Promise2,
  class SafePromise2 extends Promise2 {
    // eslint-disable-next-line no-useless-constructor
    constructor(executor) {
      super(executor);
    }
  }
);
primordials.PromisePrototypeCatch = (thisPromise, onRejected) => PromisePrototypeThen(thisPromise, void 0, onRejected);
primordials.SafePromisePrototypeFinally = (thisPromise, onFinally) => (
  // Wrapping on a new Promise is necessary to not expose the SafePromise
  // prototype to user-land.
  new Promise2(
    (a, b) => new SafePromise((a2, b2) => PromisePrototypeThen(thisPromise, a2, b2)).finally(onFinally).then(a, b)
  )
);
primordials.AsyncIteratorPrototype = primordials.ReflectGetPrototypeOf(
  primordials.ReflectGetPrototypeOf(async function* () {
  }).prototype
);
ObjectSetPrototypeOf(primordials, null);
ObjectFreeze(primordials);
var {
  getOwnNonIndexProperties,
  getProxyDetails = () => void 0,
  kPending = 0,
  kFulfilled = 1,
  kRejected = 2,
  previewEntries,
  getConstructorName: internalGetConstructorName,
  // v8::External shit
  // getExternalValue,
  propertyFilter: { ALL_PROPERTIES, ONLY_ENUMERABLE } = {
    ALL_PROPERTIES: 0,
    ONLY_ENUMERABLE: 2
  }
} = (
  /* internalBinding('util') */
  {}
);
var custom_getOwnNonIndexProperties = (obj, filter) => {
  if (filter === ALL_PROPERTIES)
    return Object2.getOwnPropertyNames(obj);
  else if (ONLY_ENUMERABLE)
    return Array.isArray(obj) ? [] : Object2.keys(obj);
  else
    throw new Error("unknown filter");
};
getOwnNonIndexProperties = custom_getOwnNonIndexProperties;
var custom_internalGetConstructorName = (obj) => {
  return obj?.constructor?.name ?? "<UNKNOWN CONSTRUCTOR NAME>";
};
internalGetConstructorName = custom_internalGetConstructorName;
var custom_previewEntries = (obj) => {
  const isKeyValue = obj instanceof Map2;
  let entries = [];
  if (!(obj instanceof Map2 || obj instanceof Set2))
    return [entries, isKeyValue];
  try {
    entries = obj.entries();
  } catch (e) {
    console.error("custom_previewEntries", e.stack);
  }
  return [entries, isKeyValue];
};
previewEntries = custom_previewEntries;
var TypedArrayPrototype = Uint8Array.prototype.__proto__;
var {
  ArrayIsArray = Array.isArray,
  ArrayPrototypeFilter = Array.prototype.filter.call,
  ArrayPrototypePop = Array.prototype.pop.call,
  ArrayPrototypePush = Array.prototype.push.call,
  ArrayPrototypePushApply = Array.prototype.push.apply,
  ArrayPrototypeSort = Array.prototype.sort.call,
  ArrayPrototypeUnshift = Array.prototype.unshift.call,
  BigIntPrototypeValueOf = BigInt.prototype.valueOf.call,
  BooleanPrototypeValueOf = Boolean.prototype.valueOf.call,
  DatePrototypeGetTime = Date.prototype.getTime.call,
  DatePrototypeToISOString = Date.prototype.toISOString.call,
  DatePrototypeToString = Date.prototype.toString.call,
  ErrorPrototypeToString = Error.prototype.toString.call,
  FunctionPrototypeToString = Function.prototype.toString.call,
  JSONStringify = JSON.stringify,
  MapPrototypeGetSize = Object2.getOwnPropertyDescriptor(Map2.prototype, "size").get.call,
  MapPrototypeEntries = Map2.prototype.entries.call,
  MathFloor = Math.floor,
  MathMax = Math.max,
  MathMin = Math.min,
  MathRound = Math.round,
  MathSqrt = Math.sqrt,
  MathTrunc = Math.trunc,
  Number = Number,
  NumberIsFinite = Number.isFinite,
  NumberIsNaN = isNaN,
  NumberParseFloat = parseFloat,
  NumberParseInt = parseInt,
  NumberPrototypeValueOf = Number.prototype.valueOf.call,
  Object: Object2 = Object2,
  ObjectAssign = Object2.assign,
  ObjectCreate = Object2.create,
  ObjectDefineProperty = Object2.defineProperty,
  ObjectGetOwnPropertyDescriptor = Object2.getOwnPropertyDescriptor,
  ObjectGetOwnPropertyNames = Object2.getOwnPropertyNames,
  ObjectGetOwnPropertySymbols = Object2.getOwnPropertySymbols,
  ObjectGetPrototypeOf = Object2.getPrototypeOf,
  ObjectIs = Object2.is,
  ObjectKeys = Object2.keys,
  ObjectPrototypeHasOwnProperty = Object2.prototype.hasOwnProperty.call,
  ObjectPrototypePropertyIsEnumerable = Object2.prototype.propertyIsEnumerable.call,
  ObjectSeal = Object2.seal,
  RegExp = RegExp,
  RegExpPrototypeExec = RegExp.prototype.exec.call,
  RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace].call,
  RegExpPrototypeToString = RegExp.prototype.toString.call,
  SafeStringIterator,
  SafeMap: SafeMap2,
  SafeSet: SafeSet2,
  SetPrototypeGetSize = Object2.getOwnPropertyDescriptor(Set2.prototype, "size").get.call,
  SetPrototypeValues = Set2.prototype.values.call,
  StringPrototypeCharCodeAt = String.prototype.charCodeAt.call,
  StringPrototypeCodePointAt = String.prototype.codePointAt.call,
  StringPrototypeIncludes = String.prototype.includes.call,
  StringPrototypeNormalize = String.prototype.normalize.call,
  StringPrototypePadEnd = String.prototype.padEnd.call,
  StringPrototypePadStart = String.prototype.padStart.call,
  StringPrototypeRepeat = String.prototype.repeat.call,
  StringPrototypeSlice = String.prototype.slice.call,
  StringPrototypeSplit = String.prototype.split.call,
  StringPrototypeToLowerCase = String.prototype.toLowerCase.call,
  StringPrototypeTrim = String.prototype.trim.call,
  StringPrototypeValueOf = String.prototype.valueOf.call,
  SymbolPrototypeToString = Symbol.prototype.toString.call,
  SymbolPrototypeValueOf = Symbol.prototype.valueOf.call,
  SymbolToStringTag = Symbol.toStringTag,
  TypedArrayPrototypeGetLength = Object2.getOwnPropertyDescriptor(
    TypedArrayPrototype,
    "length"
  ).get.call,
  TypedArrayPrototypeGetSymbolToStringTag = Object2.getOwnPropertyDescriptor(
    TypedArrayPrototype,
    Symbol.toStringTag
  ).get.call
} = primordials;
var {
  customInspectSymbol = Symbol.for("nodejs.util.inspect.custom"),
  isError = (e) => e instanceof Error,
  join,
  removeColors
} = (
  /* require('internal/util') */
  {}
);
function nodejs_join(output, separator) {
  let str = "";
  if (output.length !== 0) {
    const lastIndex = output.length - 1;
    for (let i = 0; i < lastIndex; i++) {
      str += output[i];
      str += separator;
    }
    str += output[lastIndex];
  }
  return str;
}
join = nodejs_join;
function nodejs_removeColors(str) {
  return String.prototype.replace.call(str, colorRegExp, "");
}
removeColors = nodejs_removeColors;
var { isStackOverflowError } = (
  /* require('internal/errors') */
  {}
);
function nodejs_isStackOverflowError(err) {
  if (nodejs_isStackOverflowError.maxStack_ErrorMessage === void 0) {
    try {
      let overflowStack2 = function() {
        overflowStack2();
      };
      var overflowStack = overflowStack2;
      overflowStack2();
    } catch (err2) {
      nodejs_isStackOverflowError.maxStack_ErrorMessage = err2.message;
      nodejs_isStackOverflowError.maxStack_ErrorName = err2.name;
    }
  }
  return err && err.name === nodejs_isStackOverflowError.maxStack_ErrorName && err.message === nodejs_isStackOverflowError.maxStack_ErrorMessage;
}
nodejs_isStackOverflowError.maxStack_ErrorMessage = void 0;
nodejs_isStackOverflowError.maxStack_ErrorName = void 0;
isStackOverflowError = nodejs_isStackOverflowError;
var {
  // will not work for promise functions tho
  isAsyncFunction = (func) => func?.constructor?.name === "AsyncFunction",
  isGeneratorFunction = (func) => func?.constructor?.name === "GeneratorFunction",
  isAnyArrayBuffer = (obj) => obj instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && obj instanceof SharedArrayBuffer,
  isArrayBuffer,
  isArgumentsObject,
  isBoxedPrimitive,
  isDataView,
  // v8::External shit
  isExternal = () => false,
  isMap = (obj) => obj instanceof Map2,
  isMapIterator = (obj) => obj?.toString() === "[object Map Iterator]",
  isModuleNamespaceObject,
  // idk how to add it, maybe `instanceof Error` would be ok?
  isNativeError = (e) => false,
  isPromise = (obj) => obj instanceof Promise2,
  isSet = (obj) => obj instanceof Set2,
  isSetIterator = (obj) => obj?.toString() === "[object Set Iterator]",
  isWeakMap = (obj) => obj instanceof WeakMap,
  isWeakSet = (obj) => obj instanceof WeakSet2,
  isRegExp = (obj) => obj instanceof RegExp,
  isDate = (obj) => obj instanceof Date,
  isTypedArray = (obj) => obj instanceof TypedArrayPrototype.constructor,
  isStringObject = (obj) => typeof obj === "object" && obj != null && obj.constructor === String,
  isNumberObject = (obj) => typeof obj === "object" && obj != null && obj.constructor === Number,
  isBooleanObject = (obj) => typeof obj === "object" && obj != null && obj.constructor === Boolean,
  isBigIntObject = (obj) => typeof obj === "object" && obj != null && obj.constructor === BigInt
} = (
  /* require('internal/util/types') */
  {}
);
var nodejs_isArrayBuffer = (b) => b instanceof ArrayBuffer || typeof b === "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0;
isArrayBuffer = nodejs_isArrayBuffer;
var custom_isArgumentsObject = (obj) => obj + "" === "[object Arguments]" && obj[SymbolIterator] != null;
isArgumentsObject = custom_isArgumentsObject;
var custom_isBoxedPrimitive = (obj) => typeof obj === "object" && obj != null && (obj.constructor === Number || obj.constructor === String || obj.constructor === Boolean || obj.constructor === BigInt || obj.constructor === Symbol);
isBoxedPrimitive = custom_isBoxedPrimitive;
var custom_isDataView = (obj) => obj instanceof DataView;
isDataView = custom_isDataView;
var custom_isModuleNamespaceObject = (obj) => {
  try {
    const descr = obj && Object2.getOwnPropertyDescriptor(obj, Symbol.toStringTag);
    return descr.value === "Module" && !(descr.writable || descr.enumerable || descr.configurable);
  } catch {
    return false;
  }
};
isModuleNamespaceObject = custom_isModuleNamespaceObject;
var ERR_INTERNAL_ASSERTION = class extends Error {
};
function assert(value, message) {
  if (!value)
    throw new ERR_INTERNAL_ASSERTION(message);
}
var NativeModule = {
  exists: () => false
};
function hideStackFrames(fn) {
  const hidden = "__internal_shit__" + fn.name;
  ObjectDefineProperty(fn, "name", { __proto__: null, value: hidden });
  return fn;
}
var validateObject = hideStackFrames((value, name, options2) => {
  const useDefaultOptions = options2 == null;
  const allowArray = useDefaultOptions ? false : options2.allowArray;
  const allowFunction = useDefaultOptions ? false : options2.allowFunction;
  const nullable = useDefaultOptions ? false : options2.nullable;
  if (!nullable && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
    throw new Error(
      `[validateObject] invalid ${name} type of arg, expected: Object`
    );
  }
});
function validateString(value, name) {
  if (typeof value !== "string")
    throw new Error(`value ${name} must be string`);
}
var hexSlice;
var builtInObjects = new SafeSet2(
  ArrayPrototypeFilter(
    ObjectGetOwnPropertyNames(globalThis),
    (e) => RegExpPrototypeExec(/^[A-Z][a-zA-Z0-9]+$/, e) !== null
  )
);
var isUndetectableObject = (v) => typeof v === "undefined" && v !== void 0;
var inspectDefaultOptions = ObjectSeal({
  showHidden: false,
  depth: 2,
  colors: false,
  customInspect: true,
  showProxy: false,
  maxArrayLength: 100,
  maxStringLength: 1e4,
  breakLength: 80,
  compact: 3,
  sorted: false,
  getters: false,
  numericSeparator: false
});
var kObjectType = 0;
var kArrayType = 1;
var kArrayExtrasType = 2;
var strEscapeSequencesRegExp = /[\x00-\x1f\x27\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
var strEscapeSequencesReplacer = /[\x00-\x1f\x27\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
var strEscapeSequencesRegExpSingle = /[\x00-\x1f\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
var strEscapeSequencesReplacerSingle = /[\x00-\x1f\x5c\x7f-\x9f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
var keyStrRegExp = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
var numberRegExp = /^(0|[1-9][0-9]*)$/;
var coreModuleRegExp = /^ {4}at (?:[^/\\(]+ \(|)node:(.+):\d+:\d+\)?$/;
var nodeModulesRegExp = /[/\\]node_modules[/\\](.+?)(?=[/\\])/g;
var classRegExp = /^(\s+[^(]*?)\s*{/;
var stripCommentsRegExp = /(\/\/.*?\n)|(\/\*(.|\n)*?\*\/)/g;
var kMinLineLength = 16;
var kWeak = 0;
var kIterator = 1;
var kMapEntries = 2;
var meta = [
  "\\x00",
  "\\x01",
  "\\x02",
  "\\x03",
  "\\x04",
  "\\x05",
  "\\x06",
  "\\x07",
  // x07
  "\\b",
  "\\t",
  "\\n",
  "\\x0B",
  "\\f",
  "\\r",
  "\\x0E",
  "\\x0F",
  // x0F
  "\\x10",
  "\\x11",
  "\\x12",
  "\\x13",
  "\\x14",
  "\\x15",
  "\\x16",
  "\\x17",
  // x17
  "\\x18",
  "\\x19",
  "\\x1A",
  "\\x1B",
  "\\x1C",
  "\\x1D",
  "\\x1E",
  "\\x1F",
  // x1F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\\'",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // x2F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // x3F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // x4F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\\\\",
  "",
  "",
  "",
  // x5F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // x6F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\\x7F",
  // x7F
  "\\x80",
  "\\x81",
  "\\x82",
  "\\x83",
  "\\x84",
  "\\x85",
  "\\x86",
  "\\x87",
  // x87
  "\\x88",
  "\\x89",
  "\\x8A",
  "\\x8B",
  "\\x8C",
  "\\x8D",
  "\\x8E",
  "\\x8F",
  // x8F
  "\\x90",
  "\\x91",
  "\\x92",
  "\\x93",
  "\\x94",
  "\\x95",
  "\\x96",
  "\\x97",
  // x97
  "\\x98",
  "\\x99",
  "\\x9A",
  "\\x9B",
  "\\x9C",
  "\\x9D",
  "\\x9E",
  "\\x9F"
  // x9F
];
var ansiPattern = "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))";
var ansi = new RegExp(ansiPattern, "g");
var getStringWidth;
function getUserOptions(ctx, isCrossContext) {
  const ret = {
    stylize: ctx.stylize,
    showHidden: ctx.showHidden,
    depth: ctx.depth,
    colors: ctx.colors,
    customInspect: ctx.customInspect,
    showProxy: ctx.showProxy,
    maxArrayLength: ctx.maxArrayLength,
    maxStringLength: ctx.maxStringLength,
    breakLength: ctx.breakLength,
    compact: ctx.compact,
    sorted: ctx.sorted,
    getters: ctx.getters,
    numericSeparator: ctx.numericSeparator,
    ...ctx.userOptions
  };
  if (isCrossContext) {
    ObjectSetPrototypeOf(ret, null);
    for (const key of ObjectKeys(ret)) {
      if ((typeof ret[key] === "object" || typeof ret[key] === "function") && ret[key] !== null)
        delete ret[key];
    }
    ret.stylize = ObjectSetPrototypeOf((value, flavour) => {
      let stylized;
      try {
        stylized = `${ctx.stylize(value, flavour)}`;
      } catch {
      }
      if (typeof stylized !== "string")
        return value;
      return stylized;
    }, null);
  }
  return ret;
}
function inspect(value, opts) {
  const ctx = {
    budget: {},
    indentationLvl: 0,
    seen: [],
    currentDepth: 0,
    stylize: stylizeNoColor,
    showHidden: inspectDefaultOptions.showHidden,
    depth: inspectDefaultOptions.depth,
    colors: inspectDefaultOptions.colors,
    customInspect: inspectDefaultOptions.customInspect,
    showProxy: inspectDefaultOptions.showProxy,
    maxArrayLength: inspectDefaultOptions.maxArrayLength,
    maxStringLength: inspectDefaultOptions.maxStringLength,
    breakLength: inspectDefaultOptions.breakLength,
    compact: inspectDefaultOptions.compact,
    sorted: inspectDefaultOptions.sorted,
    getters: inspectDefaultOptions.getters,
    numericSeparator: inspectDefaultOptions.numericSeparator
  };
  if (arguments.length > 1) {
    if (arguments.length > 2) {
      if (arguments[2] !== void 0)
        ctx.depth = arguments[2];
      if (arguments.length > 3 && arguments[3] !== void 0)
        ctx.colors = arguments[3];
    }
    if (typeof opts === "boolean")
      ctx.showHidden = opts;
    else if (opts) {
      const optKeys = ObjectKeys(opts);
      for (let i = 0; i < optKeys.length; ++i) {
        const key = optKeys[i];
        if (ObjectPrototypeHasOwnProperty(inspectDefaultOptions, key) || key === "stylize")
          ctx[key] = opts[key];
        else if (ctx.userOptions === void 0) {
          ctx.userOptions = opts;
        }
      }
    }
  }
  if (ctx.colors)
    ctx.stylize = stylizeWithColor;
  if (ctx.maxArrayLength === null)
    ctx.maxArrayLength = Infinity;
  if (ctx.maxStringLength === null)
    ctx.maxStringLength = Infinity;
  return formatValue(ctx, value, 0);
}
inspect.custom = customInspectSymbol;
ObjectDefineProperty(inspect, "defaultOptions", {
  __proto__: null,
  get() {
    return inspectDefaultOptions;
  },
  set(options2) {
    validateObject(options2, "options");
    return ObjectAssign(inspectDefaultOptions, options2);
  }
});
inspect.colors = ObjectAssign(ObjectCreate(null), {
  reset: ["w", 0],
  bold: ["wl"],
  dim: ["w"],
  // Alias: faint
  italic: ["w"],
  underline: ["w"],
  blink: ["w"],
  // Swap foreground and background colors
  inverse: ["w"],
  // Alias: swapcolors, swapColors
  hidden: ["w"],
  // Alias: conceal
  strikethrough: ["w"],
  // Alias: strikeThrough, crossedout, crossedOut
  doubleunderline: ["w"],
  // Alias: doubleUnderline
  black: ["k"],
  red: ["rl"],
  green: ["gl"],
  yellow: ["yl"],
  blue: ["bl"],
  magenta: ["ml"],
  cyan: ["cl"],
  white: ["wl"],
  bgBlack: ["w"],
  bgRed: ["w"],
  bgGreen: ["w"],
  bgYellow: ["w"],
  bgBlue: ["w"],
  bgMagenta: ["w"],
  bgCyan: ["w"],
  bgWhite: ["w"],
  framed: ["w"],
  overlined: ["w"],
  gray: ["kl"],
  // Alias: grey, blackBright
  redBright: ["rl"],
  greenBright: ["gl"],
  yellowBright: ["yl"],
  blueBright: ["bl"],
  magentaBright: ["ml"],
  cyanBright: ["cl"],
  whiteBright: ["wl"],
  bgGray: ["kl"],
  // Alias: bgGrey, bgBlackBright
  bgRedBright: ["rl"],
  bgGreenBright: ["gl"],
  bgYellowBright: ["yl"],
  bgBlueBright: ["bl"],
  bgMagentaBright: ["ml"],
  bgCyanBright: ["cl"],
  bgWhiteBright: ["wl"]
});
function defineColorAlias(target, alias) {
  ObjectDefineProperty(inspect.colors, alias, {
    __proto__: null,
    get() {
      return this[target];
    },
    set(value) {
      this[target] = value;
    },
    configurable: true,
    enumerable: false
  });
}
defineColorAlias("gray", "grey");
defineColorAlias("gray", "blackBright");
defineColorAlias("bgGray", "bgGrey");
defineColorAlias("bgGray", "bgBlackBright");
defineColorAlias("dim", "faint");
defineColorAlias("strikethrough", "crossedout");
defineColorAlias("strikethrough", "strikeThrough");
defineColorAlias("strikethrough", "crossedOut");
defineColorAlias("hidden", "conceal");
defineColorAlias("inverse", "swapColors");
defineColorAlias("inverse", "swapcolors");
defineColorAlias("doubleunderline", "doubleUnderline");
inspect.styles = ObjectAssign(ObjectCreate(null), {
  special: "cyan",
  number: "yellow",
  bigint: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  symbol: "green",
  date: "magenta",
  // "name": intentionally not styling
  // TODO(BridgeAR): Highlight regular expressions properly.
  regexp: "red",
  module: "underline"
});
function addQuotes(str, quotes) {
  if (quotes === -1)
    return `"${str}"`;
  if (quotes === -2)
    return `\`${str}\``;
  return `'${str}'`;
}
function escapeFn(str) {
  const charCode = StringPrototypeCharCodeAt(str);
  return meta.length > charCode ? meta[charCode] : `\\u${charCode.toString(16)}`;
}
function strEscape(str) {
  let escapeTest = strEscapeSequencesRegExp;
  let escapeReplace = strEscapeSequencesReplacer;
  let singleQuote = 39;
  if (StringPrototypeIncludes(str, "'")) {
    if (!StringPrototypeIncludes(str, '"'))
      singleQuote = -1;
    else if (!StringPrototypeIncludes(str, "`") && !StringPrototypeIncludes(str, "${"))
      singleQuote = -2;
    if (singleQuote !== 39) {
      escapeTest = strEscapeSequencesRegExpSingle;
      escapeReplace = strEscapeSequencesReplacerSingle;
    }
  }
  if (str.length < 5e3 && RegExpPrototypeExec(escapeTest, str) === null)
    return addQuotes(str, singleQuote);
  if (str.length > 100) {
    str = RegExpPrototypeSymbolReplace(escapeReplace, str, escapeFn);
    return addQuotes(str, singleQuote);
  }
  let result = "";
  let last = 0;
  for (let i = 0; i < str.length; i++) {
    const point = StringPrototypeCharCodeAt(str, i);
    if (point === singleQuote || point === 92 || point < 32 || point > 126 && point < 160) {
      if (last === i)
        result += meta[point];
      else
        result += `${StringPrototypeSlice(str, last, i)}${meta[point]}`;
      last = i + 1;
    } else if (point >= 55296 && point <= 57343) {
      if (point <= 56319 && i + 1 < str.length) {
        const point2 = StringPrototypeCharCodeAt(str, i + 1);
        if (point2 >= 56320 && point2 <= 57343) {
          i++;
          continue;
        }
      }
      result += `${StringPrototypeSlice(str, last, i)}${`\\u${point.toString(
        16
      )}`}`;
      last = i + 1;
    }
  }
  if (last !== str.length)
    result += StringPrototypeSlice(str, last);
  return addQuotes(result, singleQuote);
}
function stylizeWithColor(str, styleType) {
  const style = inspect.styles[styleType];
  if (style !== void 0) {
    const color = inspect.colors[style];
    if (color !== void 0)
      return `~${color[0]}~${str}~w~`;
  }
  return str;
}
function stylizeNoColor(str) {
  return str;
}
function getEmptyFormatArray() {
  return [];
}
function isInstanceof(object, proto) {
  try {
    return object instanceof proto;
  } catch {
    return false;
  }
}
function getConstructorName(obj, ctx, recurseTimes, protoProps) {
  let firstProto;
  const tmp = obj;
  while (obj || isUndetectableObject(obj)) {
    const descriptor = ObjectGetOwnPropertyDescriptor(obj, "constructor");
    if (descriptor !== void 0 && typeof descriptor.value === "function" && descriptor.value.name !== "" && isInstanceof(tmp, descriptor.value)) {
      if (protoProps !== void 0 && (firstProto !== obj || !builtInObjects.has(descriptor.value.name))) {
        addPrototypeProperties(
          ctx,
          tmp,
          firstProto || tmp,
          recurseTimes,
          protoProps
        );
      }
      return String(descriptor.value.name);
    }
    obj = ObjectGetPrototypeOf(obj);
    if (firstProto === void 0)
      firstProto = obj;
  }
  if (firstProto === null)
    return null;
  const res = internalGetConstructorName(tmp);
  if (recurseTimes > ctx.depth && ctx.depth !== null)
    return `${res} <Complex prototype>`;
  const protoConstr = getConstructorName(
    firstProto,
    ctx,
    recurseTimes + 1,
    protoProps
  );
  if (protoConstr === null) {
    return `${res} <${inspect(firstProto, {
      ...ctx,
      customInspect: false,
      depth: -1
    })}>`;
  }
  return `${res} <${protoConstr}>`;
}
function addPrototypeProperties(ctx, main, obj, recurseTimes, output) {
  let depth = 0;
  let keys;
  let keySet;
  do {
    if (depth !== 0 || main === obj) {
      obj = ObjectGetPrototypeOf(obj);
      if (obj === null)
        return;
      const descriptor = ObjectGetOwnPropertyDescriptor(obj, "constructor");
      if (descriptor !== void 0 && typeof descriptor.value === "function" && builtInObjects.has(descriptor.value.name))
        return;
    }
    if (depth === 0)
      keySet = new SafeSet2();
    else
      ArrayPrototypeForEach(keys, (key) => keySet.add(key));
    keys = ReflectOwnKeys(obj);
    ArrayPrototypePush(ctx.seen, main);
    for (const key of keys) {
      if (key === "constructor" || ObjectPrototypeHasOwnProperty(main, key) || depth !== 0 && keySet.has(key))
        continue;
      const desc = ObjectGetOwnPropertyDescriptor(obj, key);
      if (typeof desc.value === "function")
        continue;
      const value = formatProperty(
        ctx,
        obj,
        recurseTimes,
        key,
        kObjectType,
        desc,
        main
      );
      if (ctx.colors) {
        ArrayPrototypePush(output, `\x1B[2m${value}\x1B[22m`);
      } else
        ArrayPrototypePush(output, value);
    }
    ArrayPrototypePop(ctx.seen);
  } while (++depth !== 3);
}
function getPrefix(constructor, tag, fallback, size = "") {
  if (constructor === null) {
    if (tag !== "" && fallback !== tag)
      return `[${fallback}${size}: null prototype] [${tag}] `;
    return `[${fallback}${size}: null prototype] `;
  }
  if (tag !== "" && constructor !== tag)
    return `${constructor}${size} [${tag}] `;
  return `${constructor}${size} `;
}
function getKeys(value, showHidden) {
  let keys;
  const symbols = ObjectGetOwnPropertySymbols(value);
  if (showHidden) {
    keys = ObjectGetOwnPropertyNames(value);
    if (symbols.length !== 0)
      ArrayPrototypePushApply(keys, symbols);
  } else {
    try {
      keys = ObjectKeys(value);
    } catch (err) {
      assert(
        isNativeError(err) && err.name === "ReferenceError" && isModuleNamespaceObject(value)
      );
      keys = ObjectGetOwnPropertyNames(value);
    }
    if (symbols.length !== 0) {
      const filter = (key) => ObjectPrototypePropertyIsEnumerable(value, key);
      ArrayPrototypePushApply(keys, ArrayPrototypeFilter(symbols, filter));
    }
  }
  return keys;
}
function getCtxStyle(value, constructor, tag) {
  let fallback = "";
  if (constructor === null) {
    fallback = internalGetConstructorName(value);
    if (fallback === tag)
      fallback = "Object";
  }
  return getPrefix(constructor, tag, fallback);
}
function formatProxy(ctx, proxy, recurseTimes) {
  if (recurseTimes > ctx.depth && ctx.depth !== null)
    return ctx.stylize("Proxy [Array]", "special");
  recurseTimes += 1;
  ctx.indentationLvl += 2;
  const res = [
    formatValue(ctx, proxy[0], recurseTimes),
    formatValue(ctx, proxy[1], recurseTimes)
  ];
  ctx.indentationLvl -= 2;
  return reduceToSingleString(
    ctx,
    res,
    "",
    ["Proxy [", "]"],
    kArrayExtrasType,
    recurseTimes
  );
}
function formatValue(ctx, value, recurseTimes, typedArray) {
  if (typeof value !== "object" && typeof value !== "function" && !isUndetectableObject(value))
    return formatPrimitive(ctx.stylize, value, ctx);
  if (value === null)
    return ctx.stylize("null", "null");
  const context = value;
  const proxy = getProxyDetails(value, !!ctx.showProxy);
  if (proxy !== void 0) {
    if (proxy === null || proxy[0] === null)
      return ctx.stylize("<Revoked Proxy>", "special");
    if (ctx.showProxy)
      return formatProxy(ctx, proxy, recurseTimes);
    value = proxy;
  }
  if (ctx.customInspect) {
    const maybeCustom = value[customInspectSymbol];
    if (typeof maybeCustom === "function" && // Filter out the util module, its inspect function is special.
    maybeCustom !== inspect && // Also filter out any prototype objects using the circular check.
    !(value.constructor && value.constructor.prototype === value)) {
      const depth = ctx.depth === null ? null : ctx.depth - recurseTimes;
      const isCrossContext = proxy !== void 0 || !(context instanceof Object2);
      const ret = FunctionPrototypeCall(
        maybeCustom,
        context,
        depth,
        getUserOptions(ctx, isCrossContext),
        inspect
      );
      if (ret !== context) {
        if (typeof ret !== "string")
          return formatValue(ctx, ret, recurseTimes);
        return ret.replace(/\n/g, `
${" ".repeat(ctx.indentationLvl)}`);
      }
    }
  }
  if (ctx.seen.includes(value)) {
    let index = 1;
    if (ctx.circular === void 0) {
      ctx.circular = new SafeMap2();
      ctx.circular.set(value, index);
    } else {
      index = ctx.circular.get(value);
      if (index === void 0) {
        index = ctx.circular.size + 1;
        ctx.circular.set(value, index);
      }
    }
    return ctx.stylize(`[Circular *${index}]`, "special");
  }
  return formatRaw(ctx, value, recurseTimes, typedArray);
}
function formatRaw(ctx, value, recurseTimes, typedArray) {
  let keys;
  let protoProps;
  if (ctx.showHidden && (recurseTimes <= ctx.depth || ctx.depth === null))
    protoProps = [];
  const constructor = getConstructorName(
    value,
    ctx,
    recurseTimes,
    protoProps
  );
  if (protoProps !== void 0 && protoProps.length === 0)
    protoProps = void 0;
  let tag = value[SymbolToStringTag];
  if (typeof tag !== "string" || tag !== "" && (ctx.showHidden ? ObjectPrototypeHasOwnProperty : ObjectPrototypePropertyIsEnumerable)(value, SymbolToStringTag))
    tag = "";
  let base = "";
  let formatter = getEmptyFormatArray;
  let braces;
  let noIterator = true;
  let i = 0;
  const filter = ctx.showHidden ? ALL_PROPERTIES : ONLY_ENUMERABLE;
  let extrasType = kObjectType;
  if (value[SymbolIterator] || constructor === null) {
    noIterator = false;
    if (ArrayIsArray(value)) {
      const prefix = constructor !== "Array" || tag !== "" ? getPrefix(constructor, tag, "Array", `(${value.length})`) : "";
      keys = getOwnNonIndexProperties(value, filter);
      braces = [`${prefix}[`, "]"];
      if (value.length === 0 && keys.length === 0 && protoProps === void 0)
        return `${braces[0]}]`;
      extrasType = kArrayExtrasType;
      formatter = formatArray;
    } else if (isSet(value)) {
      const size = SetPrototypeGetSize(value);
      const prefix = getPrefix(constructor, tag, "Set", `(${size})`);
      keys = getKeys(value, ctx.showHidden);
      formatter = constructor !== null ? formatSet.bind(null, value) : formatSet.bind(null, SetPrototypeValues(value));
      if (size === 0 && keys.length === 0 && protoProps === void 0)
        return `${prefix}{}`;
      braces = [`${prefix}{`, "}"];
    } else if (isMap(value)) {
      const size = MapPrototypeGetSize(value);
      const prefix = getPrefix(constructor, tag, "Map", `(${size})`);
      keys = getKeys(value, ctx.showHidden);
      formatter = constructor !== null ? formatMap.bind(null, value) : formatMap.bind(null, MapPrototypeEntries(value));
      if (size === 0 && keys.length === 0 && protoProps === void 0)
        return `${prefix}{}`;
      braces = [`${prefix}{`, "}"];
    } else if (isTypedArray(value)) {
      keys = getOwnNonIndexProperties(value, filter);
      let bound = value;
      let fallback = "";
      if (constructor === null) {
        fallback = TypedArrayPrototypeGetSymbolToStringTag(value);
        bound = new primordials[fallback](value);
      }
      const size = TypedArrayPrototypeGetLength(value);
      const prefix = getPrefix(constructor, tag, fallback, `(${size})`);
      braces = [`${prefix}[`, "]"];
      if (value.length === 0 && keys.length === 0 && !ctx.showHidden)
        return `${braces[0]}]`;
      formatter = formatTypedArray.bind(null, bound, size);
      extrasType = kArrayExtrasType;
    } else if (isMapIterator(value)) {
      keys = getKeys(value, ctx.showHidden);
      braces = getIteratorBraces("Map", tag);
      formatter = formatIterator.bind(null, braces);
    } else if (isSetIterator(value)) {
      keys = getKeys(value, ctx.showHidden);
      braces = getIteratorBraces("Set", tag);
      formatter = formatIterator.bind(null, braces);
    } else
      noIterator = true;
  }
  if (noIterator) {
    keys = getKeys(value, ctx.showHidden);
    braces = ["{", "}"];
    if (constructor === "Object") {
      if (isArgumentsObject(value))
        braces[0] = "[Arguments] {";
      else if (tag !== "")
        braces[0] = `${getPrefix(constructor, tag, "Object")}{`;
      if (keys.length === 0 && protoProps === void 0)
        return `${braces[0]}}`;
    } else if (typeof value === "function") {
      base = getFunctionBase(value, constructor, tag);
      if (keys.length === 0 && protoProps === void 0)
        return ctx.stylize(base, "special");
    } else if (isRegExp(value)) {
      base = RegExpPrototypeToString(
        constructor !== null ? value : new RegExp(value)
      );
      const prefix = getPrefix(constructor, tag, "RegExp");
      if (prefix !== "RegExp ")
        base = `${prefix}${base}`;
      if (keys.length === 0 && protoProps === void 0 || recurseTimes > ctx.depth && ctx.depth !== null)
        return ctx.stylize(base, "regexp");
    } else if (isDate(value)) {
      base = NumberIsNaN(DatePrototypeGetTime(value)) ? DatePrototypeToString(value) : DatePrototypeToISOString(value);
      const prefix = getPrefix(constructor, tag, "Date");
      if (prefix !== "Date ")
        base = `${prefix}${base}`;
      if (keys.length === 0 && protoProps === void 0)
        return ctx.stylize(base, "date");
    } else if (isError(value)) {
      base = formatError(value, constructor, tag, ctx, keys);
      if (keys.length === 0 && protoProps === void 0)
        return base;
    } else if (isAnyArrayBuffer(value)) {
      const arrayType = isArrayBuffer(value) ? "ArrayBuffer" : "SharedArrayBuffer";
      const prefix = getPrefix(constructor, tag, arrayType);
      if (typedArray === void 0)
        formatter = formatArrayBuffer;
      else if (keys.length === 0 && protoProps === void 0) {
        return prefix + `{ byteLength: ${formatNumber(
          ctx.stylize,
          value.byteLength,
          false
        )} }`;
      }
      braces[0] = `${prefix}{`;
      ArrayPrototypeUnshift(keys, "byteLength");
    } else if (isDataView(value)) {
      braces[0] = `${getPrefix(constructor, tag, "DataView")}{`;
      ArrayPrototypeUnshift(keys, "byteLength", "byteOffset", "buffer");
    } else if (isPromise(value)) {
      braces[0] = `${getPrefix(constructor, tag, "Promise")}{`;
      formatter = formatPromise;
    } else if (isWeakSet(value)) {
      braces[0] = `${getPrefix(constructor, tag, "WeakSet")}{`;
      formatter = ctx.showHidden ? formatWeakSet : formatWeakCollection;
    } else if (isWeakMap(value)) {
      braces[0] = `${getPrefix(constructor, tag, "WeakMap")}{`;
      formatter = ctx.showHidden ? formatWeakMap : formatWeakCollection;
    } else if (isModuleNamespaceObject(value)) {
      braces[0] = `${getPrefix(constructor, tag, "Module")}{`;
      formatter = formatNamespaceObject.bind(null, keys);
    } else if (isBoxedPrimitive(value)) {
      base = getBoxedBase(value, ctx, keys, constructor, tag);
      if (keys.length === 0 && protoProps === void 0)
        return base;
    } else {
      if (keys.length === 0 && protoProps === void 0) {
        if (isExternal(value)) {
          const address = "UNSUPPORTED VALUE";
          return ctx.stylize(`[External: ${address}]`, "special");
        }
        return `${getCtxStyle(value, constructor, tag)}{}`;
      }
      braces[0] = `${getCtxStyle(value, constructor, tag)}{`;
    }
  }
  if (recurseTimes > ctx.depth && ctx.depth !== null) {
    let constructorName = getCtxStyle(value, constructor, tag).slice(0, -1);
    if (constructor !== null)
      constructorName = `[${constructorName}]`;
    return ctx.stylize(constructorName, "special");
  }
  recurseTimes += 1;
  ctx.seen.push(value);
  ctx.currentDepth = recurseTimes;
  let output;
  const indentationLvl = ctx.indentationLvl;
  try {
    output = formatter(ctx, value, recurseTimes);
    for (i = 0; i < keys.length; i++) {
      output.push(
        formatProperty(ctx, value, recurseTimes, keys[i], extrasType)
      );
    }
    if (protoProps !== void 0)
      output.push(...protoProps);
  } catch (err) {
    const constructorName = getCtxStyle(value, constructor, tag).slice(0, -1);
    return handleMaxCallStackSize(ctx, err, constructorName, indentationLvl);
  }
  if (ctx.circular !== void 0) {
    const index = ctx.circular.get(value);
    if (index !== void 0) {
      const reference = ctx.stylize(`<ref *${index}>`, "special");
      if (ctx.compact !== true)
        base = base === "" ? reference : `${reference} ${base}`;
      else
        braces[0] = `${reference} ${braces[0]}`;
    }
  }
  ctx.seen.pop();
  if (ctx.sorted) {
    const comparator = ctx.sorted === true ? void 0 : ctx.sorted;
    if (extrasType === kObjectType)
      output = output.sort(comparator);
    else if (keys.length > 1) {
      const sorted = output.slice(output.length - keys.length).sort(comparator);
      output.splice(output.length - keys.length, keys.length, ...sorted);
    }
  }
  const res = reduceToSingleString(
    ctx,
    output,
    base,
    braces,
    extrasType,
    recurseTimes,
    value
  );
  const budget = ctx.budget[ctx.indentationLvl] || 0;
  const newLength = budget + res.length;
  ctx.budget[ctx.indentationLvl] = newLength;
  if (newLength > 2 ** 27)
    ctx.depth = -1;
  return res;
}
function getIteratorBraces(type, tag) {
  if (tag !== `${type} Iterator`) {
    if (tag !== "")
      tag += "] [";
    tag += `${type} Iterator`;
  }
  return [`[${tag}] {`, "}"];
}
function getBoxedBase(value, ctx, keys, constructor, tag) {
  let fn;
  let type;
  if (isNumberObject(value)) {
    fn = NumberPrototypeValueOf;
    type = "Number";
  } else if (isStringObject(value)) {
    fn = StringPrototypeValueOf;
    type = "String";
    keys.splice(0, value.length);
  } else if (isBooleanObject(value)) {
    fn = BooleanPrototypeValueOf;
    type = "Boolean";
  } else if (isBigIntObject(value)) {
    fn = BigIntPrototypeValueOf;
    type = "BigInt";
  } else {
    fn = SymbolPrototypeValueOf;
    type = "Symbol";
  }
  let base = `[${type}`;
  if (type !== constructor) {
    if (constructor === null)
      base += " (null prototype)";
    else
      base += ` (${constructor})`;
  }
  base += `: ${formatPrimitive(stylizeNoColor, fn(value), ctx)}]`;
  if (tag !== "" && tag !== constructor)
    base += ` [${tag}]`;
  if (keys.length !== 0 || ctx.stylize === stylizeNoColor)
    return base;
  return ctx.stylize(base, StringPrototypeToLowerCase(type));
}
function getClassBase(value, constructor, tag) {
  const hasName = ObjectPrototypeHasOwnProperty(value, "name");
  const name = hasName && value.name || "(anonymous)";
  let base = `class ${name}`;
  if (constructor !== "Function" && constructor !== null)
    base += ` [${constructor}]`;
  if (tag !== "" && constructor !== tag)
    base += ` [${tag}]`;
  if (constructor !== null) {
    const superName = ObjectGetPrototypeOf(value).name;
    if (superName)
      base += ` extends ${superName}`;
  } else
    base += " extends [null prototype]";
  return `[${base}]`;
}
function getFunctionBase(value, constructor, tag) {
  const stringified = FunctionPrototypeToString(value);
  if (stringified.startsWith("class") && stringified.endsWith("}")) {
    const slice = stringified.slice(5, -1);
    const bracketIndex = slice.indexOf("{");
    if (bracketIndex !== -1 && (!slice.slice(0, bracketIndex).includes("(") || // Slow path to guarantee that it's indeed a class.
    classRegExp.test(slice.replace(stripCommentsRegExp))))
      return getClassBase(value, constructor, tag);
  }
  let type = "Function";
  if (isGeneratorFunction(value))
    type = `Generator${type}`;
  if (isAsyncFunction(value))
    type = `Async${type}`;
  let base = `[${type}`;
  if (constructor === null)
    base += " (null prototype)";
  if (value.name === "")
    base += " (anonymous)";
  else
    base += `: ${value.name}`;
  base += "]";
  if (constructor !== type && constructor !== null)
    base += ` ${constructor}`;
  if (tag !== "" && constructor !== tag)
    base += ` [${tag}]`;
  return base;
}
function identicalSequenceRange(a, b) {
  for (let i = 0; i < a.length - 3; i++) {
    const pos = b.indexOf(a[i]);
    if (pos !== -1) {
      const rest = b.length - pos;
      if (rest > 3) {
        let len = 1;
        const maxLen = MathMin(a.length - i, rest);
        while (maxLen > len && a[i + len] === b[pos + len])
          len++;
        if (len > 3)
          return { len, offset: i };
      }
    }
  }
  return { len: 0, offset: 0 };
}
function getStackString(error) {
  return error.stack ? String(error.stack) : ErrorPrototypeToString(error);
}
function getStackFrames(ctx, err, stack) {
  const frames = stack.split("\n");
  if (err.cause && isError(err.cause)) {
    const causeStack = getStackString(err.cause);
    const causeStackStart = causeStack.indexOf("\n    at");
    if (causeStackStart !== -1) {
      const causeFrames = causeStack.slice(causeStackStart + 1).split("\n");
      const { len, offset } = identicalSequenceRange(frames, causeFrames);
      if (len > 0) {
        const skipped = len - 2;
        const msg = `    ... ${skipped} lines matching cause stack trace ...`;
        frames.splice(offset + 1, skipped, ctx.stylize(msg, "undefined"));
      }
    }
  }
  return frames;
}
function improveStack(stack, constructor, name, tag) {
  let len = name.length;
  if (constructor === null || name.endsWith("Error") && stack.startsWith(name) && (stack.length === len || stack[len] === ":" || stack[len] === "\n")) {
    let fallback = "Error";
    if (constructor === null) {
      const start = stack.match(/^([A-Z][a-z_ A-Z0-9[\]()-]+)(?::|\n {4}at)/) || stack.match(/^([a-z_A-Z0-9-]*Error)$/);
      fallback = start && start[1] || "";
      len = fallback.length;
      fallback = fallback || "Error";
    }
    const prefix = getPrefix(constructor, tag, fallback).slice(0, -1);
    if (name !== prefix) {
      if (prefix.includes(name)) {
        if (len === 0)
          stack = `${prefix}: ${stack}`;
        else
          stack = `${prefix}${stack.slice(len)}`;
      } else
        stack = `${prefix} [${name}]${stack.slice(len)}`;
    }
  }
  return stack;
}
function removeDuplicateErrorKeys(ctx, keys, err, stack) {
  if (!ctx.showHidden && keys.length !== 0) {
    for (const name of ["name", "message", "stack"]) {
      const index = keys.indexOf(name);
      if (index !== -1 && stack.includes(err[name]))
        keys.splice(index, 1);
    }
  }
}
function formatError(err, constructor, tag, ctx, keys) {
  const name = err.name != null ? String(err.name) : "Error";
  let stack = getStackString(err);
  removeDuplicateErrorKeys(ctx, keys, err, stack);
  if ("cause" in err && (keys.length === 0 || !keys.includes("cause")))
    keys.push("cause");
  stack = improveStack(stack, constructor, name, tag);
  let pos = err.message && stack.indexOf(err.message) || -1;
  if (pos !== -1)
    pos += err.message.length;
  const stackStart = stack.indexOf("\n    at", pos);
  if (stackStart === -1)
    stack = `[${stack}]`;
  else {
    let newStack = stack.slice(0, stackStart);
    const lines = getStackFrames(ctx, err, stack.slice(stackStart + 1));
    if (ctx.colors) {
      for (const line of lines) {
        const core = line.match(coreModuleRegExp);
        if (core !== null && NativeModule.exists(core[1]))
          newStack += `
${ctx.stylize(line, "undefined")}`;
        else {
          let nodeModule;
          newStack += "\n";
          let pos2 = 0;
          while ((nodeModule = nodeModulesRegExp.exec(line)) !== null) {
            newStack += line.slice(pos2, nodeModule.index + 14);
            newStack += ctx.stylize(nodeModule[1], "module");
            pos2 = nodeModule.index + nodeModule[0].length;
          }
          newStack += pos2 === 0 ? line : line.slice(pos2);
        }
      }
    } else
      newStack += `
${lines.join("\n")}`;
    stack = newStack;
  }
  if (ctx.indentationLvl !== 0) {
    const indentation = " ".repeat(ctx.indentationLvl);
    stack = stack.replace(/\n/g, `
${indentation}`);
  }
  return stack;
}
function groupArrayElements(ctx, output, value) {
  let totalLength = 0;
  let maxLength = 0;
  let i = 0;
  let outputLength = output.length;
  if (ctx.maxArrayLength < output.length) {
    outputLength--;
  }
  const separatorSpace = 2;
  const dataLen = new Array(outputLength);
  for (; i < outputLength; i++) {
    const len = getStringWidth(output[i], ctx.colors);
    dataLen[i] = len;
    totalLength += len + separatorSpace;
    if (maxLength < len)
      maxLength = len;
  }
  const actualMax = maxLength + separatorSpace;
  if (actualMax * 3 + ctx.indentationLvl < ctx.breakLength && (totalLength / actualMax > 5 || maxLength <= 6)) {
    const approxCharHeights = 2.5;
    const averageBias = MathSqrt(actualMax - totalLength / output.length);
    const biasedMax = MathMax(actualMax - 3 - averageBias, 1);
    const columns = MathMin(
      // Ideally a square should be drawn. We expect a character to be about 2.5
      // times as high as wide. This is the area formula to calculate a square
      // which contains n rectangles of size `actualMax * approxCharHeights`.
      // Divide that by `actualMax` to receive the correct number of columns.
      // The added bias increases the columns for short entries.
      MathRound(
        MathSqrt(approxCharHeights * biasedMax * outputLength) / biasedMax
      ),
      // Do not exceed the breakLength.
      MathFloor((ctx.breakLength - ctx.indentationLvl) / actualMax),
      // Limit array grouping for small `compact` modes as the user requested
      // minimal grouping.
      ctx.compact * 4,
      // Limit the columns to a maximum of fifteen.
      15
    );
    if (columns <= 1)
      return output;
    const tmp = [];
    const maxLineLength = [];
    for (let i2 = 0; i2 < columns; i2++) {
      let lineMaxLength = 0;
      for (let j = i2; j < output.length; j += columns)
        if (dataLen[j] > lineMaxLength)
          lineMaxLength = dataLen[j];
      lineMaxLength += separatorSpace;
      maxLineLength[i2] = lineMaxLength;
    }
    let order = StringPrototypePadStart;
    if (value !== void 0) {
      for (let i2 = 0; i2 < output.length; i2++) {
        if (typeof value[i2] !== "number" && typeof value[i2] !== "bigint") {
          order = StringPrototypePadEnd;
          break;
        }
      }
    }
    for (let i2 = 0; i2 < outputLength; i2 += columns) {
      const max = MathMin(i2 + columns, outputLength);
      let str = "";
      let j = i2;
      for (; j < max - 1; j++) {
        const padding = maxLineLength[j - i2] + output[j].length - dataLen[j];
        str += order(`${output[j]}, `, padding, " ");
      }
      if (order === StringPrototypePadStart) {
        const padding = maxLineLength[j - i2] + output[j].length - dataLen[j] - separatorSpace;
        str += StringPrototypePadStart(output[j], padding, " ");
      } else
        str += output[j];
      ArrayPrototypePush(tmp, str);
    }
    if (ctx.maxArrayLength < output.length)
      ArrayPrototypePush(tmp, output[outputLength]);
    output = tmp;
  }
  return output;
}
function handleMaxCallStackSize(ctx, err, constructorName, indentationLvl) {
  if (isStackOverflowError(err)) {
    ctx.seen.pop();
    ctx.indentationLvl = indentationLvl;
    return ctx.stylize(
      `[${constructorName}: Inspection interrupted prematurely. Maximum call stack size exceeded.]`,
      "special"
    );
  }
  throw new Error(err.stack);
}
function addNumericSeparator(integerString) {
  let result = "";
  let i = integerString.length;
  const start = integerString.startsWith("-") ? 1 : 0;
  for (; i >= start + 4; i -= 3)
    result = `_${integerString.slice(i - 3, i)}${result}`;
  return i === integerString.length ? integerString : `${integerString.slice(0, i)}${result}`;
}
function addNumericSeparatorEnd(integerString) {
  let result = "";
  let i = 0;
  for (; i < integerString.length - 3; i += 3)
    result += `${integerString.slice(i, i + 3)}_`;
  return i === 0 ? integerString : `${result}${integerString.slice(i)}`;
}
function formatNumber(fn, number, numericSeparator) {
  if (!numericSeparator) {
    if (ObjectIs(number, -0))
      return fn("-0", "number");
    return fn(`${number}`, "number");
  }
  const integer = MathTrunc(number);
  const string = String(integer);
  if (integer === number) {
    if (!NumberIsFinite(number) || string.includes("e"))
      return fn(string, "number");
    return fn(`${addNumericSeparator(string)}`, "number");
  }
  if (NumberIsNaN(number))
    return fn(string, "number");
  return fn(
    `${addNumericSeparator(string)}.${addNumericSeparatorEnd(
      String(number).slice(string.length + 1)
    )}`,
    "number"
  );
}
function formatBigInt(fn, bigint, numericSeparator) {
  const string = String(bigint);
  if (!numericSeparator)
    return fn(`${string}n`, "bigint");
  return fn(`${addNumericSeparator(string)}n`, "bigint");
}
function formatPrimitive(fn, value, ctx) {
  if (typeof value === "string") {
    let trailer = "";
    if (value.length > ctx.maxStringLength) {
      const remaining = value.length - ctx.maxStringLength;
      value = value.slice(0, ctx.maxStringLength);
      trailer = `... ${remaining} more character${remaining > 1 ? "s" : ""}`;
    }
    if (ctx.compact !== true && // TODO(BridgeAR): Add unicode support. Use the readline getStringWidth
    // function.
    value.length > kMinLineLength && value.length > ctx.breakLength - ctx.indentationLvl - 4) {
      return value.split(/(?<=\n)/).map((line) => fn(strEscape(line), "string")).join(` +
${" ".repeat(ctx.indentationLvl + 2)}`) + trailer;
    }
    return fn(strEscape(value), "string") + trailer;
  }
  if (typeof value === "number")
    return formatNumber(fn, value, ctx.numericSeparator);
  if (typeof value === "bigint")
    return formatBigInt(fn, value, ctx.numericSeparator);
  if (typeof value === "boolean")
    return fn(`${value}`, "boolean");
  if (typeof value === "undefined")
    return fn("undefined", "undefined");
  return fn(SymbolPrototypeToString(value), "symbol");
}
function formatNamespaceObject(keys, ctx, value, recurseTimes) {
  const output = new Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    try {
      output[i] = formatProperty(
        ctx,
        value,
        recurseTimes,
        keys[i],
        kObjectType
      );
    } catch (err) {
      assert(isNativeError(err) && err.name === "ReferenceError");
      const tmp = { [keys[i]]: "" };
      output[i] = formatProperty(
        ctx,
        tmp,
        recurseTimes,
        keys[i],
        kObjectType
      );
      const pos = output[i].lastIndexOf(" ");
      output[i] = output[i].slice(0, pos + 1) + ctx.stylize("<uninitialized>", "special");
    }
  }
  keys.length = 0;
  return output;
}
function formatSpecialArray(ctx, value, recurseTimes, maxLength, output, i) {
  const keys = ObjectKeys(value);
  let index = i;
  for (; i < keys.length && output.length < maxLength; i++) {
    const key = keys[i];
    const tmp = +key;
    if (tmp > 2 ** 32 - 2)
      break;
    if (`${index}` !== key) {
      if (!numberRegExp.test(key))
        break;
      const emptyItems = tmp - index;
      const ending = emptyItems > 1 ? "s" : "";
      const message = `<${emptyItems} empty item${ending}>`;
      output.push(ctx.stylize(message, "undefined"));
      index = tmp;
      if (output.length === maxLength)
        break;
    }
    output.push(
      formatProperty(ctx, value, recurseTimes, key, kArrayType)
    );
    index++;
  }
  const remaining = value.length - index;
  if (output.length !== maxLength) {
    if (remaining > 0) {
      const ending = remaining > 1 ? "s" : "";
      const message = `<${remaining} empty item${ending}>`;
      output.push(ctx.stylize(message, "undefined"));
    }
  } else if (remaining > 0)
    output.push(`... ${remaining} more item${remaining > 1 ? "s" : ""}`);
  return output;
}
function formatArrayBuffer(ctx, value) {
  let buffer;
  try {
    buffer = new Uint8Array(value);
  } catch {
    return [ctx.stylize("(detached)", "special")];
  }
  if (hexSlice === void 0) {
    hexSlice = function buf2hex(buffer2) {
      return [...new Uint8Array(buffer2)].map((x) => x.toString(16).padStart(2, "0")).join("");
    };
  }
  let str = StringPrototypeTrim(
    RegExpPrototypeSymbolReplace(
      /(.{2})/g,
      hexSlice(buffer, 0, MathMin(ctx.maxArrayLength, buffer.length)),
      "$1 "
    )
  );
  const remaining = buffer.length - ctx.maxArrayLength;
  if (remaining > 0)
    str += ` ... ${remaining} more byte${remaining > 1 ? "s" : ""}`;
  return [`${ctx.stylize("[Uint8Contents]", "special")}: <${str}>`];
}
function formatArray(ctx, value, recurseTimes) {
  const valLen = value.length;
  const len = MathMin(MathMax(0, ctx.maxArrayLength), valLen);
  const remaining = valLen - len;
  const output = [];
  for (let i = 0; i < len; i++) {
    if (!ObjectPrototypeHasOwnProperty(value, i))
      return formatSpecialArray(ctx, value, recurseTimes, len, output, i);
    output.push(formatProperty(ctx, value, recurseTimes, i, kArrayType));
  }
  if (remaining > 0)
    output.push(`... ${remaining} more item${remaining > 1 ? "s" : ""}`);
  return output;
}
function formatTypedArray(value, length, ctx, ignored, recurseTimes) {
  const maxLength = MathMin(MathMax(0, ctx.maxArrayLength), length);
  const remaining = value.length - maxLength;
  const output = new Array(maxLength);
  const elementFormatter = value.length > 0 && typeof value[0] === "number" ? formatNumber : formatBigInt;
  for (let i = 0; i < maxLength; ++i)
    output[i] = elementFormatter(ctx.stylize, value[i], ctx.numericSeparator);
  if (remaining > 0)
    output[maxLength] = `... ${remaining} more item${remaining > 1 ? "s" : ""}`;
  if (ctx.showHidden) {
    ctx.indentationLvl += 2;
    for (const key of [
      "BYTES_PER_ELEMENT",
      "length",
      "byteLength",
      "byteOffset",
      "buffer"
    ]) {
      const str = formatValue(ctx, value[key], recurseTimes, true);
      ArrayPrototypePush(output, `[${key}]: ${str}`);
    }
    ctx.indentationLvl -= 2;
  }
  return output;
}
function formatSet(value, ctx, ignored, recurseTimes) {
  const output = [];
  ctx.indentationLvl += 2;
  for (const v of value)
    ArrayPrototypePush(output, formatValue(ctx, v, recurseTimes));
  ctx.indentationLvl -= 2;
  return output;
}
function formatMap(value, ctx, ignored, recurseTimes) {
  const output = [];
  ctx.indentationLvl += 2;
  for (const { 0: k, 1: v } of value) {
    output.push(
      `${formatValue(ctx, k, recurseTimes)} => ${formatValue(
        ctx,
        v,
        recurseTimes
      )}`
    );
  }
  ctx.indentationLvl -= 2;
  return output;
}
function formatSetIterInner(ctx, recurseTimes, entries, state) {
  const maxArrayLength = MathMax(ctx.maxArrayLength, 0);
  const maxLength = MathMin(maxArrayLength, entries.length);
  const output = new Array(maxLength);
  ctx.indentationLvl += 2;
  for (let i = 0; i < maxLength; i++)
    output[i] = formatValue(ctx, entries[i], recurseTimes);
  ctx.indentationLvl -= 2;
  if (state === kWeak && !ctx.sorted) {
    ArrayPrototypeSort(output);
  }
  const remaining = entries.length - maxLength;
  if (remaining > 0) {
    ArrayPrototypePush(
      output,
      `... ${remaining} more item${remaining > 1 ? "s" : ""}`
    );
  }
  return output;
}
function formatMapIterInner(ctx, recurseTimes, entries, state) {
  const maxArrayLength = MathMax(ctx.maxArrayLength, 0);
  const len = entries.length / 2;
  const remaining = len - maxArrayLength;
  const maxLength = MathMin(maxArrayLength, len);
  let output = new Array(maxLength);
  let i = 0;
  ctx.indentationLvl += 2;
  if (state === kWeak) {
    for (; i < maxLength; i++) {
      const pos = i * 2;
      output[i] = `${formatValue(
        ctx,
        entries[pos],
        recurseTimes
      )} => ${formatValue(ctx, entries[pos + 1], recurseTimes)}`;
    }
    if (!ctx.sorted)
      output = output.sort();
  } else {
    for (; i < maxLength; i++) {
      const pos = i * 2;
      const res = [
        formatValue(ctx, entries[pos], recurseTimes),
        formatValue(ctx, entries[pos + 1], recurseTimes)
      ];
      output[i] = reduceToSingleString(
        ctx,
        res,
        "",
        ["[", "]"],
        kArrayExtrasType,
        recurseTimes
      );
    }
  }
  ctx.indentationLvl -= 2;
  if (remaining > 0)
    output.push(`... ${remaining} more item${remaining > 1 ? "s" : ""}`);
  return output;
}
function formatWeakCollection(ctx) {
  return [ctx.stylize("<items unknown>", "special")];
}
function formatWeakSet(ctx, value, recurseTimes) {
  const entries = previewEntries(value);
  return formatSetIterInner(ctx, recurseTimes, entries, kWeak);
}
function formatWeakMap(ctx, value, recurseTimes) {
  const entries = previewEntries(value);
  return formatMapIterInner(ctx, recurseTimes, entries, kWeak);
}
function formatIterator(braces, ctx, value, recurseTimes) {
  const { 0: entries, 1: isKeyValue } = previewEntries(value, true);
  if (isKeyValue) {
    braces[0] = braces[0].replace(/ Iterator] {$/, " Entries] {");
    return formatMapIterInner(ctx, recurseTimes, entries, kMapEntries);
  }
  return formatSetIterInner(ctx, recurseTimes, entries, kIterator);
}
function formatPromise(ctx, value, recurseTimes) {
  return [""];
}
function formatProperty(ctx, value, recurseTimes, key, type, desc, original = value) {
  let name, str;
  let extra = " ";
  desc = desc || ObjectGetOwnPropertyDescriptor(value, key) || {
    value: value[key],
    enumerable: true
  };
  if (desc.value !== void 0) {
    const diff = ctx.compact !== true || type !== kObjectType ? 2 : 3;
    ctx.indentationLvl += diff;
    str = formatValue(ctx, desc.value, recurseTimes);
    if (diff === 3 && ctx.breakLength < getStringWidth(str, ctx.colors))
      extra = `
${" ".repeat(ctx.indentationLvl)}`;
    ctx.indentationLvl -= diff;
  } else if (desc.get !== void 0) {
    const label = desc.set !== void 0 ? "Getter/Setter" : "Getter";
    const s = ctx.stylize;
    const sp = "special";
    if (ctx.getters && (ctx.getters === true || ctx.getters === "get" && desc.set === void 0 || ctx.getters === "set" && desc.set !== void 0)) {
      try {
        const tmp = FunctionPrototypeCall(desc.get, original);
        ctx.indentationLvl += 2;
        if (tmp === null)
          str = `${s(`[${label}:`, sp)} ${s("null", "null")}${s("]", sp)}`;
        else if (typeof tmp === "object") {
          str = `${s(`[${label}]`, sp)} ${formatValue(
            ctx,
            tmp,
            recurseTimes
          )}`;
        } else {
          const primitive = formatPrimitive(s, tmp, ctx);
          str = `${s(`[${label}:`, sp)} ${primitive}${s("]", sp)}`;
        }
        ctx.indentationLvl -= 2;
      } catch (err) {
        const message = `<Inspection threw (${err.message})>`;
        str = `${s(`[${label}:`, sp)} ${message}${s("]", sp)}`;
      }
    } else
      str = ctx.stylize(`[${label}]`, sp);
  } else if (desc.set !== void 0)
    str = ctx.stylize("[Setter]", "special");
  else
    str = ctx.stylize("undefined", "undefined");
  if (type === kArrayType)
    return str;
  if (typeof key === "symbol") {
    const tmp = RegExpPrototypeSymbolReplace(
      strEscapeSequencesReplacer,
      SymbolPrototypeToString(key),
      escapeFn
    );
    name = `[${ctx.stylize(tmp, "symbol")}]`;
  } else if (key === "__proto__")
    name = "['__proto__']";
  else if (desc.enumerable === false) {
    const tmp = RegExpPrototypeSymbolReplace(
      strEscapeSequencesReplacer,
      key,
      escapeFn
    );
    name = `[${tmp}]`;
  } else if (RegExpPrototypeExec(keyStrRegExp, key) !== null)
    name = ctx.stylize(key, "name");
  else
    name = ctx.stylize(strEscape(key), "string");
  return `${name}:${extra}${str}`;
}
function isBelowBreakLength(ctx, output, start, base) {
  let totalLength = output.length + start;
  if (totalLength + output.length > ctx.breakLength)
    return false;
  for (let i = 0; i < output.length; i++) {
    if (ctx.colors)
      totalLength += removeColors(output[i]).length;
    else
      totalLength += output[i].length;
    if (totalLength > ctx.breakLength)
      return false;
  }
  return base === "" || !StringPrototypeIncludes(base, "\n");
}
function reduceToSingleString(ctx, output, base, braces, extrasType, recurseTimes, value) {
  if (ctx.compact !== true) {
    if (typeof ctx.compact === "number" && ctx.compact >= 1) {
      const entries = output.length;
      if (extrasType === kArrayExtrasType && entries > 6)
        output = groupArrayElements(ctx, output, value);
      if (ctx.currentDepth - recurseTimes < ctx.compact && entries === output.length) {
        const start = output.length + ctx.indentationLvl + braces[0].length + base.length + 10;
        if (isBelowBreakLength(ctx, output, start, base)) {
          const joinedOutput = join(output, ", ");
          if (!joinedOutput.includes("\n")) {
            return `${base ? `${base} ` : ""}${braces[0]} ${joinedOutput} ${braces[1]}`;
          }
        }
      }
    }
    const indentation2 = `
${StringPrototypeRepeat(" ", ctx.indentationLvl)}`;
    return `${base ? `${base} ` : ""}${braces[0]}${indentation2}  ${join(output, `,${indentation2}  `)}${indentation2}${braces[1]}`;
  }
  if (isBelowBreakLength(ctx, output, 0, base)) {
    return `${braces[0]}${base ? ` ${base}` : ""} ${join(output, ", ")} ` + braces[1];
  }
  const indentation = StringPrototypeRepeat(" ", ctx.indentationLvl);
  const ln = base === "" && braces[0].length === 1 ? " " : `${base ? ` ${base}` : ""}
${indentation}  `;
  return `${braces[0]}${ln}${join(output, `,
${indentation}  `)} ${braces[1]}`;
}
getStringWidth = function getStringWidth2(str, removeControlChars = true) {
  let width = 0;
  if (removeControlChars)
    str = stripVTControlCharacters(str);
  str = StringPrototypeNormalize(str, "NFC");
  for (const char of new SafeStringIterator(str)) {
    const code = StringPrototypeCodePointAt(char, 0);
    if (isFullWidthCodePoint(code))
      width += 2;
    else if (!isZeroWidthCodePoint(code))
      width++;
  }
  return width;
};
var isFullWidthCodePoint = (code) => {
  return code >= 4352 && (code <= 4447 || // Hangul Jamo
  code === 9001 || // LEFT-POINTING ANGLE BRACKET
  code === 9002 || // RIGHT-POINTING ANGLE BRACKET
  // CJK Radicals Supplement .. Enclosed CJK Letters and Months
  code >= 11904 && code <= 12871 && code !== 12351 || // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
  code >= 12880 && code <= 19903 || // CJK Unified Ideographs .. Yi Radicals
  code >= 19968 && code <= 42182 || // Hangul Jamo Extended-A
  code >= 43360 && code <= 43388 || // Hangul Syllables
  code >= 44032 && code <= 55203 || // CJK Compatibility Ideographs
  code >= 63744 && code <= 64255 || // Vertical Forms
  code >= 65040 && code <= 65049 || // CJK Compatibility Forms .. Small Form Variants
  code >= 65072 && code <= 65131 || // Halfwidth and Fullwidth Forms
  code >= 65281 && code <= 65376 || code >= 65504 && code <= 65510 || // Kana Supplement
  code >= 110592 && code <= 110593 || // Enclosed Ideographic Supplement
  code >= 127488 && code <= 127569 || // Miscellaneous Symbols and Pictographs 0x1f300 - 0x1f5ff
  // Emoticons 0x1f600 - 0x1f64f
  code >= 127744 && code <= 128591 || // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
  code >= 131072 && code <= 262141);
};
var isZeroWidthCodePoint = (code) => {
  return code <= 31 || // C0 control codes
  code >= 127 && code <= 159 || // C1 control codes
  code >= 768 && code <= 879 || // Combining Diacritical Marks
  code >= 8203 && code <= 8207 || // Modifying Invisible Characters
  // Combining Diacritical Marks for Symbols
  code >= 8400 && code <= 8447 || code >= 65024 && code <= 65039 || // Variation Selectors
  code >= 65056 && code <= 65071 || // Combining Half Marks
  code >= 917760 && code <= 917999;
};
function stripVTControlCharacters(str) {
  validateString(str, "str");
  return str.replace(ansi, "");
}
var util_inspect_default = inspect;

// src/altv-inject/shared/js-func.ts
var DEFAULT_JS_FUNC_PROPS = {
  length: true,
  name: true,
  arguments: true,
  caller: true,
  prototype: true
};

// src/altv-inject/shared/setup.ts
var _alt = ___altvEsbuild_altvInject_alt___;
var altShared = ___altvEsbuild_altvInject_altShared___;
var SharedSetup = class {
  log = new Logger("shared");
  resourceStopEvent = () => {
    this.log.debug("resourceStop");
    for (const key of this.metaKeys)
      _alt.deleteMeta(key);
  };
  origAltOn;
  origAltOnce;
  origAltOff;
  origAltSetMeta;
  // first record key is scope, second is event name
  eventHandlers = {
    local: {},
    remote: {}
  };
  metaKeys = /* @__PURE__ */ new Set();
  // eslint-disable-next-line @typescript-eslint/ban-types
  baseObjects = /* @__PURE__ */ new Set();
  hookedAltEvents = {};
  /* eslint-disable @typescript-eslint/indent */
  eventHandlersWrappers = /* @__PURE__ */ new Map();
  /* eslint-enable @typescript-eslint/indent */
  constructor(options2) {
    if (options2.dev.enabled) {
      this.origAltOn = this.hookAltEventAdd("local", "on", 1);
      this.origAltOnce = this.hookAltEventAdd("local", "once", 1, true);
      this.origAltOff = this.hookAltEventRemove("local", "off", 1);
      this.hookAlt("getEventListeners", (original, event) => {
        return typeof event === "string" ? [...this.eventHandlers.local[event] ?? []] : original(event);
      }, 1);
      this.hookAlt("getRemoteEventListeners", (original, event) => {
        return typeof event === "string" ? [...this.eventHandlers.remote[event] ?? []] : original(event);
      }, 1);
      this.origAltSetMeta = this.hookAlt("setMeta", (original, key, value) => {
        this.metaKeys.add(key);
        original(key, value);
      }, 2);
      this.origAltOn("resourceStop", this.resourceStopEvent);
      if (options2.enhancedAltLog)
        this.hookAltLogging();
    }
  }
  hookAlt(property, replaceWith, expectedArgs) {
    const original = _alt[property];
    if (original == null)
      throw new Error(`[hookAlt] original property is not defined: ${property}`);
    if (Object.hasOwn(original, "___hookAlt"))
      throw new Error(`[hookAlt] already hooked property: ${property}`);
    if (!replaceWith.prototype)
      replaceWith = replaceWith.bind(null, original);
    Object.defineProperty(replaceWith, "___hookAlt", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: true
    });
    _alt[property] = (...args) => {
      if (args.length < expectedArgs)
        throw new Error(`${expectedArgs} arguments expected`);
      return replaceWith(...args);
    };
    if (altShared[property] != null)
      altShared[property] = replaceWith;
    return original;
  }
  hookAltEventAdd(scope, funcName, expectedArgs, once = false) {
    return this.hookAlt(funcName, (original, eventOrHandler, handler) => {
      if (!(typeof eventOrHandler === "string" || typeof eventOrHandler === "function"))
        throw new Error("Expected a string or function as first argument");
      if (typeof eventOrHandler === "function") {
        original(eventOrHandler);
        return;
      }
      if (typeof handler !== "function")
        throw new Error("Expected a function as second argument");
      const eventHandlers = this.eventHandlers[scope];
      (eventHandlers[eventOrHandler] ?? (eventHandlers[eventOrHandler] = /* @__PURE__ */ new Set())).add(handler);
      const wrapper = async (...args) => {
        if (once) {
          eventHandlers[eventOrHandler]?.delete(handler);
          this.eventHandlersWrappers.get(eventOrHandler)?.delete(handler);
        }
        if (this.hookedAltEvents[eventOrHandler]) {
          this.log.debug("skip calling user handler of hooked alt event:", eventOrHandler);
          return;
        }
        try {
          await handler(...args);
        } catch (e) {
          this.logEventException(eventOrHandler, e);
          throw e;
        }
      };
      const handlers = this.eventHandlersWrappers.get(eventOrHandler) ?? /* @__PURE__ */ new Map();
      this.eventHandlersWrappers.set(eventOrHandler, handlers);
      handlers.set(handler, wrapper);
      original(eventOrHandler, wrapper);
    }, expectedArgs);
  }
  hookAltEventRemove(scope, funcName, expectedArgs) {
    return this.hookAlt(funcName, (original, eventOrHandler, handler) => {
      this.log.debug(`hooked alt.${funcName} called args:`, eventOrHandler, typeof handler);
      if (!(typeof eventOrHandler === "string" || typeof eventOrHandler === "function"))
        throw new Error("Expected a string or function as first argument");
      if (typeof eventOrHandler === "function") {
        original(eventOrHandler);
        return;
      }
      if (typeof handler !== "function")
        throw new Error("Expected a function as second argument");
      const handlers = this.eventHandlersWrappers.get(eventOrHandler);
      if (!handlers) {
        this.log.debug(`alt.${funcName} called but event handlers are not registered for event: ${eventOrHandler}`);
        return;
      }
      const wrapper = handlers.get(handler);
      if (!wrapper) {
        this.log.debug(`alt.${funcName} called but event handler is not registered for event: ${eventOrHandler}`);
        return;
      }
      this.eventHandlers[scope][eventOrHandler]?.delete(handler);
      handlers?.delete(handler);
      original(eventOrHandler, wrapper);
    }, expectedArgs);
  }
  hookAltEvent(event, handler) {
    this.hookedAltEvents[event] = true;
    this.log.debug("hooked alt event:", event);
    const altOn = this.origAltOn ?? _alt.on;
    this.log.debug("hookAltEvent altOn:", altOn);
    altOn(event, async (...args) => {
      this.log.debug("received hooked alt event:", event);
      try {
        const patchedArgs = await handler(...args);
        if (patchedArgs === false) {
          this.log.debug("hooked altv event:", event, "was canceled");
          return;
        }
        this.log.debug("hooked altv event:", event, "calling with args:", patchedArgs);
        this.emitAltEvent(event, ...patchedArgs);
      } catch (e) {
        this.log.error("hook of altv event:", event, "error:", e);
      }
    });
  }
  // don't ask me why, its working and i'm happy
  emitAltEvent(event, ...args) {
    const handlers = this.eventHandlers.local[event];
    if (!handlers) {
      this.log.debug("callAltEvent:", event, "no handlers");
      return;
    }
    handlers.forEach(async (handler) => {
      try {
        await handler(...args);
      } catch (e) {
        this.logEventException(event, e);
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  setPlayerObjectPrototype(player, playerClass = _alt.Player) {
    Object.setPrototypeOf(player, playerClass.prototype);
  }
  generateEventName(name) {
    return `___${PLUGIN_NAME}:${name}___`;
  }
  wrapBaseObjectChildClass(BaseObjectChild) {
    const proto = BaseObjectChild.prototype;
    const originalDestroy = Symbol("originalDestroy");
    const baseObjects = this.baseObjects;
    const log = this.log;
    proto[originalDestroy] = proto.destroy;
    proto.destroy = function() {
      try {
        baseObjects.delete(this);
        this[originalDestroy]();
      } catch (error) {
        log.error(`failed to destroy alt.${BaseObjectChild.name} error:`);
        throw error;
      }
    };
    const WrappedBaseObjectChild = function(...args) {
      try {
        const baseObject = new BaseObjectChild(...args);
        baseObjects.add(baseObject);
        Object.setPrototypeOf(baseObject, this.__proto__);
        return baseObject;
      } catch (error) {
        log.error(`failed to create alt.${BaseObjectChild.name} error:`);
        throw error;
      }
    };
    WrappedBaseObjectChild.prototype = BaseObjectChild.prototype;
    Object.defineProperty(WrappedBaseObjectChild, "name", {
      value: BaseObjectChild.name
    });
    try {
      const originalKeys = Object.keys(BaseObjectChild);
      for (const key of originalKeys) {
        if (DEFAULT_JS_FUNC_PROPS[key])
          continue;
        try {
          const { value, set } = Object.getOwnPropertyDescriptor(BaseObjectChild, key);
          if (typeof value === "function") {
            WrappedBaseObjectChild[key] = BaseObjectChild[key];
          } else {
            Object.defineProperty(WrappedBaseObjectChild, key, {
              get: () => BaseObjectChild[key],
              set: set?.bind(BaseObjectChild)
            });
          }
        } catch (e) {
          this.log.error(
            `detected broken alt.${BaseObjectChild.name} static property: ${key}. 
`,
            e?.stack ?? e
          );
        }
      }
    } catch (e) {
      this.log.error(e.stack ?? e);
    }
    return WrappedBaseObjectChild;
  }
  destroyBaseObjects() {
    this.log.debug("destroyBaseObjects count:", this.baseObjects.size);
    for (const obj of this.baseObjects)
      obj.destroy();
  }
  onResourceStop(handler) {
    this.origAltOn(
      "resourceStop",
      handler
    );
  }
  defineMetaSetter(proto, originalMethodKey, storeKey) {
    return function(key, value) {
      if (arguments.length < 2)
        throw new Error("2 arguments expected");
      this[originalMethodKey](key, value);
      this[storeKey] ??= {};
      this[storeKey][key] = value;
    };
  }
  hookAltLogging() {
    const customLog = (original2, ...values) => {
      original2(
        ...values.map((v) => {
          return typeof v === "string" ? v : util_inspect_default(v, { colors: true });
        })
      );
    };
    const original = this.hookAlt("log", customLog, 0);
    if (_alt.isClient)
      console.log = customLog.bind(null, original);
    if (_alt.logDebug)
      this.hookAlt("logDebug", customLog, 0);
  }
  logEventException(event, error) {
    _alt.logError(
      `Uncaught exception in event listener of event "${event}":
`,
      error?.stack ?? error
    );
  }
};
var sharedSetup = new SharedSetup(___altvEsbuild_altvInject_pluginOptions___);

// src/altv-inject/shared/events.ts
var SERVER_EVENTS = {
  restartCommand: sharedSetup.generateEventName("restartCommand"),
  clientReady: sharedSetup.generateEventName("clientReady"),
  // playerDamageOnFirstConnect altv bug fix
  playerModelsLoaded: sharedSetup.generateEventName("playerModelsLoaded")
};
var CLIENT_EVENTS = {
  playerConnect: sharedSetup.generateEventName("playerConnect"),
  connectionComplete: sharedSetup.generateEventName("connectionComplete"),
  // playerDamageOnFirstConnect altv bug fix
  loadPlayerModels: sharedSetup.generateEventName("loadPlayerModels")
};

// src/altv-inject/client/setup.ts
var _alt2 = ___altvEsbuild_altvInject_alt___;
var native;
if (_alt2.isClient) {
  native = ___altvEsbuild_altvInject_native___;
}
var ClientSetup = class {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  origAltOnServer;
  log = new Logger("client");
  clearPlayerMeta;
  onResourceStop = () => {
    this.clearGame();
    sharedSetup.destroyBaseObjects();
    this.clearPlayerMeta?.();
  };
  constructor(options2) {
    const { bugFixes, dev } = options2;
    if (bugFixes.webViewFlickering)
      this.initWebViewFlickeringBugFix();
    if (bugFixes.playerDamageOnFirstConnect)
      this.initPlayerDamageOnFirstConnectFix();
    if (dev.enabled) {
      this.origAltOnServer = sharedSetup.hookAltEventAdd("remote", "onServer", 1);
      sharedSetup.hookAltEventAdd("remote", "onceServer", 1, true);
      sharedSetup.hookAltEventRemove("remote", "offServer", 1);
      if (bugFixes.playerPrototype)
        this.initPlayerPrototypeTempFix();
      if (dev.restartCommand)
        this.initRestartConsoleCommand(options2);
      if (dev.disconnectEvent)
        this.initDisconnectEvent();
      if (dev.connectionCompleteEvent) {
        this.log.debug("dev.connectionCompleteEvent:", dev.connectionCompleteEvent);
        this.initConnectionCompleteEvent();
      }
      this.initClientReady();
      this.hookBaseObjects();
      this.clearPlayerMeta = this.initPlayerMetaCleanup();
      sharedSetup.onResourceStop(this.onResourceStop);
    }
  }
  /**
   * a temp fix for alt:V prototype bug https://github.com/altmp/altv-js-module/issues/106
   */
  initPlayerPrototypeTempFix() {
    _alt2.nextTick(() => {
      for (const p of _alt2.Player.all) {
        if (!p.valid)
          continue;
        if (p !== _alt2.Player.local)
          sharedSetup.setPlayerObjectPrototype(p);
        else {
          this.log.debug("set local player prototype");
          sharedSetup.setPlayerObjectPrototype(p, _alt2.LocalPlayer);
        }
      }
    });
    this.origAltOnServer(CLIENT_EVENTS.playerConnect, (player) => {
      sharedSetup.setPlayerObjectPrototype(player);
    });
  }
  initRestartConsoleCommand(options2) {
    const restartCommand = options2.dev.restartCommand === true ? "res" : options2.dev.restartCommand;
    this.log.debug("initRestartConsoleCommand command:", restartCommand);
    sharedSetup.origAltOn("consoleCommand", (command) => {
      if (command !== restartCommand)
        return;
      this.log.info("~gl~restarting resource");
      _alt2.emitServerRaw(SERVER_EVENTS.restartCommand);
    });
  }
  initWebViewFlickeringBugFix() {
    _alt2.everyTick(() => native.drawRect(0, 0, 0, 0, 0, 0, 0, 0, false));
  }
  initDisconnectEvent() {
    this.log.debug("initDisconnectEvent");
    sharedSetup.origAltOn(
      "resourceStop",
      () => sharedSetup.emitAltEvent("disconnect")
    );
  }
  initConnectionCompleteEvent() {
    this.log.debug("initConnectionCompleteEvent");
    let connectionCompleteCalled = false;
    sharedSetup.origAltOn("connectionComplete", () => {
      connectionCompleteCalled = true;
    });
    this.origAltOnServer(CLIENT_EVENTS.connectionComplete, () => {
      this.log.debug("received connectionComplete");
      if (connectionCompleteCalled)
        return;
      sharedSetup.emitAltEvent("connectionComplete");
    });
  }
  initClientReady() {
    _alt2.emitServerRaw(SERVER_EVENTS.clientReady);
  }
  clearGame() {
    const player = _alt2.Player.local;
    native.freezeEntityPosition(player, false);
    native.setEntityVisible(player, true, false);
    native.doScreenFadeIn(0);
    native.triggerScreenblurFadeOut(0);
    native.stopAudioScenes();
    native.newLoadSceneStop();
    native.destroyAllCams(false);
    native.animpostfxStopAll();
    native.setCamDeathFailEffectState(0);
    native.displayHud(true);
    native.displayRadar(true);
    _alt2.FocusData.clearFocus();
    native.setFrontendActive(false);
  }
  hookBaseObjects() {
    for (const _key in _alt2) {
      const key = _key;
      const value = _alt2[key];
      if (!(this.isAltBlipClass(value) || this.isAltObjectClass(value)))
        continue;
      this.log.debug("hooking class:", value.name);
      _alt2[key] = sharedSetup.wrapBaseObjectChildClass(value);
    }
  }
  isAltBlipClass(value) {
    return value.prototype instanceof _alt2.Blip;
  }
  isAltObjectClass(value) {
    return (
      /* eslint-disable @typescript-eslint/ban-types */
      value.prototype instanceof _alt2.Entity && value.name === "Object"
    );
  }
  initPlayerMetaCleanup() {
    const proto = _alt2.Player.prototype;
    const _proto = proto;
    const metaStoreKey = Symbol("metaStoreKey");
    const originalSetMeta = Symbol("originalSetMeta");
    _proto[originalSetMeta] = proto.setMeta;
    proto.setMeta = sharedSetup.defineMetaSetter(_proto, originalSetMeta, metaStoreKey);
    return () => {
      for (const player of _alt2.Player.all) {
        if (!player?.valid)
          continue;
        const _player = player;
        for (const key in _player[metaStoreKey])
          player.deleteMeta(key);
      }
    };
  }
  initPlayerDamageOnFirstConnectFix() {
    const onServer = this.origAltOnServer ?? _alt2.onServer;
    onServer(CLIENT_EVENTS.loadPlayerModels, async () => {
      this.log.debug("playerDamageOnFirstConnectFix loading models...");
      const results = await Promise.allSettled([
        _alt2.Utils.requestModel("mp_m_freemode_01"),
        _alt2.Utils.requestModel("mp_f_freemode_01")
      ]);
      this.log.debug("playerDamageOnFirstConnectFix load model promises results", results);
      _alt2.emitServerRaw(SERVER_EVENTS.playerModelsLoaded);
    });
  }
};

// src/shared/util/controlled-promise.ts
var ControlledPromise = class {
  _promise;
  _resolve;
  _reject;
  constructor() {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  get promise() {
    return this._promise;
  }
  resolve(value) {
    this._resolve(value);
  }
  reject(error) {
    this._reject(error instanceof Error ? error : new Error(error));
  }
};

// src/shared/util/socket-connect.ts
var _SocketConnect = class {
  constructor(name, _net2, port, connectHandler) {
    this.name = name;
    this._net = _net2;
    this.port = port;
    this.connectHandler = connectHandler;
    this._socket = this.connect();
  }
  logDebug = true ? (info) => console.log(`[${this.name}][DEBUG]`, info) : () => {
  };
  onError = (e) => {
    if (!(e?.code === "ECONNRESET" || e?.code === "ECONNREFUSED"))
      return;
    this.logDebug(`disconnected from server, trying reconnecting in ${_SocketConnect.RECONNECT_MS}ms...`);
    setTimeout(
      () => this.connect(),
      _SocketConnect.RECONNECT_MS
    );
  };
  onConnect = (socket) => {
    this.connectHandler(socket);
  };
  _socket;
  get socket() {
    return this._socket;
  }
  connect() {
    if (this._socket)
      this._socket.destroy();
    const socket = this._net.connect(this.port);
    socket.on("connect", this.onConnect.bind(this, socket));
    socket.on("error", this.onError);
    return socket;
  }
};
var SocketConnect = _SocketConnect;
__publicField(SocketConnect, "RECONNECT_MS", 500);

// src/altv-inject/server/setup.ts
var _alt3 = ___altvEsbuild_altvInject_alt___;
var _net;
if (_alt3.isServer)
  _net = await (async () => await import("net"))();
var _ServerSetup = class {
  constructor(options2) {
    this.options = options2;
    const { dev, bugFixes } = options2;
    if (bugFixes.playerDamageOnFirstConnect)
      this.initPlayerDamageOnFirstConnectFix();
    if (dev.enabled) {
      this.origAltOnClient = sharedSetup.hookAltEventAdd("remote", "onClient", 1);
      sharedSetup.hookAltEventAdd("remote", "onceClient", 1, true);
      sharedSetup.hookAltEventRemove("remote", "offClient", 1);
      sharedSetup.hookAlt("setSyncedMeta", (original, key, value) => {
        this.syncedMetaKeys.add(key);
        original(key, value);
      }, 2);
      this.hookBaseObjects();
      const clearPlayerMeta = this.hookAltPlayer();
      let despawnPlayers = () => {
      };
      if (dev.playersReconnect) {
        this.initPlayersReconnect(options2);
        const streamOutPos = new _alt3.Vector3((_alt3.getServerConfig().mapBoundsMaxX ?? 1e5) + 2e3);
        this.log.debug("despawnPlayers streamOutPos:", streamOutPos);
        despawnPlayers = this.despawnPlayers.bind(this, streamOutPos);
      }
      sharedSetup.onResourceStop(
        this.onResourceStop.bind(
          this,
          clearPlayerMeta,
          despawnPlayers
        )
      );
      this.log.debug("dev.hotReload:", dev.hotReload);
      if (dev.hotReload) {
        this.log.debug("init socketConnect");
        this.socketConnect = new SocketConnect(
          "server-inject",
          _net,
          this.options.dev.hotReloadServerPort,
          (socket) => {
            this.socket = socket;
            this.eventManager = this.initEventManager(socket);
            this.onConnect();
            this.connectedAgain = true;
          }
        );
      }
      if (dev.enhancedRestartCommand)
        this.initEnhancedRestartCommand(options2);
      else if (dev.restartCommand)
        this.initRestartConsoleCommand(options2);
      if (dev.connectionCompleteEvent)
        this.initConnectionCompleteEvent();
      if (bugFixes.playerPrototype)
        this.initPlayerPrototypeTempFix();
      if (dev.serverStartedEvent)
        this.initServerStartedEvent();
    }
  }
  events = {
    buildStart: (mode) => {
      this.log.debug(`[buildStart] ms: ${(/* @__PURE__ */ new Date()).getMilliseconds()} mode:`, mode);
      this.onBuildStart(mode);
    },
    buildEnd: (mode, cached) => {
      this.log.debug("[buildEnd] received:", mode);
      if (cached) {
        this.log.debug("received cached buildEnd -> emulate buildStart first");
        this.onBuildStart(mode);
      }
      if (!this.buildsInProgress.delete(mode)) {
        this.log.debug(`received unknown buildEnd: ${mode}, do nothing`);
        return;
      }
      if (this.buildsInProgress.size) {
        this.log.debug("remaining builds in progress:", this.buildsInProgress.size);
        if (this.waitingForBuildEnd === mode)
          this.waitingForBuildEnd = this.flipMode(mode);
        return;
      }
      if (this.waitingForBuildEnd !== mode) {
        this.log.debug("received not what we waiting for");
        return;
      }
      this.log.debug("no builds in progress -> restart");
      this.restartResource();
    },
    clientConnect: () => {
      this.log.debug("clientConnect");
      this.clientConnected = true;
    },
    clientDisconnect: () => {
      this.log.debug("clientDisconnect");
      this.clientConnected = false;
    }
  };
  onConnect = () => {
    if (this.connectedAgain) {
      this.restartResource();
      return;
    }
    this.log.debug("net socket connected, sending connect server event");
    this.sendEvent("connect", "server");
  };
  onSocketError = (msg, e) => {
    this.log.error("[events]", msg, e);
  };
  onResourceStop = (clearPlayerMeta, despawnPlayers) => {
    this.log.debug("resourceStop");
    for (const key of this.syncedMetaKeys) {
      this.log.debug("deleting synced meta key:", key);
      _alt3.deleteSyncedMeta(key);
    }
    clearPlayerMeta();
    despawnPlayers();
    sharedSetup.destroyBaseObjects();
  };
  socket;
  eventManager;
  log = new Logger("server");
  clientConnected = false;
  anotherBuildStartTimeout = null;
  waitingForBuildEnd = null;
  restartInProgress = false;
  connectedAgain = false;
  buildsInProgress = /* @__PURE__ */ new Set();
  syncedMetaKeys = /* @__PURE__ */ new Set();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  origAltOnClient;
  socketConnect;
  playerReadyEvents = /* @__PURE__ */ new Map();
  sendEvent(event, ...args) {
    if (!this.eventManager) {
      this.log.error("[sendEvent] no event manager");
      return;
    }
    this.eventManager?.send(event, ...args);
  }
  restartResource() {
    if (this.restartInProgress) {
      this.log.error("resource restart already in progress");
      return;
    }
    this.restartInProgress = true;
    this.clearCurrentBuild();
    const name = this.getFullResourceName();
    this.log.info(`restarting resource ${name}...`);
    _alt3.restartResource(name);
  }
  clearCurrentBuild() {
    this.waitingForBuildEnd = null;
    this.buildsInProgress.clear();
  }
  flipMode(mode) {
    return mode === "client" ? "server" : "client";
  }
  initEventManager(socket) {
    return new EventManager(
      socket,
      this.events,
      this.onSocketError
    );
  }
  hookAltPlayer() {
    const proto = _alt3.Player.prototype;
    const metaStoreKey = Symbol("metaStoreKey");
    const syncedMetaStoreKey = Symbol("syncedMetaStoreKey");
    const streamSyncedMetaStoreKey = Symbol("streamSyncedMetaStoreKey");
    const localMetaStoreKey = Symbol("localMetaStoreKey");
    const originalSetMeta = Symbol("originalSetMeta");
    const originalSetSyncedMeta = Symbol("originalSetSyncedMeta");
    const originalSetStreamSyncedMeta = Symbol("originalSetStreamSyncedMeta");
    const originalSetLocalMeta = Symbol("originalSetLocalMeta");
    const _proto = proto;
    _proto[originalSetMeta] = proto.setMeta;
    _proto[originalSetSyncedMeta] = proto.setSyncedMeta;
    _proto[originalSetStreamSyncedMeta] = proto.setStreamSyncedMeta;
    _proto[originalSetLocalMeta] = proto.setLocalMeta;
    proto.setMeta = sharedSetup.defineMetaSetter(_proto, originalSetMeta, metaStoreKey);
    proto.setSyncedMeta = sharedSetup.defineMetaSetter(_proto, originalSetSyncedMeta, syncedMetaStoreKey);
    proto.setStreamSyncedMeta = sharedSetup.defineMetaSetter(_proto, originalSetStreamSyncedMeta, streamSyncedMetaStoreKey);
    proto.setLocalMeta = sharedSetup.defineMetaSetter(_proto, originalSetLocalMeta, localMetaStoreKey);
    return () => {
      for (const player of _alt3.Player.all) {
        if (!player?.valid)
          continue;
        const _player = player;
        for (const key in _player[metaStoreKey])
          player.deleteMeta(key);
        for (const key in _player[syncedMetaStoreKey])
          player.deleteSyncedMeta(key);
        for (const key in _player[streamSyncedMetaStoreKey])
          player.deleteStreamSyncedMeta(key);
        for (const key in _player[localMetaStoreKey])
          player.deleteLocalMeta(key);
      }
    };
  }
  initPlayersReconnect({ dev: { playersReconnectDelay, playersReconnectResetPos } }) {
    const resourceRestartedKey = `${PLUGIN_NAME}:resourceRestarted`;
    this.log.debug("_alt.getMeta(resourceRestartedKey):", _alt3.getMeta(resourceRestartedKey));
    if (!_alt3.getMeta(resourceRestartedKey)) {
      this.log.debug("set resource restarted");
      sharedSetup.origAltSetMeta(resourceRestartedKey, true);
      return;
    }
    const players = _alt3.Player.all;
    if (!players.length) {
      this.log.debug("no players to reconnect");
      return;
    }
    for (const p of players) {
      if (!p.valid)
        continue;
      this.initPlayerReadyEvent(p);
    }
    this.log.info(`start a timer for ~cl~${playersReconnectDelay}~w~ ms to reconnect players (${players.length})`);
    setTimeout(() => {
      for (const p of players) {
        if (!p.valid)
          continue;
        p.dimension = _alt3.defaultDimension;
        p.streamed = true;
        p.collision = true;
        p.invincible = false;
        p.visible = true;
        p.frozen = false;
        this.waitForPlayerReadyEvent(p).then((res) => {
          if (!res) {
            this.log.debug("waitForPlayerReadyEvent promise resolved false, player disconnected");
            return;
          }
          this.log.debug("waitForPlayerReadyEvent success player:", p.name, p.id);
          sharedSetup.emitAltEvent("playerConnect", p);
        }).catch((e) => {
          this.log.error(e.stack);
        });
      }
    }, playersReconnectDelay);
  }
  despawnPlayers(streamOutPos) {
    this.log.debug("despawn players");
    for (const p of _alt3.Player.all) {
      if (!p.valid)
        continue;
      p.removeAllWeapons();
      p.clearBloodDamage();
      p.detach();
      p.despawn();
      p.visible = false;
      if (this.options.dev.playersReconnectResetPos)
        p.pos = streamOutPos;
    }
  }
  /**
   * a temp fix for alt:V prototype bug https://github.com/altmp/altv-js-module/issues/106
   */
  initPlayerPrototypeTempFix() {
    _alt3.nextTick(() => {
      for (const p of _alt3.Player.all) {
        if (!p.valid)
          continue;
        sharedSetup.setPlayerObjectPrototype(p);
      }
    });
    sharedSetup.origAltOn("playerConnect", (player) => {
      sharedSetup.setPlayerObjectPrototype(player);
    });
  }
  initRestartConsoleCommand(options2) {
    const restartCommand = options2.dev.restartCommand === true ? "res" : options2.dev.restartCommand;
    const triggerRestart = () => {
      this.restartResource();
    };
    sharedSetup.origAltOn("consoleCommand", (command) => {
      if (command !== restartCommand)
        return;
      triggerRestart();
    });
    this.origAltOnClient(SERVER_EVENTS.restartCommand, () => {
      triggerRestart();
    });
  }
  initEnhancedRestartCommand({ dev: { enhancedRestartCommand } }) {
    const commandName = enhancedRestartCommand === true ? "res" : enhancedRestartCommand;
    if (!_alt3.hasResource(RESOURCE_CONTROL_ALTV_NAME)) {
      this.log.debug("control resource is not started", RESOURCE_CONTROL_ALTV_NAME);
      const pathForStarting = `../node_modules/altv-esbuild/dist/${RESOURCE_CONTROL_ALTV_NAME}`;
      this.log.debug("resource control path:", pathForStarting);
      _alt3.nextTick(() => {
        sharedSetup.origAltOnce(
          sharedSetup.generateEventName("resourceControlReady"),
          () => {
            _alt3.emit(
              sharedSetup.generateEventName("resourceControlInit"),
              this.getFullResourceName(),
              commandName
            );
          }
        );
        _alt3.startResource(pathForStarting);
      });
    } else
      this.log.debug("control resource already started", RESOURCE_CONTROL_ALTV_NAME);
  }
  initConnectionCompleteEvent() {
    this.log.debug("initConnectionCompleteEvent");
    this.origAltOnClient(SERVER_EVENTS.clientReady, (player) => {
      this.log.debug("received clientReady player:", player.name, player.id);
      player.emitRaw(CLIENT_EVENTS.connectionComplete);
      const ready = this.playerReadyEvents.get(player);
      if (!ready) {
        this.log.debug("cant get ready event, skip");
        return;
      }
      ready.resolve(true);
    });
  }
  hookBaseObjects() {
    for (const _key in _alt3) {
      const key = _key;
      const BaseObjectClass = _alt3[key];
      if (!this.isBaseObjectClass(BaseObjectClass))
        continue;
      let isClassAbstract = false;
      try {
        new BaseObjectClass();
        isClassAbstract = true;
      } catch (e) {
        if (e?.message?.includes("abstract"))
          isClassAbstract = true;
      }
      if (isClassAbstract)
        continue;
      _alt3[key] = sharedSetup.wrapBaseObjectChildClass(BaseObjectClass);
    }
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  isBaseObjectClass(value) {
    return value.prototype instanceof _alt3.BaseObject && // Player class is bugged, see function initPlayerPrototypeTempFix
    value !== _alt3.Player;
  }
  onBuildStart(mode) {
    const flippedMode = this.flipMode(mode);
    this.buildsInProgress.add(mode);
    if (this.buildsInProgress.size === 1 && this.waitingForBuildEnd === flippedMode && this.buildsInProgress.has(flippedMode)) {
      this.log.debug(`waiting currently for first build, change waitingForBuildEnd to: ${mode}`);
      this.waitingForBuildEnd = mode;
      return;
    }
    if (this.anotherBuildStartTimeout) {
      this.log.debug("[buildStart] received another build:", mode, "clear timeout");
      clearTimeout(this.anotherBuildStartTimeout);
      this.anotherBuildStartTimeout = null;
      return;
    }
    if (mode === "server") {
      if (!this.clientConnected) {
        this.log.debug("[buildStart] client is not connected, skip waiting for another build");
        this.waitingForBuildEnd = mode;
        return;
      }
    }
    this.waitingForBuildEnd = flippedMode;
    this.log.debug(`[buildStart] waiting for another build: ${this.waitingForBuildEnd} to start...`);
    this.anotherBuildStartTimeout = setTimeout(() => {
      this.anotherBuildStartTimeout = null;
      this.log.debug(`another build didnt started after ${_ServerSetup.MAX_ANOTHER_BUILD_START_MS}ms`);
      if (this.buildsInProgress.has(mode)) {
        this.log.debug(`waiting for build: ${mode} to end now...`);
        this.waitingForBuildEnd = mode;
      } else {
        this.log.debug(`first build: ${mode} ended -> restart`);
        this.restartResource();
      }
    }, _ServerSetup.MAX_ANOTHER_BUILD_START_MS);
  }
  initPlayerReadyEvent(player) {
    const ready = new ControlledPromise();
    this.playerReadyEvents.set(player, ready);
    const handler = (_player) => {
      if (_player !== player)
        return;
      this.playerReadyEvents.delete(player);
      ready.resolve(false);
    };
    ready.promise.finally(() => {
      sharedSetup.origAltOff("playerDisconnect", handler);
    });
    sharedSetup.origAltOn("playerDisconnect", handler);
    this.origAltOnClient(sharedSetup.generateEventName("playerReady"), handler);
  }
  async waitForPlayerReadyEvent(player) {
    const ready = this.playerReadyEvents.get(player);
    if (!ready) {
      this.log.warn("waitForPlayerReadyEvent unknown player:", player.name, player.id);
      return false;
    }
    return await ready.promise;
  }
  getFullResourceName() {
    const { path } = _alt3.Resource.current;
    const resourcesDir = `${_alt3.rootDir}\\resources\\`;
    return path.slice(resourcesDir.length).replaceAll("\\", "/");
  }
  initServerStartedEvent() {
    this.log.debug("initServerStartedEvent");
    let timer = new _alt3.Utils.Timeout(() => {
      timer = null;
      this.log.debug("emitting serverStarted from timer");
      sharedSetup.emitAltEvent("serverStarted");
    }, 500);
    sharedSetup.hookAltEvent("serverStarted", (...args) => {
      if (!timer) {
        this.log.error("original serverStarted was called, but timer is already null");
        return false;
      }
      timer?.destroy();
      timer = null;
      this.log.debug("emitting serverStarted from original");
      return args;
    });
  }
  initPlayerDamageOnFirstConnectFix() {
    const loadingModelPromises = /* @__PURE__ */ new Map();
    const resolvePlayer = (promise, player) => {
      if (!player.valid) {
        promise.reject(new Error("[playerDamageOnFirstConnectFix] player object is invalid"));
        return;
      }
      promise.resolve([player]);
    };
    sharedSetup.hookAltEvent(
      "playerConnect",
      (player) => {
        this.log.debug("playerDamageOnFirstConnectFix received playerConnect", player.name, player.id);
        const promise = new ControlledPromise();
        loadingModelPromises.set(player, promise);
        let timeout = _alt3.setTimeout(() => {
          timeout = 0;
          this.log.warn("[playerDamageOnFirstConnectFix] resolve playerConnect after timeout");
          resolvePlayer(promise, player);
        }, 5e3);
        promise.promise.finally(() => {
          this.log.debug("playerDamageOnFirstConnectFix promise.finally player:", player.name, player.id);
          if (timeout) {
            _alt3.clearTimeout(timeout);
            timeout = 0;
          }
          loadingModelPromises.delete(player);
        });
        player.emitRaw(CLIENT_EVENTS.loadPlayerModels);
        return promise.promise;
      }
    );
    const onClient = this.origAltOnClient ?? _alt3.onClient;
    onClient(SERVER_EVENTS.playerModelsLoaded, (player) => {
      this.log.debug("received playerModelsLoaded player:", player.name, player.id);
      const promise = loadingModelPromises.get(player);
      if (!promise) {
        this.log.debug("cant get loadingModelPromise, skip");
        return;
      }
      resolvePlayer(promise, player);
    });
  }
};
var ServerSetup = _ServerSetup;
// TODO: need to do something with this shit: (e.g. when only server changes it takes time to restart)
__publicField(ServerSetup, "MAX_ANOTHER_BUILD_START_MS", 500);
__publicField(ServerSetup, "RECONNECT_MS", 500);

// src/altv-inject/main.ts
var options = ___altvEsbuild_altvInject_pluginOptions___;
if (options.mode === "client")
  new ClientSetup(options);
else
  new ServerSetup(options);
