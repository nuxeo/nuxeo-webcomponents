/*  Prototype JavaScript framework, version 1.6.0.3
 *  (c) 2005-2008 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.6.0.3',

  Browser: {
    IE:     !!(window.attachEvent &&
      navigator.userAgent.indexOf('Opera') === -1),
    Opera:  navigator.userAgent.indexOf('Opera') > -1,
    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 &&
      navigator.userAgent.indexOf('KHTML') === -1,
    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
  },

  BrowserFeatures: {
    XPath: !!document.evaluate,
    SelectorsAPI: !!document.querySelector,
    ElementExtensions: !!window.HTMLElement,
    SpecificElementExtensions:
      document.createElement('div')['__proto__'] &&
      document.createElement('div')['__proto__'] !==
        document.createElement('form')['__proto__']
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


/* Based on Alex Arnell's inheritance implementation. */
var Class = {
  create: function() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;

    return klass;
  }
};

Class.Methods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);

    if (!Object.keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames().first() == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments) };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

var Abstract = { };

Object.extend = function(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
};

Object.extend(Object, {
  inspect: function(object) {
    try {
      if (Object.isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },

  toJSON: function(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }

    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (Object.isElement(object)) return;

    var results = [];
    for (var property in object) {
      var value = Object.toJSON(object[property]);
      if (!Object.isUndefined(value))
        results.push(property.toJSON() + ': ' + value);
    }

    return '{' + results.join(', ') + '}';
  },

  toQueryString: function(object) {
    return $H(object).toQueryString();
  },

  toHTML: function(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return Object.extend({ }, object);
  },

  isElement: function(object) {
    return !!(object && object.nodeType == 1);
  },

  isArray: function(object) {
    return object != null && typeof object == "object" &&
      'splice' in object && 'join' in object;
  },

  isHash: function(object) {
    return object instanceof Hash;
  },

  isFunction: function(object) {
    return typeof object == "function";
  },

  isString: function(object) {
    return typeof object == "string";
  },

  isNumber: function(object) {
    return typeof object == "number";
  },

  isUndefined: function(object) {
    return typeof object == "undefined";
  }
});

Object.extend(Function.prototype, {
  argumentNames: function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1]
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  },

  bind: function() {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = $A(arguments), object = args.shift();
    return function() {
      return __method.apply(object, args.concat($A(arguments)));
    }
  },

  bindAsEventListener: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function(event) {
      return __method.apply(object, [event || window.event].concat(args));
    }
  },

  curry: function() {
    if (!arguments.length) return this;
    var __method = this, args = $A(arguments);
    return function() {
      return __method.apply(this, args.concat($A(arguments)));
    }
  },

  delay: function() {
    var __method = this, args = $A(arguments), timeout = args.shift() * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  },

  defer: function() {
    var args = [0.01].concat($A(arguments));
    return this.delay.apply(this, args);
  },

  wrap: function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    }
  },

  methodize: function() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      return __method.apply(null, [this].concat($A(arguments)));
    };
  }
});

Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"';
};

var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};

/*--------------------------------------------------------------------------*/

var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepareReplacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  stripTags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  stripScripts: function() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  },

  extractScripts: function() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  evalScripts: function() {
    return this.extractScripts().map(function(script) { return eval(script) });
  },

  escapeHTML: function() {
    var self = arguments.callee;
    self.text.data = this;
    return self.div.innerHTML;
  },

  unescapeHTML: function() {
    var div = new Element('div');
    div.innerHTML = this.stripTags();
    return div.childNodes[0] ? (div.childNodes.length > 1 ?
      $A(div.childNodes).inject('', function(memo, node) { return memo+node.nodeValue }) :
      div.childNodes[0].nodeValue) : '';
  },

  toQueryParams: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  },

  toArray: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = String.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  toJSON: function() {
    return this.inspect(true);
  },

  unfilterJSON: function(filter) {
    return this.sub(filter || Prototype.JSONFilter, '#{1}');
  },

  isJSON: function() {
    var str = this;
    if (str.blank()) return false;
    str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  evalJSON: function(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  include: function(pattern) {
    return this.indexOf(pattern) > -1;
  },

  startsWith: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  endsWith: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  empty: function() {
    return this == '';
  },

  blank: function() {
    return /^\s*$/.test(this);
  },

  interpolate: function(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }
});

if (Prototype.Browser.WebKit || Prototype.Browser.IE) Object.extend(String.prototype, {
  escapeHTML: function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
  unescapeHTML: function() {
    return this.stripTags().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
});

String.prototype.gsub.prepareReplacement = function(replacement) {
  if (Object.isFunction(replacement)) return replacement;
  var template = new Template(replacement);
  return function(match) { return template.evaluate(match) };
};

String.prototype.parseQuery = String.prototype.toQueryParams;

Object.extend(String.prototype.escapeHTML, {
  div:  document.createElement('div'),
  text: document.createTextNode('')
});

String.prototype.escapeHTML.div.appendChild(String.prototype.escapeHTML.text);

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return '';

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].gsub('\\\\]', ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = {
  each: function(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  },

  eachSlice: function(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  },

  all: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  },

  any: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  },

  collect: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  },

  detect: function(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  },

  findAll: function(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  },

  grep: function(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(filter);

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  },

  include: function(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  },

  inGroupsOf: function(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  },

  inject: function(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  },

  invoke: function(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  },

  max: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  },

  min: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  },

  partition: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  },

  pluck: function(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  },

  reject: function(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  },

  sortBy: function(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  },

  toArray: function() {
    return this.map();
  },

  zip: function() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  },

  size: function() {
    return this.toArray().length;
  },

  inspect: function() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }
};

Object.extend(Enumerable, {
  map:     Enumerable.collect,
  find:    Enumerable.detect,
  select:  Enumerable.findAll,
  filter:  Enumerable.findAll,
  member:  Enumerable.include,
  entries: Enumerable.toArray,
  every:   Enumerable.all,
  some:    Enumerable.any
});
function $A(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}

if (Prototype.Browser.WebKit) {
  $A = function(iterable) {
    if (!iterable) return [];
    // In Safari, only use the `toArray` method if it's not a NodeList.
    // A NodeList is a function, has an function `item` property, and a numeric
    // `length` property. Adapted from Google Doctype.
    if (!(typeof iterable === 'function' && typeof iterable.length ===
        'number' && typeof iterable.item === 'function') && iterable.toArray)
      return iterable.toArray();
    var length = iterable.length || 0, results = new Array(length);
    while (length--) results[length] = iterable[length];
    return results;
  };
}

Array.from = $A;

Object.extend(Array.prototype, Enumerable);

if (!Array.prototype._reverse) Array.prototype._reverse = Array.prototype.reverse;

Object.extend(Array.prototype, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },

  clear: function() {
    this.length = 0;
    return this;
  },

  first: function() {
    return this[0];
  },

  last: function() {
    return this[this.length - 1];
  },

  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },

  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat(Object.isArray(value) ?
        value.flatten() : [value]);
    });
  },

  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },

  reduce: function() {
    return this.length > 1 ? this : this[0];
  },

  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },

  intersect: function(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  },

  clone: function() {
    return [].concat(this);
  },

  size: function() {
    return this.length;
  },

  inspect: function() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  },

  toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (!Object.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }
});

// use native browser JS 1.6 implementation if available
if (Object.isFunction(Array.prototype.forEach))
  Array.prototype._each = Array.prototype.forEach;

if (!Array.prototype.indexOf) Array.prototype.indexOf = function(item, i) {
  i || (i = 0);
  var length = this.length;
  if (i < 0) i = length + i;
  for (; i < length; i++)
    if (this[i] === item) return i;
  return -1;
};

if (!Array.prototype.lastIndexOf) Array.prototype.lastIndexOf = function(item, i) {
  i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
  var n = this.slice(0, i).reverse().indexOf(item);
  return (n < 0) ? n : i - n - 1;
};

Array.prototype.toArray = Array.prototype.clone;

function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

if (Prototype.Browser.Opera){
  Array.prototype.concat = function() {
    var array = [];
    for (var i = 0, length = this.length; i < length; i++) array.push(this[i]);
    for (var i = 0, length = arguments.length; i < length; i++) {
      if (Object.isArray(arguments[i])) {
        for (var j = 0, arrayLength = arguments[i].length; j < arrayLength; j++)
          array.push(arguments[i][j]);
      } else {
        array.push(arguments[i]);
      }
    }
    return array;
  };
}
Object.extend(Number.prototype, {
  toColorPart: function() {
    return this.toPaddedString(2, 16);
  },

  succ: function() {
    return this + 1;
  },

  times: function(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  },

  toPaddedString: function(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  },

  toJSON: function() {
    return isFinite(this) ? this.toString() : 'null';
  }
});

$w('abs round ceil floor').each(function(method){
  Number.prototype[method] = Math[method].methodize();
});
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  return {
    initialize: function(object) {
      this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
    },

    _each: function(iterator) {
      for (var key in this._object) {
        var value = this._object[key], pair = [key, value];
        pair.key = key;
        pair.value = value;
        iterator(pair);
      }
    },

    set: function(key, value) {
      return this._object[key] = value;
    },

    get: function(key) {
      // simulating poorly supported hasOwnProperty
      if (this._object[key] !== Object.prototype[key])
        return this._object[key];
    },

    unset: function(key) {
      var value = this._object[key];
      delete this._object[key];
      return value;
    },

    toObject: function() {
      return Object.clone(this._object);
    },

    keys: function() {
      return this.pluck('key');
    },

    values: function() {
      return this.pluck('value');
    },

    index: function(value) {
      var match = this.detect(function(pair) {
        return pair.value === value;
      });
      return match && match.key;
    },

    merge: function(object) {
      return this.clone().update(object);
    },

    update: function(object) {
      return new Hash(object).inject(this, function(result, pair) {
        result.set(pair.key, pair.value);
        return result;
      });
    },

    toQueryString: function() {
      return this.inject([], function(results, pair) {
        var key = encodeURIComponent(pair.key), values = pair.value;

        if (values && typeof values == 'object') {
          if (Object.isArray(values))
            return results.concat(values.map(toQueryPair.curry(key)));
        } else results.push(toQueryPair(key, values));
        return results;
      }).join('&');
    },

    inspect: function() {
      return '#<Hash:{' + this.map(function(pair) {
        return pair.map(Object.inspect).join(': ');
      }).join(', ') + '}>';
    },

    toJSON: function() {
      return Object.toJSON(this.toObject());
    },

    clone: function() {
      return new Hash(this);
    }
  }
})());

Hash.prototype.toTemplateReplacements = Hash.prototype.toObject;
Hash.from = $H;
var ObjectRange = Class.create(Enumerable, {
  initialize: function(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  },

  _each: function(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  },

  include: function(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }
});

var $R = function(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
};

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});

Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});

Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    //NXP-3600
    return !status || (status >= 200 && status < 300) || status == 304 || status == 1223;
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,
  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});
function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  // DOM level 2 ECMAScript Language Binding
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

(function() {
  var element = this.Element;
  this.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (Prototype.Browser.IE && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(this.Element, element || { });
  if (element) this.Element.prototype = element.prototype;
}).call(window);

Element.cache = { };

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);
    content = Object.toHTML(content);
    element.innerHTML = content.stripScripts();
    content.evalScripts.bind(content).defer();
    return element;
  },

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  descendants: function(element) {
    return $(element).select("*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },

  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },

  match: function(element, selector) {
    if (Object.isString(selector))
      selector = new Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return Object.isNumber(expression) ? ancestors[expression] :
      Selector.findElement(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    return Object.isNumber(expression) ? element.descendants()[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return Object.isNumber(expression) ? previousSiblings[expression] :
      Selector.findElement(previousSiblings, expression, index);
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return Object.isNumber(expression) ? nextSiblings[expression] :
      Selector.findElement(nextSiblings, expression, index);
  },

  select: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element, args);
  },

  adjacent: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element.parentNode, args).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = element.readAttribute('id'), self = arguments.callee;
    if (id) return id;
    do { id = 'anonymous_element_' + self.counter++ } while ($(id));
    element.writeAttribute('id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return $(element).getDimensions().height;
  },

  getWidth: function(element) {
    return $(element).getDimensions().width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return element[element.hasClassName(className) ?
      'removeClassName' : 'addClassName'](className);
  },

  // removes whitespace-only text node children
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = element.cumulativeOffset();
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = element.getStyle('display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'absolute') return element;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    var offsets = element.positionedOffset();
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'relative') return element;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);

    // NXP-2586
    // while ((element = element.parentNode) && element != document.body)
    while ((element = element.parentNode) && element != document.body && Object.isElement(element)) 
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    // find page position of source
    source = $(source);
    var p = source.viewportOffset();

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements,
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = element.getOffsetParent();
      delta = parent.viewportOffset();
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Element.Methods.identify.counter = 1;

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,
  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'left': case 'top': case 'right': case 'bottom':
          if (proceed(element, 'position') === 'static') return null;
        case 'height': case 'width':
          // returns '0px' for hidden elements; we want it to return null
          if (!Element.visible(element)) return null;

          // returns the border-box dimensions rather than the content-box
          // dimensions, so we subtract padding and borders from the value
          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  // IE doesn't report offsets correctly for static elements, so we change them
  // to "relative" to get the values, then change them back.
  Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
    function(proceed, element) {
      element = $(element);
      // IE throws an error if element is not in document
      try { element.offsetParent }
      catch(e) { return $(document.body) }
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);
      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    }
  );

  $w('positionedOffset viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(
      function(proceed, element) {
        element = $(element);
        try { element.offsetParent }
        catch(e) { return Element._returnOffset(0,0) }
        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);
        // Trigger hasLayout on the offset parent so that IE6 reports
        // accurate offsetTop and offsetLeft values for position: fixed.
        var offsetParent = element.getOffsetParent();
        if (offsetParent && offsetParent.getStyle('position') === 'fixed')
          offsetParent.setStyle({ zoom: 1 });
        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );
  });

  Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(
    function(proceed, element) {
      try { element.offsetParent }
      catch(e) { return Element._returnOffset(0,0) }
      return proceed(element);
    }
  );

  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = {
    read: {
      names: {
        'class': 'className',
        'for':   'htmlFor'
      },
      values: {
        _getAttr: function(element, attribute) {
          return element.getAttribute(attribute, 2);
        },
        _getAttrNode: function(element, attribute) {
          var node = element.getAttributeNode(attribute);
          return node ? node.value : "";
        },
        _getEv: function(element, attribute) {
          attribute = element.getAttribute(attribute);
          return attribute ? attribute.toString().slice(23, -2) : null;
        },
        _flag: function(element, attribute) {
          return $(element).hasAttribute(attribute) ? attribute : null;
        },
        style: function(element) {
          return element.style.cssText.toLowerCase();
        },
        title: function(element) {
          return element.title;
        }
      }
    }
  };

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr,
      src:         v._getAttr,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);
}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if(element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };

  // Safari returns margins on body which is incorrect if the child is absolutely
  // positioned.  For performance reasons, redefine Element#cumulativeOffset for
  // KHTML/WebKit only.
  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return Element._returnOffset(valueL, valueT);
  };
}

if (Prototype.Browser.IE || Prototype.Browser.Opera) {
  // IE and Opera are missing .innerHTML support for TABLE-related and SELECT elements
  Element.Methods.update = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);

    content = Object.toHTML(content);
    var tagName = element.tagName.toUpperCase();

    if (tagName in Element._insertionTranslations.tags) {
      $A(element.childNodes).each(function(node) { element.removeChild(node) });
      Element._getContentFromAnonymousElement(tagName, content.stripScripts())
        .each(function(node) { element.appendChild(node) });
    }
    else element.innerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

if ('outerHTML' in document.createElement('div')) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next();
      var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    t[2].times(function() { div = div.firstChild });
  } else div.innerHTML = html;
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  Object.extend(this.tags, {
    THEAD: this.tags.TBODY,
    TFOOT: this.tags.TBODY,
    TH:    this.tags.TD
  });
}).call(Element._insertionTranslations);

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

if (!Prototype.BrowserFeatures.ElementExtensions &&
    document.createElement('div')['__proto__']) {
  window.HTMLElement = { };
  window.HTMLElement.prototype = document.createElement('div')['__proto__'];
  Prototype.BrowserFeatures.ElementExtensions = true;
}

Element.extend = (function() {
  if (Prototype.BrowserFeatures.SpecificElementExtensions)
    return Prototype.K;

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || element._extendedByPrototype ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
      tagName = element.tagName.toUpperCase(), property, value;

    // extend methods for specific tags
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    for (property in methods) {
      value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      // extend methods for all tags (Safari doesn't need this)
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    window[klass] = { };
    window[klass].prototype = document.createElement(tagName)['__proto__'];
    return window[klass];
  }

  if (F.ElementExtensions) {
    copy(Element.Methods, HTMLElement.prototype);
    copy(Element.Methods.Simulated, HTMLElement.prototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};

document.viewport = {
  getDimensions: function() {
    var dimensions = { }, B = Prototype.Browser;
    $w('width height').each(function(d) {
      var D = d.capitalize();
      if (B.WebKit && !document.evaluate) {
        // Safari <3.0 needs self.innerWidth/Height
        dimensions[d] = self['inner' + D];
      } else if (B.Opera && parseFloat(window.opera.version()) < 9.5) {
        // Opera <9.5 needs document.body.clientWidth/Height
        dimensions[d] = document.body['client' + D]
      } else {
        dimensions[d] = document.documentElement['client' + D];
      }
    });
    return dimensions;
  },

  getWidth: function() {
    return this.getDimensions().width;
  },

  getHeight: function() {
    return this.getDimensions().height;
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
  }
};
/* Portions of the Selector class are derived from Jack Slocum's DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create({
  initialize: function(expression) {
    this.expression = expression.strip();

    if (this.shouldUseSelectorsAPI()) {
      this.mode = 'selectorsAPI';
    } else if (this.shouldUseXPath()) {
      this.mode = 'xpath';
      this.compileXPathMatcher();
    } else {
      this.mode = "normal";
      this.compileMatcher();
    }

  },

  shouldUseXPath: function() {
    if (!Prototype.BrowserFeatures.XPath) return false;

    var e = this.expression;

    // Safari 3 chokes on :*-of-type and :empty
    if (Prototype.Browser.WebKit &&
     (e.include("-of-type") || e.include(":empty")))
      return false;

    // XPath can't do namespaced attributes, nor can it read
    // the "checked" property from DOM nodes
    if ((/(\[[\w-]*?:|:checked)/).test(e))
      return false;

    return true;
  },

  shouldUseSelectorsAPI: function() {
    if (!Prototype.BrowserFeatures.SelectorsAPI) return false;

    if (!Selector._div) Selector._div = new Element('div');

    // Make sure the browser treats the selector as valid. Test on an
    // isolated element to minimize cost of this check.
    try {
      Selector._div.querySelector(this.expression);
    } catch(e) {
      return false;
    }

    return true;
  },

  compileMatcher: function() {
    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e];
      return;
    }

    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          this.matcher.push(Object.isFunction(c[i]) ? c[i](m) :
            new Template(c[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le, m;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        if (m = e.match(ps[i])) {
          this.matcher.push(Object.isFunction(x[i]) ? x[i](m) :
            new Template(x[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    var e = this.expression, results;

    switch (this.mode) {
      case 'selectorsAPI':
        // querySelectorAll queries document-wide, then filters to descendants
        // of the context element. That's not what we want.
        // Add an explicit context to the selector if necessary.
        if (root !== document) {
          var oldId = root.id, id = $(root).identify();
          //NXP-3782
          id = id.replace(/([\.:])/g, "\\$1");
          e = "#" + id + " " + e;
        }

        results = $A(root.querySelectorAll(e)).map(Element.extend);
        root.id = oldId;

        return results;
      case 'xpath':
        return document._getElementsByXPath(this.xpath, root);
      default:
       return this.matcher(root);
    }
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = Selector.patterns, as = Selector.assertions;
    var le, p, m;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          // use the Selector.assertions methods unless the selector
          // is too complex.
          if (as[i]) {
            this.tokens.push([i, Object.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            // reluctantly do a document-wide search
            // and look for a match in the array
            return this.findElements(document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!Selector.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

Object.extend(Selector, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new Template("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (Object.isFunction(h)) return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0)]",
      'checked':     "[@checked]",
      'disabled':    "[(@disabled) and (@type!='hidden')]",
      'enabled':     "[not(@disabled) and (@type!='hidden')]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, v;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i in p) {
            if (m = e.match(p[i])) {
              v = Object.isFunction(x[i]) ? x[i](m) : new Template(x[i]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);      c = false;',
    className:    'n = h.className(n, r, "#{1}", c);    c = false;',
    id:           'n = h.id(n, r, "#{1}", c);           c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: {
    // combinators must be listed first
    // (and descendant needs to be last combinator)
    laterSibling: /^\s*~\s*/,
    child:        /^\s*>\s*/,
    adjacent:     /^\s*\+\s*/,
    descendant:   /^\s/,

    // selectors follow
    tagName:      /^\s*(\*|[\w\-]+)(\b|$)?/,
    id:           /^#([\w\-\*]+)(\b|$)/,
    className:    /^\.([\w\-\*]+)(\b|$)/,
    pseudo:
/^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/,
    attrPresence: /^\[((?:[\w]+:)?[\w]+)\]/,
    attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
  },

  // for Selector.match and Element#match
  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return Element.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return Element.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = Element.readAttribute(element, matches[1]);
      return nodeValue && Selector.operators[matches[2]](nodeValue, matches[5] || matches[6]);
    }
  },

  handlers: {
    // UTILITY FUNCTIONS
    // joins two collections
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    // marks an array of nodes for counting
    mark: function(nodes) {
      var _true = Prototype.emptyFunction;
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = _true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = undefined;
      return nodes;
    },

    // mark each child node with its position (for nth calls)
    // "ofType" flag indicates whether we're indexing for nth-of-type
    // rather than nth-child
    index: function(parentNode, reverse, ofType) {
      parentNode._countedByPrototype = Prototype.emptyFunction;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
      }
    },

    // filters out duplicates and extends all nodes
    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (!(n = nodes[i])._countedByPrototype) {
          n._countedByPrototype = Prototype.emptyFunction;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    // COMBINATOR FUNCTIONS
    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    // TOKEN FUNCTIONS
    tagName: function(nodes, root, tagName, combinator) {
      var uTagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          // fastlane for ordinary descendant combinators
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() === uTagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;
      if (!targetNode) return [];
      if (!nodes && root == document) return [targetNode];
      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    // handles the an+b logic
    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    // handles nth(-last)-child, nth(-last)-of-type, and (first|last)-of-type
    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._countedByPrototype) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        // IE treats comments as element nodes
        if (node.tagName == '!' || node.firstChild) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._countedByPrototype) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled && (!node.type || node.type !== 'hidden'))
          results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv == v || nv && nv.startsWith(v); },
    '$=': function(nv, v) { return nv == v || nv && nv.endsWith(v); },
    '*=': function(nv, v) { return nv == v || nv && nv.include(v); },
    '$=': function(nv, v) { return nv.endsWith(v); },
    '*=': function(nv, v) { return nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + (nv || "").toUpperCase() +
     '-').include('-' + (v || "").toUpperCase() + '-'); }
  },

  split: function(expression) {
    var expressions = [];
    expression.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    return expressions;
  },

  matchElements: function(elements, expression) {
    var matches = $$(expression), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._countedByPrototype) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (Object.isNumber(expression)) {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    expressions = Selector.split(expressions.join(','));
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

if (Prototype.Browser.IE) {
  Object.extend(Selector.handlers, {
    // IE returns comment nodes on getElementsByTagName("*").
    // Filter them out.
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        if (node.tagName !== "!") a.push(node);
      return a;
    },

    // IE improperly serializes _countedByPrototype in (inner|outer)HTML.
    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node.removeAttribute('_countedByPrototype');
      return nodes;
    }
  });
}

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}
var Form = {
  reset: function(form) {
    $(form).reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            // a key is already present; construct an array of values
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    return $A($(form).getElementsByTagName('*')).inject([],
      function(elements, child) {
        if (Form.Element.Serializers[child.tagName.toLowerCase()])
          elements.push(Element.extend(child));
        return elements;
      }
    );
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/

Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {
  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;
var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if (Object.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !Object.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    // extend element because hasAttribute may not be native
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/

Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
if (!window.Event) var Event = { };

Object.extend(Event, {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,
  KEY_INSERT:   45,

  cache: { },

  relatedTarget: function(event) {
    var element;
    switch(event.type) {
      case 'mouseover': element = event.fromElement; break;
      case 'mouseout':  element = event.toElement;   break;
      default: return null;
    }
    return Element.extend(element);
  }
});

Event.Methods = (function() {
  var isButton;

  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    isButton = function(event, code) {
      return event.button == buttonMap[code];
    };

  } else if (Prototype.Browser.WebKit) {
    isButton = function(event, code) {
      switch (code) {
        case 0: return event.which == 1 && !event.metaKey;
        case 1: return event.which == 1 && event.metaKey;
        default: return false;
      }
    };

  } else {
    isButton = function(event, code) {
      return event.which ? (event.which === code + 1) : (event.button === code);
    };
  }

  return {
    isLeftClick:   function(event) { return isButton(event, 0) },
    isMiddleClick: function(event) { return isButton(event, 1) },
    isRightClick:  function(event) { return isButton(event, 2) },

    element: function(event) {
      event = Event.extend(event);

      var node          = event.target,
          type          = event.type,
          currentTarget = event.currentTarget;

      if (currentTarget && currentTarget.tagName) {
        // Firefox screws up the "click" event when moving between radio buttons
        // via arrow keys. It also screws up the "load" and "error" events on images,
        // reporting the document as the target instead of the original image.
        if (type === 'load' || type === 'error' ||
          (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
            && currentTarget.type === 'radio'))
              node = currentTarget;
      }
      if (node.nodeType == Node.TEXT_NODE) node = node.parentNode;
      return Element.extend(node);
    },

    findElement: function(event, expression) {
      var element = Event.element(event);
      if (!expression) return element;
      var elements = [element].concat(element.ancestors());
      return Selector.findElement(elements, expression, 0);
    },

    pointer: function(event) {
      var docElement = document.documentElement,
      body = document.body || { scrollLeft: 0, scrollTop: 0 };
      return {
        x: event.pageX || (event.clientX +
          (docElement.scrollLeft || body.scrollLeft) -
          (docElement.clientLeft || 0)),
        y: event.pageY || (event.clientY +
          (docElement.scrollTop || body.scrollTop) -
          (docElement.clientTop || 0))
      };
    },

    pointerX: function(event) { return Event.pointer(event).x },
    pointerY: function(event) { return Event.pointer(event).y },

    stop: function(event) {
      Event.extend(event);
      event.preventDefault();
      event.stopPropagation();
      event.stopped = true;
    }
  };
})();

Event.extend = (function() {
  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (Prototype.Browser.IE) {
    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return "[object Event]" }
    });

    return function(event) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;

      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);
      Object.extend(event, {
        target: event.srcElement,
        relatedTarget: Event.relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });
      return Object.extend(event, methods);
    };

  } else {
    Event.prototype = Event.prototype || document.createEvent("HTMLEvents")['__proto__'];
    Object.extend(Event.prototype, methods);
    return Prototype.K;
  }
})();

Object.extend(Event, (function() {
  var cache = Event.cache;

  function getEventID(element) {
    if (element._prototypeEventID) return element._prototypeEventID[0];
    arguments.callee.id = arguments.callee.id || 1;
    return element._prototypeEventID = [++arguments.callee.id];
  }

  function getDOMEventName(eventName) {
    if (eventName && eventName.include(':')) return "dataavailable";
    return eventName;
  }

  function getCacheForID(id) {
    return cache[id] = cache[id] || { };
  }

  function getWrappersForEventName(id, eventName) {
    var c = getCacheForID(id);
    return c[eventName] = c[eventName] || [];
  }

  function createWrapper(element, eventName, handler) {
    var id = getEventID(element);
    var c = getWrappersForEventName(id, eventName);
    if (c.pluck("handler").include(handler)) return false;

    var wrapper = function(event) {
      if (!Event || !Event.extend ||
        (event.eventName && event.eventName != eventName))
          return false;

      Event.extend(event);
      handler.call(element, event);
    };

    wrapper.handler = handler;
    c.push(wrapper);
    return wrapper;
  }

  function findWrapper(id, eventName, handler) {
    var c = getWrappersForEventName(id, eventName);
    return c.find(function(wrapper) { return wrapper.handler == handler });
  }

  function destroyWrapper(id, eventName, handler) {
    var c = getCacheForID(id);
    if (!c[eventName]) return false;
    c[eventName] = c[eventName].without(findWrapper(id, eventName, handler));
  }

  function destroyCache() {
    for (var id in cache)
      for (var eventName in cache[id])
        cache[id][eventName] = null;
  }


  // Internet Explorer needs to remove event handlers on page unload
  // in order to avoid memory leaks.
  if (window.attachEvent) {
    window.attachEvent("onunload", destroyCache);
  }

  // Safari has a dummy event handler on page unload so that it won't
  // use its bfcache. Safari <= 3.1 has an issue with restoring the "document"
  // object when page is returned to via the back button using its bfcache.
  if (Prototype.Browser.WebKit) {
    window.addEventListener('unload', Prototype.emptyFunction, false);
  }

  return {
    observe: function(element, eventName, handler) {
      element = $(element);
      var name = getDOMEventName(eventName);

      var wrapper = createWrapper(element, eventName, handler);
      if (!wrapper) return element;

      if (element.addEventListener) {
        element.addEventListener(name, wrapper, false);
      } else {
        element.attachEvent("on" + name, wrapper);
      }

      return element;
    },

    stopObserving: function(element, eventName, handler) {
      element = $(element);
      var id = getEventID(element), name = getDOMEventName(eventName);

      if (!handler && eventName) {
        getWrappersForEventName(id, eventName).each(function(wrapper) {
          element.stopObserving(eventName, wrapper.handler);
        });
        return element;

      } else if (!eventName) {
        Object.keys(getCacheForID(id)).each(function(eventName) {
          element.stopObserving(eventName);
        });
        return element;
      }

      var wrapper = findWrapper(id, eventName, handler);
      if (!wrapper) return element;

      if (element.removeEventListener) {
        element.removeEventListener(name, wrapper, false);
      } else {
        element.detachEvent("on" + name, wrapper);
      }

      destroyWrapper(id, eventName, handler);

      return element;
    },

    fire: function(element, eventName, memo) {
      element = $(element);
      if (element == document && document.createEvent && !element.dispatchEvent)
        element = document.documentElement;

      var event;
      if (document.createEvent) {
        event = document.createEvent("HTMLEvents");
        event.initEvent("dataavailable", true, true);
      } else {
        event = document.createEventObject();
        event.eventType = "ondataavailable";
      }

      event.eventName = eventName;
      event.memo = memo || { };

      if (document.createEvent) {
        element.dispatchEvent(event);
      } else {
        element.fireEvent(event.eventType, event);
      }

      return Event.extend(event);
    }
  };
})());

Object.extend(Event, Event.Methods);

Element.addMethods({
  fire:          Event.fire,
  observe:       Event.observe,
  stopObserving: Event.stopObserving
});

Object.extend(document, {
  fire:          Element.Methods.fire.methodize(),
  observe:       Element.Methods.observe.methodize(),
  stopObserving: Element.Methods.stopObserving.methodize(),
  loaded:        false
});

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards and John Resig. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearInterval(timer);
    document.fire("dom:loaded");
    document.loaded = true;
  }

  if (document.addEventListener) {
    if (Prototype.Browser.WebKit) {
      timer = window.setInterval(function() {
        if (/loaded|complete/.test(document.readyState))
          fireContentLoadedEvent();
      }, 0);

      Event.observe(window, "load", fireContentLoadedEvent);

    } else {
      document.addEventListener("DOMContentLoaded",
        fireContentLoadedEvent, false);
    }

  } else {
    document.write("<script id=__onDOMContentLoaded defer src=//:><\/script>");
    $("__onDOMContentLoaded").onreadystatechange = function() {
      if (this.readyState == "complete") {
        this.onreadystatechange = null;
        fireContentLoadedEvent();
      }
    };
  }
})();
/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

// This should be moved to script.aculo.us; notice the deprecated methods
// further below, that map to the newer Element methods.
var Position = {
  // set to true if needed, warning: firefox performance problems
  // NOT neeeded for page scrolling, only if draggable contained in
  // scrollable elements
  includeScrollOffsets: false,

  // must be called before calling withinIncludingScrolloffset, every time the
  // page is scrolled
  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  // caches x/y coordinate pair to use with overlap
  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  // within must be called directly before
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },

  // Deprecation layer -- use newer Element methods now (1.5.2).

  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

Element.addMethods();
// script.aculo.us effects.js v1.8.1, Thu Jan 03 22:07:12 -0500 2008

// Copyright (c) 2005-2007 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
// Contributors:
//  Justin Palmer (http://encytemedia.com/)
//  Mark Pilgrim (http://diveintomark.org/)
//  Martin Bialasinki
// 
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/ 

// converts rgb() and #xxx to #xxxxxx format,  
// returns self (or first argument) if not convertable  
String.prototype.parseColor = function() {  
  var color = '#';
  if (this.slice(0,4) == 'rgb(') {  
    var cols = this.slice(4,this.length-1).split(',');  
    var i=0; do { color += parseInt(cols[i]).toColorPart() } while (++i<3);  
  } else {  
    if (this.slice(0,1) == '#') {  
      if (this.length==4) for(var i=1;i<4;i++) color += (this.charAt(i) + this.charAt(i)).toLowerCase();  
      if (this.length==7) color = this.toLowerCase();  
    }  
  }  
  return (color.length==7 ? color : (arguments[0] || this));  
};

/*--------------------------------------------------------------------------*/

Element.collectTextNodes = function(element) {  
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue : 
      (node.hasChildNodes() ? Element.collectTextNodes(node) : ''));
  }).flatten().join('');
};

Element.collectTextNodesIgnoreClass = function(element, className) {  
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue : 
      ((node.hasChildNodes() && !Element.hasClassName(node,className)) ? 
        Element.collectTextNodesIgnoreClass(node, className) : ''));
  }).flatten().join('');
};

Element.setContentZoom = function(element, percent) {
  element = $(element);  
  element.setStyle({fontSize: (percent/100) + 'em'});   
  if (Prototype.Browser.WebKit) window.scrollBy(0,0);
  return element;
};

Element.getInlineOpacity = function(element){
  return $(element).style.opacity || '';
};

Element.forceRerendering = function(element) {
  try {
    element = $(element);
    var n = document.createTextNode(' ');
    element.appendChild(n);
    element.removeChild(n);
  } catch(e) { }
};

/*--------------------------------------------------------------------------*/

var Effect = {
  _elementDoesNotExistError: {
    name: 'ElementDoesNotExistError',
    message: 'The specified DOM element does not exist, but is required for this effect to operate'
  },
  Transitions: {
    linear: Prototype.K,
    sinoidal: function(pos) {
      return (-Math.cos(pos*Math.PI)/2) + 0.5;
    },
    reverse: function(pos) {
      return 1-pos;
    },
    flicker: function(pos) {
      var pos = ((-Math.cos(pos*Math.PI)/4) + 0.75) + Math.random()/4;
      return pos > 1 ? 1 : pos;
    },
    wobble: function(pos) {
      return (-Math.cos(pos*Math.PI*(9*pos))/2) + 0.5;
    },
    pulse: function(pos, pulses) { 
      pulses = pulses || 5; 
      return (
        ((pos % (1/pulses)) * pulses).round() == 0 ? 
              ((pos * pulses * 2) - (pos * pulses * 2).floor()) : 
          1 - ((pos * pulses * 2) - (pos * pulses * 2).floor())
        );
    },
    spring: function(pos) { 
      return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp(-pos * 6)); 
    },
    none: function(pos) {
      return 0;
    },
    full: function(pos) {
      return 1;
    }
  },
  DefaultOptions: {
    duration:   1.0,   // seconds
    fps:        100,   // 100= assume 66fps max.
    sync:       false, // true for combining
    from:       0.0,
    to:         1.0,
    delay:      0.0,
    queue:      'parallel'
  },
  tagifyText: function(element) {
    var tagifyStyle = 'position:relative';
    if (Prototype.Browser.IE) tagifyStyle += ';zoom:1';
    
    element = $(element);
    $A(element.childNodes).each( function(child) {
      if (child.nodeType==3) {
        child.nodeValue.toArray().each( function(character) {
          element.insertBefore(
            new Element('span', {style: tagifyStyle}).update(
              character == ' ' ? String.fromCharCode(160) : character), 
              child);
        });
        Element.remove(child);
      }
    });
  },
  multiple: function(element, effect) {
    var elements;
    if (((typeof element == 'object') || 
        Object.isFunction(element)) && 
       (element.length))
      elements = element;
    else
      elements = $(element).childNodes;
      
    var options = Object.extend({
      speed: 0.1,
      delay: 0.0
    }, arguments[2] || { });
    var masterDelay = options.delay;

    $A(elements).each( function(element, index) {
      new effect(element, Object.extend(options, { delay: index * options.speed + masterDelay }));
    });
  },
  PAIRS: {
    'slide':  ['SlideDown','SlideUp'],
    'blind':  ['BlindDown','BlindUp'],
    'appear': ['Appear','Fade']
  },
  toggle: function(element, effect) {
    element = $(element);
    effect = (effect || 'appear').toLowerCase();
    var options = Object.extend({
      queue: { position:'end', scope:(element.id || 'global'), limit: 1 }
    }, arguments[2] || { });
    Effect[element.visible() ? 
      Effect.PAIRS[effect][1] : Effect.PAIRS[effect][0]](element, options);
  }
};

Effect.DefaultOptions.transition = Effect.Transitions.sinoidal;

/* ------------- core effects ------------- */

Effect.ScopedQueue = Class.create(Enumerable, {
  initialize: function() {
    this.effects  = [];
    this.interval = null;    
  },
  _each: function(iterator) {
    this.effects._each(iterator);
  },
  add: function(effect) {
    var timestamp = new Date().getTime();
    
    var position = Object.isString(effect.options.queue) ? 
      effect.options.queue : effect.options.queue.position;
    
    switch(position) {
      case 'front':
        // move unstarted effects after this effect  
        this.effects.findAll(function(e){ return e.state=='idle' }).each( function(e) {
            e.startOn  += effect.finishOn;
            e.finishOn += effect.finishOn;
          });
        break;
      case 'with-last':
        timestamp = this.effects.pluck('startOn').max() || timestamp;
        break;
      case 'end':
        // start effect after last queued effect has finished
        timestamp = this.effects.pluck('finishOn').max() || timestamp;
        break;
    }
    
    effect.startOn  += timestamp;
    effect.finishOn += timestamp;

    if (!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit))
      this.effects.push(effect);
    
    if (!this.interval)
      this.interval = setInterval(this.loop.bind(this), 15);
  },
  remove: function(effect) {
    this.effects = this.effects.reject(function(e) { return e==effect });
    if (this.effects.length == 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  loop: function() {
    var timePos = new Date().getTime();
    for(var i=0, len=this.effects.length;i<len;i++) 
      this.effects[i] && this.effects[i].loop(timePos);
  }
});

Effect.Queues = {
  instances: $H(),
  get: function(queueName) {
    if (!Object.isString(queueName)) return queueName;
    
    return this.instances.get(queueName) ||
      this.instances.set(queueName, new Effect.ScopedQueue());
  }
};
Effect.Queue = Effect.Queues.get('global');

Effect.Base = Class.create({
  position: null,
  start: function(options) {
    function codeForEvent(options,eventName){
      return (
        (options[eventName+'Internal'] ? 'this.options.'+eventName+'Internal(this);' : '') +
        (options[eventName] ? 'this.options.'+eventName+'(this);' : '')
      );
    }
    if (options && options.transition === false) options.transition = Effect.Transitions.linear;
    this.options      = Object.extend(Object.extend({ },Effect.DefaultOptions), options || { });
    this.currentFrame = 0;
    this.state        = 'idle';
    this.startOn      = this.options.delay*1000;
    this.finishOn     = this.startOn+(this.options.duration*1000);
    this.fromToDelta  = this.options.to-this.options.from;
    this.totalTime    = this.finishOn-this.startOn;
    this.totalFrames  = this.options.fps*this.options.duration;
    
    eval('this.render = function(pos){ '+
      'if (this.state=="idle"){this.state="running";'+
      codeForEvent(this.options,'beforeSetup')+
      (this.setup ? 'this.setup();':'')+ 
      codeForEvent(this.options,'afterSetup')+
      '};if (this.state=="running"){'+
      'pos=this.options.transition(pos)*'+this.fromToDelta+'+'+this.options.from+';'+
      'this.position=pos;'+
      codeForEvent(this.options,'beforeUpdate')+
      (this.update ? 'this.update(pos);':'')+
      codeForEvent(this.options,'afterUpdate')+
      '}}');
    
    this.event('beforeStart');
    if (!this.options.sync)
      Effect.Queues.get(Object.isString(this.options.queue) ? 
        'global' : this.options.queue.scope).add(this);
  },
  loop: function(timePos) {
    if (timePos >= this.startOn) {
      if (timePos >= this.finishOn) {
        this.render(1.0);
        this.cancel();
        this.event('beforeFinish');
        if (this.finish) this.finish(); 
        this.event('afterFinish');
        return;  
      }
      var pos   = (timePos - this.startOn) / this.totalTime,
          frame = (pos * this.totalFrames).round();
      if (frame > this.currentFrame) {
        this.render(pos);
        this.currentFrame = frame;
      }
    }
  },
  cancel: function() {
    if (!this.options.sync)
      Effect.Queues.get(Object.isString(this.options.queue) ? 
        'global' : this.options.queue.scope).remove(this);
    this.state = 'finished';
  },
  event: function(eventName) {
    if (this.options[eventName + 'Internal']) this.options[eventName + 'Internal'](this);
    if (this.options[eventName]) this.options[eventName](this);
  },
  inspect: function() {
    var data = $H();
    for(property in this)
      if (!Object.isFunction(this[property])) data.set(property, this[property]);
    return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>';
  }
});

Effect.Parallel = Class.create(Effect.Base, {
  initialize: function(effects) {
    this.effects = effects || [];
    this.start(arguments[1]);
  },
  update: function(position) {
    this.effects.invoke('render', position);
  },
  finish: function(position) {
    this.effects.each( function(effect) {
      effect.render(1.0);
      effect.cancel();
      effect.event('beforeFinish');
      if (effect.finish) effect.finish(position);
      effect.event('afterFinish');
    });
  }
});

Effect.Tween = Class.create(Effect.Base, {
  initialize: function(object, from, to) {
    object = Object.isString(object) ? $(object) : object;
    var args = $A(arguments), method = args.last(), 
      options = args.length == 5 ? args[3] : null;
    this.method = Object.isFunction(method) ? method.bind(object) :
      Object.isFunction(object[method]) ? object[method].bind(object) : 
      function(value) { object[method] = value };
    this.start(Object.extend({ from: from, to: to }, options || { }));
  },
  update: function(position) {
    this.method(position);
  }
});

Effect.Event = Class.create(Effect.Base, {
  initialize: function() {
    this.start(Object.extend({ duration: 0 }, arguments[0] || { }));
  },
  update: Prototype.emptyFunction
});

Effect.Opacity = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    // make this work on IE on elements without 'layout'
    if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
      this.element.setStyle({zoom: 1});
    var options = Object.extend({
      from: this.element.getOpacity() || 0.0,
      to:   1.0
    }, arguments[1] || { });
    this.start(options);
  },
  update: function(position) {
    this.element.setOpacity(position);
  }
});

Effect.Move = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      x:    0,
      y:    0,
      mode: 'relative'
    }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop  = parseFloat(this.element.getStyle('top')  || '0');
    if (this.options.mode == 'absolute') {
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
    }
  },
  update: function(position) {
    this.element.setStyle({
      left: (this.options.x  * position + this.originalLeft).round() + 'px',
      top:  (this.options.y  * position + this.originalTop).round()  + 'px'
    });
  }
});

// for backwards compatibility
Effect.MoveBy = function(element, toTop, toLeft) {
  return new Effect.Move(element, 
    Object.extend({ x: toLeft, y: toTop }, arguments[3] || { }));
};

Effect.Scale = Class.create(Effect.Base, {
  initialize: function(element, percent) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      scaleX: true,
      scaleY: true,
      scaleContent: true,
      scaleFromCenter: false,
      scaleMode: 'box',        // 'box' or 'contents' or { } with provided values
      scaleFrom: 100.0,
      scaleTo:   percent
    }, arguments[2] || { });
    this.start(options);
  },
  setup: function() {
    this.restoreAfterFinish = this.options.restoreAfterFinish || false;
    this.elementPositioning = this.element.getStyle('position');
    
    this.originalStyle = { };
    ['top','left','width','height','fontSize'].each( function(k) {
      this.originalStyle[k] = this.element.style[k];
    }.bind(this));
      
    this.originalTop  = this.element.offsetTop;
    this.originalLeft = this.element.offsetLeft;
    
    var fontSize = this.element.getStyle('font-size') || '100%';
    ['em','px','%','pt'].each( function(fontSizeType) {
      if (fontSize.indexOf(fontSizeType)>0) {
        this.fontSize     = parseFloat(fontSize);
        this.fontSizeType = fontSizeType;
      }
    }.bind(this));
    
    this.factor = (this.options.scaleTo - this.options.scaleFrom)/100;
    
    this.dims = null;
    if (this.options.scaleMode=='box')
      this.dims = [this.element.offsetHeight, this.element.offsetWidth];
    if (/^content/.test(this.options.scaleMode))
      this.dims = [this.element.scrollHeight, this.element.scrollWidth];
    if (!this.dims)
      this.dims = [this.options.scaleMode.originalHeight,
                   this.options.scaleMode.originalWidth];
  },
  update: function(position) {
    var currentScale = (this.options.scaleFrom/100.0) + (this.factor * position);
    if (this.options.scaleContent && this.fontSize)
      this.element.setStyle({fontSize: this.fontSize * currentScale + this.fontSizeType });
    this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale);
  },
  finish: function(position) {
    if (this.restoreAfterFinish) this.element.setStyle(this.originalStyle);
  },
  setDimensions: function(height, width) {
    var d = { };
    if (this.options.scaleX) d.width = width.round() + 'px';
    if (this.options.scaleY) d.height = height.round() + 'px';
    if (this.options.scaleFromCenter) {
      var topd  = (height - this.dims[0])/2;
      var leftd = (width  - this.dims[1])/2;
      if (this.elementPositioning == 'absolute') {
        if (this.options.scaleY) d.top = this.originalTop-topd + 'px';
        if (this.options.scaleX) d.left = this.originalLeft-leftd + 'px';
      } else {
        if (this.options.scaleY) d.top = -topd + 'px';
        if (this.options.scaleX) d.left = -leftd + 'px';
      }
    }
    this.element.setStyle(d);
  }
});

Effect.Highlight = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({ startcolor: '#ffff99' }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    // Prevent executing on elements not in the layout flow
    if (this.element.getStyle('display')=='none') { this.cancel(); return; }
    // Disable background image during the effect
    this.oldStyle = { };
    if (!this.options.keepBackgroundImage) {
      this.oldStyle.backgroundImage = this.element.getStyle('background-image');
      this.element.setStyle({backgroundImage: 'none'});
    }
    if (!this.options.endcolor)
      this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
    if (!this.options.restorecolor)
      this.options.restorecolor = this.element.getStyle('background-color');
    // init color calculations
    this._base  = $R(0,2).map(function(i){ return parseInt(this.options.startcolor.slice(i*2+1,i*2+3),16) }.bind(this));
    this._delta = $R(0,2).map(function(i){ return parseInt(this.options.endcolor.slice(i*2+1,i*2+3),16)-this._base[i] }.bind(this));
  },
  update: function(position) {
    this.element.setStyle({backgroundColor: $R(0,2).inject('#',function(m,v,i){
      return m+((this._base[i]+(this._delta[i]*position)).round().toColorPart()); }.bind(this)) });
  },
  finish: function() {
    this.element.setStyle(Object.extend(this.oldStyle, {
      backgroundColor: this.options.restorecolor
    }));
  }
});

Effect.ScrollTo = function(element) {
  var options = arguments[1] || { },
    scrollOffsets = document.viewport.getScrollOffsets(),
    elementOffsets = $(element).cumulativeOffset(),
    max = (window.height || document.body.scrollHeight) - document.viewport.getHeight();  

  if (options.offset) elementOffsets[1] += options.offset;

  return new Effect.Tween(null,
    scrollOffsets.top,
    elementOffsets[1] > max ? max : elementOffsets[1],
    options,
    function(p){ scrollTo(scrollOffsets.left, p.round()) }
  );
};

/* ------------- combination effects ------------- */

Effect.Fade = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  var options = Object.extend({
    from: element.getOpacity() || 1.0,
    to:   0.0,
    afterFinishInternal: function(effect) { 
      if (effect.options.to!=0) return;
      effect.element.hide().setStyle({opacity: oldOpacity}); 
    }
  }, arguments[1] || { });
  return new Effect.Opacity(element,options);
};

Effect.Appear = function(element) {
  element = $(element);
  var options = Object.extend({
  from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
  to:   1.0,
  // force Safari to render floated elements properly
  afterFinishInternal: function(effect) {
    effect.element.forceRerendering();
  },
  beforeSetup: function(effect) {
    effect.element.setOpacity(effect.options.from).show(); 
  }}, arguments[1] || { });
  return new Effect.Opacity(element,options);
};

Effect.Puff = function(element) {
  element = $(element);
  var oldStyle = { 
    opacity: element.getInlineOpacity(), 
    position: element.getStyle('position'),
    top:  element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  return new Effect.Parallel(
   [ new Effect.Scale(element, 200, 
      { sync: true, scaleFromCenter: true, scaleContent: true, restoreAfterFinish: true }), 
     new Effect.Opacity(element, { sync: true, to: 0.0 } ) ], 
     Object.extend({ duration: 1.0, 
      beforeSetupInternal: function(effect) {
        Position.absolutize(effect.effects[0].element)
      },
      afterFinishInternal: function(effect) {
         effect.effects[0].element.hide().setStyle(oldStyle); }
     }, arguments[1] || { })
   );
};

Effect.BlindUp = function(element) {
  element = $(element);
  element.makeClipping();
  return new Effect.Scale(element, 0,
    Object.extend({ scaleContent: false, 
      scaleX: false, 
      restoreAfterFinish: true,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping();
      } 
    }, arguments[1] || { })
  );
};

Effect.BlindDown = function(element) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({ 
    scaleContent: false, 
    scaleX: false,
    scaleFrom: 0,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({height: '0px'}).show(); 
    },  
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, arguments[1] || { }));
};

Effect.SwitchOff = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  return new Effect.Appear(element, Object.extend({
    duration: 0.4,
    from: 0,
    transition: Effect.Transitions.flicker,
    afterFinishInternal: function(effect) {
      new Effect.Scale(effect.element, 1, { 
        duration: 0.3, scaleFromCenter: true,
        scaleX: false, scaleContent: false, restoreAfterFinish: true,
        beforeSetup: function(effect) { 
          effect.element.makePositioned().makeClipping();
        },
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().undoPositioned().setStyle({opacity: oldOpacity});
        }
      })
    }
  }, arguments[1] || { }));
};

Effect.DropOut = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left'),
    opacity: element.getInlineOpacity() };
  return new Effect.Parallel(
    [ new Effect.Move(element, {x: 0, y: 100, sync: true }), 
      new Effect.Opacity(element, { sync: true, to: 0.0 }) ],
    Object.extend(
      { duration: 0.5,
        beforeSetup: function(effect) {
          effect.effects[0].element.makePositioned(); 
        },
        afterFinishInternal: function(effect) {
          effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle);
        } 
      }, arguments[1] || { }));
};

Effect.Shake = function(element) {
  element = $(element);
  var options = Object.extend({
    distance: 20,
    duration: 0.5
  }, arguments[1] || {});
  var distance = parseFloat(options.distance);
  var split = parseFloat(options.duration) / 10.0;
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left') };
    return new Effect.Move(element,
      { x:  distance, y: 0, duration: split, afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance, y: 0, duration: split, afterFinishInternal: function(effect) {
        effect.element.undoPositioned().setStyle(oldStyle);
  }}) }}) }}) }}) }}) }});
};

Effect.SlideDown = function(element) {
  element = $(element).cleanWhitespace();
  // SlideDown need to have the content of the element wrapped in a container element with fixed height!
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({ 
    scaleContent: false, 
    scaleX: false, 
    scaleFrom: window.opera ? 0 : 1,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if (window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().setStyle({height: '0px'}).show(); 
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' }); 
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom}); }
    }, arguments[1] || { })
  );
};

Effect.SlideUp = function(element) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, window.opera ? 0 : 1,
   Object.extend({ scaleContent: false, 
    scaleX: false, 
    scaleMode: 'box',
    scaleFrom: 100,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if (window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().show();
    },  
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom});
    }
   }, arguments[1] || { })
  );
};

// Bug in opera makes the TD containing this element expand for a instance after finish 
Effect.Squish = function(element) {
  return new Effect.Scale(element, window.opera ? 1 : 0, { 
    restoreAfterFinish: true,
    beforeSetup: function(effect) {
      effect.element.makeClipping(); 
    },  
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping(); 
    }
  });
};

Effect.Grow = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.full
  }, arguments[1] || { });
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();    
  var initialMoveX, initialMoveY;
  var moveX, moveY;
  
  switch (options.direction) {
    case 'top-left':
      initialMoveX = initialMoveY = moveX = moveY = 0; 
      break;
    case 'top-right':
      initialMoveX = dims.width;
      initialMoveY = moveY = 0;
      moveX = -dims.width;
      break;
    case 'bottom-left':
      initialMoveX = moveX = 0;
      initialMoveY = dims.height;
      moveY = -dims.height;
      break;
    case 'bottom-right':
      initialMoveX = dims.width;
      initialMoveY = dims.height;
      moveX = -dims.width;
      moveY = -dims.height;
      break;
    case 'center':
      initialMoveX = dims.width / 2;
      initialMoveY = dims.height / 2;
      moveX = -dims.width / 2;
      moveY = -dims.height / 2;
      break;
  }
  
  return new Effect.Move(element, {
    x: initialMoveX,
    y: initialMoveY,
    duration: 0.01, 
    beforeSetup: function(effect) {
      effect.element.hide().makeClipping().makePositioned();
    },
    afterFinishInternal: function(effect) {
      new Effect.Parallel(
        [ new Effect.Opacity(effect.element, { sync: true, to: 1.0, from: 0.0, transition: options.opacityTransition }),
          new Effect.Move(effect.element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition }),
          new Effect.Scale(effect.element, 100, {
            scaleMode: { originalHeight: dims.height, originalWidth: dims.width }, 
            sync: true, scaleFrom: window.opera ? 1 : 0, transition: options.scaleTransition, restoreAfterFinish: true})
        ], Object.extend({
             beforeSetup: function(effect) {
               effect.effects[0].element.setStyle({height: '0px'}).show(); 
             },
             afterFinishInternal: function(effect) {
               effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle); 
             }
           }, options)
      )
    }
  });
};

Effect.Shrink = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.none
  }, arguments[1] || { });
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var moveX, moveY;
  
  switch (options.direction) {
    case 'top-left':
      moveX = moveY = 0;
      break;
    case 'top-right':
      moveX = dims.width;
      moveY = 0;
      break;
    case 'bottom-left':
      moveX = 0;
      moveY = dims.height;
      break;
    case 'bottom-right':
      moveX = dims.width;
      moveY = dims.height;
      break;
    case 'center':  
      moveX = dims.width / 2;
      moveY = dims.height / 2;
      break;
  }
  
  return new Effect.Parallel(
    [ new Effect.Opacity(element, { sync: true, to: 0.0, from: 1.0, transition: options.opacityTransition }),
      new Effect.Scale(element, window.opera ? 1 : 0, { sync: true, transition: options.scaleTransition, restoreAfterFinish: true}),
      new Effect.Move(element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition })
    ], Object.extend({            
         beforeStartInternal: function(effect) {
           effect.effects[0].element.makePositioned().makeClipping(); 
         },
         afterFinishInternal: function(effect) {
           effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle); }
       }, options)
  );
};

Effect.Pulsate = function(element) {
  element = $(element);
  var options    = arguments[1] || { };
  var oldOpacity = element.getInlineOpacity();
  var transition = options.transition || Effect.Transitions.sinoidal;
  var reverser   = function(pos){ return transition(1-Effect.Transitions.pulse(pos, options.pulses)) };
  reverser.bind(transition);
  return new Effect.Opacity(element, 
    Object.extend(Object.extend({  duration: 2.0, from: 0,
      afterFinishInternal: function(effect) { effect.element.setStyle({opacity: oldOpacity}); }
    }, options), {transition: reverser}));
};

Effect.Fold = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height };
  element.makeClipping();
  return new Effect.Scale(element, 5, Object.extend({   
    scaleContent: false,
    scaleX: false,
    afterFinishInternal: function(effect) {
    new Effect.Scale(element, 1, { 
      scaleContent: false, 
      scaleY: false,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping().setStyle(oldStyle);
      } });
  }}, arguments[1] || { }));
};

Effect.Morph = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      style: { }
    }, arguments[1] || { });
    
    if (!Object.isString(options.style)) this.style = $H(options.style);
    else {
      if (options.style.include(':'))
        this.style = options.style.parseStyle();
      else {
        this.element.addClassName(options.style);
        this.style = $H(this.element.getStyles());
        this.element.removeClassName(options.style);
        var css = this.element.getStyles();
        this.style = this.style.reject(function(style) {
          return style.value == css[style.key];
        });
        options.afterFinishInternal = function(effect) {
          effect.element.addClassName(effect.options.style);
          effect.transforms.each(function(transform) {
            effect.element.style[transform.style] = '';
          });
        }
      }
    }
    this.start(options);
  },
  
  setup: function(){
    function parseColor(color){
      if (!color || ['rgba(0, 0, 0, 0)','transparent'].include(color)) color = '#ffffff';
      color = color.parseColor();
      return $R(0,2).map(function(i){
        return parseInt( color.slice(i*2+1,i*2+3), 16 ) 
      });
    }
    this.transforms = this.style.map(function(pair){
      var property = pair[0], value = pair[1], unit = null;

      if (value.parseColor('#zzzzzz') != '#zzzzzz') {
        value = value.parseColor();
        unit  = 'color';
      } else if (property == 'opacity') {
        value = parseFloat(value);
        if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
          this.element.setStyle({zoom: 1});
      } else if (Element.CSS_LENGTH.test(value)) {
          var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/);
          value = parseFloat(components[1]);
          unit = (components.length == 3) ? components[2] : null;
      }

      var originalValue = this.element.getStyle(property);
      return { 
        style: property.camelize(), 
        originalValue: unit=='color' ? parseColor(originalValue) : parseFloat(originalValue || 0), 
        targetValue: unit=='color' ? parseColor(value) : value,
        unit: unit
      };
    }.bind(this)).reject(function(transform){
      return (
        (transform.originalValue == transform.targetValue) ||
        (
          transform.unit != 'color' &&
          (isNaN(transform.originalValue) || isNaN(transform.targetValue))
        )
      )
    });
  },
  update: function(position) {
    var style = { }, transform, i = this.transforms.length;
    while(i--)
      style[(transform = this.transforms[i]).style] = 
        transform.unit=='color' ? '#'+
          (Math.round(transform.originalValue[0]+
            (transform.targetValue[0]-transform.originalValue[0])*position)).toColorPart() +
          (Math.round(transform.originalValue[1]+
            (transform.targetValue[1]-transform.originalValue[1])*position)).toColorPart() +
          (Math.round(transform.originalValue[2]+
            (transform.targetValue[2]-transform.originalValue[2])*position)).toColorPart() :
        (transform.originalValue +
          (transform.targetValue - transform.originalValue) * position).toFixed(3) + 
            (transform.unit === null ? '' : transform.unit);
    this.element.setStyle(style, true);
  }
});

Effect.Transform = Class.create({
  initialize: function(tracks){
    this.tracks  = [];
    this.options = arguments[1] || { };
    this.addTracks(tracks);
  },
  addTracks: function(tracks){
    tracks.each(function(track){
      track = $H(track);
      var data = track.values().first();
      this.tracks.push($H({
        ids:     track.keys().first(),
        effect:  Effect.Morph,
        options: { style: data }
      }));
    }.bind(this));
    return this;
  },
  play: function(){
    return new Effect.Parallel(
      this.tracks.map(function(track){
        var ids = track.get('ids'), effect = track.get('effect'), options = track.get('options');
        var elements = [$(ids) || $$(ids)].flatten();
        return elements.map(function(e){ return new effect(e, Object.extend({ sync:true }, options)) });
      }).flatten(),
      this.options
    );
  }
});

Element.CSS_PROPERTIES = $w(
  'backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' + 
  'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' +
  'borderRightColor borderRightStyle borderRightWidth borderSpacing ' +
  'borderTopColor borderTopStyle borderTopWidth bottom clip color ' +
  'fontSize fontWeight height left letterSpacing lineHeight ' +
  'marginBottom marginLeft marginRight marginTop markerOffset maxHeight '+
  'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' +
  'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' +
  'right textIndent top width wordSpacing zIndex');
  
Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;

String.__parseStyleElement = document.createElement('div');
String.prototype.parseStyle = function(){
  var style, styleRules = $H();
  if (Prototype.Browser.WebKit)
    style = new Element('div',{style:this}).style;
  else {
    String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
    style = String.__parseStyleElement.childNodes[0].style;
  }
  
  Element.CSS_PROPERTIES.each(function(property){
    if (style[property]) styleRules.set(property, style[property]); 
  });
  
  if (Prototype.Browser.IE && this.include('opacity'))
    styleRules.set('opacity', this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1]);

  return styleRules;
};

if (document.defaultView && document.defaultView.getComputedStyle) {
  Element.getStyles = function(element) {
    var css = document.defaultView.getComputedStyle($(element), null);
    return Element.CSS_PROPERTIES.inject({ }, function(styles, property) {
      styles[property] = css[property];
      return styles;
    });
  };
} else {
  Element.getStyles = function(element) {
    element = $(element);
    var css = element.currentStyle, styles;
    styles = Element.CSS_PROPERTIES.inject({ }, function(results, property) {
      results[property] = css[property];
      return results;
    });
    if (!styles.opacity) styles.opacity = element.getOpacity();
    return styles;
  };
};

Effect.Methods = {
  morph: function(element, style) {
    element = $(element);
    new Effect.Morph(element, Object.extend({ style: style }, arguments[2] || { }));
    return element;
  },
  visualEffect: function(element, effect, options) {
    element = $(element)
    var s = effect.dasherize().camelize(), klass = s.charAt(0).toUpperCase() + s.substring(1);
    new Effect[klass](element, options);
    return element;
  },
  highlight: function(element, options) {
    element = $(element);
    new Effect.Highlight(element, options);
    return element;
  }
};

$w('fade appear grow shrink fold blindUp blindDown slideUp slideDown '+
  'pulsate shake puff squish switchOff dropOut').each(
  function(effect) { 
    Effect.Methods[effect] = function(element, options){
      element = $(element);
      Effect[effect.charAt(0).toUpperCase() + effect.substring(1)](element, options);
      return element;
    }
  }
);

$w('getInlineOpacity forceRerendering setContentZoom collectTextNodes collectTextNodesIgnoreClass getStyles').each( 
  function(f) { Effect.Methods[f] = Element[f]; }
);

Element.addMethods(Effect.Methods);
// script.aculo.us dragdrop.js v1.8.1, Thu Jan 03 22:07:12 -0500 2008

// Copyright (c) 2005-2007 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2007 Sammi Williams (http://www.oriontransfer.co.nz, sammi@oriontransfer.co.nz)
// 
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

if(Object.isUndefined(Effect))
  throw("dragdrop.js requires including script.aculo.us' effects.js library");

var Droppables = {
  drops: [],

  remove: function(element) {
    this.drops = this.drops.reject(function(d) { return d.element==$(element) });
  },

  add: function(element) {
    element = $(element);
    var options = Object.extend({
      greedy:     true,
      hoverclass: null,
      tree:       false
    }, arguments[1] || { });

    // cache containers
    if(options.containment) {
      options._containers = [];
      var containment = options.containment;
      if(Object.isArray(containment)) {
        containment.each( function(c) { options._containers.push($(c)) });
      } else {
        options._containers.push($(containment));
      }
    }
    
    if(options.accept) options.accept = [options.accept].flatten();

    Element.makePositioned(element); // fix IE
    options.element = element;

    this.drops.push(options);
  },
  
  findDeepestChild: function(drops) {
    deepest = drops[0];
      
    for (i = 1; i < drops.length; ++i)
      if (Element.isParent(drops[i].element, deepest.element))
        deepest = drops[i];
    
    return deepest;
  },

  isContained: function(element, drop) {
    var containmentNode;
    if(drop.tree) {
      containmentNode = element.treeNode; 
    } else {
      containmentNode = element.parentNode;
    }
    return drop._containers.detect(function(c) { return containmentNode == c });
  },
  
  isAffected: function(point, element, drop) {
    return (
      (drop.element!=element) &&
      ((!drop._containers) ||
        this.isContained(element, drop)) &&
      ((!drop.accept) ||
        (Element.classNames(element).detect( 
          function(v) { return drop.accept.include(v) } ) )) &&
      Position.within(drop.element, point[0], point[1]) );
  },

  deactivate: function(drop) {
    if(drop.hoverclass)
      Element.removeClassName(drop.element, drop.hoverclass);
    this.last_active = null;
  },

  activate: function(drop) {
    if(drop.hoverclass)
      Element.addClassName(drop.element, drop.hoverclass);
    this.last_active = drop;
  },

  show: function(point, element) {
    if(!this.drops.length) return;
    var drop, affected = [];
    
    this.drops.each( function(drop) {
      if(Droppables.isAffected(point, element, drop))
        affected.push(drop);
    });
        
    if(affected.length>0)
      drop = Droppables.findDeepestChild(affected);

    if(this.last_active && this.last_active != drop) this.deactivate(this.last_active);
    if (drop) {
      Position.within(drop.element, point[0], point[1]);
      if(drop.onHover)
        drop.onHover(element, drop.element, Position.overlap(drop.overlap, drop.element));
      
      if (drop != this.last_active) Droppables.activate(drop);
    }
  },

  fire: function(event, element) {
    if(!this.last_active) return;
    Position.prepare();

    if (this.isAffected([Event.pointerX(event), Event.pointerY(event)], element, this.last_active))
      if (this.last_active.onDrop) {
        this.last_active.onDrop(element, this.last_active.element, event); 
        return true; 
      }
  },

  reset: function() {
    if(this.last_active)
      this.deactivate(this.last_active);
  }
}

var Draggables = {
  drags: [],
  observers: [],
  
  register: function(draggable) {
    if(this.drags.length == 0) {
      this.eventMouseUp   = this.endDrag.bindAsEventListener(this);
      this.eventMouseMove = this.updateDrag.bindAsEventListener(this);
      this.eventKeypress  = this.keyPress.bindAsEventListener(this);
      
      Event.observe(document, "mouseup", this.eventMouseUp);
      Event.observe(document, "mousemove", this.eventMouseMove);
      Event.observe(document, "keypress", this.eventKeypress);
    }
    this.drags.push(draggable);
  },
  
  unregister: function(draggable) {
    this.drags = this.drags.reject(function(d) { return d==draggable });
    if(this.drags.length == 0) {
      Event.stopObserving(document, "mouseup", this.eventMouseUp);
      Event.stopObserving(document, "mousemove", this.eventMouseMove);
      Event.stopObserving(document, "keypress", this.eventKeypress);
    }
  },
  
  activate: function(draggable) {
    if(draggable.options.delay) { 
      this._timeout = setTimeout(function() { 
        Draggables._timeout = null; 
        window.focus(); 
        Draggables.activeDraggable = draggable; 
      }.bind(this), draggable.options.delay); 
    } else {
      window.focus(); // allows keypress events if window isn't currently focused, fails for Safari
      this.activeDraggable = draggable;
    }
  },
  
  deactivate: function() {
    this.activeDraggable = null;
  },
  
  updateDrag: function(event) {
    if(!this.activeDraggable) return;
    var pointer = [Event.pointerX(event), Event.pointerY(event)];
    // Mozilla-based browsers fire successive mousemove events with
    // the same coordinates, prevent needless redrawing (moz bug?)
    if(this._lastPointer && (this._lastPointer.inspect() == pointer.inspect())) return;
    this._lastPointer = pointer;
    
    this.activeDraggable.updateDrag(event, pointer);
  },
  
  endDrag: function(event) {
    if(this._timeout) { 
      clearTimeout(this._timeout); 
      this._timeout = null; 
    }
    if(!this.activeDraggable) return;
    this._lastPointer = null;
    this.activeDraggable.endDrag(event);
    this.activeDraggable = null;
  },
  
  keyPress: function(event) {
    if(this.activeDraggable)
      this.activeDraggable.keyPress(event);
  },
  
  addObserver: function(observer) {
    this.observers.push(observer);
    this._cacheObserverCallbacks();
  },
  
  removeObserver: function(element) {  // element instead of observer fixes mem leaks
    this.observers = this.observers.reject( function(o) { return o.element==element });
    this._cacheObserverCallbacks();
  },
  
  notify: function(eventName, draggable, event) {  // 'onStart', 'onEnd', 'onDrag'
    if(this[eventName+'Count'] > 0)
      this.observers.each( function(o) {
        if(o[eventName]) o[eventName](eventName, draggable, event);
      });
    if(draggable.options[eventName]) draggable.options[eventName](draggable, event);
  },
  
  _cacheObserverCallbacks: function() {
    ['onStart','onEnd','onDrag'].each( function(eventName) {
      Draggables[eventName+'Count'] = Draggables.observers.select(
        function(o) { return o[eventName]; }
      ).length;
    });
  }
}

/*--------------------------------------------------------------------------*/

var Draggable = Class.create({
  initialize: function(element) {
    var defaults = {
      handle: false,
      reverteffect: function(element, top_offset, left_offset) {
        var dur = Math.sqrt(Math.abs(top_offset^2)+Math.abs(left_offset^2))*0.02;
        new Effect.Move(element, { x: -left_offset, y: -top_offset, duration: dur,
          queue: {scope:'_draggable', position:'end'}
        });
      },
      endeffect: function(element) {
        var toOpacity = Object.isNumber(element._opacity) ? element._opacity : 1.0;
        new Effect.Opacity(element, {duration:0.2, from:0.7, to:toOpacity, 
          queue: {scope:'_draggable', position:'end'},
          afterFinish: function(){ 
            Draggable._dragging[element] = false 
          }
        }); 
      },
      zindex: 1000,
      revert: false,
      quiet: false,
      scroll: false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      snap: false,  // false, or xy or [x,y] or function(x,y){ return [x,y] }
      delay: 0
    };
    
    if(!arguments[1] || Object.isUndefined(arguments[1].endeffect))
      Object.extend(defaults, {
        starteffect: function(element) {
          element._opacity = Element.getOpacity(element);
          Draggable._dragging[element] = true;
          new Effect.Opacity(element, {duration:0.2, from:element._opacity, to:0.7}); 
        }
      });
    
    var options = Object.extend(defaults, arguments[1] || { });

    this.element = $(element);
    
    if(options.handle && Object.isString(options.handle))
      this.handle = this.element.down('.'+options.handle, 0);
    
    if(!this.handle) this.handle = $(options.handle);
    if(!this.handle) this.handle = this.element;
    
    if(options.scroll && !options.scroll.scrollTo && !options.scroll.outerHTML) {
      options.scroll = $(options.scroll);
      this._isScrollChild = Element.childOf(this.element, options.scroll);
    }

    Element.makePositioned(this.element); // fix IE    

    this.options  = options;
    this.dragging = false;   

    this.eventMouseDown = this.initDrag.bindAsEventListener(this);
    Event.observe(this.handle, "mousedown", this.eventMouseDown);
    
    Draggables.register(this);
  },
  
  destroy: function() {
    Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
    Draggables.unregister(this);
  },
  
  currentDelta: function() {
    return([
      parseInt(Element.getStyle(this.element,'left') || '0'),
      parseInt(Element.getStyle(this.element,'top') || '0')]);
  },
  
  initDrag: function(event) {
    if(!Object.isUndefined(Draggable._dragging[this.element]) &&
      Draggable._dragging[this.element]) return;
    if(Event.isLeftClick(event)) {    
      // abort on form elements, fixes a Firefox issue
      var src = Event.element(event);
      if((tag_name = src.tagName.toUpperCase()) && (
        tag_name=='INPUT' ||
        tag_name=='SELECT' ||
        tag_name=='OPTION' ||
        tag_name=='BUTTON' ||
        tag_name=='TEXTAREA')) return;
        
      var pointer = [Event.pointerX(event), Event.pointerY(event)];
      var pos     = Position.cumulativeOffset(this.element);
      this.offset = [0,1].map( function(i) { return (pointer[i] - pos[i]) });
      
      Draggables.activate(this);
      Event.stop(event);
    }
  },
  
  startDrag: function(event) {
    this.dragging = true;
    if(!this.delta)
      this.delta = this.currentDelta();
    
    if(this.options.zindex) {
      this.originalZ = parseInt(Element.getStyle(this.element,'z-index') || 0);
      this.element.style.zIndex = this.options.zindex;
    }
    
    if(this.options.ghosting) {
      this._clone = this.element.cloneNode(true);
      this.element._originallyAbsolute = (this.element.getStyle('position') == 'absolute');
      if (!this.element._originallyAbsolute)
        Position.absolutize(this.element);
      this.element.parentNode.insertBefore(this._clone, this.element);
    }
    
    if(this.options.scroll) {
      if (this.options.scroll == window) {
        var where = this._getWindowScroll(this.options.scroll);
        this.originalScrollLeft = where.left;
        this.originalScrollTop = where.top;
      } else {
        this.originalScrollLeft = this.options.scroll.scrollLeft;
        this.originalScrollTop = this.options.scroll.scrollTop;
      }
    }
    
    Draggables.notify('onStart', this, event);
        
    if(this.options.starteffect) this.options.starteffect(this.element);
  },
  
  updateDrag: function(event, pointer) {
    if(!this.dragging) this.startDrag(event);
    
    if(!this.options.quiet){
      Position.prepare();
      Droppables.show(pointer, this.element);
    }
    
    Draggables.notify('onDrag', this, event);
    
    this.draw(pointer);
    if(this.options.change) this.options.change(this);
    
    if(this.options.scroll) {
      this.stopScrolling();
      
      var p;
      if (this.options.scroll == window) {
        with(this._getWindowScroll(this.options.scroll)) { p = [ left, top, left+width, top+height ]; }
      } else {
        p = Position.page(this.options.scroll);
        p[0] += this.options.scroll.scrollLeft + Position.deltaX;
        p[1] += this.options.scroll.scrollTop + Position.deltaY;
        p.push(p[0]+this.options.scroll.offsetWidth);
        p.push(p[1]+this.options.scroll.offsetHeight);
      }
      var speed = [0,0];
      if(pointer[0] < (p[0]+this.options.scrollSensitivity)) speed[0] = pointer[0]-(p[0]+this.options.scrollSensitivity);
      if(pointer[1] < (p[1]+this.options.scrollSensitivity)) speed[1] = pointer[1]-(p[1]+this.options.scrollSensitivity);
      if(pointer[0] > (p[2]-this.options.scrollSensitivity)) speed[0] = pointer[0]-(p[2]-this.options.scrollSensitivity);
      if(pointer[1] > (p[3]-this.options.scrollSensitivity)) speed[1] = pointer[1]-(p[3]-this.options.scrollSensitivity);
      this.startScrolling(speed);
    }
    
    // fix AppleWebKit rendering
    if(Prototype.Browser.WebKit) window.scrollBy(0,0);
    
    Event.stop(event);
  },
  
  finishDrag: function(event, success) {
    this.dragging = false;
    
    if(this.options.quiet){
      Position.prepare();
      var pointer = [Event.pointerX(event), Event.pointerY(event)];
      Droppables.show(pointer, this.element);
    }

    if(this.options.ghosting) {
      if (!this.element._originallyAbsolute)
        Position.relativize(this.element);
      delete this.element._originallyAbsolute;
      Element.remove(this._clone);
      this._clone = null;
    }

    var dropped = false; 
    if(success) { 
      dropped = Droppables.fire(event, this.element); 
      if (!dropped) dropped = false; 
    }
    if(dropped && this.options.onDropped) this.options.onDropped(this.element);
    Draggables.notify('onEnd', this, event);

    var revert = this.options.revert;
    if(revert && Object.isFunction(revert)) revert = revert(this.element);
    
    var d = this.currentDelta();
    if(revert && this.options.reverteffect) {
      if (dropped == 0 || revert != 'failure')
        this.options.reverteffect(this.element,
          d[1]-this.delta[1], d[0]-this.delta[0]);
    } else {
      this.delta = d;
    }

    if(this.options.zindex)
      this.element.style.zIndex = this.originalZ;

    if(this.options.endeffect) 
      this.options.endeffect(this.element);
      
    Draggables.deactivate(this);
    Droppables.reset();
  },
  
  keyPress: function(event) {
    if(event.keyCode!=Event.KEY_ESC) return;
    this.finishDrag(event, false);
    Event.stop(event);
  },
  
  endDrag: function(event) {
    if(!this.dragging) return;
    this.stopScrolling();
    this.finishDrag(event, true);
    Event.stop(event);
  },
  
  draw: function(point) {
    var pos = Position.cumulativeOffset(this.element);
    if(this.options.ghosting) {
      var r   = Position.realOffset(this.element);
      pos[0] += r[0] - Position.deltaX; pos[1] += r[1] - Position.deltaY;
    }
    
    var d = this.currentDelta();
    pos[0] -= d[0]; pos[1] -= d[1];
    
    if(this.options.scroll && (this.options.scroll != window && this._isScrollChild)) {
      pos[0] -= this.options.scroll.scrollLeft-this.originalScrollLeft;
      pos[1] -= this.options.scroll.scrollTop-this.originalScrollTop;
    }
    
    var p = [0,1].map(function(i){ 
      return (point[i]-pos[i]-this.offset[i]) 
    }.bind(this));
    
    if(this.options.snap) {
      if(Object.isFunction(this.options.snap)) {
        p = this.options.snap(p[0],p[1],this);
      } else {
      if(Object.isArray(this.options.snap)) {
        p = p.map( function(v, i) {
          return (v/this.options.snap[i]).round()*this.options.snap[i] }.bind(this))
      } else {
        p = p.map( function(v) {
          return (v/this.options.snap).round()*this.options.snap }.bind(this))
      }
    }}
    
    var style = this.element.style;
    if((!this.options.constraint) || (this.options.constraint=='horizontal'))
      style.left = p[0] + "px";
    if((!this.options.constraint) || (this.options.constraint=='vertical'))
      style.top  = p[1] + "px";
    
    if(style.visibility=="hidden") style.visibility = ""; // fix gecko rendering
  },
  
  stopScrolling: function() {
    if(this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
      Draggables._lastScrollPointer = null;
    }
  },
  
  startScrolling: function(speed) {
    if(!(speed[0] || speed[1])) return;
    this.scrollSpeed = [speed[0]*this.options.scrollSpeed,speed[1]*this.options.scrollSpeed];
    this.lastScrolled = new Date();
    this.scrollInterval = setInterval(this.scroll.bind(this), 10);
  },
  
  scroll: function() {
    var current = new Date();
    var delta = current - this.lastScrolled;
    this.lastScrolled = current;
    if(this.options.scroll == window) {
      with (this._getWindowScroll(this.options.scroll)) {
        if (this.scrollSpeed[0] || this.scrollSpeed[1]) {
          var d = delta / 1000;
          this.options.scroll.scrollTo( left + d*this.scrollSpeed[0], top + d*this.scrollSpeed[1] );
        }
      }
    } else {
      this.options.scroll.scrollLeft += this.scrollSpeed[0] * delta / 1000;
      this.options.scroll.scrollTop  += this.scrollSpeed[1] * delta / 1000;
    }
    
    Position.prepare();
    Droppables.show(Draggables._lastPointer, this.element);
    Draggables.notify('onDrag', this);
    if (this._isScrollChild) {
      Draggables._lastScrollPointer = Draggables._lastScrollPointer || $A(Draggables._lastPointer);
      Draggables._lastScrollPointer[0] += this.scrollSpeed[0] * delta / 1000;
      Draggables._lastScrollPointer[1] += this.scrollSpeed[1] * delta / 1000;
      if (Draggables._lastScrollPointer[0] < 0)
        Draggables._lastScrollPointer[0] = 0;
      if (Draggables._lastScrollPointer[1] < 0)
        Draggables._lastScrollPointer[1] = 0;
      this.draw(Draggables._lastScrollPointer);
    }
    
    if(this.options.change) this.options.change(this);
  },
  
  _getWindowScroll: function(w) {
    var T, L, W, H;
    with (w.document) {
      if (w.document.documentElement && documentElement.scrollTop) {
        T = documentElement.scrollTop;
        L = documentElement.scrollLeft;
      } else if (w.document.body) {
        T = body.scrollTop;
        L = body.scrollLeft;
      }
      if (w.innerWidth) {
        W = w.innerWidth;
        H = w.innerHeight;
      } else if (w.document.documentElement && documentElement.clientWidth) {
        W = documentElement.clientWidth;
        H = documentElement.clientHeight;
      } else {
        W = body.offsetWidth;
        H = body.offsetHeight
      }
    }
    return { top: T, left: L, width: W, height: H };
  }
});

Draggable._dragging = { };

/*--------------------------------------------------------------------------*/

var SortableObserver = Class.create({
  initialize: function(element, observer) {
    this.element   = $(element);
    this.observer  = observer;
    this.lastValue = Sortable.serialize(this.element);
  },
  
  onStart: function() {
    this.lastValue = Sortable.serialize(this.element);
  },
  
  onEnd: function() {
    Sortable.unmark();
    if(this.lastValue != Sortable.serialize(this.element))
      this.observer(this.element)
  }
});

var Sortable = {
  SERIALIZE_RULE: /^[^_\-](?:[A-Za-z0-9\-\_]*)[_](.*)$/,
  
  sortables: { },
  
  _findRootElement: function(element) {
    while (element.tagName.toUpperCase() != "BODY") {  
      if(element.id && Sortable.sortables[element.id]) return element;
      element = element.parentNode;
    }
  },

  options: function(element) {
    element = Sortable._findRootElement($(element));
    if(!element) return;
    return Sortable.sortables[element.id];
  },
  
  destroy: function(element){
    var s = Sortable.options(element);
    
    if(s) {
      Draggables.removeObserver(s.element);
      s.droppables.each(function(d){ Droppables.remove(d) });
      s.draggables.invoke('destroy');
      
      delete Sortable.sortables[s.element.id];
    }
  },

  create: function(element) {
    element = $(element);
    var options = Object.extend({ 
      element:     element,
      tag:         'li',       // assumes li children, override with tag: 'tagname'
      dropOnEmpty: false,
      tree:        false,
      treeTag:     'ul',
      overlap:     'vertical', // one of 'vertical', 'horizontal'
      constraint:  'vertical', // one of 'vertical', 'horizontal', false
      containment: element,    // also takes array of elements (or id's); or false
      handle:      false,      // or a CSS class
      only:        false,
      delay:       0,
      hoverclass:  null,
      ghosting:    false,
      quiet:       false, 
      scroll:      false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      format:      this.SERIALIZE_RULE,
      
      // these take arrays of elements or ids and can be 
      // used for better initialization performance
      elements:    false,
      handles:     false,
      
      onChange:    Prototype.emptyFunction,
      onUpdate:    Prototype.emptyFunction
    }, arguments[1] || { });

    // clear any old sortable with same element
    this.destroy(element);

    // build options for the draggables
    var options_for_draggable = {
      revert:      true,
      quiet:       options.quiet,
      scroll:      options.scroll,
      scrollSpeed: options.scrollSpeed,
      scrollSensitivity: options.scrollSensitivity,
      delay:       options.delay,
      ghosting:    options.ghosting,
      constraint:  options.constraint,
      handle:      options.handle };

    if(options.starteffect)
      options_for_draggable.starteffect = options.starteffect;

    if(options.reverteffect)
      options_for_draggable.reverteffect = options.reverteffect;
    else
      if(options.ghosting) options_for_draggable.reverteffect = function(element) {
        element.style.top  = 0;
        element.style.left = 0;
      };

    if(options.endeffect)
      options_for_draggable.endeffect = options.endeffect;

    if(options.zindex)
      options_for_draggable.zindex = options.zindex;

    // build options for the droppables  
    var options_for_droppable = {
      overlap:     options.overlap,
      containment: options.containment,
      tree:        options.tree,
      hoverclass:  options.hoverclass,
      onHover:     Sortable.onHover
    }
    
    var options_for_tree = {
      onHover:      Sortable.onEmptyHover,
      overlap:      options.overlap,
      containment:  options.containment,
      hoverclass:   options.hoverclass
    }

    // fix for gecko engine
    Element.cleanWhitespace(element); 

    options.draggables = [];
    options.droppables = [];

    // drop on empty handling
    if(options.dropOnEmpty || options.tree) {
      Droppables.add(element, options_for_tree);
      options.droppables.push(element);
    }

    (options.elements || this.findElements(element, options) || []).each( function(e,i) {
      var handle = options.handles ? $(options.handles[i]) :
        (options.handle ? $(e).select('.' + options.handle)[0] : e); 
      options.draggables.push(
        new Draggable(e, Object.extend(options_for_draggable, { handle: handle })));
      Droppables.add(e, options_for_droppable);
      if(options.tree) e.treeNode = element;
      options.droppables.push(e);      
    });
    
    if(options.tree) {
      (Sortable.findTreeElements(element, options) || []).each( function(e) {
        Droppables.add(e, options_for_tree);
        e.treeNode = element;
        options.droppables.push(e);
      });
    }

    // keep reference
    this.sortables[element.id] = options;

    // for onupdate
    Draggables.addObserver(new SortableObserver(element, options.onUpdate));

  },

  // return all suitable-for-sortable elements in a guaranteed order
  findElements: function(element, options) {
    return Element.findChildren(
      element, options.only, options.tree ? true : false, options.tag);
  },
  
  findTreeElements: function(element, options) {
    return Element.findChildren(
      element, options.only, options.tree ? true : false, options.treeTag);
  },

  onHover: function(element, dropon, overlap) {
    if(Element.isParent(dropon, element)) return;

    if(overlap > .33 && overlap < .66 && Sortable.options(dropon).tree) {
      return;
    } else if(overlap>0.5) {
      Sortable.mark(dropon, 'before');
      if(dropon.previousSibling != element) {
        var oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, dropon);
        if(dropon.parentNode!=oldParentNode) 
          Sortable.options(oldParentNode).onChange(element);
        Sortable.options(dropon.parentNode).onChange(element);
      }
    } else {
      Sortable.mark(dropon, 'after');
      var nextElement = dropon.nextSibling || null;
      if(nextElement != element) {
        var oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, nextElement);
        if(dropon.parentNode!=oldParentNode) 
          Sortable.options(oldParentNode).onChange(element);
        Sortable.options(dropon.parentNode).onChange(element);
      }
    }
  },
  
  onEmptyHover: function(element, dropon, overlap) {
    var oldParentNode = element.parentNode;
    var droponOptions = Sortable.options(dropon);
        
    if(!Element.isParent(dropon, element)) {
      var index;
      
      var children = Sortable.findElements(dropon, {tag: droponOptions.tag, only: droponOptions.only});
      var child = null;
            
      if(children) {
        var offset = Element.offsetSize(dropon, droponOptions.overlap) * (1.0 - overlap);
        
        for (index = 0; index < children.length; index += 1) {
          if (offset - Element.offsetSize (children[index], droponOptions.overlap) >= 0) {
            offset -= Element.offsetSize (children[index], droponOptions.overlap);
          } else if (offset - (Element.offsetSize (children[index], droponOptions.overlap) / 2) >= 0) {
            child = index + 1 < children.length ? children[index + 1] : null;
            break;
          } else {
            child = children[index];
            break;
          }
        }
      }
      
      dropon.insertBefore(element, child);
      
      Sortable.options(oldParentNode).onChange(element);
      droponOptions.onChange(element);
    }
  },

  unmark: function() {
    if(Sortable._marker) Sortable._marker.hide();
  },

  mark: function(dropon, position) {
    // mark on ghosting only
    var sortable = Sortable.options(dropon.parentNode);
    if(sortable && !sortable.ghosting) return; 

    if(!Sortable._marker) {
      Sortable._marker = 
        ($('dropmarker') || Element.extend(document.createElement('DIV'))).
          hide().addClassName('dropmarker').setStyle({position:'absolute'});
      document.getElementsByTagName("body").item(0).appendChild(Sortable._marker);
    }    
    var offsets = Position.cumulativeOffset(dropon);
    Sortable._marker.setStyle({left: offsets[0]+'px', top: offsets[1] + 'px'});
    
    if(position=='after')
      if(sortable.overlap == 'horizontal') 
        Sortable._marker.setStyle({left: (offsets[0]+dropon.clientWidth) + 'px'});
      else
        Sortable._marker.setStyle({top: (offsets[1]+dropon.clientHeight) + 'px'});
    
    Sortable._marker.show();
  },
  
  _tree: function(element, options, parent) {
    var children = Sortable.findElements(element, options) || [];
  
    for (var i = 0; i < children.length; ++i) {
      var match = children[i].id.match(options.format);

      if (!match) continue;
      
      var child = {
        id: encodeURIComponent(match ? match[1] : null),
        element: element,
        parent: parent,
        children: [],
        position: parent.children.length,
        container: $(children[i]).down(options.treeTag)
      }
      
      /* Get the element containing the children and recurse over it */
      if (child.container)
        this._tree(child.container, options, child)
      
      parent.children.push (child);
    }

    return parent; 
  },

  tree: function(element) {
    element = $(element);
    var sortableOptions = this.options(element);
    var options = Object.extend({
      tag: sortableOptions.tag,
      treeTag: sortableOptions.treeTag,
      only: sortableOptions.only,
      name: element.id,
      format: sortableOptions.format
    }, arguments[1] || { });
    
    var root = {
      id: null,
      parent: null,
      children: [],
      container: element,
      position: 0
    }
    
    return Sortable._tree(element, options, root);
  },

  /* Construct a [i] index for a particular node */
  _constructIndex: function(node) {
    var index = '';
    do {
      if (node.id) index = '[' + node.position + ']' + index;
    } while ((node = node.parent) != null);
    return index;
  },

  sequence: function(element) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[1] || { });
    
    return $(this.findElements(element, options) || []).map( function(item) {
      return item.id.match(options.format) ? item.id.match(options.format)[1] : '';
    });
  },

  setSequence: function(element, new_sequence) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[2] || { });
    
    var nodeMap = { };
    this.findElements(element, options).each( function(n) {
        if (n.id.match(options.format))
            nodeMap[n.id.match(options.format)[1]] = [n, n.parentNode];
        n.parentNode.removeChild(n);
    });
   
    new_sequence.each(function(ident) {
      var n = nodeMap[ident];
      if (n) {
        n[1].appendChild(n[0]);
        delete nodeMap[ident];
      }
    });
  },
  
  serialize: function(element) {
    element = $(element);
    var options = Object.extend(Sortable.options(element), arguments[1] || { });
    var name = encodeURIComponent(
      (arguments[1] && arguments[1].name) ? arguments[1].name : element.id);
    
    if (options.tree) {
      return Sortable.tree(element, arguments[1]).children.map( function (item) {
        return [name + Sortable._constructIndex(item) + "[id]=" + 
                encodeURIComponent(item.id)].concat(item.children.map(arguments.callee));
      }).flatten().join('&');
    } else {
      return Sortable.sequence(element, arguments[1]).map( function(item) {
        return name + "[]=" + encodeURIComponent(item);
      }).join('&');
    }
  }
}

// Returns true if child is contained within element
Element.isParent = function(child, element) {
  if (!child.parentNode || child == element) return false;
  if (child.parentNode == element) return true;
  return Element.isParent(child.parentNode, element);
}

Element.findChildren = function(element, only, recursive, tagName) {   
  if(!element.hasChildNodes()) return null;
  tagName = tagName.toUpperCase();
  if(only) only = [only].flatten();
  var elements = [];
  $A(element.childNodes).each( function(e) {
    if(e.tagName && e.tagName.toUpperCase()==tagName &&
      (!only || (Element.classNames(e).detect(function(v) { return only.include(v) }))))
        elements.push(e);
    if(recursive) {
      var grandchildren = Element.findChildren(e, only, recursive, tagName);
      if(grandchildren) elements.push(grandchildren);
    }
  });

  return (elements.length>0 ? elements.flatten() : []);
}

Element.offsetSize = function (element, type) {
  return element['offset' + ((type=='vertical' || type=='height') ? 'Height' : 'Width')];
}
// Copied from Seam 2.2.1
// to get the bugfix for JBSEAM-3721

// Init base-level objects
var Seam = new Object();
Seam.Remoting = new Object();
Seam.Component = new Object();
Seam.pageContext = new Object();

// Components registered here
Seam.Component.components = new Array();
Seam.Component.instances = new Array();

//Nuxeo specific
Seam.Remoting.contextPath = '/nuxeo';

Seam.Component.newInstance = function(name)
{
  for (var i = 0; i < Seam.Component.components.length; i++)
  {
    if (Seam.Component.components[i].__name == name)
      return new Seam.Component.components[i];
  }
}

Seam.Component.getInstance = function(name)
{
  for (var i = 0; i < Seam.Component.components.length; i++)
  {
    if (Seam.Component.components[i].__name == name)
    {
      if (Seam.Component.components[i].__instance == null)
        Seam.Component.components[i].__instance = new Seam.Component.components[i]();
      return Seam.Component.components[i].__instance;
    }
  }
  return null;
}

Seam.Component.getComponentType = function(obj)
{
  for (var i = 0; i < Seam.Component.components.length; i++)
  {
    if (obj instanceof Seam.Component.components[i])
      return Seam.Component.components[i];
  }
  return null;
}

Seam.Component.getComponentName = function(obj)
{
  var componentType = Seam.Component.getComponentType(obj);
  return componentType ? componentType.__name : null;
}

Seam.Component.register = function(component)
{
  for (var i = 0; i < Seam.Component.components.length; i++)
  {
    if (Seam.Component.components[i].__name == component.__name)
    {
      // Replace the existing component with the new one
      Seam.Component.components[i] = component;
      return;
    }
  }
  Seam.Component.components.push(component);
  component.__instance = null;
}

Seam.Component.isRegistered = function(name)
{
  for (var i = 0; i < Seam.Component.components.length; i++)
  {
    if (Seam.Component.components[i].__name == name)
      return true;
  }
  return false;
}

Seam.Component.getMetadata = function(obj)
{
  for (var i = 0; i < Seam.Component.components.length; i++)
  {
    if (obj instanceof Seam.Component.components[i])
      return Seam.Component.components[i].__metadata;
  }
  return null;
}

Seam.Remoting.extractEncodedSessionId = function(url)
{
  var sessionId = null;
  if (url.indexOf(';jsessionid=') >= 0)
  {
    var qpos = url.indexOf('?');
    sessionId = url.substring(url.indexOf(';jsessionid=') + 12, qpos >= 0 ? qpos : url.length);
  }
  return sessionId;
}

Seam.Remoting.PATH_EXECUTE = "/execute";
Seam.Remoting.PATH_SUBSCRIPTION = "/subscription";
Seam.Remoting.PATH_POLL = "/poll";

Seam.Remoting.encodedSessionId = Seam.Remoting.extractEncodedSessionId(window.location.href);

// Type declarations will live in this namespace
Seam.Remoting.type = new Object();

// Types are registered in an array
Seam.Remoting.types = new Array();

Seam.Remoting.debug = false;
Seam.Remoting.debugWindow = null;

Seam.Remoting.setDebug = function(val)
{
  Seam.Remoting.debug = val;
}

// Log a message to a popup debug window
Seam.Remoting.log = function(msg)
{
  if (!Seam.Remoting.debug)
    return;

  if (!Seam.Remoting.debugWindow || Seam.Remoting.debugWindow.document == null)
  {
    var attr = "left=400,top=400,resizable=yes,scrollbars=yes,width=400,height=400";
    Seam.Remoting.debugWindow = window.open("", "__seamDebugWindow", attr);
    if (Seam.Remoting.debugWindow)
    {
      Seam.Remoting.debugWindow.document.write("<html><head><title>Seam Debug Window</title></head><body></body></html>");
      var bodyTag = Seam.Remoting.debugWindow.document.getElementsByTagName("body").item(0);
      bodyTag.style.fontFamily = "arial";
      bodyTag.style.fontSize = "8pt";
    }
  }

  if (Seam.Remoting.debugWindow)
  {
    msg = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    Seam.Remoting.debugWindow.document.write("<pre>" + (new Date()) + ": " + msg + "</pre><br/>");
  }
}

Seam.Remoting.createNamespace = function(namespace)
{
  var parts = namespace.split(".");
  var base = Seam.Remoting.type;

  for(var i = 0; i < parts.length; i++)
  {
    if (typeof base[parts[i]] == "undefined")
      base[parts[i]] = new Object();
    base = base[parts[i]];
  }
}

Seam.Remoting.__Context = function()
{
  this.conversationId = null;

  Seam.Remoting.__Context.prototype.setConversationId = function(conversationId)
  {
    this.conversationId = conversationId;
  }

  Seam.Remoting.__Context.prototype.getConversationId = function()
  {
    return this.conversationId;
  }
}

Seam.Remoting.Exception = function(msg)
{
  this.message = msg;

  Seam.Remoting.Exception.prototype.getMessage = function()
  {
    return this.message;
  }
}

Seam.Remoting.context = new Seam.Remoting.__Context();

Seam.Remoting.getContext = function()
{
  return Seam.Remoting.context;
}

Seam.Remoting.Map = function()
{
  this.elements = new Array();

  Seam.Remoting.Map.prototype.size = function()
  {
    return this.elements.length;
  }

  Seam.Remoting.Map.prototype.isEmpty = function()
  {
    return this.elements.length == 0;
  }

  Seam.Remoting.Map.prototype.keySet = function()
  {
    var keySet = new Array();
    for (var i = 0; i < this.elements.length; i++)
      keySet[keySet.length] = this.elements[i].key;
    return keySet;
  }

  Seam.Remoting.Map.prototype.values = function()
  {
    var values = new Array();
    for (var i = 0; i < this.elements.length; i++)
      values[values.length] = this.elements[i].value;
    return values;
  }

  Seam.Remoting.Map.prototype.get = function(key)
  {
    for (var i = 0; i < this.elements.length; i++)
    {
      if (this.elements[i].key == key)
        return this.elements[i].value;
    }
    return null;
  }

  Seam.Remoting.Map.prototype.put = function(key, value)
  {
    for (var i = 0; i < this.elements.length; i++)
    {
      if (this.elements[i].key == key)
      {
        this.elements[i].value = value;
        return;
      }
    }
    this.elements.push({key:key,value:value});
  }

  Seam.Remoting.Map.prototype.remove = function(key)
  {
    for (var i = 0; i < this.elements.length; i++)
    {
      if (this.elements[i].key == key)
        this.elements.splice(i, 1);
    }
  }

  Seam.Remoting.Map.prototype.contains = function(key)
  {
    for (var i = 0; i < this.elements.length; i++)
    {
      if (this.elements[i].key == key)
        return true;
    }
    return false;
  }
}

Seam.Remoting.registerType = function(type)
{
  for (var i = 0; i < Seam.Remoting.types.length; i++)
  {
    if (Seam.Remoting.types[i].__name == type.__name)
    {
      Seam.Remoting.types[i] = type;
      return;
    }
  }
  Seam.Remoting.types.push(type);
}

Seam.Remoting.createType = function(name)
{
  for (var i = 0; i < Seam.Remoting.types.length; i++)
  {
    if (Seam.Remoting.types[i].__name == name)
      return new Seam.Remoting.types[i];
  }
}

Seam.Remoting.getType = function(obj)
{
  for (var i = 0; i < Seam.Remoting.types.length; i++)
  {
    if (obj instanceof Seam.Remoting.types[i])
      return Seam.Remoting.types[i];
  }
  return null;
}

Seam.Remoting.getTypeName = function(obj)
{
  var type = Seam.Remoting.getType(obj);
  return type ? type.__name : null;
}

Seam.Remoting.getMetadata = function(obj)
{
  for (var i = 0; i < Seam.Remoting.types.length; i++)
  {
    if (obj instanceof Seam.Remoting.types[i])
      return Seam.Remoting.types[i].__metadata;
  }
  return null;
}

Seam.Remoting.serializeValue = function(value, type, refs)
{
  if (value == null)
    return "<null/>";
  else if (type)
  {
    switch (type) {
      // Boolean
      case "bool": return "<bool>" + (value ? "true" : "false") + "</bool>";

      // Numerical types
      case "number": return "<number>" + value + "</number>";

      // Date
      case "date": return Seam.Remoting.serializeDate(value);
      // Beans
      case "bean": return Seam.Remoting.getTypeRef(value, refs);

      // Collections
      case "bag": return Seam.Remoting.serializeBag(value, refs);
      case "map": return Seam.Remoting.serializeMap(value, refs);

      default: return "<str>" + encodeURIComponent(value) + "</str>";
    }
  }
  else // We don't know the type.. try to guess
  {
    switch (typeof(value)) {
      case "number":
        return "<number>" + value + "</number>";
      case "boolean":
        return "<bool>" + (value ? "true" : "false") + "</bool>";
      case "object":
        if (value instanceof Array)
          return Seam.Remoting.serializeBag(value, refs);
        else if (value instanceof Date)
          return Seam.Remoting.serializeDate(value);
        else if (value instanceof Seam.Remoting.Map)
          return Seam.Remoting.serializeMap(value, refs);
        else
          return Seam.Remoting.getTypeRef(value, refs);
      default:
        return "<str>" + encodeURIComponent(value) + "</str>"; // Default to String
    }
  }
}

Seam.Remoting.serializeBag = function(value, refs)
{
  var data = "<bag>";

  for (var i = 0; i < value.length; i++)
  {
    data += "<element>";
    data += Seam.Remoting.serializeValue(value[i], null, refs);
    data += "</element>";
  }

  data += "</bag>";
  return data;
}

Seam.Remoting.serializeMap = function(value, refs)
{
  var data = "<map>";

  var keyset = value.keySet();
  for (var i = 0; i < keyset.length; i++)
  {
    data += "<element><k>";
    data += Seam.Remoting.serializeValue(keyset[i], null, refs);
    data += "</k><v>";
    data += Seam.Remoting.serializeValue(value.get(keyset[i]), null, refs);
    data += "</v></element>";
  }

  data += "</map>";
  return data;
}

Seam.Remoting.serializeDate = function(value)
{
  var zeroPad = function(val, digits) { while (("" + val).length < digits) val = "0" + val; return val; };

  var data = "<date>";
  data += value.getFullYear();
  data += zeroPad(value.getMonth() + 1, 2);
  data += zeroPad(value.getDate(), 2);
  data += zeroPad(value.getHours(), 2);
  data += zeroPad(value.getMinutes(), 2);
  data += zeroPad(value.getSeconds(), 2);
  data += zeroPad(value.getMilliseconds(), 3);
  data += "</date>";
  return data;
}

Seam.Remoting.getTypeRef = function(obj, refs)
{
  var refId = -1;

  for (var i = 0; i < refs.length; i++)
  {
    if (refs[i] == obj)
    {
      refId = i;
      break;
    }
  }

  if (refId == -1)
  {
    refId = refs.length;
    refs[refId] = obj;
  }

  return "<ref id=\"" + refId + "\"/>";
}

Seam.Remoting.serializeType = function(obj, refs)
{
  var data = "<bean type=\"";

  var objType = Seam.Component.getComponentType(obj);
  var isComponent = objType != null;

  if (!isComponent)
    objType = Seam.Remoting.getType(obj);

  if (!objType)
  {
    alert("Unknown Type error.");
    return null;
  }

  data += objType.__name;
  data += "\">\n";

  var meta = isComponent ? Seam.Component.getMetadata(obj) : Seam.Remoting.getMetadata(obj);
  for (var i = 0; i < meta.length; i++)
  {
    data += "<member name=\"";
    data += meta[i].field;
    data += "\">";
    data += Seam.Remoting.serializeValue(obj[meta[i].field], meta[i].type, refs);
    data += "</member>\n";
  }

  data += "</bean>";

  return data;
}

Seam.Remoting.__callId = 0;

// eval() disabled until security issues resolved.

//Seam.Remoting.eval = function(expression, callback)
//{
//  var callId = "" + Seam.Remoting.__callId++;
//  var data = "<eval expr=\"";
//  data += expression;
//  data += "\" id=\"";
//  data += callId;
//  data += "\"/>";
//  var call = {data: data, id: callId, callback: callback};

//  var envelope = Seam.Remoting.createEnvelope(Seam.Remoting.createHeader(), data);
//  Seam.Remoting.pendingCalls.put(call.id, call);

//  call.asyncReq = Seam.Remoting.sendAjaxRequest(envelope, Seam.Remoting.PATH_EXECUTE, Seam.Remoting.processResponse, false);
//}

Seam.Remoting.createCall = function(component, methodName, params, callback, exceptionHandler)
{
  var callId = "" + Seam.Remoting.__callId++;
  if (!callback)
    callback = component.__callback[methodName];

  var data = "<call component=\"";
  data += Seam.Component.getComponentType(component).__name;
  data += "\" method=\"";
  data += methodName;
  data += "\" id=\"";
  data += callId;
  data += "\">\n";

  // Add parameters
  data += "<params>";

  var refs = new Array();

  for (var i = 0; i < params.length; i++)
  {
    data += "<param>";
    data += Seam.Remoting.serializeValue(params[i], null, refs);
    data += "</param>";
  }

  data += "</params>";

  // Add refs
  data += "<refs>";
  for (var i = 0; i < refs.length; i++)
  {
    data += "<ref id=\"" + i + "\">";
    data += Seam.Remoting.serializeType(refs[i], refs);
    data += "</ref>";
  }
  data += "</refs>";

  data += "</call>";

  return {data: data, id: callId, callback: callback, exceptionHandler: exceptionHandler};
}

Seam.Remoting.createHeader = function()
{
  var header = "";

  header += "<context>";
  if (Seam.Remoting.getContext().getConversationId())
  {
    header += "<conversationId>";
    header += Seam.Remoting.getContext().getConversationId();
    header += "</conversationId>";
  }
  header += "</context>";

  return header;
}

Seam.Remoting.createEnvelope = function(header, body)
{
  var data = "<envelope>";

  if (header)
  {
    data += "<header>";
    data += header;
    data += "</header>";
  }

  if (body)
  {
    data += "<body>";
    data += body;
    data += "</body>";
  }

  data += "</envelope>";

  return data;
}

Seam.Remoting.pendingCalls = new Seam.Remoting.Map();
Seam.Remoting.inBatch = false;
Seam.Remoting.batchedCalls = new Array();

Seam.Remoting.startBatch = function()
{
  Seam.Remoting.inBatch = true;
  Seam.Remoting.batchedCalls.length = 0;
}

Seam.Remoting.executeBatch = function()
{
  if (!Seam.Remoting.inBatch)
    return;

  var data = "";
  for (var i = 0; i < Seam.Remoting.batchedCalls.length; i++)
  {
    Seam.Remoting.pendingCalls.put(Seam.Remoting.batchedCalls[i].id, Seam.Remoting.batchedCalls[i]);
    data += Seam.Remoting.batchedCalls[i].data;
  }

  var envelope = Seam.Remoting.createEnvelope(Seam.Remoting.createHeader(), data);
  Seam.Remoting.batchAsyncReq = Seam.Remoting.sendAjaxRequest(envelope, Seam.Remoting.PATH_EXECUTE, Seam.Remoting.processResponse, false);
  Seam.Remoting.inBatch = false;
}

Seam.Remoting.cancelBatch = function()
{
  Seam.Remoting.inBatch = false;
  for (var i = 0; i < Seam.Remoting.batchedCalls.length; i++)
    Seam.Remoting.pendingCalls.remove(Seam.Remoting.batchedCalls[i].id);
}

Seam.Remoting.cancelCall = function(callId)
{
  var call = Seam.Remoting.pendingCalls.get(callId);
  Seam.Remoting.pendingCalls.remove(callId);
  if (call && call.asyncReq)
  {
    if (Seam.Remoting.pendingCalls.isEmpty())
      Seam.Remoting.hideLoadingMessage();
    window.setTimeout(function() {
      call.asyncReq.onreadystatechange = function() {};
    }, 0);
    call.asyncReq.abort();
  }
}

Seam.Remoting.execute = function(component, methodName, params, callback, exceptionHandler)
{
  var call = Seam.Remoting.createCall(component, methodName, params, callback, exceptionHandler);

  if (Seam.Remoting.inBatch)
  {
    Seam.Remoting.batchedCalls[Seam.Remoting.batchedCalls.length] = call;
  }
  else
  {
    // Marshal the request
    var envelope = Seam.Remoting.createEnvelope(Seam.Remoting.createHeader(), call.data);
    Seam.Remoting.pendingCalls.put(call.id, call);
    Seam.Remoting.sendAjaxRequest(envelope, Seam.Remoting.PATH_EXECUTE, Seam.Remoting.processResponse, false);
  }

  return call;
}

Seam.Remoting.sendAjaxRequest = function(envelope, path, callback, silent)
{
  Seam.Remoting.log("Request packet:\n" + envelope);

  if (!silent)
    Seam.Remoting.displayLoadingMessage();

  var asyncReq;

  if (window.XMLHttpRequest)
  {
    asyncReq = new XMLHttpRequest();
    if (asyncReq.overrideMimeType)
      asyncReq.overrideMimeType('text/xml');
  }
  else
  {
    asyncReq = new ActiveXObject("Microsoft.XMLHTTP");
  }

  asyncReq.onreadystatechange = function()
  {
    if (asyncReq.readyState == 4)
    {
      var inScope = typeof(Seam) == "undefined" ? false : true;

      if (inScope) Seam.Remoting.hideLoadingMessage();

      if (asyncReq.status == 200)
      {
        // We do this to avoid a memory leak
        window.setTimeout(function() {
          asyncReq.onreadystatechange = function() {};
        }, 0);

        if (inScope) Seam.Remoting.log("Response packet:\n" + asyncReq.responseText);

        if (callback)
        {
          // The following code deals with a Firefox security issue.  It reparses the XML
          // response if accessing the documentElement throws an exception
          try
          {
            asyncReq.responseXML.documentElement;
            //Seam.Remoting.processResponse(asyncReq.responseXML);
      callback(asyncReq.responseXML);
          }
          catch (ex)
          {
             try
             {
               // Try it the IE way first...
               var doc = new ActiveXObject("Microsoft.XMLDOM");
               doc.async = "false";
               doc.loadXML(asyncReq.responseText);
               callback(doc);
             }
             catch (e)
             {
               // If that fails, use standards
               var parser = new DOMParser();
               //Seam.Remoting.processResponse(parser.parseFromString(asyncReq.responseText, "text/xml"));
         callback(parser.parseFromString(asyncReq.responseText, "text/xml"));
             }
          }
        }
      }
      else
      {
        Seam.Remoting.displayError(asyncReq.status);
      }
    }
  }

  if (Seam.Remoting.encodedSessionId)
  {
    path += ';jsessionid=' + Seam.Remoting.encodedSessionId;
  }

  asyncReq.open("POST", Seam.Remoting.resourcePath + path, true);
  asyncReq.send(envelope);
}

Seam.Remoting.displayError = function(code)
{
  alert("There was an error processing your request.  Error code: " + code);
}

Seam.Remoting.setCallback = function(component, methodName, callback)
{
  component.__callback[methodName] = callback;
}

Seam.Remoting.processResponse = function(doc)
{
  var headerNode;
  var bodyNode;

  var inScope = typeof(Seam) == "undefined" ? false : true;
  if (!inScope) return;

  var context = new Seam.Remoting.__Context;

  if (doc.documentElement)
  {
    for (var i = 0; i < doc.documentElement.childNodes.length; i++)
    {
      var node = doc.documentElement.childNodes.item(i);
      if (node.tagName == "header")
        headerNode = node;
      else if (node.tagName == "body")
        bodyNode = node;
    }
  }

  if (headerNode)
  {
    var contextNode;
    for (var i = 0; i < headerNode.childNodes.length; i++)
    {
      var node = headerNode.childNodes.item(i);
      if (node.tagName == "context")
      {
        contextNode = node;
        break;
      }
    }
    if (contextNode && context)
    {
      Seam.Remoting.unmarshalContext(contextNode, context);
      if (context.getConversationId() && Seam.Remoting.getContext().getConversationId() == null)
        Seam.Remoting.getContext().setConversationId(context.getConversationId());
    }
  }

  if (bodyNode)
  {
    for (var i = 0; i < bodyNode.childNodes.length; i++)
    {
      var node = bodyNode.childNodes.item(i);
      if (node.tagName == "result")
        Seam.Remoting.processResult(node, context);
    }
  }
}

Seam.Remoting.processResult = function(result, context)
{
  var callId = result.getAttribute("id");
  var call = Seam.Remoting.pendingCalls.get(callId);
  Seam.Remoting.pendingCalls.remove(callId);

  if (call && (call.callback || call.exceptionHandler))
  {
    var valueNode = null;
    var refsNode = null;
    var exceptionNode = null;

    var children = result.childNodes;
    for (var i = 0; i < children.length; i++)
    {
      var tag = children.item(i).tagName;
      if (tag == "value")
        valueNode = children.item(i);
      else if (tag == "refs")
        refsNode = children.item(i);
      else if (tag == "exception")
        exceptionNode = children.item(i);
    }

    if (exceptionNode != null)
    {
      var msgNode = null;
      var children = exceptionNode.childNodes;
      for (var i = 0; i < children.length; i++)
      {
        var tag = children.item(i).tagName;
        if (tag == "message")
          msgNode = children.item(i);
      }

      var msg = Seam.Remoting.unmarshalValue(msgNode.firstChild);
      var ex = new Seam.Remoting.Exception(msg);
      call.exceptionHandler(ex);
    }
    else
    {
      var refs = new Array();
      if (refsNode)
        Seam.Remoting.unmarshalRefs(refsNode, refs);

      var value = Seam.Remoting.unmarshalValue(valueNode.firstChild, refs);

      call.callback(value, context, callId);
    }
  }
}

Seam.Remoting.unmarshalContext = function(ctxNode, context)
{
  for (var i = 0; i < ctxNode.childNodes.length; i++)
  {
    var tag = ctxNode.childNodes.item(i).tagName;
    if (tag == "conversationId")
      context.setConversationId(ctxNode.childNodes.item(i).firstChild.nodeValue);
  }
}

Seam.Remoting.unmarshalRefs = function(refsNode, refs)
{
  var objs = new Array();

  // Pass 1 - create the reference objects
  for (var i = 0; i < refsNode.childNodes.length; i++)
  {
    if (refsNode.childNodes.item(i).tagName == "ref")
    {
      var refNode = refsNode.childNodes.item(i);
      var refId = parseInt(refNode.getAttribute("id"));

      var valueNode = refNode.firstChild;
      if (valueNode.tagName == "bean")
      {
        var obj = null;
        var typeName = valueNode.getAttribute("type");
        if (Seam.Component.isRegistered(typeName))
          obj = Seam.Component.newInstance(typeName);
        else
          obj = Seam.Remoting.createType(typeName);
        if (obj)
        {
          refs[refId] = obj;
          objs[objs.length] = {obj: obj, node: valueNode};
        }
      }
    }
  }

  // Pass 2 - populate the object members
  for (var i = 0; i < objs.length; i++)
  {
    for (var j = 0; j < objs[i].node.childNodes.length; j++)
    {
      var child = objs[i].node.childNodes.item(j);
      if (child.tagName == "member")
      {
        var name = child.getAttribute("name");
        objs[i].obj[name] = Seam.Remoting.unmarshalValue(child.firstChild, refs);
      }
    }
  }
}

Seam.Remoting.unmarshalValue = function(element, refs)
{
  var tag = element.tagName;

  switch (tag)
  {
    case "bool": return element.firstChild.nodeValue == "true";
    case "number":
      if (element.firstChild.nodeValue.indexOf(".") == -1)
        return parseInt(element.firstChild.nodeValue);
      else
        return parseFloat(element.firstChild.nodeValue);
    case "str":
      var data = "";
      for (var i = 0; i < element.childNodes.length; i++)
      {
        if (element.childNodes[i].nodeType == 3) // NODE_TEXT
          data += element.childNodes[i].nodeValue;
      }
      return decodeURIComponent(data);
    case "ref": return refs[parseInt(element.getAttribute("id"))];
    case "bag":
      var value = new Array();
      for (var i = 0; i < element.childNodes.length; i++)
      {
        if (element.childNodes.item(i).tagName == "element")
          value[value.length] = Seam.Remoting.unmarshalValue(element.childNodes.item(i).firstChild, refs);
      }
      return value;
    case "map":
      var map = new Seam.Remoting.Map();
      for (var i = 0; i < element.childNodes.length; i++)
      {
        var childNode = element.childNodes.item(i);
        if (childNode.tagName == "element")
        {
          var key = null
          var value = null;

          for (var j = 0; j < childNode.childNodes.length; j++)
          {
            if (key == null && childNode.childNodes.item(j).tagName == "k")
              key = Seam.Remoting.unmarshalValue(childNode.childNodes.item(j).firstChild, refs);
            else if (value == null && childNode.childNodes.item(j).tagName == "v")
              value = Seam.Remoting.unmarshalValue(childNode.childNodes.item(j).firstChild, refs);
          }

          if (key != null)
            map.put(key, value);
        }
      }
      return map;
    case "date": return Seam.Remoting.deserializeDate(element.firstChild.nodeValue);
    default: return null;
  }
}

Seam.Remoting.deserializeDate = function(val)
{
  var dte = new Date();
  dte.setFullYear(parseInt(val.substring(0,4), 10),
                  parseInt(val.substring(4,6), 10) - 1,
                  parseInt(val.substring(6,8), 10));
  dte.setHours(parseInt(val.substring(8,10), 10));
  dte.setMinutes(parseInt(val.substring(10,12), 10));
  dte.setSeconds(parseInt(val.substring(12,14), 10));
  dte.setMilliseconds(parseInt(val.substring(14,17), 10));
  return dte;
}

Seam.Remoting.loadingMsgDiv = null;
Seam.Remoting.loadingMessage = "Please wait...";
Seam.Remoting.displayLoadingMessage = function()
{
  if (!Seam.Remoting.loadingMsgDiv)
  {
    Seam.Remoting.loadingMsgDiv = document.createElement('div');
    var msgDiv = Seam.Remoting.loadingMsgDiv;
    msgDiv.setAttribute('id', 'loadingMsg');

    msgDiv.style.position = "absolute";
    msgDiv.style.top = "0px";
    msgDiv.style.right = "0px";
    msgDiv.style.background = "red";
    msgDiv.style.color = "white";
    msgDiv.style.fontFamily = "Verdana,Helvetica,Arial";
    msgDiv.style.fontSize = "small";
    msgDiv.style.padding = "2px";
    msgDiv.style.border = "1px solid black";

    document.body.appendChild(msgDiv);

    var text = document.createTextNode(Seam.Remoting.loadingMessage);
    msgDiv.appendChild(text);
  }
  else
  {
    Seam.Remoting.loadingMsgDiv.innerHTML = Seam.Remoting.loadingMessage;
    Seam.Remoting.loadingMsgDiv.style.visibility = 'visible';
  }
}

Seam.Remoting.hideLoadingMessage = function()
{
  if (Seam.Remoting.loadingMsgDiv)
    Seam.Remoting.loadingMsgDiv.style.visibility = 'hidden';
}

/* Messaging API */

Seam.Remoting.pollInterval = 10; // Default poll interval of 10 seconds
Seam.Remoting.pollTimeout = 0; // Default timeout of 0 seconds
Seam.Remoting.polling = false;

Seam.Remoting.setPollInterval = function(interval)
{
  Seam.Remoting.pollInterval = interval;
}

Seam.Remoting.setPollTimeout = function(timeout)
{
  Seam.Remoting.pollTimeout = timeout;
}

Seam.Remoting.subscriptionRegistry = new Array();

Seam.Remoting.subscribe = function(topicName, callback)
{
  for (var i = 0; i < Seam.Remoting.subscriptionRegistry.length; i++)
  {
    if (Seam.Remoting.subscriptionRegistry[i].topic == topicName)
      return;
  }

  var body = "<subscribe topic=\"" + topicName + "\"/>";
  var env = Seam.Remoting.createEnvelope(null, body);
  Seam.Remoting.subscriptionRegistry.push({topic:topicName, callback:callback});
  Seam.Remoting.sendAjaxRequest(env, Seam.Remoting.PATH_SUBSCRIPTION, Seam.Remoting.subscriptionCallback, false);
}

Seam.Remoting.unsubscribe = function(topicName)
{
  var token = null;

  for (var i = 0; i < Seam.Remoting.subscriptionRegistry.length; i++)
  {
    if (Seam.Remoting.subscriptionRegistry[i].topic == topicName)
    {
      token = Seam.Remoting.subscriptionRegistry[i].token;
      Seam.Remoting.subscriptionRegistry.splice(i, 1);
    }
  }

  if (token)
  {
    var body = "<unsubscribe token=\"" + token + "\"/>";
    var env = Seam.Remoting.createEnvelope(null, body);
    Seam.Remoting.sendAjaxRequest(env, Seam.Remoting.PATH_SUBSCRIPTION, null, false);
  }
}

Seam.Remoting.subscriptionCallback = function(doc)
{
  var body = doc.documentElement.firstChild;
  for (var i = 0; i < body.childNodes.length; i++)
  {
    var node = body.childNodes.item(i);
    if (node.tagName == "subscription")
    {
      var topic = node.getAttribute("topic");
      var token = node.getAttribute("token");
      for (var i = 0; i < Seam.Remoting.subscriptionRegistry.length; i++)
      {
        if (Seam.Remoting.subscriptionRegistry[i].topic == topic)
        {
          Seam.Remoting.subscriptionRegistry[i].token = token;
          Seam.Remoting.poll();
          break;
        }
      }
    }
  }
}

Seam.Remoting.pollTimeoutFunction = null;

Seam.Remoting.poll = function()
{
  if (Seam.Remoting.polling)
    return;

  Seam.Remoting.polling = true;
  clearTimeout(Seam.Remoting.pollTimeoutFunction);

  var body = "";

  if (Seam.Remoting.subscriptionRegistry.length == 0)
  {
    Seam.Remoting.polling = false;
    return;
  }

  for (var i = 0; i < Seam.Remoting.subscriptionRegistry.length; i++)
  {
    body += "<poll token=\"" + Seam.Remoting.subscriptionRegistry[i].token + "\" ";
    body += "timeout=\"" + Seam.Remoting.pollTimeout + "\"/>";
  }

  var env = Seam.Remoting.createEnvelope(null, body);
  Seam.Remoting.sendAjaxRequest(env, Seam.Remoting.PATH_POLL, Seam.Remoting.pollCallback, true);
}

Seam.Remoting.pollCallback = function(doc)
{
  Seam.Remoting.polling = false;

  var body = doc.documentElement.firstChild;
  for (var i = 0; i < body.childNodes.length; i++)
  {
    var node = body.childNodes.item(i);
    if (node.tagName == "messages")
      Seam.Remoting.processMessages(node);
    else if (node.tagName == "errors")
      Seam.Remoting.processPollErrors(node);
  }

  Seam.Remoting.pollTimeoutFunction = setTimeout("Seam.Remoting.poll()", Math.max(Seam.Remoting.pollInterval * 1000, 1000));
}

Seam.Remoting.processMessages = function(messages)
{
  var token = messages.getAttribute("token");

  var callback = null;
  for (var i = 0; i < Seam.Remoting.subscriptionRegistry.length; i++)
  {
    if (Seam.Remoting.subscriptionRegistry[i].token == token)
    {
      callback = Seam.Remoting.subscriptionRegistry[i].callback;
      break;
    }
  }

  if (callback != null)
  {
    var messageNode = null;

    var children = messages.childNodes;
    for (var i = 0; i < children.length; i++)
    {
      if (children.item(i).tagName == "message")
      {
        messageNode = children.item(i);
        var messageType = messageNode.getAttribute("type");

        var valueNode = null;
        var refsNode = null;
        for (var j = 0; j < messageNode.childNodes.length; j++)
        {
          var node = messageNode.childNodes.item(j);
          if (node.tagName == "value")
            valueNode = node;
          else if (node.tagName == "refs")
            refsNode = node;
        }

        var refs = new Array();
        if (refsNode)
          Seam.Remoting.unmarshalRefs(refsNode, refs);

        var value = Seam.Remoting.unmarshalValue(valueNode.firstChild, refs);

        callback(Seam.Remoting.createMessage(messageType, value));
      }
    }
  }
}

Seam.Remoting.processErrors = function(errors)
{
  var token = errors.getAttribute("token");

  // Unsubscribe to the topic
  for (var i = 0; i < Seam.Remoting.subscriptionRegistry.length; i++)
  {
    if (Seam.Remoting.subscriptionRegistry[i].token == token)
    {
      Seam.Remoting.subscriptionRegistry.splice(i, 1);
      break;
    }
  }

  for (var i = 0; i < errors.childNodes.length; i++)
  {
    if (errors.childNodes.item(i).tagName == "error")
    {
      var errorNode = errors.childNodes.item(i);
      var code = errorNode.getAttribute("code");
      var message = errorNode.firstChild.nodeValue;

      if (Seam.Remoting.onPollError)
        Seam.Remoting.onPollError(code, message);
      else
        alert("A polling error occurred: " + code + " " + message);
    }
  }
}

Seam.Remoting.ObjectMessage = function()
{
  this.value = null;

  Seam.Remoting.ObjectMessage.prototype.getValue = function()
  {
    return this.value;
  }

  Seam.Remoting.ObjectMessage.prototype.setValue = function(value)
  {
    this.value = value;
  }
}

Seam.Remoting.TextMessage = function()
{
  this.text = null;

  Seam.Remoting.TextMessage.prototype.getText = function()
  {
    return this.text;
  }

  Seam.Remoting.TextMessage.prototype.setText = function(text)
  {
    this.text = text;
  }
}

Seam.Remoting.createMessage = function(messageType, value)
{
  switch (messageType)
  {
    case "object":
      var msg = new Seam.Remoting.ObjectMessage();
      msg.setValue(value);
      return msg;
    case "text":
      var msg = new Seam.Remoting.TextMessage();
      msg.setText(value);
      return msg;
  }
  return null;
}
/**
 *  author:		Timothy Groves - http://www.brandspankingnew.net
 *	version:	1.2 - 2006-11-17
 *              1.3 - 2006-12-04
 *              2.0 - 2007-02-07
 *              2.1.1 - 2007-04-13
 *              2.1.2 - 2007-07-07
 *              2.1.3 - 2007-07-19
 *
 */


if (typeof(bsn) == "undefined")
	_b = bsn = {};


if (typeof(_b.Autosuggest) == "undefined")
	_b.Autosuggest = {};
else
	alert("Autosuggest is already set!");



_b.AutoSuggest = function (id, param)
{
	// no DOM - give up!
	//
	if (!document.getElementById)
		return 0;




	// get field via DOM
	//
	this.fld = _b.DOM.gE(id);

	if (!this.fld)
		return 0;

	this.hiddenfld = _b.DOM.gE('hidden'+id);

	if (!this.hiddenfld)
		return 0;



	// init variables
	//
	this.sInp 	= "";
	this.nInpC 	= 0;
	this.aSug 	= [];
	this.iHigh 	= 0;

	// parameters object
	//
	this.oP = param ? param : {};

	// defaults
	//
	var k, def = {minchars:1, varname:"input", className:"autosuggest", timeout:2500, delay:500, offsety:-5, shownoresults: true, noresults: "No results!", cache: true, maxentries: 25, directoryName: "", displayIdAndLabel: false, cacheDirectory: true, directoryValues: ""};
	for (k in def)
	{
		if (typeof(this.oP[k]) != typeof(def[k]))
			this.oP[k] = def[k];
	}
	var p = this;
	//init local Cache
	if (this.oP.cacheDirectory){
		var initDirectory = function(result){
			p.directoryValues = [];
			var jsondata = eval('(' + result + ')');
			for (var i=0;i<jsondata.results.length;i++){
				p.directoryValues.push(  { 'id':jsondata.results[i].id, 'value':jsondata.results[i].value, 'info':jsondata.results[i].info }  );
			}
		}
		if (!this.oP.directoryValues) {Seam.Component.getInstance("suggestBox").getSuggestedValues(this.oP.directoryName, "", initDirectory);}
		else {initDirectory(this.oP.directoryValues.substring(1,this.oP.directoryValues.length - 1));}
	}
	// set keyup handler for field
	// and prevent autocomplete from client
	// NOTE: not using addEventListener because UpArrow fired twice in Safari
	//_b.DOM.addEvent( this.fld, 'keyup', function(ev){ return pointer.onKeyPress(ev); } );

	this.fld.onkeypress 	= function(ev){ return p.onKeyPress(ev); };
	this.fld.onkeyup 		= function(ev){ return p.onKeyUp(ev); };
	this.fld.onblur			= function(ev){ return p.onBlur(ev);};
	this.fld.onclick		= function(ev){ return p.onClick(ev);};

	this.fld.setAttribute("autocomplete","off");
};



_b.AutoSuggest.prototype.onClick = function(ev)
{
	if (!this.fld.value){
		var pointer = this;
		var input = this.sInp;
		clearTimeout(this.ajID);
		this.ajID = setTimeout( function() { pointer.doAjaxRequest(input) }, this.oP.delay );
	}
}





_b.AutoSuggest.prototype.onBlur = function(ev)
{
	var bubble = 1;
	this.setHighlightedValue();
	return bubble;
}



_b.AutoSuggest.prototype.onKeyPress = function(ev)
{

	var key = (window.event) ? window.event.keyCode : ev.keyCode;



	// set responses to keydown events in the field
	// this allows the user to use the arrow keys to scroll through the results
	// ESCAPE clears the list
	// TAB sets the current highlighted value
	//
	var RETURN = 13;
	var TAB = 9;
	var ESC = 27;
//	var SPACE = 32;

	var bubble = 1;

	switch(key)
	{
		case TAB:
			this.setHighlightedValue();
			bubble = 0;
			break;

		case RETURN:
			this.setHighlightedValue();
			bubble = 0;
			break;

		case ESC:

 			this.sInp = this.hiddenfld.value = this.fld.value = "";
			this.clearSuggestions();
			bubble = 0;
			break;
	}

	return bubble;
};



_b.AutoSuggest.prototype.onKeyUp = function(ev)
{
	var key = (window.event) ? window.event.keyCode : ev.keyCode;


	var pointer = this;

	// set responses to keydown events in the field
	// this allows the user to use the arrow keys to scroll through the results
	// ESCAPE clears the list
	// TAB sets the current highlighted value
	//

	var ARRUP = 38;
	var ARRDN = 40;
	var DELETE = 46;
	var BACKSPACE = 8;

	var bubble = 1;

	switch(key)
	{

		case ARRUP:
			pointer.changeHighlight(key);
			bubble = 0;
			break;


		case ARRDN:
			pointer.changeHighlight(key);
			bubble = 0;
			break;


		default:
			pointer.getSuggestions(this.fld.value);
	}

	return bubble;


};








_b.AutoSuggest.prototype.getSuggestions = function (val)
{

	// if input stays the same, do nothing
	//
	if ((val == this.sInp) && (val != 0))
		return 0;


	// kill list
	//
	_b.DOM.remE(this.idAs);


	this.sInp = val;


	// input length is less than the min required to trigger a request
	// do nothing
	//
	if ( (val.length < this.oP.minchars))
	{
		this.aSug = [];
		this.nInpC = val.length;
		return 0;
	}




	var ol = this.nInpC; // old length
	this.nInpC = val.length ? val.length : 0;



	// if caching enabled, and user is typing (ie. length of input is increasing)
	// filter results out of aSuggestions from last request
	//
	var l = this.aSug.length;
	if (this.nInpC > ol && l && l<this.oP.maxentries && this.oP.cache)
	{
		var arr = [];
		for (var i=0;i<l;i++)
		{
			if (this.aSug[i].value.substr(0,val.length).toLowerCase() == val.toLowerCase())
				arr.push( this.aSug[i] );
		}
		this.aSug = arr;

		this.createList(this.aSug);



		return false;
	}
	else
	// do new request
	//
	{
		var pointer = this;
		var input = this.sInp;
		clearTimeout(this.ajID);
		this.ajID = setTimeout( function() { pointer.doAjaxRequest(input) }, this.oP.delay );
	}

	return false;
};






_b.AutoSuggest.prototype.doAjaxRequest = function (input)
{

	// check that saved input is still the value of the field
	//
	if (input != this.fld.value)
		return false;

	var pointer = this;


	var input = this.sInp;
	var directoryName = this.oP.directoryName;

	var completionCallback = function(result){
		pointer.setSuggestions(input,result) ;
	};

	if (!this.oP.cacheDirectory){
		Seam.Component.getInstance("suggestBox").getSuggestedValues(directoryName, input, completionCallback);
	}else{
		 pointer.setSuggestions(input,result);
	}
};



_b.AutoSuggest.prototype.setSuggestions = function (input, result)
{

	// if field input no longer matches what was passed to the request
	// don't show the suggestions
	//
	if (input != this.fld.value)
		return false;

	this.aSug = [];
	if (!this.oP.cacheDirectory){
		var jsondata = eval('(' + result + ')');
		for (var i=0;i<jsondata.results.length;i++){
			this.aSug.push(  { 'id':jsondata.results[i].id, 'value':jsondata.results[i].value, 'info':jsondata.results[i].info }  );
		}
	}else{
		var startsWith = function(string, input){
			var taille = input.length;
			var subSection = string.substring(taille,0);
			if (subSection == input){
				return true;
			}
			else{
				return false;
			}
		};
		for (var i=0;i<this.directoryValues.length;i++){
			var label = this.directoryValues[i].value;
			if (label == ""){
				label = this.directoryValues[i].info;
			}
			if (startsWith(label.toLowerCase(),input.toLowerCase())) {
				this.aSug.push(  { 'id':this.directoryValues[i].id, 'value':this.directoryValues[i].value, 'info':this.directoryValues[i].info }  );
			}
		}
	}
	this.idAs = "as_"+this.fld.id;

	this.createList(this.aSug);

};














_b.AutoSuggest.prototype.createList = function(arr)
{
	var pointer = this;




	// get rid of old list
	// and clear the list removal timeout
	//
	_b.DOM.remE(this.idAs);
	this.killTimeout();


	// if no results, and shownoresults is false, do nothing
	//
	if (arr.length == 0 && !this.oP.shownoresults)
		return false;


	// create holding div
	//
	var div = _b.DOM.cE("div", {id:this.idAs, className:this.oP.className});

	var hcorner = _b.DOM.cE("div", {className:"as_corner"});
	var hbar = _b.DOM.cE("div", {className:"as_bar"});
	var header = _b.DOM.cE("div", {className:"as_header"});
	header.appendChild(hcorner);
	header.appendChild(hbar);
	div.appendChild(header);




	// create and populate ul
	//
	var ul = _b.DOM.cE("ul", {id:"as_ul"});




	// loop throught arr of suggestions
	// creating an LI element for each suggestion
	//
	for (var i=0;i<arr.length;i++)
	{
		// format output with the input enclosed in a EM element
		// (as HTML, not DOM)
		//
		var val = arr[i].value;
		if (!val || val == "" ) val = arr[i].info;
		var st = val.toLowerCase().indexOf( this.sInp.toLowerCase() );
		var output = val.substring(0,st) + "<em>" + val.substring(st, st+this.sInp.length) + "</em>" + val.substring(st+this.sInp.length);


		var span 		= _b.DOM.cE("span", {}, output, true);
		if ((arr[i].info != "") && (this.oP.displayIdAndLabel))
		{
			var br			= _b.DOM.cE("br", {});
			span.appendChild(br);
			var small		= _b.DOM.cE("small", {}, arr[i].info);
			span.appendChild(small);
		}

		var a 			= _b.DOM.cE("a", { href:"#" });

		var tl 		= _b.DOM.cE("span", {className:"tl"}, " ");
		var tr 		= _b.DOM.cE("span", {className:"tr"}, " ");
		a.appendChild(tl);
		a.appendChild(tr);

		a.appendChild(span);

		a.name = i+1;
		a.onclick = function () { pointer.setHighlightedValue(); return false; };
		a.onmouseover = function () { pointer.setHighlight(this.name); };

		var li = _b.DOM.cE(  "li", {}, a  );

		ul.appendChild( li );
	}


	// no results
	//
	if (arr.length == 0 && this.oP.shownoresults)
	{
		var li = _b.DOM.cE(  "li", {className:"as_warning"}, this.oP.noresults  );
		ul.appendChild( li );
	}


	div.appendChild( ul );


	var fcorner = _b.DOM.cE("div", {className:"as_corner"});
	var fbar = _b.DOM.cE("div", {className:"as_bar"});
	var footer = _b.DOM.cE("div", {className:"as_footer"});
	footer.appendChild(fcorner);
	footer.appendChild(fbar);
	div.appendChild(footer);



	// get position of target textfield
	// position holding div below it
	// set width of holding div to width of field
	//
	var pos = _b.DOM.getPos(this.fld);
	var fieldHeight = 25;
	if (this.oP.displayIdAndLabel) fieldHeight = 40;
	div.style.left 		= pos.x + "px";
	div.style.top 		= ( pos.y + this.fld.offsetHeight + this.oP.offsety ) + "px";
	div.style.width 	= this.fld.offsetWidth + "px";
	if (arr.length < 6){
		if  (arr.length == 0) {
			div.style.height=fieldHeight + "px";
		}
		else {
			div.style.height=fieldHeight*arr.length + "px";
		}
	}
	else{
		div.style.height=150 + "px";
	}


	// set mouseover functions for div
	// when mouse pointer leaves div, set a timeout to remove the list after an interval
	// when mouse enters div, kill the timeout so the list won't be removed
	//
	//div.onmouseover 	= function(){ pointer.killTimeout() };
	//div.onmouseout 		= function(){ pointer.resetTimeout() };


	// add DIV to document
	//
	document.getElementsByTagName("body")[0].appendChild(div);



	// currently no item is highlighted
	//
	this.iHigh = 0;






	// remove list after an interval
	//
	var pointer = this;
	this.toID = setTimeout(function () { pointer.clearSuggestions() }, this.oP.timeout);
};














_b.AutoSuggest.prototype.changeHighlight = function(key)
{
	var list = _b.DOM.gE("as_ul");
	if (!list)
		return false;

	var n;

	if (key == 40)
		n = this.iHigh + 1;
	else if (key == 38)
		n = this.iHigh - 1;


	if (n > list.childNodes.length)
		n = 1;
	if (n < 1)
		n = list.childNodes.length;



	this.setHighlight(n);
};



_b.AutoSuggest.prototype.setHighlight = function(n)
{
	var list = _b.DOM.gE("as_ul");
	if (!list)
		return false;

	if (this.iHigh > 0)
		this.clearHighlight();

	this.iHigh = Number(n);

	list.childNodes[this.iHigh-1].className = "as_highlight";


	//this.killTimeout();
};


_b.AutoSuggest.prototype.clearHighlight = function()
{
	var list = _b.DOM.gE("as_ul");
	if (!list)
		return false;

	if (this.iHigh > 0)
	{
		list.childNodes[this.iHigh-1].className = "";
		this.iHigh = 0;
	}
};


_b.AutoSuggest.prototype.setHighlightedValue = function ()
{

	if (this.iHigh != 0 && this.aSug[ this.iHigh-1 ])
	{
		this.sInp = this.fld.value = this.aSug[ this.iHigh-1 ].value;
		this.hiddenfld.value = this.aSug[ this.iHigh-1 ].info;
		// move cursor to end of input (safari)
		//
		this.fld.focus();
		if (this.fld.selectionStart)
			this.fld.setSelectionRange(this.sInp.length, this.sInp.length);


		this.clearSuggestions();

		// pass selected object to callback function, if exists
		//
		if (typeof(this.oP.callback) == "function")
			this.oP.callback( this.aSug[this.iHigh-1] );
	}else {
		this.clearSuggestions();
		this.sInp = this.fld.value = "" ;
	}

};













_b.AutoSuggest.prototype.killTimeout = function()
{
	clearTimeout(this.toID);
};

_b.AutoSuggest.prototype.resetTimeout = function()
{
	clearTimeout(this.toID);
	var pointer = this;
	this.toID = setTimeout(function () { pointer.clearSuggestions() }, 1000);
};







_b.AutoSuggest.prototype.clearSuggestions = function ()
{

	this.killTimeout();

	var ele = _b.DOM.gE(this.idAs);
	var pointer = this;
	if (ele)
	{
		_b.DOM.remE(pointer.idAs);
	}
};











// DOM PROTOTYPE _____________________________________________


if (typeof(_b.DOM) == "undefined")
	_b.DOM = {};



/* create element */
_b.DOM.cE = function ( type, attr, cont, html )
{
	var ne = document.createElement( type );
	if (!ne)
		return 0;

	for (var a in attr)
		ne[a] = attr[a];

	var t = typeof(cont);

	if (t == "string" && !html)
		ne.appendChild( document.createTextNode(cont) );
	else if (t == "string" && html)
		ne.innerHTML = cont;
	else if (t == "object")
		ne.appendChild( cont );

	return ne;
};



/* get element */
_b.DOM.gE = function ( e )
{
	var t=typeof(e);
	if (t == "undefined")
		return 0;
	else if (t == "string")
	{
		var re = document.getElementById( e );
		if (!re)
			return 0;
		else if (typeof(re.appendChild) != "undefined" )
			return re;
		else
			return 0;
	}
	else if (typeof(e.appendChild) != "undefined")
		return e;
	else
		return 0;
};



/* remove element */
_b.DOM.remE = function ( ele )
{
	var e = this.gE(ele);

	if (!e)
		return 0;
	else if (e.parentNode.removeChild(e))
		return true;
	else
		return 0;
};



/* get position */
_b.DOM.getPos = function ( e )
{
	var e = this.gE(e);

	var obj = e;

	var curleft = 0;
	if (obj.offsetParent)
	{
		while (obj.offsetParent)
		{
			curleft += obj.offsetLeft;
			obj = obj.offsetParent;
		}
	}
	else if (obj.x)
		curleft += obj.x;

	var obj = e;

	var curtop = 0;
	if (obj.offsetParent)
	{
		while (obj.offsetParent)
		{
			curtop += obj.offsetTop;
			obj = obj.offsetParent;
		}
	}
	else if (obj.y)
		curtop += obj.y;

	return {x:curleft, y:curtop};
};










// FADER PROTOTYPE _____________________________________________



if (typeof(_b.Fader) == "undefined")
	_b.Fader = {};





_b.Fader = function (ele, from, to, fadetime, callback)
{
	if (!ele)
		return 0;

	this.e = ele;

	this.from = from;
	this.to = to;

	this.cb = callback;

	this.nDur = fadetime;

	this.nInt = 50;
	this.nTime = 0;

	var p = this;
	this.nID = setInterval(function() { p._fade() }, this.nInt);
};




_b.Fader.prototype._fade = function()
{
	this.nTime += this.nInt;

	var ieop = Math.round( this._tween(this.nTime, this.from, this.to, this.nDur) * 100 );
	var op = ieop / 100;

	if (this.e.filters) // internet explorer
	{
		try
		{
			this.e.filters.item("DXImageTransform.Microsoft.Alpha").opacity = ieop;
		} catch (e) {
			// If it is not set initially, the browser will throw an error.  This will set it if it is not set yet.
			this.e.style.filter = 'progid:DXImageTransform.Microsoft.Alpha(opacity='+ieop+')';
		}
	}
	else // other browsers
	{
		this.e.style.opacity = op;
	}


	if (this.nTime == this.nDur)
	{
		clearInterval( this.nID );
		if (this.cb != undefined)
			this.cb();
	}
};



_b.Fader.prototype._tween = function(t,b,c,d)
{
	return b + ( (c-b) * (t/d) );
};
function toggleBox(toggleButton) {
  var title = toggleButton.parentNode;
  var body;
  if (title.nextSiblings)
    body = title.nextSiblings()[0];
  else
    body = title.parentNode.children[1];
  if (Element.hasClassName(title, 'folded')) {
    Element.removeClassName(title, 'folded');
    Element.addClassName(title, 'unfolded');
  } else {
    Element.removeClassName(title, 'unfolded');
    Element.addClassName(title, 'folded');
  }
  Effect.toggle(body, 'blind', {duration:0.2});
  return false;
}

function toggleBoxFor(title, body) {
  if (Element.hasClassName(title, 'folded')) {
    Element.removeClassName(title, 'folded');
    Element.addClassName(title, 'unfolded');
  } else {
    Element.removeClassName(title, 'unfolded');
    Element.addClassName(title, 'folded');
  }
  Effect.toggle(body, 'blind', {duration:0.2});
  return false;
}// Copyright (c) 2006 Sébastien Gruhier (http://xilinus.com, http://itseb.com)
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// VERSION 1.2

var Window = Class.create();

Window.keepMultiModalWindow = false;
Window.hasEffectLib = String.prototype.parseColor != null;
Window.resizeEffectDuration = 0.4;

Window.prototype = {
  // Constructor
  // Available parameters : className, title, minWidth, minHeight, maxWidth, maxHeight, width, height, top, left, bottom, right, resizable, zIndex, opacity, recenterAuto, wiredDrag
  //                        hideEffect, showEffect, showEffectOptions, hideEffectOptions, effectOptions, url, draggable, closable, minimizable, maximizable, parent, onload
  //                        add all callbacks (if you do not use an observer)
  //                        onDestroy onStartResize onStartMove onResize onMove onEndResize onEndMove onFocus onBeforeShow onShow onHide onMinimize onMaximize onClose
  
  initialize: function() {
    var id;
    var optionIndex = 0;
    // For backward compatibility like win= new Window("id", {...}) instead of win = new Window({id: "id", ...})
    if (arguments.length > 0) {
      if (typeof arguments[0] == "string" ) {
        id = arguments[0];
        optionIndex = 1;
      }
      else
        id = arguments[0] ? arguments[0].id : null;
    }
    
    // Generate unique ID if not specified
    if (!id)
      id = "window_" + new Date().getTime();
      
    if ($(id))
      alert("Window " + id + " is already registered in the DOM! Make sure you use setDestroyOnClose() or destroyOnClose: true in the constructor");

    this.options = Object.extend({
      className:         "dialog",
      minWidth:          100, 
      minHeight:         20,
      resizable:         true,
      closable:          true,
      minimizable:       true,
      maximizable:       true,
      draggable:         true,
      userData:          null,
      showEffect:        (Window.hasEffectLib ? Effect.Appear : Element.show),
      hideEffect:        (Window.hasEffectLib ? Effect.Fade : Element.hide),
      showEffectOptions: {},
      hideEffectOptions: {},
      effectOptions:     null,
      parent:            document.body,
      title:             "&nbsp;",
      url:               null,
      onload:            Prototype.emptyFunction,
      width:             200,
      height:            300,
      opacity:           1,
      recenterAuto:      true,
      wiredDrag:         false,
      closeCallback:     null,
      destroyOnClose:    false,
      gridX:             1, 
      gridY:             1
    }, arguments[optionIndex] || {});
    
    if (typeof this.options.top == "undefined" &&  typeof this.options.bottom ==  "undefined") 
      this.options.top = this._round(Math.random()*500, this.options.gridY);
    if (typeof this.options.left == "undefined" &&  typeof this.options.right ==  "undefined") 
      this.options.left = this._round(Math.random()*500, this.options.gridX);

    if (this.options.effectOptions) {
      Object.extend(this.options.hideEffectOptions, this.options.effectOptions);
      Object.extend(this.options.showEffectOptions, this.options.effectOptions);
      if (this.options.showEffect == Element.Appear)
        this.options.showEffectOptions.to = this.options.opacity;
    }
    if (Window.hasEffectLib) {
      if (this.options.showEffect == Effect.Appear)
        this.options.showEffectOptions.to = this.options.opacity;
    
      if (this.options.hideEffect == Effect.Fade)
        this.options.hideEffectOptions.from = this.options.opacity;
    }
    if (this.options.hideEffect == Element.hide)
      this.options.hideEffect = function(){ Element.hide(this.element); if (this.options.destroyOnClose) this.destroy(); }.bind(this)
    
    if (this.options.parent != document.body)  
      this.options.parent = $(this.options.parent);
      
    this.element = this._createWindow(id);
    
    // Bind event listener
    this.eventMouseDown = this._initDrag.bindAsEventListener(this);
    this.eventMouseUp   = this._endDrag.bindAsEventListener(this);
    this.eventMouseMove = this._updateDrag.bindAsEventListener(this);
    this.eventOnLoad    = this._getWindowBorderSize.bindAsEventListener(this);
    this.eventMouseDownContent = this.toFront.bindAsEventListener(this);
    this.eventResize = this._recenter.bindAsEventListener(this);
 
    this.topbar = $(this.element.id + "_top");
    this.bottombar = $(this.element.id + "_bottom");
    this.content = $(this.element.id + "_content");
    
    Event.observe(this.topbar, "mousedown", this.eventMouseDown);
    Event.observe(this.bottombar, "mousedown", this.eventMouseDown);
    Event.observe(this.content, "mousedown", this.eventMouseDownContent);
    Event.observe(window, "load", this.eventOnLoad);
    Event.observe(window, "resize", this.eventResize);
    Event.observe(window, "scroll", this.eventResize);
    
    if (this.options.draggable)  {
      var that = this;
      [this.topbar, this.topbar.up().previous(), this.topbar.up().next()].each(function(element) {
        element.observe("mousedown", that.eventMouseDown);
        element.addClassName("top_draggable");
      });
      [this.bottombar.up(), this.bottombar.up().previous(), this.bottombar.up().next()].each(function(element) {
        element.observe("mousedown", that.eventMouseDown);
        element.addClassName("bottom_draggable");
      });
      
    }    
    
    if (this.options.resizable) {
      this.sizer = $(this.element.id + "_sizer");
      Event.observe(this.sizer, "mousedown", this.eventMouseDown);
    }  
    
    this.useLeft = null;
    this.useTop = null;
    if (typeof this.options.left != "undefined") {
      this.element.setStyle({left: parseFloat(this.options.left) + 'px'});
      this.useLeft = true;
    }
    else {
      this.element.setStyle({right: parseFloat(this.options.right) + 'px'});
      this.useLeft = false;
    }
    
    if (typeof this.options.top != "undefined") {
      this.element.setStyle({top: parseFloat(this.options.top) + 'px'});
      this.useTop = true;
    }
    else {
      this.element.setStyle({bottom: parseFloat(this.options.bottom) + 'px'});      
      this.useTop = false;
    }
      
    this.storedLocation = null;
    
    this.setOpacity(this.options.opacity);
    if (this.options.zIndex)
      this.setZIndex(this.options.zIndex)

    if (this.options.destroyOnClose)
      this.setDestroyOnClose(true);

    this._getWindowBorderSize();
    this.width = this.options.width;
    this.height = this.options.height;
    this.visible = false;
    
    this.constraint = false;
    this.constraintPad = {top: 0, left:0, bottom:0, right:0};
    
    if (this.width && this.height)
      this.setSize(this.options.width, this.options.height);
    this.setTitle(this.options.title)
    Windows.register(this);      
  },
  
  // Destructor
  destroy: function() {
    this._notify("onDestroy");
    Event.stopObserving(this.topbar, "mousedown", this.eventMouseDown);
    Event.stopObserving(this.bottombar, "mousedown", this.eventMouseDown);
    Event.stopObserving(this.content, "mousedown", this.eventMouseDownContent);
    
    Event.stopObserving(window, "load", this.eventOnLoad);
    Event.stopObserving(window, "resize", this.eventResize);
    Event.stopObserving(window, "scroll", this.eventResize);
    
    Event.stopObserving(this.content, "load", this.options.onload);

    if (this._oldParent) {
      var content = this.getContent();
      var originalContent = null;
      for(var i = 0; i < content.childNodes.length; i++) {
        originalContent = content.childNodes[i];
        if (originalContent.nodeType == 1) 
          break;
        originalContent = null;
      }
      if (originalContent)
        this._oldParent.appendChild(originalContent);
      this._oldParent = null;
    }

    if (this.sizer)
        Event.stopObserving(this.sizer, "mousedown", this.eventMouseDown);

    if (this.options.url) 
      this.content.src = null

     if(this.iefix) 
      Element.remove(this.iefix);

    Element.remove(this.element);
    Windows.unregister(this);      
  },
    
  // Sets close callback, if it sets, it should return true to be able to close the window.
  setCloseCallback: function(callback) {
    this.options.closeCallback = callback;
  },
  
  // Gets window content
  getContent: function () {
    return this.content;
  },
  
  // Sets the content with an element id
  setContent: function(id, autoresize, autoposition) {
    var element = $(id);
    if (null == element) throw "Unable to find element '" + id + "' in DOM";
    this._oldParent = element.parentNode;

    var d = null;
    var p = null;

    if (autoresize) 
      d = Element.getDimensions(element);
    if (autoposition) 
      p = Position.cumulativeOffset(element);

    var content = this.getContent();
    // Clear HTML (and even iframe)
    this.setHTMLContent("");
    content = this.getContent();
    
    content.appendChild(element);
    element.show();
    if (autoresize) 
      this.setSize(d.width, d.height);
    if (autoposition) 
      this.setLocation(p[1] - this.heightN, p[0] - this.widthW);    
  },
  
  setHTMLContent: function(html) {
    // It was an url (iframe), recreate a div content instead of iframe content
    if (this.options.url) {
      this.content.src = null;
      this.options.url = null;
      
  	  var content ="<div id=\"" + this.getId() + "_content\" class=\"" + this.options.className + "_content\"> </div>";
      $(this.getId() +"_table_content").innerHTML = content;
      
      this.content = $(this.element.id + "_content");
    }
      
    this.getContent().innerHTML = html;
  },
  
  setAjaxContent: function(url, options, showCentered, showModal) {
    this.showFunction = showCentered ? "showCenter" : "show";
    this.showModal = showModal || false;
  
    options = options || {};

    // Clear HTML (and even iframe)
    this.setHTMLContent("");
 
    this.onComplete = options.onComplete;
    if (! this._onCompleteHandler)
      this._onCompleteHandler = this._setAjaxContent.bind(this);
    options.onComplete = this._onCompleteHandler;

    new Ajax.Request(url, options);    
    options.onComplete = this.onComplete;
  },
  
  _setAjaxContent: function(originalRequest) {
    Element.update(this.getContent(), originalRequest.responseText);
    if (this.onComplete)
      this.onComplete(originalRequest);
    this.onComplete = null;
    this[this.showFunction](this.showModal)
  },
  
  setURL: function(url) {
    // Not an url content, change div to iframe
    if (this.options.url) 
      this.content.src = null;
    this.options.url = url;
    var content= "<iframe frameborder='0' name='" + this.getId() + "_content'  id='" + this.getId() + "_content' src='" + url + "' width='" + this.width + "' height='" + this.height + "'> </iframe>";
    $(this.getId() +"_table_content").innerHTML = content;
    
    this.content = $(this.element.id + "_content");
  },

  getURL: function() {
  	return this.options.url ? this.options.url : null;
  },

  refresh: function() {
    if (this.options.url)
	    $(this.element.getAttribute('id') + '_content').src = this.options.url;
  },
  
  // Stores position/size in a cookie, by default named with window id
  setCookie: function(name, expires, path, domain, secure) {
    name = name || this.element.id;
    this.cookie = [name, expires, path, domain, secure];
    
    // Get cookie
    var value = WindowUtilities.getCookie(name)
    // If exists
    if (value) {
      var values = value.split(',');
      var x = values[0].split(':');
      var y = values[1].split(':');

      var w = parseFloat(values[2]), h = parseFloat(values[3]);
      var mini = values[4];
      var maxi = values[5];

      this.setSize(w, h);
      if (mini == "true")
        this.doMinimize = true; // Minimize will be done at onload window event
      else if (maxi == "true")
        this.doMaximize = true; // Maximize will be done at onload window event

      this.useLeft = x[0] == "l";
      this.useTop = y[0] == "t";

      this.element.setStyle(this.useLeft ? {left: x[1]} : {right: x[1]});
      this.element.setStyle(this.useTop ? {top: y[1]} : {bottom: y[1]});
    }
  },
  
  // Gets window ID
  getId: function() {
    return this.element.id;
  },
  
  // Detroys itself when closing 
  setDestroyOnClose: function() {
    this.options.destroyOnClose = true;
  },
  
  setConstraint: function(bool, padding) {
    this.constraint = bool;
    this.constraintPad = Object.extend(this.constraintPad, padding || {});
    // Reset location to apply constraint
    if (this.useTop && this.useLeft)
      this.setLocation(parseFloat(this.element.style.top), parseFloat(this.element.style.left));
  },
  
  // initDrag event

  _initDrag: function(event) {
    // No resize on minimized window
    if (Event.element(event) == this.sizer && this.isMinimized())
      return;

    // No move on maximzed window
    if (Event.element(event) != this.sizer && this.isMaximized())
      return;
      
    if (window.ie && this.heightN == 0)
      this._getWindowBorderSize();
    
    // Get pointer X,Y
    this.pointer = [this._round(Event.pointerX(event), this.options.gridX), this._round(Event.pointerY(event), this.options.gridY)];
    if (this.options.wiredDrag) 
      this.currentDrag = this._createWiredElement();
    else
      this.currentDrag = this.element;
      
    // Resize
    if (Event.element(event) == this.sizer) {
      this.doResize = true;
      this.widthOrg = this.width;
      this.heightOrg = this.height;
      this.bottomOrg = parseFloat(this.element.getStyle('bottom'));
      this.rightOrg = parseFloat(this.element.getStyle('right'));
      this._notify("onStartResize");
    }
    else {
      this.doResize = false;

      // Check if click on close button, 
      var closeButton = $(this.getId() + '_close');
      if (closeButton && Position.within(closeButton, this.pointer[0], this.pointer[1])) {
        this.currentDrag = null;
        return;
      }

      this.toFront();

      if (! this.options.draggable) 
        return;
      this._notify("onStartMove");
    }    
    // Register global event to capture mouseUp and mouseMove
    Event.observe(document, "mouseup", this.eventMouseUp, false);
    Event.observe(document, "mousemove", this.eventMouseMove, false);
    
    // Add an invisible div to keep catching mouse event over iframes
    WindowUtilities.disableScreen('__invisible__', '__invisible__', this.overlayOpacity);

    // Stop selection while dragging
    document.body.ondrag = function () { return false; };
    document.body.onselectstart = function () { return false; };
    
    this.currentDrag.show();
    Event.stop(event);
  },
  
  _round: function(val, round) {
    return round == 1 ? val  : val = Math.floor(val / round) * round;
  },

  // updateDrag event
  _updateDrag: function(event) {
    var pointer =  [this._round(Event.pointerX(event), this.options.gridX), this._round(Event.pointerY(event), this.options.gridY)];  
    var dx = pointer[0] - this.pointer[0];
    var dy = pointer[1] - this.pointer[1];
    
    // Resize case, update width/height
    if (this.doResize) {
      var w = this.widthOrg + dx;
      var h = this.heightOrg + dy;
      
      dx = this.width - this.widthOrg
      dy = this.height - this.heightOrg
      
      // Check if it's a right position, update it to keep upper-left corner at the same position
      if (this.useLeft) 
        w = this._updateWidthConstraint(w)
      else 
        this.currentDrag.setStyle({right: (this.rightOrg -dx) + 'px'});
      // Check if it's a bottom position, update it to keep upper-left corner at the same position
      if (this.useTop) 
        h = this._updateHeightConstraint(h)
      else
        this.currentDrag.setStyle({bottom: (this.bottomOrg -dy) + 'px'});
        
      this.setSize(w , h);
      this._notify("onResize");
    }
    // Move case, update top/left
    else {
      this.pointer = pointer;
      
      if (this.useLeft) {
        var left =  parseFloat(this.currentDrag.getStyle('left')) + dx;
        var newLeft = this._updateLeftConstraint(left);
        // Keep mouse pointer correct
        this.pointer[0] += newLeft-left;
        this.currentDrag.setStyle({left: newLeft + 'px'});
      }
      else 
        this.currentDrag.setStyle({right: parseFloat(this.currentDrag.getStyle('right')) - dx + 'px'});
      
      if (this.useTop) {
        var top =  parseFloat(this.currentDrag.getStyle('top')) + dy;
        var newTop = this._updateTopConstraint(top);
        // Keep mouse pointer correct
        this.pointer[1] += newTop - top;
        this.currentDrag.setStyle({top: newTop + 'px'});
      }
      else 
        this.currentDrag.setStyle({bottom: parseFloat(this.currentDrag.getStyle('bottom')) - dy + 'px'});

      this._notify("onMove");
    }
    if (this.iefix) 
      this._fixIEOverlapping(); 
      
    this._removeStoreLocation();
    Event.stop(event);
  },

   // endDrag callback
   _endDrag: function(event) {
    // Remove temporary div over iframes
     WindowUtilities.enableScreen('__invisible__');
    
    if (this.doResize)
      this._notify("onEndResize");
    else
      this._notify("onEndMove");
    
    // Release event observing
    Event.stopObserving(document, "mouseup", this.eventMouseUp,false);
    Event.stopObserving(document, "mousemove", this.eventMouseMove, false);

    Event.stop(event);
    
    this._hideWiredElement();

    // Store new location/size if need be
    this._saveCookie()
      
    // Restore selection
    document.body.ondrag = null;
    document.body.onselectstart = null;
  },

  _updateLeftConstraint: function(left) {
    if (this.constraint && this.useLeft && this.useTop) {
      var width = this.options.parent == document.body ? WindowUtilities.getPageSize().windowWidth : this.options.parent.getDimensions().width;

      if (left < this.constraintPad.left)
        left = this.constraintPad.left;
      if (left + this.width + this.widthE + this.widthW > width - this.constraintPad.right) 
        left = width - this.constraintPad.right - this.width - this.widthE - this.widthW;
    }
    return left;
  },
  
  _updateTopConstraint: function(top) {
    if (this.constraint && this.useLeft && this.useTop) {        
      var height = this.options.parent == document.body ? WindowUtilities.getPageSize().windowHeight : this.options.parent.getDimensions().height;
      
      var h = this.height + this.heightN + this.heightS;

      if (top < this.constraintPad.top)
        top = this.constraintPad.top;
      if (top + h > height - this.constraintPad.bottom) 
        top = height - this.constraintPad.bottom - h;
    }
    return top;
  },
  
  _updateWidthConstraint: function(w) {
    if (this.constraint && this.useLeft && this.useTop) {
      var width = this.options.parent == document.body ? WindowUtilities.getPageSize().windowWidth : this.options.parent.getDimensions().width;
      var left =  parseFloat(this.element.getStyle("left"));

      if (left + w + this.widthE + this.widthW > width - this.constraintPad.right) 
        w = width - this.constraintPad.right - left - this.widthE - this.widthW;
    }
    return w;
  },
  
  _updateHeightConstraint: function(h) {
    if (this.constraint && this.useLeft && this.useTop) {
      var height = this.options.parent == document.body ? WindowUtilities.getPageSize().windowHeight : this.options.parent.getDimensions().height;
      var top =  parseFloat(this.element.getStyle("top"));

      if (top + h + this.heightN + this.heightS > height - this.constraintPad.bottom) 
        h = height - this.constraintPad.bottom - top - this.heightN - this.heightS;
    }
    return h;
  },
  
  
  // Creates HTML window code
  _createWindow: function(id) {
    var className = this.options.className;
    var win = document.createElement("div");
    win.setAttribute('id', id);
    win.className = "dialog";

    var content;
    if (this.options.url)
      content= "<iframe frameborder=\"0\" name=\"" + id + "_content\"  id=\"" + id + "_content\" src=\"" + this.options.url + "\"> </iframe>";
    else
      content ="<div id=\"" + id + "_content\" class=\"" +className + "_content\"> </div>";

    var closeDiv = this.options.closable ? "<div class='"+ className +"_close' id='"+ id +"_close' onclick='Windows.close(\""+ id +"\", event)'> </div>" : "";
    var minDiv = this.options.minimizable ? "<div class='"+ className + "_minimize' id='"+ id +"_minimize' onclick='Windows.minimize(\""+ id +"\", event)'> </div>" : "";
    var maxDiv = this.options.maximizable ? "<div class='"+ className + "_maximize' id='"+ id +"_maximize' onclick='Windows.maximize(\""+ id +"\", event)'> </div>" : "";
    var seAttributes = this.options.resizable ? "class='" + className + "_sizer' id='" + id + "_sizer'" : "class='"  + className + "_se'";
    var blank = "../themes/default/blank.gif";
    
    win.innerHTML = closeDiv + minDiv + maxDiv + "\
      <table id='"+ id +"_row1' class=\"top table_window\">\
        <tr>\
          <td class='"+ className +"_nw'></td>\
          <td class='"+ className +"_n'><div id='"+ id +"_top' class='"+ className +"_title title_window'>"+ this.options.title +"</div></td>\
          <td class='"+ className +"_ne'></td>\
        </tr>\
      </table>\
      <table id='"+ id +"_row2' class=\"mid table_window\">\
        <tr>\
          <td class='"+ className +"_w'></td>\
            <td id='"+ id +"_table_content' class='"+ className +"_content' valign='top'>" + content + "</td>\
          <td class='"+ className +"_e'></td>\
        </tr>\
      </table>\
        <table id='"+ id +"_row3' class=\"bot table_window\">\
        <tr>\
          <td class='"+ className +"_sw'></td>\
            <td class='"+ className +"_s'><div id='"+ id +"_bottom' class='status_bar'><span style='float:left; width:1px; height:1px'></span></div></td>\
            <td " + seAttributes + "></td>\
        </tr>\
      </table>\
    ";
    Element.hide(win);
    this.options.parent.insertBefore(win, this.options.parent.firstChild);
    Event.observe($(id + "_content"), "load", this.options.onload);
    return win;
  },
  
  
  changeClassName: function(newClassName) {
    var className = this.options.className;
    var id = this.getId();
    var win = this;
    $A(["_close","_minimize","_maximize","_sizer", "_content"]).each(function(value) { win._toggleClassName($(id + value), className + value, newClassName + value) });
    $$("#" + id + " td").each(function(td) {td.className = td.className.sub(className,newClassName) });
    this.options.className = newClassName;
  },
  
  _toggleClassName: function(element, oldClassName, newClassName) {
    if (element) {
      element.removeClassName(oldClassName);
      element.addClassName(newClassName);
    }
  },
  
  // Sets window location
  setLocation: function(top, left) {
    top = this._updateTopConstraint(top);
    left = this._updateLeftConstraint(left);

    var e = this.currentDrag || this.element;
    e.setStyle({top: top + 'px'});
    e.setStyle({left: left + 'px'});

    this.useLeft = true;
    this.useTop = true;
  },
    
  getLocation: function() {
    var location = {};
    if (this.useTop)
      location = Object.extend(location, {top: this.element.getStyle("top")});
    else
      location = Object.extend(location, {bottom: this.element.getStyle("bottom")});
    if (this.useLeft)
      location = Object.extend(location, {left: this.element.getStyle("left")});
    else
      location = Object.extend(location, {right: this.element.getStyle("right")});
    
    return location;
  },
  
  // Gets window size
  getSize: function() {
    return {width: this.width, height: this.height};
  },
    
  // Sets window size
  setSize: function(width, height, useEffect) {    
    width = parseFloat(width);
    height = parseFloat(height);
    
    // Check min and max size
    if (!this.minimized && width < this.options.minWidth)
      width = this.options.minWidth;

    if (!this.minimized && height < this.options.minHeight)
      height = this.options.minHeight;
      
    if (this.options. maxHeight && height > this.options. maxHeight)
      height = this.options. maxHeight;

    if (this.options. maxWidth && width > this.options. maxWidth)
      width = this.options. maxWidth;

    
    if (this.useTop && this.useLeft && Window.hasEffectLib && Effect.ResizeWindow && useEffect) {
      new Effect.ResizeWindow(this, null, null, width, height, {duration: Window.resizeEffectDuration});
    } else {
      this.width = width;
      this.height = height;
      var e = this.currentDrag ? this.currentDrag : this.element;

      e.setStyle({width: width + this.widthW + this.widthE + "px"})
      e.setStyle({height: height  + this.heightN + this.heightS + "px"})

      // Update content size
      if (!this.currentDrag || this.currentDrag == this.element) {
        var content = $(this.element.id + '_content');
        content.setStyle({height: height  + 'px'});
        content.setStyle({width: width  + 'px'});
      }
    }
  },
  
  updateHeight: function() {
    this.setSize(this.width, this.content.scrollHeight, true);
  },
  
  updateWidth: function() {
    this.setSize(this.content.scrollWidth, this.height, true);
  },
  
  // Brings window to front
  toFront: function() {
    if (this.element.style.zIndex < Windows.maxZIndex)  
      this.setZIndex(Windows.maxZIndex + 1);
    this._notify("onFocus");
    if (this.iefix) 
      this._fixIEOverlapping(); 
  },
  
  // Displays window modal state or not
  show: function(modal) {
    if (modal) {
      // Hack for Safar!!
      if (typeof this.overlayOpacity == "undefined") {
        var that= this;
        setTimeout(function() {that.show(modal)}, 10);
        return;
      }
      Windows.addModalWindow(this);
      
      this.modal = true;      
      this.setZIndex(Windows.maxZIndex + 1);
      Windows.unsetOverflow(this);
    }
    else
      if (!this.element.style.zIndex) 
        this.setZIndex(Windows.maxZIndex++ + 1);        
      
    // To restore overflow if need be
    if (this.oldStyle)
      this.getContent().setStyle({overflow: this.oldStyle});
      
    if (! this.width || !this.height) {
      var size = WindowUtilities._computeSize(this.content.innerHTML, this.content.id, this.width, this.height, 0, this.options.className)
      if (this.height)
        this.width = size + 5
      else
        this.height = size + 5
    }

    this.setSize(this.width, this.height);
    if (this.centered)
      this._center(this.centerTop, this.centerLeft);    
    
    this._notify("onBeforeShow");   
    if (this.options.showEffect != Element.show && this.options.showEffectOptions)
      this.options.showEffect(this.element, this.options.showEffectOptions);  
    else
      this.options.showEffect(this.element);  
      
    this._checkIEOverlapping();
    this.visible = true;
    WindowUtilities.focusedWindow = this
    this._notify("onShow");   
  },
  
  // Displays window modal state or not at the center of the page
  showCenter: function(modal, top, left) {
    this.centered = true;
    this.centerTop = top;
    this.centerLeft = left;

    this.show(modal);
  },
  
  isVisible: function() {
    return this.visible;
  },
  
  _center: function(top, left) {
    var windowScroll = WindowUtilities.getWindowScroll();    
    var pageSize = WindowUtilities.getPageSize();    

    if (typeof top == "undefined")
      top = (pageSize.windowHeight - (this.height + this.heightN + this.heightS))/2;
    top += windowScroll.top
    
    if (typeof left == "undefined")
      left = (pageSize.windowWidth - (this.width + this.widthW + this.widthE))/2;
    left += windowScroll.left 
    
    this.setLocation(top, left);
    this.toFront();
  },
  
  _recenter: function(event) {
    if (this.centered) {
      var pageSize = WindowUtilities.getPageSize();

      // Check for this stupid IE that sends dumb events
      if (this.pageSize && this.pageSize.windowWidth == pageSize.windowWidth && this.pageSize.windowHeight == pageSize.windowHeight) 
        return;
      this.pageSize = pageSize;

      // set height of Overlay to take up whole page and show
      if ($('overlay_modal')) 
        $('overlay_modal').setStyle({height: (pageSize.pageHeight + 'px')});
      
      if (this.options.recenterAuto)
        this._center(this.centerTop, this.centerLeft);    
    }
  },
  
  // Hides window
  hide: function() {
    this.visible = false;
    if (this.modal) {
      Windows.removeModalWindow(this);
      Windows.resetOverflow();
    }
    // To avoid bug on scrolling bar
    this.oldStyle = this.getContent().getStyle('overflow') || "auto"
    this.getContent().setStyle({overflow: "hidden"});

    this.options.hideEffect(this.element, this.options.hideEffectOptions);  

     if(this.iefix) 
      this.iefix.hide();

    if (!this.doNotNotifyHide)
      this._notify("onHide");
  },

  close: function() {
    // Asks closeCallback if exists
    if (this.visible) {
      if (this.options.closeCallback && ! this.options.closeCallback(this)) 
        return;

      if (this.options.destroyOnClose) {
        var destroyFunc = this.destroy.bind(this);
        if (this.options.hideEffectOptions.afterFinish) {
          var func = this.options.hideEffectOptions.afterFinish;
          this.options.hideEffectOptions.afterFinish = function() {func();destroyFunc() }
        }
        else 
          this.options.hideEffectOptions.afterFinish = function() {destroyFunc() }
      }
      Windows.updateFocusedWindow();
      
      this.doNotNotifyHide = true;
      this.hide();
      this.doNotNotifyHide = false;
      this._notify("onClose");
    }
  },
  
  minimize: function() {
    if (this.resizing)
      return;
    
    var r2 = $(this.getId() + "_row2");
    
    if (!this.minimized) {
      this.minimized = true;

      var dh = r2.getDimensions().height;
      this.r2Height = dh;
      var h  = this.element.getHeight() - dh;

      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
        new Effect.ResizeWindow(this, null, null, null, this.height -dh, {duration: Window.resizeEffectDuration});
      } else  {
        this.height -= dh;
        this.element.setStyle({height: h + "px"});
        r2.hide();
      }

      if (! this.useTop) {
        var bottom = parseFloat(this.element.getStyle('bottom'));
        this.element.setStyle({bottom: (bottom + dh) + 'px'});
      }
    } 
    else {      
      this.minimized = false;
      
      var dh = this.r2Height;
      this.r2Height = null;
      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
        new Effect.ResizeWindow(this, null, null, null, this.height + dh, {duration: Window.resizeEffectDuration});
      }
      else {
        var h  = this.element.getHeight() + dh;
        this.height += dh;
        this.element.setStyle({height: h + "px"})
        r2.show();
      }
      if (! this.useTop) {
        var bottom = parseFloat(this.element.getStyle('bottom'));
        this.element.setStyle({bottom: (bottom - dh) + 'px'});
      }
      this.toFront();
    }
    this._notify("onMinimize");
    
    // Store new location/size if need be
    this._saveCookie()
  },
  
  maximize: function() {
    if (this.isMinimized() || this.resizing)
      return;
  
    if (window.ie && this.heightN == 0)
      this._getWindowBorderSize();
      
    if (this.storedLocation != null) {
      this._restoreLocation();
      if(this.iefix) 
        this.iefix.hide();
    }
    else {
      this._storeLocation();
      Windows.unsetOverflow(this);
      
      var windowScroll = WindowUtilities.getWindowScroll();
      var pageSize = WindowUtilities.getPageSize();    
      var left = windowScroll.left;
      var top = windowScroll.top;
      
      if (this.options.parent != document.body) {
        windowScroll =  {top:0, left:0, bottom:0, right:0};
        var dim = this.options.parent.getDimensions();
        pageSize.windowWidth = dim.width;
        pageSize.windowHeight = dim.height;
        top = 0; 
        left = 0;
      }
      
      if (this.constraint) {
        pageSize.windowWidth -= Math.max(0, this.constraintPad.left) + Math.max(0, this.constraintPad.right);
        pageSize.windowHeight -= Math.max(0, this.constraintPad.top) + Math.max(0, this.constraintPad.bottom);
        left +=  Math.max(0, this.constraintPad.left);
        top +=  Math.max(0, this.constraintPad.top);
      }
      
      var width = pageSize.windowWidth - this.widthW - this.widthE;
      var height= pageSize.windowHeight - this.heightN - this.heightS;

      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow) {
        new Effect.ResizeWindow(this, top, left, width, height, {duration: Window.resizeEffectDuration});
      }
      else {
        this.setSize(width, height);
        this.element.setStyle(this.useLeft ? {left: left} : {right: left});
        this.element.setStyle(this.useTop ? {top: top} : {bottom: top});
      }
        
      this.toFront();
      if (this.iefix) 
        this._fixIEOverlapping(); 
    }
    this._notify("onMaximize");

    // Store new location/size if need be
    this._saveCookie()
  },
  
  isMinimized: function() {
    return this.minimized;
  },
  
  isMaximized: function() {
    return (this.storedLocation != null);
  },
  
  setOpacity: function(opacity) {
    if (Element.setOpacity)
      Element.setOpacity(this.element, opacity);
  },
  
  setZIndex: function(zindex) {
    this.element.setStyle({zIndex: zindex});
    Windows.updateZindex(zindex, this);
  },

  setTitle: function(newTitle) {
    if (!newTitle || newTitle == "") 
      newTitle = "&nbsp;";
      
    Element.update(this.element.id + '_top', newTitle);
  },

  setStatusBar: function(element) {
    var statusBar = $(this.getId() + "_bottom");

    if (typeof(element) == "object") {
      if (this.bottombar.firstChild)
        this.bottombar.replaceChild(element, this.bottombar.firstChild);
      else
        this.bottombar.appendChild(element);
    }
    else
      this.bottombar.innerHTML = element;
  },

  _checkIEOverlapping: function() {
    if(!this.iefix && (navigator.appVersion.indexOf('MSIE')>0) && (navigator.userAgent.indexOf('Opera')<0) && (this.element.getStyle('position')=='absolute')) {
        new Insertion.After(this.element.id, '<iframe id="' + this.element.id + '_iefix" '+ 'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' + 'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
        this.iefix = $(this.element.id+'_iefix');
    }
    if(this.iefix) 
      setTimeout(this._fixIEOverlapping.bind(this), 50);
  },

  _fixIEOverlapping: function() {
      Position.clone(this.element, this.iefix);
      this.iefix.style.zIndex = this.element.style.zIndex - 1;
      this.iefix.show();
  },
  
  _getWindowBorderSize: function(event) {
    // Hack to get real window border size!!
    var div = this._createHiddenDiv(this.options.className + "_n")
    this.heightN = Element.getDimensions(div).height;    
    div.parentNode.removeChild(div)

    var div = this._createHiddenDiv(this.options.className + "_s")
    this.heightS = Element.getDimensions(div).height;    
    div.parentNode.removeChild(div)

    var div = this._createHiddenDiv(this.options.className + "_e")
    this.widthE = Element.getDimensions(div).width;    
    div.parentNode.removeChild(div)

    var div = this._createHiddenDiv(this.options.className + "_w")
    this.widthW = Element.getDimensions(div).width;
    div.parentNode.removeChild(div);
    
    var div = document.createElement("div");
    div.className = "overlay_" + this.options.className ;
    document.body.appendChild(div);
    //alert("no timeout:\nopacity: " + div.getStyle("opacity") + "\nwidth: " + document.defaultView.getComputedStyle(div, null).width);
    var that = this;
    
    // Workaround for Safari!!
    setTimeout(function() {that.overlayOpacity = ($(div).getStyle("opacity")); div.parentNode.removeChild(div);}, 10);
    
    // Workaround for IE!!
    if (window.ie) {
      this.heightS = $(this.getId() +"_row3").getDimensions().height;
      this.heightN = $(this.getId() +"_row1").getDimensions().height;
    }

    // Safari size fix
    if (window.khtml && !window.webkit)
      this.setSize(this.width, this.height);
    if (this.doMaximize)
      this.maximize();
    if (this.doMinimize)
      this.minimize();
  },
 
  _createHiddenDiv: function(className) {
    var objBody = document.body;
    var win = document.createElement("div");
    win.setAttribute('id', this.element.id+ "_tmp");
    win.className = className;
    win.style.display = 'none';
    win.innerHTML = '';
    objBody.insertBefore(win, objBody.firstChild);
    return win;
  },
  
  _storeLocation: function() {
    if (this.storedLocation == null) {
      this.storedLocation = {useTop: this.useTop, useLeft: this.useLeft, 
                             top: this.element.getStyle('top'), bottom: this.element.getStyle('bottom'),
                             left: this.element.getStyle('left'), right: this.element.getStyle('right'),
                             width: this.width, height: this.height };
    }
  },
  
  _restoreLocation: function() {
    if (this.storedLocation != null) {
      this.useLeft = this.storedLocation.useLeft;
      this.useTop = this.storedLocation.useTop;
      
      if (this.useLeft && this.useTop && Window.hasEffectLib && Effect.ResizeWindow)
        new Effect.ResizeWindow(this, this.storedLocation.top, this.storedLocation.left, this.storedLocation.width, this.storedLocation.height, {duration: Window.resizeEffectDuration});
      else {
        this.element.setStyle(this.useLeft ? {left: this.storedLocation.left} : {right: this.storedLocation.right});
        this.element.setStyle(this.useTop ? {top: this.storedLocation.top} : {bottom: this.storedLocation.bottom});
        this.setSize(this.storedLocation.width, this.storedLocation.height);
      }
      
      Windows.resetOverflow();
      this._removeStoreLocation();
    }
  },
  
  _removeStoreLocation: function() {
    this.storedLocation = null;
  },
  
  _saveCookie: function() {
    if (this.cookie) {
      var value = "";
      if (this.useLeft)
        value += "l:" +  (this.storedLocation ? this.storedLocation.left : this.element.getStyle('left'))
      else
        value += "r:" + (this.storedLocation ? this.storedLocation.right : this.element.getStyle('right'))
      if (this.useTop)
        value += ",t:" + (this.storedLocation ? this.storedLocation.top : this.element.getStyle('top'))
      else
        value += ",b:" + (this.storedLocation ? this.storedLocation.bottom :this.element.getStyle('bottom'))
        
      value += "," + (this.storedLocation ? this.storedLocation.width : this.width);
      value += "," + (this.storedLocation ? this.storedLocation.height : this.height);
      value += "," + this.isMinimized();
      value += "," + this.isMaximized();
      WindowUtilities.setCookie(value, this.cookie)
    }
  },
  
  _createWiredElement: function() {
    if (! this.wiredElement) {
      if (window.ie)
        this._getWindowBorderSize();
      var div = document.createElement("div");
      div.className = "wired_frame " + this.options.className + "_wired_frame";
      
      div.style.position = 'absolute';
      this.options.parent.insertBefore(div, this.options.parent.firstChild);
      this.wiredElement = $(div);
    }
    if (this.useLeft) 
      this.wiredElement.setStyle({left: this.element.getStyle('left')});
    else 
      this.wiredElement.setStyle({right: this.element.getStyle('right')});
      
    if (this.useTop) 
      this.wiredElement.setStyle({top: this.element.getStyle('top')});
    else 
      this.wiredElement.setStyle({bottom: this.element.getStyle('bottom')});

    var dim = this.element.getDimensions();
    this.wiredElement.setStyle({width: dim.width + "px", height: dim.height +"px"});

    this.wiredElement.setStyle({zIndex: Windows.maxZIndex+30});
    return this.wiredElement;
  },
  
  _hideWiredElement: function() {
    if (! this.wiredElement || ! this.currentDrag)
      return;
    if (this.currentDrag == this.element) 
      this.currentDrag = null;
    else {
      if (this.useLeft) 
        this.element.setStyle({left: this.currentDrag.getStyle('left')});
      else 
        this.element.setStyle({right: this.currentDrag.getStyle('right')});

      if (this.useTop) 
        this.element.setStyle({top: this.currentDrag.getStyle('top')});
      else 
        this.element.setStyle({bottom: this.currentDrag.getStyle('bottom')});

      this.currentDrag.hide();
      this.currentDrag = null;
      if (this.doResize)
        this.setSize(this.width, this.height);
    } 
  },
  
  _notify: function(eventName) {
    if (this.options[eventName])
      this.options[eventName](this);
    else
      Windows.notify(eventName, this);
  }
};

// Windows containers, register all page windows
var Windows = {
  windows: [],
  modalWindows: [],
  observers: [],
  focusedWindow: null,
  maxZIndex: 0,
  overlayShowEffectOptions: {duration: 0.5},
  overlayHideEffectOptions: {duration: 0.5},

  addObserver: function(observer) {
    this.removeObserver(observer);
    this.observers.push(observer);
  },
  
  removeObserver: function(observer) {  
    this.observers = this.observers.reject( function(o) { return o==observer });
  },
  
  //  onDestroy onStartResize onStartMove onResize onMove onEndResize onEndMove onFocus onBeforeShow onShow onHide onMinimize onMaximize onClose
  notify: function(eventName, win) {  
    this.observers.each( function(o) {if(o[eventName]) o[eventName](eventName, win);});
  },

  // Gets window from its id
  getWindow: function(id) {
    return this.windows.detect(function(d) { return d.getId() ==id });
  },

  // Gets the last focused window
  getFocusedWindow: function() {
    return this.focusedWindow;
  },

  updateFocusedWindow: function() {
    this.focusedWindow = this.windows.length >=2 ? this.windows[this.windows.length-2] : null;    
  },
  
  // Registers a new window (called by Windows constructor)
  register: function(win) {
    this.windows.push(win);
  },
    
  // Add a modal window in the stack
  addModalWindow: function(win) {
    // Disable screen if first modal window
    if (this.modalWindows.length == 0)
      WindowUtilities.disableScreen(win.options.className, 'overlay_modal', win.overlayOpacity, win.getId());
    else {
      // Move overlay over all windows
      if (Window.keepMultiModalWindow) {
        $('overlay_modal').style.zIndex = Windows.maxZIndex + 1;
        Windows.maxZIndex += 1;
        WindowUtilities._hideSelect(this.modalWindows.last().getId());
      }
      // Hide current modal window
      else
        this.modalWindows.last().element.hide();
      // Fucking IE select issue
      WindowUtilities._showSelect(win.getId());
    }      
    this.modalWindows.push(win);    
  },
  
  removeModalWindow: function(win) {
    this.modalWindows.pop();
    
    // No more modal windows
    if (this.modalWindows.length == 0)
      WindowUtilities.enableScreen();     
    else {
      if (Window.keepMultiModalWindow) {
        this.modalWindows.last().toFront();
        WindowUtilities._showSelect(this.modalWindows.last().getId());        
      }
      else
        this.modalWindows.last().element.show();
    }
  },
  
  // Registers a new window (called by Windows constructor)
  register: function(win) {
    this.windows.push(win);
  },
  
  // Unregisters a window (called by Windows destructor)
  unregister: function(win) {
    this.windows = this.windows.reject(function(d) { return d==win });
  }, 
  
  // Closes all windows
  closeAll: function() {  
    this.windows.each( function(w) {Windows.close(w.getId())} );
  },
  
  closeAllModalWindows: function() {
    WindowUtilities.enableScreen();     
    this.modalWindows.each( function(win) {if (win) win.close()});    
  },

  // Minimizes a window with its id
  minimize: function(id, event) {
    var win = this.getWindow(id)
    if (win && win.visible)
      win.minimize();
    Event.stop(event);
  },
  
  // Maximizes a window with its id
  maximize: function(id, event) {
    var win = this.getWindow(id)
    if (win && win.visible)
      win.maximize();
    Event.stop(event);
  },

  // Closes a window with its id
  close: function(id, event) {
    var win = this.getWindow(id);
    if (win) 
      win.close();
    if (event)
      Event.stop(event);
  },
  
  unsetOverflow: function(except) {    
    this.windows.each(function(d) { d.oldOverflow = d.getContent().getStyle("overflow") || "auto" ; d.getContent().setStyle({overflow: "hidden"}) });
    if (except && except.oldOverflow)
      except.getContent().setStyle({overflow: except.oldOverflow});
  },

  resetOverflow: function() {
    this.windows.each(function(d) { if (d.oldOverflow) d.getContent().setStyle({overflow: d.oldOverflow}) });
  },

  updateZindex: function(zindex, win) {
    if (zindex > this.maxZIndex)
      this.maxZIndex = zindex;
    this.focusedWindow = win;
  }
};

var Dialog = {
  dialogId: null,
  onCompleteFunc: null,
  callFunc: null, 
  parameters: null, 
    
  confirm: function(content, parameters) {
    // Get Ajax return before
    if (content && typeof content != "string") {
      Dialog._runAjaxRequest(content, parameters, Dialog.confirm);
      return 
    }
    content = content || "";
    
    parameters = parameters || {};
    var okLabel = parameters.okLabel ? parameters.okLabel : "Ok";
    var cancelLabel = parameters.cancelLabel ? parameters.cancelLabel : "Cancel";

    // Backward compatibility
    parameters = Object.extend(parameters, parameters.windowParameters || {});
    parameters.windowParameters = parameters.windowParameters || {};

    parameters.className = parameters.className || "alert";

    var okButtonClass = "class ='" + (parameters.buttonClass ? parameters.buttonClass + " " : "") + " ok_button'" 
    var cancelButtonClass = "class ='" + (parameters.buttonClass ? parameters.buttonClass + " " : "") + " cancel_button'" 
    var content = "\
      <div class='" + parameters.className + "_message'>" + content  + "</div>\
        <div class='" + parameters.className + "_buttons'>\
          <input type='button' value='" + okLabel + "' onclick='Dialog.okCallback()' " + okButtonClass + "/>\
          <input type='button' value='" + cancelLabel + "' onclick='Dialog.cancelCallback()' " + cancelButtonClass + "/>\
        </div>\
    ";
    return this._openDialog(content, parameters)
  },
  
  alert: function(content, parameters) {
    // Get Ajax return before
    if (content && typeof content != "string") {
      Dialog._runAjaxRequest(content, parameters, Dialog.alert);
      return 
    }
    content = content || "";
    
    parameters = parameters || {};
    var okLabel = parameters.okLabel ? parameters.okLabel : "Ok";

    // Backward compatibility    
    parameters = Object.extend(parameters, parameters.windowParameters || {});
    parameters.windowParameters = parameters.windowParameters || {};
    
    parameters.className = parameters.className || "alert";
    
    var okButtonClass = "class ='" + (parameters.buttonClass ? parameters.buttonClass + " " : "") + " ok_button'" 
    var content = "\
      <div class='" + parameters.className + "_message'>" + content  + "</div>\
        <div class='" + parameters.className + "_buttons'>\
          <input type='button' value='" + okLabel + "' onclick='Dialog.okCallback()' " + okButtonClass + "/>\
        </div>";
    return this._openDialog(content, parameters)
  },
  
  info: function(content, parameters) {   
    // Get Ajax return before
    if (content && typeof content != "string") {
      Dialog._runAjaxRequest(content, parameters, Dialog.info);
      return 
    }
    content = content || "";
     
    // Backward compatibility
    parameters = parameters || {};
    parameters = Object.extend(parameters, parameters.windowParameters || {});
    parameters.windowParameters = parameters.windowParameters || {};
    
    parameters.className = parameters.className || "alert";
    
    var content = "<div id='modal_dialog_message' class='" + parameters.className + "_message'>" + content  + "</div>";
    if (parameters.showProgress)
      content += "<div id='modal_dialog_progress' class='" + parameters.className + "_progress'>  </div>";

    parameters.ok = null;
    parameters.cancel = null;
    
    return this._openDialog(content, parameters)
  },
  
  setInfoMessage: function(message) {
    $('modal_dialog_message').update(message);
  },
  
  closeInfo: function() {
    Windows.close(this.dialogId);
  },
  
  _openDialog: function(content, parameters) {
    var className = parameters.className;
    
    if (! parameters.height && ! parameters.width) {
      parameters.width = WindowUtilities.getPageSize().pageWidth / 2;
    }
    if (parameters.id)
      this.dialogId = parameters.id;
    else { 
      var t = new Date();
      this.dialogId = 'modal_dialog_' + t.getTime();
      parameters.id = this.dialogId;
    }

    // compute height or width if need be
    if (! parameters.height || ! parameters.width) {
      var size = WindowUtilities._computeSize(content, this.dialogId, parameters.width, parameters.height, 5, className)
      if (parameters.height)
        parameters.width = size + 5
      else
        parameters.height = size + 5
    }
    parameters.resizable = parameters.resizable || false;
    parameters.effectOptions = parameters.effectOptions ;
    parameters.minimizable = false;
    parameters.maximizable = false;
    parameters.draggable = false;
    parameters.closable = false;
    
    var win = new Window(parameters);
    win.getContent().innerHTML = content;
    
    win.showCenter(true, parameters.top, parameters.left);  
    win.setDestroyOnClose();
    
    win.cancelCallback = parameters.onCancel || parameters.cancel; 
    win.okCallback = parameters.onOk || parameters.ok;
    
    return win;    
  },
  
  _getAjaxContent: function(originalRequest)  {
      Dialog.callFunc(originalRequest.responseText, Dialog.parameters)
  },
  
  _runAjaxRequest: function(message, parameters, callFunc) {
    if (message.options == null)
      message.options = {}  
    Dialog.onCompleteFunc = message.options.onComplete;
    Dialog.parameters = parameters;
    Dialog.callFunc = callFunc;
    
    message.options.onComplete = Dialog._getAjaxContent;
    new Ajax.Request(message.url, message.options);
  },
  
  okCallback: function() {
    var win = Windows.focusedWindow;
    if (!win.okCallback || win.okCallback(win)) {
      // Remove onclick on button
      $$("#" + win.getId()+" input").each(function(element) {element.onclick=null;})
      win.close();
    }
  },

  cancelCallback: function() {
    var win = Windows.focusedWindow;
    // Remove onclick on button
    $$("#" + win.getId()+" input").each(function(element) {element.onclick=null})
    win.close();
    if (win.cancelCallback)
      win.cancelCallback(win);
  }
}
/*
  Based on Lightbox JS: Fullsize Image Overlays 
  by Lokesh Dhakar - http://www.huddletogether.com

  For more information on this script, visit:
  http://huddletogether.com/projects/lightbox/

  Licensed under the Creative Commons Attribution 2.5 License - http://creativecommons.org/licenses/by/2.5/
  (basically, do anything you want, just leave my name and link)
*/

// From mootools.net
// window.ie - will be set to true if the current browser is internet explorer (any).
// window.ie6 - will be set to true if the current browser is internet explorer 6.
// window.ie7 - will be set to true if the current browser is internet explorer 7.
// window.khtml - will be set to true if the current browser is Safari/Konqueror.
// window.webkit - will be set to true if the current browser is Safari-WebKit (Safari3)
// window.gecko - will be set to true if the current browser is Mozilla/Gecko.
if (window.ActiveXObject) window.ie = window[window.XMLHttpRequest ? 'ie7' : 'ie6'] = true;
else if (document.childNodes && !document.all && !navigator.taintEnabled) window.khtml = true;
else if (document.getBoxObjectFor != null) window.gecko = true;
{
  var array = navigator.userAgent.match(new RegExp(/AppleWebKit\/([\d\.\+]*)/));
  window.webkit =  array && array.length == 2 ? parseFloat(array[1]) >= 420 : false;
}


var WindowUtilities = {  
  getWindowScroll: function() {
    var w = window;
      var T, L, W, H;
      L = window.pageXOffset || document.documentElement.scrollLeft;
      T = window.pageYOffset || document.documentElement.scrollTop;

      if (window.ie) 
        W = Math.max(document.documentElement.offsetWidth, document.documentElement.scrollWidth);
  		else if (window.khtml) 
  		  W = document.body.scrollWidth;
  		else 
  		  W = document.documentElement.scrollWidth;
  		  
  		if (window.ie) 
  		  H = Math.max(document.documentElement.offsetHeight, document.documentElement.scrollHeight);
    	else if (window.khtml) 
    	  H = document.body.scrollHeight;
    	else
    	  H = document.documentElement.scrollHeight;
    	
      return { top: T, left: L, width: W, height: H };
  }, 
  //
  // getPageSize()
  // Returns array with page width, height and window width, height
  // Core code from - quirksmode.org
  // Edit for Firefox by pHaez
  //
  getPageSize: function(){
    var xScroll, yScroll;

    if (window.innerHeight && window.scrollMaxY) {  
      xScroll = document.body.scrollWidth;
      yScroll = window.innerHeight + window.scrollMaxY;
    } else if (document.body.scrollHeight > document.body.offsetHeight){ // all but Explorer Mac
      xScroll = document.body.scrollWidth;
      yScroll = document.body.scrollHeight;
    } else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
      xScroll = document.body.offsetWidth;
      yScroll = document.body.offsetHeight;
    }

    var windowWidth, windowHeight;

    if (self.innerHeight) {  // all except Explorer
      windowWidth = self.innerWidth;
      windowHeight = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
      windowWidth = document.documentElement.clientWidth;
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
      windowWidth = document.body.clientWidth;
      windowHeight = document.body.clientHeight;
    }  
    var pageHeight, pageWidth;

    // for small pages with total height less then height of the viewport
    if(yScroll < windowHeight){
      pageHeight = windowHeight;
    } else { 
      pageHeight = yScroll;
    }

    // for small pages with total width less then width of the viewport
    if(xScroll < windowWidth){  
      pageWidth = windowWidth;
    } else {
      pageWidth = xScroll;
    }

    return {pageWidth: pageWidth ,pageHeight: pageHeight , windowWidth: windowWidth, windowHeight: windowHeight};
  },

  disableScreen: function(className, overlayId, overlayOpacity, contentId) {
    var that = this;
    WindowUtilities.initLightbox(overlayId, className, function() {that._disableScreen(className, overlayId, overlayOpacity, contentId)});
  },

  _disableScreen: function(className, overlayId, overlayOpacity, contentId) {
    var objBody = document.body;

    // prep objects
    var objOverlay = $(overlayId);

    var pageSize = WindowUtilities.getPageSize();

    // Hide select boxes as they will 'peek' through the image in IE, store old value
    if (contentId && window.ie) {
      WindowUtilities._hideSelect();
      WindowUtilities._showSelect(contentId);
    }  
  
    // set height of Overlay to take up whole page and show
    objOverlay.style.height = (pageSize.pageHeight + 'px');
    objOverlay.style.display = 'none'; 
    if (overlayId == "overlay_modal" && Window.hasEffectLib && Windows.overlayShowEffectOptions) {
      objOverlay.overlayOpacity = overlayOpacity;
      new Effect.Appear(objOverlay, Object.extend({from: 0, to: overlayOpacity}, Windows.overlayShowEffectOptions));
    }
    else
      objOverlay.style.display = "block";
  },
  
  enableScreen: function(id) {
    id = id || 'overlay_modal';
    var objOverlay =  $(id);
    if (objOverlay) {
      // hide lightbox and overlay
      if (id == "overlay_modal" && Window.hasEffectLib && Windows.overlayHideEffectOptions)
        new Effect.Fade(objOverlay, Object.extend({from: objOverlay.overlayOpacity, to:0}, Windows.overlayHideEffectOptions));
      else {
        objOverlay.style.display = 'none';
        objOverlay.parentNode.removeChild(objOverlay);
      }
      
      // make select boxes visible using old value
      if (id != "__invisible__") 
        WindowUtilities._showSelect();
    }
  },

  _hideSelect: function(id) {
    if (window.ie) {
      id = id ==  null ? "" : "#" + id + " ";
      $$(id + 'select').each(function(element) {
        if (! WindowUtilities.isDefined(element.oldVisibility)) {
          element.oldVisibility = element.style.visibility ? element.style.visibility : "visible";
          element.style.visibility = "hidden";
        }
      });
    }
  },
  
  _showSelect: function(id) {
    if (window.ie) {
      id = id ==  null ? "" : "#" + id + " ";
      $$(id + 'select').each(function(element) {
        if (WindowUtilities.isDefined(element.oldVisibility)) {
          // Why?? Ask IE
          try {
            element.style.visibility = element.oldVisibility;
          } catch(e) {
            element.style.visibility = "visible";
          }
          element.oldVisibility = null;
        }
        else {
          if (element.style.visibility)
            element.style.visibility = "visible";
        }
      });
    }
  },

  isDefined: function(object) {
    return typeof(object) != "undefined" && object != null;
  },
  
  // initLightbox()
  // Function runs on window load, going through link tags looking for rel="lightbox".
  // These links receive onclick events that enable the lightbox display for their targets.
  // The function also inserts html markup at the top of the page which will be used as a
  // container for the overlay pattern and the inline image.
  initLightbox: function(id, className, doneHandler) {
    // Already done, just update zIndex
    if ($(id)) {
      Element.setStyle(id, {zIndex: Windows.maxZIndex + 1});
      Windows.maxZIndex++;
      doneHandler();
    }
    // create overlay div and hardcode some functional styles (aesthetic styles are in CSS file)
    else {
      var objBody = document.body;
      var objOverlay = document.createElement("div");
      objOverlay.setAttribute('id', id);
      objOverlay.className = "overlay_" + className
      objOverlay.style.display = 'none';
      objOverlay.style.position = 'absolute';
      objOverlay.style.top = '0';
      objOverlay.style.left = '0';
      objOverlay.style.zIndex = Windows.maxZIndex + 1;
      Windows.maxZIndex++;
      objOverlay.style.width = '100%';
      objBody.insertBefore(objOverlay, objBody.firstChild);
      if (window.khtml && id == "overlay_modal") {
        setTimeout(function() {doneHandler()}, 10);
      }
      else
        doneHandler();
    }    
  },
  
  setCookie: function(value, parameters) {
    document.cookie= parameters[0] + "=" + escape(value) +
      ((parameters[1]) ? "; expires=" + parameters[1].toGMTString() : "") +
      ((parameters[2]) ? "; path=" + parameters[2] : "") +
      ((parameters[3]) ? "; domain=" + parameters[3] : "") +
      ((parameters[4]) ? "; secure" : "");
  },

  getCookie: function(name) {
    var dc = document.cookie;
    var prefix = name + "=";
    var begin = dc.indexOf("; " + prefix);
    if (begin == -1) {
      begin = dc.indexOf(prefix);
      if (begin != 0) return null;
    } else {
      begin += 2;
    }
    var end = document.cookie.indexOf(";", begin);
    if (end == -1) {
      end = dc.length;
    }
    return unescape(dc.substring(begin + prefix.length, end));
  },
    
  _computeSize: function(content, id, width, height, margin, className) {
    var objBody = document.body;
    var tmpObj = document.createElement("div");
    tmpObj.setAttribute('id', id);
    tmpObj.className = className + "_content";

    if (height)
      tmpObj.style.height = height + "px"
    else
      tmpObj.style.width = width + "px"
  
    tmpObj.style.position = 'absolute';
    tmpObj.style.top = '0';
    tmpObj.style.left = '0';
    tmpObj.style.display = 'none';

    tmpObj.innerHTML = content;
    objBody.insertBefore(tmpObj, objBody.firstChild);
    
    var size;
    if (height)
      size = $(id).getDimensions().width + margin;
    else
      size = $(id).getDimensions().height + margin;
    objBody.removeChild(tmpObj);
    return size;
  }  
}

Effect.ResizeWindow = Class.create();
Object.extend(Object.extend(Effect.ResizeWindow.prototype, Effect.Base.prototype), {
  initialize: function(win, top, left, width, height) {
    this.window = win;
    this.window.resizing = true;
    
    var size = win.getSize();
    this.initWidth    = parseFloat(size.width);
    this.initHeight   = parseFloat(size.height);

    var location = win.getLocation();
    this.initTop    = parseFloat(location.top);
    this.initLeft   = parseFloat(location.left);

    this.width    = width != null  ? parseFloat(width)  : this.initWidth;
    this.height   = height != null ? parseFloat(height) : this.initHeight;
    this.top      = top != null    ? parseFloat(top)    : this.initTop;
    this.left     = left != null   ? parseFloat(left)   : this.initLeft;

    this.dx     = this.left   - this.initLeft;
    this.dy     = this.top    - this.initTop;
    this.dw     = this.width  - this.initWidth;
    this.dh     = this.height - this.initHeight;
    
    this.r2      = $(this.window.getId() + "_row2");
    this.content = $(this.window.getId() + "_content");
        
    this.contentOverflow = this.content.getStyle("overflow") || "auto";
    this.content.setStyle({overflow: "hidden"});
    
    // Wired mode
    if (this.window.options.wiredDrag) {
      this.window.currentDrag = win._createWiredElement();
      this.window.currentDrag.show();
      this.window.element.hide();
    }

    this.start(arguments[5]);
  },
  
  update: function(position) {
    var width  = Math.floor(this.initWidth  + this.dw * position);
    var height = Math.floor(this.initHeight + this.dh * position);
    var top    = Math.floor(this.initTop    + this.dy * position);
    var left   = Math.floor(this.initLeft   + this.dx * position);

    if (window.ie) {
      if (Math.floor(height) == 0)  
        this.r2.hide();
      else if (Math.floor(height) >1)  
        this.r2.show();
    }      
    this.r2.setStyle({height: height});
    this.window.setSize(width, height);
    this.window.setLocation(top, left);
  },
  
  finish: function(position) {
    // Wired mode
    if (this.window.options.wiredDrag) {
      this.window._hideWiredElement();
      this.window.element.show();
    }

    this.window.setSize(this.width, this.height);
    this.window.setLocation(this.top, this.left);
    this.r2.setStyle({height: null});
    
    this.content.setStyle({overflow: this.contentOverflow});
      
    this.window.resizing = false;
  }
});

Effect.ModalSlideDown = function(element) {
  var windowScroll = WindowUtilities.getWindowScroll();    
  var height = element.getStyle("height");  
  element.setStyle({top: - (parseFloat(height) - windowScroll.top) + "px"});
  
  element.show();
  return new Effect.Move(element, Object.extend({ x: 0, y: parseFloat(height) }, arguments[1] || {}));
};


Effect.ModalSlideUp = function(element) {
  var height = element.getStyle("height");
  return new Effect.Move(element, Object.extend({ x: 0, y: -parseFloat(height) }, arguments[1] || {}));
};


function openWaiter() {
  Dialog.info($('waiter').innerHTML, {className: "waiter",  width:250, height:100, id: "wait-dlg"})
}

function updateWaiterDialog(message)
{
  $('waiter_message').innerHTML=message;
}

function closeWaiter()
{
  Windows.closeAllModalWindows();
  return true;
}
function disableCheckBoxesIn(name) {
  var table = document.getElementById(name);
  var listOfInputs = table.getElementsByTagName("input");
  var i;
  for( i = 0; i < listOfInputs.length; i++ ){
    if (listOfInputs[i].type=="checkbox"){
      listOfInputs[i].disabled=true;
    }
  }
}

function enableCheckBoxesIn(name) {
  var table = document.getElementById(name);
  var listOfInputs = table.getElementsByTagName("input");
  var i;
  for( i = 0; i < listOfInputs.length; i++ ){
    if (listOfInputs[i].type=="checkbox"){
      listOfInputs[i].disabled=false;
    }
  }
}

function isOneCheckBoxChecked(name) {
  var table = document.getElementById(name);
  if (table)
  {
    var listOfInputs = table.getElementsByTagName("input");
    var i;
    var se
    for( i = 0; i < listOfInputs.length; i++ ){
      if (listOfInputs[i].type=="checkbox"){
          if (listOfInputs[i].checked)
            return true;
      }
    }
    return false;
  }
  else
    return false;
}


function onSelectAllCheckboxClick(tableName, checked) {
  var table = document.getElementById(tableName);
  var listOfInputs = table.getElementsByTagName("input");
  var i;
  for( i = 0; i < listOfInputs.length; i++ ){
    if (listOfInputs[i].type=="checkbox"){
      listOfInputs[i].disabled=true;
      listOfInputs[i].checked=checked;
    }
  }
}


function confirmAction(name) {
  var confirmBegin = "#{messages['label.documents.confirmActionBegin']} ";
  var confirmEnd = "#{messages['label.documents.confirmActionEnd']}";
  var finalStringConfirm = confirmBegin + name + confirmEnd;

  return confirm(finalStringConfirm);
}

function blankSuggestionInput(parent) {
  var children;
  if (typeof parent.children == 'undefined') {
    // mozilla
    children = parent.childNodes;
  } else {
    // IE
    children = parent.children;
  }
  children[0].value='';
}

function trapEnter(evt, submitButtonId) {
  var keycode;
  if (evt)
      ;
  else if (window.event)
      evt = window.event;
  else if (event)
      evt = event;
  else
      return true;

  if (evt.charCode)
      keycode = evt.charCode;
  else if (evt.keyCode)
      keycode = evt.keyCode;
  else if (evt.which)
      keycode = evt.which;
  else
      keycode = 0;

  if (keycode == 13) {     
      var button = document.getElementById(submitButtonId);
      if (button != null) {
        button.select();
      }
      return false;
  } else {
      return true;
  }
}

/*
 * Modified for Nuxeo EP 5 integration
 *
 * ContextMenu - jQuery plugin for right-click context menus
 *
 * Author: Chris Domigan
 * Contributors: Dan G. Switzer, II
 * Parts of this plugin are inspired by Joern Zaefferer's Tooltip plugin
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Version: r2
 * Date: 16 July 2007
 *
 * For documentation visit http://www.trendskitchens.co.nz/jquery/contextmenu/
 *
 */
jQuery.noConflict();

(function(jQuery) {

   var menu, shadow, trigger, content, hash, currentTarget;
  var defaults = {
    eventPosX: 'pageX',
    eventPosY: 'pageY',
    shadow : true,
    onContextMenu: null,
    onShowMenu: null,
    bind: 'contextmenu',
    useFilter: true,
    anchor: 'body',
    ctxMenuStyle : 'ctxMenuStyle',
    ctxMenuItemHoverStyle : 'ctxMenuItemHoverStyle',
    ctxMenuItemStyle : 'ctxMenuItemStyle',
    ctxMenuImg : 'ctxMenuImg'
   };

  jQuery.fn.contextMenu = function(id, options) {
    if (!options)
       options={};
    hash = hash || [];
    hash.push({
      id : id,
      bindings: options.bindings || null,
      shadow: options.shadow || options.shadow === false ? options.shadow : defaults.shadow,
      onContextMenu: options.onContextMenu || defaults.onContextMenu,
      onShowMenu: options.onShowMenu || defaults.onShowMenu,
      eventPosX: options.eventPosX || defaults.eventPosX,
      eventPosY: options.eventPosY || defaults.eventPosY,
      bind: options.bind || defaults.bind,
      useFilter: options.useFilter || options.useFilter === false ? options.useFilter : defaults.useFilter,
      anchor: options.anchor || defaults.anchor,
      ctxMenuStyle: options.ctxMenuStyle || defaults.ctxMenuStyle,
      ctxMenuItemHoverStyle: options.ctxMenuItemHoverStyle || defaults.ctxMenuItemHoverStyle,
      ctxMenuItemStyle: options.ctxMenuItemStyle || defaults.ctxMenuItemStyle,
      ctxMenuImg: options.ctxMenuImg || defaults.ctxMenuImg
    });
    var index = hash.length - 1;

    if (!menu) {                                      // Create singleton menu
        menu = jQuery('<div id="jqContextMenu"></div>')
                 .hide()
                 .css({position:'absolute', zIndex:'500'})
                 .appendTo(hash[index].anchor)
                 .bind('click', function(e) {
                   e.stopPropagation();
                 });
      }
      if (!shadow) {
        shadow = jQuery('<div></div>')
                   .addClass('ctxMenuShadow')
                   .appendTo(hash[index].anchor)
                   .hide();
      }

    jQuery(this).bind(hash[index].bind, function(e) {
      // Check if onContextMenu() defined
      var bShowContext = (!!hash[index].onContextMenu) ? hash[index].onContextMenu(e) : true;
      if (bShowContext) display(index, this, e, hash[index]);
      return false;
    });
    return this;
  };

  function display(index, trigger, e, options) {
    var cur = hash[index];
    content = jQuery('#'+cur.id).find('ul:first').clone(true);
        content.addClass(options.ctxMenuStyle);
      content.find('li').addClass(options.ctxMenuItemStyle).hover( function() {
        jQuery(this).toggleClass(options.ctxMenuItemHoverStyle);
        jQuery(this).toggleClass(options.ctxMenuItemStyle);
      }, function() {
        jQuery(this).toggleClass(options.ctxMenuItemHoverStyle);
        jQuery(this).toggleClass(options.ctxMenuItemStyle);
      }).find('img').addClass(options.ctxMenuImg);
    content.find('li').bind('click', hide);
    // Send the content to the menu
    menu.html(content);

    // if there's an onShowMenu, run it now -- must run after content has been added
    // if you try to alter the content variable before the menu.html(), IE6 has issues
    // updating the content
    if (!!cur.onShowMenu) menu = cur.onShowMenu(e, menu);

    // introspec binding from html menu
    if (!cur.bindings)
    {
       cur.bindings={};
       menuHtml=document.getElementById(cur.id);
       els=menuHtml.getElementsByTagName("li");
       for(i=0;i<els.length;i++)
       {
          fct = els[i].getAttribute('action');
          if (fct)
          {
             cur.bindings[els[i].id]=eval(fct);
          }
       }
    }

    jQuery.each(cur.bindings, function(id, func) {
      jQuery('#'+id, menu).bind('click', function(e) {
        hide();
        func(getDocRef(trigger), currentTarget, trigger);
      });
    });

    jQuery(document).one('click', hide);
  beforeDisplayCallBack(e,cur,menu,shadow,trigger,e.pageX,e.pageY, options.useFilter);
  }

  function show() {
    menu.show();
    shadow.show();
  }

  function hide() {
    menu.hide();
    shadow.hide();
  }

  // Apply defaults
  jQuery.contextMenu = {
    defaults : function(userDefaults) {
      jQuery.each(userDefaults, function(i, val) {
        if (typeof val == 'object' && defaults[i]) {
          jQuery.extend(defaults[i], val);
        }
        else defaults[i] = val;
      });
    }
  };

})(jQuery);

jQuery(function() {
  jQuery('div.contextMenu').hide();
});



// Nuxeo integration
var currentMenuContext = {};

// Seam remoting call
function getMenuItemsToHide(docRef)
{
    Seam.Component.getInstance("popupHelper").getUnavailableActionId(docRef,getMenuItemsToHideCallBacks);
}

// Seam remoting callback
function getMenuItemsToHideCallBacks(actionsToRemove)
{
    // restore context
    menu=currentMenuContext['menu'];
    shadow=currentMenuContext['shadow'];
    e=currentMenuContext['e'];
    cur=currentMenuContext['cur'];
    menuX=currentMenuContext['menuX'];
    menuY=currentMenuContext['menuY'];
    if (actionsToRemove) {
    // filter menu items
    var deleteQuery = null;
    for (i = 0; i < actionsToRemove.length; i++) {
      if (!deleteQuery)
        deleteQuery = '#ctxMenu_' + actionsToRemove[i];
      else
        deleteQuery = deleteQuery + ',#ctxMenu_' + actionsToRemove[i];
    }

    if (actionsToRemove.length > 0)
      jQuery(deleteQuery, menu).remove();
  }
    // display menu
    menu.css({'left':menuX,'top':menuY}).show();
    if (cur.shadow) shadow.css({width:menu.width(),height:menu.height(),left:menuX+2,top:menuY+2}).show();
    jQuery(document).one('click', hideMenu);
}


function getDocRef(trigger)
{
  return trigger.getAttribute('docref');
}

function beforeDisplayCallBack(e,cur,menu,shadow,trigger,menuX,menuY,useFilter)
{
    // save call context
    currentMenuContext = {'e':e,'cur':cur,'menu':menu,'shadow':shadow,'menuX':menuX,'menuY':menuY};

    var docRef=getDocRef(trigger);

    if (useFilter) {
    // trigger Seam filter call
    getMenuItemsToHide(docRef);
  } else {
    getMenuItemsToHideCallBacks();
  }
}

function hideMenu()
{
    menu=currentMenuContext['menu'];
    shadow=currentMenuContext['shadow'];
    menu.hide();
    shadow.hide();
}

function setupContextMenu(target, id, options)
{
  var menuId;
  if (id) menuId = id;
  else menuId = "popupMenu";
  if (options) {
    if (options.bind)
      options.onContextMenu = function(e) {
        if (e.type == options.bind)
          return true;
        else
          return false;
      }
  }
  jQuery(document).ready(function(){
    jQuery(target).contextMenu(menuId, options);
  });
}(function() {
  var cookieName = "nuxeo.adminMesage.cookie";
  jQuery(document).ready(function() {
    jQuery(".adminMessage").each(function() {
      var adminMessageEle = jQuery(this);
      adminMessageEle.find(".close").click(function(e) {
        adminMessageEle.addClass("displayN");
        jQuery.cookie(cookieName, adminMessageEle.data('timestamp'));
        e.preventDefault();
      });

      var timestamp = parseInt(jQuery.cookie(cookieName));
      if (!timestamp) {
        adminMessageEle.removeClass("displayN");
      } else if (timestamp !== adminMessageEle.data("timestamp")) {
        // admin message modified
        adminMessageEle.removeClass("displayN");
      }
    });
  });
})();
/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

/**
 * Create a cookie with the given name and value and other optional parameters.
 *
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Set the value of a cookie.
 * @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
 * @desc Create a cookie with all available options.
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Create a session cookie.
 * @example $.cookie('the_cookie', null);
 * @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
 *       used when the cookie was set.
 *
 * @param String name The name of the cookie.
 * @param String value The value of the cookie.
 * @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
 * @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 * @type undefined
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */
jQuery.cookie = function(name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};/*
 * FancyBox - jQuery Plugin
 * Simple and fancy lightbox alternative
 *
 * Examples and documentation at: http://fancybox.net
 * 
 * Copyright (c) 2008 - 2010 Janis Skarnelis
 * That said, it is hardly a one-person project. Many people have submitted bugs, code, and offered their advice freely. Their support is greatly appreciated.
 * 
 * Version: 1.3.4 (11/11/2010)
 * Requires: jQuery v1.3+
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

;(function(b){var m,t,u,f,D,j,E,n,z,A,q=0,e={},o=[],p=0,d={},l=[],G=null,v=new Image,J=/\.(jpg|gif|png|bmp|jpeg)(.*)?$/i,W=/[^\.]\.(swf)\s*$/i,K,L=1,y=0,s="",r,i,h=false,B=b.extend(b("<div/>")[0],{prop:0}),M=b.browser.msie&&b.browser.version<7&&!window.XMLHttpRequest,N=function(){t.hide();v.onerror=v.onload=null;G&&G.abort();m.empty()},O=function(){if(false===e.onError(o,q,e)){t.hide();h=false}else{e.titleShow=false;e.width="auto";e.height="auto";m.html('<p id="fancybox-error">The requested content cannot be loaded.<br />Please try again later.</p>');
F()}},I=function(){var a=o[q],c,g,k,C,P,w;N();e=b.extend({},b.fn.fancybox.defaults,typeof b(a).data("fancybox")=="undefined"?e:b(a).data("fancybox"));w=e.onStart(o,q,e);if(w===false)h=false;else{if(typeof w=="object")e=b.extend(e,w);k=e.title||(a.nodeName?b(a).attr("title"):a.title)||"";if(a.nodeName&&!e.orig)e.orig=b(a).children("img:first").length?b(a).children("img:first"):b(a);if(k===""&&e.orig&&e.titleFromAlt)k=e.orig.attr("alt");c=e.href||(a.nodeName?b(a).attr("href"):a.href)||null;if(/^(?:javascript)/i.test(c)||
c=="#")c=null;if(e.type){g=e.type;if(!c)c=e.content}else if(e.content)g="html";else if(c)g=c.match(J)?"image":c.match(W)?"swf":b(a).hasClass("iframe")?"iframe":c.indexOf("#")===0?"inline":"ajax";if(g){if(g=="inline"){a=c.substr(c.indexOf("#"));g=b(a).length>0?"inline":"ajax"}e.type=g;e.href=c;e.title=k;if(e.autoDimensions)if(e.type=="html"||e.type=="inline"||e.type=="ajax"){e.width="auto";e.height="auto"}else e.autoDimensions=false;if(e.modal){e.overlayShow=true;e.hideOnOverlayClick=false;e.hideOnContentClick=
false;e.enableEscapeButton=false;e.showCloseButton=false}e.padding=parseInt(e.padding,10);e.margin=parseInt(e.margin,10);m.css("padding",e.padding+e.margin);b(".fancybox-inline-tmp").unbind("fancybox-cancel").bind("fancybox-change",function(){b(this).replaceWith(j.children())});switch(g){case "html":m.html(e.content);F();break;case "inline":if(b(a).parent().is("#fancybox-content")===true){h=false;break}b('<div class="fancybox-inline-tmp" />').hide().insertBefore(b(a)).bind("fancybox-cleanup",function(){b(this).replaceWith(j.children())}).bind("fancybox-cancel",
function(){b(this).replaceWith(m.children())});b(a).appendTo(m);F();break;case "image":h=false;b.fancybox.showActivity();v=new Image;v.onerror=function(){O()};v.onload=function(){h=true;v.onerror=v.onload=null;e.width=v.width;e.height=v.height;b("<img />").attr({id:"fancybox-img",src:v.src,alt:e.title}).appendTo(m);Q()};v.src=c;break;case "swf":e.scrolling="no";C='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="'+e.width+'" height="'+e.height+'"><param name="movie" value="'+c+
'"></param>';P="";b.each(e.swf,function(x,H){C+='<param name="'+x+'" value="'+H+'"></param>';P+=" "+x+'="'+H+'"'});C+='<embed src="'+c+'" type="application/x-shockwave-flash" width="'+e.width+'" height="'+e.height+'"'+P+"></embed></object>";m.html(C);F();break;case "ajax":h=false;b.fancybox.showActivity();e.ajax.win=e.ajax.success;G=b.ajax(b.extend({},e.ajax,{url:c,data:e.ajax.data||{},error:function(x){x.status>0&&O()},success:function(x,H,R){if((typeof R=="object"?R:G).status==200){if(typeof e.ajax.win==
"function"){w=e.ajax.win(c,x,H,R);if(w===false){t.hide();return}else if(typeof w=="string"||typeof w=="object")x=w}m.html(x);F()}}}));break;case "iframe":Q()}}else O()}},F=function(){var a=e.width,c=e.height;a=a.toString().indexOf("%")>-1?parseInt((b(window).width()-e.margin*2)*parseFloat(a)/100,10)+"px":a=="auto"?"auto":a+"px";c=c.toString().indexOf("%")>-1?parseInt((b(window).height()-e.margin*2)*parseFloat(c)/100,10)+"px":c=="auto"?"auto":c+"px";m.wrapInner('<div style="width:'+a+";height:"+c+
";overflow: "+(e.scrolling=="auto"?"auto":e.scrolling=="yes"?"scroll":"hidden")+';position:relative;"></div>');e.width=m.width();e.height=m.height();Q()},Q=function(){var a,c;t.hide();if(f.is(":visible")&&false===d.onCleanup(l,p,d)){b.event.trigger("fancybox-cancel");h=false}else{h=true;b(j.add(u)).unbind();b(window).unbind("resize.fb scroll.fb");b(document).unbind("keydown.fb");f.is(":visible")&&d.titlePosition!=="outside"&&f.css("height",f.height());l=o;p=q;d=e;if(d.overlayShow){u.css({"background-color":d.overlayColor,
opacity:d.overlayOpacity,cursor:d.hideOnOverlayClick?"pointer":"auto",height:b(document).height()});if(!u.is(":visible")){M&&b("select:not(#fancybox-tmp select)").filter(function(){return this.style.visibility!=="hidden"}).css({visibility:"hidden"}).one("fancybox-cleanup",function(){this.style.visibility="inherit"});u.show()}}else u.hide();i=X();s=d.title||"";y=0;n.empty().removeAttr("style").removeClass();if(d.titleShow!==false){if(b.isFunction(d.titleFormat))a=d.titleFormat(s,l,p,d);else a=s&&s.length?
d.titlePosition=="float"?'<table id="fancybox-title-float-wrap" cellpadding="0" cellspacing="0"><tr><td id="fancybox-title-float-left"></td><td id="fancybox-title-float-main">'+s+'</td><td id="fancybox-title-float-right"></td></tr></table>':'<div id="fancybox-title-'+d.titlePosition+'">'+s+"</div>":false;s=a;if(!(!s||s==="")){n.addClass("fancybox-title-"+d.titlePosition).html(s).appendTo("body").show();switch(d.titlePosition){case "inside":n.css({width:i.width-d.padding*2,marginLeft:d.padding,marginRight:d.padding});
y=n.outerHeight(true);n.appendTo(D);i.height+=y;break;case "over":n.css({marginLeft:d.padding,width:i.width-d.padding*2,bottom:d.padding}).appendTo(D);break;case "float":n.css("left",parseInt((n.width()-i.width-40)/2,10)*-1).appendTo(f);break;default:n.css({width:i.width-d.padding*2,paddingLeft:d.padding,paddingRight:d.padding}).appendTo(f)}}}n.hide();if(f.is(":visible")){b(E.add(z).add(A)).hide();a=f.position();r={top:a.top,left:a.left,width:f.width(),height:f.height()};c=r.width==i.width&&r.height==
i.height;j.fadeTo(d.changeFade,0.3,function(){var g=function(){j.html(m.contents()).fadeTo(d.changeFade,1,S)};b.event.trigger("fancybox-change");j.empty().removeAttr("filter").css({"border-width":d.padding,width:i.width-d.padding*2,height:e.autoDimensions?"auto":i.height-y-d.padding*2});if(c)g();else{B.prop=0;b(B).animate({prop:1},{duration:d.changeSpeed,easing:d.easingChange,step:T,complete:g})}})}else{f.removeAttr("style");j.css("border-width",d.padding);if(d.transitionIn=="elastic"){r=V();j.html(m.contents());
f.show();if(d.opacity)i.opacity=0;B.prop=0;b(B).animate({prop:1},{duration:d.speedIn,easing:d.easingIn,step:T,complete:S})}else{d.titlePosition=="inside"&&y>0&&n.show();j.css({width:i.width-d.padding*2,height:e.autoDimensions?"auto":i.height-y-d.padding*2}).html(m.contents());f.css(i).fadeIn(d.transitionIn=="none"?0:d.speedIn,S)}}}},Y=function(){if(d.enableEscapeButton||d.enableKeyboardNav)b(document).bind("keydown.fb",function(a){if(a.keyCode==27&&d.enableEscapeButton){a.preventDefault();b.fancybox.close()}else if((a.keyCode==
37||a.keyCode==39)&&d.enableKeyboardNav&&a.target.tagName!=="INPUT"&&a.target.tagName!=="TEXTAREA"&&a.target.tagName!=="SELECT"){a.preventDefault();b.fancybox[a.keyCode==37?"prev":"next"]()}});if(d.showNavArrows){if(d.cyclic&&l.length>1||p!==0)z.show();if(d.cyclic&&l.length>1||p!=l.length-1)A.show()}else{z.hide();A.hide()}},S=function(){if(!b.support.opacity){j.get(0).style.removeAttribute("filter");f.get(0).style.removeAttribute("filter")}e.autoDimensions&&j.css("height","auto");f.css("height","auto");
s&&s.length&&n.show();d.showCloseButton&&E.show();Y();d.hideOnContentClick&&j.bind("click",b.fancybox.close);d.hideOnOverlayClick&&u.bind("click",b.fancybox.close);b(window).bind("resize.fb",b.fancybox.resize);d.centerOnScroll&&b(window).bind("scroll.fb",b.fancybox.center);if(d.type=="iframe")b('<iframe id="fancybox-frame" name="fancybox-frame'+(new Date).getTime()+'" frameborder="0" hspace="0" '+(b.browser.msie?'allowtransparency="true""':"")+' scrolling="'+e.scrolling+'" src="'+d.href+'"></iframe>').appendTo(j);
f.show();h=false;b.fancybox.center();d.onComplete(l,p,d);var a,c;if(l.length-1>p){a=l[p+1].href;if(typeof a!=="undefined"&&a.match(J)){c=new Image;c.src=a}}if(p>0){a=l[p-1].href;if(typeof a!=="undefined"&&a.match(J)){c=new Image;c.src=a}}},T=function(a){var c={width:parseInt(r.width+(i.width-r.width)*a,10),height:parseInt(r.height+(i.height-r.height)*a,10),top:parseInt(r.top+(i.top-r.top)*a,10),left:parseInt(r.left+(i.left-r.left)*a,10)};if(typeof i.opacity!=="undefined")c.opacity=a<0.5?0.5:a;f.css(c);
j.css({width:c.width-d.padding*2,height:c.height-y*a-d.padding*2})},U=function(){return[b(window).width()-d.margin*2,b(window).height()-d.margin*2,b(document).scrollLeft()+d.margin,b(document).scrollTop()+d.margin]},X=function(){var a=U(),c={},g=d.autoScale,k=d.padding*2;c.width=d.width.toString().indexOf("%")>-1?parseInt(a[0]*parseFloat(d.width)/100,10):d.width+k;c.height=d.height.toString().indexOf("%")>-1?parseInt(a[1]*parseFloat(d.height)/100,10):d.height+k;if(g&&(c.width>a[0]||c.height>a[1]))if(e.type==
"image"||e.type=="swf"){g=d.width/d.height;if(c.width>a[0]){c.width=a[0];c.height=parseInt((c.width-k)/g+k,10)}if(c.height>a[1]){c.height=a[1];c.width=parseInt((c.height-k)*g+k,10)}}else{c.width=Math.min(c.width,a[0]);c.height=Math.min(c.height,a[1])}c.top=parseInt(Math.max(a[3]-20,a[3]+(a[1]-c.height-40)*0.5),10);c.left=parseInt(Math.max(a[2]-20,a[2]+(a[0]-c.width-40)*0.5),10);return c},V=function(){var a=e.orig?b(e.orig):false,c={};if(a&&a.length){c=a.offset();c.top+=parseInt(a.css("paddingTop"),
10)||0;c.left+=parseInt(a.css("paddingLeft"),10)||0;c.top+=parseInt(a.css("border-top-width"),10)||0;c.left+=parseInt(a.css("border-left-width"),10)||0;c.width=a.width();c.height=a.height();c={width:c.width+d.padding*2,height:c.height+d.padding*2,top:c.top-d.padding-20,left:c.left-d.padding-20}}else{a=U();c={width:d.padding*2,height:d.padding*2,top:parseInt(a[3]+a[1]*0.5,10),left:parseInt(a[2]+a[0]*0.5,10)}}return c},Z=function(){if(t.is(":visible")){b("div",t).css("top",L*-40+"px");L=(L+1)%12}else clearInterval(K)};
b.fn.fancybox=function(a){if(!b(this).length)return this;b(this).data("fancybox",b.extend({},a,b.metadata?b(this).metadata():{})).unbind("click.fb").bind("click.fb",function(c){c.preventDefault();if(!h){h=true;b(this).blur();o=[];q=0;c=b(this).attr("rel")||"";if(!c||c==""||c==="nofollow")o.push(this);else{o=b("a[rel="+c+"], area[rel="+c+"]");q=o.index(this)}I()}});return this};b.fancybox=function(a,c){var g;if(!h){h=true;g=typeof c!=="undefined"?c:{};o=[];q=parseInt(g.index,10)||0;if(b.isArray(a)){for(var k=
0,C=a.length;k<C;k++)if(typeof a[k]=="object")b(a[k]).data("fancybox",b.extend({},g,a[k]));else a[k]=b({}).data("fancybox",b.extend({content:a[k]},g));o=jQuery.merge(o,a)}else{if(typeof a=="object")b(a).data("fancybox",b.extend({},g,a));else a=b({}).data("fancybox",b.extend({content:a},g));o.push(a)}if(q>o.length||q<0)q=0;I()}};b.fancybox.showActivity=function(){clearInterval(K);t.show();K=setInterval(Z,66)};b.fancybox.hideActivity=function(){t.hide()};b.fancybox.next=function(){return b.fancybox.pos(p+
1)};b.fancybox.prev=function(){return b.fancybox.pos(p-1)};b.fancybox.pos=function(a){if(!h){a=parseInt(a);o=l;if(a>-1&&a<l.length){q=a;I()}else if(d.cyclic&&l.length>1){q=a>=l.length?0:l.length-1;I()}}};b.fancybox.cancel=function(){if(!h){h=true;b.event.trigger("fancybox-cancel");N();e.onCancel(o,q,e);h=false}};b.fancybox.close=function(){function a(){u.fadeOut("fast");n.empty().hide();f.hide();b.event.trigger("fancybox-cleanup");j.empty();d.onClosed(l,p,d);l=e=[];p=q=0;d=e={};h=false}if(!(h||f.is(":hidden"))){h=
true;if(d&&false===d.onCleanup(l,p,d))h=false;else{N();b(E.add(z).add(A)).hide();b(j.add(u)).unbind();b(window).unbind("resize.fb scroll.fb");b(document).unbind("keydown.fb");j.find("iframe").attr("src",M&&/^https/i.test(window.location.href||"")?"javascript:void(false)":"about:blank");d.titlePosition!=="inside"&&n.empty();f.stop();if(d.transitionOut=="elastic"){r=V();var c=f.position();i={top:c.top,left:c.left,width:f.width(),height:f.height()};if(d.opacity)i.opacity=1;n.empty().hide();B.prop=1;
b(B).animate({prop:0},{duration:d.speedOut,easing:d.easingOut,step:T,complete:a})}else f.fadeOut(d.transitionOut=="none"?0:d.speedOut,a)}}};b.fancybox.resize=function(){u.is(":visible")&&u.css("height",b(document).height());b.fancybox.center(true)};b.fancybox.center=function(a){var c,g;if(!h){g=a===true?1:0;c=U();!g&&(f.width()>c[0]||f.height()>c[1])||f.stop().animate({top:parseInt(Math.max(c[3]-20,c[3]+(c[1]-j.height()-40)*0.5-d.padding)),left:parseInt(Math.max(c[2]-20,c[2]+(c[0]-j.width()-40)*0.5-
d.padding))},typeof a=="number"?a:200)}};b.fancybox.init=function(){if(!b("#fancybox-wrap").length){b("body").append(m=b('<div id="fancybox-tmp"></div>'),t=b('<div id="fancybox-loading"><div></div></div>'),u=b('<div id="fancybox-overlay"></div>'),f=b('<div id="fancybox-wrap"></div>'));D=b('<div id="fancybox-outer"></div>').append('<div class="fancybox-bg" id="fancybox-bg-n"></div><div class="fancybox-bg" id="fancybox-bg-ne"></div><div class="fancybox-bg" id="fancybox-bg-e"></div><div class="fancybox-bg" id="fancybox-bg-se"></div><div class="fancybox-bg" id="fancybox-bg-s"></div><div class="fancybox-bg" id="fancybox-bg-sw"></div><div class="fancybox-bg" id="fancybox-bg-w"></div><div class="fancybox-bg" id="fancybox-bg-nw"></div>').appendTo(f);
D.append(j=b('<div id="fancybox-content"></div>'),E=b('<a id="fancybox-close"></a>'),n=b('<div id="fancybox-title"></div>'),z=b('<a href="javascript:;" id="fancybox-left"><span class="fancy-ico" id="fancybox-left-ico"></span></a>'),A=b('<a href="javascript:;" id="fancybox-right"><span class="fancy-ico" id="fancybox-right-ico"></span></a>'));E.click(b.fancybox.close);t.click(b.fancybox.cancel);z.click(function(a){a.preventDefault();b.fancybox.prev()});A.click(function(a){a.preventDefault();b.fancybox.next()});
b.fn.mousewheel&&f.bind("mousewheel.fb",function(a,c){if(h)a.preventDefault();else if(b(a.target).get(0).clientHeight==0||b(a.target).get(0).scrollHeight===b(a.target).get(0).clientHeight){a.preventDefault();b.fancybox[c>0?"prev":"next"]()}});b.support.opacity||f.addClass("fancybox-ie");if(M){t.addClass("fancybox-ie6");f.addClass("fancybox-ie6");b('<iframe id="fancybox-hide-sel-frame" src="'+(/^https/i.test(window.location.href||"")?"javascript:void(false)":"about:blank")+'" scrolling="no" border="0" frameborder="0" tabindex="-1"></iframe>').prependTo(D)}}};
b.fn.fancybox.defaults={padding:10,margin:40,opacity:false,modal:false,cyclic:false,scrolling:"auto",width:560,height:340,autoScale:true,autoDimensions:true,centerOnScroll:false,ajax:{},swf:{wmode:"transparent"},hideOnOverlayClick:true,hideOnContentClick:false,overlayShow:true,overlayOpacity:0.7,overlayColor:"#777",titleShow:true,titlePosition:"float",titleFormat:null,titleFromAlt:false,transitionIn:"fade",transitionOut:"fade",speedIn:300,speedOut:300,changeSpeed:300,changeFade:"fast",easingIn:"swing",
easingOut:"swing",showCloseButton:true,showNavArrows:true,enableEscapeButton:true,enableKeyboardNav:true,onStart:function(){},onCancel:function(){},onComplete:function(){},onCleanup:function(){},onClosed:function(){},onError:function(){}};b(document).ready(function(){b.fancybox.init()})})(jQuery);function paramIsNumber(value) {
  return ! isNaN (value-0) && value != null;
}
/**
 * Helper function to show content inside a FancyBox popup
 *
 * @deprecated since 5.7. Use openFancyBox(ele, options)
 */
function showFancyBox(ele, width, height, scrolling) {
  width = width || "90%";
  height = height || "90%";
  scrolling = scrolling || "auto";

  if (paramIsNumber(width)) {
    width = parseInt(width);
  }
  if (paramIsNumber(height)) {
    height = parseInt(height);
  }

  var popupType = 'iframe';
  if(ele.indexOf("#") == 0) {
    popupType = 'inline';
  }

  jQuery('<a href="' + ele + '"></a>').fancybox({
    'autoScale': true,
    'type': popupType,
    'width': width,
    'height': height,
    'transitionIn': 'none',
    'transitionOut': 'none',
    'enableEscapeButton': true,
    'centerOnScroll': true,
    'scrolling': scrolling
  }).click();
}

function openFancyBox(ele, options) {
  var name, settings, option,
    popupType = 'iframe';
  if(ele.indexOf("#") == 0) {
    popupType = 'inline';
  }

  // remove all empty options
  for (name in options) {
    if (options.hasOwnProperty(name)) {
      option = options[name];
      if (option === null || option === '') {
        delete options[name]
      }
    }
  }

  settings = {
    'type'     : popupType,
    'autoScale': true,
    'autoDimensions': true,
    'width': '90%',
    'height': '90%',
    'modal': false,
    'transitionIn': 'none',
    'transitionOut': 'none',
    'enableEscapeButton': true,
    'centerOnScroll': true,
    'scrolling': 'auto',
    'padding': 0
  };

  if (options) {
    jQuery.extend(settings, options);
  }

  if (paramIsNumber(settings.width)) {
    settings.width = parseInt(settings.width);
  }
  if (paramIsNumber(settings.height)) {
    settings.height = parseInt(settings.height);
  }

  jQuery('<a href="' + ele + '"></a>').fancybox(settings).click();
}
/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/

(function(jQuery){
	// input types to ignore
	var types = ['text', 'search', 'tel', 'url', 'email', 'password', 'number'];

	jQuery.hotkeys = {
		version: "0.8",

		specialKeys: {
			8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
			20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
			37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
			96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
			104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
			112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
			120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
		},

		shiftNums: {
			"`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
			"8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
			".": ">",  "/": "?",  "\\": "|"
		}
	};

	function keyHandler( handleObj ) {
		// Only care when a possible input has been specified
		if ( typeof handleObj.data !== "string" ) {
			return;
		}

		var origHandler = handleObj.handler,
			keys = handleObj.data.toLowerCase().split(" ");

		handleObj.handler = function( event ) {
			// Don't fire in text-accepting inputs that we didn't directly bind to
			if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
				 types.indexOf(event.target.type) >= 0) ) {
				return;
			}

			// Keypress represents characters, not special keys
			var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
				character = String.fromCharCode( event.which ).toLowerCase(),
				key, modif = "", possible = {};

			// check combinations (alt|ctrl|shift+anything)
			if ( event.altKey && special !== "alt" ) {
				modif += "alt+";
			}

			if ( event.ctrlKey && special !== "ctrl" ) {
				modif += "ctrl+";
			}

			// TODO: Need to make sure this works consistently across platforms
			if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
				modif += "meta+";
			}

			if ( event.shiftKey && special !== "shift" ) {
				modif += "shift+";
			}

			if ( special ) {
				possible[ modif + special ] = true;

			} else {
				possible[ modif + character ] = true;
				possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

				// "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
				if ( modif === "shift+" ) {
					possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
				}
			}

			for ( var i = 0, l = keys.length; i < l; i++ ) {
				if ( possible[ keys[i] ] ) {
					return origHandler.apply( this, arguments );
				}
			}
		};
	}

	jQuery.each([ "keydown", "keyup", "keypress" ], function() {
		jQuery.event.special[ this ] = { add: keyHandler };
	});

})( jQuery );
(function($) {
    $.fn.focusFirst = function(){
        var topElementId=$(this).get(0).getAttribute("id");
        
        /** Compute the absolute offset of a component by recursively climbing the component three.
        If a topElement is given, recursion will stop once reaching a component with that given ID. */
        function GetOffset (object, offset, topElement) {
            if (!object || object.getAttribute("id")==topElement)
                return;
            offset.x += object.offsetLeft;
            offset.y += object.offsetTop;
            GetOffset (object.parentNode, offset, topElement);
        }
        
        var elem=$('input:visible', this).get(0);
        var select=$('select:visible', this).get(0);
        if(select&&elem){
            var elemOffset = {'x':0,'y':0};
            var selectOffset = {'x':0,'y':0};
            GetOffset(elem, elemOffset, topElementId);
            GetOffset(select, selectOffset, topElementId);
            
            if(selectOffset.y < elemOffset.y){
                elem=select;
            }
        }
        
        var textarea=$('textarea:visible', this).get(0);
        if(textarea&&elem){
            var elemOffset = {'x':0,'y':0};
            var textOffset = {'x':0,'y':0};
            GetOffset(elem, elemOffset, topElementId);
            GetOffset(textarea, textOffset, topElementId);
            
            if(textOffset.y < elemOffset.y){
                elem=textarea;
            }
        }
        if(elem){
            try{
                elem.focus();
            }
            catch(err){}
        }
        return this;
    };

})(jQuery);// workaround for IE bug, see NXP-6759, NXP-7778
if (typeof Sarissa != 'undefined') {
  jQuery.ajaxSetup({
    xhr: function() {
      if (Sarissa.originalXMLHttpRequest) {
        return new Sarissa.originalXMLHttpRequest();
      } else if (typeof ActiveXObject != 'undefined') {
        return new ActiveXObject("Microsoft.XMLHTTP");
      } else {
        return new XMLHttpRequest();
      }
    }
  });
}
function showAccessKeys() {
    if (jQuery(".accessKeyMenu").size()>0) {
        jQuery(".accessKeyMenu").remove();
        return;
    }
    var container = jQuery("<div></div>");
    container.css("display","none");
    var div = jQuery("<div></div>");
    div.attr("id","accessKeyMenuPopup");
    div.addClass("accessKeyMenu");
    div.css({"padding":"8px", "margin":"4px", "font-size" : "12px"});
    container.append(div);

    var table = jQuery("<table></table>");
    div.append(table);

    jQuery("[accesskey]").each(function() {
        var item = jQuery(this);
        var key = item.attr("accesskey");


        if (key !=null && key !="") {
              var row = jQuery("<tr></tr>");
              var keySpan = jQuery("<span>" + key + "</span>");
              keySpan.css({"background-color":"#CCCCCC", "color":"black","padding":"6px", "margin":"2px","border-radius" : "2px", "font-size" : "12px", "font-weight" : "bold", "font-family": "monospace"});
              var keyText = this.innerHTML;
              if (this.tagName=="INPUT" && (item.attr("type")=="button" || item.attr("type")=="submit")) {
                 keyText = item.attr("value");
              }
              if (keyText && keyText!="" && keyText.indexOf("<!--")!=0 ) {
                var td = jQuery("<td></td>");
                td.css({"padding":"6px"});
                td.append(keySpan);
                row.append(td);

                var descSpan = jQuery("<span></span>");
                descSpan.css({"white-space":"nowrap"});
                descSpan.append(keyText);

                td = jQuery("<td></td>");
                td.append(descSpan);
                row.append(td);

                table.append(row);
              }
         }
    });
    jQuery("body").append(container);
    showFancyBox("#accessKeyMenuPopup");
}

function bindShortCuts() {
    // bind access keys to Ctrl+Shift+
    jQuery("[accesskey]").each(function() {
        var item = jQuery(this);
        var key = item.attr("accesskey");
        if (key !=null && key !="") {
              var newKeyCode = "Ctrl+Shift+" + key;
              var clickHandler = function(event) {event.preventDefault();item[0].click();return false;};
              // Document wide binding
              jQuery(document).bind('keydown', newKeyCode, clickHandler);
              // add bindings on all inputs
              jQuery("INPUT,TEXTAREA,SELECT").bind('keydown', newKeyCode, clickHandler);
              var mceFrames = jQuery(".mceIframeContainer > IFRAME").contents().find("body");
              mceFrames.bind('keydown', newKeyCode, clickHandler);
         }
    });
    // bind help screen
    jQuery(document).bind('keydown', 'Shift+h', showAccessKeys);
}

// run binding on document ready
jQuery(document).ready(function() {
     // wait for all other onready event to do their work before we tweak the binding
     // this is needed for TinyMce
     window.setTimeout(bindShortCuts, 1000);
});

/*!
 * jQuery UI Core 1.10.3
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/category/ui-core/
 */
(function( $, undefined ) {

var uuid = 0,
	runiqueId = /^ui-id-\d+$/;

// $.ui might exist from components with no dependencies, e.g., $.ui.position
$.ui = $.ui || {};

$.extend( $.ui, {
	version: "1.10.3",

	keyCode: {
		BACKSPACE: 8,
		COMMA: 188,
		DELETE: 46,
		DOWN: 40,
		END: 35,
		ENTER: 13,
		ESCAPE: 27,
		HOME: 36,
		LEFT: 37,
		NUMPAD_ADD: 107,
		NUMPAD_DECIMAL: 110,
		NUMPAD_DIVIDE: 111,
		NUMPAD_ENTER: 108,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_SUBTRACT: 109,
		PAGE_DOWN: 34,
		PAGE_UP: 33,
		PERIOD: 190,
		RIGHT: 39,
		SPACE: 32,
		TAB: 9,
		UP: 38
	}
});

// plugins
$.fn.extend({
	focus: (function( orig ) {
		return function( delay, fn ) {
			return typeof delay === "number" ?
				this.each(function() {
					var elem = this;
					setTimeout(function() {
						$( elem ).focus();
						if ( fn ) {
							fn.call( elem );
						}
					}, delay );
				}) :
				orig.apply( this, arguments );
		};
	})( $.fn.focus ),

	scrollParent: function() {
		var scrollParent;
		if (($.ui.ie && (/(static|relative)/).test(this.css("position"))) || (/absolute/).test(this.css("position"))) {
			scrollParent = this.parents().filter(function() {
				return (/(relative|absolute|fixed)/).test($.css(this,"position")) && (/(auto|scroll)/).test($.css(this,"overflow")+$.css(this,"overflow-y")+$.css(this,"overflow-x"));
			}).eq(0);
		} else {
			scrollParent = this.parents().filter(function() {
				return (/(auto|scroll)/).test($.css(this,"overflow")+$.css(this,"overflow-y")+$.css(this,"overflow-x"));
			}).eq(0);
		}

		return (/fixed/).test(this.css("position")) || !scrollParent.length ? $(document) : scrollParent;
	},

	zIndex: function( zIndex ) {
		if ( zIndex !== undefined ) {
			return this.css( "zIndex", zIndex );
		}

		if ( this.length ) {
			var elem = $( this[ 0 ] ), position, value;
			while ( elem.length && elem[ 0 ] !== document ) {
				// Ignore z-index if position is set to a value where z-index is ignored by the browser
				// This makes behavior of this function consistent across browsers
				// WebKit always returns auto if the element is positioned
				position = elem.css( "position" );
				if ( position === "absolute" || position === "relative" || position === "fixed" ) {
					// IE returns 0 when zIndex is not specified
					// other browsers return a string
					// we ignore the case of nested elements with an explicit value of 0
					// <div style="z-index: -10;"><div style="z-index: 0;"></div></div>
					value = parseInt( elem.css( "zIndex" ), 10 );
					if ( !isNaN( value ) && value !== 0 ) {
						return value;
					}
				}
				elem = elem.parent();
			}
		}

		return 0;
	},

	uniqueId: function() {
		return this.each(function() {
			if ( !this.id ) {
				this.id = "ui-id-" + (++uuid);
			}
		});
	},

	removeUniqueId: function() {
		return this.each(function() {
			if ( runiqueId.test( this.id ) ) {
				$( this ).removeAttr( "id" );
			}
		});
	}
});

// selectors
function focusable( element, isTabIndexNotNaN ) {
	var map, mapName, img,
		nodeName = element.nodeName.toLowerCase();
	if ( "area" === nodeName ) {
		map = element.parentNode;
		mapName = map.name;
		if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
			return false;
		}
		img = $( "img[usemap=#" + mapName + "]" )[0];
		return !!img && visible( img );
	}
	return ( /input|select|textarea|button|object/.test( nodeName ) ?
		!element.disabled :
		"a" === nodeName ?
			element.href || isTabIndexNotNaN :
			isTabIndexNotNaN) &&
		// the element and all of its ancestors must be visible
		visible( element );
}

function visible( element ) {
	return $.expr.filters.visible( element ) &&
		!$( element ).parents().addBack().filter(function() {
			return $.css( this, "visibility" ) === "hidden";
		}).length;
}

$.extend( $.expr[ ":" ], {
	data: $.expr.createPseudo ?
		$.expr.createPseudo(function( dataName ) {
			return function( elem ) {
				return !!$.data( elem, dataName );
			};
		}) :
		// support: jQuery <1.8
		function( elem, i, match ) {
			return !!$.data( elem, match[ 3 ] );
		},

	focusable: function( element ) {
		return focusable( element, !isNaN( $.attr( element, "tabindex" ) ) );
	},

	tabbable: function( element ) {
		var tabIndex = $.attr( element, "tabindex" ),
			isTabIndexNaN = isNaN( tabIndex );
		return ( isTabIndexNaN || tabIndex >= 0 ) && focusable( element, !isTabIndexNaN );
	}
});

// support: jQuery <1.8
if ( !$( "<a>" ).outerWidth( 1 ).jquery ) {
	$.each( [ "Width", "Height" ], function( i, name ) {
		var side = name === "Width" ? [ "Left", "Right" ] : [ "Top", "Bottom" ],
			type = name.toLowerCase(),
			orig = {
				innerWidth: $.fn.innerWidth,
				innerHeight: $.fn.innerHeight,
				outerWidth: $.fn.outerWidth,
				outerHeight: $.fn.outerHeight
			};

		function reduce( elem, size, border, margin ) {
			$.each( side, function() {
				size -= parseFloat( $.css( elem, "padding" + this ) ) || 0;
				if ( border ) {
					size -= parseFloat( $.css( elem, "border" + this + "Width" ) ) || 0;
				}
				if ( margin ) {
					size -= parseFloat( $.css( elem, "margin" + this ) ) || 0;
				}
			});
			return size;
		}

		$.fn[ "inner" + name ] = function( size ) {
			if ( size === undefined ) {
				return orig[ "inner" + name ].call( this );
			}

			return this.each(function() {
				$( this ).css( type, reduce( this, size ) + "px" );
			});
		};

		$.fn[ "outer" + name] = function( size, margin ) {
			if ( typeof size !== "number" ) {
				return orig[ "outer" + name ].call( this, size );
			}

			return this.each(function() {
				$( this).css( type, reduce( this, size, true, margin ) + "px" );
			});
		};
	});
}

// support: jQuery <1.8
if ( !$.fn.addBack ) {
	$.fn.addBack = function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	};
}

// support: jQuery 1.6.1, 1.6.2 (http://bugs.jquery.com/ticket/9413)
if ( $( "<a>" ).data( "a-b", "a" ).removeData( "a-b" ).data( "a-b" ) ) {
	$.fn.removeData = (function( removeData ) {
		return function( key ) {
			if ( arguments.length ) {
				return removeData.call( this, $.camelCase( key ) );
			} else {
				return removeData.call( this );
			}
		};
	})( $.fn.removeData );
}





// deprecated
$.ui.ie = !!/msie [\w.]+/.exec( navigator.userAgent.toLowerCase() );

$.support.selectstart = "onselectstart" in document.createElement( "div" );
$.fn.extend({
	disableSelection: function() {
		return this.bind( ( $.support.selectstart ? "selectstart" : "mousedown" ) +
			".ui-disableSelection", function( event ) {
				event.preventDefault();
			});
	},

	enableSelection: function() {
		return this.unbind( ".ui-disableSelection" );
	}
});

$.extend( $.ui, {
	// $.ui.plugin is deprecated. Use $.widget() extensions instead.
	plugin: {
		add: function( module, option, set ) {
			var i,
				proto = $.ui[ module ].prototype;
			for ( i in set ) {
				proto.plugins[ i ] = proto.plugins[ i ] || [];
				proto.plugins[ i ].push( [ option, set[ i ] ] );
			}
		},
		call: function( instance, name, args ) {
			var i,
				set = instance.plugins[ name ];
			if ( !set || !instance.element[ 0 ].parentNode || instance.element[ 0 ].parentNode.nodeType === 11 ) {
				return;
			}

			for ( i = 0; i < set.length; i++ ) {
				if ( instance.options[ set[ i ][ 0 ] ] ) {
					set[ i ][ 1 ].apply( instance.element, args );
				}
			}
		}
	},

	// only used by resizable
	hasScroll: function( el, a ) {

		//If overflow is hidden, the element might have extra content, but the user wants to hide it
		if ( $( el ).css( "overflow" ) === "hidden") {
			return false;
		}

		var scroll = ( a && a === "left" ) ? "scrollLeft" : "scrollTop",
			has = false;

		if ( el[ scroll ] > 0 ) {
			return true;
		}

		// TODO: determine which cases actually cause this to happen
		// if the element doesn't have the scroll set, see if it's possible to
		// set the scroll
		el[ scroll ] = 1;
		has = ( el[ scroll ] > 0 );
		el[ scroll ] = 0;
		return has;
	}
});

})( jQuery );
/*!
 * jQuery UI Widget 1.10.3
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/jQuery.widget/
 */
(function( $, undefined ) {

var uuid = 0,
	slice = Array.prototype.slice,
	_cleanData = $.cleanData;
$.cleanData = function( elems ) {
	for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
		try {
			$( elem ).triggerHandler( "remove" );
		// http://bugs.jquery.com/ticket/8235
		} catch( e ) {}
	}
	_cleanData( elems );
};

$.widget = function( name, base, prototype ) {
	var fullName, existingConstructor, constructor, basePrototype,
		// proxiedPrototype allows the provided prototype to remain unmodified
		// so that it can be used as a mixin for multiple widgets (#8876)
		proxiedPrototype = {},
		namespace = name.split( "." )[ 0 ];

	name = name.split( "." )[ 1 ];
	fullName = namespace + "-" + name;

	if ( !prototype ) {
		prototype = base;
		base = $.Widget;
	}

	// create selector for plugin
	$.expr[ ":" ][ fullName.toLowerCase() ] = function( elem ) {
		return !!$.data( elem, fullName );
	};

	$[ namespace ] = $[ namespace ] || {};
	existingConstructor = $[ namespace ][ name ];
	constructor = $[ namespace ][ name ] = function( options, element ) {
		// allow instantiation without "new" keyword
		if ( !this._createWidget ) {
			return new constructor( options, element );
		}

		// allow instantiation without initializing for simple inheritance
		// must use "new" keyword (the code above always passes args)
		if ( arguments.length ) {
			this._createWidget( options, element );
		}
	};
	// extend with the existing constructor to carry over any static properties
	$.extend( constructor, existingConstructor, {
		version: prototype.version,
		// copy the object used to create the prototype in case we need to
		// redefine the widget later
		_proto: $.extend( {}, prototype ),
		// track widgets that inherit from this widget in case this widget is
		// redefined after a widget inherits from it
		_childConstructors: []
	});

	basePrototype = new base();
	// we need to make the options hash a property directly on the new instance
	// otherwise we'll modify the options hash on the prototype that we're
	// inheriting from
	basePrototype.options = $.widget.extend( {}, basePrototype.options );
	$.each( prototype, function( prop, value ) {
		if ( !$.isFunction( value ) ) {
			proxiedPrototype[ prop ] = value;
			return;
		}
		proxiedPrototype[ prop ] = (function() {
			var _super = function() {
					return base.prototype[ prop ].apply( this, arguments );
				},
				_superApply = function( args ) {
					return base.prototype[ prop ].apply( this, args );
				};
			return function() {
				var __super = this._super,
					__superApply = this._superApply,
					returnValue;

				this._super = _super;
				this._superApply = _superApply;

				returnValue = value.apply( this, arguments );

				this._super = __super;
				this._superApply = __superApply;

				return returnValue;
			};
		})();
	});
	constructor.prototype = $.widget.extend( basePrototype, {
		// TODO: remove support for widgetEventPrefix
		// always use the name + a colon as the prefix, e.g., draggable:start
		// don't prefix for widgets that aren't DOM-based
		widgetEventPrefix: existingConstructor ? basePrototype.widgetEventPrefix : name
	}, proxiedPrototype, {
		constructor: constructor,
		namespace: namespace,
		widgetName: name,
		widgetFullName: fullName
	});

	// If this widget is being redefined then we need to find all widgets that
	// are inheriting from it and redefine all of them so that they inherit from
	// the new version of this widget. We're essentially trying to replace one
	// level in the prototype chain.
	if ( existingConstructor ) {
		$.each( existingConstructor._childConstructors, function( i, child ) {
			var childPrototype = child.prototype;

			// redefine the child widget using the same prototype that was
			// originally used, but inherit from the new version of the base
			$.widget( childPrototype.namespace + "." + childPrototype.widgetName, constructor, child._proto );
		});
		// remove the list of existing child constructors from the old constructor
		// so the old child constructors can be garbage collected
		delete existingConstructor._childConstructors;
	} else {
		base._childConstructors.push( constructor );
	}

	$.widget.bridge( name, constructor );
};

$.widget.extend = function( target ) {
	var input = slice.call( arguments, 1 ),
		inputIndex = 0,
		inputLength = input.length,
		key,
		value;
	for ( ; inputIndex < inputLength; inputIndex++ ) {
		for ( key in input[ inputIndex ] ) {
			value = input[ inputIndex ][ key ];
			if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {
				// Clone objects
				if ( $.isPlainObject( value ) ) {
					target[ key ] = $.isPlainObject( target[ key ] ) ?
						$.widget.extend( {}, target[ key ], value ) :
						// Don't extend strings, arrays, etc. with objects
						$.widget.extend( {}, value );
				// Copy everything else by reference
				} else {
					target[ key ] = value;
				}
			}
		}
	}
	return target;
};

$.widget.bridge = function( name, object ) {
	var fullName = object.prototype.widgetFullName || name;
	$.fn[ name ] = function( options ) {
		var isMethodCall = typeof options === "string",
			args = slice.call( arguments, 1 ),
			returnValue = this;

		// allow multiple hashes to be passed on init
		options = !isMethodCall && args.length ?
			$.widget.extend.apply( null, [ options ].concat(args) ) :
			options;

		if ( isMethodCall ) {
			this.each(function() {
				var methodValue,
					instance = $.data( this, fullName );
				if ( !instance ) {
					return $.error( "cannot call methods on " + name + " prior to initialization; " +
						"attempted to call method '" + options + "'" );
				}
				if ( !$.isFunction( instance[options] ) || options.charAt( 0 ) === "_" ) {
					return $.error( "no such method '" + options + "' for " + name + " widget instance" );
				}
				methodValue = instance[ options ].apply( instance, args );
				if ( methodValue !== instance && methodValue !== undefined ) {
					returnValue = methodValue && methodValue.jquery ?
						returnValue.pushStack( methodValue.get() ) :
						methodValue;
					return false;
				}
			});
		} else {
			this.each(function() {
				var instance = $.data( this, fullName );
				if ( instance ) {
					instance.option( options || {} )._init();
				} else {
					$.data( this, fullName, new object( options, this ) );
				}
			});
		}

		return returnValue;
	};
};

$.Widget = function( /* options, element */ ) {};
$.Widget._childConstructors = [];

$.Widget.prototype = {
	widgetName: "widget",
	widgetEventPrefix: "",
	defaultElement: "<div>",
	options: {
		disabled: false,

		// callbacks
		create: null
	},
	_createWidget: function( options, element ) {
		element = $( element || this.defaultElement || this )[ 0 ];
		this.element = $( element );
		this.uuid = uuid++;
		this.eventNamespace = "." + this.widgetName + this.uuid;
		this.options = $.widget.extend( {},
			this.options,
			this._getCreateOptions(),
			options );

		this.bindings = $();
		this.hoverable = $();
		this.focusable = $();

		if ( element !== this ) {
			$.data( element, this.widgetFullName, this );
			this._on( true, this.element, {
				remove: function( event ) {
					if ( event.target === element ) {
						this.destroy();
					}
				}
			});
			this.document = $( element.style ?
				// element within the document
				element.ownerDocument :
				// element is window or document
				element.document || element );
			this.window = $( this.document[0].defaultView || this.document[0].parentWindow );
		}

		this._create();
		this._trigger( "create", null, this._getCreateEventData() );
		this._init();
	},
	_getCreateOptions: $.noop,
	_getCreateEventData: $.noop,
	_create: $.noop,
	_init: $.noop,

	destroy: function() {
		this._destroy();
		// we can probably remove the unbind calls in 2.0
		// all event bindings should go through this._on()
		this.element
			.unbind( this.eventNamespace )
			// 1.9 BC for #7810
			// TODO remove dual storage
			.removeData( this.widgetName )
			.removeData( this.widgetFullName )
			// support: jquery <1.6.3
			// http://bugs.jquery.com/ticket/9413
			.removeData( $.camelCase( this.widgetFullName ) );
		this.widget()
			.unbind( this.eventNamespace )
			.removeAttr( "aria-disabled" )
			.removeClass(
				this.widgetFullName + "-disabled " +
				"ui-state-disabled" );

		// clean up events and states
		this.bindings.unbind( this.eventNamespace );
		this.hoverable.removeClass( "ui-state-hover" );
		this.focusable.removeClass( "ui-state-focus" );
	},
	_destroy: $.noop,

	widget: function() {
		return this.element;
	},

	option: function( key, value ) {
		var options = key,
			parts,
			curOption,
			i;

		if ( arguments.length === 0 ) {
			// don't return a reference to the internal hash
			return $.widget.extend( {}, this.options );
		}

		if ( typeof key === "string" ) {
			// handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
			options = {};
			parts = key.split( "." );
			key = parts.shift();
			if ( parts.length ) {
				curOption = options[ key ] = $.widget.extend( {}, this.options[ key ] );
				for ( i = 0; i < parts.length - 1; i++ ) {
					curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
					curOption = curOption[ parts[ i ] ];
				}
				key = parts.pop();
				if ( value === undefined ) {
					return curOption[ key ] === undefined ? null : curOption[ key ];
				}
				curOption[ key ] = value;
			} else {
				if ( value === undefined ) {
					return this.options[ key ] === undefined ? null : this.options[ key ];
				}
				options[ key ] = value;
			}
		}

		this._setOptions( options );

		return this;
	},
	_setOptions: function( options ) {
		var key;

		for ( key in options ) {
			this._setOption( key, options[ key ] );
		}

		return this;
	},
	_setOption: function( key, value ) {
		this.options[ key ] = value;

		if ( key === "disabled" ) {
			this.widget()
				.toggleClass( this.widgetFullName + "-disabled ui-state-disabled", !!value )
				.attr( "aria-disabled", value );
			this.hoverable.removeClass( "ui-state-hover" );
			this.focusable.removeClass( "ui-state-focus" );
		}

		return this;
	},

	enable: function() {
		return this._setOption( "disabled", false );
	},
	disable: function() {
		return this._setOption( "disabled", true );
	},

	_on: function( suppressDisabledCheck, element, handlers ) {
		var delegateElement,
			instance = this;

		// no suppressDisabledCheck flag, shuffle arguments
		if ( typeof suppressDisabledCheck !== "boolean" ) {
			handlers = element;
			element = suppressDisabledCheck;
			suppressDisabledCheck = false;
		}

		// no element argument, shuffle and use this.element
		if ( !handlers ) {
			handlers = element;
			element = this.element;
			delegateElement = this.widget();
		} else {
			// accept selectors, DOM elements
			element = delegateElement = $( element );
			this.bindings = this.bindings.add( element );
		}

		$.each( handlers, function( event, handler ) {
			function handlerProxy() {
				// allow widgets to customize the disabled handling
				// - disabled as an array instead of boolean
				// - disabled class as method for disabling individual parts
				if ( !suppressDisabledCheck &&
						( instance.options.disabled === true ||
							$( this ).hasClass( "ui-state-disabled" ) ) ) {
					return;
				}
				return ( typeof handler === "string" ? instance[ handler ] : handler )
					.apply( instance, arguments );
			}

			// copy the guid so direct unbinding works
			if ( typeof handler !== "string" ) {
				handlerProxy.guid = handler.guid =
					handler.guid || handlerProxy.guid || $.guid++;
			}

			var match = event.match( /^(\w+)\s*(.*)$/ ),
				eventName = match[1] + instance.eventNamespace,
				selector = match[2];
			if ( selector ) {
				delegateElement.delegate( selector, eventName, handlerProxy );
			} else {
				element.bind( eventName, handlerProxy );
			}
		});
	},

	_off: function( element, eventName ) {
		eventName = (eventName || "").split( " " ).join( this.eventNamespace + " " ) + this.eventNamespace;
		element.unbind( eventName ).undelegate( eventName );
	},

	_delay: function( handler, delay ) {
		function handlerProxy() {
			return ( typeof handler === "string" ? instance[ handler ] : handler )
				.apply( instance, arguments );
		}
		var instance = this;
		return setTimeout( handlerProxy, delay || 0 );
	},

	_hoverable: function( element ) {
		this.hoverable = this.hoverable.add( element );
		this._on( element, {
			mouseenter: function( event ) {
				$( event.currentTarget ).addClass( "ui-state-hover" );
			},
			mouseleave: function( event ) {
				$( event.currentTarget ).removeClass( "ui-state-hover" );
			}
		});
	},

	_focusable: function( element ) {
		this.focusable = this.focusable.add( element );
		this._on( element, {
			focusin: function( event ) {
				$( event.currentTarget ).addClass( "ui-state-focus" );
			},
			focusout: function( event ) {
				$( event.currentTarget ).removeClass( "ui-state-focus" );
			}
		});
	},

	_trigger: function( type, event, data ) {
		var prop, orig,
			callback = this.options[ type ];

		data = data || {};
		event = $.Event( event );
		event.type = ( type === this.widgetEventPrefix ?
			type :
			this.widgetEventPrefix + type ).toLowerCase();
		// the original event may come from any element
		// so we need to reset the target on the new event
		event.target = this.element[ 0 ];

		// copy original event properties over to the new event
		orig = event.originalEvent;
		if ( orig ) {
			for ( prop in orig ) {
				if ( !( prop in event ) ) {
					event[ prop ] = orig[ prop ];
				}
			}
		}

		this.element.trigger( event, data );
		return !( $.isFunction( callback ) &&
			callback.apply( this.element[0], [ event ].concat( data ) ) === false ||
			event.isDefaultPrevented() );
	}
};

$.each( { show: "fadeIn", hide: "fadeOut" }, function( method, defaultEffect ) {
	$.Widget.prototype[ "_" + method ] = function( element, options, callback ) {
		if ( typeof options === "string" ) {
			options = { effect: options };
		}
		var hasOptions,
			effectName = !options ?
				method :
				options === true || typeof options === "number" ?
					defaultEffect :
					options.effect || defaultEffect;
		options = options || {};
		if ( typeof options === "number" ) {
			options = { duration: options };
		}
		hasOptions = !$.isEmptyObject( options );
		options.complete = callback;
		if ( options.delay ) {
			element.delay( options.delay );
		}
		if ( hasOptions && $.effects && $.effects.effect[ effectName ] ) {
			element[ method ]( options );
		} else if ( effectName !== method && element[ effectName ] ) {
			element[ effectName ]( options.duration, options.easing, callback );
		} else {
			element.queue(function( next ) {
				$( this )[ method ]();
				if ( callback ) {
					callback.call( element[ 0 ] );
				}
				next();
			});
		}
	};
});

})( jQuery );
/*!
 * jQuery UI Mouse 1.10.3
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/mouse/
 *
 * Depends:
 *	jquery.ui.widget.js
 */
(function( $, undefined ) {

var mouseHandled = false;
$( document ).mouseup( function() {
	mouseHandled = false;
});

$.widget("ui.mouse", {
	version: "1.10.3",
	options: {
		cancel: "input,textarea,button,select,option",
		distance: 1,
		delay: 0
	},
	_mouseInit: function() {
		var that = this;

		this.element
			.bind("mousedown."+this.widgetName, function(event) {
				return that._mouseDown(event);
			})
			.bind("click."+this.widgetName, function(event) {
				if (true === $.data(event.target, that.widgetName + ".preventClickEvent")) {
					$.removeData(event.target, that.widgetName + ".preventClickEvent");
					event.stopImmediatePropagation();
					return false;
				}
			});

		this.started = false;
	},

	// TODO: make sure destroying one instance of mouse doesn't mess with
	// other instances of mouse
	_mouseDestroy: function() {
		this.element.unbind("."+this.widgetName);
		if ( this._mouseMoveDelegate ) {
			$(document)
				.unbind("mousemove."+this.widgetName, this._mouseMoveDelegate)
				.unbind("mouseup."+this.widgetName, this._mouseUpDelegate);
		}
	},

	_mouseDown: function(event) {
		// don't let more than one widget handle mouseStart
		if( mouseHandled ) { return; }

		// we may have missed mouseup (out of window)
		(this._mouseStarted && this._mouseUp(event));

		this._mouseDownEvent = event;

		var that = this,
			btnIsLeft = (event.which === 1),
			// event.target.nodeName works around a bug in IE 8 with
			// disabled inputs (#7620)
			elIsCancel = (typeof this.options.cancel === "string" && event.target.nodeName ? $(event.target).closest(this.options.cancel).length : false);
		if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
			return true;
		}

		this.mouseDelayMet = !this.options.delay;
		if (!this.mouseDelayMet) {
			this._mouseDelayTimer = setTimeout(function() {
				that.mouseDelayMet = true;
			}, this.options.delay);
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted = (this._mouseStart(event) !== false);
			if (!this._mouseStarted) {
				event.preventDefault();
				return true;
			}
		}

		// Click event may never have fired (Gecko & Opera)
		if (true === $.data(event.target, this.widgetName + ".preventClickEvent")) {
			$.removeData(event.target, this.widgetName + ".preventClickEvent");
		}

		// these delegates are required to keep context
		this._mouseMoveDelegate = function(event) {
			return that._mouseMove(event);
		};
		this._mouseUpDelegate = function(event) {
			return that._mouseUp(event);
		};
		$(document)
			.bind("mousemove."+this.widgetName, this._mouseMoveDelegate)
			.bind("mouseup."+this.widgetName, this._mouseUpDelegate);

		event.preventDefault();

		mouseHandled = true;
		return true;
	},

	_mouseMove: function(event) {
		// IE mouseup check - mouseup happened when mouse was out of window
		if ($.ui.ie && ( !document.documentMode || document.documentMode < 9 ) && !event.button) {
			return this._mouseUp(event);
		}

		if (this._mouseStarted) {
			this._mouseDrag(event);
			return event.preventDefault();
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted =
				(this._mouseStart(this._mouseDownEvent, event) !== false);
			(this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event));
		}

		return !this._mouseStarted;
	},

	_mouseUp: function(event) {
		$(document)
			.unbind("mousemove."+this.widgetName, this._mouseMoveDelegate)
			.unbind("mouseup."+this.widgetName, this._mouseUpDelegate);

		if (this._mouseStarted) {
			this._mouseStarted = false;

			if (event.target === this._mouseDownEvent.target) {
				$.data(event.target, this.widgetName + ".preventClickEvent", true);
			}

			this._mouseStop(event);
		}

		return false;
	},

	_mouseDistanceMet: function(event) {
		return (Math.max(
				Math.abs(this._mouseDownEvent.pageX - event.pageX),
				Math.abs(this._mouseDownEvent.pageY - event.pageY)
			) >= this.options.distance
		);
	},

	_mouseDelayMet: function(/* event */) {
		return this.mouseDelayMet;
	},

	// These are placeholder methods, to be overriden by extending plugin
	_mouseStart: function(/* event */) {},
	_mouseDrag: function(/* event */) {},
	_mouseStop: function(/* event */) {},
	_mouseCapture: function(/* event */) { return true; }
});

})(jQuery);
/*!
 * jQuery UI Sortable 1.10.3
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/sortable/
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function( $, undefined ) {

/*jshint loopfunc: true */

function isOverAxis( x, reference, size ) {
	return ( x > reference ) && ( x < ( reference + size ) );
}

function isFloating(item) {
	return (/left|right/).test(item.css("float")) || (/inline|table-cell/).test(item.css("display"));
}

$.widget("ui.sortable", $.ui.mouse, {
	version: "1.10.3",
	widgetEventPrefix: "sort",
	ready: false,
	options: {
		appendTo: "parent",
		axis: false,
		connectWith: false,
		containment: false,
		cursor: "auto",
		cursorAt: false,
		dropOnEmpty: true,
		forcePlaceholderSize: false,
		forceHelperSize: false,
		grid: false,
		handle: false,
		helper: "original",
		items: "> *",
		opacity: false,
		placeholder: false,
		revert: false,
		scroll: true,
		scrollSensitivity: 20,
		scrollSpeed: 20,
		scope: "default",
		tolerance: "intersect",
		zIndex: 1000,

		// callbacks
		activate: null,
		beforeStop: null,
		change: null,
		deactivate: null,
		out: null,
		over: null,
		receive: null,
		remove: null,
		sort: null,
		start: null,
		stop: null,
		update: null
	},
	_create: function() {

		var o = this.options;
		this.containerCache = {};
		this.element.addClass("ui-sortable");

		//Get the items
		this.refresh();

		//Let's determine if the items are being displayed horizontally
		this.floating = this.items.length ? o.axis === "x" || isFloating(this.items[0].item) : false;

		//Let's determine the parent's offset
		this.offset = this.element.offset();

		//Initialize mouse events for interaction
		this._mouseInit();

		//We're ready to go
		this.ready = true;

	},

	_destroy: function() {
		this.element
			.removeClass("ui-sortable ui-sortable-disabled");
		this._mouseDestroy();

		for ( var i = this.items.length - 1; i >= 0; i-- ) {
			this.items[i].item.removeData(this.widgetName + "-item");
		}

		return this;
	},

	_setOption: function(key, value){
		if ( key === "disabled" ) {
			this.options[ key ] = value;

			this.widget().toggleClass( "ui-sortable-disabled", !!value );
		} else {
			// Don't call widget base _setOption for disable as it adds ui-state-disabled class
			$.Widget.prototype._setOption.apply(this, arguments);
		}
	},

	_mouseCapture: function(event, overrideHandle) {
		var currentItem = null,
			validHandle = false,
			that = this;

		if (this.reverting) {
			return false;
		}

		if(this.options.disabled || this.options.type === "static") {
			return false;
		}

		//We have to refresh the items data once first
		this._refreshItems(event);

		//Find out if the clicked node (or one of its parents) is a actual item in this.items
		$(event.target).parents().each(function() {
			if($.data(this, that.widgetName + "-item") === that) {
				currentItem = $(this);
				return false;
			}
		});
		if($.data(event.target, that.widgetName + "-item") === that) {
			currentItem = $(event.target);
		}

		if(!currentItem) {
			return false;
		}
		if(this.options.handle && !overrideHandle) {
			$(this.options.handle, currentItem).find("*").addBack().each(function() {
				if(this === event.target) {
					validHandle = true;
				}
			});
			if(!validHandle) {
				return false;
			}
		}

		this.currentItem = currentItem;
		this._removeCurrentsFromItems();
		return true;

	},

	_mouseStart: function(event, overrideHandle, noActivation) {

		var i, body,
			o = this.options;

		this.currentContainer = this;

		//We only need to call refreshPositions, because the refreshItems call has been moved to mouseCapture
		this.refreshPositions();

		//Create and append the visible helper
		this.helper = this._createHelper(event);

		//Cache the helper size
		this._cacheHelperProportions();

		/*
		 * - Position generation -
		 * This block generates everything position related - it's the core of draggables.
		 */

		//Cache the margins of the original element
		this._cacheMargins();

		//Get the next scrolling parent
		this.scrollParent = this.helper.scrollParent();

		//The element's absolute position on the page minus margins
		this.offset = this.currentItem.offset();
		this.offset = {
			top: this.offset.top - this.margins.top,
			left: this.offset.left - this.margins.left
		};

		$.extend(this.offset, {
			click: { //Where the click happened, relative to the element
				left: event.pageX - this.offset.left,
				top: event.pageY - this.offset.top
			},
			parent: this._getParentOffset(),
			relative: this._getRelativeOffset() //This is a relative to absolute position minus the actual position calculation - only used for relative positioned helper
		});

		// Only after we got the offset, we can change the helper's position to absolute
		// TODO: Still need to figure out a way to make relative sorting possible
		this.helper.css("position", "absolute");
		this.cssPosition = this.helper.css("position");

		//Generate the original position
		this.originalPosition = this._generatePosition(event);
		this.originalPageX = event.pageX;
		this.originalPageY = event.pageY;

		//Adjust the mouse offset relative to the helper if "cursorAt" is supplied
		(o.cursorAt && this._adjustOffsetFromHelper(o.cursorAt));

		//Cache the former DOM position
		this.domPosition = { prev: this.currentItem.prev()[0], parent: this.currentItem.parent()[0] };

		//If the helper is not the original, hide the original so it's not playing any role during the drag, won't cause anything bad this way
		if(this.helper[0] !== this.currentItem[0]) {
			this.currentItem.hide();
		}

		//Create the placeholder
		this._createPlaceholder();

		//Set a containment if given in the options
		if(o.containment) {
			this._setContainment();
		}

		if( o.cursor && o.cursor !== "auto" ) { // cursor option
			body = this.document.find( "body" );

			// support: IE
			this.storedCursor = body.css( "cursor" );
			body.css( "cursor", o.cursor );

			this.storedStylesheet = $( "<style>*{ cursor: "+o.cursor+" !important; }</style>" ).appendTo( body );
		}

		if(o.opacity) { // opacity option
			if (this.helper.css("opacity")) {
				this._storedOpacity = this.helper.css("opacity");
			}
			this.helper.css("opacity", o.opacity);
		}

		if(o.zIndex) { // zIndex option
			if (this.helper.css("zIndex")) {
				this._storedZIndex = this.helper.css("zIndex");
			}
			this.helper.css("zIndex", o.zIndex);
		}

		//Prepare scrolling
		if(this.scrollParent[0] !== document && this.scrollParent[0].tagName !== "HTML") {
			this.overflowOffset = this.scrollParent.offset();
		}

		//Call callbacks
		this._trigger("start", event, this._uiHash());

		//Recache the helper size
		if(!this._preserveHelperProportions) {
			this._cacheHelperProportions();
		}


		//Post "activate" events to possible containers
		if( !noActivation ) {
			for ( i = this.containers.length - 1; i >= 0; i-- ) {
				this.containers[ i ]._trigger( "activate", event, this._uiHash( this ) );
			}
		}

		//Prepare possible droppables
		if($.ui.ddmanager) {
			$.ui.ddmanager.current = this;
		}

		if ($.ui.ddmanager && !o.dropBehaviour) {
			$.ui.ddmanager.prepareOffsets(this, event);
		}

		this.dragging = true;

		this.helper.addClass("ui-sortable-helper");
		this._mouseDrag(event); //Execute the drag once - this causes the helper not to be visible before getting its correct position
		return true;

	},

	_mouseDrag: function(event) {
		var i, item, itemElement, intersection,
			o = this.options,
			scrolled = false;

		//Compute the helpers position
		this.position = this._generatePosition(event);
		this.positionAbs = this._convertPositionTo("absolute");

		if (!this.lastPositionAbs) {
			this.lastPositionAbs = this.positionAbs;
		}

		//Do scrolling
		if(this.options.scroll) {
			if(this.scrollParent[0] !== document && this.scrollParent[0].tagName !== "HTML") {

				if((this.overflowOffset.top + this.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity) {
					this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop + o.scrollSpeed;
				} else if(event.pageY - this.overflowOffset.top < o.scrollSensitivity) {
					this.scrollParent[0].scrollTop = scrolled = this.scrollParent[0].scrollTop - o.scrollSpeed;
				}

				if((this.overflowOffset.left + this.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity) {
					this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft + o.scrollSpeed;
				} else if(event.pageX - this.overflowOffset.left < o.scrollSensitivity) {
					this.scrollParent[0].scrollLeft = scrolled = this.scrollParent[0].scrollLeft - o.scrollSpeed;
				}

			} else {

				if(event.pageY - $(document).scrollTop() < o.scrollSensitivity) {
					scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
				} else if($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity) {
					scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
				}

				if(event.pageX - $(document).scrollLeft() < o.scrollSensitivity) {
					scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
				} else if($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity) {
					scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
				}

			}

			if(scrolled !== false && $.ui.ddmanager && !o.dropBehaviour) {
				$.ui.ddmanager.prepareOffsets(this, event);
			}
		}

		//Regenerate the absolute position used for position checks
		this.positionAbs = this._convertPositionTo("absolute");

		//Set the helper position
		if(!this.options.axis || this.options.axis !== "y") {
			this.helper[0].style.left = this.position.left+"px";
		}
		if(!this.options.axis || this.options.axis !== "x") {
			this.helper[0].style.top = this.position.top+"px";
		}

		//Rearrange
		for (i = this.items.length - 1; i >= 0; i--) {

			//Cache variables and intersection, continue if no intersection
			item = this.items[i];
			itemElement = item.item[0];
			intersection = this._intersectsWithPointer(item);
			if (!intersection) {
				continue;
			}

			// Only put the placeholder inside the current Container, skip all
			// items form other containers. This works because when moving
			// an item from one container to another the
			// currentContainer is switched before the placeholder is moved.
			//
			// Without this moving items in "sub-sortables" can cause the placeholder to jitter
			// beetween the outer and inner container.
			if (item.instance !== this.currentContainer) {
				continue;
			}

			// cannot intersect with itself
			// no useless actions that have been done before
			// no action if the item moved is the parent of the item checked
			if (itemElement !== this.currentItem[0] &&
				this.placeholder[intersection === 1 ? "next" : "prev"]()[0] !== itemElement &&
				!$.contains(this.placeholder[0], itemElement) &&
				(this.options.type === "semi-dynamic" ? !$.contains(this.element[0], itemElement) : true)
			) {

				this.direction = intersection === 1 ? "down" : "up";

				if (this.options.tolerance === "pointer" || this._intersectsWithSides(item)) {
					this._rearrange(event, item);
				} else {
					break;
				}

				this._trigger("change", event, this._uiHash());
				break;
			}
		}

		//Post events to containers
		this._contactContainers(event);

		//Interconnect with droppables
		if($.ui.ddmanager) {
			$.ui.ddmanager.drag(this, event);
		}

		//Call callbacks
		this._trigger("sort", event, this._uiHash());

		this.lastPositionAbs = this.positionAbs;
		return false;

	},

	_mouseStop: function(event, noPropagation) {

		if(!event) {
			return;
		}

		//If we are using droppables, inform the manager about the drop
		if ($.ui.ddmanager && !this.options.dropBehaviour) {
			$.ui.ddmanager.drop(this, event);
		}

		if(this.options.revert) {
			var that = this,
				cur = this.placeholder.offset(),
				axis = this.options.axis,
				animation = {};

			if ( !axis || axis === "x" ) {
				animation.left = cur.left - this.offset.parent.left - this.margins.left + (this.offsetParent[0] === document.body ? 0 : this.offsetParent[0].scrollLeft);
			}
			if ( !axis || axis === "y" ) {
				animation.top = cur.top - this.offset.parent.top - this.margins.top + (this.offsetParent[0] === document.body ? 0 : this.offsetParent[0].scrollTop);
			}
			this.reverting = true;
			$(this.helper).animate( animation, parseInt(this.options.revert, 10) || 500, function() {
				that._clear(event);
			});
		} else {
			this._clear(event, noPropagation);
		}

		return false;

	},

	cancel: function() {

		if(this.dragging) {

			this._mouseUp({ target: null });

			if(this.options.helper === "original") {
				this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
			} else {
				this.currentItem.show();
			}

			//Post deactivating events to containers
			for (var i = this.containers.length - 1; i >= 0; i--){
				this.containers[i]._trigger("deactivate", null, this._uiHash(this));
				if(this.containers[i].containerCache.over) {
					this.containers[i]._trigger("out", null, this._uiHash(this));
					this.containers[i].containerCache.over = 0;
				}
			}

		}

		if (this.placeholder) {
			//$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
			if(this.placeholder[0].parentNode) {
				this.placeholder[0].parentNode.removeChild(this.placeholder[0]);
			}
			if(this.options.helper !== "original" && this.helper && this.helper[0].parentNode) {
				this.helper.remove();
			}

			$.extend(this, {
				helper: null,
				dragging: false,
				reverting: false,
				_noFinalSort: null
			});

			if(this.domPosition.prev) {
				$(this.domPosition.prev).after(this.currentItem);
			} else {
				$(this.domPosition.parent).prepend(this.currentItem);
			}
		}

		return this;

	},

	serialize: function(o) {

		var items = this._getItemsAsjQuery(o && o.connected),
			str = [];
		o = o || {};

		$(items).each(function() {
			var res = ($(o.item || this).attr(o.attribute || "id") || "").match(o.expression || (/(.+)[\-=_](.+)/));
			if (res) {
				str.push((o.key || res[1]+"[]")+"="+(o.key && o.expression ? res[1] : res[2]));
			}
		});

		if(!str.length && o.key) {
			str.push(o.key + "=");
		}

		return str.join("&");

	},

	toArray: function(o) {

		var items = this._getItemsAsjQuery(o && o.connected),
			ret = [];

		o = o || {};

		items.each(function() { ret.push($(o.item || this).attr(o.attribute || "id") || ""); });
		return ret;

	},

	/* Be careful with the following core functions */
	_intersectsWith: function(item) {

		var x1 = this.positionAbs.left,
			x2 = x1 + this.helperProportions.width,
			y1 = this.positionAbs.top,
			y2 = y1 + this.helperProportions.height,
			l = item.left,
			r = l + item.width,
			t = item.top,
			b = t + item.height,
			dyClick = this.offset.click.top,
			dxClick = this.offset.click.left,
			isOverElementHeight = ( this.options.axis === "x" ) || ( ( y1 + dyClick ) > t && ( y1 + dyClick ) < b ),
			isOverElementWidth = ( this.options.axis === "y" ) || ( ( x1 + dxClick ) > l && ( x1 + dxClick ) < r ),
			isOverElement = isOverElementHeight && isOverElementWidth;

		if ( this.options.tolerance === "pointer" ||
			this.options.forcePointerForContainers ||
			(this.options.tolerance !== "pointer" && this.helperProportions[this.floating ? "width" : "height"] > item[this.floating ? "width" : "height"])
		) {
			return isOverElement;
		} else {

			return (l < x1 + (this.helperProportions.width / 2) && // Right Half
				x2 - (this.helperProportions.width / 2) < r && // Left Half
				t < y1 + (this.helperProportions.height / 2) && // Bottom Half
				y2 - (this.helperProportions.height / 2) < b ); // Top Half

		}
	},

	_intersectsWithPointer: function(item) {

		var isOverElementHeight = (this.options.axis === "x") || isOverAxis(this.positionAbs.top + this.offset.click.top, item.top, item.height),
			isOverElementWidth = (this.options.axis === "y") || isOverAxis(this.positionAbs.left + this.offset.click.left, item.left, item.width),
			isOverElement = isOverElementHeight && isOverElementWidth,
			verticalDirection = this._getDragVerticalDirection(),
			horizontalDirection = this._getDragHorizontalDirection();

		if (!isOverElement) {
			return false;
		}

		return this.floating ?
			( ((horizontalDirection && horizontalDirection === "right") || verticalDirection === "down") ? 2 : 1 )
			: ( verticalDirection && (verticalDirection === "down" ? 2 : 1) );

	},

	_intersectsWithSides: function(item) {

		var isOverBottomHalf = isOverAxis(this.positionAbs.top + this.offset.click.top, item.top + (item.height/2), item.height),
			isOverRightHalf = isOverAxis(this.positionAbs.left + this.offset.click.left, item.left + (item.width/2), item.width),
			verticalDirection = this._getDragVerticalDirection(),
			horizontalDirection = this._getDragHorizontalDirection();

		if (this.floating && horizontalDirection) {
			return ((horizontalDirection === "right" && isOverRightHalf) || (horizontalDirection === "left" && !isOverRightHalf));
		} else {
			return verticalDirection && ((verticalDirection === "down" && isOverBottomHalf) || (verticalDirection === "up" && !isOverBottomHalf));
		}

	},

	_getDragVerticalDirection: function() {
		var delta = this.positionAbs.top - this.lastPositionAbs.top;
		return delta !== 0 && (delta > 0 ? "down" : "up");
	},

	_getDragHorizontalDirection: function() {
		var delta = this.positionAbs.left - this.lastPositionAbs.left;
		return delta !== 0 && (delta > 0 ? "right" : "left");
	},

	refresh: function(event) {
		this._refreshItems(event);
		this.refreshPositions();
		return this;
	},

	_connectWith: function() {
		var options = this.options;
		return options.connectWith.constructor === String ? [options.connectWith] : options.connectWith;
	},

	_getItemsAsjQuery: function(connected) {

		var i, j, cur, inst,
			items = [],
			queries = [],
			connectWith = this._connectWith();

		if(connectWith && connected) {
			for (i = connectWith.length - 1; i >= 0; i--){
				cur = $(connectWith[i]);
				for ( j = cur.length - 1; j >= 0; j--){
					inst = $.data(cur[j], this.widgetFullName);
					if(inst && inst !== this && !inst.options.disabled) {
						queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element) : $(inst.options.items, inst.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"), inst]);
					}
				}
			}
		}

		queries.push([$.isFunction(this.options.items) ? this.options.items.call(this.element, null, { options: this.options, item: this.currentItem }) : $(this.options.items, this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"), this]);

		for (i = queries.length - 1; i >= 0; i--){
			queries[i][0].each(function() {
				items.push(this);
			});
		}

		return $(items);

	},

	_removeCurrentsFromItems: function() {

		var list = this.currentItem.find(":data(" + this.widgetName + "-item)");

		this.items = $.grep(this.items, function (item) {
			for (var j=0; j < list.length; j++) {
				if(list[j] === item.item[0]) {
					return false;
				}
			}
			return true;
		});

	},

	_refreshItems: function(event) {

		this.items = [];
		this.containers = [this];

		var i, j, cur, inst, targetData, _queries, item, queriesLength,
			items = this.items,
			queries = [[$.isFunction(this.options.items) ? this.options.items.call(this.element[0], event, { item: this.currentItem }) : $(this.options.items, this.element), this]],
			connectWith = this._connectWith();

		if(connectWith && this.ready) { //Shouldn't be run the first time through due to massive slow-down
			for (i = connectWith.length - 1; i >= 0; i--){
				cur = $(connectWith[i]);
				for (j = cur.length - 1; j >= 0; j--){
					inst = $.data(cur[j], this.widgetFullName);
					if(inst && inst !== this && !inst.options.disabled) {
						queries.push([$.isFunction(inst.options.items) ? inst.options.items.call(inst.element[0], event, { item: this.currentItem }) : $(inst.options.items, inst.element), inst]);
						this.containers.push(inst);
					}
				}
			}
		}

		for (i = queries.length - 1; i >= 0; i--) {
			targetData = queries[i][1];
			_queries = queries[i][0];

			for (j=0, queriesLength = _queries.length; j < queriesLength; j++) {
				item = $(_queries[j]);

				item.data(this.widgetName + "-item", targetData); // Data for target checking (mouse manager)

				items.push({
					item: item,
					instance: targetData,
					width: 0, height: 0,
					left: 0, top: 0
				});
			}
		}

	},

	refreshPositions: function(fast) {

		//This has to be redone because due to the item being moved out/into the offsetParent, the offsetParent's position will change
		if(this.offsetParent && this.helper) {
			this.offset.parent = this._getParentOffset();
		}

		var i, item, t, p;

		for (i = this.items.length - 1; i >= 0; i--){
			item = this.items[i];

			//We ignore calculating positions of all connected containers when we're not over them
			if(item.instance !== this.currentContainer && this.currentContainer && item.item[0] !== this.currentItem[0]) {
				continue;
			}

			t = this.options.toleranceElement ? $(this.options.toleranceElement, item.item) : item.item;

			if (!fast) {
				item.width = t.outerWidth();
				item.height = t.outerHeight();
			}

			p = t.offset();
			item.left = p.left;
			item.top = p.top;
		}

		if(this.options.custom && this.options.custom.refreshContainers) {
			this.options.custom.refreshContainers.call(this);
		} else {
			for (i = this.containers.length - 1; i >= 0; i--){
				p = this.containers[i].element.offset();
				this.containers[i].containerCache.left = p.left;
				this.containers[i].containerCache.top = p.top;
				this.containers[i].containerCache.width	= this.containers[i].element.outerWidth();
				this.containers[i].containerCache.height = this.containers[i].element.outerHeight();
			}
		}

		return this;
	},

	_createPlaceholder: function(that) {
		that = that || this;
		var className,
			o = that.options;

		if(!o.placeholder || o.placeholder.constructor === String) {
			className = o.placeholder;
			o.placeholder = {
				element: function() {

					var nodeName = that.currentItem[0].nodeName.toLowerCase(),
						element = $( "<" + nodeName + ">", that.document[0] )
							.addClass(className || that.currentItem[0].className+" ui-sortable-placeholder")
							.removeClass("ui-sortable-helper");

					if ( nodeName === "tr" ) {
						that.currentItem.children().each(function() {
							$( "<td>&#160;</td>", that.document[0] )
								.attr( "colspan", $( this ).attr( "colspan" ) || 1 )
								.appendTo( element );
						});
					} else if ( nodeName === "img" ) {
						element.attr( "src", that.currentItem.attr( "src" ) );
					}

					if ( !className ) {
						element.css( "visibility", "hidden" );
					}

					return element;
				},
				update: function(container, p) {

					// 1. If a className is set as 'placeholder option, we don't force sizes - the class is responsible for that
					// 2. The option 'forcePlaceholderSize can be enabled to force it even if a class name is specified
					if(className && !o.forcePlaceholderSize) {
						return;
					}

					//If the element doesn't have a actual height by itself (without styles coming from a stylesheet), it receives the inline height from the dragged item
					if(!p.height()) { p.height(that.currentItem.innerHeight() - parseInt(that.currentItem.css("paddingTop")||0, 10) - parseInt(that.currentItem.css("paddingBottom")||0, 10)); }
					if(!p.width()) { p.width(that.currentItem.innerWidth() - parseInt(that.currentItem.css("paddingLeft")||0, 10) - parseInt(that.currentItem.css("paddingRight")||0, 10)); }
				}
			};
		}

		//Create the placeholder
		that.placeholder = $(o.placeholder.element.call(that.element, that.currentItem));

		//Append it after the actual current item
		that.currentItem.after(that.placeholder);

		//Update the size of the placeholder (TODO: Logic to fuzzy, see line 316/317)
		o.placeholder.update(that, that.placeholder);

	},

	_contactContainers: function(event) {
		var i, j, dist, itemWithLeastDistance, posProperty, sizeProperty, base, cur, nearBottom, floating,
			innermostContainer = null,
			innermostIndex = null;

		// get innermost container that intersects with item
		for (i = this.containers.length - 1; i >= 0; i--) {

			// never consider a container that's located within the item itself
			if($.contains(this.currentItem[0], this.containers[i].element[0])) {
				continue;
			}

			if(this._intersectsWith(this.containers[i].containerCache)) {

				// if we've already found a container and it's more "inner" than this, then continue
				if(innermostContainer && $.contains(this.containers[i].element[0], innermostContainer.element[0])) {
					continue;
				}

				innermostContainer = this.containers[i];
				innermostIndex = i;

			} else {
				// container doesn't intersect. trigger "out" event if necessary
				if(this.containers[i].containerCache.over) {
					this.containers[i]._trigger("out", event, this._uiHash(this));
					this.containers[i].containerCache.over = 0;
				}
			}

		}

		// if no intersecting containers found, return
		if(!innermostContainer) {
			return;
		}

		// move the item into the container if it's not there already
		if(this.containers.length === 1) {
			if (!this.containers[innermostIndex].containerCache.over) {
				this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
				this.containers[innermostIndex].containerCache.over = 1;
			}
		} else {

			//When entering a new container, we will find the item with the least distance and append our item near it
			dist = 10000;
			itemWithLeastDistance = null;
			floating = innermostContainer.floating || isFloating(this.currentItem);
			posProperty = floating ? "left" : "top";
			sizeProperty = floating ? "width" : "height";
			base = this.positionAbs[posProperty] + this.offset.click[posProperty];
			for (j = this.items.length - 1; j >= 0; j--) {
				if(!$.contains(this.containers[innermostIndex].element[0], this.items[j].item[0])) {
					continue;
				}
				if(this.items[j].item[0] === this.currentItem[0]) {
					continue;
				}
				if (floating && !isOverAxis(this.positionAbs.top + this.offset.click.top, this.items[j].top, this.items[j].height)) {
					continue;
				}
				cur = this.items[j].item.offset()[posProperty];
				nearBottom = false;
				if(Math.abs(cur - base) > Math.abs(cur + this.items[j][sizeProperty] - base)){
					nearBottom = true;
					cur += this.items[j][sizeProperty];
				}

				if(Math.abs(cur - base) < dist) {
					dist = Math.abs(cur - base); itemWithLeastDistance = this.items[j];
					this.direction = nearBottom ? "up": "down";
				}
			}

			//Check if dropOnEmpty is enabled
			if(!itemWithLeastDistance && !this.options.dropOnEmpty) {
				return;
			}

			if(this.currentContainer === this.containers[innermostIndex]) {
				return;
			}

			itemWithLeastDistance ? this._rearrange(event, itemWithLeastDistance, null, true) : this._rearrange(event, null, this.containers[innermostIndex].element, true);
			this._trigger("change", event, this._uiHash());
			this.containers[innermostIndex]._trigger("change", event, this._uiHash(this));
			this.currentContainer = this.containers[innermostIndex];

			//Update the placeholder
			this.options.placeholder.update(this.currentContainer, this.placeholder);

			this.containers[innermostIndex]._trigger("over", event, this._uiHash(this));
			this.containers[innermostIndex].containerCache.over = 1;
		}


	},

	_createHelper: function(event) {

		var o = this.options,
			helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event, this.currentItem])) : (o.helper === "clone" ? this.currentItem.clone() : this.currentItem);

		//Add the helper to the DOM if that didn't happen already
		if(!helper.parents("body").length) {
			$(o.appendTo !== "parent" ? o.appendTo : this.currentItem[0].parentNode)[0].appendChild(helper[0]);
		}

		if(helper[0] === this.currentItem[0]) {
			this._storedCSS = { width: this.currentItem[0].style.width, height: this.currentItem[0].style.height, position: this.currentItem.css("position"), top: this.currentItem.css("top"), left: this.currentItem.css("left") };
		}

		if(!helper[0].style.width || o.forceHelperSize) {
			helper.width(this.currentItem.width());
		}
		if(!helper[0].style.height || o.forceHelperSize) {
			helper.height(this.currentItem.height());
		}

		return helper;

	},

	_adjustOffsetFromHelper: function(obj) {
		if (typeof obj === "string") {
			obj = obj.split(" ");
		}
		if ($.isArray(obj)) {
			obj = {left: +obj[0], top: +obj[1] || 0};
		}
		if ("left" in obj) {
			this.offset.click.left = obj.left + this.margins.left;
		}
		if ("right" in obj) {
			this.offset.click.left = this.helperProportions.width - obj.right + this.margins.left;
		}
		if ("top" in obj) {
			this.offset.click.top = obj.top + this.margins.top;
		}
		if ("bottom" in obj) {
			this.offset.click.top = this.helperProportions.height - obj.bottom + this.margins.top;
		}
	},

	_getParentOffset: function() {


		//Get the offsetParent and cache its position
		this.offsetParent = this.helper.offsetParent();
		var po = this.offsetParent.offset();

		// This is a special case where we need to modify a offset calculated on start, since the following happened:
		// 1. The position of the helper is absolute, so it's position is calculated based on the next positioned parent
		// 2. The actual offset parent is a child of the scroll parent, and the scroll parent isn't the document, which means that
		//    the scroll is included in the initial calculation of the offset of the parent, and never recalculated upon drag
		if(this.cssPosition === "absolute" && this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) {
			po.left += this.scrollParent.scrollLeft();
			po.top += this.scrollParent.scrollTop();
		}

		// This needs to be actually done for all browsers, since pageX/pageY includes this information
		// with an ugly IE fix
		if( this.offsetParent[0] === document.body || (this.offsetParent[0].tagName && this.offsetParent[0].tagName.toLowerCase() === "html" && $.ui.ie)) {
			po = { top: 0, left: 0 };
		}

		return {
			top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"),10) || 0),
			left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"),10) || 0)
		};

	},

	_getRelativeOffset: function() {

		if(this.cssPosition === "relative") {
			var p = this.currentItem.position();
			return {
				top: p.top - (parseInt(this.helper.css("top"),10) || 0) + this.scrollParent.scrollTop(),
				left: p.left - (parseInt(this.helper.css("left"),10) || 0) + this.scrollParent.scrollLeft()
			};
		} else {
			return { top: 0, left: 0 };
		}

	},

	_cacheMargins: function() {
		this.margins = {
			left: (parseInt(this.currentItem.css("marginLeft"),10) || 0),
			top: (parseInt(this.currentItem.css("marginTop"),10) || 0)
		};
	},

	_cacheHelperProportions: function() {
		this.helperProportions = {
			width: this.helper.outerWidth(),
			height: this.helper.outerHeight()
		};
	},

	_setContainment: function() {

		var ce, co, over,
			o = this.options;
		if(o.containment === "parent") {
			o.containment = this.helper[0].parentNode;
		}
		if(o.containment === "document" || o.containment === "window") {
			this.containment = [
				0 - this.offset.relative.left - this.offset.parent.left,
				0 - this.offset.relative.top - this.offset.parent.top,
				$(o.containment === "document" ? document : window).width() - this.helperProportions.width - this.margins.left,
				($(o.containment === "document" ? document : window).height() || document.body.parentNode.scrollHeight) - this.helperProportions.height - this.margins.top
			];
		}

		if(!(/^(document|window|parent)$/).test(o.containment)) {
			ce = $(o.containment)[0];
			co = $(o.containment).offset();
			over = ($(ce).css("overflow") !== "hidden");

			this.containment = [
				co.left + (parseInt($(ce).css("borderLeftWidth"),10) || 0) + (parseInt($(ce).css("paddingLeft"),10) || 0) - this.margins.left,
				co.top + (parseInt($(ce).css("borderTopWidth"),10) || 0) + (parseInt($(ce).css("paddingTop"),10) || 0) - this.margins.top,
				co.left+(over ? Math.max(ce.scrollWidth,ce.offsetWidth) : ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"),10) || 0) - (parseInt($(ce).css("paddingRight"),10) || 0) - this.helperProportions.width - this.margins.left,
				co.top+(over ? Math.max(ce.scrollHeight,ce.offsetHeight) : ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"),10) || 0) - (parseInt($(ce).css("paddingBottom"),10) || 0) - this.helperProportions.height - this.margins.top
			];
		}

	},

	_convertPositionTo: function(d, pos) {

		if(!pos) {
			pos = this.position;
		}
		var mod = d === "absolute" ? 1 : -1,
			scroll = this.cssPosition === "absolute" && !(this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent,
			scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

		return {
			top: (
				pos.top	+																// The absolute mouse position
				this.offset.relative.top * mod +										// Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.top * mod -											// The offsetParent's offset without borders (offset + border)
				( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollTop() : ( scrollIsRootNode ? 0 : scroll.scrollTop() ) ) * mod)
			),
			left: (
				pos.left +																// The absolute mouse position
				this.offset.relative.left * mod +										// Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.left * mod	-										// The offsetParent's offset without borders (offset + border)
				( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft() ) * mod)
			)
		};

	},

	_generatePosition: function(event) {

		var top, left,
			o = this.options,
			pageX = event.pageX,
			pageY = event.pageY,
			scroll = this.cssPosition === "absolute" && !(this.scrollParent[0] !== document && $.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent, scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);

		// This is another very weird special case that only happens for relative elements:
		// 1. If the css position is relative
		// 2. and the scroll parent is the document or similar to the offset parent
		// we have to refresh the relative offset during the scroll so there are no jumps
		if(this.cssPosition === "relative" && !(this.scrollParent[0] !== document && this.scrollParent[0] !== this.offsetParent[0])) {
			this.offset.relative = this._getRelativeOffset();
		}

		/*
		 * - Position constraining -
		 * Constrain the position to a mix of grid, containment.
		 */

		if(this.originalPosition) { //If we are not dragging yet, we won't check for options

			if(this.containment) {
				if(event.pageX - this.offset.click.left < this.containment[0]) {
					pageX = this.containment[0] + this.offset.click.left;
				}
				if(event.pageY - this.offset.click.top < this.containment[1]) {
					pageY = this.containment[1] + this.offset.click.top;
				}
				if(event.pageX - this.offset.click.left > this.containment[2]) {
					pageX = this.containment[2] + this.offset.click.left;
				}
				if(event.pageY - this.offset.click.top > this.containment[3]) {
					pageY = this.containment[3] + this.offset.click.top;
				}
			}

			if(o.grid) {
				top = this.originalPageY + Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1];
				pageY = this.containment ? ( (top - this.offset.click.top >= this.containment[1] && top - this.offset.click.top <= this.containment[3]) ? top : ((top - this.offset.click.top >= this.containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;

				left = this.originalPageX + Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0];
				pageX = this.containment ? ( (left - this.offset.click.left >= this.containment[0] && left - this.offset.click.left <= this.containment[2]) ? left : ((left - this.offset.click.left >= this.containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
			}

		}

		return {
			top: (
				pageY -																// The absolute mouse position
				this.offset.click.top -													// Click offset (relative to the element)
				this.offset.relative.top	-											// Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.top +												// The offsetParent's offset without borders (offset + border)
				( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollTop() : ( scrollIsRootNode ? 0 : scroll.scrollTop() ) ))
			),
			left: (
				pageX -																// The absolute mouse position
				this.offset.click.left -												// Click offset (relative to the element)
				this.offset.relative.left	-											// Only for relative positioned nodes: Relative offset from element to offset parent
				this.offset.parent.left +												// The offsetParent's offset without borders (offset + border)
				( ( this.cssPosition === "fixed" ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft() ))
			)
		};

	},

	_rearrange: function(event, i, a, hardRefresh) {

		a ? a[0].appendChild(this.placeholder[0]) : i.item[0].parentNode.insertBefore(this.placeholder[0], (this.direction === "down" ? i.item[0] : i.item[0].nextSibling));

		//Various things done here to improve the performance:
		// 1. we create a setTimeout, that calls refreshPositions
		// 2. on the instance, we have a counter variable, that get's higher after every append
		// 3. on the local scope, we copy the counter variable, and check in the timeout, if it's still the same
		// 4. this lets only the last addition to the timeout stack through
		this.counter = this.counter ? ++this.counter : 1;
		var counter = this.counter;

		this._delay(function() {
			if(counter === this.counter) {
				this.refreshPositions(!hardRefresh); //Precompute after each DOM insertion, NOT on mousemove
			}
		});

	},

	_clear: function(event, noPropagation) {

		this.reverting = false;
		// We delay all events that have to be triggered to after the point where the placeholder has been removed and
		// everything else normalized again
		var i,
			delayedTriggers = [];

		// We first have to update the dom position of the actual currentItem
		// Note: don't do it if the current item is already removed (by a user), or it gets reappended (see #4088)
		if(!this._noFinalSort && this.currentItem.parent().length) {
			this.placeholder.before(this.currentItem);
		}
		this._noFinalSort = null;

		if(this.helper[0] === this.currentItem[0]) {
			for(i in this._storedCSS) {
				if(this._storedCSS[i] === "auto" || this._storedCSS[i] === "static") {
					this._storedCSS[i] = "";
				}
			}
			this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper");
		} else {
			this.currentItem.show();
		}

		if(this.fromOutside && !noPropagation) {
			delayedTriggers.push(function(event) { this._trigger("receive", event, this._uiHash(this.fromOutside)); });
		}
		if((this.fromOutside || this.domPosition.prev !== this.currentItem.prev().not(".ui-sortable-helper")[0] || this.domPosition.parent !== this.currentItem.parent()[0]) && !noPropagation) {
			delayedTriggers.push(function(event) { this._trigger("update", event, this._uiHash()); }); //Trigger update callback if the DOM position has changed
		}

		// Check if the items Container has Changed and trigger appropriate
		// events.
		if (this !== this.currentContainer) {
			if(!noPropagation) {
				delayedTriggers.push(function(event) { this._trigger("remove", event, this._uiHash()); });
				delayedTriggers.push((function(c) { return function(event) { c._trigger("receive", event, this._uiHash(this)); };  }).call(this, this.currentContainer));
				delayedTriggers.push((function(c) { return function(event) { c._trigger("update", event, this._uiHash(this));  }; }).call(this, this.currentContainer));
			}
		}


		//Post events to containers
		for (i = this.containers.length - 1; i >= 0; i--){
			if(!noPropagation) {
				delayedTriggers.push((function(c) { return function(event) { c._trigger("deactivate", event, this._uiHash(this)); };  }).call(this, this.containers[i]));
			}
			if(this.containers[i].containerCache.over) {
				delayedTriggers.push((function(c) { return function(event) { c._trigger("out", event, this._uiHash(this)); };  }).call(this, this.containers[i]));
				this.containers[i].containerCache.over = 0;
			}
		}

		//Do what was originally in plugins
		if ( this.storedCursor ) {
			this.document.find( "body" ).css( "cursor", this.storedCursor );
			this.storedStylesheet.remove();
		}
		if(this._storedOpacity) {
			this.helper.css("opacity", this._storedOpacity);
		}
		if(this._storedZIndex) {
			this.helper.css("zIndex", this._storedZIndex === "auto" ? "" : this._storedZIndex);
		}

		this.dragging = false;
		if(this.cancelHelperRemoval) {
			if(!noPropagation) {
				this._trigger("beforeStop", event, this._uiHash());
				for (i=0; i < delayedTriggers.length; i++) {
					delayedTriggers[i].call(this, event);
				} //Trigger all delayed events
				this._trigger("stop", event, this._uiHash());
			}

			this.fromOutside = false;
			return false;
		}

		if(!noPropagation) {
			this._trigger("beforeStop", event, this._uiHash());
		}

		//$(this.placeholder[0]).remove(); would have been the jQuery way - unfortunately, it unbinds ALL events from the original node!
		this.placeholder[0].parentNode.removeChild(this.placeholder[0]);

		if(this.helper[0] !== this.currentItem[0]) {
			this.helper.remove();
		}
		this.helper = null;

		if(!noPropagation) {
			for (i=0; i < delayedTriggers.length; i++) {
				delayedTriggers[i].call(this, event);
			} //Trigger all delayed events
			this._trigger("stop", event, this._uiHash());
		}

		this.fromOutside = false;
		return true;

	},

	_trigger: function() {
		if ($.Widget.prototype._trigger.apply(this, arguments) === false) {
			this.cancel();
		}
	},

	_uiHash: function(_inst) {
		var inst = _inst || this;
		return {
			helper: inst.helper,
			placeholder: inst.placeholder || $([]),
			position: inst.position,
			originalPosition: inst.originalPosition,
			offset: inst.positionAbs,
			item: inst.currentItem,
			sender: _inst ? _inst.element : null
		};
	}

});

})(jQuery);
(function($) {
  $.fn.preventDoubleSubmission = function() {

    var $form = jQuery(this);
    // Did we initialize dc shield on this form yet?
    if ($form.data('dc_shielded') !== true) {

      $form.data('dc_shielded', true);

      $form.on('submit', function(e) {

        if ($form.data('submitted') === true) {
          // Previously submitted - don't submit again
          e.preventDefault();
          jQuery.ambiance({
            title : nuxeo.doubleClickShield.message,
            className : "infoFeedback",
            timeout : 1.5
          });
        } else {
          // Mark it so that the next submit can be ignored
          $form.data('submitted', true);
        }
      });
    }

    // Keep chainability
    return this;
  };

  $.preventDoubleSubmission = $.fn.preventDoubleSubmission; // Rename for easier calling.

})(jQuery);
/*!
 * Ambiance - Notification Plugin for jQuery
 * Version 1.0.1
 * @requires jQuery v1.7.2
 *
 * Copyright (c) 2012 Richard Hsu
 * Documentation: http://www.github.com/richardhsu/jquery.ambiance
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */

(function($) {
  $.fn.ambiance = function(options) {

    var defaults = {
      title: "",
      message: "",
      type: "default",
      className: "",
      permanent: false,
      timeout: 2,
      fade: true,
      width: 300
    };

    var options = $.extend(defaults, options);
    var note_area = $("#ambiance-notification");

    // Construct the new notification.
    var note = $(window.document.createElement('div'))
                .addClass("ambiance")
                .addClass("ambiance-" + options['type'])
                .addClass(options['className']);

    note.css({width: options['width']});


    // Deal with adding the close feature or not.
    if (!options['permanent']) {
      note.prepend($(window.document.createElement('a'))
                    .addClass("ambiance-close")
                    .attr("href", "#_")
                    .html("&times;"));
    }

    // Deal with adding the title if given.
    if (options['title'] !== "") {
      note.append($(window.document.createElement('div'))
                   .addClass("ambiance-title")
                   .append(options['title']));
    }

    // Append the message (this can also be HTML or even an object!).
    note.append(options['message']);

    // Add the notification to the notification area.
    note_area.append(note);

    // Deal with non-permanent note.
    if (!options['permanent']) {
      if (options['timeout'] != 0) {
        if (options['fade']) {
          note.delay(options['timeout'] * 1000).fadeOut('slow');
          note.queue(function() { $(this).remove(); });
        } else {
          note.delay(options['timeout'] * 1000)
              .queue(function() { $(this).remove(); });
        }
      }
    }
  };
  $.ambiance = $.fn.ambiance; // Rename for easier calling.
})(jQuery);

jQuery(document).ready(function() {
  // Deal with adding the notification area to the page.
  if (jQuery("#ambiance-notification").length == 0) {
    var note_area = jQuery(window.document.createElement('div'))
                     .attr("id", "ambiance-notification");
      jQuery('body').append(note_area);
  }
});

// Deal with close event on a note.
jQuery(document).on("click", ".ambiance-close", function () {
    jQuery(this).parent().remove();
  return false;
});
/*!
 * DropDownMenu management methods
 *
 * @since 5.9.2
 */

(function($) {
  $.fn.dropdown = function() {
    this.click(function(e) {
      var display = $(this).find('ul').css('display');
      if (display === 'none') {
        $('.dropDownMenu').find('ul').hide();
        $(this).find('ul').show();
      } else {
        $(this).find('ul').hide();
      }
      e.stopPropagation();
    });
  };

  $.dropdown = $.fn.dropdown; // Rename for easier calling.
})(jQuery);

// hide all menus on click outside of the menu
jQuery(document).click(function() {
  jQuery('.dropDownMenu').find('ul').hide();
});// tipsy, facebook style tooltips for jquery
// version 1.0.0a
// (c) 2008-2010 jason frame [jason@onehackoranother.com]
// released under the MIT license
/*
 * Nuxeo WARN: This script has been patched for:
 *   - https://jira.nuxeo.com/browse/ NXP-13855
 *
 * Please re-apply any patch when upgrading this script.
 */

(function($) {

    function maybeCall(thing, ctx) {
        return (typeof thing == 'function') ? (thing.call(ctx)) : thing;
    };

    function isElementInDOM(ele) {
      while (ele = ele.parentNode) {
        if (ele == document) return true;
      }
      return false;
    };

    function Tipsy(element, options) {
        this.$element = $(element);
        this.options = options;
        this.enabled = true;
        this.fixTitle();
    };

    Tipsy.prototype = {
        show: function() {
            var title = this.getTitle();
            if (title && this.enabled) {
                var $tip = this.tip();

                $tip.find('.tipsy-inner')[this.options.html ? 'html' : 'text'](title);
                $tip[0].className = 'tipsy'; // reset classname in case of dynamic gravity
                $tip.remove().css({top: 0, left: 0, visibility: 'hidden', display: 'block'}).prependTo(document.body);

                var pos = $.extend({}, this.$element.offset(), {
                    width: this.$element[0].offsetWidth,
                    height: this.$element[0].offsetHeight
                });

                var actualWidth = $tip[0].offsetWidth,
                    actualHeight = $tip[0].offsetHeight,
                    gravity = maybeCall(this.options.gravity, this.$element[0]);

                var tp;
                switch (gravity.charAt(0)) {
                    case 'n':
                        tp = {top: pos.top + pos.height + this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                        break;
                    case 's':
                        tp = {top: pos.top - actualHeight - this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                        break;
                    case 'e':
                        tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth - this.options.offset};
                        break;
                    case 'w':
                        tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width + this.options.offset};
                        break;
                }

                if (gravity.length == 2) {
                    if (gravity.charAt(1) == 'w') {
                        tp.left = pos.left + pos.width / 2 - 15;
                    } else {
                        tp.left = pos.left + pos.width / 2 - actualWidth + 15;
                    }
                }

                $tip.css(tp).addClass('tipsy-' + gravity);
                $tip.find('.tipsy-arrow')[0].className = 'tipsy-arrow tipsy-arrow-' + gravity.charAt(0);
                if (this.options.className) {
                    $tip.addClass(maybeCall(this.options.className, this.$element[0]));
                }

                if (this.options.fade) {
                    $tip.stop().css({opacity: 0, display: 'block', visibility: 'visible'}).animate({opacity: this.options.opacity});
                } else {
                    $tip.css({visibility: 'visible', opacity: this.options.opacity});
                }

                // NXP-13855
                $tip.trigger("tipsy-show");
            }
        },

        hide: function() {
            if (this.options.fade) {
                this.tip().stop().fadeOut(function() { $(this).remove(); });
            } else {
                this.tip().remove();
            }
        },

        fixTitle: function() {
            var $e = this.$element;
            if ($e.attr('title') || typeof($e.attr('original-title')) != 'string') {
                $e.attr('original-title', $e.attr('title') || '').removeAttr('title');
            }
        },

        getTitle: function() {
            var title, $e = this.$element, o = this.options;
            this.fixTitle();
            var title, o = this.options;
            if (typeof o.title == 'string') {
                title = $e.attr(o.title == 'title' ? 'original-title' : o.title);
            } else if (typeof o.title == 'function') {
                title = o.title.call($e[0]);
            }
            title = ('' + title).replace(/(^\s*|\s*$)/, "");
            return title || o.fallback;
        },

        tip: function() {
            if (!this.$tip) {
                this.$tip = $('<div class="tipsy"></div>').html('<div class="tipsy-arrow"></div><div class="tipsy-inner"></div>');
                this.$tip.data('tipsy-pointee', this.$element[0]);
            }
            return this.$tip;
        },

        validate: function() {
            if (!this.$element[0].parentNode) {
                this.hide();
                this.$element = null;
                this.options = null;
            }
        },

        enable: function() { this.enabled = true; },
        disable: function() { this.enabled = false; },
        toggleEnabled: function() { this.enabled = !this.enabled; }
    };

    $.fn.tipsy = function(options) {

        if (options === true) {
            return this.data('tipsy');
        } else if (typeof options == 'string') {
            var tipsy = this.data('tipsy');
            if (tipsy) tipsy[options]();
            return this;
        }

        options = $.extend({}, $.fn.tipsy.defaults, options);

        function get(ele) {
            var tipsy = $.data(ele, 'tipsy');
            if (!tipsy) {
                tipsy = new Tipsy(ele, $.fn.tipsy.elementOptions(ele, options));
                $.data(ele, 'tipsy', tipsy);
            }
            return tipsy;
        }

        function enter() {
            var tipsy = get(this);
            tipsy.hoverState = 'in';
            var delayIn = options.delayIn;
            if ($(this).data('tipsy-delayin') != undefined) {
              delayIn = $(this).data('tipsy-delayin');
            }
            if (delayIn == 0) {
                tipsy.show();
            } else {
                tipsy.fixTitle();
                setTimeout(function() { if (tipsy.hoverState == 'in') tipsy.show(); }, delayIn);
            }
        };

        function leave() {
            var tipsy = get(this);
            tipsy.hoverState = 'out';
            if (options.delayOut == 0) {
                tipsy.hide();
            } else {
                setTimeout(function() { if (tipsy.hoverState == 'out') tipsy.hide(); }, options.delayOut);
            }
        };

        if (!options.live) this.each(function() { get(this); });

        if (options.trigger != 'manual') {
            var binder   = options.live ? 'live' : 'bind',
                eventIn  = options.trigger == 'hover' ? 'mouseenter' : 'focus',
                eventOut = options.trigger == 'hover' ? 'mouseleave' : 'blur';
            this[binder](eventIn, enter)[binder](eventOut, leave);
        }

        return this;

    };

    $.fn.tipsy.defaults = {
        className: null,
        delayIn: 0,
        delayOut: 0,
        fade: false,
        fallback: '',
        gravity: 'n',
        html: false,
        live: false,
        offset: 0,
        opacity: 0.8,
        title: 'title',
        trigger: 'hover'
    };

    $.fn.tipsy.revalidate = function() {
      $('.tipsy').each(function() {
        var pointee = $.data(this, 'tipsy-pointee');
        if (!pointee || !isElementInDOM(pointee)) {
          $(this).remove();
        }
      });
    };

    // Overwrite this method to provide options on a per-element basis.
    // For example, you could store the gravity in a 'tipsy-gravity' attribute:
    // return $.extend({}, options, {gravity: $(ele).attr('tipsy-gravity') || 'n' });
    // (remember - do not modify 'options' in place!)
    $.fn.tipsy.elementOptions = function(ele, options) {
        return $.metadata ? $.extend({}, options, $(ele).metadata()) : options;
    };

    $.fn.tipsy.autoNS = function() {
        return $(this).offset().top > ($(document).scrollTop() + $(window).height() / 2) ? 's' : 'n';
    };

    $.fn.tipsy.autoWE = function() {
        return $(this).offset().left > ($(document).scrollLeft() + $(window).width() / 2) ? 'e' : 'w';
    };

    /**
     * yields a closure of the supplied parameters, producing a function that takes
     * no arguments and is suitable for use as an autogravity function like so:
     *
     * @param margin (int) - distance from the viewable region edge that an
     *        element should be before setting its tooltip's gravity to be away
     *        from that edge.
     * @param prefer (string, e.g. 'n', 'sw', 'w') - the direction to prefer
     *        if there are no viewable region edges effecting the tooltip's
     *        gravity. It will try to vary from this minimally, for example,
     *        if 'sw' is preferred and an element is near the right viewable
     *        region edge, but not the top edge, it will set the gravity for
     *        that element's tooltip to be 'se', preserving the southern
     *        component.
     */
     $.fn.tipsy.autoBounds = function(margin, prefer) {
		return function() {
			var dir = {ns: prefer[0], ew: (prefer.length > 1 ? prefer[1] : false)},
			    boundTop = $(document).scrollTop() + margin,
			    boundLeft = $(document).scrollLeft() + margin,
			    $this = $(this);

			if ($this.offset().top < boundTop) dir.ns = 'n';
			if ($this.offset().left < boundLeft) dir.ew = 'w';
			if ($(window).width() + $(document).scrollLeft() - $this.offset().left < margin) dir.ew = 'e';
			if ($(window).height() + $(document).scrollTop() - $this.offset().top < margin) dir.ns = 's';

			return dir.ns + (dir.ew ? dir.ew : '');
		}
	};

})(jQuery);
/*! Magnific Popup - v0.9.9 - 2013-12-27
 * http://dimsemenov.com/plugins/magnific-popup/
 * Copyright (c) 2013 Dmitry Semenov; */
/*
 * Nuxeo WARN: This script has been patched for:
 *   - https://jira.nuxeo.com/browse/NXP-14061
 *
 * Please re-apply any patch when upgrading this script.
 */

;
(function($) {

  /* >>core */
  /**
   *
   * Magnific Popup Core JS file
   *
   */

  /**
   * Private static constants
   */
  var CLOSE_EVENT = 'Close', BEFORE_CLOSE_EVENT = 'BeforeClose', AFTER_CLOSE_EVENT = 'AfterClose', BEFORE_APPEND_EVENT = 'BeforeAppend', MARKUP_PARSE_EVENT = 'MarkupParse', OPEN_EVENT = 'Open', CHANGE_EVENT = 'Change', NS = 'mfp', EVENT_NS = '.'
      + NS, READY_CLASS = 'mfp-ready', REMOVING_CLASS = 'mfp-removing', PREVENT_CLOSE_CLASS = 'mfp-prevent-close';

  /**
   * Private vars
   */
  var mfp, // As we have only one instance of MagnificPopup object, we define
  // it locally to not to use 'this'
  MagnificPopup = function() {
  }, _isJQ = !!(window.jQuery), _prevStatus, _window = $(window), _body, _document, _prevContentType, _wrapClasses, _currPopupType;

  /**
   * Private functions
   */
  var _mfpOn = function(name, f) {
    mfp.ev.on(NS + name + EVENT_NS, f);
  }, _getEl = function(className, appendTo, html, raw) {
    var el = document.createElement('div');
    el.className = 'mfp-' + className;
    if (html) {
      el.innerHTML = html;
    }
    if (!raw) {
      el = $(el);
      if (appendTo) {
        el.appendTo(appendTo);
      }
    } else if (appendTo) {
      appendTo.appendChild(el);
    }
    return el;
  }, _mfpTrigger = function(e, data) {
    mfp.ev.triggerHandler(NS + e, data);

    if (mfp.st.callbacks) {
      // converts "mfpEventName" to "eventName" callback and triggers it if it's
      // present
      e = e.charAt(0).toLowerCase() + e.slice(1);
      if (mfp.st.callbacks[e]) {
        mfp.st.callbacks[e].apply(mfp, $.isArray(data) ? data : [ data ]);
      }
    }
  }, _getCloseBtn = function(type) {
    if (type !== _currPopupType || !mfp.currTemplate.closeBtn) {
      mfp.currTemplate.closeBtn = $(mfp.st.closeMarkup.replace('%title%',
          mfp.st.tClose));
      _currPopupType = type;
    }
    return mfp.currTemplate.closeBtn;
  },
  // Initialize Magnific Popup only when called at least once
  _checkInstance = function() {
    if (!$.magnificPopup.instance) {
      mfp = new MagnificPopup();
      mfp.init();
      $.magnificPopup.instance = mfp;
    }
  },
  // CSS transition detection,
  // http://stackoverflow.com/questions/7264899/detect-css-transitions-using-javascript-and-without-modernizr
  supportsTransitions = function() {
    var s = document.createElement('p').style, // 's' for style. better to
    // create an element if body yet
    // to exist
    v = [ 'ms', 'O', 'Moz', 'Webkit' ]; // 'v' for vendor

    if (s['transition'] !== undefined) {
      return true;
    }

    while (v.length) {
      if (v.pop() + 'Transition' in s) {
        return true;
      }
    }

    return false;
  }, canPrevious = function() {
    return mfp.index > 0 || mfp.st.nxHasPreviousPage === true;
  }, canNext = function() {
    return mfp.index < (mfp.items.length - 1) || mfp.st.nxHasNextPage === true;
  };

  /**
   * Public functions
   */
  MagnificPopup.prototype = {

    constructor : MagnificPopup,

    /**
     * Initializes Magnific Popup plugin. This function is triggered only once
     * when $.fn.magnificPopup or $.magnificPopup is executed
     */
    init : function() {
      var appVersion = navigator.appVersion;
      mfp.isIE7 = appVersion.indexOf("MSIE 7.") !== -1;
      mfp.isIE8 = appVersion.indexOf("MSIE 8.") !== -1;
      mfp.isLowIE = mfp.isIE7 || mfp.isIE8;
      mfp.isAndroid = (/android/gi).test(appVersion);
      mfp.isIOS = (/iphone|ipad|ipod/gi).test(appVersion);
      mfp.supportsTransition = supportsTransitions();

      // We disable fixed positioned lightbox on devices that don't handle it
      // nicely.
      // If you know a better way of detecting this - let me know.
      mfp.probablyMobile = (mfp.isAndroid || mfp.isIOS || /(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i
          .test(navigator.userAgent));
      _document = $(document);

      mfp.popupsCache = {};
    },

    /**
     * Opens popup
     *
     * @param data
     *          [description]
     */
    open : function(data) {

      if (!_body) {
        _body = $(document.body);
      }

      var i;

      if (data.isObj === false) {
        // convert jQuery collection to array to avoid conflicts later
        mfp.items = data.items.toArray();

        mfp.index = 0;
        var items = data.items, item;
        for (i = 0; i < items.length; i++) {
          item = items[i];
          if (item.parsed) {
            item = item.el[0];
          }
          if (item === data.el[0]) {
            mfp.index = i;
            break;
          }
        }
      } else {
        mfp.items = $.isArray(data.items) ? data.items : [ data.items ];
        mfp.index = data.index || 0;
      }

      // if popup is already opened - we just update the content
      if (mfp.isOpen) {
        mfp.updateItemHTML();
        return;
      }

      mfp.types = [];
      _wrapClasses = '';
      if (data.mainEl && data.mainEl.length) {
        mfp.ev = data.mainEl.eq(0);
      } else {
        mfp.ev = _document;
      }

      if (data.key) {
        if (!mfp.popupsCache[data.key]) {
          mfp.popupsCache[data.key] = {};
        }
        mfp.currTemplate = mfp.popupsCache[data.key];
      } else {
        mfp.currTemplate = {};
      }

      mfp.st = $.extend(true, {}, $.magnificPopup.defaults, data);
      mfp.fixedContentPos = mfp.st.fixedContentPos === 'auto' ? !mfp.probablyMobile
          : mfp.st.fixedContentPos;

      if (mfp.st.modal) {
        mfp.st.closeOnContentClick = false;
        mfp.st.closeOnBgClick = false;
        mfp.st.showCloseBtn = false;
        mfp.st.enableEscapeKey = false;
      }

      // Building markup
      // main containers are created only once
      if (!mfp.bgOverlay) {

        // Dark overlay
        mfp.bgOverlay = _getEl('bg').on('click' + EVENT_NS, function() {
          mfp.close();
        });

        mfp.wrap = _getEl('wrap').attr('tabindex', -1).on('click' + EVENT_NS,
            function(e) {
              if (mfp._checkIfClose(e.target)) {
                mfp.close();
              }
            });

        mfp.container = _getEl('container', mfp.wrap);
      }

      mfp.contentContainer = _getEl('content');
      if (mfp.st.preloader) {
        mfp.preloader = _getEl('preloader', mfp.container, mfp.st.tLoading);
      }

      // Initializing modules
      var modules = $.magnificPopup.modules;
      for (i = 0; i < modules.length; i++) {
        var n = modules[i];
        n = n.charAt(0).toUpperCase() + n.slice(1);
        mfp['init' + n].call(mfp);
      }
      _mfpTrigger('BeforeOpen');

      if (mfp.st.showCloseBtn) {
        // Close button
        if (!mfp.st.closeBtnInside) {
          mfp.wrap.append(_getCloseBtn());
        } else {
          _mfpOn(MARKUP_PARSE_EVENT, function(e, template, values, item) {
            values.close_replaceWith = _getCloseBtn(item.type);
          });
          _wrapClasses += ' mfp-close-btn-in';
        }
      }

      if (mfp.st.alignTop) {
        _wrapClasses += ' mfp-align-top';
      }

      if (mfp.fixedContentPos) {
        mfp.wrap.css({
          overflow : mfp.st.overflowY,
          overflowX : 'hidden',
          overflowY : mfp.st.overflowY
        });
      } else {
        mfp.wrap.css({
          top : _window.scrollTop(),
          position : 'absolute'
        });
      }
      if (mfp.st.fixedBgPos === false
          || (mfp.st.fixedBgPos === 'auto' && !mfp.fixedContentPos)) {
        mfp.bgOverlay.css({
          height : _document.height(),
          position : 'absolute'
        });
      }

      if (mfp.st.enableEscapeKey) {
        // Close on ESC key
        _document.on('keyup' + EVENT_NS, function(e) {
          if (e.keyCode === 27) {
            mfp.close();
          }
        });
      }

      _window.on('resize' + EVENT_NS, function() {
        mfp.updateSize();
      });

      if (!mfp.st.closeOnContentClick) {
        _wrapClasses += ' mfp-auto-cursor';
      }

      if (_wrapClasses)
        mfp.wrap.addClass(_wrapClasses);

      // this triggers recalculation of layout, so we get it once to not to
      // trigger twice
      var windowHeight = mfp.wH = _window.height();

      var windowStyles = {};

      if (mfp.fixedContentPos) {
        if (mfp._hasScrollBar(windowHeight)) {
          var s = mfp._getScrollbarSize();
          if (s) {
            windowStyles.marginRight = s;
          }
        }
      }

      if (mfp.fixedContentPos) {
        if (!mfp.isIE7) {
          windowStyles.overflow = 'hidden';
        } else {
          // ie7 double-scroll bug
          $('body, html').css('overflow', 'hidden');
        }
      }

      var classesToadd = mfp.st.mainClass;
      if (mfp.isIE7) {
        classesToadd += ' mfp-ie7';
      }
      if (classesToadd) {
        mfp._addClassToMFP(classesToadd);
      }

      // add content
      mfp.updateItemHTML();

      _mfpTrigger('BuildControls');

      // remove scrollbar, add margin e.t.c
      $('html').css(windowStyles);

      // add everything to DOM
      mfp.bgOverlay.add(mfp.wrap).prependTo(mfp.st.prependTo || _body);

      // Save last focused element
      mfp._lastFocusedEl = document.activeElement;

      // Wait for next cycle to allow CSS transition
      setTimeout(function() {

        if (mfp.content) {
          mfp._addClassToMFP(READY_CLASS);
          mfp._setFocus();
        } else {
          // if content is not defined (not loaded e.t.c) we add class only for
          // BG
          mfp.bgOverlay.addClass(READY_CLASS);
        }

        // Trap the focus in popup
        _document.on('focusin' + EVENT_NS, mfp._onFocusIn);

      }, 16);

      mfp.isOpen = true;
      mfp.updateSize(windowHeight);
      _mfpTrigger(OPEN_EVENT);

      return data;
    },

    /**
     * Closes the popup
     */
    close : function() {
      if (!mfp.isOpen)
        return;
      _mfpTrigger(BEFORE_CLOSE_EVENT);

      mfp.isOpen = false;
      // for CSS3 animation
      if (mfp.st.removalDelay && !mfp.isLowIE && mfp.supportsTransition) {
        mfp._addClassToMFP(REMOVING_CLASS);
        setTimeout(function() {
          mfp._close();
        }, mfp.st.removalDelay);
      } else {
        mfp._close();
      }
    },

    /**
     * Helper for close() function
     */
    _close : function() {
      _mfpTrigger(CLOSE_EVENT);

      var classesToRemove = REMOVING_CLASS + ' ' + READY_CLASS + ' ';

      mfp.bgOverlay.detach();
      mfp.wrap.detach();
      mfp.container.empty();

      if (mfp.st.mainClass) {
        classesToRemove += mfp.st.mainClass + ' ';
      }

      mfp._removeClassFromMFP(classesToRemove);

      if (mfp.fixedContentPos) {
        var windowStyles = {
          marginRight : ''
        };
        if (mfp.isIE7) {
          $('body, html').css('overflow', '');
        } else {
          windowStyles.overflow = '';
        }
        $('html').css(windowStyles);
      }

      _document.off('keyup' + EVENT_NS + ' focusin' + EVENT_NS);
      mfp.ev.off(EVENT_NS);

      // clean up DOM elements that aren't removed
      mfp.wrap.attr('class', 'mfp-wrap').removeAttr('style');
      mfp.bgOverlay.attr('class', 'mfp-bg');
      mfp.container.attr('class', 'mfp-container');

      // remove close button from target element
      if (mfp.st.showCloseBtn
          && (!mfp.st.closeBtnInside || mfp.currTemplate[mfp.currItem.type] === true)) {
        if (mfp.currTemplate.closeBtn)
          mfp.currTemplate.closeBtn.detach();
      }

      if (mfp._lastFocusedEl) {
        $(mfp._lastFocusedEl).focus(); // put tab focus back
      }
      mfp.currItem = null;
      mfp.content = null;
      mfp.currTemplate = null;
      mfp.prevHeight = 0;

      _mfpTrigger(AFTER_CLOSE_EVENT);
    },

    updateSize : function(winHeight) {

      if (mfp.isIOS) {
        // fixes iOS nav bars
        // https://github.com/dimsemenov/Magnific-Popup/issues/2
        var zoomLevel = document.documentElement.clientWidth / window.innerWidth;
        var height = window.innerHeight * zoomLevel;
        mfp.wrap.css('height', height);
        mfp.wH = height;
      } else {
        mfp.wH = winHeight || _window.height();
      }
      // Fixes #84: popup incorrectly positioned with position:relative on body
      if (!mfp.fixedContentPos) {
        mfp.wrap.css('height', mfp.wH);
      }

      _mfpTrigger('Resize');

    },

    /**
     * Set content of popup based on current index
     */
    updateItemHTML : function() {
      var item = mfp.items[mfp.index];

      // Detach and perform modifications
      mfp.contentContainer.detach();

      if (mfp.content)
        mfp.content.detach();

      if (!item.parsed) {
        item = mfp.parseEl(mfp.index);
      }

      var type = item.type;

      _mfpTrigger('BeforeChange',
          [ mfp.currItem ? mfp.currItem.type : '', type ]);
      // BeforeChange event works like so:
      // _mfpOn('BeforeChange', function(e, prevType, newType) { });

      mfp.currItem = item;

      if (!mfp.currTemplate[type]) {
        var markup = mfp.st[type] ? mfp.st[type].markup : false;

        // allows to modify markup
        _mfpTrigger('FirstMarkupParse', markup);

        if (markup) {
          mfp.currTemplate[type] = $(markup);
        } else {
          // if there is no markup found we just define that template is parsed
          mfp.currTemplate[type] = true;
        }
      }

      if (_prevContentType && _prevContentType !== item.type) {
        mfp.container.removeClass('mfp-' + _prevContentType + '-holder');
      }

      var newContent = mfp['get' + type.charAt(0).toUpperCase() + type.slice(1)]
          (item, mfp.currTemplate[type]);
      mfp.appendContent(newContent, type);

      item.preloaded = true;

      _mfpTrigger(CHANGE_EVENT, item);
      _prevContentType = item.type;

      // Append container back after its content changed
      mfp.container.prepend(mfp.contentContainer);

      _mfpTrigger('AfterChange');
    },

    /**
     * Set HTML content of popup
     */
    appendContent : function(newContent, type) {
      mfp.content = newContent;

      if (newContent) {
        if (mfp.st.showCloseBtn && mfp.st.closeBtnInside
            && mfp.currTemplate[type] === true) {
          // if there is no markup, we just append close button element inside
          if (!mfp.content.find('.mfp-close').length) {
            mfp.content.append(_getCloseBtn());
          }
        } else {
          mfp.content = newContent;
        }
      } else {
        mfp.content = '';
      }

      _mfpTrigger(BEFORE_APPEND_EVENT);
      mfp.container.addClass('mfp-' + type + '-holder');

      mfp.contentContainer.append(mfp.content);
    },

    /**
     * Creates Magnific Popup data object based on given data
     *
     * @param {int}
     *          index Index of item to parse
     */
    parseEl : function(index) {
      var item = mfp.items[index], type;

      if (item.tagName) {
        item = {
          el : $(item)
        };
      } else {
        type = item.type;
        item = {
          data : item,
          src : item.src
        };
      }

      if (item.el) {
        var types = mfp.types;

        // check for 'mfp-TYPE' class
        for ( var i = 0; i < types.length; i++) {
          if (item.el.hasClass('mfp-' + types[i])) {
            type = types[i];
            break;
          }
        }

        item.src = item.el.attr('data-mfp-src');
        if (!item.src) {
          item.src = item.el.attr('href');
        }
      }

      item.type = type || mfp.st.type || 'inline';
      item.index = index;
      item.parsed = true;
      mfp.items[index] = item;
      _mfpTrigger('ElementParse', item);

      return mfp.items[index];
    },

    /**
     * Initializes single popup or a group of popups
     */
    addGroup : function(el, options) {
      var eHandler = function(e) {
        e.mfpEl = this;
        mfp._openClick(e, el, options);
      };

      if (!options) {
        options = {};
      }

      var eName = 'click.magnificPopup';
      options.mainEl = el;

      if (options.items) {
        options.isObj = true;
        el.off(eName).on(eName, eHandler);
      } else {
        options.isObj = false;
        if (options.delegate) {
          el.off(eName).on(eName, options.delegate, eHandler);
        } else {
          options.items = el;
          el.off(eName).on(eName, eHandler);
        }
      }
    },
    _openClick : function(e, el, options) {
      var midClick = options.midClick !== undefined ? options.midClick
          : $.magnificPopup.defaults.midClick;

      if (!midClick && (e.which === 2 || e.ctrlKey || e.metaKey)) {
        return;
      }

      var disableOn = options.disableOn !== undefined ? options.disableOn
          : $.magnificPopup.defaults.disableOn;

      if (disableOn) {
        if ($.isFunction(disableOn)) {
          if (!disableOn.call(mfp)) {
            return true;
          }
        } else { // else it's number
          if (_window.width() < disableOn) {
            return true;
          }
        }
      }

      if (e.type) {
        e.preventDefault();

        // This will prevent popup from closing if element is inside and popup
        // is already opened
        if (mfp.isOpen) {
          e.stopPropagation();
        }
      }

      options.el = $(e.mfpEl);
      if (options.delegate) {
        options.items = el.find(options.delegate);
      }
      mfp.open(options);
    },

    /**
     * Updates text on preloader
     */
    updateStatus : function(status, text) {

      if (mfp.preloader) {
        if (_prevStatus !== status) {
          mfp.container.removeClass('mfp-s-' + _prevStatus);
        }

        if (!text && status === 'loading') {
          text = mfp.st.tLoading;
        }

        var data = {
          status : status,
          text : text
        };
        // allows to modify status
        _mfpTrigger('UpdateStatus', data);

        status = data.status;
        text = data.text;

        mfp.preloader.html(text);

        mfp.preloader.find('a').on('click', function(e) {
          e.stopImmediatePropagation();
        });

        mfp.container.addClass('mfp-s-' + status);
        _prevStatus = status;
      }
    },

    /*
     * "Private" helpers that aren't private at all
     */
    // Check to close popup or not
    // "target" is an element that was clicked
    _checkIfClose : function(target) {

      if ($(target).hasClass(PREVENT_CLOSE_CLASS)) {
        return;
      }

      var closeOnContent = mfp.st.closeOnContentClick;
      var closeOnBg = mfp.st.closeOnBgClick;

      if (closeOnContent && closeOnBg) {
        return true;
      } else {

        // We close the popup if click is on close button or on preloader. Or if
        // there is no content.
        if (!mfp.content || $(target).hasClass('mfp-close')
            || (mfp.preloader && target === mfp.preloader[0])) {
          return true;
        }

        // if click is outside the content
        if ((target !== mfp.content[0] && !$.contains(mfp.content[0], target))) {
          if (closeOnBg) {
            // last check, if the clicked element is in DOM, (in case it's
            // removed onclick)
            if ($.contains(document, target)) {
              return true;
            }
          }
        } else if (closeOnContent) {
          return true;
        }

      }
      return false;
    },
    _addClassToMFP : function(cName) {
      mfp.bgOverlay.addClass(cName);
      mfp.wrap.addClass(cName);
    },
    _removeClassFromMFP : function(cName) {
      this.bgOverlay.removeClass(cName);
      mfp.wrap.removeClass(cName);
    },
    _hasScrollBar : function(winHeight) {
      return ((mfp.isIE7 ? _document.height() : document.body.scrollHeight) > (winHeight || _window
          .height()));
    },
    _setFocus : function() {
      (mfp.st.focus ? mfp.content.find(mfp.st.focus).eq(0) : mfp.wrap).focus();
    },
    _onFocusIn : function(e) {
      if (e.target !== mfp.wrap[0] && !$.contains(mfp.wrap[0], e.target)) {
        mfp._setFocus();
        return false;
      }
    },
    _parseMarkup : function(template, values, item) {
      var arr;
      if (item.data) {
        values = $.extend(item.data, values);
      }
      _mfpTrigger(MARKUP_PARSE_EVENT, [ template, values, item ]);

      $.each(values, function(key, value) {
        if (value === undefined || value === false) {
          return true;
        }
        arr = key.split('_');
        if (arr.length > 1) {
          var el = template.find(EVENT_NS + '-' + arr[0]);

          if (el.length > 0) {
            var attr = arr[1];
            if (attr === 'replaceWith') {
              if (el[0] !== value[0]) {
                el.replaceWith(value);
              }
            } else if (attr === 'img') {
              if (el.is('img')) {
                el.attr('src', value);
              } else {
                el.replaceWith('<img src="' + value + '" class="'
                    + el.attr('class') + '" />');
              }
            } else {
              el.attr(arr[1], value);
            }
          }

        } else {
          template.find(EVENT_NS + '-' + key).html(value);
        }
      });
    },

    _getScrollbarSize : function() {
      // thx David
      if (mfp.scrollbarSize === undefined) {
        var scrollDiv = document.createElement("div");
        scrollDiv.id = "mfp-sbm";
        scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
        document.body.appendChild(scrollDiv);
        mfp.scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
      }
      return mfp.scrollbarSize;
    }

  }; /* MagnificPopup core prototype end */

  /**
   * Public static functions
   */
  $.magnificPopup = {
    instance : null,
    proto : MagnificPopup.prototype,
    modules : [],

    open : function(options, index) {
      _checkInstance();

      if (!options) {
        options = {};
      } else {
        options = $.extend(true, {}, options);
      }

      options.isObj = true;
      options.index = index || 0;
      return this.instance.open(options);
    },

    close : function() {
      return $.magnificPopup.instance && $.magnificPopup.instance.close();
    },

    registerModule : function(name, module) {
      if (module.options) {
        $.magnificPopup.defaults[name] = module.options;
      }
      $.extend(this.proto, module.proto);
      this.modules.push(name);
    },

    defaults : {

      // Info about options is in docs:
      // http://dimsemenov.com/plugins/magnific-popup/documentation.html#options

      disableOn : 0,

      key : null,

      midClick : false,

      mainClass : '',

      preloader : true,

      focus : '', // CSS selector of input to focus after popup is opened

      closeOnContentClick : false,

      closeOnBgClick : true,

      closeBtnInside : true,

      showCloseBtn : true,

      enableEscapeKey : true,

      modal : false,

      alignTop : false,

      removalDelay : 0,

      prependTo : null,

      fixedContentPos : 'auto',

      fixedBgPos : 'auto',

      overflowY : 'auto',

      closeMarkup : '<button title="%title%" type="button" class="mfp-close">&times;</button>',

      tClose : 'Close (Esc)',

      tLoading : 'Loading...'

    }
  };

  $.fn.magnificPopup = function(options) {
    _checkInstance();

    var jqEl = $(this);

    // We call some API method of first param is a string
    if (typeof options === "string") {

      if (options === 'open') {
        var items, itemOpts = _isJQ ? jqEl.data('magnificPopup')
            : jqEl[0].magnificPopup, index = parseInt(arguments[1], 10) || 0;

        if (itemOpts.items) {
          items = itemOpts.items[index];
        } else {
          items = jqEl;
          if (itemOpts.delegate) {
            items = items.find(itemOpts.delegate);
          }
          items = items.eq(index);
        }
        mfp._openClick({
          mfpEl : items
        }, jqEl, itemOpts);
      } else {
        if (mfp.isOpen)
          mfp[options].apply(mfp, Array.prototype.slice.call(arguments, 1));
      }

    } else {
      // clone options obj
      options = $.extend(true, {}, options);

      /*
       * As Zepto doesn't support .data() method for objects and it works only
       * in normal browsers we assign "options" object directly to the DOM
       * element. FTW!
       */
      if (_isJQ) {
        jqEl.data('magnificPopup', options);
      } else {
        jqEl[0].magnificPopup = options;
      }

      mfp.addGroup(jqEl, options);

    }
    return jqEl;
  };

  // Quick benchmark
  /*
   * var start = performance.now(), i, rounds = 1000;
   *
   * for(i = 0; i < rounds; i++) {
   *  } console.log('Test #1:', performance.now() - start);
   *
   * start = performance.now(); for(i = 0; i < rounds; i++) {
   *  } console.log('Test #2:', performance.now() - start);
   */

  /* >>core */

  /* >>inline */

  var INLINE_NS = 'inline', _hiddenClass, _inlinePlaceholder, _lastInlineElement, _putInlineElementsBack = function() {
    if (_lastInlineElement) {
      _inlinePlaceholder.after(_lastInlineElement.addClass(_hiddenClass))
          .detach();
      _lastInlineElement = null;
    }
  };

  $.magnificPopup.registerModule(INLINE_NS, {
    options : {
      hiddenClass : 'hide', // will be appended with `mfp-` prefix
      markup : '',
      tNotFound : 'Content not found'
    },
    proto : {

      initInline : function() {
        mfp.types.push(INLINE_NS);

        _mfpOn(CLOSE_EVENT + '.' + INLINE_NS, function() {
          _putInlineElementsBack();
        });
      },

      getInline : function(item, template) {

        _putInlineElementsBack();

        if (item.src) {
          var inlineSt = mfp.st.inline, el = $(item.src);

          if (el.length) {

            // If target element has parent - we replace it with placeholder and
            // put it back after popup is closed
            var parent = el[0].parentNode;
            if (parent && parent.tagName) {
              if (!_inlinePlaceholder) {
                _hiddenClass = inlineSt.hiddenClass;
                _inlinePlaceholder = _getEl(_hiddenClass);
                _hiddenClass = 'mfp-' + _hiddenClass;
              }
              // replace target inline element with placeholder
              _lastInlineElement = el.after(_inlinePlaceholder).detach()
                  .removeClass(_hiddenClass);
            }

            mfp.updateStatus('ready');
          } else {
            mfp.updateStatus('error', inlineSt.tNotFound);
            el = $('<div>');
          }

          item.inlineElement = el;
          return el;
        }

        mfp.updateStatus('ready');
        mfp._parseMarkup(template, {}, item);
        return template;
      }
    }
  });

  /* >>inline */

  /* >>ajax */
  var AJAX_NS = 'ajax', _ajaxCur, _removeAjaxCursor = function() {
    if (_ajaxCur) {
      _body.removeClass(_ajaxCur);
    }
  }, _destroyAjaxRequest = function() {
    _removeAjaxCursor();
    if (mfp.req) {
      mfp.req.abort();
    }
  };

  $.magnificPopup.registerModule(AJAX_NS, {

    options : {
      settings : null,
      cursor : 'mfp-ajax-cur',
      tError : '<a href="%url%">The content</a> could not be loaded.'
    },

    proto : {
      initAjax : function() {
        mfp.types.push(AJAX_NS);
        _ajaxCur = mfp.st.ajax.cursor;

        _mfpOn(CLOSE_EVENT + '.' + AJAX_NS, _destroyAjaxRequest);
        _mfpOn('BeforeChange.' + AJAX_NS, _destroyAjaxRequest);
      },
      getAjax : function(item) {

        if (_ajaxCur)
          _body.addClass(_ajaxCur);

        mfp.updateStatus('loading');

        var opts = $.extend({
          url : item.src,
          success : function(data, textStatus, jqXHR) {
            var temp = {
              data : data,
              xhr : jqXHR
            };

            _mfpTrigger('ParseAjax', temp);

            mfp.appendContent($(temp.data), AJAX_NS);

            item.finished = true;

            _removeAjaxCursor();

            mfp._setFocus();

            setTimeout(function() {
              mfp.wrap.addClass(READY_CLASS);
            }, 16);

            mfp.updateStatus('ready');

            _mfpTrigger('AjaxContentAdded');
          },
          error : function() {
            _removeAjaxCursor();
            item.finished = item.loadError = true;
            mfp.updateStatus('error', mfp.st.ajax.tError.replace('%url%',
                item.src));
          }
        }, mfp.st.ajax.settings);

        mfp.req = $.ajax(opts);

        return '';
      }
    }
  });

  /* >>ajax */

  /* >>image */
  var _imgInterval, _getTitle = function(item) {
    if (item.data && item.data.title !== undefined)
      return item.data.title;

    var src = mfp.st.image.titleSrc;

    if (src) {
      if ($.isFunction(src)) {
        return src.call(mfp, item);
      } else if (item.el) {
        return item.el.attr(src) || '';
      }
    }
    return '';
  };

  $.magnificPopup.registerModule('image', {

    options : {
      markup : '<div class="mfp-figure">' + '<div class="mfp-close"></div>'
          + '<figure>' + '<div class="mfp-img"></div>' + '<figcaption>'
          + '<div class="mfp-bottom-bar">' + '<div class="mfp-title"></div>'
          + '<div class="mfp-counter"></div>' + '</div>' + '</figcaption>'
          + '</figure>' + '</div>',
      cursor : 'mfp-zoom-out-cur',
      titleSrc : 'title',
      verticalFit : true,
      tError : '<a href="%url%">The image</a> could not be loaded.'
    },

    proto : {
      initImage : function() {
        var imgSt = mfp.st.image, ns = '.image';

        mfp.types.push('image');

        _mfpOn(OPEN_EVENT + ns, function() {
          if (mfp.currItem.type === 'image' && imgSt.cursor) {
            _body.addClass(imgSt.cursor);
          }
        });

        _mfpOn(CLOSE_EVENT + ns, function() {
          if (imgSt.cursor) {
            _body.removeClass(imgSt.cursor);
          }
          _window.off('resize' + EVENT_NS);
        });

        _mfpOn('Resize' + ns, mfp.resizeImage);
        if (mfp.isLowIE) {
          _mfpOn('AfterChange', mfp.resizeImage);
        }
      },
      resizeImage : function() {
        var item = mfp.currItem;
        if (!item || !item.img)
          return;

        if (mfp.st.image.verticalFit) {
          var decr = 0;
          // fix box-sizing in ie7/8
          if (mfp.isLowIE) {
            decr = parseInt(item.img.css('padding-top'), 10)
                + parseInt(item.img.css('padding-bottom'), 10);
          }
          item.img.css('max-height', mfp.wH - decr);
        }
      },
      _onImageHasSize : function(item) {
        if (item.img) {

          item.hasSize = true;

          if (_imgInterval) {
            clearInterval(_imgInterval);
          }

          item.isCheckingImgSize = false;

          _mfpTrigger('ImageHasSize', item);

          if (item.imgHidden) {
            if (mfp.content)
              mfp.content.removeClass('mfp-loading');

            item.imgHidden = false;
          }

        }
      },

      /**
       * Function that loops until the image has size to display elements that
       * rely on it asap
       */
      findImageSize : function(item) {

        var counter = 0, img = item.img[0], mfpSetInterval = function(delay) {

          if (_imgInterval) {
            clearInterval(_imgInterval);
          }
          // decelerating interval that checks for size of an image
          _imgInterval = setInterval(function() {
            if (img.naturalWidth > 0) {
              mfp._onImageHasSize(item);
              return;
            }

            if (counter > 200) {
              clearInterval(_imgInterval);
            }

            counter++;
            if (counter === 3) {
              mfpSetInterval(10);
            } else if (counter === 40) {
              mfpSetInterval(50);
            } else if (counter === 100) {
              mfpSetInterval(500);
            }
          }, delay);
        };

        mfpSetInterval(1);
      },

      getImage : function(item, template) {

        var guard = 0,

        // image load complete handler
        onLoadComplete = function() {
          if (item) {
            if (item.img[0].complete) {
              item.img.off('.mfploader');

              if (item === mfp.currItem) {
                mfp._onImageHasSize(item);

                mfp.updateStatus('ready');
              }

              item.hasSize = true;
              item.loaded = true;

              _mfpTrigger('ImageLoadComplete');

            } else {
              // if image complete check fails 200 times (20 sec), we assume
              // that there was an error.
              guard++;
              if (guard < 200) {
                setTimeout(onLoadComplete, 100);
              } else {
                onLoadError();
              }
            }
          }
        },

        // image error handler
        onLoadError = function() {
          if (item) {
            item.img.off('.mfploader');
            if (item === mfp.currItem) {
              mfp._onImageHasSize(item);
              mfp
                  .updateStatus('error', imgSt.tError
                      .replace('%url%', item.src));
            }

            item.hasSize = true;
            item.loaded = true;
            item.loadError = true;
          }
        }, imgSt = mfp.st.image;

        var el = template.find('.mfp-img');
        if (el.length) {
          var img = document.createElement('img');
          img.className = 'mfp-img';
          item.img = $(img).on('load.mfploader', onLoadComplete).on(
              'error.mfploader', onLoadError);
          img.src = item.src;

          // without clone() "error" event is not firing when IMG is replaced by
          // new IMG
          // TODO: find a way to avoid such cloning
          if (el.is('img')) {
            item.img = item.img.clone();
          }

          img = item.img[0];
          if (img.naturalWidth > 0) {
            item.hasSize = true;
          } else if (!img.width) {
            item.hasSize = false;
          }
        }

        mfp._parseMarkup(template, {
          title : _getTitle(item),
          img_replaceWith : item.img
        }, item);

        mfp.resizeImage();

        if (item.hasSize) {
          if (_imgInterval)
            clearInterval(_imgInterval);

          if (item.loadError) {
            template.addClass('mfp-loading');
            mfp.updateStatus('error', imgSt.tError.replace('%url%', item.src));
          } else {
            template.removeClass('mfp-loading');
            mfp.updateStatus('ready');
          }
          return template;
        }

        mfp.updateStatus('loading');
        item.loading = true;

        if (!item.hasSize) {
          item.imgHidden = true;
          template.addClass('mfp-loading');
          mfp.findImageSize(item);
        }

        return template;
      }
    }
  });

  /* >>image */

  /* >>zoom */
  var hasMozTransform, getHasMozTransform = function() {
    if (hasMozTransform === undefined) {
      hasMozTransform = document.createElement('p').style.MozTransform !== undefined;
    }
    return hasMozTransform;
  };

  $.magnificPopup
      .registerModule(
          'zoom',
          {

            options : {
              enabled : false,
              easing : 'ease-in-out',
              duration : 300,
              opener : function(element) {
                return element.is('img') ? element : element.find('img');
              }
            },

            proto : {

              initZoom : function() {
                var zoomSt = mfp.st.zoom, ns = '.zoom', image;

                if (!zoomSt.enabled || !mfp.supportsTransition) {
                  return;
                }

                var duration = zoomSt.duration, getElToAnimate = function(image) {
                  var newImg = image.clone().removeAttr('style').removeAttr(
                      'class').addClass('mfp-animated-image'), transition = 'all '
                      + (zoomSt.duration / 1000) + 's ' + zoomSt.easing, cssObj = {
                    position : 'fixed',
                    zIndex : 9999,
                    left : 0,
                    top : 0,
                    '-webkit-backface-visibility' : 'hidden'
                  }, t = 'transition';

                  cssObj['-webkit-' + t] = cssObj['-moz-' + t] = cssObj['-o-'
                      + t] = cssObj[t] = transition;

                  newImg.css(cssObj);
                  return newImg;
                }, showMainContent = function() {
                  mfp.content.css('visibility', 'visible');
                }, openTimeout, animatedImg;

                _mfpOn('BuildControls' + ns, function() {
                  if (mfp._allowZoom()) {

                    clearTimeout(openTimeout);
                    mfp.content.css('visibility', 'hidden');

                    // Basically, all code below does is clones existing image,
                    // puts in on top of the current one and animated it

                    image = mfp._getItemToZoom();

                    if (!image) {
                      showMainContent();
                      return;
                    }

                    animatedImg = getElToAnimate(image);

                    animatedImg.css(mfp._getOffset());

                    mfp.wrap.append(animatedImg);

                    openTimeout = setTimeout(function() {
                      animatedImg.css(mfp._getOffset(true));
                      openTimeout = setTimeout(function() {

                        showMainContent();

                        setTimeout(function() {
                          animatedImg.remove();
                          image = animatedImg = null;
                          _mfpTrigger('ZoomAnimationEnded');
                        }, 16); // avoid blink when switching images

                      }, duration); // this timeout equals animation duration

                    }, 16); // by adding this timeout we avoid short glitch at
                    // the beginning of animation

                    // Lots of timeouts...
                  }
                });
                _mfpOn(BEFORE_CLOSE_EVENT + ns, function() {
                  if (mfp._allowZoom()) {

                    clearTimeout(openTimeout);

                    mfp.st.removalDelay = duration;

                    if (!image) {
                      image = mfp._getItemToZoom();
                      if (!image) {
                        return;
                      }
                      animatedImg = getElToAnimate(image);
                    }

                    animatedImg.css(mfp._getOffset(true));
                    mfp.wrap.append(animatedImg);
                    mfp.content.css('visibility', 'hidden');

                    setTimeout(function() {
                      animatedImg.css(mfp._getOffset());
                    }, 16);
                  }

                });

                _mfpOn(CLOSE_EVENT + ns, function() {
                  if (mfp._allowZoom()) {
                    showMainContent();
                    if (animatedImg) {
                      animatedImg.remove();
                    }
                    image = null;
                  }
                });
              },

              _allowZoom : function() {
                return mfp.currItem.type === 'image';
              },

              _getItemToZoom : function() {
                if (mfp.currItem.hasSize) {
                  return mfp.currItem.img;
                } else {
                  return false;
                }
              },

              // Get element postion relative to viewport
              _getOffset : function(isLarge) {
                var el;
                if (isLarge) {
                  el = mfp.currItem.img;
                } else {
                  el = mfp.st.zoom.opener(mfp.currItem.el || mfp.currItem);
                }

                var offset = el.offset();
                var paddingTop = parseInt(el.css('padding-top'), 10);
                var paddingBottom = parseInt(el.css('padding-bottom'), 10);
                offset.top -= ($(window).scrollTop() - paddingTop);

                /*
                 *
                 * Animating left + top + width/height looks glitchy in Firefox,
                 * but perfect in Chrome. And vice-versa.
                 *
                 */
                var obj = {
                  width : el.width(),
                  // fix Zepto height+padding issue
                  height : (_isJQ ? el.innerHeight() : el[0].offsetHeight)
                      - paddingBottom - paddingTop
                };

                // I hate to do this, but there is no another option
                if (getHasMozTransform()) {
                  obj['-moz-transform'] = obj['transform'] = 'translate('
                      + offset.left + 'px,' + offset.top + 'px)';
                } else {
                  obj.left = offset.left;
                  obj.top = offset.top;
                }
                return obj;
              }

            }
          });

  /* >>zoom */

  /* >>iframe */

  var IFRAME_NS = 'iframe', _emptyPage = '//about:blank',

  _fixIframeBugs = function(isShowing) {
    if (mfp.currTemplate[IFRAME_NS]) {
      var el = mfp.currTemplate[IFRAME_NS].find('iframe');
      if (el.length) {
        // reset src after the popup is closed to avoid "video keeps playing
        // after popup is closed" bug
        if (!isShowing) {
          el[0].src = _emptyPage;
        }

        // IE8 black screen bug fix
        if (mfp.isIE8) {
          el.css('display', isShowing ? 'block' : 'none');
        }
      }
    }
  };

  $.magnificPopup
      .registerModule(
          IFRAME_NS,
          {

            options : {
              markup : '<div class="mfp-iframe-scaler">'
                  + '<div class="mfp-close"></div>'
                  + '<iframe class="mfp-iframe" src="//about:blank" frameborder="0" allowfullscreen></iframe>'
                  + '</div>',

              srcAction : 'iframe_src',

              // we don't care and support only one default type of URL by
              // default
              patterns : {
                youtube : {
                  index : 'youtube.com',
                  id : 'v=',
                  src : '//www.youtube.com/embed/%id%?autoplay=1'
                },
                vimeo : {
                  index : 'vimeo.com/',
                  id : '/',
                  src : '//player.vimeo.com/video/%id%?autoplay=1'
                },
                gmaps : {
                  index : '//maps.google.',
                  src : '%id%&output=embed'
                }
              }
            },

            proto : {
              initIframe : function() {
                mfp.types.push(IFRAME_NS);

                _mfpOn('BeforeChange', function(e, prevType, newType) {
                  if (prevType !== newType) {
                    if (prevType === IFRAME_NS) {
                      _fixIframeBugs(); // iframe if removed
                    } else if (newType === IFRAME_NS) {
                      _fixIframeBugs(true); // iframe is showing
                    }
                  }// else {
                  // iframe source is switched, don't do anything
                  // }
                });

                _mfpOn(CLOSE_EVENT + '.' + IFRAME_NS, function() {
                  _fixIframeBugs();
                });
              },

              getIframe : function(item, template) {
                var embedSrc = item.src;
                var iframeSt = mfp.st.iframe;

                $.each(iframeSt.patterns, function() {
                  if (embedSrc.indexOf(this.index) > -1) {
                    if (this.id) {
                      if (typeof this.id === 'string') {
                        embedSrc = embedSrc.substr(embedSrc
                            .lastIndexOf(this.id)
                            + this.id.length, embedSrc.length);
                      } else {
                        embedSrc = this.id.call(this, embedSrc);
                      }
                    }
                    embedSrc = this.src.replace('%id%', embedSrc);
                    return false; // break;
                  }
                });

                var dataObj = {};
                if (iframeSt.srcAction) {
                  dataObj[iframeSt.srcAction] = embedSrc;
                }
                mfp._parseMarkup(template, dataObj, item);

                mfp.updateStatus('ready');

                return template;
              }
            }
          });

  /* >>iframe */

  /* >>gallery */
  /**
   * Get looped index depending on number of slides
   */
  var _getLoopedId = function(index) {
    var numSlides = mfp.items.length;
    if (index > numSlides - 1) {
      return index - numSlides;
    } else if (index < 0) {
      return numSlides + index;
    }
    return index;
  }, _replaceCurrTotal = function(text, curr, total) {
    return text.replace(/%curr%/gi, curr + 1).replace(/%total%/gi, total);
  };

  $.magnificPopup
      .registerModule(
          'gallery',
          {

            options : {
              enabled : false,
              arrowMarkup : '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>',
              preload : [ 0, 2 ],
              navigateByImgClick : true,
              arrows : true,

              tPrev : 'Previous (Left arrow key)',
              tNext : 'Next (Right arrow key)',
              tCounter : '%curr% of %total%'
            },

            proto : {
              initGallery : function() {

                var gSt = mfp.st.gallery, ns = '.mfp-gallery', supportsFastClick = Boolean($.fn.mfpFastClick);

                mfp.direction = true; // true - next, false - prev

                if (!gSt || !gSt.enabled)
                  return false;

                _wrapClasses += ' mfp-gallery';

                _mfpOn(OPEN_EVENT + ns, function() {

                  if (gSt.navigateByImgClick) {
                    mfp.wrap.on('click' + ns, '.mfp-img', function() {
                      if (canNext()) {
                        mfp.next();
                        return false;
                      }
                    });
                  }

                  _document.on('keydown' + ns, function(e) {
                    if (e.keyCode === 37 && canPrevious()) {
                      mfp.prev();
                    } else if (e.keyCode === 39 && canNext()) {
                      mfp.next();
                    }
                  });
                });

                _mfpOn('UpdateStatus' + ns, function(e, data) {
                  if (data.text) {
                    data.text = _replaceCurrTotal(data.text,
                        mfp.currItem.index, mfp.items.length);
                  }
                });

                _mfpOn(MARKUP_PARSE_EVENT + ns, function(e, element, values,
                    item) {
                  var l = mfp.items.length;
                  values.counter = l > 1 ? _replaceCurrTotal(gSt.tCounter,
                      item.index, l) : '';
                });

                _mfpOn(
                    'BuildControls' + ns,
                    function() {
                      if (mfp.items.length > 1 && gSt.arrows) {
                        var markup = gSt.arrowMarkup, arrowLeft = mfp.arrowLeft = $(
                            markup.replace(/%title%/gi, gSt.tPrev).replace(
                                /%dir%/gi, 'left')).addClass(
                            PREVENT_CLOSE_CLASS), arrowRight = mfp.arrowRight = $(
                            markup.replace(/%title%/gi, gSt.tNext).replace(
                                /%dir%/gi, 'right')).addClass(
                            PREVENT_CLOSE_CLASS);

                        var eName = supportsFastClick ? 'mfpFastClick'
                            : 'click';
                        arrowLeft[eName](function() {
                          mfp.prev();
                        });
                        arrowRight[eName](function() {
                          mfp.next();
                        });

                        // Polyfill for :before and :after (adds elements with
                        // classes mfp-a and mfp-b)
                        if (mfp.isIE7) {
                          _getEl('b', arrowLeft[0], false, true);
                          _getEl('a', arrowLeft[0], false, true);
                          _getEl('b', arrowRight[0], false, true);
                          _getEl('a', arrowRight[0], false, true);
                        }

                        if (canNext()) {
                          if (!mfp.container.has('.mfp-arrow-right').length) {
                            mfp.container.append(arrowRight);
                          }
                        } else {
                          mfp.container.find('.mfp-arrow-right').remove();
                        }
                        if (canPrevious()) {
                          if (!mfp.container.has('.mfp-arrow-left').length) {
                            mfp.container.append(arrowLeft);
                          }
                        } else {
                          mfp.container.find('.mfp-arrow-left').remove();
                        }
                      }
                    });

                _mfpOn(CHANGE_EVENT + ns, function() {
                  if (mfp._preloadTimeout)
                    clearTimeout(mfp._preloadTimeout);

                  mfp._preloadTimeout = setTimeout(function() {
                    mfp.preloadNearbyImages();
                    mfp._preloadTimeout = null;
                  }, 16);
                });

                _mfpOn(CLOSE_EVENT + ns, function() {
                  _document.off(ns);
                  mfp.wrap.off('click' + ns);

                  if (mfp.arrowLeft && supportsFastClick) {
                    mfp.arrowLeft.add(mfp.arrowRight).destroyMfpFastClick();
                  }
                  mfp.arrowRight = mfp.arrowLeft = null;
                });

              },
              next : function() {
                if (mfp.st.endOfPageCallback) {
                  if (mfp.index == (mfp.items.length - 1)) {
                    mfp.st.endOfPageCallback.apply();
                    this.close();
                    return;
                  }
                }
                var updateControls = false;
                if (mfp.index == 0 || mfp.index == (mfp.items.length - 2)) {
                  updateControls = true;
                }
                mfp.direction = true;
                mfp.index = _getLoopedId(mfp.index + 1);
                mfp.updateItemHTML();
                if (updateControls) {
                  _mfpTrigger('BuildControls');
                }
              },
              prev : function() {
                if (mfp.st.startOfPageCallback) {
                  if (mfp.index == 0) {
                    mfp.st.startOfPageCallback.apply();
                    this.close();
                    return;
                  }
                }
                var updateControls = false;
                if (mfp.index == 1 || mfp.index == mfp.items.length - 1) {
                  updateControls = true;
                }
                mfp.direction = false;
                mfp.index = _getLoopedId(mfp.index - 1);
                mfp.updateItemHTML();
                if (updateControls) {
                  _mfpTrigger('BuildControls');
                }
              },
              goTo : function(newIndex) {
                mfp.direction = (newIndex >= mfp.index);
                mfp.index = newIndex;
                mfp.updateItemHTML();
              },
              preloadNearbyImages : function() {
                var p = mfp.st.gallery.preload, preloadBefore = Math.min(p[0],
                    mfp.items.length), preloadAfter = Math.min(p[1],
                    mfp.items.length), i;

                for (i = 1; i <= (mfp.direction ? preloadAfter : preloadBefore); i++) {
                  mfp._preloadItem(mfp.index + i);
                }
                for (i = 1; i <= (mfp.direction ? preloadBefore : preloadAfter); i++) {
                  mfp._preloadItem(mfp.index - i);
                }
              },
              _preloadItem : function(index) {
                index = _getLoopedId(index);

                if (mfp.items[index].preloaded) {
                  return;
                }

                var item = mfp.items[index];
                if (!item.parsed) {
                  item = mfp.parseEl(index);
                }

                _mfpTrigger('LazyLoad', item);

                if (item.type === 'image') {
                  item.img = $('<img class="mfp-img" />').on('load.mfploader',
                      function() {
                        item.hasSize = true;
                      }).on('error.mfploader', function() {
                    item.hasSize = true;
                    item.loadError = true;
                    _mfpTrigger('LazyLoadError', item);
                  }).attr('src', item.src);
                }

                item.preloaded = true;
              }
            }
          });

  /*
   Touch Support that might be implemented some day

   addSwipeGesture: function() {
   var startX,
   moved,
   multipleTouches;

   return;

   var namespace = '.mfp',
   addEventNames = function(pref, down, move, up, cancel) {
   mfp._tStart = pref + down + namespace;
   mfp._tMove = pref + move + namespace;
   mfp._tEnd = pref + up + namespace;
   mfp._tCancel = pref + cancel + namespace;
   };

   if(window.navigator.msPointerEnabled) {
   addEventNames('MSPointer', 'Down', 'Move', 'Up', 'Cancel');
   } else if('ontouchstart' in window) {
   addEventNames('touch', 'start', 'move', 'end', 'cancel');
   } else {
   return;
   }
   _window.on(mfp._tStart, function(e) {
   var oE = e.originalEvent;
   multipleTouches = moved = false;
   startX = oE.pageX || oE.changedTouches[0].pageX;
   }).on(mfp._tMove, function(e) {
   if(e.originalEvent.touches.length > 1) {
   multipleTouches = e.originalEvent.touches.length;
   } else {
   //e.preventDefault();
   moved = true;
   }
   }).on(mfp._tEnd + ' ' + mfp._tCancel, function(e) {
   if(moved && !multipleTouches) {
   var oE = e.originalEvent,
   diff = startX - (oE.pageX || oE.changedTouches[0].pageX);

   if(diff > 20) {
   mfp.next();
   } else if(diff < -20) {
   mfp.prev();
   }
   }
   });
   },
   */

  /*>>gallery*/

  /*>>retina*/

  var RETINA_NS = 'retina';

  $.magnificPopup.registerModule(RETINA_NS, {
    options : {
      replaceSrc : function(item) {
        return item.src.replace(/\.\w+$/, function(m) {
          return '@2x' + m;
        });
      },
      ratio : 1
    // Function or number.  Set to 1 to disable.
    },
    proto : {
      initRetina : function() {
        if (window.devicePixelRatio > 1) {

          var st = mfp.st.retina, ratio = st.ratio;

          ratio = !isNaN(ratio) ? ratio : ratio();

          if (ratio > 1) {
            _mfpOn('ImageHasSize' + '.' + RETINA_NS, function(e, item) {
              item.img.css({
                'max-width' : item.img[0].naturalWidth / ratio,
                'width' : '100%'
              });
            });
            _mfpOn('ElementParse' + '.' + RETINA_NS, function(e, item) {
              item.src = st.replaceSrc(item, ratio);
            });
          }
        }

      }
    }
  });

  /*>>retina*/

  /*>>fastclick*/
  /**
   * FastClick event implementation. (removes 300ms delay on touch devices)
   * Based on https://developers.google.com/mobile/articles/fast_buttons
   *
   * You may use it outside the Magnific Popup by calling just:
   *
   * $('.your-el').mfpFastClick(function() {
   *     console.log('Clicked!');
   * });
   *
   * To unbind:
   * $('.your-el').destroyMfpFastClick();
   *
   *
   * Note that it's a very basic and simple implementation, it blocks ghost click on the same element where it was bound.
   * If you need something more advanced, use plugin by FT Labs https://github.com/ftlabs/fastclick
   *
   */

  (function() {
    var ghostClickDelay = 1000, supportsTouch = 'ontouchstart' in window, unbindTouchMove = function() {
      _window.off('touchmove' + ns + ' touchend' + ns);
    }, eName = 'mfpFastClick', ns = '.' + eName;

    // As Zepto.js doesn't have an easy way to add custom events (like jQuery), so we implement it in this way
    $.fn.mfpFastClick = function(callback) {

      return $(this).each(
          function() {

            var elem = $(this), lock;

            if (supportsTouch) {

              var timeout, startX, startY, pointerMoved, point, numPointers;

              elem.on('touchstart' + ns, function(e) {
                pointerMoved = false;
                numPointers = 1;

                point = e.originalEvent ? e.originalEvent.touches[0]
                    : e.touches[0];
                startX = point.clientX;
                startY = point.clientY;

                _window.on(
                    'touchmove' + ns,
                    function(e) {
                      point = e.originalEvent ? e.originalEvent.touches
                          : e.touches;
                      numPointers = point.length;
                      point = point[0];
                      if (Math.abs(point.clientX - startX) > 10
                          || Math.abs(point.clientY - startY) > 10) {
                        pointerMoved = true;
                        unbindTouchMove();
                      }
                    }).on('touchend' + ns, function(e) {
                  unbindTouchMove();
                  if (pointerMoved || numPointers > 1) {
                    return;
                  }
                  lock = true;
                  e.preventDefault();
                  clearTimeout(timeout);
                  timeout = setTimeout(function() {
                    lock = false;
                  }, ghostClickDelay);
                  callback();
                });
              });

            }

            elem.on('click' + ns, function() {
              if (!lock) {
                callback();
              }
            });
          });
    };

    $.fn.destroyMfpFastClick = function() {
      $(this).off('touchstart' + ns + ' click' + ns);
      if (supportsTouch)
        _window.off('touchmove' + ns + ' touchend' + ns);
    };
  })();

  /*>>fastclick*/
  _checkInstance();
})(window.jQuery || window.Zepto);
var nuxeo = nuxeo || {}

nuxeo.lightbox = (function(m) {

  var currentLocale;

  function getCurrentLocale() {
    if (undefined == currentLocale) {
      var cookieLocale = jQuery.cookie('org.jboss.seam.core.Locale');
      if (cookieLocale) {
        currentLocale = cookieLocale;
      } else {
        var navLang = navigator.language || navigator.userLanguage;
        if (navLang) {
          currentLocale = navLang;
        }
      }
      if (currentLocale) {
        currentLocale = currentLocale.split(new RegExp("[-_]+", "g"))[0];
      } else {
        currentLocale = 'en';
      }
    }
    return currentLocale;
  }

  function formatDocWithPicture(doc, img) {
    var creationDate = new Date(doc.properties['dc:created']);
    var maxWidth = jQuery(window).width() - 120;
    var maxHeight = jQuery(window).height() - 180;
    var markup = '<div class="mfp-figure">'
        + '<figure><img class="mfp-img" src="'
        + img
        + '" style="margin-top:-40px;max-width:'
        + maxWidth
        + 'px;max-height:'
        + maxHeight
        + 'px"><figcaption>'
        + '<div class="mfp-bottom-bar" style="top:auto;bottom:0;left:60px;position:fixed;padding-bottom:20px;max-width:'
        + maxWidth
        + 'px;"><div class="mfp-title">'
        + doc.title
        + '<small style="padding-top:5px;overflow:auto;max-height:50px">'
        + (doc.properties['dc:description'] === null ? ''
            : doc.properties['dc:description'])
        + '</small></div><div class="mfp-counter">'
        + doc.properties['dc:creator'] + ' '
        + creationDate.toLocaleDateString(getCurrentLocale()) + '</div>'
        + '</div></figcaption></figure></div>';

    return markup;
  }

  m.requestedSchema = 'dublincore, common, picture';

  m.setRequestHeaders = function(request) {
    request.setRequestHeader("X-NXDocumentProperties",
        nuxeo.lightbox.requestedSchema);
  };

  m.formatDefaultDoc = function(doc) {
    return formatDocWithPicture(doc, nxContextPath + '/img/lightbox_placeholder.png');
  };

  m.formatPictureDoc = function(doc) {
    var view;
    for (var i = 0; i < doc.properties['picture:views'].length; i++) {
        if (doc.properties['picture:views'][i].title === 'OriginalJpeg') {
            view = doc.properties['picture:views'][i];
            break;
        }
    }
    if (view === undefined) {
        return formatDefaultDoc(doc);
    }
    return formatDocWithPicture(doc,
            view.content.data);
  };

  m.formatUnknownDoc = function(doc) {
    var markup = '<div>' + '<h3>Not supported yet!</h3>' + '<div>';
    return markup;
  };

  m.formatVideoDoc = function(doc) {
    return formatDocWithPicture(doc, nxContextPath + '/img/lightbox_placeholder.png');
  };

  m.formatDoc = function(doc) {
    if (doc.facets.indexOf('Picture') > -1) {
      return nuxeo.lightbox.formatPictureDoc(doc);
    } else if (doc.facets.indexOf('Video') > -1) {
      return nuxeo.lightbox.formatVideoDoc(doc);
    } else {
      return nuxeo.lightbox.formatDefaultDoc(doc);
    }
  };

  return m;

}(nuxeo.lightbox || {}));
(function($) {

  var defaultArgs = {
    type : 'ajax',
    ajax: {
      settings: {
        beforeSend: function (request) {
          nuxeo.lightbox.setRequestHeaders(request);
        }
      }
    },
    callbacks: {
      parseAjax: function(mfpResponse) {
        var jsonDoc = mfpResponse.data;
        mfpResponse.data = nuxeo.lightbox.formatDoc(jsonDoc);
      }
    },
    gallery : {
      enabled : true,
      navigateByImgClick : true,
      preload : [ 0, 1 ],
    },
    closeOnContentClick : false,
    closeBtnInside : false,
    fixedContentPos : true,
    image : {
      verticalFit : true
    }
  };

  $.fn.initNxCv = function(args) {
    jQuery.extend(true, args, defaultArgs);
    jQuery(this).find('a.image-popup').magnificPopup(
        args);
  }

  $.fn.openLightBoxAfterNP = function() {
    jQuery(this).find('a.image-popup').magnificPopup(
        'open');
  }

  $.fn.openLightBoxAfterPP = function() {
    var nbItems = jQuery(this).find('a.image-popup')
        .size();
    jQuery(this).find('a.image-popup').magnificPopup(
        'open', nbItems - 1);
  }

  $.initNxCv = $.fn.initNxCv;

  $.openLightBoxAfterNP = $.fn.openLightBoxAfterNP;

  $.openLightBoxAfterPP = $.fn.openLightBoxAfterPP;

})(jQuery);
var nuxeo = nuxeo || {};

nuxeo.documentsImport = (function(m) {

  m.createDocumentsImportDocumentHandler = function(batchId) {
    var handler = function DropZoneUIHandler(idx, dropZoneId, options, targetSelectedCB, cancelCB) {
      this.idx = idx;
      this.dropZoneId = dropZoneId;
      this.nxUploadStarted = 0;
      this.batchId = batchId;
      this.url = options.url;
      this.ctx = options.dropContext;
      this.uploadedFiles = [];
      this.targetSelectedCB = targetSelectedCB;
      this.opts = options;
      this.cancelCB = cancelCB;
    };
    handler.prototype = {
      batchStarted: function() {
        jQuery("#" + this.dropZoneId).html();
        // deactivate import button
        m.disableBulkImportButton();
        this.selectTargetZone();
        return this.batchId;
      },
      batchFinished: function(batchId) {
        // activate import button
        m.enableBulkImportButton();
      },
      uploadStarted: function(fileIndex, file) {
        this.nxUploadStarted++;

        var filenameSpan = jQuery("<span />", {
          "id": "dropzone-info-" + this.idx + "-" + fileIndex,
          "class": "droppedItemInProgress"
        }).html(file.name);
        var progressSpan = jQuery("<span />", {
          "id": "dropzone-speed-" + this.idx + "-" + fileIndex,
          "class": "progressBar"
        });
        var progressContainerSpan = jQuery("<span />", {
          "class": "progressBarContainer"
        }).append(progressSpan);

        var fileDiv = jQuery("<div />", {
          "id": "dropzone-info-item-" + this.idx + "-" + fileIndex,
          "class": "simpleBox"
        }).append(filenameSpan).append(progressContainerSpan);

        var dropZone = jQuery("#" + this.dropZoneId);
        dropZone.find(".jsTips").remove();
        dropZone.append(fileDiv);
      },

      uploadFinished: function(fileIndex, file, duration) {
        var fileSpan = jQuery("<span />", {
          "class": "droppedItem"
        });
        fileSpan.html(file.name + " (" + getReadableFileSizeString(file.size) + ")");

        jQuery("#dropzone-info-item-" + this.idx + "-" + fileIndex).html(fileSpan);

        //jQuery("#dropzone-bar-msg").html(this.nxUploaded + "/" + this.nxUploadStarted);

        this.nxUploaded++;
        this.uploadedFiles.push(file);
      },
      fileUploadProgressUpdated: function(fileIndex, file, newProgress){
        jQuery("#dropzone-speed-" + this.idx + "-" + fileIndex).css("width", newProgress + "%");
      },
      fileUploadSpeedUpdated: function(fileIndex, file, kbPerSecond) {
      },
      selectTargetZone: function() {
        var dzone = jQuery("#" + this.dropZoneId); // XXX
        dzone.addClass("dropzoneTarget");
        dzone.addClass("dropzoneFilled");
        this.targetSelectedCB(this.dropZoneId);
      },
      cancelUpload: function() {
        var dzone = jQuery("#" + this.dropZoneId);
        dzone.removeClass("dropzoneTarget");
        dzone.removeClass("dropzoneTargetExtended");
        var dragoverTimer = dzone.data("dragoverTimer");
        if (dragoverTimer) {
          window.clearTimeout(dragoverTimer);
          dzone.removeData("dragoverTimer");
        }
        this.cancelCB();
        if (this.batchId) {
          var targetUrl = this.url + 'batch/drop/' + this.batchId;
          jQuery.ajax({
            type: 'GET',
            contentType : 'application/json+nxrequest',
            url: targetUrl,
            timeout: 10000});
        }
      },
      enableExtendedMode: function() {
        // do nothing
      }
    };

    return handler;
  };

  m.disableBulkImportButton = function() {
    jQuery(".jsDocumentsImportButton").attr("disabled", "disabled");
  };

  m.enableBulkImportButton = function() {
    var ele = jQuery(".jsDocumentsImportButton");
    if (jQuery("[data-selectedimportfolder='true']").length > 0) {
      ele.removeAttr("disabled");
      ele.removeClass("disabled");
    }
  };

  m.onClearPressed = function() {
    if (jQuery("a.rf-fu-itm-lnk").length == 0)  {
     m.disableBulkImportButton();
    }
  };

  return m

}(nuxeo.documentsImport || {}));
// Script patching the JSF library to let richfaces parameters go through
// when performing an ajax request in a multipart form, see NXP-14230.
// The idea is to trick the js call into thinking form is not multipart only
// while building the transport, to avoid using a frame transport.
if (window.jsf) {
  var jsfAjaxRequest = jsf.ajax.request;
  var jsfAjaxResponse = jsf.ajax.response;
  var getForm = function getForm(element) {
    if (element) {
      var form = jQuery(element).parents("form");
      if (form.length === 0) {
        form = jQuery(document.forms[0]);
      }
      return form;
    }
    return null;
  };
  jsf.ajax.request = function request(source, event, options) {
    var form = getForm(source);
    var cheating = false;
    if (form && form.attr("enctype") == "multipart/form-data") {
      form.attr("enctype", "");
      cheating = true;
    }
    var res = jsfAjaxRequest(source, event, options);
    if (cheating) {
      form.attr("enctype", "multipart/form-data");
    }
    return res;
  }
}function AutomationWrapper(operationId, opts) {
  this.operationId = operationId;
  this.opts = opts;
  this.headers = {};
}

AutomationWrapper.prototype.addParameter = function(name, value){
  this.opts.automationParams.params[name]=value;
  return this;
};

AutomationWrapper.prototype.addParameters = function(params){
  jQuery.extend(this.opts.automationParams.params,params);
  return this;
};

AutomationWrapper.prototype.context = function(name, value){
  this.opts.automationParams.context[name]=value;
  return this;
};

AutomationWrapper.prototype.setContext = function(ctxParams){
  jQuery.extend(this.opts.automationParams.context, ctxParams);
  return this;
};

AutomationWrapper.prototype.setTimeout = function(timeout){
  this.opts.execTimeout=timeout;
  return this;
};

AutomationWrapper.prototype.setHeaders = function(headers){
  jQuery.extend(this.headers, headers);
  return this;
};

AutomationWrapper.prototype.execute = function(successCB, failureCB, voidOp){
  var targetUrl = this.opts.url;
  if (targetUrl.indexOf("/", targetUrl.length - 1)==-1) {
    targetUrl = targetUrl + "/";
  }
  targetUrl =  targetUrl + this.operationId;

  if (!voidOp) {
    voidOp=false;
  }
  var timeout = 5+ (this.opts.execTimeout/1000)|0;
  var documentSchemas = this.opts.documentSchemas;
  var repo = this.opts.repository;
  var self = this;
  jQuery.ajax({
      type: 'POST',
      contentType : 'application/json+nxrequest',
      data: JSON.stringify(this.opts.automationParams),
      beforeSend : function (xhr) {
          xhr.setRequestHeader('X-NXVoidOperation', voidOp);
          xhr.setRequestHeader('Nuxeo-Transaction-Timeout', timeout);
          if (documentSchemas.length>0) {
              xhr.setRequestHeader('X-NXDocumentProperties',documentSchemas);
            }
          if (repo) {
              xhr.setRequestHeader('X-NXRepository', repo);
          }
          for (var key in self.headers) {
            xhr.setRequestHeader(key, self.headers[key]);
          }
      },
      url: targetUrl,
      timeout: this.opts.execTimeout,
      error: function(xhr, status, e) {
        if (failureCB) {
            failureCB(xhr,status,"No Data");
          } else {
            log("Failed to execute");
            log("Error, Status =" + status);
          }
      },
      success: function(data, status,xhr) {
        log("Executed OK");
        if (status=="success") {
          successCB(data,status,xhr);
        } else {
          if (failureCB) {
            failureCB(xhr,status,"No Data");
          } else {
            log("Error, Status =" + status);
          }
        }
      }
    })
};

AutomationWrapper.prototype.executeGetBlob = function(successCB, failureCB, blobOp){

    var targetUrl = this.opts.url;
    if (targetUrl.indexOf("/", targetUrl.length - 1)==-1) {
      targetUrl = targetUrl + "/";
    }
    targetUrl =  targetUrl + this.operationId;

    if (!blobOp) {
      voidOp=false;
    }
    var timeout = 5+ (this.opts.execTimeout/1000)|0;
    var documentSchemas = this.opts.documentSchemas;
    var repo = this.opts.repository;
    jQuery.ajax({
        type: 'POST',
        contentType : 'application/json+nxrequest',
        data: JSON.stringify(this.opts.automationParams),
        beforeSend : function (xhr) {
            xhr.setRequestHeader('CTYPE_MULTIPART_MIXED', blobOp);
            xhr.setRequestHeader('Nuxeo-Transaction-Timeout', timeout);
            if (documentSchemas.length>0) {
              xhr.setRequestHeader('X-NXDocumentProperties',documentSchemas);
            }
            if (repo) {
                xhr.setRequestHeader('X-NXRepository', repo);
            }
        },
        url: targetUrl,
        timeout: this.opts.execTimeout,
        error: function(xhr, status, e) {
          if (failureCB) {
              failureCB(xhr,status,"No Data");
            } else {
              log("Failed to execute");
              log("Error, Status =" + status);
            }
        },
        success: function(data, status,xhr) {
          log("Executed OK");
          if (status=="success") {
            successCB(data,status,xhr);
          } else {
            if (failureCB) {
              failureCB(xhr,status,"No Data");
            } else {
              log("Error, Status =" + status);
            }
          }
        }
      })
 };

AutomationWrapper.prototype.log = function (msg) {
  if (window.console) {
      //console.log(msg);
    }
};

AutomationWrapper.prototype.batchExecute = function(batchId, successCB, failureCB, voidOp){

  if (!voidOp) {
    voidOp=false;
  }
  this.addParameter("operationId", this.operationId);
  this.addParameter("batchId", batchId);

  var targetUrl = this.opts.url;
  var targetUrl = this.opts.url;
  if (targetUrl.indexOf("/", targetUrl.length - 1)==-1) {
    targetUrl = targetUrl + "/";
  }
  if (targetUrl.indexOf('/batch/execute')<0) {
    targetUrl = targetUrl + 'batch/execute';
  }
  var timeout = 5+ (this.opts.execTimeout/1000)|0;
  var documentSchemas = this.opts.documentSchemas;
  var repo = this.opts.repository;
  jQuery.ajax({
      type: 'POST',
      contentType : 'application/json+nxrequest',
      data: JSON.stringify(this.opts.automationParams),
      beforeSend : function (xhr) {
          xhr.setRequestHeader('X-NXVoidOperation', voidOp);
          xhr.setRequestHeader('Nuxeo-Transaction-Timeout', timeout);
          if (documentSchemas.length>0) {
              xhr.setRequestHeader('X-NXDocumentProperties',documentSchemas);
          }
          if (repo) {
              xhr.setRequestHeader('X-NXRepository', repo);
          }
      },
      url: targetUrl,
      timeout: this.opts.execTimeout,
      error: function(xhr, status, e) {
        log("Failed to execute");
        if (failureCB) {
          var errorMessage = null;
          if (xhr.response) {
            errorMessage =xhr.response;
            var parsedError = errorMessage;
            try {
              parsedError = JSON.parse(errorMessage);
              errorMessage = parsedError.error
            } catch (err) {
              // NOP
            }
          }
          failureCB(xhr,status,errorMessage);
        } else {
            log("Error, Status =" + status);
        }
      },
      success: function(data, status,xhr) {
        log("Executed OK : " + status);
        if (status=="success") {
          successCB(data,status,xhr);
        } else {
          console.log
            if (failureCB) {
                failureCB(xhr,status,"No Data");
              } else {
                log("Error, Status =" + status);
              }
        }
      }
    })
  };

(function($) {

   $.fn.automation = function ( operationId , options) {
      var opts = jQuery.extend(true, {}, $.fn.automation.defaults, options);
      return new AutomationWrapper(operationId, opts);
   }

   $.fn.automation.defaults = {
        url : nxContextPath + "/site/automation",
        execTimeout : 30000,
        uploadTimeout : 30000,
        documentSchemas : "dublincore",
        automationParams : {
           params : {},
           context : {}
       }
   }

 })(jQuery);
(function(){if(typeof Math.sgn=="undefined"){Math.sgn=function(z){return z==0?0:z>0?1:-1}}var k={subtract:function(A,z){return{x:A.x-z.x,y:A.y-z.y}},dotProduct:function(A,z){return(A.x*z.x)+(A.y*z.y)},square:function(z){return Math.sqrt((z.x*z.x)+(z.y*z.y))},scale:function(z,A){return{x:z.x*A,y:z.y*A}}},w=64,r=Math.pow(2,-w-1);var o=function(I,A){var F=[],H=f(I,A),C=A.length-1,z=(2*C)-1,E=p(H,z,F,0),J=k.subtract(I,A[0]),G=k.square(J),K=0;for(var D=0;D<E;D++){J=k.subtract(I,v(A,C,F[D],null,null));var B=k.square(J);if(B<G){G=B;K=F[D]}}J=k.subtract(I,A[C]);B=k.square(J);if(B<G){G=B;K=1}return{location:K,distance:G}};var b=function(z,A){var B=o(z,A);return{point:v(A,A.length-1,B.location,null,null),location:B.location}};var f=function(P,F){var I=F.length-1,B=(2*I)-1,N=[],L=[],D=[],O=[],M=[[1,0.6,0.3,0.1],[0.4,0.6,0.6,0.4],[0.1,0.3,0.6,1]];for(var K=0;K<=I;K++){N[K]=k.subtract(F[K],P)}for(var K=0;K<=I-1;K++){L[K]=k.subtract(F[K+1],F[K]);L[K]=k.scale(L[K],3)}for(var Q=0;Q<=I-1;Q++){for(var H=0;H<=I;H++){if(!D[Q]){D[Q]=[]}D[Q][H]=k.dotProduct(L[Q],N[H])}}for(K=0;K<=B;K++){if(!O[K]){O[K]=[]}O[K].y=0;O[K].x=parseFloat(K)/B}var E=I,G=I-1;for(var J=0;J<=E+G;J++){var C=Math.max(0,J-G),A=Math.min(J,E);for(K=C;K<=A;K++){j=J-K;O[K+j].y+=D[j][K]*M[j][K]}}return O};var p=function(G,B,J,D){var A=[],I=[],E,F,H=[],z=[];switch(c(G,B)){case 0:return 0;case 1:if(D>=w){J[0]=(G[0].x+G[B].x)/2;return 1}if(d(G,B)){J[0]=h(G,B);return 1}break}v(G,B,0.5,A,I);E=p(A,B,H,D+1);F=p(I,B,z,D+1);for(var C=0;C<E;C++){J[C]=H[C]}for(var C=0;C<F;C++){J[C+E]=z[C]}return(E+F)};var c=function(E,D){var C=0,A,z;A=z=Math.sgn(E[0].y);for(var B=1;B<=D;B++){A=Math.sgn(E[B].y);if(A!=z){C++}z=A}return C};var d=function(H,B){var N,A,z,J,G,R,Q,P,D,C,T,F,K,S,E,I;R=H[0].y-H[B].y;Q=H[B].x-H[0].x;P=H[0].x*H[B].y-H[B].x*H[0].y;var M=max_distance_below=0;for(var O=1;O<B;O++){var L=R*H[O].x+Q*H[O].y+P;if(L>M){M=L}else{if(L<max_distance_below){max_distance_below=L}}}T=0;F=1;K=0;S=R;E=Q;I=P-M;D=T*E-S*F;C=1/D;A=(F*I-E*K)*C;S=R;E=Q;I=P-max_distance_below;D=T*E-S*F;C=1/D;z=(F*I-E*K)*C;J=Math.min(A,z);G=Math.max(A,z);N=G-J;return(N<r)?1:0};var h=function(B,C){var F=1,H=0,I=B[C].x-B[0].x,J=B[C].y-B[0].y,z=B[0].x-0,D=B[0].y-0,G=I*H-J*F,A=1/G,E=(I*D-J*z)*A;return 0+F*E};var v=function(G,F,D,E,C){var z=[[]];for(var A=0;A<=F;A++){z[0][A]=G[A]}for(var B=1;B<=F;B++){for(var A=0;A<=F-B;A++){if(!z[B]){z[B]=[]}if(!z[B][A]){z[B][A]={}}z[B][A].x=(1-D)*z[B-1][A].x+D*z[B-1][A+1].x;z[B][A].y=(1-D)*z[B-1][A].y+D*z[B-1][A+1].y}}if(E!=null){for(A=0;A<=F;A++){E[A]=z[A][0]}}if(C!=null){for(A=0;A<=F;A++){C[A]=z[F-A][A]}}return(z[F][0])};var t={};var g=function(C){var J=t[C];if(!J){J=[];var D=function(){return function(K){return Math.pow(K,C)}},B=function(){return function(K){return Math.pow((1-K),C)}},H=function(K){return function(L){return K}},I=function(){return function(K){return K}},z=function(){return function(K){return 1-K}},A=function(K){return function(M){var N=1;for(var L=0;L<K.length;L++){N=N*K[L](M)}return N}};J.push(new D());for(var G=1;G<C;G++){var F=[new H(C)];for(var E=0;E<(C-G);E++){F.push(new I())}for(var E=0;E<G;E++){F.push(new z())}J.push(new A(F))}J.push(new B());t[C]=J}return J};var m=function(D,z){var E=g(D.length-1),B=0,A=0;for(var C=0;C<D.length;C++){B=B+(D[C].x*E[C](z));A=A+(D[C].y*E[C](z))}return{x:B,y:A}};var e=function(A,z){return Math.sqrt(Math.pow(A.x-z.x,2)+Math.pow(A.y-z.y,2))};var u=function(z){return z[0].x==z[1].x&&z[0].y==z[1].y};var l=function(F,A,G){if(u(F)){return{point:F[0],location:A}}var C=m(F,A),z=0,B=A,D=G>0?1:-1,E=null;while(z<Math.abs(G)){B+=(0.005*D);E=m(F,B);z+=e(E,C);C=E}return{point:E,location:B}};var q=function(E){if(u(E)){return 0}var B=m(E,0),z=0,A=0,C=1,D=null;while(A<1){A+=(0.005*C);D=m(E,A);z+=e(D,B);B=D}return z};var y=function(A,z,B){return l(A,z,B).point};var a=function(A,z,B){return l(A,z,B).location};var n=function(E,A){var D=m(E,A),C=m(E.slice(0,E.length-1),A),z=C.y-D.y,B=C.x-D.x;return z==0?Infinity:Math.atan(z/B)};var s=function(B,z,C){var A=l(B,z,C);if(A.location>1){A.location=1}if(A.location<0){A.location=0}return n(B,A.location)};var x=function(C,G,B,z){z=z==null?0:z;var A=l(C,G,z),D=n(C,A.location),H=Math.atan(-1/D),E=B/2*Math.sin(H),F=B/2*Math.cos(H);return[{x:A.point.x+F,y:A.point.y+E},{x:A.point.x-F,y:A.point.y-E}]};var i=window.jsBezier={distanceFromCurve:o,gradientAtPoint:n,gradientAtPointAlongCurveFrom:s,nearestPointOnCurve:b,pointOnCurve:m,pointAlongCurveFrom:y,perpendicularToCurveAt:x,locationAlongCurveFrom:a,getLength:q}})();(function(){var k=function(l){return Object.prototype.toString.call(l)==="[object Array]"},e=function(l){return Object.prototype.toString.call(l)==="[object Number]"},a=function(l){return typeof l==="string"},i=function(l){return typeof l==="boolean"},c=function(l){return l==null},d=function(l){return l==null?false:Object.prototype.toString.call(l)==="[object Object]"},h=function(l){return Object.prototype.toString.call(l)==="[object Date]"},f=function(l){return Object.prototype.toString.call(l)==="[object Function]"},g=function(m){for(var l in m){if(m.hasOwnProperty(l)){return false}}return true},b=function(n,m,l){n=k(n)?n:[n.x,n.y];m=k(m)?m:[m.x,m.y];return l(n,m)};jsPlumbUtil={isArray:k,isString:a,isBoolean:i,isNull:c,isObject:d,isDate:h,isFunction:f,isEmpty:g,isNumber:e,clone:function(m){if(a(m)){return""+m}else{if(i(m)){return !!m}else{if(h(m)){return new Date(m.getTime())}else{if(f(m)){return m}else{if(k(m)){var l=[];for(var o=0;o<m.length;o++){l.push(this.clone(m[o]))}return l}else{if(d(m)){var p={};for(var n in m){p[n]=this.clone(m[n])}return p}else{return m}}}}}}},merge:function(m,l){var q=this.clone(m);for(var p in l){if(q[p]==null||a(l[p])||i(l[p])){q[p]=l[p]}else{if(k(l[p])){var n=[];if(k(q[p])){n.push.apply(n,q[p])}n.push.apply(n,l[p]);q[p]=n}else{if(d(l[p])){if(!d(q[p])){q[p]={}}for(var o in l[p]){q[p][o]=l[p][o]}}}}}return q},copyValues:function(m,o,n){for(var l=0;l<m.length;l++){n[m[l]]=o[m[l]]}},functionChain:function(n,q,m){for(var l=0;l<m.length;l++){var p=m[l][0][m[l][1]].apply(m[l][0],m[l][2]);if(p===q){return p}}return n},populate:function(n,m){var l=function(s){var q=s.match(/(\${.*?})/g);if(q!=null){for(var p=0;p<q.length;p++){var r=m[q[p].substring(2,q[p].length-1)];if(r!=null){s=s.replace(q[p],r)}}}return s},o=function(v){if(v!=null){if(a(v)){return l(v)}else{if(k(v)){var u=[];for(var q=0;q<v.length;q++){u.push(o(v[q]))}return u}else{if(d(v)){var t={};for(var p in v){t[p]=o(v[p])}return t}else{return v}}}}};return o(n)},convertStyle:function(m,l){if("transparent"===m){return m}var t=m,r=function(o){return o.length==1?"0"+o:o},n=function(o){return r(Number(o).toString(16))},p=/(rgb[a]?\()(.*)(\))/;if(m.match(p)){var q=m.match(p)[2].split(",");t="#"+n(q[0])+n(q[1])+n(q[2]);if(!l&&q.length==4){t=t+n(q[3])}}return t},gradient:function(m,l){return b(m,l,function(o,n){if(n[0]==o[0]){return n[1]>o[1]?Infinity:-Infinity}else{if(n[1]==o[1]){return n[0]>o[0]?0:-0}else{return(n[1]-o[1])/(n[0]-o[0])}}})},normal:function(m,l){return -1/this.gradient(m,l)},lineLength:function(m,l){return b(m,l,function(o,n){return Math.sqrt(Math.pow(n[1]-o[1],2)+Math.pow(n[0]-o[0],2))})},segment:function(m,l){return b(m,l,function(o,n){if(n[0]>o[0]){return(n[1]>o[1])?2:1}else{if(n[0]==o[0]){return n[1]>o[1]?2:1}else{return(n[1]>o[1])?3:4}}})},theta:function(m,l){return b(m,l,function(p,o){var n=jsPlumbUtil.gradient(p,o),q=Math.atan(n),r=jsPlumbUtil.segment(p,o);if((r==4||r==3)){q+=Math.PI}if(q<0){q+=(2*Math.PI)}return q})},intersects:function(q,p){var n=q.x,l=q.x+q.w,u=q.y,s=q.y+q.h,o=p.x,m=p.x+p.w,t=p.y,r=p.y+p.h;return((n<=o&&o<=l)&&(u<=t&&t<=s))||((n<=m&&m<=l)&&(u<=t&&t<=s))||((n<=o&&o<=l)&&(u<=r&&r<=s))||((n<=m&&o<=l)&&(u<=r&&r<=s))||((o<=n&&n<=m)&&(t<=u&&u<=r))||((o<=l&&l<=m)&&(t<=u&&u<=r))||((o<=n&&n<=m)&&(t<=s&&s<=r))||((o<=l&&n<=m)&&(t<=s&&s<=r))},segmentMultipliers:[null,[1,-1],[1,1],[-1,1],[-1,-1]],inverseSegmentMultipliers:[null,[-1,-1],[-1,1],[1,1],[1,-1]],pointOnLine:function(l,q,n){var p=jsPlumbUtil.gradient(l,q),v=jsPlumbUtil.segment(l,q),u=n>0?jsPlumbUtil.segmentMultipliers[v]:jsPlumbUtil.inverseSegmentMultipliers[v],o=Math.atan(p),r=Math.abs(n*Math.sin(o))*u[1],t=Math.abs(n*Math.cos(o))*u[0];return{x:l.x+t,y:l.y+r}},perpendicularLineTo:function(o,p,q){var n=jsPlumbUtil.gradient(o,p),r=Math.atan(-1/n),s=q/2*Math.sin(r),l=q/2*Math.cos(r);return[{x:p.x+l,y:p.y+s},{x:p.x-l,y:p.y-s}]},findWithFunction:function(l,n){if(l){for(var m=0;m<l.length;m++){if(n(l[m])){return m}}}return -1},clampToGrid:function(l,q,n,p,o){var m=function(v,r){var u=v%r,s=Math.floor(v/r),t=u>=(r/2)?1:0;return(s+t)*r};return[p||n==null?l:m(l,n[0]),o||n==null?q:m(q,n[1])]},indexOf:function(m,n){return jsPlumbUtil.findWithFunction(m,function(l){return l==n})},removeWithFunction:function(m,n){var l=jsPlumbUtil.findWithFunction(m,n);if(l>-1){m.splice(l,1)}return l!=-1},remove:function(n,o){var m=jsPlumbUtil.indexOf(n,o);if(m>-1){n.splice(m,1)}return m!=-1},addWithFunction:function(n,m,l){if(jsPlumbUtil.findWithFunction(n,l)==-1){n.push(m)}},addToList:function(q,n,p,o){var m=q[n];if(m==null){m=[];q[n]=m}m[o?"unshift":"push"](p);return m},extend:function(s,q,p,r){p=p||{};r=r||{};q=k(q)?q:[q];for(var o=0;o<q.length;o++){for(var n in q[o].prototype){if(q[o].prototype.hasOwnProperty(n)){s.prototype[n]=q[o].prototype[n]}}}var m=function(t){return function(){for(var u=0;u<q.length;u++){if(q[u].prototype[t]){q[u].prototype[t].apply(this,arguments)}}return p[t].apply(this,arguments)}};for(var l in p){s.prototype[l]=m(l)}return s},uuid:function(){return("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(n){var m=Math.random()*16|0,l=n=="x"?m:(m&3|8);return l.toString(16)}))},logEnabled:true,log:function(){if(jsPlumbUtil.logEnabled&&typeof console!="undefined"){try{var m=arguments[arguments.length-1];console.log(m)}catch(l){}}},group:function(l){if(jsPlumbUtil.logEnabled&&typeof console!="undefined"){console.group(l)}},groupEnd:function(l){if(jsPlumbUtil.logEnabled&&typeof console!="undefined"){console.groupEnd(l)}},time:function(l){if(jsPlumbUtil.logEnabled&&typeof console!="undefined"){console.time(l)}},timeEnd:function(l){if(jsPlumbUtil.logEnabled&&typeof console!="undefined"){console.timeEnd(l)}},removeElement:function(l){if(l!=null&&l.parentNode!=null){l.parentNode.removeChild(l)}},removeElements:function(m){for(var l=0;l<m.length;l++){jsPlumbUtil.removeElement(m[l])}},sizeElement:function(o,l,p,m,n){if(o){o.style.height=n+"px";o.height=n;o.style.width=m+"px";o.width=m;o.style.left=l+"px";o.style.top=p+"px"}},wrap:function(n,l,m){n=n||function(){};l=l||function(){};return function(){var o=null;try{o=l.apply(this,arguments)}catch(p){jsPlumbUtil.log("jsPlumb function failed : "+p)}if(m==null||(o!==m)){try{o=n.apply(this,arguments)}catch(p){jsPlumbUtil.log("wrapped function failed : "+p)}}return o}}};jsPlumbUtil.EventGenerator=function(){var m={},n=false;var l=["ready"];this.bind=function(p,q,o){jsPlumbUtil.addToList(m,p,q,true);return this};this.fire=function(t,u,o){if(!n&&m[t]){var q=m[t].length,s=0,p=false,r=null;if(!this.shouldFireEvent||this.shouldFireEvent(t,u,o)){while(!p&&s<q&&r!==false){if(jsPlumbUtil.findWithFunction(l,function(w){return w===t})!=-1){m[t][s](u,o)}else{try{r=m[t][s](u,o)}catch(v){jsPlumbUtil.log("jsPlumb: fire failed for event "+t+" : "+v)}}s++;if(m==null||m[t]==null){p=true}}}}return this};this.unbind=function(o){if(o){delete m[o]}else{m={}}return this};this.getListener=function(o){return m[o]};this.setSuspendEvents=function(o){n=o};this.isSuspendEvents=function(){return n};this.cleanupListeners=function(){for(var o in m){m[o].splice(0);delete m[o]}}};jsPlumbUtil.EventGenerator.prototype={cleanup:function(){this.cleanupListeners()}};if(!Function.prototype.bind){Function.prototype.bind=function(l){if(typeof this!=="function"){throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable")}var p=Array.prototype.slice.call(arguments,1),o=this,m=function(){},n=function(){return o.apply(this instanceof m&&l?this:l,p.concat(Array.prototype.slice.call(arguments)))};m.prototype=this.prototype;n.prototype=new m();return n}}})();(function(){var b=!!document.createElement("canvas").getContext,a=!!window.SVGAngle||document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure","1.1"),d=function(){if(d.vml===undefined){var f=document.body.appendChild(document.createElement("div"));f.innerHTML='<v:shape id="vml_flag1" adj="1" />';var e=f.firstChild;if(e!=null&&e.style!=null){e.style.behavior="url(#default#VML)";d.vml=e?typeof e.adj=="object":true}else{d.vml=false}f.parentNode.removeChild(f)}return d.vml};var c=function(k){var i={},h=[],f={},e={},g={};this.register=function(n){var m=jsPlumb.CurrentLibrary,q=m.getElementObject(n),p=k.getId(n),l=m.getOffset(q);if(!i[p]){i[p]=n;h.push(n);f[p]={}}var o=function(v,r){if(v){for(var s=0;s<v.childNodes.length;s++){if(v.childNodes[s].nodeType!=3&&v.childNodes[s].nodeType!=8){var u=m.getElementObject(v.childNodes[s]),w=k.getId(v.childNodes[s],null,true);if(w&&e[w]&&e[w]>0){var t=m.getOffset(u);f[p][w]={id:w,offset:{left:t.left-l.left,top:t.top-l.top}};g[w]=p}o(v.childNodes[s])}}}};o(n)};this.updateOffsets=function(q){var t=jsPlumb.CurrentLibrary,n=t.getElementObject(q),p=t.getDOMElement(n),m=k.getId(p),o=f[m],l=t.getOffset(n);if(o){for(var s in o){var u=t.getElementObject(s),r=t.getOffset(u);f[m][s]={id:s,offset:{left:r.left-l.left,top:r.top-l.top}};g[s]=m}}};this.endpointAdded=function(n){var s=jsPlumb.CurrentLibrary,v=document.body,l=k.getId(n),u=s.getElementObject(n),w=jsPlumb.CurrentLibrary.getOffset(u),m=n.parentNode,q=m==v;e[l]=e[l]?e[l]+1:1;while(m!=null&&m!=v){var r=k.getId(m,null,true);if(r&&i[r]){var x=-1,t=s.getElementObject(m),o=s.getOffset(t);if(f[r][l]==null){f[r][l]={id:l,offset:{left:w.left-o.left,top:w.top-o.top}};g[l]=r}break}m=m.parentNode}};this.endpointDeleted=function(m){if(e[m.elementId]){e[m.elementId]--;if(e[m.elementId]<=0){for(var l in f){if(f[l]){delete f[l][m.elementId];delete g[m.elementId]}}}}};this.changeId=function(m,l){f[l]=f[m];f[m]={};g[l]=g[m];g[m]=null};this.getElementsForDraggable=function(l){return f[l]};this.elementRemoved=function(l){var m=g[l];if(m){delete f[m][l];delete g[l]}};this.reset=function(){i={};h=[];f={};e={}}};if(!window.console){window.console={time:function(){},timeEnd:function(){},group:function(){},groupEnd:function(){},log:function(){}}}window.jsPlumbAdapter={headless:false,getAttribute:function(e,f){return e.getAttribute(f)},setAttribute:function(g,e,f){g.setAttribute(e,f)},appendToRoot:function(e){document.body.appendChild(e)},getRenderModes:function(){return["canvas","svg","vml"]},isRenderModeAvailable:function(e){return{canvas:b,svg:a,vml:d()}[e]},getDragManager:function(e){return new c(e)},setRenderMode:function(i){var h;if(i){i=i.toLowerCase();var f=this.isRenderModeAvailable("canvas"),e=this.isRenderModeAvailable("svg"),g=this.isRenderModeAvailable("vml");if(i==="svg"){if(e){h="svg"}else{if(f){h="canvas"}else{if(g){h="vml"}}}}else{if(i==="canvas"&&f){h="canvas"}else{if(g){h="vml"}}}}return h}}})();(function(){var f=jsPlumbUtil,u=function(C,B){l.CurrentLibrary.addClass(h(C),B)},i=function(C,B){return l.CurrentLibrary.hasClass(h(C),B)},k=function(C,B){l.CurrentLibrary.removeClass(h(C),B)},h=function(B){return l.CurrentLibrary.getElementObject(B)},A=function(B){return l.CurrentLibrary.getDOMElement(B)},s=function(C,B){var E=l.CurrentLibrary.getOffset(h(C));if(B!=null){var D=B.getZoom();return{left:E.left/D,top:E.top/D}}else{return E}},a=function(B){return l.CurrentLibrary.getSize(h(B))},n=function(){return""+(new Date()).getTime()},y=function(B){if(B._jsPlumb.paintStyle&&B._jsPlumb.hoverPaintStyle){var C={};l.extend(C,B._jsPlumb.paintStyle);l.extend(C,B._jsPlumb.hoverPaintStyle);delete B._jsPlumb.hoverPaintStyle;if(C.gradient&&B._jsPlumb.paintStyle.fillStyle){delete C.gradient}B._jsPlumb.hoverPaintStyle=C}},e=["click","dblclick","mouseenter","mouseout","mousemove","mousedown","mouseup","contextmenu"],r={mouseout:"mouseexit"},z=function(D,H,G,C){var F=D.getAttachedElements();if(F){for(var E=0,B=F.length;E<B;E++){if(!C||C!=F[E]){F[E].setHover(H,true,G)}}}},m=function(B){return B==null?null:B.split(" ")},o=function(C,G,E){if(C.getDefaultType){var H=C.getTypeDescriptor();var F=f.merge({},C.getDefaultType());for(var D=0,B=C._jsPlumb.types.length;D<B;D++){F=f.merge(F,C._jsPlumb.instance.getType(C._jsPlumb.types[D],H))}if(G){F=f.populate(F,G)}C.applyType(F,E);if(!E){C.repaint()}}},v=window.jsPlumbUIComponent=function(G){jsPlumbUtil.EventGenerator.apply(this,arguments);var M=this,L=arguments,C=M.idPrefix,F=C+(new Date()).getTime(),J=l.CurrentLibrary;this._jsPlumb={instance:G._jsPlumb,parameters:G.parameters||{},paintStyle:null,hoverPaintStyle:null,paintStyleInUse:null,hover:false,beforeDetach:G.beforeDetach,beforeDrop:G.beforeDrop,overlayPlacements:[],hoverClass:G.hoverClass||G._jsPlumb.Defaults.HoverClass||l.Defaults.HoverClass,types:[]};this.getId=function(){return F};if(G.events){for(var I in G.events){M.bind(I,G.events[I])}}this.clone=function(){var N={};this.constructor.apply(N,L);return N}.bind(this);this.isDetachAllowed=function(N){var O=true;if(this._jsPlumb.beforeDetach){try{O=this._jsPlumb.beforeDetach(N)}catch(P){f.log("jsPlumb: beforeDetach callback failed",P)}}return O};this.isDropAllowed=function(S,P,Q,N,O){var R=this._jsPlumb.instance.checkCondition("beforeDrop",{sourceId:S,targetId:P,scope:Q,connection:N,dropEndpoint:O});if(this._jsPlumb.beforeDrop){try{R=this._jsPlumb.beforeDrop({sourceId:S,targetId:P,scope:Q,connection:N,dropEndpoint:O})}catch(T){f.log("jsPlumb: beforeDrop callback failed",T)}}return R};var H=[],K=function(P,O,N){H.push([P,O,N]);P.bind(O,N)},D=[],E=function(Q,R,O){var N=r[O]||O,P=function(S){R.fire(N,R,S)};D.push([Q,O,P]);J.bind(Q,O,P)},B=function(Q,O,P){var N=r[O]||O;J.unbind(Q,O,P)};this.bindListeners=function(P,N,O){K(P,"click",function(Q,R){N.fire("click",N,R)});K(P,"dblclick",function(Q,R){N.fire("dblclick",N,R)});K(P,"contextmenu",function(Q,R){N.fire("contextmenu",N,R)});K(P,"mouseenter",function(Q,R){if(!N.isHover()){O(true);N.fire("mouseenter",N,R)}});K(P,"mouseexit",function(Q,R){if(N.isHover()){O(false);N.fire("mouseexit",N,R)}});K(P,"mousedown",function(Q,R){N.fire("mousedown",N,R)});K(P,"mouseup",function(Q,R){N.fire("mouseup",N,R)})};this.unbindListeners=function(){for(var N=0;N<H.length;N++){var O=H[N];O[0].unbind(O[1],O[2])}H=null};this.attachListeners=function(P,Q){for(var O=0,N=e.length;O<N;O++){E(P,Q,e[O])}};this.detachListeners=function(){for(var N=0;N<D.length;N++){B(D[N][0],D[N][1],D[N][2])}D=null};this.reattachListenersForElement=function(P){if(arguments.length>1){for(var O=0,N=e.length;O<N;O++){B(P,e[O])}for(O=1,N=arguments.length;O<N;O++){this.attachListeners(P,arguments[O])}}}};jsPlumbUtil.extend(v,jsPlumbUtil.EventGenerator,{getParameter:function(B){return this._jsPlumb.parameters[B]},setParameter:function(B,C){this._jsPlumb.parameters[B]=C},getParameters:function(){return this._jsPlumb.parameters},setParameters:function(B){this._jsPlumb.parameters=B},addClass:function(B){if(this.canvas!=null){u(this.canvas,B)}},removeClass:function(B){if(this.canvas!=null){k(this.canvas,B)}},setType:function(B,D,C){this._jsPlumb.types=m(B)||[];o(this,D,C)},getType:function(){return this._jsPlumb.types},reapplyTypes:function(C,B){o(this,C,B)},hasType:function(B){return jsPlumbUtil.indexOf(this._jsPlumb.types,B)!=-1},addType:function(E,H,F){var D=m(E),G=false;if(D!=null){for(var C=0,B=D.length;C<B;C++){if(!this.hasType(D[C])){this._jsPlumb.types.push(D[C]);G=true}}if(G){o(this,H,F)}}},removeType:function(F,G){var D=m(F),H=false,E=function(J){var I=f.indexOf(this._jsPlumb.types,J);if(I!=-1){this._jsPlumb.types.splice(I,1);return true}return false}.bind(this);if(D!=null){for(var C=0,B=D.length;C<B;C++){H=E(D[C])||H}if(H){o(this,null,G)}}},toggleType:function(F,H,G){var E=m(F);if(E!=null){for(var D=0,C=E.length;D<C;D++){var B=jsPlumbUtil.indexOf(this._jsPlumb.types,E[D]);if(B!=-1){this._jsPlumb.types.splice(B,1)}else{this._jsPlumb.types.push(E[D])}}o(this,H,G)}},applyType:function(C,D){this.setPaintStyle(C.paintStyle,D);this.setHoverPaintStyle(C.hoverPaintStyle,D);if(C.parameters){for(var B in C.parameters){this.setParameter(B,C.parameters[B])}}},setPaintStyle:function(B,C){this._jsPlumb.paintStyle=B;this._jsPlumb.paintStyleInUse=this._jsPlumb.paintStyle;y(this);if(!C){this.repaint()}},getPaintStyle:function(){return this._jsPlumb.paintStyle},setHoverPaintStyle:function(B,C){this._jsPlumb.hoverPaintStyle=B;y(this);if(!C){this.repaint()}},getHoverPaintStyle:function(){return this._jsPlumb.hoverPaintStyle},cleanup:function(){this.unbindListeners();this.detachListeners()},destroy:function(){this.cleanupListeners();this.clone=null;this._jsPlumb=null},isHover:function(){return this._jsPlumb.hover},setHover:function(C,E,D){var B=l.CurrentLibrary;if(this._jsPlumb&&!this._jsPlumb.instance.currentlyDragging&&!this._jsPlumb.instance.isHoverSuspended()){this._jsPlumb.hover=C;if(this.canvas!=null){if(this._jsPlumb.instance.hoverClass!=null){B[C?"addClass":"removeClass"](this.canvas,this._jsPlumb.instance.hoverClass)}}if(this._jsPlumb.hoverPaintStyle!=null){this._jsPlumb.paintStyleInUse=C?this._jsPlumb.hoverPaintStyle:this._jsPlumb.paintStyle;if(!this._jsPlumb.instance.isSuspendDrawing()){D=D||n();this.repaint({timestamp:D,recalc:false})}}if(this.getAttachedElements&&!E){z(this,C,n(),this)}}}});var x="__label",w=function(D,F){var B=-1;for(var E=0,C=D._jsPlumb.overlays.length;E<C;E++){if(F===D._jsPlumb.overlays[E].id){B=E;break}}return B},q=function(C,E){var B={cssClass:E.cssClass,labelStyle:C.labelStyle,id:x,component:C,_jsPlumb:C._jsPlumb.instance},D=l.extend(B,E);return new l.Overlays[C._jsPlumb.instance.getRenderMode()].Label(D)},d=function(B,F){var D=null;if(f.isArray(F)){var C=F[0],E=l.extend({component:B,_jsPlumb:B._jsPlumb.instance},F[1]);if(F.length==3){l.extend(E,F[2])}D=new l.Overlays[B._jsPlumb.instance.getRenderMode()][C](E)}else{if(F.constructor==String){D=new l.Overlays[B._jsPlumb.instance.getRenderMode()][F]({component:B,_jsPlumb:B._jsPlumb.instance})}else{D=F}}B._jsPlumb.overlays.push(D)},c=function(E,H){var B=E.defaultOverlayKeys||[],G=H.overlays,C=function(I){return E._jsPlumb.instance.Defaults[I]||l.Defaults[I]||[]};if(!G){G=[]}for(var F=0,D=B.length;F<D;F++){G.unshift.apply(G,C(B[F]))}return G},p=window.OverlayCapableJsPlumbUIComponent=function(G){v.apply(this,arguments);this._jsPlumb.overlays=[];var E=c(this,G);if(E){for(var D=0,C=E.length;D<C;D++){d(this,E[D])}}if(G.label){var F=G.labelLocation||this.defaultLabelLocation||0.5,B=G.labelStyle||this._jsPlumb.instance.Defaults.LabelStyle||l.Defaults.LabelStyle;this._jsPlumb.overlays.push(q(this,{label:G.label,location:F,labelStyle:B}))}};jsPlumbUtil.extend(p,v,{applyType:function(D,E){this.removeAllOverlays();if(D.overlays){for(var C=0,B=D.overlays.length;C<B;C++){this.addOverlay(D.overlays[C],true)}}},setHover:function(D,F,E){if(this._jsPlumb&&!this._jsPlumb.instance.isConnectionBeingDragged()){for(var C=0,B=this._jsPlumb.overlays.length;C<B;C++){this._jsPlumb.overlays[C][D?"addClass":"removeClass"](this._jsPlumb.instance.hoverClass)}}},addOverlay:function(B,C){d(this,B);if(!C){this.repaint()}},getOverlay:function(C){var B=w(this,C);return B>=0?this._jsPlumb.overlays[B]:null},getOverlays:function(){return this._jsPlumb.overlays},hideOverlay:function(C){var B=this.getOverlay(C);if(B){B.hide()}},hideOverlays:function(){for(var C=0,B=this._jsPlumb.overlays.length;C<B;C++){this._jsPlumb.overlays[C].hide()}},showOverlay:function(C){var B=this.getOverlay(C);if(B){B.show()}},showOverlays:function(){for(var C=0,B=this._jsPlumb.overlays.length;C<B;C++){this._jsPlumb.overlays[C].show()}},removeAllOverlays:function(){for(var C=0,B=this._jsPlumb.overlays.length;C<B;C++){if(this._jsPlumb.overlays[C].cleanup){this._jsPlumb.overlays[C].cleanup()}}this._jsPlumb.overlays.splice(0,this._jsPlumb.overlays.length);this.repaint()},removeOverlay:function(C){var B=w(this,C);if(B!=-1){var D=this._jsPlumb.overlays[B];if(D.cleanup){D.cleanup()}this._jsPlumb.overlays.splice(B,1)}},removeOverlays:function(){for(var C=0,B=arguments.length;C<B;C++){this.removeOverlay(arguments[C])}},getLabel:function(){var B=this.getOverlay(x);return B!=null?B.getLabel():null},getLabelOverlay:function(){return this.getOverlay(x)},setLabel:function(B){var C=this.getOverlay(x);if(!C){var D=B.constructor==String||B.constructor==Function?{label:B}:B;C=q(this,D);this._jsPlumb.overlays.push(C)}else{if(B.constructor==String||B.constructor==Function){C.setLabel(B)}else{if(B.label){C.setLabel(B.label)}if(B.location){C.setLocation(B.location)}}}if(!this._jsPlumb.instance.isSuspendDrawing()){this.repaint()}},cleanup:function(){for(var B=0;B<this._jsPlumb.overlays.length;B++){this._jsPlumb.overlays[B].cleanup();this._jsPlumb.overlays[B].destroy()}this._jsPlumb.overlays.splice(0)}});var g=0,b=function(){var B=g+1;g++;return B};var t=window.jsPlumbInstance=function(C){this.Defaults={Anchor:"BottomCenter",Anchors:[null,null],ConnectionsDetachable:true,ConnectionOverlays:[],Connector:"Bezier",Container:null,DoNotThrowErrors:false,DragOptions:{},DropOptions:{},Endpoint:"Dot",EndpointOverlays:[],Endpoints:[null,null],EndpointStyle:{fillStyle:"#456"},EndpointStyles:[null,null],EndpointHoverStyle:null,EndpointHoverStyles:[null,null],HoverPaintStyle:null,LabelStyle:{color:"black"},LogEnabled:false,Overlays:[],MaxConnections:1,PaintStyle:{lineWidth:8,strokeStyle:"#456"},ReattachConnections:false,RenderMode:"svg",Scope:"jsPlumb_DefaultScope"};if(C){l.extend(this.Defaults,C)}this.logEnabled=this.Defaults.LogEnabled;this._connectionTypes={};this._endpointTypes={};jsPlumbUtil.EventGenerator.apply(this);var aW=this,ar=b(),av=aW.bind,aj={},R=1,V=function(a2){var a3=A(a2);return{el:a3,id:(jsPlumbUtil.isString(a2)&&a3==null)?a2:B(a3)}};this.getInstanceIndex=function(){return ar};this.setZoom=function(a3,a2){R=a3;if(a2){aW.repaintEverything()}};this.getZoom=function(){return R};for(var ai in this.Defaults){aj[ai]=this.Defaults[ai]}this.bind=function(a3,a2){if("ready"===a3&&E){a2()}else{av.apply(aW,[a3,a2])}};aW.importDefaults=function(a3){for(var a2 in a3){aW.Defaults[a2]=a3[a2]}return aW};aW.restoreDefaults=function(){aW.Defaults=l.extend({},aj);return aW};var H=null,aQ=null,E=false,L=[],ay={},aA={},X={},aY={},aR={},aV={},ab=false,U=[],aH=false,aK=null,K=this.Defaults.Scope,P=null,ak=1,Z=function(){return""+ak++},aB=function(a3,a2){if(aW.Defaults.Container){l.CurrentLibrary.appendElement(a3,aW.Defaults.Container)}else{if(!a2){jsPlumbAdapter.appendToRoot(a3)}else{l.CurrentLibrary.appendElement(a3,a2)}}},ap=function(a2){return a2._nodes?a2._nodes:a2},aL=function(a6,a9,a8,a4){if(!jsPlumbAdapter.headless&&!aH){var a2=B(a6),ba=aW.dragManager.getElementsForDraggable(a2);if(a8==null){a8=n()}var a3=O({elId:a2,offset:a9,recalc:false,timestamp:a8});if(ba){for(var a7 in ba){O({elId:ba[a7].id,offset:{left:a3.o.left+ba[a7].offset.left,top:a3.o.top+ba[a7].offset.top},recalc:false,timestamp:a8})}}aW.anchorManager.redraw(a2,a9,a8,null,a4);if(ba){for(var a5 in ba){aW.anchorManager.redraw(ba[a5].id,a9,a8,ba[a5].offset,a4,true)}}}},an=function(a4,a6){var a7=null,a5,a8;if(f.isArray(a4)){a7=[];for(var a3=0,a2=a4.length;a3<a2;a3++){a5=h(a4[a3]);a8=aW.getAttribute(a5,"id");a7.push(a6(a5,a8))}}else{a5=h(a4);a8=aW.getAttribute(a5,"id");a7=a6(a5,a8)}return a7},ad=function(a2){return aA[a2]},aN=function(a7,a2,ba){if(!jsPlumbAdapter.headless){var a3=a2==null?false:a2,a8=l.CurrentLibrary;if(a3){if(a8.isDragSupported(a7)&&!a8.isAlreadyDraggable(a7)){var bc=ba||aW.Defaults.DragOptions||l.Defaults.DragOptions;bc=l.extend({},bc);var a9=a8.dragEvents.drag,a4=a8.dragEvents.stop,a6=a8.dragEvents.start;bc[a6]=f.wrap(bc[a6],function(){aW.setHoverSuspended(true);aW.select({source:a7}).addClass(aW.elementDraggingClass+" "+aW.sourceElementDraggingClass,true);aW.select({target:a7}).addClass(aW.elementDraggingClass+" "+aW.targetElementDraggingClass,true);aW.setConnectionBeingDragged(true)});bc[a9]=f.wrap(bc[a9],function(){var bd=a8.getUIPosition(arguments,aW.getZoom());aL(a7,bd,null,true);u(a7,"jsPlumb_dragged")});bc[a4]=f.wrap(bc[a4],function(){var bd=a8.getUIPosition(arguments,aW.getZoom());aL(a7,bd);k(a7,"jsPlumb_dragged");aW.setHoverSuspended(false);aW.select({source:a7}).removeClass(aW.elementDraggingClass+" "+aW.sourceElementDraggingClass,true);aW.select({target:a7}).removeClass(aW.elementDraggingClass+" "+aW.targetElementDraggingClass,true);aW.setConnectionBeingDragged(false)});var a5=B(a7);aV[a5]=true;var bb=aV[a5];bc.disabled=bb==null?false:!bb;a8.initDraggable(a7,bc,false,aW);aW.dragManager.register(a7)}}}},ah=function(a5,a9){var a2=l.extend({},a5);if(a9){l.extend(a2,a9)}if(a2.source){if(a2.source.endpoint){a2.sourceEndpoint=a2.source}else{a2.source=A(a2.source)}}if(a2.target){if(a2.target.endpoint){a2.targetEndpoint=a2.target}else{a2.target=A(a2.target)}}if(a5.uuids){a2.sourceEndpoint=ad(a5.uuids[0]);a2.targetEndpoint=ad(a5.uuids[1])}if(a2.sourceEndpoint&&a2.sourceEndpoint.isFull()){f.log(aW,"could not add connection; source endpoint is full");return}if(a2.targetEndpoint&&a2.targetEndpoint.isFull()){f.log(aW,"could not add connection; target endpoint is full");return}if(!a2.type&&a2.sourceEndpoint){a2.type=a2.sourceEndpoint.connectionType}if(a2.sourceEndpoint&&a2.sourceEndpoint.connectorOverlays){a2.overlays=a2.overlays||[];for(var a8=0,a7=a2.sourceEndpoint.connectorOverlays.length;a8<a7;a8++){a2.overlays.push(a2.sourceEndpoint.connectorOverlays[a8])}}if(!a2["pointer-events"]&&a2.sourceEndpoint&&a2.sourceEndpoint.connectorPointerEvents){a2["pointer-events"]=a2.sourceEndpoint.connectorPointerEvents}var a6,a3,a4,ba;if(a2.target&&!a2.target.endpoint&&!a2.targetEndpoint&&!a2.newConnection){a6=B(a2.target);a3=aE[a6];a4=ao[a6];if(a3){if(!Y[a6]){return}ba=a4!=null?a4:aW.addEndpoint(a2.target,a3);if(aS[a6]){ao[a6]=ba}a2.targetEndpoint=ba;ba._doNotDeleteOnDetach=false;ba._deleteOnDetach=true}}if(a2.source&&!a2.source.endpoint&&!a2.sourceEndpoint&&!a2.newConnection){a6=B(a2.source);a3=ag[a6];a4=aG[a6];if(a3){if(!S[a6]){return}ba=a4!=null?a4:aW.addEndpoint(a2.source,a3);if(aJ[a6]){aG[a6]=ba}a2.sourceEndpoint=ba;ba._doNotDeleteOnDetach=false;ba._deleteOnDetach=true}}return a2},T=function(a6){var a5=aW.Defaults.ConnectionType||aW.getDefaultConnectionType(),a4=aW.Defaults.EndpointType||l.Endpoint,a3=l.CurrentLibrary.getParent;if(a6.container){a6.parent=a6.container}else{if(a6.sourceEndpoint){a6.parent=a6.sourceEndpoint.parent}else{if(a6.source.constructor==a4){a6.parent=a6.source.parent}else{a6.parent=a3(a6.source)}}}a6._jsPlumb=aW;a6.newConnection=T;a6.newEndpoint=al;a6.endpointsByUUID=aA;a6.endpointsByElement=ay;a6.finaliseConnection=a1;var a2=new a5(a6);a2.id="con_"+Z();a0("click","click",a2);a0("dblclick","dblclick",a2);a0("contextmenu","contextmenu",a2);return a2},a1=function(a5,a6,a2,a4){a6=a6||{};if(!a5.suspendedEndpoint){L.push(a5)}if(a5.suspendedEndpoint==null||a4){aW.anchorManager.newConnection(a5)}aL(a5.source);if(!a6.doNotFireConnectionEvent&&a6.fireEvent!==false){var a3={connection:a5,source:a5.source,target:a5.target,sourceId:a5.sourceId,targetId:a5.targetId,sourceEndpoint:a5.endpoints[0],targetEndpoint:a5.endpoints[1]};aW.fire("connection",a3,a2)}},a0=function(a2,a3,a4){a4.bind(a2,function(a6,a5){aW.fire(a3,a4,a5)})},ae=function(a4){if(a4.container){return a4.container}else{var a2=l.CurrentLibrary.getTagName(a4.source),a3=l.CurrentLibrary.getParent(a4.source);if(a2&&a2.toLowerCase()==="td"){return l.CurrentLibrary.getParent(a3)}else{return a3}}},al=function(a5){var a4=aW.Defaults.EndpointType||l.Endpoint;var a2=l.extend({},a5);a2.parent=ae(a2);a2._jsPlumb=aW;a2.newConnection=T;a2.newEndpoint=al;a2.endpointsByUUID=aA;a2.endpointsByElement=ay;a2.finaliseConnection=a1;a2.fireDetachEvent=aI;a2.floatingConnections=aR;a2.getParentFromParams=ae;a2.elementId=B(a2.source);var a3=new a4(a2);a3.id="ep_"+Z();a0("click","endpointClick",a3);a0("dblclick","endpointDblClick",a3);a0("contextmenu","contextmenu",a3);if(!jsPlumbAdapter.headless){aW.dragManager.endpointAdded(a2.source)}return a3},N=function(a5,a4,a7){var a3=ay[a5];if(a3&&a3.length){for(var a8=0,ba=a3.length;a8<ba;a8++){for(var a6=0,a9=a3[a8].connections.length;a6<a9;a6++){var a2=a4(a3[a8].connections[a6]);if(a2){return}}if(a7){a7(a3[a8])}}}},aU=function(a3,a2){return an(a3,function(a4,a5){aV[a5]=a2;if(l.CurrentLibrary.isDragSupported(a4)){l.CurrentLibrary.setDraggable(a4,a2)}})},aF=function(a4,a5,a2){a5=a5==="block";var a3=null;if(a2){if(a5){a3=function(a7){a7.setVisible(true,true,true)}}else{a3=function(a7){a7.setVisible(false,true,true)}}}var a6=V(a4);N(a6.id,function(a8){if(a5&&a2){var a7=a8.sourceId===a6.id?1:0;if(a8.endpoints[a7].isVisible()){a8.setVisible(true)}}else{a8.setVisible(a5)}},a3)},aT=function(a2){return an(a2,function(a4,a3){var a5=aV[a3]==null?false:aV[a3];a5=!a5;aV[a3]=a5;l.CurrentLibrary.setDraggable(a4,a5);return a5})},aw=function(a2,a4){var a3=null;if(a4){a3=function(a5){var a6=a5.isVisible();a5.setVisible(!a6)}}N(a2,function(a6){var a5=a6.isVisible();a6.setVisible(!a5)},a3)},O=function(a7){var a5=a7.timestamp,a2=a7.recalc,a6=a7.offset,a3=a7.elId,a4;if(aH&&!a5){a5=aK}if(!a2){if(a5&&a5===aY[a3]){return{o:a7.offset||X[a3],s:U[a3]}}}if(a2||!a6){a4=h(a3);if(a4!=null){U[a3]=a(a4);X[a3]=s(a4,aW);aY[a3]=a5}}else{X[a3]=a6;if(U[a3]==null){a4=h(a3);if(a4!=null){U[a3]=a(a4)}}aY[a3]=a5}if(X[a3]&&!X[a3].right){X[a3].right=X[a3].left+U[a3][0];X[a3].bottom=X[a3].top+U[a3][1];X[a3].width=U[a3][0];X[a3].height=U[a3][1];X[a3].centerx=X[a3].left+(X[a3].width/2);X[a3].centery=X[a3].top+(X[a3].height/2)}return{o:X[a3],s:U[a3]}},au=function(a2){var a3=X[a2];if(!a3){return O({elId:a2})}else{return{o:a3,s:U[a2]}}},B=function(a2,a3,a4){if(jsPlumbUtil.isString(a2)){return a2}if(a2==null){return null}var a5=jsPlumbAdapter.getAttribute(a2,"id");if(!a5||a5==="undefined"){if(arguments.length==2&&arguments[1]!==undefined){a5=a3}else{if(arguments.length==1||(arguments.length==3&&!arguments[2])){a5="jsPlumb_"+ar+"_"+Z()}}if(!a4){jsPlumbAdapter.setAttribute(a2,"id",a5)}}return a5};this.setConnectionBeingDragged=function(a2){ab=a2};this.isConnectionBeingDragged=function(){return ab};this.connectorClass="_jsPlumb_connector";this.hoverClass="_jsPlumb_hover";this.endpointClass="_jsPlumb_endpoint";this.endpointConnectedClass="_jsPlumb_endpoint_connected";this.endpointFullClass="_jsPlumb_endpoint_full";this.endpointDropAllowedClass="_jsPlumb_endpoint_drop_allowed";this.endpointDropForbiddenClass="_jsPlumb_endpoint_drop_forbidden";this.overlayClass="_jsPlumb_overlay";this.draggingClass="_jsPlumb_dragging";this.elementDraggingClass="_jsPlumb_element_dragging";this.sourceElementDraggingClass="_jsPlumb_source_element_dragging";this.targetElementDraggingClass="_jsPlumb_target_element_dragging";this.endpointAnchorClassPrefix="_jsPlumb_endpoint_anchor";this.hoverSourceClass="_jsPlumb_source_hover";this.hoverTargetClass="_jsPlumb_target_hover";this.dragSelectClass="_jsPlumb_drag_select";this.Anchors={};this.Connectors={canvas:{},svg:{},vml:{}};this.Endpoints={canvas:{},svg:{},vml:{}};this.Overlays={canvas:{},svg:{},vml:{}};this.ConnectorRenderers={};this.SVG="svg";this.CANVAS="canvas";this.VML="vml";this.addEndpoint=function(a5,a6,bg){bg=bg||{};var a4=l.extend({},bg);l.extend(a4,a6);a4.endpoint=a4.endpoint||aW.Defaults.Endpoint||l.Defaults.Endpoint;a4.paintStyle=a4.paintStyle||aW.Defaults.EndpointStyle||l.Defaults.EndpointStyle;a5=ap(a5);var a8=[],bb=(f.isArray(a5)||(a5.length!=null&&!f.isString(a5)))?a5:[a5];for(var a9=0,a7=bb.length;a9<a7;a9++){var be=A(bb[a9]),a3=B(be);a4.source=be;O({elId:a3,timestamp:aK});var bd=al(a4);if(a4.parentAnchor){bd.parentAnchor=a4.parentAnchor}f.addToList(ay,a3,bd);var bc=X[a3],ba=U[a3],bf=bd.anchor.compute({xy:[bc.left,bc.top],wh:ba,element:bd,timestamp:aK}),a2={anchorLoc:bf,timestamp:aK};if(aH){a2.recalc=false}if(!aH){bd.paint(a2)}a8.push(bd);bd._doNotDeleteOnDetach=true}return a8.length==1?a8[0]:a8};this.addEndpoints=function(a7,a3,a2){var a6=[];for(var a5=0,a4=a3.length;a5<a4;a5++){var a8=aW.addEndpoint(a7,a3[a5],a2);if(f.isArray(a8)){Array.prototype.push.apply(a6,a8)}else{a6.push(a8)}}return a6};this.animate=function(a4,a3,a2){a2=a2||{};var a5=h(a4),a8=B(a4),a7=l.CurrentLibrary.dragEvents.step,a6=l.CurrentLibrary.dragEvents.complete;a2[a7]=f.wrap(a2[a7],function(){aW.repaint(a8)});a2[a6]=f.wrap(a2[a6],function(){aW.repaint(a8)});l.CurrentLibrary.animate(a5,a3,a2)};this.checkCondition=function(a5,a7){var a2=aW.getListener(a5),a6=true;if(a2&&a2.length>0){try{for(var a4=0,a3=a2.length;a4<a3;a4++){a6=a6&&a2[a4](a7)}}catch(a8){f.log(aW,"cannot check condition ["+a5+"]"+a8)}}return a6};this.checkASyncCondition=function(a4,a6,a5,a3){var a2=aW.getListener(a4);if(a2&&a2.length>0){try{a2[0](a6,a5,a3)}catch(a7){f.log(aW,"cannot asynchronously check condition ["+a4+"]"+a7)}}};this.connect=function(a5,a3){var a2=ah(a5,a3),a4;if(a2){a4=T(a2);a1(a4,a2)}return a4};this.deleteEndpoint=function(a4,a3){var a2=aW.setSuspendDrawing(true);var a5=(typeof a4=="string")?aA[a4]:a4;if(a5){aW.deleteObject({endpoint:a5})}if(!a2){aW.setSuspendDrawing(false,a3)}return aW};this.deleteEveryEndpoint=function(){var a2=aW.setSuspendDrawing(true);for(var a6 in ay){var a3=ay[a6];if(a3&&a3.length){for(var a5=0,a4=a3.length;a5<a4;a5++){aW.deleteEndpoint(a3[a5],true)}}}ay={};aA={};aW.anchorManager.reset();aW.dragManager.reset();if(!a2){aW.setSuspendDrawing(false)}return aW};var aI=function(a5,a7,a2){var a4=aW.Defaults.ConnectionType||aW.getDefaultConnectionType(),a3=a5.constructor==a4,a6=a3?{connection:a5,source:a5.source,target:a5.target,sourceId:a5.sourceId,targetId:a5.targetId,sourceEndpoint:a5.endpoints[0],targetEndpoint:a5.endpoints[1]}:a5;if(a7){aW.fire("connectionDetached",a6,a2)}aW.anchorManager.connectionDetached(a6)};this.unregisterEndpoint=function(a7){if(a7._jsPlumb.uuid){aA[a7._jsPlumb.uuid]=null}aW.anchorManager.deleteEndpoint(a7);for(var a6 in ay){var a2=ay[a6];if(a2){var a5=[];for(var a4=0,a3=a2.length;a4<a3;a4++){if(a2[a4]!=a7){a5.push(a2[a4])}}ay[a6]=a5}if(ay[a6].length<1){delete ay[a6]}}};this.detach=function(){if(arguments.length===0){return}var a6=aW.Defaults.ConnectionType||aW.getDefaultConnectionType(),a7=arguments[0].constructor==a6,a5=arguments.length==2?a7?(arguments[1]||{}):arguments[0]:arguments[0],ba=(a5.fireEvent!==false),a3=a5.forceDetach,a4=a7?arguments[0]:a5.connection;if(a4){if(a3||jsPlumbUtil.functionChain(true,false,[[a4.endpoints[0],"isDetachAllowed",[a4]],[a4.endpoints[1],"isDetachAllowed",[a4]],[a4,"isDetachAllowed",[a4]],[aW,"checkCondition",["beforeDetach",a4]]])){a4.endpoints[0].detach(a4,false,true,ba)}}else{var a2=l.extend({},a5);if(a2.uuids){ad(a2.uuids[0]).detachFrom(ad(a2.uuids[1]),ba)}else{if(a2.sourceEndpoint&&a2.targetEndpoint){a2.sourceEndpoint.detachFrom(a2.targetEndpoint)}else{var a9=B(A(a2.source)),a8=B(A(a2.target));N(a9,function(bb){if((bb.sourceId==a9&&bb.targetId==a8)||(bb.targetId==a9&&bb.sourceId==a8)){if(aW.checkCondition("beforeDetach",bb)){bb.endpoints[0].detach(bb,false,true,ba)}}})}}}};this.detachAllConnections=function(a5,a6){a6=a6||{};a5=A(a5);var a7=B(a5),a2=ay[a7];if(a2&&a2.length){for(var a4=0,a3=a2.length;a4<a3;a4++){a2[a4].detachAll(a6.fireEvent!==false)}}return aW};this.detachEveryConnection=function(a2){a2=a2||{};aW.doWhileSuspended(function(){for(var a6 in ay){var a3=ay[a6];if(a3&&a3.length){for(var a5=0,a4=a3.length;a5<a4;a5++){a3[a5].detachAll(a2.fireEvent!==false)}}}L.splice(0)});return aW};this.deleteObject=function(a2){var bb={endpoints:{},connections:{},endpointCount:0,connectionCount:0},ba=a2.fireEvent!==false,a9=a2.deleteAttachedObjects!==false;var a7=function(bc){if(bc!=null&&bb.connections[bc.id]==null){bc._jsPlumb&&bc.setHover(false);bb.connections[bc.id]=bc;bb.connectionCount++;if(a9){for(var bd=0;bd<bc.endpoints.length;bd++){if(bc.endpoints[bd]._deleteOnDetach){a5(bc.endpoints[bd])}}}}};var a5=function(bd){if(bd!=null&&bb.endpoints[bd.id]==null){bd._jsPlumb&&bd.setHover(false);bb.endpoints[bd.id]=bd;bb.endpointCount++;if(a9){for(var bc=0;bc<bd.connections.length;bc++){var be=bd.connections[bc];a7(be)}}}};if(a2.connection){a7(a2.connection)}else{a5(a2.endpoint)}for(var a4 in bb.connections){var a8=bb.connections[a4];if(a8.endpoints==null){continue}a8.endpoints[0].detachFromConnection(a8);a8.endpoints[1].detachFromConnection(a8);jsPlumbUtil.removeWithFunction(L,function(bc){return a8.id==bc.id});aI(a8,ba,a2.originalEvent);a8.cleanup();a8.destroy()}for(var a3 in bb.endpoints){var a6=bb.endpoints[a3];aW.unregisterEndpoint(a6);a6.cleanup();a6.destroy()}return bb};this.draggable=function(a5,a3){var a4,a2,a6;if(typeof a5=="object"&&a5.length){for(a4=0,a2=a5.length;a4<a2;a4++){a6=A(a5[a4]);if(a6){aN(a6,true,a3)}}}else{if(a5._nodes){for(a4=0,a2=a5._nodes.length;a4<a2;a4++){a6=A(a5._nodes[a4]);if(a6){aN(a6,true,a3)}}}else{a6=A(a5);if(a6){aN(a6,true,a3)}}}return aW};this.extend=function(a3,a2){return l.CurrentLibrary.extend(a3,a2)};var aX=function(a7,a6,a4,a2){for(var a5=0,a3=a7.length;a5<a3;a5++){a7[a5][a6].apply(a7[a5],a4)}return a2(a7)},M=function(a7,a6,a4){var a3=[];for(var a5=0,a2=a7.length;a5<a2;a5++){a3.push([a7[a5][a6].apply(a7[a5],a4),a7[a5]])}return a3},aa=function(a4,a3,a2){return function(){return aX(a4,a3,arguments,a2)}},af=function(a3,a2){return function(){return M(a3,a2,arguments)}},aZ=function(a2,a6){var a5=[];if(a2){if(typeof a2=="string"){if(a2==="*"){return a2}a5.push(a2)}else{a2=h(a2);if(a6){a5=a2}else{for(var a4=0,a3=a2.length;a4<a3;a4++){a5.push(V(a2[a4]).id)}}}}return a5},am=function(a4,a3,a2){if(a4==="*"){return true}return a4.length>0?jsPlumbUtil.indexOf(a4,a3)!=-1:!a2};this.getConnections=function(bb,a3){if(!bb){bb={}}else{if(bb.constructor==String){bb={scope:bb}}}var ba=bb.scope||aW.getDefaultScope(),a9=aZ(ba,true),a2=aZ(bb.source),a7=aZ(bb.target),a5=(!a3&&a9.length>1)?{}:[],bc=function(be,bf){if(!a3&&a9.length>1){var bd=a5[be];if(bd==null){bd=a5[be]=[]}bd.push(bf)}else{a5.push(bf)}};for(var a4=0,a6=L.length;a4<a6;a4++){var a8=L[a4];if(am(a9,a8.scope)&&am(a2,a8.sourceId)&&am(a7,a8.targetId)){bc(a8.scope,a8)}}return a5};var F=function(a2,a3){return function(a6){for(var a4=0,a5=a2.length;a4<a5;a4++){a6(a2[a4])}return a3(a2)}},I=function(a2){return function(a3){return a2[a3]}};var J=function(a7,a8){var a2={length:a7.length,each:F(a7,a8),get:I(a7)},a6=["setHover","removeAllOverlays","setLabel","addClass","addOverlay","removeOverlay","removeOverlays","showOverlay","hideOverlay","showOverlays","hideOverlays","setPaintStyle","setHoverPaintStyle","setSuspendEvents","setParameter","setParameters","setVisible","repaint","addType","toggleType","removeType","removeClass","setType","bind","unbind"],a5=["getLabel","getOverlay","isHover","getParameter","getParameters","getPaintStyle","getHoverPaintStyle","isVisible","hasType","getType","isSuspendEvents"],a3,a4;for(a3=0,a4=a6.length;a3<a4;a3++){a2[a6[a3]]=aa(a7,a6[a3],a8)}for(a3=0,a4=a5.length;a3<a4;a3++){a2[a5[a3]]=af(a7,a5[a3])}return a2};var aq=function(a3){var a2=J(a3,aq);return l.CurrentLibrary.extend(a2,{setDetachable:aa(a3,"setDetachable",aq),setReattach:aa(a3,"setReattach",aq),setConnector:aa(a3,"setConnector",aq),detach:function(){for(var a4=0,a5=a3.length;a4<a5;a4++){aW.detach(a3[a4])}},isDetachable:af(a3,"isDetachable"),isReattach:af(a3,"isReattach")})};var aM=function(a3){var a2=J(a3,aM);return l.CurrentLibrary.extend(a2,{setEnabled:aa(a3,"setEnabled",aM),setAnchor:aa(a3,"setAnchor",aM),isEnabled:af(a3,"isEnabled"),detachAll:function(){for(var a4=0,a5=a3.length;a4<a5;a4++){a3[a4].detachAll()}},remove:function(){for(var a4=0,a5=a3.length;a4<a5;a4++){aW.deleteObject({endpoint:a3[a4]})}}})};this.select=function(a2){a2=a2||{};a2.scope=a2.scope||"*";return aq(a2.connections||aW.getConnections(a2,true))};this.selectEndpoints=function(bd){bd=bd||{};bd.scope=bd.scope||"*";var a5=!bd.element&&!bd.source&&!bd.target,a8=a5?"*":aZ(bd.element),a2=a5?"*":aZ(bd.source),bh=a5?"*":aZ(bd.target),ba=aZ(bd.scope,true);var bj=[];for(var a3 in ay){var be=am(a8,a3,true),bb=am(a2,a3,true),bg=a2!="*",bi=am(bh,a3,true),a7=bh!="*";if(be||bb||bi){inner:for(var bc=0,a6=ay[a3].length;bc<a6;bc++){var a9=ay[a3][bc];if(am(ba,a9.scope,true)){var bf=(bg&&a2.length>0&&!a9.isSource),a4=(a7&&bh.length>0&&!a9.isTarget);if(bf||a4){continue inner}bj.push(a9)}}}}return aM(bj)};this.getAllConnections=function(){return L};this.getDefaultScope=function(){return K};this.getEndpoint=ad;this.getEndpoints=function(a2){return ay[V(a2).id]};this.getDefaultEndpointType=function(){return l.Endpoint};this.getDefaultConnectionType=function(){return l.Connection};this.getId=B;this.getOffset=function(a3){var a2=X[a3];return O({elId:a3})};this.getSelector=function(){return l.CurrentLibrary.getSelector.apply(null,arguments)};this.getSize=function(a3){var a2=U[a3];if(!a2){O({elId:a3})}return U[a3]};this.appendElement=aB;var ax=false;this.isHoverSuspended=function(){return ax};this.setHoverSuspended=function(a2){ax=a2};var aC=function(a2){return function(){return jsPlumbAdapter.isRenderModeAvailable(a2)}};this.isCanvasAvailable=aC("canvas");this.isSVGAvailable=aC("svg");this.isVMLAvailable=aC("vml");this.hide=function(a2,a3){aF(a2,"none",a3);return aW};this.idstamp=Z;this.connectorsInitialized=false;var aO=[],aD=["canvas","svg","vml"];this.registerConnectorType=function(a2,a3){aO.push([a2,a3])};this.init=function(){var a4=function(a7,a5,a6){l.Connectors[a7][a5]=function(){a6.apply(this,arguments);l.ConnectorRenderers[a7].apply(this,arguments)};jsPlumbUtil.extend(l.Connectors[a7][a5],[a6,l.ConnectorRenderers[a7]])};if(!l.connectorsInitialized){for(var a3=0;a3<aO.length;a3++){for(var a2=0;a2<aD.length;a2++){a4(aD[a2],aO[a3][1],aO[a3][0])}}l.connectorsInitialized=true}if(!E){aW.anchorManager=new l.AnchorManager({jsPlumbInstance:aW});aW.setRenderMode(aW.Defaults.RenderMode);E=true;aW.fire("ready",aW)}}.bind(this);this.log=H;this.jsPlumbUIComponent=v;this.makeAnchor=function(){var a6=function(a9,ba){if(l.Anchors[a9]){return new l.Anchors[a9](ba)}if(!aW.Defaults.DoNotThrowErrors){throw {msg:"jsPlumb: unknown anchor type '"+a9+"'"}}};if(arguments.length===0){return null}var a8=arguments[0],a4=arguments[1],a3=arguments[2],a5=null;if(a8.compute&&a8.getOrientation){return a8}else{if(typeof a8=="string"){a5=a6(arguments[0],{elementId:a4,jsPlumbInstance:aW})}else{if(f.isArray(a8)){if(f.isArray(a8[0])||f.isString(a8[0])){if(a8.length==2&&f.isString(a8[0])&&f.isObject(a8[1])){var a2=l.extend({elementId:a4,jsPlumbInstance:aW},a8[1]);a5=a6(a8[0],a2)}else{a5=new l.DynamicAnchor({anchors:a8,selector:null,elementId:a4,jsPlumbInstance:a3})}}else{var a7={x:a8[0],y:a8[1],orientation:(a8.length>=4)?[a8[2],a8[3]]:[0,0],offsets:(a8.length>=6)?[a8[4],a8[5]]:[0,0],elementId:a4,jsPlumbInstance:a3,cssClass:a8.length==7?a8[6]:null};a5=new l.Anchor(a7);a5.clone=function(){return new l.Anchor(a7)}}}}}if(!a5.id){a5.id="anchor_"+Z()}return a5};this.makeAnchors=function(a5,a3,a2){var a7=[];for(var a4=0,a6=a5.length;a4<a6;a4++){if(typeof a5[a4]=="string"){a7.push(l.Anchors[a5[a4]]({elementId:a3,jsPlumbInstance:a2}))}else{if(f.isArray(a5[a4])){a7.push(aW.makeAnchor(a5[a4],a3,a2))}}}return a7};this.makeDynamicAnchor=function(a2,a3){return new l.DynamicAnchor({anchors:a2,selector:a3,elementId:null,jsPlumbInstance:aW})};var aE={},ao={},aS={},ac={},Q=function(a2,a3){a2.paintStyle=a2.paintStyle||aW.Defaults.EndpointStyles[a3]||aW.Defaults.EndpointStyle||l.Defaults.EndpointStyles[a3]||l.Defaults.EndpointStyle;a2.hoverPaintStyle=a2.hoverPaintStyle||aW.Defaults.EndpointHoverStyles[a3]||aW.Defaults.EndpointHoverStyle||l.Defaults.EndpointHoverStyles[a3]||l.Defaults.EndpointHoverStyle;a2.anchor=a2.anchor||aW.Defaults.Anchors[a3]||aW.Defaults.Anchor||l.Defaults.Anchors[a3]||l.Defaults.Anchor;a2.endpoint=a2.endpoint||aW.Defaults.Endpoints[a3]||aW.Defaults.Endpoint||l.Defaults.Endpoints[a3]||l.Defaults.Endpoint},ag={},aG={},aJ={},S={},D={},G={},Y={},az=function(a3,a8,a2){var a6=a3.target||a3.srcElement,a5=false,a7=aW.getSelector(a8,a2);for(var a4=0;a4<a7.length;a4++){if(a7[a4]==a6){a5=true;break}}return a5};this.makeTarget=function(a5,a6,bd){var a3=l.extend({_jsPlumb:aW},bd);l.extend(a3,a6);Q(a3,1);var ba=l.CurrentLibrary,bb=a3.scope||aW.Defaults.Scope,a7=!(a3.deleteEndpointsOnDetach===false),a4=a3.maxConnections||-1,a2=a3.onMaxConnections;_doOne=function(bk){var bi=V(bk),bh=bi.id,bg=new v(a3),bf=l.extend({},a3.dropOptions||{});aE[bh]=a3;aS[bh]=a3.uniqueEndpoint;ac[bh]=a4;Y[bh]=true;var be=function(){aW.currentlyDragging=false;var bn=l.CurrentLibrary.getDropEvent(arguments),bp=aW.select({target:bh}).length,bA=h(ba.getDragObject(arguments)),bo=aW.getAttribute(bA,"dragId"),by=aW.getAttribute(bA,"originalScope"),bt=aR[bo],bv=bt.endpoints[0].isFloating()?0:1,bm=bt.endpoints[0],bl=a3.endpoint?l.extend({},a3.endpoint):{};if(!Y[bh]||ac[bh]>0&&bp>=ac[bh]){if(a2){a2({element:bi.el,connection:bt},bn)}return false}bm.anchor.locked=false;if(by){ba.setDragScope(bA,by)}var bs=bg.isDropAllowed(bv===0?bh:bt.sourceId,bv===0?bt.targetId:bh,bt.scope,bt,null);if(bt.suspendedEndpoint){bt[bv?"targetId":"sourceId"]=bt.suspendedEndpoint.elementId;bt[bv?"target":"source"]=bt.suspendedEndpoint.element;bt.endpoints[bv]=bt.suspendedEndpoint}if(bs){var bu=ba.getElementObject(bi.el),bz=ao[bh]||aW.addEndpoint(bu,a3);if(a3.uniqueEndpoint){ao[bh]=bz}bz._doNotDeleteOnDetach=false;bz._deleteOnDetach=true;if(bz.anchor.positionFinder!=null){var bw=ba.getUIPosition(arguments,aW.getZoom()),br=s(bu,aW),bx=a(bu),bq=bz.anchor.positionFinder(bw,br,bx,bz.anchor.constructorParams);bz.anchor.x=bq[0];bz.anchor.y=bq[1]}bt[bv?"target":"source"]=bz.element;bt[bv?"targetId":"sourceId"]=bz.elementId;bt.endpoints[bv].detachFromConnection(bt);if(bt.endpoints[bv]._deleteOnDetach){bt.endpoints[bv].deleteAfterDragStop=true}bz.addConnection(bt);bt.endpoints[bv]=bz;bt.deleteEndpointsOnDetach=a7;if(bv==1){aW.anchorManager.updateOtherEndpoint(bt.sourceId,bt.suspendedElementId,bt.targetId,bt)}else{aW.anchorManager.sourceChanged(bt.suspendedEndpoint.elementId,bt.sourceId,bt)}a1(bt,null,bn)}else{if(bt.suspendedEndpoint){if(bt.isReattach()){bt.setHover(false);bt.floatingAnchorIndex=null;bt.suspendedEndpoint.addConnection(bt);aW.repaint(bm.elementId)}else{bm.detach(bt,false,true,true,bn)}}}};var bj=ba.dragEvents.drop;bf.scope=bf.scope||bb;bf[bj]=f.wrap(bf[bj],be);ba.initDroppable(h(bi.el),bf,true)};a5=ap(a5);var a9=a5.length&&a5.constructor!=String?a5:[a5];for(var a8=0,bc=a9.length;a8<bc;a8++){_doOne(a9[a8])}return aW};this.unmakeTarget=function(a2,a4){var a3=V(a2);l.CurrentLibrary.destroyDroppable(a3.el);if(!a4){delete aE[a3.id];delete aS[a3.id];delete ac[a3.id];delete Y[a3.id]}return aW};this.makeSource=function(a6,a7,bc){var a4=l.extend({},bc);l.extend(a4,a7);Q(a4,0);var ba=l.CurrentLibrary,a5=a4.maxConnections||-1,a3=a4.onMaxConnections,a2=function(be){var bf=be.id,bl=h(be.el),bn=function(){return a4.parent==null?null:a4.parent==="parent"?be.el.parentNode:A(a4.parent)},bd=a4.parent!=null?aW.getId(bn()):bf;ag[bd]=a4;aJ[bd]=a4.uniqueEndpoint;S[bd]=true;var bg=ba.dragEvents.stop,bk=ba.dragEvents.drag,bm=l.extend({},a4.dragOptions||{}),bi=bm.drag,bo=bm.stop,bp=null,bj=false;G[bd]=a5;bm.scope=bm.scope||a4.scope;bm[bk]=f.wrap(bm[bk],function(){if(bi){bi.apply(this,arguments)}bj=false});bm[bg]=f.wrap(bm[bg],function(){if(bo){bo.apply(this,arguments)}aW.currentlyDragging=false;if(bp._jsPlumb!=null){ba.unbind(bp.canvas,"mousedown");var br=a4.anchor||aW.Defaults.Anchor,bs=bp.anchor,bu=bp.connections[0];bp.setAnchor(aW.makeAnchor(br,bf,aW),true);if(a4.parent){var bt=bn();if(bt){var bq=bp.elementId,bv=a4.container||aW.Defaults.Container||l.Defaults.Container;bp.setElement(bt,bv);bp.endpointWillMoveAfterConnection=false;bu.previousConnection=null;jsPlumbUtil.removeWithFunction(L,function(bw){return bw.id===bu.id});aW.anchorManager.connectionDetached({sourceId:bu.sourceId,targetId:bu.targetId,connection:bu});a1(bu)}}bp.repaint();aW.repaint(bp.elementId);aW.repaint(bu.targetId)}});var bh=function(bu){if(!S[bd]){return}if(a4.filter){var bB=ba.getOriginalEvent(bu),bq=jsPlumbUtil.isString(a4.filter)?az(bB,bl,a4.filter):a4.filter(bB,bl);if(bq===false){return}}var bs=aW.select({source:bd}).length;if(G[bd]>=0&&bs>=G[bd]){if(a3){a3({element:bl,maxConnections:a5},bu)}return false}var bz=O({elId:bf}).o,bw=aW.getZoom(),by=(((bu.pageX||bu.page.x)/bw)-bz.left)/bz.width,bx=(((bu.pageY||bu.page.y)/bw)-bz.top)/bz.height,bE=by,bD=bx;if(a4.parent){var bv=bn(),bt=B(bv);bz=O({elId:bt}).o;bE=((bu.pageX||bu.page.x)-bz.left)/bz.width;bD=((bu.pageY||bu.page.y)-bz.top)/bz.height}var bC={};l.extend(bC,a4);bC.isSource=true;bC.anchor=[by,bx,0,0];bC.parentAnchor=[bE,bD,0,0];bC.dragOptions=bm;if(a4.parent){var br=bC.container||aW.Defaults.Container||l.Defaults.Container;if(br){bC.container=br}else{bC.container=l.CurrentLibrary.getParent(bn())}}bp=aW.addEndpoint(bf,bC);bj=true;bp.endpointWillMoveAfterConnection=a4.parent!=null;bp.endpointWillMoveTo=a4.parent?bn():null;bp._doNotDeleteOnDetach=false;bp._deleteOnDetach=true;var bA=function(){if(bj){bj=false;aW.deleteEndpoint(bp)}};aW.registerListener(bp.canvas,"mouseup",bA);aW.registerListener(bl,"mouseup",bA);ba.trigger(bp.canvas,"mousedown",bu)};aW.registerListener(bl,"mousedown",bh);D[bf]=bh;if(a4.filter&&jsPlumbUtil.isString(a4.filter)){ba.setDragFilter(bl,a4.filter)}};a6=ap(a6);var a9=a6.length&&a6.constructor!=String?a6:[a6];for(var a8=0,bb=a9.length;a8<bb;a8++){a2(V(a9[a8]))}return aW};this.unmakeSource=function(a3,a5){var a4=V(a3),a2=D[a4.id];if(a2){aW.unregisterListener(a4.el,"mousedown",a2)}if(!a5){delete ag[a4.id];delete aJ[a4.id];delete S[a4.id];delete D[a4.id];delete G[a4.id]}return aW};this.unmakeEverySource=function(){for(var a2 in S){aW.unmakeSource(a2,true)}ag={};aJ={};S={};D={}};this.unmakeEveryTarget=function(){for(var a2 in Y){aW.unmakeTarget(a2,true)}aE={};aS={};ac={};Y={};return aW};var at=function(a7,a6,a8,a2){var a3=a7=="source"?S:Y;a6=ap(a6);if(f.isString(a6)){a3[a6]=a2?!a3[a6]:a8}else{if(a6.length){for(var a4=0,a5=a6.length;a4<a5;a4++){var a9=V(a6[a4]);a3[a9.id]=a2?!a3[a9.id]:a8}}}return aW};this.toggleSourceEnabled=function(a2){at("source",a2,null,true);return aW.isSourceEnabled(a2)};this.setSourceEnabled=function(a2,a3){return at("source",a2,a3)};this.isSource=function(a2){return S[V(a2).id]!=null};this.isSourceEnabled=function(a2){return S[V(a2).id]===true};this.toggleTargetEnabled=function(a2){at("target",a2,null,true);return aW.isTargetEnabled(a2)};this.isTarget=function(a2){return Y[V(a2).id]!=null};this.isTargetEnabled=function(a2){return Y[V(a2).id]===true};this.setTargetEnabled=function(a2,a3){return at("target",a2,a3)};this.ready=function(a2){aW.bind("ready",a2)};this.repaint=function(a4,a6,a5){if(typeof a4=="object"&&a4.length){for(var a2=0,a3=a4.length;a2<a3;a2++){aL(a4[a2],a6,a5)}}else{aL(a4,a6,a5)}return aW};this.repaintEverything=function(){var a3=n();for(var a2 in ay){aL(a2,null,a3)}return aW};this.removeAllEndpoints=function(a3,a4){var a2=function(a9){var a7=V(a9),a8=ay[a7.id],a5,a6;if(a8){for(a5=0,a6=a8.length;a5<a6;a5++){aW.deleteEndpoint(a8[a5])}}delete ay[a7.id];if(a4){if(a7.el&&a7.el.nodeType!=3&&a7.el.nodeType!=8){for(a5=0,a6=a7.el.childNodes.length;a5<a6;a5++){a2(a7.el.childNodes[a5])}}}};a2(a3);return aW};this.remove=function(a2,a4){var a3=V(a2);aW.doWhileSuspended(function(){aW.removeAllEndpoints(a3.id,true);aW.dragManager.elementRemoved(a3.id);delete aR[a3.id];aW.anchorManager.clearFor(a3.id);aW.anchorManager.removeFloatingConnection(a3.id)},a4===false);if(a3.el){l.CurrentLibrary.removeElement(a3.el)}};var W={},aP=function(){for(var a3 in W){for(var a2=0,a4=W[a3].length;a2<a4;a2++){var a5=W[a3][a2];l.CurrentLibrary.unbind(a5.el,a5.event,a5.listener)}}W={}};this.registerListener=function(a3,a2,a4){l.CurrentLibrary.bind(a3,a2,a4);jsPlumbUtil.addToList(W,a2,{el:a3,event:a2,listener:a4})};this.unregisterListener=function(a3,a2,a4){l.CurrentLibrary.unbind(a3,a2,a4);jsPlumbUtil.removeWithFunction(W,function(a5){return a5.type==a2&&a5.listener==a4})};this.reset=function(){aW.deleteEveryEndpoint();aW.unbind();aE={};ao={};aS={};ac={};ag={};aG={};aJ={};G={};L.splice(0);aP();aW.anchorManager.reset();if(!jsPlumbAdapter.headless){aW.dragManager.reset()}};this.setDefaultScope=function(a2){K=a2;return aW};this.setDraggable=aU;this.setId=function(a4,a5,a9){var a2;if(jsPlumbUtil.isString(a4)){a2=a4}else{a4=A(a4);a2=aW.getId(a4)}var a3=aW.getConnections({source:a2,scope:"*"},true),a7=aW.getConnections({target:a2,scope:"*"},true);a5=""+a5;if(!a9){a4=A(a2);jsPlumbAdapter.setAttribute(a4,"id",a5)}else{a4=A(a5)}ay[a5]=ay[a2]||[];for(var a8=0,ba=ay[a5].length;a8<ba;a8++){ay[a5][a8].setElementId(a5);ay[a5][a8].setReferenceElement(a4)}delete ay[a2];aW.anchorManager.changeId(a2,a5);if(!jsPlumbAdapter.headless){aW.dragManager.changeId(a2,a5)}var a6=function(bf,bb,be){for(var bc=0,bd=bf.length;bc<bd;bc++){bf[bc].endpoints[bb].setElementId(a5);bf[bc].endpoints[bb].setReferenceElement(a4);bf[bc][be+"Id"]=a5;bf[bc][be]=a4}};a6(a3,0,"source");a6(a7,1,"target");aW.repaint(a5)};this.setDebugLog=function(a2){H=a2};this.setSuspendDrawing=function(a4,a2){var a3=aH;aH=a4;if(a4){aK=new Date().getTime()}else{aK=null}if(a2){aW.repaintEverything()}return a3};this.isSuspendDrawing=function(){return aH};this.getSuspendedAt=function(){return aK};this.doWhileSuspended=function(a3,a2){var a5=aW.isSuspendDrawing();if(!a5){aW.setSuspendDrawing(true)}try{a3()}catch(a4){f.log("Function run while suspended failed",a4)}if(!a5){aW.setSuspendDrawing(false,!a2)}};this.updateOffset=O;this.getOffset=function(a2){return X[a2]};this.getSize=function(a2){return U[a2]};this.getCachedData=au;this.timestamp=n;this.setRenderMode=function(a5){P=jsPlumbAdapter.setRenderMode(a5);var a2,a4;if(P==l.CANVAS){var a3=function(a6){l.CurrentLibrary.bind(document,a6,function(ba){if(!aW.currentlyDragging&&P==l.CANVAS){for(a2=0,a4=L.length;a2<a4;a2++){var a8=L[a2].getConnector()[a6](ba);if(a8){return}}for(var a9 in ay){var a7=ay[a9];for(a2=0,a4=a7.length;a2<a4;a2++){if(a7[a2].endpoint[a6]&&a7[a2].endpoint[a6](ba)){return}}}}})};a3("click");a3("dblclick");a3("mousemove");a3("mousedown");a3("mouseup");a3("contextmenu")}return P};this.getRenderMode=function(){return P};this.show=function(a2,a3){aF(a2,"block",a3);return aW};this.getTestHarness=function(){return{endpointsByElement:ay,endpointCount:function(a2){var a3=ay[a2];return a3?a3.length:0},connectionCount:function(a2){a2=a2||K;var a3=aW.getConnections({scope:a2});return a3?a3.length:0},getId:B,makeAnchor:self.makeAnchor,makeDynamicAnchor:self.makeDynamicAnchor}};this.toggleVisible=aw;this.toggleDraggable=aT;this.addListener=this.bind;this.adjustForParentOffsetAndScroll=function(a7,a4){var a5=null,a2=a7;if(a4.tagName.toLowerCase()==="svg"&&a4.parentNode){a5=a4.parentNode}else{if(a4.offsetParent){a5=a4.offsetParent}}if(a5!=null){var a3=a5.tagName.toLowerCase()==="body"?{left:0,top:0}:s(a5,aW),a6=a5.tagName.toLowerCase()==="body"?{left:0,top:0}:{left:a5.scrollLeft,top:a5.scrollTop};a2[0]=a7[0]-a3.left+a6.left;a2[1]=a7[1]-a3.top+a6.top}return a2};if(!jsPlumbAdapter.headless){aW.dragManager=jsPlumbAdapter.getDragManager(aW);aW.recalculateOffsets=aW.dragManager.updateOffsets}};jsPlumbUtil.extend(t,jsPlumbUtil.EventGenerator,{setAttribute:function(D,B,C){jsPlumbAdapter.setAttribute(D,B,C)},getAttribute:function(C,B){return jsPlumbAdapter.getAttribute(l.CurrentLibrary.getDOMElement(C),B)},registerConnectionType:function(C,B){this._connectionTypes[C]=l.extend({},B)},registerConnectionTypes:function(C){for(var B in C){this._connectionTypes[B]=l.extend({},C[B])}},registerEndpointType:function(C,B){this._endpointTypes[C]=l.extend({},B)},registerEndpointTypes:function(C){for(var B in C){this._endpointTypes[B]=l.extend({},C[B])}},getType:function(C,B){return B==="connection"?this._connectionTypes[C]:this._endpointTypes[C]},setIdChanged:function(C,B){this.setId(C,B,true)}});var l=new t();if(typeof window!="undefined"){window.jsPlumb=l}l.getInstance=function(C){var B=new t(C);B.init();return B};if(typeof define==="function"){define("jsplumb",[],function(){return l});define("jsplumbinstance",[],function(){return l.getInstance()})}if(typeof exports!=="undefined"){exports.jsPlumb=l}})();(function(){var e=function(i,g){var h=false;return{drag:function(){if(h){h=false;return true}var k=jsPlumb.CurrentLibrary.getUIPosition(arguments,g.getZoom());if(i.element){jsPlumb.CurrentLibrary.setOffset(i.element,k);g.repaint(i.element,k)}},stopDrag:function(){h=true}}};var b=function(k,h,g){var m=document.createElement("div");m.style.position="absolute";var i=jsPlumb.CurrentLibrary.getElementObject(m);jsPlumb.CurrentLibrary.appendElement(m,h);var l=g.getId(m);g.updateOffset({elId:l});k.id=l;k.element=m};var f=function(n,m,o,l,i,h,g){var k=new jsPlumb.FloatingAnchor({reference:m,referenceCanvas:l,jsPlumbInstance:h});return g({paintStyle:n,endpoint:o,anchor:k,source:i,scope:"__floating"})};var c=["connectorStyle","connectorHoverStyle","connectorOverlays","connector","connectionType","connectorClass","connectorHoverClass"];var a=function(k,h){var g=0;if(h!=null){for(var l=0;l<k.connections.length;l++){if(k.connections[l].sourceId==h||k.connections[l].targetId==h){g=l;break}}}return k.connections[g]};var d=function(h,g){return jsPlumbUtil.findWithFunction(g.connections,function(i){return i.id==h.id})};jsPlumb.Endpoint=function(H){var I=H._jsPlumb,m=jsPlumb.CurrentLibrary,G=jsPlumbAdapter.getAttribute,o=m.getElementObject,J=m.getDOMElement,l=jsPlumbUtil,B=H.newConnection,E=H.newEndpoint,k=H.finaliseConnection,u=H.fireDetachEvent,v=H.floatingConnections;this.idPrefix="_jsplumb_e_";this.defaultLabelLocation=[0.5,0.5];this.defaultOverlayKeys=["Overlays","EndpointOverlays"];this.parent=H.parent;OverlayCapableJsPlumbUIComponent.apply(this,arguments);this.getDefaultType=function(){return{parameters:{},scope:null,maxConnections:this._jsPlumb.instance.Defaults.MaxConnections,paintStyle:this._jsPlumb.instance.Defaults.EndpointStyle||jsPlumb.Defaults.EndpointStyle,endpoint:this._jsPlumb.instance.Defaults.Endpoint||jsPlumb.Defaults.Endpoint,hoverPaintStyle:this._jsPlumb.instance.Defaults.EndpointHoverStyle||jsPlumb.Defaults.EndpointHoverStyle,overlays:this._jsPlumb.instance.Defaults.EndpointOverlays||jsPlumb.Defaults.EndpointOverlays,connectorStyle:H.connectorStyle,connectorHoverStyle:H.connectorHoverStyle,connectorClass:H.connectorClass,connectorHoverClass:H.connectorHoverClass,connectorOverlays:H.connectorOverlays,connector:H.connector,connectorTooltip:H.connectorTooltip}};this._jsPlumb.enabled=!(H.enabled===false);this._jsPlumb.visible=true;this.element=J(H.source);this._jsPlumb.uuid=H.uuid;this._jsPlumb.floatingEndpoint=null;var p=null;if(this._jsPlumb.uuid){H.endpointsByUUID[this._jsPlumb.uuid]=this}this.elementId=H.elementId;this._jsPlumb.connectionCost=H.connectionCost;this._jsPlumb.connectionsDirected=H.connectionsDirected;this._jsPlumb.currentAnchorClass="";this._jsPlumb.events={};var s=function(){m.removeClass(this.element,I.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass);this.removeClass(I.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass);this._jsPlumb.currentAnchorClass=this.anchor.getCssClass();this.addClass(I.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass);m.addClass(this.element,I.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass)}.bind(this);this.setAnchor=function(i,L){this._jsPlumb.instance.continuousAnchorFactory.clear(this.elementId);this.anchor=this._jsPlumb.instance.makeAnchor(i,this.elementId,I);s();this.anchor.bind("anchorChanged",function(M){this.fire("anchorChanged",{endpoint:this,anchor:M});s()}.bind(this));if(!L){this._jsPlumb.instance.repaint(this.elementId)}return this};var x=H.anchor?H.anchor:H.anchors?H.anchors:(I.Defaults.Anchor||"Top");this.setAnchor(x,true);var K=function(i){if(this.connections.length>0){this.connections[0].setHover(i,false)}else{this.setHover(i)}}.bind(this);if(!H._transient){this._jsPlumb.instance.anchorManager.add(this,this.elementId)}this.setEndpoint=function(L){if(this.endpoint!=null){this.endpoint.cleanup();this.endpoint.destroy()}var i=function(O,Q){var P=I.getRenderMode();if(jsPlumb.Endpoints[P][O]){return new jsPlumb.Endpoints[P][O](Q)}if(!I.Defaults.DoNotThrowErrors){throw {msg:"jsPlumb: unknown endpoint type '"+O+"'"}}};var M={_jsPlumb:this._jsPlumb.instance,cssClass:H.cssClass,parent:H.parent,container:H.container,tooltip:H.tooltip,connectorTooltip:H.connectorTooltip,endpoint:this};if(l.isString(L)){this.endpoint=i(L,M)}else{if(l.isArray(L)){M=l.merge(L[1],M);this.endpoint=i(L[0],M)}else{this.endpoint=L.clone()}}var N=jsPlumb.extend({},M);this.endpoint.clone=function(){if(l.isString(L)){return i(L,M)}else{if(l.isArray(L)){M=l.merge(L[1],M);return i(L[0],M)}}}.bind(this);this.type=this.endpoint.type;this.bindListeners(this.endpoint,this,K)};this.setEndpoint(H.endpoint||I.Defaults.Endpoint||jsPlumb.Defaults.Endpoint||"Dot");this.setPaintStyle(H.paintStyle||H.style||I.Defaults.EndpointStyle||jsPlumb.Defaults.EndpointStyle,true);this.setHoverPaintStyle(H.hoverPaintStyle||I.Defaults.EndpointHoverStyle||jsPlumb.Defaults.EndpointHoverStyle,true);this._jsPlumb.paintStyleInUse=this.getPaintStyle();l.copyValues(c,H,this);this.isSource=H.isSource||false;this.isTarget=H.isTarget||false;this._jsPlumb.maxConnections=H.maxConnections||I.Defaults.MaxConnections;this.canvas=this.endpoint.canvas;this.addClass(I.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass);m.addClass(this.element,I.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass);this.connections=H.connections||[];this.connectorPointerEvents=H["connector-pointer-events"];this.scope=H.scope||I.getDefaultScope();this.timestamp=null;this.reattachConnections=H.reattach||I.Defaults.ReattachConnections;this.connectionsDetachable=I.Defaults.ConnectionsDetachable;if(H.connectionsDetachable===false||H.detachable===false){this.connectionsDetachable=false}this.dragAllowedWhenFull=H.dragAllowedWhenFull||true;if(H.onMaxConnections){this.bind("maxConnections",H.onMaxConnections)}this.addConnection=function(i){this.connections.push(i);this[(this.connections.length>0?"add":"remove")+"Class"](I.endpointConnectedClass);this[(this.isFull()?"add":"remove")+"Class"](I.endpointFullClass)};this.detachFromConnection=function(L,i){i=i==null?d(L,this):i;if(i>=0){this.connections.splice(i,1);this[(this.connections.length>0?"add":"remove")+"Class"](I.endpointConnectedClass);this[(this.isFull()?"add":"remove")+"Class"](I.endpointFullClass)}};this.detach=function(M,P,N,S,i,L,O){var R=O==null?d(M,this):O,Q=false;S=(S!==false);if(R>=0){if(N||M._forceDetach||(M.isDetachable()&&M.isDetachAllowed(M)&&this.isDetachAllowed(M))){I.deleteObject({connection:M,fireEvent:(!P&&S),originalEvent:i});Q=true}}return Q};this.detachAll=function(L,i){while(this.connections.length>0){this.detach(this.connections[0],false,true,L!==false,i,this,0)}return this};this.detachFrom=function(P,O,L){var Q=[];for(var N=0;N<this.connections.length;N++){if(this.connections[N].endpoints[1]==P||this.connections[N].endpoints[0]==P){Q.push(this.connections[N])}}for(var M=0;M<Q.length;M++){this.detach(Q[M],false,true,O,L)}return this};this.getElement=function(){return this.element};this.setElement=function(i){var M=this._jsPlumb.instance.getId(i),L=this.elementId;l.removeWithFunction(H.endpointsByElement[this.elementId],function(N){return N.id==this.id}.bind(this));this.element=J(i);this.elementId=I.getId(this.element);I.anchorManager.rehomeEndpoint(this,L,this.element);I.dragManager.endpointAdded(this.element);l.addToList(H.endpointsByElement,M,this);return this};this.makeInPlaceCopy=function(){var N=this.anchor.getCurrentLocation({element:this}),M=this.anchor.getOrientation(this),L=this.anchor.getCssClass(),i={bind:function(){},compute:function(){return[N[0],N[1]]},getCurrentLocation:function(){return[N[0],N[1]]},getOrientation:function(){return M},getCssClass:function(){return L}};return E({anchor:i,source:this.element,paintStyle:this.getPaintStyle(),endpoint:H.hideOnDrag?"Blank":this.endpoint,_transient:true,scope:this.scope})};this.isFloating=function(){return this.anchor!=null&&this.anchor.isFloating};this.connectorSelector=function(){var i=this.connections[0];if(this.isTarget&&i){return i}else{return(this.connections.length<this._jsPlumb.maxConnections)||this._jsPlumb.maxConnections==-1?null:i}};this.setStyle=this.setPaintStyle;this.paint=function(P){P=P||{};var V=P.timestamp,U=!(P.recalc===false);if(!V||this.timestamp!==V){var O=I.updateOffset({elId:this.elementId,timestamp:V});var ab=P.offset?P.offset.o:O.o;if(ab!=null){var S=P.anchorPoint,Q=P.connectorPaintStyle;if(S==null){var L=P.dimensions||O.s,N={xy:[ab.left,ab.top],wh:L,element:this,timestamp:V};if(U&&this.anchor.isDynamic&&this.connections.length>0){var X=a(this,P.elementWithPrecedence),aa=X.endpoints[0]==this?1:0,R=aa===0?X.sourceId:X.targetId,Z=I.getCachedData(R),W=Z.o,Y=Z.s;N.txy=[W.left,W.top];N.twh=Y;N.tElement=X.endpoints[aa]}S=this.anchor.compute(N)}this.endpoint.compute(S,this.anchor.getOrientation(this),this._jsPlumb.paintStyleInUse,Q||this.paintStyleInUse);this.endpoint.paint(this._jsPlumb.paintStyleInUse,this.anchor);this.timestamp=V;for(var T=0;T<this._jsPlumb.overlays.length;T++){var M=this._jsPlumb.overlays[T];if(M.isVisible()){this._jsPlumb.overlayPlacements[T]=M.draw(this.endpoint,this._jsPlumb.paintStyleInUse);M.paint(this._jsPlumb.overlayPlacements[T])}}}}};this.repaint=this.paint;if(m.isDragSupported(this.element)&&(this.isSource||this.isTarget)){var A={id:null,element:null},z=null,h=false,n=null,g=e(A,I);var q=function(){z=this.connectorSelector();var P=true;if(!this.isEnabled()){P=false}if(z==null&&!this.isSource){P=false}if(this.isSource&&this.isFull()&&!this.dragAllowedWhenFull){P=false}if(z!=null&&!z.isDetachable()){P=false}if(P===false){if(m.stopDrag){m.stopDrag()}g.stopDrag();return false}for(var O=0;O<this.connections.length;O++){this.connections[O].setHover(false)}this.addClass("endpointDrag");I.setConnectionBeingDragged(true);if(z&&!this.isFull()&&this.isSource){z=null}I.updateOffset({elId:this.elementId});p=this.makeInPlaceCopy();p.referenceEndpoint=this;p.paint();b(A,this.parent,I);var T=o(p.canvas),R=jsPlumb.CurrentLibrary.getOffset(T,I),N=I.adjustForParentOffsetAndScroll([R.left,R.top],p.canvas),S=o(this.canvas);m.setOffset(A.element,{left:N[0],top:N[1]});if(this.parentAnchor){this.anchor=I.makeAnchor(this.parentAnchor,this.elementId,I)}I.setAttribute(this.canvas,"dragId",A.id);I.setAttribute(this.canvas,"elId",this.elementId);this._jsPlumb.floatingEndpoint=f(this.getPaintStyle(),this.anchor,this.endpoint,this.canvas,A.element,I,E);this.canvas.style.visibility="hidden";if(z==null){this.anchor.locked=true;this.setHover(false,false);z=B({sourceEndpoint:this,targetEndpoint:this._jsPlumb.floatingEndpoint,source:this.endpointWillMoveTo||this.element,target:A.element,anchors:[this.anchor,this._jsPlumb.floatingEndpoint.anchor],paintStyle:H.connectorStyle,hoverPaintStyle:H.connectorHoverStyle,connector:H.connector,overlays:H.connectorOverlays,type:this.connectionType,cssClass:this.connectorClass,hoverClass:this.connectorHoverClass});z.addClass(I.draggingClass);this._jsPlumb.floatingEndpoint.addClass(I.draggingClass);I.fire("connectionDrag",z)}else{h=true;z.setHover(false);r(T,false,true);var M=z.endpoints[0].id==this.id?0:1;z.floatingAnchorIndex=M;this.detachFromConnection(z);var Q=jsPlumb.CurrentLibrary.getDragScope(S);I.setAttribute(this.canvas,"originalScope",Q);var L=m.getDropScope(S);m.setDragScope(S,L);I.fire("connectionDrag",z);if(M===0){n=[z.source,z.sourceId,S,Q];z.source=A.element;z.sourceId=A.id}else{n=[z.target,z.targetId,S,Q];z.target=A.element;z.targetId=A.id}z.endpoints[M===0?1:0].anchor.locked=true;z.suspendedEndpoint=z.endpoints[M];z.suspendedElement=z.endpoints[M].getElement();z.suspendedElementId=z.endpoints[M].elementId;z.suspendedElementType=M===0?"source":"target";z.suspendedEndpoint.setHover(false);this._jsPlumb.floatingEndpoint.referenceEndpoint=z.suspendedEndpoint;z.endpoints[M]=this._jsPlumb.floatingEndpoint;z.addClass(I.draggingClass);this._jsPlumb.floatingEndpoint.addClass(I.draggingClass)}v[A.id]=z;I.anchorManager.addFloatingConnection(A.id,z);l.addToList(H.endpointsByElement,A.id,this._jsPlumb.floatingEndpoint);I.currentlyDragging=true}.bind(this);var C=H.dragOptions||{},w=jsPlumb.extend({},m.defaultDragOptions),y=m.dragEvents.start,F=m.dragEvents.stop,t=m.dragEvents.drag;C=jsPlumb.extend(w,C);C.scope=C.scope||this.scope;C[y]=l.wrap(C[y],q,false);C[t]=l.wrap(C[t],g.drag);C[F]=l.wrap(C[F],function(){I.setConnectionBeingDragged(false);var L=m.getDropEvent(arguments);var i=z.floatingAnchorIndex==null?1:z.floatingAnchorIndex;z.endpoints[i===0?1:0].anchor.locked=false;z.removeClass(I.draggingClass);if(z.endpoints[i]==this._jsPlumb.floatingEndpoint){if(h&&z.suspendedEndpoint){if(i===0){z.source=n[0];z.sourceId=n[1]}else{z.target=n[0];z.targetId=n[1]}m.setDragScope(n[2],n[3]);z.endpoints[i]=z.suspendedEndpoint;if(z.isReattach()||z._forceReattach||z._forceDetach||!z.endpoints[i===0?1:0].detach(z,false,false,true,L)){z.setHover(false);z.floatingAnchorIndex=null;z._forceDetach=null;z._forceReattach=null;this._jsPlumb.floatingEndpoint.detachFromConnection(z);z.suspendedEndpoint.addConnection(z);I.repaint(n[1])}}}I.remove(A.element,false);I.remove(p.canvas,false);if(this.deleteAfterDragStop){I.deleteObject({endpoint:this})}else{if(this._jsPlumb){this._jsPlumb.floatingEndpoint=null;this.canvas.style.visibility="visible";this.anchor.locked=false;this.paint({recalc:false})}}I.fire("connectionDragStop",z);I.currentlyDragging=false;z=null}.bind(this));var D=o(this.canvas);m.initDraggable(D,C,true,I)}var r=function(M,R,P,S){if((this.isTarget||R)&&m.isDropSupported(this.element)){var N=H.dropOptions||I.Defaults.DropOptions||jsPlumb.Defaults.DropOptions;N=jsPlumb.extend({},N);N.scope=N.scope||this.scope;var L=m.dragEvents.drop,Q=m.dragEvents.over,i=m.dragEvents.out,O=function(){this.removeClass(I.endpointDropAllowedClass);this.removeClass(I.endpointDropForbiddenClass);var T=m.getDropEvent(arguments),ag=o(m.getDragObject(arguments)),V=I.getAttribute(ag,"dragId"),X=I.getAttribute(ag,"elId"),af=I.getAttribute(ag,"originalScope"),aa=v[V];var Y=aa.suspendedEndpoint&&(aa.suspendedEndpoint.id==this.id||this.referenceEndpoint&&aa.suspendedEndpoint.id==this.referenceEndpoint.id);if(Y){aa._forceReattach=true;return}if(aa!=null){var ac=aa.floatingAnchorIndex==null?1:aa.floatingAnchorIndex,ad=ac===0?1:0;if(af){jsPlumb.CurrentLibrary.setDragScope(ag,af)}var ae=S!=null?S.isEnabled():true;if(this.isFull()){this.fire("maxConnections",{endpoint:this,connection:aa,maxConnections:this._jsPlumb.maxConnections},T)}if(!this.isFull()&&!(ac===0&&!this.isSource)&&!(ac==1&&!this.isTarget)&&ae){var Z=true;if(aa.suspendedEndpoint&&aa.suspendedEndpoint.id!=this.id){if(ac===0){aa.source=aa.suspendedEndpoint.element;aa.sourceId=aa.suspendedEndpoint.elementId}else{aa.target=aa.suspendedEndpoint.element;aa.targetId=aa.suspendedEndpoint.elementId}if(!aa.isDetachAllowed(aa)||!aa.endpoints[ac].isDetachAllowed(aa)||!aa.suspendedEndpoint.isDetachAllowed(aa)||!I.checkCondition("beforeDetach",aa)){Z=false}}if(ac===0){aa.source=this.element;aa.sourceId=this.elementId}else{aa.target=this.element;aa.targetId=this.elementId}var ab=function(){aa.floatingAnchorIndex=null};var U=function(){aa.endpoints[ac].detachFromConnection(aa);if(aa.suspendedEndpoint){aa.suspendedEndpoint.detachFromConnection(aa)}aa.endpoints[ac]=this;this.addConnection(aa);var ak=this.getParameters();for(var ai in ak){aa.setParameter(ai,ak[ai])}if(!aa.suspendedEndpoint){if(ak.draggable){jsPlumb.CurrentLibrary.initDraggable(this.element,C,true,I)}}else{var aj=aa.suspendedEndpoint.getElement(),ah=aa.suspendedEndpoint.elementId;u({source:ac===0?aj:aa.source,target:ac==1?aj:aa.target,sourceId:ac===0?ah:aa.sourceId,targetId:ac==1?ah:aa.targetId,sourceEndpoint:ac===0?aa.suspendedEndpoint:aa.endpoints[0],targetEndpoint:ac==1?aa.suspendedEndpoint:aa.endpoints[1],connection:aa},true,T)}if(ac==1){I.anchorManager.updateOtherEndpoint(aa.sourceId,aa.suspendedElementId,aa.targetId,aa)}else{I.anchorManager.sourceChanged(aa.suspendedEndpoint.elementId,aa.sourceId,aa)}k(aa,null,T,true);ab()}.bind(this);var W=function(){if(aa.suspendedEndpoint){aa.endpoints[ac]=aa.suspendedEndpoint;aa.setHover(false);aa._forceDetach=true;if(ac===0){aa.source=aa.suspendedEndpoint.element;aa.sourceId=aa.suspendedEndpoint.elementId}else{aa.target=aa.suspendedEndpoint.element;aa.targetId=aa.suspendedEndpoint.elementId}aa.suspendedEndpoint.addConnection(aa);aa.endpoints[0].repaint();aa.repaint();I.repaint(aa.sourceId);aa._forceDetach=false}ab()};Z=Z&&this.isDropAllowed(aa.sourceId,aa.targetId,aa.scope,aa,this);if(Z){U()}else{W()}}I.currentlyDragging=false}}.bind(this);N[L]=l.wrap(N[L],O);N[Q]=l.wrap(N[Q],function(){var U=m.getDragObject(arguments),Y=I.getAttribute(U,"dragId"),X=v[Y];if(X!=null){var T=X.floatingAnchorIndex==null?1:X.floatingAnchorIndex;var W=(this.isTarget&&X.floatingAnchorIndex!==0)||(X.suspendedEndpoint&&this.referenceEndpoint&&this.referenceEndpoint.id==X.suspendedEndpoint.id);if(W){var V=I.checkCondition("checkDropAllowed",{sourceEndpoint:X.endpoints[T],targetEndpoint:this,connection:X});this[(V?"add":"remove")+"Class"](I.endpointDropAllowedClass);this[(V?"remove":"add")+"Class"](I.endpointDropForbiddenClass);X.endpoints[T].anchor.over(this.anchor,this)}}}.bind(this));N[i]=l.wrap(N[i],function(){var U=m.getDragObject(arguments),X=I.getAttribute(U,"dragId"),W=v[X];if(W!=null){var T=W.floatingAnchorIndex==null?1:W.floatingAnchorIndex;var V=(this.isTarget&&W.floatingAnchorIndex!==0)||(W.suspendedEndpoint&&this.referenceEndpoint&&this.referenceEndpoint.id==W.suspendedEndpoint.id);if(V){this.removeClass(I.endpointDropAllowedClass);this.removeClass(I.endpointDropForbiddenClass);W.endpoints[T].anchor.out()}}}.bind(this));m.initDroppable(M,N,true,P)}}.bind(this);r(o(this.canvas),true,!(H._transient||this.anchor.isFloating),this);if(H.type){this.addType(H.type,H.data,I.isSuspendDrawing())}return this};jsPlumbUtil.extend(jsPlumb.Endpoint,OverlayCapableJsPlumbUIComponent,{getTypeDescriptor:function(){return"endpoint"},isVisible:function(){return this._jsPlumb.visible},setVisible:function(h,m,g){this._jsPlumb.visible=h;if(this.canvas){this.canvas.style.display=h?"block":"none"}this[h?"showOverlays":"hideOverlays"]();if(!m){for(var l=0;l<this.connections.length;l++){this.connections[l].setVisible(h);if(!g){var k=this===this.connections[l].endpoints[0]?1:0;if(this.connections[l].endpoints[k].connections.length==1){this.connections[l].endpoints[k].setVisible(h,true,true)}}}}},getAttachedElements:function(){return this.connections},applyType:function(g,h){if(g.maxConnections!=null){this._jsPlumb.maxConnections=g.maxConnections}if(g.scope){this.scope=g.scope}jsPlumbUtil.copyValues(c,g,this)},isEnabled:function(){return this._jsPlumb.enabled},setEnabled:function(g){this._jsPlumb.enabled=g},cleanup:function(){jsPlumb.CurrentLibrary.removeClass(this.element,this._jsPlumb.instance.endpointAnchorClassPrefix+"_"+this._jsPlumb.currentAnchorClass);this.anchor=null;this.endpoint.cleanup();this.endpoint.destroy();this.endpoint=null;var g=jsPlumb.CurrentLibrary.getElementObject(this.canvas);jsPlumb.CurrentLibrary.destroyDraggable(g);jsPlumb.CurrentLibrary.destroyDroppable(g)},setHover:function(g){if(this.endpoint&&this._jsPlumb&&!this._jsPlumb.instance.isConnectionBeingDragged()){this.endpoint.setHover(g)}},isFull:function(){return !(this.isFloating()||this._jsPlumb.maxConnections<1||this.connections.length<this._jsPlumb.maxConnections)},getConnectionCost:function(){return this._jsPlumb.connectionCost},setConnectionCost:function(g){this._jsPlumb.connectionCost=g},areConnectionsDirected:function(){return this._jsPlumb.connectionsDirected},setConnectionsDirected:function(g){this._jsPlumb.connectionsDirected=g},setElementId:function(g){this.elementId=g;this.anchor.elementId=g},setReferenceElement:function(g){this.element=jsPlumb.CurrentLibrary.getDOMElement(g)},setDragAllowedWhenFull:function(g){this.dragAllowedWhenFull=g},equals:function(g){return this.anchor.equals(g.anchor)},getUuid:function(){return this._jsPlumb.uuid},computeAnchor:function(g){return this.anchor.compute(g)}})})();(function(){var c=function(d,e,g,f){if(!d.Defaults.DoNotThrowErrors&&jsPlumb.Connectors[e][g]==null){throw {msg:"jsPlumb: unknown connector type '"+g+"'"}}return new jsPlumb.Connectors[e][g](f)},a=function(f,e,d){return(f)?d.makeAnchor(f,e,d):null},b=function(s,f,g,d,n,i,k,l,h,m){var o;if(d){g.endpoints[n]=d;d.addConnection(g)}else{if(!i.endpoints){i.endpoints=[null,null]}var v=i.endpoints[n]||i.endpoint||s.Defaults.Endpoints[n]||jsPlumb.Defaults.Endpoints[n]||s.Defaults.Endpoint||jsPlumb.Defaults.Endpoint;if(!i.endpointStyles){i.endpointStyles=[null,null]}if(!i.endpointHoverStyles){i.endpointHoverStyles=[null,null]}var r=i.endpointStyles[n]||i.endpointStyle||s.Defaults.EndpointStyles[n]||jsPlumb.Defaults.EndpointStyles[n]||s.Defaults.EndpointStyle||jsPlumb.Defaults.EndpointStyle;if(r.fillStyle==null&&h!=null){r.fillStyle=h.strokeStyle}if(r.outlineColor==null&&h!=null){r.outlineColor=h.outlineColor}if(r.outlineWidth==null&&h!=null){r.outlineWidth=h.outlineWidth}var q=i.endpointHoverStyles[n]||i.endpointHoverStyle||s.Defaults.EndpointHoverStyles[n]||jsPlumb.Defaults.EndpointHoverStyles[n]||s.Defaults.EndpointHoverStyle||jsPlumb.Defaults.EndpointHoverStyle;if(m!=null){if(q==null){q={}}if(q.fillStyle==null){q.fillStyle=m.strokeStyle}}var p=i.anchors?i.anchors[n]:i.anchor?i.anchor:a(s.Defaults.Anchors[n],l,s)||a(jsPlumb.Defaults.Anchors[n],l,s)||a(s.Defaults.Anchor,l,s)||a(jsPlumb.Defaults.Anchor,l,s),t=i.uuids?i.uuids[n]:null;o=f({paintStyle:r,hoverPaintStyle:q,endpoint:v,connections:[g],uuid:t,anchor:p,source:k,scope:i.scope,container:i.container,reattach:i.reattach||s.Defaults.ReattachConnections,detachable:i.detachable||s.Defaults.ConnectionsDetachable});g.endpoints[n]=o;if(i.drawEndpoints===false){o.setVisible(false,true,true)}}return o};jsPlumb.Connection=function(x){var s=x.newConnection,t=x.newEndpoint,g=jsPlumb.CurrentLibrary,v=g.getAttribute,i=g.getElementObject,z=g.getDOMElement,f=jsPlumbUtil,o=g.getOffset;this.connector=null;this.idPrefix="_jsplumb_c_";this.defaultLabelLocation=0.5;this.defaultOverlayKeys=["Overlays","ConnectionOverlays"];this.parent=x.parent;this.previousConnection=x.previousConnection;this.source=z(x.source);this.target=z(x.target);if(x.sourceEndpoint){this.source=x.sourceEndpoint.endpointWillMoveTo||x.sourceEndpoint.getElement()}if(x.targetEndpoint){this.target=x.targetEndpoint.getElement()}OverlayCapableJsPlumbUIComponent.apply(this,arguments);this.sourceId=this._jsPlumb.instance.getId(this.source);this.targetId=this._jsPlumb.instance.getId(this.target);this.scope=x.scope;this.endpoints=[];this.endpointStyles=[];var y=this._jsPlumb.instance;this._jsPlumb.visible=true;this._jsPlumb.editable=x.editable===true;this._jsPlumb.params={parent:x.parent,cssClass:x.cssClass,container:x.container,"pointer-events":x["pointer-events"],editorParams:x.editorParams};this._jsPlumb.lastPaintedAt=null;this.getDefaultType=function(){return{parameters:{},scope:null,detachable:this._jsPlumb.instance.Defaults.ConnectionsDetachable,rettach:this._jsPlumb.instance.Defaults.ReattachConnections,paintStyle:this._jsPlumb.instance.Defaults.PaintStyle||jsPlumb.Defaults.PaintStyle,connector:this._jsPlumb.instance.Defaults.Connector||jsPlumb.Defaults.Connector,hoverPaintStyle:this._jsPlumb.instance.Defaults.HoverPaintStyle||jsPlumb.Defaults.HoverPaintStyle,overlays:this._jsPlumb.instance.Defaults.ConnectorOverlays||jsPlumb.Defaults.ConnectorOverlays}};var q=b(y,t,this,x.sourceEndpoint,0,x,this.source,this.sourceId,x.paintStyle,x.hoverPaintStyle);if(q){f.addToList(x.endpointsByElement,this.sourceId,q)}var p=b(y,t,this,x.targetEndpoint,1,x,this.target,this.targetId,x.paintStyle,x.hoverPaintStyle);if(p){f.addToList(x.endpointsByElement,this.targetId,p)}if(!this.scope){this.scope=this.endpoints[0].scope}if(x.deleteEndpointsOnDetach!=null){this.endpoints[0]._deleteOnDetach=x.deleteEndpointsOnDetach;this.endpoints[1]._deleteOnDetach=x.deleteEndpointsOnDetach}else{if(!this.endpoints[0]._doNotDeleteOnDetach){this.endpoints[0]._deleteOnDetach=true}if(!this.endpoints[1]._doNotDeleteOnDetach){this.endpoints[1]._deleteOnDetach=true}}this.setConnector(this.endpoints[0].connector||this.endpoints[1].connector||x.connector||y.Defaults.Connector||jsPlumb.Defaults.Connector,true);if(x.path){this.connector.setPath(x.path)}this.setPaintStyle(this.endpoints[0].connectorStyle||this.endpoints[1].connectorStyle||x.paintStyle||y.Defaults.PaintStyle||jsPlumb.Defaults.PaintStyle,true);this.setHoverPaintStyle(this.endpoints[0].connectorHoverStyle||this.endpoints[1].connectorHoverStyle||x.hoverPaintStyle||y.Defaults.HoverPaintStyle||jsPlumb.Defaults.HoverPaintStyle,true);this._jsPlumb.paintStyleInUse=this.getPaintStyle();var h=y.getSuspendedAt();y.updateOffset({elId:this.sourceId,timestamp:h});y.updateOffset({elId:this.targetId,timestamp:h});if(!y.isSuspendDrawing()){var e=y.getCachedData(this.sourceId),l=e.o,k=e.s,w=y.getCachedData(this.targetId),d=w.o,m=w.s,n=h||y.timestamp(),r=this.endpoints[0].anchor.compute({xy:[l.left,l.top],wh:k,element:this.endpoints[0],elementId:this.endpoints[0].elementId,txy:[d.left,d.top],twh:m,tElement:this.endpoints[1],timestamp:n});this.endpoints[0].paint({anchorLoc:r,timestamp:n});r=this.endpoints[1].anchor.compute({xy:[d.left,d.top],wh:m,element:this.endpoints[1],elementId:this.endpoints[1].elementId,txy:[l.left,l.top],twh:k,tElement:this.endpoints[0],timestamp:n});this.endpoints[1].paint({anchorLoc:r,timestamp:n})}this._jsPlumb.detachable=y.Defaults.ConnectionsDetachable;if(x.detachable===false){this._jsPlumb.detachable=false}if(this.endpoints[0].connectionsDetachable===false){this._jsPlumb.detachable=false}if(this.endpoints[1].connectionsDetachable===false){this._jsPlumb.detachable=false}this._jsPlumb.reattach=x.reattach||this.endpoints[0].reattachConnections||this.endpoints[1].reattachConnections||y.Defaults.ReattachConnections;this._jsPlumb.cost=x.cost||this.endpoints[0].getConnectionCost();this._jsPlumb.directed=x.directed;if(x.directed==null){this._jsPlumb.directed=this.endpoints[0].areConnectionsDirected()}var A=jsPlumb.extend({},this.endpoints[0].getParameters());jsPlumb.extend(A,this.endpoints[1].getParameters());jsPlumb.extend(A,this.getParameters());this.setParameters(A);var u=x.type||this.endpoints[0].connectionType||this.endpoints[1].connectionType;if(u){this.addType(u,x.data,y.isSuspendDrawing())}};jsPlumbUtil.extend(jsPlumb.Connection,OverlayCapableJsPlumbUIComponent,{applyType:function(d,e){if(d.detachable!=null){this.setDetachable(d.detachable)}if(d.reattach!=null){this.setReattach(d.reattach)}if(d.scope){this.scope=d.scope}this.setConnector(d.connector,e)},getTypeDescriptor:function(){return"connection"},getAttachedElements:function(){return this.endpoints},addClass:function(e,d){if(d){this.endpoints[0].addClass(e);this.endpoints[1].addClass(e);if(this.suspendedEndpoint){this.suspendedEndpoint.addClass(e)}}if(this.connector){this.connector.addClass(e)}},removeClass:function(e,d){if(d){this.endpoints[0].removeClass(e);this.endpoints[1].removeClass(e);if(this.suspendedEndpoint){this.suspendedEndpoint.removeClass(e)}}if(this.connector){this.connector.removeClass(e)}},isVisible:function(){return this._jsPlumb.visible},setVisible:function(d){this._jsPlumb.visible=d;this[d?"showOverlays":"hideOverlays"]();if(this.connector&&this.connector.canvas){this.connector.canvas.style.display=d?"block":"none"}this.repaint()},setEditable:function(d){if(this.connector&&this.connector.isEditable()){this._jsPlumb.editable=d}return this._jsPlumb.editable},isEditable:function(){return this._jsPlumb.editable},editStarted:function(){this.setSuspendEvents(true);this.fire("editStarted",{path:this.connector.getPath()});this._jsPlumb.instance.setHoverSuspended(true)},editCompleted:function(){this.fire("editCompleted",{path:this.connector.getPath()});this.setSuspendEvents(false);this.setHover(false);this._jsPlumb.instance.setHoverSuspended(false)},editCanceled:function(){this.fire("editCanceled",{path:this.connector.getPath()});this.setHover(false);this._jsPlumb.instance.setHoverSuspended(false)},cleanup:function(){this.endpoints=null;this.source=null;this.target=null;if(this.connector!=null){this.connector.cleanup();this.connector.destroy()}this.connector=null},isDetachable:function(){return this._jsPlumb.detachable===true},setDetachable:function(d){this._jsPlumb.detachable=d===true},isReattach:function(){return this._jsPlumb.reattach===true},setReattach:function(d){this._jsPlumb.reattach=d===true},setHover:function(d){if(this.connector&&this._jsPlumb&&!this._jsPlumb.instance.isConnectionBeingDragged()){this.connector.setHover(d);jsPlumb.CurrentLibrary[d?"addClass":"removeClass"](this.source,this._jsPlumb.instance.hoverSourceClass);jsPlumb.CurrentLibrary[d?"addClass":"removeClass"](this.target,this._jsPlumb.instance.hoverTargetClass)}},getCost:function(){return this._jsPlumb.cost},setCost:function(d){this._jsPlumb.cost=d},isDirected:function(){return this._jsPlumb.directed===true},moveParent:function(g){var f=jsPlumb.CurrentLibrary,e=f.getParent(this.connector.canvas);if(this.connector.bgCanvas){f.removeElement(this.connector.bgCanvas);f.appendElement(this.connector.bgCanvas,g)}f.removeElement(this.connector.canvas);f.appendElement(this.connector.canvas,g);for(var d=0;d<this._jsPlumb.overlays.length;d++){if(this._jsPlumb.overlays[d].isAppendedAtTopLevel){f.removeElement(this._jsPlumb.overlays[d].canvas);f.appendElement(this._jsPlumb.overlays[d].canvas,g);if(this._jsPlumb.overlays[d].reattachListeners){this._jsPlumb.overlays[d].reattachListeners(this.connector)}}}if(this.connector.reattachListeners){this.connector.reattachListeners()}},getConnector:function(){return this.connector},setConnector:function(g,e){var d=jsPlumbUtil;if(this.connector!=null){this.connector.cleanup();this.connector.destroy()}var h={_jsPlumb:this._jsPlumb.instance,parent:this._jsPlumb.params.parent,cssClass:this._jsPlumb.params.cssClass,container:this._jsPlumb.params.container,"pointer-events":this._jsPlumb.params["pointer-events"]},f=this._jsPlumb.instance.getRenderMode();if(d.isString(g)){this.connector=c(this._jsPlumb.instance,f,g,h)}else{if(d.isArray(g)){if(g.length==1){this.connector=c(this._jsPlumb.instance,f,g[0],h)}else{this.connector=c(this._jsPlumb.instance,f,g[0],d.merge(g[1],h))}}}this.bindListeners(this.connector,this,function(i){this.setHover(i,false)}.bind(this));this.canvas=this.connector.canvas;if(this._jsPlumb.editable&&jsPlumb.ConnectorEditors!=null&&jsPlumb.ConnectorEditors[this.connector.type]&&this.connector.isEditable()){new jsPlumb.ConnectorEditors[this.connector.type]({connector:this.connector,connection:this,params:this._jsPlumb.params.editorParams||{}})}else{editable=false}if(!e){this.repaint()}},paint:function(B){if(!this._jsPlumb.instance.isSuspendDrawing()&&this._jsPlumb.visible){B=B||{};var q=B.elId,r=B.ui,l=B.recalc,f=B.timestamp,s=false,A=s?this.sourceId:this.targetId,k=s?this.targetId:this.sourceId,g=s?0:1,D=s?1:0;if(f==null||f!=this._jsPlumb.lastPaintedAt){var E=this._jsPlumb.instance.updateOffset({elId:k,offset:r,recalc:l,timestamp:f}).o,m=this._jsPlumb.instance.updateOffset({elId:A,timestamp:f}).o,v=this.endpoints[D],e=this.endpoints[g];if(B.clearEdits){v.anchor.clearUserDefinedLocation();e.anchor.clearUserDefinedLocation();this.connector.setEdited(false)}var h=v.anchor.getCurrentLocation({xy:[E.left,E.top],wh:[E.width,E.height],element:v,timestamp:f}),z=e.anchor.getCurrentLocation({xy:[m.left,m.top],wh:[m.width,m.height],element:e,timestamp:f});this.connector.resetBounds();this.connector.compute({sourcePos:h,targetPos:z,sourceEndpoint:this.endpoints[D],targetEndpoint:this.endpoints[g],lineWidth:this._jsPlumb.paintStyleInUse.lineWidth,sourceInfo:E,targetInfo:m,clearEdits:B.clearEdits===true});var n={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};for(var y=0;y<this._jsPlumb.overlays.length;y++){var u=this._jsPlumb.overlays[y];if(u.isVisible()){this._jsPlumb.overlayPlacements[y]=u.draw(this.connector,this._jsPlumb.paintStyleInUse);n.minX=Math.min(n.minX,this._jsPlumb.overlayPlacements[y].minX);n.maxX=Math.max(n.maxX,this._jsPlumb.overlayPlacements[y].maxX);n.minY=Math.min(n.minY,this._jsPlumb.overlayPlacements[y].minY);n.maxY=Math.max(n.maxY,this._jsPlumb.overlayPlacements[y].maxY)}}var d=parseFloat(this._jsPlumb.paintStyleInUse.lineWidth||1)/2,C=parseFloat(this._jsPlumb.paintStyleInUse.lineWidth||0),x={xmin:Math.min(this.connector.bounds.minX-(d+C),n.minX),ymin:Math.min(this.connector.bounds.minY-(d+C),n.minY),xmax:Math.max(this.connector.bounds.maxX+(d+C),n.maxX),ymax:Math.max(this.connector.bounds.maxY+(d+C),n.maxY)};this.connector.paint(this._jsPlumb.paintStyleInUse,null,x);for(var w=0;w<this._jsPlumb.overlays.length;w++){var t=this._jsPlumb.overlays[w];if(t.isVisible()){t.paint(this._jsPlumb.overlayPlacements[w],x)}}}this._jsPlumb.lastPaintedAt=f}},repaint:function(d){d=d||{};this.paint({elId:this.sourceId,recalc:!(d.recalc===false),timestamp:d.timestamp,clearEdits:d.clearEdits})}})})();(function(){jsPlumb.AnchorManager=function(x){var f={},s={},v={},n={},z={},w={HORIZONTAL:"horizontal",VERTICAL:"vertical",DIAGONAL:"diagonal",IDENTITY:"identity"},h={},p=this,i={},q=x.jsPlumbInstance,g=jsPlumb.CurrentLibrary,o={},l=function(L,M,H,D,I,B){if(L===M){return{orientation:w.IDENTITY,a:["top","top"]}}var C=Math.atan2((D.centery-H.centery),(D.centerx-H.centerx)),G=Math.atan2((H.centery-D.centery),(H.centerx-D.centerx)),F=((H.left<=D.left&&H.right>=D.left)||(H.left<=D.right&&H.right>=D.right)||(H.left<=D.left&&H.right>=D.right)||(D.left<=H.left&&D.right>=H.right)),K=((H.top<=D.top&&H.bottom>=D.top)||(H.top<=D.bottom&&H.bottom>=D.bottom)||(H.top<=D.top&&H.bottom>=D.bottom)||(D.top<=H.top&&D.bottom>=H.bottom)),J=function(N){return[I.isContinuous?I.verifyEdge(N[0]):N[0],B.isContinuous?B.verifyEdge(N[1]):N[1]]},E={orientation:w.DIAGONAL,theta:C,theta2:G};if(!(F||K)){if(D.left>H.left&&D.top>H.top){E.a=["right","top"]}else{if(D.left>H.left&&H.top>D.top){E.a=["top","left"]}else{if(D.left<H.left&&D.top<H.top){E.a=["top","right"]}else{if(D.left<H.left&&D.top>H.top){E.a=["left","top"]}}}}}else{if(F){E.orientation=w.HORIZONTAL;E.a=H.top<D.top?["bottom","top"]:["top","bottom"]}else{E.orientation=w.VERTICAL;E.a=H.left<D.left?["right","left"]:["left","right"]}}E.a=J(E.a);return E},A=function(P,L,J,K,Q,M,D){var R=[],C=L[Q?0:1]/(K.length+1);for(var N=0;N<K.length;N++){var S=(N+1)*C,B=M*L[Q?1:0];if(D){S=L[Q?0:1]-S}var I=(Q?S:B),F=J[0]+I,H=I/L[0],G=(Q?B:S),E=J[1]+G,O=G/L[1];R.push([F,E,H,O,K[N][1],K[N][2]])}return R},y=function(B){return function(D,C){var E=true;if(B){E=D[0][0]<C[0][0]}else{E=D[0][0]>C[0][0]}return E===false?-1:1}},d=function(C,B){var E=C[0][0]<0?-Math.PI-C[0][0]:Math.PI-C[0][0],D=B[0][0]<0?-Math.PI-B[0][0]:Math.PI-B[0][0];if(E>D){return 1}else{return C[0][1]>B[0][1]?1:-1}},t={top:function(C,B){return C[0]>B[0]?1:-1},right:y(true),bottom:y(true),left:d},r=function(B,C){return B.sort(C)},k=function(C,B){var G=q.getCachedData(C),E=G.s,F=G.o,D=function(N,U,J,M,S,R,I){if(M.length>0){var Q=r(M,t[N]),O=N==="right"||N==="top",H=A(N,U,J,Q,S,R,O);var V=function(Y,X){var W=q.adjustForParentOffsetAndScroll([X[0],X[1]],Y.canvas);v[Y.id]=[W[0],W[1],X[2],X[3]];z[Y.id]=I};for(var K=0;K<H.length;K++){var P=H[K][4],T=P.endpoints[0].elementId===C,L=P.endpoints[1].elementId===C;if(T){V(P.endpoints[0],H[K])}else{if(L){V(P.endpoints[1],H[K])}}}}};D("bottom",E,[F.left,F.top],B.bottom,true,1,[0,1]);D("top",E,[F.left,F.top],B.top,true,0,[0,-1]);D("left",E,[F.left,F.top],B.left,false,0,[-1,0]);D("right",E,[F.left,F.top],B.right,false,1,[1,0])};this.reset=function(){f={};h={};i={}};this.addFloatingConnection=function(B,C){o[B]=C};this.removeFloatingConnection=function(B){delete o[B]};this.newConnection=function(E){var G=E.sourceId,D=E.targetId,B=E.endpoints,F=true,C=function(H,I,K,J,L){if((G==D)&&K.isContinuous){g.removeElement(B[1].canvas);F=false}jsPlumbUtil.addToList(h,J,[L,I,K.constructor==jsPlumb.DynamicAnchor])};C(0,B[0],B[0].anchor,D,E);if(F){C(1,B[1],B[1].anchor,G,E)}};var e=function(B){(function(E,C){if(E){var D=function(F){return F[4]==C};jsPlumbUtil.removeWithFunction(E.top,D);jsPlumbUtil.removeWithFunction(E.left,D);jsPlumbUtil.removeWithFunction(E.bottom,D);jsPlumbUtil.removeWithFunction(E.right,D)}})(i[B.elementId],B.id)};this.connectionDetached=function(G){var C=G.connection||G,F=G.sourceId,D=G.targetId,B=C.endpoints,E=function(H,I,K,J,L){if(K!=null&&K.constructor==jsPlumb.FloatingAnchor){}else{jsPlumbUtil.removeWithFunction(h[J],function(M){return M[0].id==L.id})}};E(1,B[1],B[1].anchor,F,C);E(0,B[0],B[0].anchor,D,C);e(C.endpoints[0]);e(C.endpoints[1]);p.redraw(C.sourceId);p.redraw(C.targetId)};this.add=function(C,B){jsPlumbUtil.addToList(f,B,C)};this.changeId=function(C,B){h[B]=h[C];f[B]=f[C];delete h[C];delete f[C]};this.getConnectionsFor=function(B){return h[B]||[]};this.getEndpointsFor=function(B){return f[B]||[]};this.deleteEndpoint=function(B){jsPlumbUtil.removeWithFunction(f[B.elementId],function(C){return C.id==B.id});e(B)};this.clearFor=function(B){delete f[B];f[B]=[]};var m=function(V,I,Q,F,L,M,O,K,X,N,E,U){var S=-1,D=-1,G=F.endpoints[O],P=G.id,J=[1,0][O],B=[[I,Q],F,L,M,P],C=V[X],W=G._continuousAnchorEdge?V[G._continuousAnchorEdge]:null;if(W){var T=jsPlumbUtil.findWithFunction(W,function(Y){return Y[4]==P});if(T!=-1){W.splice(T,1);for(var R=0;R<W.length;R++){jsPlumbUtil.addWithFunction(E,W[R][1],function(Y){return Y.id==W[R][1].id});jsPlumbUtil.addWithFunction(U,W[R][1].endpoints[O],function(Y){return Y.id==W[R][1].endpoints[O].id});jsPlumbUtil.addWithFunction(U,W[R][1].endpoints[J],function(Y){return Y.id==W[R][1].endpoints[J].id})}}}for(R=0;R<C.length;R++){if(x.idx==1&&C[R][3]===M&&D==-1){D=R}jsPlumbUtil.addWithFunction(E,C[R][1],function(Y){return Y.id==C[R][1].id});jsPlumbUtil.addWithFunction(U,C[R][1].endpoints[O],function(Y){return Y.id==C[R][1].endpoints[O].id});jsPlumbUtil.addWithFunction(U,C[R][1].endpoints[J],function(Y){return Y.id==C[R][1].endpoints[J].id})}if(S!=-1){C[S]=B}else{var H=K?D!=-1?D:0:C.length;C.splice(H,0,B)}G._continuousAnchorEdge=X};this.updateOtherEndpoint=function(C,F,G,B){var E=jsPlumbUtil.findWithFunction(h[C],function(H){return H[0].id===B.id}),D=jsPlumbUtil.findWithFunction(h[F],function(H){return H[0].id===B.id});if(E!=-1){h[C][E][0]=B;h[C][E][1]=B.endpoints[1];h[C][E][2]=B.endpoints[1].anchor.constructor==jsPlumb.DynamicAnchor}if(D>-1){h[F].splice(D,1);jsPlumbUtil.addToList(h,G,[B,B.endpoints[0],B.endpoints[0].anchor.constructor==jsPlumb.DynamicAnchor])}};this.sourceChanged=function(C,E,D){jsPlumbUtil.removeWithFunction(h[C],function(F){return F[0].id===D.id});var B=jsPlumbUtil.findWithFunction(h[D.targetId],function(F){return F[0].id===D.id});if(B>-1){h[D.targetId][B][0]=D;h[D.targetId][B][1]=D.endpoints[0];h[D.targetId][B][2]=D.endpoints[0].anchor.constructor==jsPlumb.DynamicAnchor}jsPlumbUtil.addToList(h,E,[D,D.endpoints[1],D.endpoints[1].anchor.constructor==jsPlumb.DynamicAnchor])};this.rehomeEndpoint=function(E,C,H){var D=f[C]||[],F=q.getId(H);if(F!==C){var B=jsPlumbUtil.indexOf(D,E);if(B>-1){var I=D.splice(B,1)[0];p.add(I,F)}}for(var G=0;G<E.connections.length;G++){if(E.connections[G].sourceId==C){E.connections[G].sourceId=E.elementId;E.connections[G].source=E.element;p.sourceChanged(C,E.elementId,E.connections[G])}else{if(E.connections[G].targetId==C){E.connections[G].targetId=E.elementId;E.connections[G].target=E.element;p.updateOtherEndpoint(E.connections[G].sourceId,C,E.elementId,E.connections[G])}}}};this.redraw=function(P,T,D,G,Y,R){if(!q.isSuspendDrawing()){var ad=f[P]||[],ac=h[P]||[],C=[],ab=[],E=[];D=D||q.timestamp();G=G||{left:0,top:0};if(T){T={left:T.left+G.left,top:T.top+G.top}}var K=q.updateOffset({elId:P,offset:T,recalc:false,timestamp:D}),M={};for(var Z=0;Z<ac.length;Z++){var H=ac[Z][0],J=H.sourceId,F=H.targetId,I=H.endpoints[0].anchor.isContinuous,O=H.endpoints[1].anchor.isContinuous;if(I||O){var aa=J+"_"+F,W=F+"_"+J,V=M[aa],N=H.sourceId==P?1:0;if(I&&!i[J]){i[J]={top:[],right:[],bottom:[],left:[]}}if(O&&!i[F]){i[F]={top:[],right:[],bottom:[],left:[]}}if(P!=F){q.updateOffset({elId:F,timestamp:D})}if(P!=J){q.updateOffset({elId:J,timestamp:D})}var L=q.getCachedData(F),B=q.getCachedData(J);if(F==J&&(I||O)){m(i[J],-Math.PI/2,0,H,false,F,0,false,"top",J,C,ab)}else{if(!V){V=l(J,F,B.o,L.o,H.endpoints[0].anchor,H.endpoints[1].anchor);M[aa]=V}if(I){m(i[J],V.theta,0,H,false,F,0,false,V.a[0],J,C,ab)}if(O){m(i[F],V.theta2,-1,H,true,J,1,true,V.a[1],F,C,ab)}}if(I){jsPlumbUtil.addWithFunction(E,J,function(ae){return ae===J})}if(O){jsPlumbUtil.addWithFunction(E,F,function(ae){return ae===F})}jsPlumbUtil.addWithFunction(C,H,function(ae){return ae.id==H.id});if((I&&N===0)||(O&&N===1)){jsPlumbUtil.addWithFunction(ab,H.endpoints[N],function(ae){return ae.id==H.endpoints[N].id})}}}for(Z=0;Z<ad.length;Z++){if(ad[Z].connections.length===0&&ad[Z].anchor.isContinuous){if(!i[P]){i[P]={top:[],right:[],bottom:[],left:[]}}m(i[P],-Math.PI/2,0,{endpoints:[ad[Z],ad[Z]],paint:function(){}},false,P,0,false,"top",P,C,ab);jsPlumbUtil.addWithFunction(E,P,function(ae){return ae===P})}}for(Z=0;Z<E.length;Z++){k(E[Z],i[E[Z]])}for(Z=0;Z<ad.length;Z++){ad[Z].paint({timestamp:D,offset:K,dimensions:K.s,recalc:R!==true})}for(Z=0;Z<ab.length;Z++){var S=q.getCachedData(ab[Z].elementId);ab[Z].paint({timestamp:D,offset:S,dimensions:S.s})}for(Z=0;Z<ac.length;Z++){var Q=ac[Z][1];if(Q.anchor.constructor==jsPlumb.DynamicAnchor){Q.paint({elementWithPrecedence:P,timestamp:D});jsPlumbUtil.addWithFunction(C,ac[Z][0],function(ae){return ae.id==ac[Z][0].id});for(var X=0;X<Q.connections.length;X++){if(Q.connections[X]!==ac[Z][0]){jsPlumbUtil.addWithFunction(C,Q.connections[X],function(ae){return ae.id==Q.connections[X].id})}}}else{if(Q.anchor.constructor==jsPlumb.Anchor){jsPlumbUtil.addWithFunction(C,ac[Z][0],function(ae){return ae.id==ac[Z][0].id})}}}var U=o[P];if(U){U.paint({timestamp:D,recalc:false,elId:P})}for(Z=0;Z<C.length;Z++){C[Z].paint({elId:P,timestamp:D,recalc:false,clearEdits:Y})}}};var u=function(D){jsPlumbUtil.EventGenerator.apply(this);this.type="Continuous";this.isDynamic=true;this.isContinuous=true;var G=D.faces||["top","right","bottom","left"],C=!(D.clockwise===false),L={},J={top:"bottom",right:"left",left:"right",bottom:"top"},F={top:"right",right:"bottom",left:"top",bottom:"left"},H={top:"left",right:"top",left:"bottom",bottom:"right"},E=C?F:H,B=C?H:F,K=D.cssClass||"";for(var I=0;I<G.length;I++){L[G[I]]=true}this.verifyEdge=function(M){if(L[M]){return M}else{if(L[J[M]]){return J[M]}else{if(L[E[M]]){return E[M]}else{if(L[B[M]]){return B[M]}}}}return M};this.compute=function(M){return n[M.element.id]||v[M.element.id]||[0,0]};this.getCurrentLocation=function(M){return n[M.element.id]||v[M.element.id]||[0,0]};this.getOrientation=function(M){return z[M.id]||[0,0]};this.clearUserDefinedLocation=function(){delete n[D.elementId]};this.setUserDefinedLocation=function(M){n[D.elementId]=M};this.getCssClass=function(){return K};this.setCssClass=function(M){K=M}};q.continuousAnchorFactory={get:function(C){var B=s[C.elementId];if(!B){B=new u(C);s[C.elementId]=B}return B},clear:function(B){delete s[B]}}};jsPlumb.Anchor=function(e){this.x=e.x||0;this.y=e.y||0;this.elementId=e.elementId;this.cssClass=e.cssClass||"";this.userDefinedLocation=null;this.orientation=e.orientation||[0,0];jsPlumbUtil.EventGenerator.apply(this);var d=e.jsPlumbInstance;this.lastReturnValue=null;this.offsets=e.offsets||[0,0];this.timestamp=null;this.compute=function(k){var i=k.xy,f=k.wh,g=k.element,h=k.timestamp;if(k.clearUserDefinedLocation){this.userDefinedLocation=null}if(h&&h===self.timestamp){return this.lastReturnValue}if(this.userDefinedLocation!=null){this.lastReturnValue=this.userDefinedLocation}else{this.lastReturnValue=[i[0]+(this.x*f[0])+this.offsets[0],i[1]+(this.y*f[1])+this.offsets[1]];this.lastReturnValue=d.adjustForParentOffsetAndScroll(this.lastReturnValue,g.canvas)}this.timestamp=h;return this.lastReturnValue};this.getCurrentLocation=function(f){return(this.lastReturnValue==null||(f.timestamp!=null&&this.timestamp!=f.timestamp))?this.compute(f):this.lastReturnValue}};jsPlumbUtil.extend(jsPlumb.Anchor,jsPlumbUtil.EventGenerator,{equals:function(d){if(!d){return false}var e=d.getOrientation(),f=this.getOrientation();return this.x==d.x&&this.y==d.y&&this.offsets[0]==d.offsets[0]&&this.offsets[1]==d.offsets[1]&&f[0]==e[0]&&f[1]==e[1]},getUserDefinedLocation:function(){return this.userDefinedLocation},setUserDefinedLocation:function(d){this.userDefinedLocation=d},clearUserDefinedLocation:function(){this.userDefinedLocation=null},getOrientation:function(d){return this.orientation},getCssClass:function(){return this.cssClass}});jsPlumb.FloatingAnchor=function(f){jsPlumb.Anchor.apply(this,arguments);var e=f.reference,g=jsPlumb.CurrentLibrary,i=f.jsPlumbInstance,k=f.referenceCanvas,m=g.getSize(g.getElementObject(k)),n=0,h=0,d=null,l=null;this.orientation=null;this.x=0;this.y=0;this.isFloating=true;this.compute=function(r){var q=r.xy,p=r.element,o=[q[0]+(m[0]/2),q[1]+(m[1]/2)];o=i.adjustForParentOffsetAndScroll(o,p.canvas);l=o;return o};this.getOrientation=function(q){if(d){return d}else{var p=e.getOrientation(q);return[Math.abs(p[0])*n*-1,Math.abs(p[1])*h*-1]}};this.over=function(o,p){d=o.getOrientation(p)};this.out=function(){d=null};this.getCurrentLocation=function(o){return l==null?this.compute(o):l}};jsPlumbUtil.extend(jsPlumb.FloatingAnchor,jsPlumb.Anchor);var c=function(f,e,d){return f.constructor==jsPlumb.Anchor?f:e.makeAnchor(f,d,e)};jsPlumb.DynamicAnchor=function(l){jsPlumb.Anchor.apply(this,arguments);this.isSelective=true;this.isDynamic=true;this.anchors=[];this.elementId=l.elementId;this.jsPlumbInstance=l.jsPlumbInstance;for(var g=0;g<l.anchors.length;g++){this.anchors[g]=c(l.anchors[g],this.jsPlumbInstance,this.elementId)}this.addAnchor=function(i){this.anchors.push(c(i,this.jsPlumbInstance,this.elementId))};this.getAnchors=function(){return this.anchors};this.locked=false;var f=this.anchors.length>0?this.anchors[0]:null,h=this.anchors.length>0?0:-1,k=f,e=this,d=function(s,p,o,t,n){var i=t[0]+(s.x*n[0]),u=t[1]+(s.y*n[1]),r=t[0]+(n[0]/2),q=t[1]+(n[1]/2);return(Math.sqrt(Math.pow(p-i,2)+Math.pow(o-u,2))+Math.sqrt(Math.pow(r-i,2)+Math.pow(q-u,2)))},m=l.selector||function(x,o,p,q,n){var s=p[0]+(q[0]/2),r=p[1]+(q[1]/2);var u=-1,w=Infinity;for(var t=0;t<n.length;t++){var v=d(n[t],s,r,x,o);if(v<w){u=t+0;w=v}}return n[u]};this.compute=function(r){var q=r.xy,i=r.wh,o=r.timestamp,n=r.txy,s=r.twh;if(r.clearUserDefinedLocation){userDefinedLocation=null}this.timestamp=o;var p=e.getUserDefinedLocation();if(p!=null){return p}if(this.locked||n==null||s==null){return f.compute(r)}else{r.timestamp=null}f=m(q,i,n,s,this.anchors);this.x=f.x;this.y=f.y;if(f!=k){this.fire("anchorChanged",f)}k=f;return f.compute(r)};this.getCurrentLocation=function(i){return this.getUserDefinedLocation()||(f!=null?f.getCurrentLocation(i):null)};this.getOrientation=function(i){return f!=null?f.getOrientation(i):[0,0]};this.over=function(i,n){if(f!=null){f.over(i,n)}};this.out=function(){if(f!=null){f.out()}};this.getCssClass=function(){return(f&&f.getCssClass())||""}};jsPlumbUtil.extend(jsPlumb.DynamicAnchor,jsPlumb.Anchor);var b=function(d,i,f,e,h,g){jsPlumb.Anchors[h]=function(l){var k=l.jsPlumbInstance.makeAnchor([d,i,f,e,0,0],l.elementId,l.jsPlumbInstance);k.type=h;if(g){g(k,l)}return k}};b(0.5,0,0,-1,"TopCenter");b(0.5,1,0,1,"BottomCenter");b(0,0.5,-1,0,"LeftMiddle");b(1,0.5,1,0,"RightMiddle");b(0.5,0,0,-1,"Top");b(0.5,1,0,1,"Bottom");b(0,0.5,-1,0,"Left");b(1,0.5,1,0,"Right");b(0.5,0.5,0,0,"Center");b(1,0,0,-1,"TopRight");b(1,1,0,1,"BottomRight");b(0,0,0,-1,"TopLeft");b(0,1,0,1,"BottomLeft");jsPlumb.Defaults.DynamicAnchors=function(d){return d.jsPlumbInstance.makeAnchors(["TopCenter","RightMiddle","BottomCenter","LeftMiddle"],d.elementId,d.jsPlumbInstance)};jsPlumb.Anchors.AutoDefault=function(e){var d=e.jsPlumbInstance.makeDynamicAnchor(jsPlumb.Defaults.DynamicAnchors(e));d.type="AutoDefault";return d};var a=function(e,d){jsPlumb.Anchors[e]=function(g){var f=g.jsPlumbInstance.makeAnchor(["Continuous",{faces:d}],g.elementId,g.jsPlumbInstance);f.type=e;return f}};jsPlumb.Anchors.Continuous=function(d){return d.jsPlumbInstance.continuousAnchorFactory.get(d)};a("ContinuousLeft",["left"]);a("ContinuousTop",["top"]);a("ContinuousBottom",["bottom"]);a("ContinuousRight",["right"]);jsPlumb.Anchors.Assign=b(0,0,0,0,"Assign",function(e,f){var d=f.position||"Fixed";e.positionFinder=d.constructor==String?f.jsPlumbInstance.AnchorPositionFinders[d]:d;e.constructorParams=f});jsPlumb.AnchorPositionFinders={Fixed:function(g,d,f,e){return[(g.left-d.left)/f[0],(g.top-d.top)/f[1]]},Grid:function(d,n,h,e){var m=d.left-n.left,l=d.top-n.top,k=h[0]/(e.grid[0]),i=h[1]/(e.grid[1]),g=Math.floor(m/k),f=Math.floor(l/i);return[((g*k)+(k/2))/h[0],((f*i)+(i/2))/h[1]]}};jsPlumb.Anchors.Perimeter=function(d){d=d||{};var e=d.anchorCount||60,h=d.shape;if(!h){throw new Error("no shape supplied to Perimeter Anchor type")}var f=function(){var u=0.5,t=Math.PI*2/e,v=0,q=[];for(var s=0;s<e;s++){var p=u+(u*Math.sin(v)),w=u+(u*Math.cos(v));q.push([p,w,0,0]);v+=t}return q},i=function(r){var t=e/r.length,p=[],q=function(x,A,w,z,B){t=e*B;var v=(w-x)/t,u=(z-A)/t;for(var y=0;y<t;y++){p.push([x+(v*y),A+(u*y),0,0])}};for(var s=0;s<r.length;s++){q.apply(null,r[s])}return p},m=function(p){var r=[];for(var q=0;q<p.length;q++){r.push([p[q][0],p[q][1],p[q][2],p[q][3],1/p.length])}return i(r)},k=function(){return m([[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]])};var g={Circle:f,Ellipse:f,Diamond:function(){return m([[0.5,0,1,0.5],[1,0.5,0.5,1],[0.5,1,0,0.5],[0,0.5,0.5,0]])},Rectangle:k,Square:k,Triangle:function(){return m([[0.5,0,1,1],[1,1,0,1],[0,1,0.5,0]])},Path:function(w){var u=w.points,v=[],r=0;for(var t=0;t<u.length-1;t++){var q=Math.sqrt(Math.pow(u[t][2]-u[t][0])+Math.pow(u[t][3]-u[t][1]));r+=q;v.push([u[t][0],u[t][1],u[t+1][0],u[t+1][1],q])}for(var s=0;s<v.length;s++){v[s][4]=v[s][4]/r}return i(v)}},n=function(u,t){var v=[],s=t/180*Math.PI;for(var r=0;r<u.length;r++){var q=u[r][0]-0.5,p=u[r][1]-0.5;v.push([0.5+((q*Math.cos(s))-(p*Math.sin(s))),0.5+((q*Math.sin(s))+(p*Math.cos(s))),u[r][2],u[r][3]])}return v};if(!g[h]){throw new Error("Shape ["+h+"] is unknown by Perimeter Anchor type")}var o=g[h](d);if(d.rotation){o=n(o,d.rotation)}var l=d.jsPlumbInstance.makeDynamicAnchor(o);l.type="Perimeter";return l}})();(function(){jsPlumb.DOMElementComponent=jsPlumbUtil.extend(jsPlumb.jsPlumbUIComponent,function(h){this.mousemove=this.dblclick=this.click=this.mousedown=this.mouseup=function(i){}});jsPlumb.Segments={AbstractSegment:function(h){this.params=h;this.findClosestPointOnPath=function(i,k){return{d:Infinity,x:null,y:null,l:null}};this.getBounds=function(){return{minX:Math.min(h.x1,h.x2),minY:Math.min(h.y1,h.y2),maxX:Math.max(h.x1,h.x2),maxY:Math.max(h.y1,h.y2)}}},Straight:function(o){var r=jsPlumb.Segments.AbstractSegment.apply(this,arguments),l,n,s,k,i,q,p,h=function(){l=Math.sqrt(Math.pow(i-k,2)+Math.pow(p-q,2));n=jsPlumbUtil.gradient({x:k,y:q},{x:i,y:p});s=-1/n};this.type="Straight";this.getLength=function(){return l};this.getGradient=function(){return n};this.getCoordinates=function(){return{x1:k,y1:q,x2:i,y2:p}};this.setCoordinates=function(m){k=m.x1;q=m.y1;i=m.x2;p=m.y2;h()};this.setCoordinates({x1:o.x1,y1:o.y1,x2:o.x2,y2:o.y2});this.getBounds=function(){return{minX:Math.min(k,i),minY:Math.min(q,p),maxX:Math.max(k,i),maxY:Math.max(q,p)}};this.pointOnPath=function(t,u){if(t===0&&!u){return{x:k,y:q}}else{if(t==1&&!u){return{x:i,y:p}}else{var m=u?t>0?t:l+t:t*l;return jsPlumbUtil.pointOnLine({x:k,y:q},{x:i,y:p},m)}}};this.gradientAtPoint=function(m){return n};this.pointAlongPathFrom=function(m,w,v){var u=this.pointOnPath(m,v),t=w<=0?{x:k,y:q}:{x:i,y:p};if(w<=0&&Math.abs(w)>1){w*=-1}return jsPlumbUtil.pointOnLine(u,t,w)};this.findClosestPointOnPath=function(t,B){if(n===0){return{x:t,y:q,d:Math.abs(B-q)}}else{if(n==Infinity||n==-Infinity){return{x:k,y:B,d:Math.abs(t-1)}}else{var m=q-(n*k),u=B-(s*t),v=(u-m)/(n-s),A=(n*v)+m,z=jsPlumbUtil.lineLength([t,B],[v,A]),w=jsPlumbUtil.lineLength([v,A],[k,q]);return{d:z,x:v,y:A,l:w/l}}}}},Arc:function(m){var s=jsPlumb.Segments.AbstractSegment.apply(this,arguments),o=function(u,t){return jsPlumbUtil.theta([m.cx,m.cy],[u,t])},h=function(y,u){if(y.anticlockwise){var t=y.startAngle<y.endAngle?y.startAngle+l:y.startAngle,x=Math.abs(t-y.endAngle);return t-(x*u)}else{var w=y.endAngle<y.startAngle?y.endAngle+l:y.endAngle,v=Math.abs(w-y.startAngle);return y.startAngle+(v*u)}},l=2*Math.PI;this.radius=m.r;this.anticlockwise=m.ac;this.type="Arc";if(m.startAngle&&m.endAngle){this.startAngle=m.startAngle;this.endAngle=m.endAngle;this.x1=m.cx+(this.radius*Math.cos(m.startAngle));this.y1=m.cy+(this.radius*Math.sin(m.startAngle));this.x2=m.cx+(this.radius*Math.cos(m.endAngle));this.y2=m.cy+(this.radius*Math.sin(m.endAngle))}else{this.startAngle=o(m.x1,m.y1);this.endAngle=o(m.x2,m.y2);this.x1=m.x1;this.y1=m.y1;this.x2=m.x2;this.y2=m.y2}if(this.endAngle<0){this.endAngle+=l}if(this.startAngle<0){this.startAngle+=l}this.segment=jsPlumbUtil.segment([this.x1,this.y1],[this.x2,this.y2]);var p=this.endAngle<this.startAngle?this.endAngle+l:this.endAngle;this.sweep=Math.abs(p-this.startAngle);if(this.anticlockwise){this.sweep=l-this.sweep}var r=2*Math.PI*this.radius,i=this.sweep/l,k=r*i;this.getLength=function(){return k};this.getBounds=function(){return{minX:m.cx-m.r,maxX:m.cx+m.r,minY:m.cy-m.r,maxY:m.cy+m.r}};var n=1e-10,q=function(v){var u=Math.floor(v),t=Math.ceil(v);if(v-u<n){return u}else{if(t-v<n){return t}}return v};this.pointOnPath=function(t,x){if(t===0){return{x:this.x1,y:this.y1,theta:this.startAngle}}else{if(t==1){return{x:this.x2,y:this.y2,theta:this.endAngle}}}if(x){t=t/k}var w=h(this,t),v=m.cx+(m.r*Math.cos(w)),u=m.cy+(m.r*Math.sin(w));return{x:q(v),y:q(u),theta:w}};this.gradientAtPoint=function(u,w){var v=this.pointOnPath(u,w);var t=jsPlumbUtil.normal([m.cx,m.cy],[v.x,v.y]);if(!this.anticlockwise&&(t==Infinity||t==-Infinity)){t*=-1}return t};this.pointAlongPathFrom=function(B,t,A){var v=this.pointOnPath(B,A),u=t/r*2*Math.PI,w=this.anticlockwise?-1:1,z=v.theta+(w*u),y=m.cx+(this.radius*Math.cos(z)),x=m.cy+(this.radius*Math.sin(z));return{x:y,y:x}}},Bezier:function(m){var i=jsPlumb.Segments.AbstractSegment.apply(this,arguments),l=[{x:m.x1,y:m.y1},{x:m.cp1x,y:m.cp1y},{x:m.cp2x,y:m.cp2y},{x:m.x2,y:m.y2}],h={minX:Math.min(m.x1,m.x2,m.cp1x,m.cp2x),minY:Math.min(m.y1,m.y2,m.cp1y,m.cp2y),maxX:Math.max(m.x1,m.x2,m.cp1x,m.cp2x),maxY:Math.max(m.y1,m.y2,m.cp1y,m.cp2y)};this.type="Bezier";var k=function(o,n,p){if(p){n=jsBezier.locationAlongCurveFrom(o,n>0?0:1,n)}return n};this.pointOnPath=function(n,o){n=k(l,n,o);return jsBezier.pointOnCurve(l,n)};this.gradientAtPoint=function(n,o){n=k(l,n,o);return jsBezier.gradientAtPoint(l,n)};this.pointAlongPathFrom=function(n,p,o){n=k(l,n,o);return jsBezier.pointAlongCurveFrom(l,n,p)};this.getLength=function(){return jsBezier.getLength(l)};this.getBounds=function(){return h}}};var g=function(){this.resetBounds=function(){this.bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity}};this.resetBounds()};jsPlumb.Connectors.AbstractConnector=function(B){g.apply(this,arguments);var z=[],i=false,s=0,k=[],v=[],h=B.stub||0,o=jsPlumbUtil.isArray(h)?h[0]:h,u=jsPlumbUtil.isArray(h)?h[1]:h,x=B.gap||0,p=jsPlumbUtil.isArray(x)?x[0]:x,r=jsPlumbUtil.isArray(x)?x[1]:x,q=null,l=false,n=null;this.isEditable=function(){return false};this.setEdited=function(D){l=D};this.getPath=function(){};this.setPath=function(D){};this.findSegmentForPoint=function(D,H){var E={d:Infinity,s:null,x:null,y:null,l:null};for(var F=0;F<z.length;F++){var G=z[F].findClosestPointOnPath(D,H);if(G.d<E.d){E.d=G.d;E.l=G.l;E.x=G.x;E.y=G.y;E.s=z[F]}}return E};var A=function(){var F=0;for(var E=0;E<z.length;E++){var D=z[E].getLength();v[E]=D/s;k[E]=[F,(F+=(D/s))]}},m=function(F,H){if(H){F=F>0?F/s:(s+F)/s}var D=k.length-1,E=1;for(var G=0;G<k.length;G++){if(k[G][1]>=F){D=G;E=F==1?1:F===0?0:(F-k[G][0])/v[G];break}}return{segment:z[D],proportion:E,index:D}},y=function(F,E,G){if(G.x1==G.x2&&G.y1==G.y2){return}var D=new jsPlumb.Segments[E](G);z.push(D);s+=D.getLength();F.updateBounds(D)},C=function(){s=0;z.splice(0,z.length);k.splice(0,k.length);v.splice(0,v.length)};this.setSegments=function(E){q=[];s=0;for(var D=0;D<E.length;D++){q.push(E[D]);s+=E[D].getLength()}};var t=function(T){this.lineWidth=T.lineWidth;var D=jsPlumbUtil.segment(T.sourcePos,T.targetPos),P=T.targetPos[0]<T.sourcePos[0],N=T.targetPos[1]<T.sourcePos[1],G=T.lineWidth||1,S=T.sourceEndpoint.anchor.orientation||T.sourceEndpoint.anchor.getOrientation(T.sourceEndpoint),E=T.targetEndpoint.anchor.orientation||T.targetEndpoint.anchor.getOrientation(T.targetEndpoint),J=P?T.targetPos[0]:T.sourcePos[0],I=N?T.targetPos[1]:T.sourcePos[1],L=Math.abs(T.targetPos[0]-T.sourcePos[0]),R=Math.abs(T.targetPos[1]-T.sourcePos[1]);if(S[0]===0&&S[1]===0||E[0]===0&&E[1]===0){var H=L>R?0:1,F=[1,0][H];S=[];E=[];S[H]=T.sourcePos[H]>T.targetPos[H]?-1:1;E[H]=T.sourcePos[H]>T.targetPos[H]?1:-1;S[F]=0;E[F]=0}var O=P?L+(p*S[0]):p*S[0],M=N?R+(p*S[1]):p*S[1],V=P?r*E[0]:L+(r*E[0]),U=N?r*E[1]:R+(r*E[1]),Q=((S[0]*E[0])+(S[1]*E[1]));var K={sx:O,sy:M,tx:V,ty:U,lw:G,xSpan:Math.abs(V-O),ySpan:Math.abs(U-M),mx:(O+V)/2,my:(M+U)/2,so:S,to:E,x:J,y:I,w:L,h:R,segment:D,startStubX:O+(S[0]*o),startStubY:M+(S[1]*o),endStubX:V+(E[0]*u),endStubY:U+(E[1]*u),isXGreaterThanStubTimes2:Math.abs(O-V)>(o+u),isYGreaterThanStubTimes2:Math.abs(M-U)>(o+u),opposite:Q==-1,perpendicular:Q===0,orthogonal:Q==1,sourceAxis:S[0]===0?"y":"x",points:[J,I,L,R,O,M,V,U]};K.anchorOrientation=K.opposite?"opposite":K.orthogonal?"orthogonal":"perpendicular";return K};this.getSegments=function(){return z};this.updateBounds=function(E){var D=E.getBounds();this.bounds.minX=Math.min(this.bounds.minX,D.minX);this.bounds.maxX=Math.max(this.bounds.maxX,D.maxX);this.bounds.minY=Math.min(this.bounds.minY,D.minY);this.bounds.maxY=Math.max(this.bounds.maxY,D.maxY)};var w=function(){console.log("SEGMENTS:");for(var D=0;D<z.length;D++){console.log(z[D].type,z[D].getLength(),k[D])}};this.pointOnPath=function(E,F){var D=m(E,F);return D.segment&&D.segment.pointOnPath(D.proportion,F)||[0,0]};this.gradientAtPoint=function(E){var D=m(E,absolute);return D.segment&&D.segment.gradientAtPoint(D.proportion,absolute)||0};this.pointAlongPathFrom=function(E,G,F){var D=m(E,F);return D.segment&&D.segment.pointAlongPathFrom(D.proportion,G,false)||[0,0]};this.compute=function(D){if(!l){n=t(D)}C();this._compute(n,D);this.x=n.points[0];this.y=n.points[1];this.w=n.points[2];this.h=n.points[3];this.segment=n.segment;A()};return{addSegment:y,prepareCompute:t,sourceStub:o,targetStub:u,maxStub:Math.max(o,u),sourceGap:p,targetGap:r,maxGap:Math.max(p,r)}};jsPlumbUtil.extend(jsPlumb.Connectors.AbstractConnector,g);var d=function(){this.type="Straight";var h=jsPlumb.Connectors.AbstractConnector.apply(this,arguments);this._compute=function(k,i){h.addSegment(this,"Straight",{x1:k.sx,y1:k.sy,x2:k.startStubX,y2:k.startStubY});h.addSegment(this,"Straight",{x1:k.startStubX,y1:k.startStubY,x2:k.endStubX,y2:k.endStubY});h.addSegment(this,"Straight",{x1:k.endStubX,y1:k.endStubY,x2:k.tx,y2:k.ty})}};jsPlumbUtil.extend(jsPlumb.Connectors.Straight,jsPlumb.Connectors.AbstractConnector);jsPlumb.registerConnectorType(d,"Straight");var a=function(m){m=m||{};var k=jsPlumb.Connectors.AbstractConnector.apply(this,arguments),l=m.stub||50,h=m.curviness||150,i=10;this.type="Bezier";this.getCurviness=function(){return h};this._findControlPoint=function(w,n,t,o,r){var u=o.anchor.getOrientation(o),v=r.anchor.getOrientation(r),s=u[0]!=v[0]||u[1]==v[1],q=[];if(!s){if(u[0]===0){q.push(n[0]<t[0]?w[0]+i:w[0]-i)}else{q.push(w[0]-(h*u[0]))}if(u[1]===0){q.push(n[1]<t[1]?w[1]+i:w[1]-i)}else{q.push(w[1]+(h*v[1]))}}else{if(v[0]===0){q.push(t[0]<n[0]?w[0]+i:w[0]-i)}else{q.push(w[0]+(h*v[0]))}if(v[1]===0){q.push(t[1]<n[1]?w[1]+i:w[1]-i)}else{q.push(w[1]+(h*u[1]))}}return q};this._compute=function(s,q){var r=q.sourcePos,x=q.targetPos,y=Math.abs(r[0]-x[0]),u=Math.abs(r[1]-x[1]),v=r[0]<x[0]?y:0,t=r[1]<x[1]?u:0,o=r[0]<x[0]?0:y,n=r[1]<x[1]?0:u,z=this._findControlPoint([v,t],r,x,q.sourceEndpoint,q.targetEndpoint),w=this._findControlPoint([o,n],x,r,q.targetEndpoint,q.sourceEndpoint);k.addSegment(this,"Bezier",{x1:v,y1:t,x2:o,y2:n,cp1x:z[0],cp1y:z[1],cp2x:w[0],cp2y:w[1]})}};jsPlumbUtil.extend(a,jsPlumb.Connectors.AbstractConnector);jsPlumb.registerConnectorType(a,"Bezier");jsPlumb.Endpoints.AbstractEndpoint=function(i){g.apply(this,arguments);var h=this.compute=function(n,k,o,m){var l=this._compute.apply(this,arguments);this.x=l[0];this.y=l[1];this.w=l[2];this.h=l[3];this.bounds.minX=this.x;this.bounds.minY=this.y;this.bounds.maxX=this.x+this.w;this.bounds.maxY=this.y+this.h;return l};return{compute:h,cssClass:i.cssClass}};jsPlumbUtil.extend(jsPlumb.Endpoints.AbstractEndpoint,g);jsPlumb.Endpoints.Dot=function(i){this.type="Dot";var h=jsPlumb.Endpoints.AbstractEndpoint.apply(this,arguments);i=i||{};this.radius=i.radius||10;this.defaultOffset=0.5*this.radius;this.defaultInnerRadius=this.radius/3;this._compute=function(r,k,l,n){this.radius=l.radius||this.radius;var q=r[0]-this.radius,p=r[1]-this.radius,s=this.radius*2,o=this.radius*2;if(l.strokeStyle){var m=l.lineWidth||1;q-=m;p-=m;s+=(m*2);o+=(m*2)}return[q,p,s,o,this.radius]}};jsPlumbUtil.extend(jsPlumb.Endpoints.Dot,jsPlumb.Endpoints.AbstractEndpoint);jsPlumb.Endpoints.Rectangle=function(i){this.type="Rectangle";var h=jsPlumb.Endpoints.AbstractEndpoint.apply(this,arguments);i=i||{};this.width=i.width||20;this.height=i.height||20;this._compute=function(p,m,r,o){var n=r.width||this.width,l=r.height||this.height,k=p[0]-(n/2),q=p[1]-(l/2);return[k,q,n,l]}};jsPlumbUtil.extend(jsPlumb.Endpoints.Rectangle,jsPlumb.Endpoints.AbstractEndpoint);var c=function(h){jsPlumb.DOMElementComponent.apply(this,arguments);this._jsPlumb.displayElements=[]};jsPlumbUtil.extend(c,jsPlumb.DOMElementComponent,{getDisplayElements:function(){return this._jsPlumb.displayElements},appendDisplayElement:function(h){this._jsPlumb.displayElements.push(h)}});jsPlumb.Endpoints.Image=function(m){this.type="Image";c.apply(this,arguments);jsPlumb.Endpoints.AbstractEndpoint.apply(this,arguments);var h=m.onload,l=m.src||m.url,k=m.parent,i=m.cssClass?" "+m.cssClass:"";this._jsPlumb.img=new Image();this._jsPlumb.ready=false;this._jsPlumb.initialized=false;this._jsPlumb.deleted=false;this._jsPlumb.widthToUse=m.width;this._jsPlumb.heightToUse=m.height;this._jsPlumb.endpoint=m.endpoint;this._jsPlumb.img.onload=function(){if(this._jsPlumb!=null){this._jsPlumb.ready=true;this._jsPlumb.widthToUse=this._jsPlumb.widthToUse||this._jsPlumb.img.width;this._jsPlumb.heightToUse=this._jsPlumb.heightToUse||this._jsPlumb.img.height;if(h){h(this)}}}.bind(this);this._jsPlumb.endpoint.setImage=function(n,p){var o=n.constructor==String?n:n.src;h=p;this._jsPlumb.img.src=o;if(this.canvas!=null){this.canvas.setAttribute("src",this._jsPlumb.img.src)}}.bind(this);this._jsPlumb.endpoint.setImage(l,h);this._compute=function(p,n,q,o){this.anchorPoint=p;if(this._jsPlumb.ready){return[p[0]-this._jsPlumb.widthToUse/2,p[1]-this._jsPlumb.heightToUse/2,this._jsPlumb.widthToUse,this._jsPlumb.heightToUse]}else{return[0,0,0,0]}};this.canvas=document.createElement("img");this.canvas.style.margin=0;this.canvas.style.padding=0;this.canvas.style.outline=0;this.canvas.style.position="absolute";this.canvas.className=this._jsPlumb.instance.endpointClass+i;if(this._jsPlumb.widthToUse){this.canvas.setAttribute("width",this._jsPlumb.widthToUse)}if(this._jsPlumb.heightToUse){this.canvas.setAttribute("height",this._jsPlumb.heightToUse)}this._jsPlumb.instance.appendElement(this.canvas,k);this.attachListeners(this.canvas,this);this.actuallyPaint=function(q,p,o){if(!this._jsPlumb.deleted){if(!this._jsPlumb.initialized){this.canvas.setAttribute("src",this._jsPlumb.img.src);this.appendDisplayElement(this.canvas);this._jsPlumb.initialized=true}var n=this.anchorPoint[0]-(this._jsPlumb.widthToUse/2),r=this.anchorPoint[1]-(this._jsPlumb.heightToUse/2);jsPlumbUtil.sizeElement(this.canvas,n,r,this._jsPlumb.widthToUse,this._jsPlumb.heightToUse)}};this.paint=function(o,n){if(this._jsPlumb!=null){if(this._jsPlumb.ready){this.actuallyPaint(o,n)}else{window.setTimeout(function(){this.paint(o,n)}.bind(this),200)}}}};jsPlumbUtil.extend(jsPlumb.Endpoints.Image,[c,jsPlumb.Endpoints.AbstractEndpoint],{cleanup:function(){this._jsPlumb.deleted=true;jsPlumbUtil.removeElement(this.canvas);this.canvas=null}});jsPlumb.Endpoints.Blank=function(i){var h=jsPlumb.Endpoints.AbstractEndpoint.apply(this,arguments);this.type="Blank";c.apply(this,arguments);this._compute=function(m,k,n,l){return[m[0],m[1],10,0]};this.canvas=document.createElement("div");this.canvas.style.display="block";this.canvas.style.width="1px";this.canvas.style.height="1px";this.canvas.style.background="transparent";this.canvas.style.position="absolute";this.canvas.className=this._jsPlumb.endpointClass;jsPlumb.appendElement(this.canvas,i.parent);this.paint=function(l,k){jsPlumbUtil.sizeElement(this.canvas,this.x,this.y,this.w,this.h)}};jsPlumbUtil.extend(jsPlumb.Endpoints.Blank,[jsPlumb.Endpoints.AbstractEndpoint,c],{cleanup:function(){if(this.canvas){this.canvas.parentNode.removeChild(this.canvas)}}});jsPlumb.Endpoints.Triangle=function(i){this.type="Triangle";var h=jsPlumb.Endpoints.AbstractEndpoint.apply(this,arguments);i=i||{};i.width=i.width||55;i.height=i.height||55;this.width=i.width;this.height=i.height;this._compute=function(p,m,r,o){var n=r.width||self.width,l=r.height||self.height,k=p[0]-(n/2),q=p[1]-(l/2);return[k,q,n,l]}};var f=jsPlumb.Overlays.AbstractOverlay=function(h){this.visible=true;this.isAppendedAtTopLevel=true;this.component=h.component;this.loc=h.location==null?0.5:h.location;this.endpointLoc=h.endpointLocation==null?[0.5,0.5]:h.endpointLocation};f.prototype={cleanup:function(){this.component=null;this.canvas=null;this.endpointLoc=null},setVisible:function(h){this.visible=h;this.component.repaint()},isVisible:function(){return this.visible},hide:function(){this.setVisible(false)},show:function(){this.setVisible(true)},incrementLocation:function(h){this.loc+=h;this.component.repaint()},setLocation:function(h){this.loc=h;this.component.repaint()},getLocation:function(){return this.loc}};jsPlumb.Overlays.Arrow=function(m){this.type="Arrow";f.apply(this,arguments);this.isAppendedAtTopLevel=false;m=m||{};var h=jsPlumbUtil;this.length=m.length||20;this.width=m.width||20;this.id=m.id;var l=(m.direction||1)<0?-1:1,k=m.paintStyle||{lineWidth:1},i=m.foldback||0.623;this.computeMaxSize=function(){return self.width*1.5};this.draw=function(w,B){var s,y,o,t,r;if(w.pointAlongPathFrom){if(h.isString(this.loc)||this.loc>1||this.loc<0){var p=parseInt(this.loc,10);s=w.pointAlongPathFrom(p,l*this.length/2,true);y=w.pointOnPath(p,true);o=h.pointOnLine(s,y,this.length)}else{if(this.loc==1){s=w.pointOnPath(this.loc);y=w.pointAlongPathFrom(this.loc,-(this.length));o=h.pointOnLine(s,y,this.length);if(l==-1){var A=o;o=s;s=A}}else{if(this.loc===0){o=w.pointOnPath(this.loc);y=w.pointAlongPathFrom(this.loc,this.length);s=h.pointOnLine(o,y,this.length);if(l==-1){var x=o;o=s;s=x}}else{s=w.pointAlongPathFrom(this.loc,l*this.length/2);y=w.pointOnPath(this.loc);o=h.pointOnLine(s,y,this.length)}}}t=h.perpendicularLineTo(s,o,this.width);r=h.pointOnLine(s,o,i*this.length);var u={hxy:s,tail:t,cxy:r},v=k.strokeStyle||B.strokeStyle,z=k.fillStyle||B.strokeStyle,q=k.lineWidth||B.lineWidth,n={component:w,d:u,lineWidth:q,strokeStyle:v,fillStyle:z,minX:Math.min(s.x,t[0].x,t[1].x),maxX:Math.max(s.x,t[0].x,t[1].x),minY:Math.min(s.y,t[0].y,t[1].y),maxY:Math.max(s.y,t[0].y,t[1].y)};return n}else{return{component:w,minX:0,maxX:0,minY:0,maxY:0}}}};jsPlumbUtil.extend(jsPlumb.Overlays.Arrow,f);jsPlumb.Overlays.PlainArrow=function(i){i=i||{};var h=jsPlumb.extend(i,{foldback:1});jsPlumb.Overlays.Arrow.call(this,h);this.type="PlainArrow"};jsPlumbUtil.extend(jsPlumb.Overlays.PlainArrow,jsPlumb.Overlays.Arrow);jsPlumb.Overlays.Diamond=function(k){k=k||{};var h=k.length||40,i=jsPlumb.extend(k,{length:h/2,foldback:2});jsPlumb.Overlays.Arrow.call(this,i);this.type="Diamond"};jsPlumbUtil.extend(jsPlumb.Overlays.Diamond,jsPlumb.Overlays.Arrow);var e=function(h){if(h._jsPlumb.cachedDimensions==null){h._jsPlumb.cachedDimensions=h.getDimensions()}return h._jsPlumb.cachedDimensions};var b=function(i){jsPlumb.DOMElementComponent.apply(this,arguments);f.apply(this,arguments);var h=jsPlumb.CurrentLibrary;this.id=i.id;this._jsPlumb.div=null;this._jsPlumb.initialised=false;this._jsPlumb.component=i.component;this._jsPlumb.cachedDimensions=null;this._jsPlumb.create=i.create;this.getElement=function(){if(this._jsPlumb.div==null){var l=this._jsPlumb.div=h.getDOMElement(this._jsPlumb.create(this._jsPlumb.component));l.style.position="absolute";var k=i._jsPlumb.overlayClass+" "+(this.cssClass?this.cssClass:i.cssClass?i.cssClass:"");l.className=k;this._jsPlumb.instance.appendElement(l,this._jsPlumb.component.parent);this._jsPlumb.instance.getId(l);this.attachListeners(l,this);this.canvas=l}return this._jsPlumb.div};this.draw=function(n,s){var k=e(this);if(k!=null&&k.length==2){var l={x:0,y:0};if(n.pointOnPath){var m=this.loc,o=false;if(jsPlumbUtil.isString(this.loc)||this.loc<0||this.loc>1){m=parseInt(this.loc,10);o=true}l=n.pointOnPath(m,o)}else{var q=this.loc.constructor==Array?this.loc:this.endpointLoc;l={x:q[0]*n.w,y:q[1]*n.h}}var r=l.x-(k[0]/2),p=l.y-(k[1]/2);return{component:n,d:{minx:r,miny:p,td:k,cxy:l},minX:r,maxX:r+k[0],minY:p,maxY:p+k[1]}}else{return{minX:0,maxX:0,minY:0,maxY:0}}}};jsPlumbUtil.extend(b,[jsPlumb.DOMElementComponent,f],{getDimensions:function(){return jsPlumb.CurrentLibrary.getSize(jsPlumb.CurrentLibrary.getElementObject(this.getElement()))},setVisible:function(h){this._jsPlumb.div.style.display=h?"block":"none"},clearCachedDimensions:function(){this._jsPlumb.cachedDimensions=null},cleanup:function(){if(this._jsPlumb.div!=null){jsPlumb.CurrentLibrary.removeElement(this._jsPlumb.div)}},computeMaxSize:function(){var h=e(this);return Math.max(h[0],h[1])},reattachListeners:function(h){if(this._jsPlumb.div){this.reattachListenersForElement(this._jsPlumb.div,this,h)}},paint:function(i,h){if(!this._jsPlumb.initialised){this.getElement();i.component.appendDisplayElement(this._jsPlumb.div);this.attachListeners(this._jsPlumb.div,i.component);this._jsPlumb.initialised=true}this._jsPlumb.div.style.left=(i.component.x+i.d.minx)+"px";this._jsPlumb.div.style.top=(i.component.y+i.d.miny)+"px"}});jsPlumb.Overlays.Custom=function(h){this.type="Custom";b.apply(this,arguments)};jsPlumbUtil.extend(jsPlumb.Overlays.Custom,b);jsPlumb.Overlays.GuideLines=function(){var h=this;h.length=50;h.lineWidth=5;this.type="GuideLines";f.apply(this,arguments);jsPlumb.jsPlumbUIComponent.apply(this,arguments);this.draw=function(k,p){var o=k.pointAlongPathFrom(h.loc,h.length/2),n=k.pointOnPath(h.loc),m=jsPlumbUtil.pointOnLine(o,n,h.length),l=jsPlumbUtil.perpendicularLineTo(o,m,40),i=jsPlumbUtil.perpendicularLineTo(m,o,20);return{connector:k,head:o,tail:m,headLine:i,tailLine:l,minX:Math.min(o.x,m.x,i[0].x,i[1].x),minY:Math.min(o.y,m.y,i[0].y,i[1].y),maxX:Math.max(o.x,m.x,i[0].x,i[1].x),maxY:Math.max(o.y,m.y,i[0].y,i[1].y)}}};jsPlumb.Overlays.Label=function(i){this.labelStyle=i.labelStyle||jsPlumb.Defaults.LabelStyle;this.cssClass=this.labelStyle!=null?this.labelStyle.cssClass:null;var h=jsPlumb.extend({create:function(){return document.createElement("div")}},i);jsPlumb.Overlays.Custom.call(this,h);this.type="Label";this.label=i.label||"";this.labelText=null};jsPlumbUtil.extend(jsPlumb.Overlays.Label,jsPlumb.Overlays.Custom,{cleanup:function(){this.div=null;this.label=null;this.labelText=null;this.cssClass=null;this.labelStyle=null},getLabel:function(){return this.label},setLabel:function(h){this.label=h;this.labelText=null;this.clearCachedDimensions();this.update();this.component.repaint()},getDimensions:function(){this.update();return b.prototype.getDimensions.apply(this,arguments)},update:function(){if(typeof this.label=="function"){var h=this.label(this);this.getElement().innerHTML=h.replace(/\r\n/g,"<br/>")}else{if(this.labelText==null){this.labelText=this.label;this.getElement().innerHTML=this.labelText.replace(/\r\n/g,"<br/>")}}}})})();(function(){var a=function(u){this.type="Flowchart";u=u||{};u.stub=u.stub==null?30:u.stub;var l=this,t=jsPlumb.Connectors.AbstractConnector.apply(this,arguments),d=u.midpoint==null?0.5:u.midpoint,s=[],q=[],c=u.grid,k=u.alwaysRespectStubs,g=null,p=null,o=null,m,f=u.cornerRadius!=null?u.cornerRadius:0,h=function(v){return v<0?-1:v===0?0:1},i=function(B,D,C,A){if(p==D&&o==C){return}var z=p==null?A.sx:p,w=o==null?A.sy:o,v=z==D?"v":"h",F=h(D-z),E=h(C-w);p=D;o=C;B.push([z,w,D,C,v,F,E])},r=function(v){return Math.sqrt(Math.pow(v[0]-v[2],2)+Math.pow(v[1]-v[3],2))},e=function(v){var w=[];w.push.apply(w,v);return w},b=function(v){l.bounds.minX=Math.min(l.bounds.minX,v[2]);l.bounds.maxX=Math.max(l.bounds.maxX,v[2]);l.bounds.minY=Math.min(l.bounds.minY,v[3]);l.bounds.maxY=Math.max(l.bounds.maxY,v[3])},n=function(w,B,v){var D,A;for(var z=0;z<B.length-1;z++){D=D||e(B[z]);A=e(B[z+1]);if(f>0&&D[4]!=A[4]){var H=Math.min(f,r(D),r(A));D[2]-=D[5]*H;D[3]-=D[6]*H;A[0]+=A[5]*H;A[1]+=A[6]*H;var I=(D[6]==A[5]&&A[5]==1)||((D[6]==A[5]&&A[5]===0)&&D[5]!=A[6])||(D[6]==A[5]&&A[5]==-1),E=A[1]>D[3]?1:-1,F=A[0]>D[2]?1:-1,C=E==F,y=(C&&I||(!C&&!I))?A[0]:D[2],x=(C&&I||(!C&&!I))?D[3]:A[1];t.addSegment(w,"Straight",{x1:D[0],y1:D[1],x2:D[2],y2:D[3]});t.addSegment(w,"Arc",{r:H,x1:D[2],y1:D[3],x2:A[0],y2:A[1],cx:y,cy:x,ac:I})}else{var J=(D[2]==D[0])?0:(D[2]>D[0])?(v.lw/2):-(v.lw/2),G=(D[3]==D[1])?0:(D[3]>D[1])?(v.lw/2):-(v.lw/2);t.addSegment(w,"Straight",{x1:D[0]-J,y1:D[1]-G,x2:D[2]+J,y2:D[3]+G})}D=A}t.addSegment(w,"Straight",{x1:A[0],y1:A[1],x2:A[2],y2:A[3]})};this.setSegments=function(v){g=v};this.isEditable=function(){return true};this.getOriginalSegments=function(){return g||q};this._compute=function(x,L){if(L.clearEdits){g=null}if(g!=null){n(this,g,x);return}q=[];p=null;o=null;m=null;var J=x.startStubX+((x.endStubX-x.startStubX)*d),H=x.startStubY+((x.endStubY-x.startStubY)*d);var F=function(Q,P,N,O){return Q+(P*((1-N)*O)+t.maxStub)},y={x:[0,1],y:[1,0]},B=function(N){return[x.startStubX,x.startStubY,x.endStubX,x.endStubY]},A={perpendicular:B,orthogonal:B,opposite:function(P){var Q=x,O=P=="x"?0:1,N={x:function(){return((Q.so[O]==1&&(((Q.startStubX>Q.endStubX)&&(Q.tx>Q.startStubX))||((Q.sx>Q.endStubX)&&(Q.tx>Q.sx)))))||((Q.so[O]==-1&&(((Q.startStubX<Q.endStubX)&&(Q.tx<Q.startStubX))||((Q.sx<Q.endStubX)&&(Q.tx<Q.sx)))))},y:function(){return((Q.so[O]==1&&(((Q.startStubY>Q.endStubY)&&(Q.ty>Q.startStubY))||((Q.sy>Q.endStubY)&&(Q.ty>Q.sy)))))||((Q.so[O]==-1&&(((Q.startStubY<Q.endStubY)&&(Q.ty<Q.startStubY))||((Q.sy<Q.endStubY)&&(Q.ty<Q.sy)))))}};if(!k&&N[P]()){return{x:[(x.sx+x.tx)/2,x.startStubY,(x.sx+x.tx)/2,x.endStubY],y:[x.startStubX,(x.sy+x.ty)/2,x.endStubX,(x.sy+x.ty)/2]}[P]}else{return[x.startStubX,x.startStubY,x.endStubX,x.endStubY]}}},I={perpendicular:function(P,Z,O,ag,T){var ae=x,af={x:[[[1,2,3,4],null,[2,1,4,3]],null,[[4,3,2,1],null,[3,4,1,2]]],y:[[[3,2,1,4],null,[2,3,4,1]],null,[[4,1,2,3],null,[1,4,3,2]]]},ad={x:[[ae.startStubX,ae.endStubX],null,[ae.endStubX,ae.startStubX]],y:[[ae.startStubY,ae.endStubY],null,[ae.endStubY,ae.startStubY]]},X={x:[[J,ae.startStubY],[J,ae.endStubY]],y:[[ae.startStubX,H],[ae.endStubX,H]]},N={x:[[ae.endStubX,ae.startStubY]],y:[[ae.startStubX,ae.endStubY]]},W={x:[[ae.startStubX,ae.endStubY],[ae.endStubX,ae.endStubY]],y:[[ae.endStubX,ae.startStubY],[ae.endStubX,ae.endStubY]]},ac={x:[[ae.startStubX,H],[ae.endStubX,H],[ae.endStubX,ae.endStubY]],y:[[J,ae.startStubY],[J,ae.endStubY],[ae.endStubX,ae.endStubY]]},ab={x:[ae.startStubY,ae.endStubY],y:[ae.startStubX,ae.endStubX]},V=y[P][0],ah=y[P][1],U=ae.so[V]+1,Y=ae.to[ah]+1,Q=(ae.to[ah]==-1&&(ab[P][1]<ab[P][0]))||(ae.to[ah]==1&&(ab[P][1]>ab[P][0])),S=ad[P][U][0],R=ad[P][U][1],aa=af[P][U][Y];if(ae.segment==aa[3]||(ae.segment==aa[2]&&Q)){return X[P]}else{if(ae.segment==aa[2]&&R<S){return N[P]}else{if((ae.segment==aa[2]&&R>=S)||(ae.segment==aa[1]&&!Q)){return ac[P]}else{if(ae.segment==aa[0]||(ae.segment==aa[1]&&Q)){return W[P]}}}}},orthogonal:function(R,Q,S,O,N){var T=x,P={x:T.so[0]==-1?Math.min(Q,O):Math.max(Q,O),y:T.so[1]==-1?Math.min(Q,O):Math.max(Q,O)}[R];return{x:[[P,S],[P,N],[O,N]],y:[[S,P],[N,P],[N,O]]}[R]},opposite:function(P,W,O,U,V){var S=x,Q={x:"y",y:"x"}[P],T={x:"height",y:"width"}[P],N=S["is"+P.toUpperCase()+"GreaterThanStubTimes2"];if(L.sourceEndpoint.elementId==L.targetEndpoint.elementId){var R=O+((1-L.sourceEndpoint.anchor[Q])*L.sourceInfo[T])+t.maxStub;return{x:[[W,R],[U,R]],y:[[R,W],[R,U]]}[P]}else{if(!N||(S.so[C]==1&&W>U)||(S.so[C]==-1&&W<U)){return{x:[[W,H],[U,H]],y:[[J,W],[J,U]]}[P]}else{if((S.so[C]==1&&W<U)||(S.so[C]==-1&&W>U)){return{x:[[J,S.sy],[J,S.ty]],y:[[S.sx,H],[S.tx,H]]}[P]}}}}};var K=A[x.anchorOrientation](x.sourceAxis),C=x.sourceAxis=="x"?0:1,v=x.sourceAxis=="x"?1:0,E=K[C],w=K[v],M=K[C+2],z=K[v+2];i(q,K[0],K[1],x);var D=I[x.anchorOrientation](x.sourceAxis,E,w,M,z);if(D){for(var G=0;G<D.length;G++){i(q,D[G][0],D[G][1],x)}}i(q,K[2],K[3],x);i(q,x.tx,x.ty,x);n(this,q,x)};this.getPath=function(){var z=null,C=null,B=[],w=g||q;for(var y=0;y<w.length;y++){var v=w[y],A=v[4],x=(A=="v"?3:2);if(z!=null&&C===A){z[x]=v[x]}else{if(v[0]!=v[2]||v[1]!=v[3]){B.push({start:[v[0],v[1]],end:[v[2],v[3]]});z=v;C=v[4]}}}return B};this.setPath=function(F){g=[];for(var A=0;A<F.length;A++){var z=F[A].start[0],w=F[A].start[1],C=F[A].end[0],B=F[A].end[1],v=z==C?"v":"h",E=h(C-z),D=h(B-w);g.push([z,w,C,B,v,E,D])}}};jsPlumbUtil.extend(a,jsPlumb.Connectors.AbstractConnector);jsPlumb.registerConnectorType(a,"Flowchart")})();(function(){var d=function(f,h,e,g){this.m=(g-h)/(e-f);this.b=-1*((this.m*f)-h);this.rectIntersect=function(q,p,s,o){var n=[],k,t;k=(p-this.b)/this.m;if(k>=q&&k<=(q+s)){n.push([k,(this.m*k)+this.b])}t=(this.m*(q+s))+this.b;if(t>=p&&t<=(p+o)){n.push([(t-this.b)/this.m,t])}k=((p+o)-this.b)/this.m;if(k>=q&&k<=(q+s)){n.push([k,(this.m*k)+this.b])}t=(this.m*q)+this.b;if(t>=p&&t<=(p+o)){n.push([(t-this.b)/this.m,t])}if(n.length==2){var m=(n[0][0]+n[1][0])/2,l=(n[0][1]+n[1][1])/2;n.push([m,l]);var i=m<=q+(s/2)?-1:1,r=l<=p+(o/2)?-1:1;n.push([i,r]);return n}return null}},b=function(f,h,e,g){if(f<=e&&g<=h){return 1}else{if(f<=e&&h<=g){return 2}else{if(e<=f&&g>=h){return 3}}}return 4},c=function(h,g,k,f,i,n,m,e,l){if(e<=l){return[h,g]}if(k===1){if(f[3]<=0&&i[3]>=1){return[h+(f[2]<0.5?-1*n:n),g]}else{if(f[2]>=1&&i[2]<=0){return[h,g+(f[3]<0.5?-1*m:m)]}else{return[h+(-1*n),g+(-1*m)]}}}else{if(k===2){if(f[3]>=1&&i[3]<=0){return[h+(f[2]<0.5?-1*n:n),g]}else{if(f[2]>=1&&i[2]<=0){return[h,g+(f[3]<0.5?-1*m:m)]}else{return[h+(1*n),g+(-1*m)]}}}else{if(k===3){if(f[3]>=1&&i[3]<=0){return[h+(f[2]<0.5?-1*n:n),g]}else{if(f[2]<=0&&i[2]>=1){return[h,g+(f[3]<0.5?-1*m:m)]}else{return[h+(-1*n),g+(-1*m)]}}}else{if(k===4){if(f[3]<=0&&i[3]>=1){return[h+(f[2]<0.5?-1*n:n),g]}else{if(f[2]<=0&&i[2]>=1){return[h,g+(f[3]<0.5?-1*m:m)]}else{return[h+(1*n),g+(-1*m)]}}}}}}};var a=function(h){h=h||{};this.type="StateMachine";var n=this,l=jsPlumb.Connectors.AbstractConnector.apply(this,arguments),e=h.curviness||10,i=h.margin||5,k=h.proximityLimit||80,f=h.orientation&&h.orientation==="clockwise",g=h.loopbackRadius||25,m=h.showLoopback!==false;this._compute=function(A,T){var I=Math.abs(T.sourcePos[0]-T.targetPos[0]),Q=Math.abs(T.sourcePos[1]-T.targetPos[1]),G=Math.min(T.sourcePos[0],T.targetPos[0]),E=Math.min(T.sourcePos[1],T.targetPos[1]);if(!m||(T.sourceEndpoint.elementId!==T.targetEndpoint.elementId)){var z=T.sourcePos[0]<T.targetPos[0]?0:I,t=T.sourcePos[1]<T.targetPos[1]?0:Q,L=T.sourcePos[0]<T.targetPos[0]?I:0,J=T.sourcePos[1]<T.targetPos[1]?Q:0;if(T.sourcePos[2]===0){z-=i}if(T.sourcePos[2]===1){z+=i}if(T.sourcePos[3]===0){t-=i}if(T.sourcePos[3]===1){t+=i}if(T.targetPos[2]===0){L-=i}if(T.targetPos[2]===1){L+=i}if(T.targetPos[3]===0){J-=i}if(T.targetPos[3]===1){J+=i}var F=(z+L)/2,C=(t+J)/2,o=(-1*F)/C,M=Math.atan(o),H=(o==Infinity||o==-Infinity)?0:Math.abs(e/2*Math.sin(M)),K=(o==Infinity||o==-Infinity)?0:Math.abs(e/2*Math.cos(M)),p=b(z,t,L,J),B=Math.sqrt(Math.pow(L-z,2)+Math.pow(J-t,2)),D=c(F,C,p,T.sourcePos,T.targetPos,e,e,B,k);l.addSegment(this,"Bezier",{x1:L,y1:J,x2:z,y2:t,cp1x:D[0],cp1y:D[1],cp2x:D[0],cp2y:D[1]})}else{var S=T.sourcePos[0],P=T.sourcePos[0],v=T.sourcePos[1]-i,s=T.sourcePos[1]-i,u=S,r=v-g,R=2*g,q=2*g,O=u-g,N=r-g;A.points[0]=O;A.points[1]=N;A.points[2]=R;A.points[3]=q;l.addSegment(this,"Arc",{x1:(S-O)+4,y1:v-N,startAngle:0,endAngle:2*Math.PI,r:g,ac:!f,x2:(S-O)-4,y2:v-N,cx:u-O,cy:r-N})}}};jsPlumb.registerConnectorType(a,"StateMachine")})();(function(){var a=function(g){g=g||{};var c=this,e=jsPlumb.Connectors.AbstractConnector.apply(this,arguments),f=g.stub||50,b=g.curviness||150,d=10;this.type="Bezier";this.getCurviness=function(){return b};this._findControlPoint=function(r,h,n,i,l){var o=i.anchor.getOrientation(i),q=l.anchor.getOrientation(l),m=o[0]!=q[0]||o[1]==q[1],k=[];if(!m){if(o[0]===0){k.push(h[0]<n[0]?r[0]+d:r[0]-d)}else{k.push(r[0]-(b*o[0]))}if(o[1]===0){k.push(h[1]<n[1]?r[1]+d:r[1]-d)}else{k.push(r[1]+(b*q[1]))}}else{if(q[0]===0){k.push(n[0]<h[0]?r[0]+d:r[0]-d)}else{k.push(r[0]+(b*q[0]))}if(q[1]===0){k.push(n[1]<h[1]?r[1]+d:r[1]-d)}else{k.push(r[1]+(b*o[1]))}}return k};this._compute=function(m,k){var l=k.sourcePos,s=k.targetPos,t=Math.abs(l[0]-s[0]),o=Math.abs(l[1]-s[1]),q=l[0]<s[0]?t:0,n=l[1]<s[1]?o:0,i=l[0]<s[0]?0:t,h=l[1]<s[1]?0:o,u=c._findControlPoint([q,n],l,s,k.sourceEndpoint,k.targetEndpoint),r=c._findControlPoint([i,h],s,l,k.targetEndpoint,k.sourceEndpoint);e.addSegment(this,"Bezier",{x1:q,y1:n,x2:i,y2:h,cp1x:u[0],cp1y:u[1],cp2x:r[0],cp2y:r[1]})}};jsPlumb.registerConnectorType(a,"Bezier")})();(function(){var f=null,m=function(s,r){return jsPlumb.CurrentLibrary.hasClass(a(s),r)},a=function(r){return jsPlumb.CurrentLibrary.getElementObject(r)},p=function(r){return jsPlumb.CurrentLibrary.getOffset(a(r))},q=function(r){return jsPlumb.CurrentLibrary.getPageXY(r)},h=function(r){return jsPlumb.CurrentLibrary.getClientXY(r)};var n=window.CanvasMouseAdapter=function(){var t=this;t.overlayPlacements=[];jsPlumb.jsPlumbUIComponent.apply(this,arguments);jsPlumbUtil.EventGenerator.apply(this,arguments);this._over=function(C){var E=p(a(t.canvas)),G=q(C),z=G[0]-E.left,F=G[1]-E.top;if(z>0&&F>0&&z<t.canvas.width&&F<t.canvas.height){for(var A=0;A<t.overlayPlacements.length;A++){var B=t.overlayPlacements[A];if(B&&(B[0]<=z&&B[1]>=z&&B[2]<=F&&B[3]>=F)){return true}}var D=t.canvas.getContext("2d").getImageData(parseInt(z,10),parseInt(F,10),1,1);return D.data[0]!==0||D.data[1]!==0||D.data[2]!==0||D.data[3]!==0}return false};var s=false,r=false,w=null,v=false,u=function(y,x){return y!==null&&m(y,x)};this.mousemove=function(A){var C=q(A),z=h(A),y=document.elementFromPoint(z[0],z[1]),B=u(y,"_jsPlumb_overlay");var x=f===null&&(u(y,"_jsPlumb_endpoint")||u(y,"_jsPlumb_connector"));if(!s&&x&&t._over(A)){s=true;t.fire("mouseenter",t,A);return true}else{if(s&&(!t._over(A)||!x)&&!B){s=false;t.fire("mouseexit",t,A)}}t.fire("mousemove",t,A)};this.click=function(x){if(s&&t._over(x)&&!v){t.fire("click",t,x)}v=false};this.dblclick=function(x){if(s&&t._over(x)&&!v){t.fire("dblclick",t,x)}v=false};this.mousedown=function(x){if(t._over(x)&&!r){r=true;w=p(a(t.canvas));t.fire("mousedown",t,x)}};this.mouseup=function(x){r=false;t.fire("mouseup",t,x)};this.contextmenu=function(x){if(s&&t._over(x)&&!v){t.fire("contextmenu",t,x)}v=false}};jsPlumbUtil.extend(n,[jsPlumb.jsPlumbUIComponent,jsPlumbUtil.EventGenerator]);var e=function(s){var r=document.createElement("canvas");s._jsPlumb.instance.appendElement(r,s.parent);r.style.position="absolute";if(s["class"]){r.className=s["class"]}s._jsPlumb.instance.getId(r,s.uuid);if(s.tooltip){r.setAttribute("title",s.tooltip)}return r};var o=window.CanvasComponent=function(s){n.apply(this,arguments);var r=[];this.getDisplayElements=function(){return r};this.appendDisplayElement=function(t){r.push(t)}};jsPlumbUtil.extend(o,n);var b=[null,[1,-1],[1,1],[-1,1],[-1,-1]];var d=function(r,t,v){if(t.gradient){var u=v();for(var s=0;s<t.gradient.stops.length;s++){u.addColorStop(t.gradient.stops[s][0],t.gradient.stops[s][1])}r.strokeStyle=u}};var l=function(v,s,u,t,r){({Straight:function(x,J,M,D,C){var P=x.params;J.save();d(J,M,function(){return J.createLinearGradient(P.x1,P.y1,P.x2,P.y2)});J.beginPath();J.translate(D,C);if(M.dashstyle&&M.dashstyle.split(" ").length===2){var H=M.dashstyle.split(" ");if(H.length!==2){H=[2,2]}var w=[H[0]*M.lineWidth,H[1]*M.lineWidth],I=(P.x2-P.x1)/(P.y2-P.y1),F=jsPlumbUtil.segment([P.x1,P.y1],[P.x2,P.y2]),N=b[F],B=Math.atan(I),K=Math.sqrt(Math.pow(P.x2-P.x1,2)+Math.pow(P.y2-P.y1,2)),A=Math.floor(K/(w[0]+w[1])),O=[P.x1,P.y1];for(var L=0;L<A;L++){J.moveTo(O[0],O[1]);var G=O[0]+(Math.abs(Math.sin(B)*w[0])*N[0]),E=O[1]+(Math.abs(Math.cos(B)*w[0])*N[1]),z=O[0]+(Math.abs(Math.sin(B)*(w[0]+w[1]))*N[0]),y=O[1]+(Math.abs(Math.cos(B)*(w[0]+w[1]))*N[1]);J.lineTo(G,E);O=[z,y]}J.moveTo(O[0],O[1]);J.lineTo(P.x2,P.y2)}else{J.moveTo(P.x1,P.y1);J.lineTo(P.x2,P.y2)}J.stroke();J.restore()},Bezier:function(A,x,z,y,w){var B=A.params;x.save();d(x,z,function(){return x.createLinearGradient(B.x2+y,B.y2+w,B.x1+y,B.y1+w)});x.beginPath();x.translate(y,w);x.moveTo(B.x1,B.y1);x.bezierCurveTo(B.cp1x,B.cp1y,B.cp2x,B.cp2y,B.x2,B.y2);x.stroke();x.restore()},Arc:function(A,x,z,y,w){var B=A.params;x.save();x.beginPath();x.translate(y,w);x.arc(B.cx,B.cy,B.r,A.startAngle,A.endAngle,B.ac);x.stroke();x.restore()}})[v.type](v,s,u,t,r)};var k=jsPlumb.ConnectorRenderers.canvas=function(t){o.apply(this,arguments);var r=function(y,v,u){this.ctx.save();jsPlumb.extend(this.ctx,y);var w=this.getSegments();for(var x=0;x<w.length;x++){l(w[x],this.ctx,y,v,u)}this.ctx.restore()}.bind(this);var s=this._jsPlumb.instance.connectorClass+" "+(t.cssClass||"");this.canvas=e({"class":s,_jsPlumb:this._jsPlumb,parent:t.parent});this.ctx=this.canvas.getContext("2d");this.appendDisplayElement(this.canvas);this.paint=function(u,x,A){if(u!=null){var D=[this.x,this.y],v=[this.w,this.h],w,E=0,C=0;if(A!=null){if(A.xmin<0){D[0]+=A.xmin;E=-A.xmin}if(A.ymin<0){D[1]+=A.ymin;C=-A.ymin}v[0]=A.xmax+((A.xmin<0)?-A.xmin:0);v[1]=A.ymax+((A.ymin<0)?-A.ymin:0)}this.translateX=E;this.translateY=C;jsPlumbUtil.sizeElement(this.canvas,D[0],D[1],v[0],v[1]);if(u.outlineColor!=null){var z=u.outlineWidth||1,B=u.lineWidth+(2*z),y={strokeStyle:u.outlineColor,lineWidth:B};r(y,E,C)}r(u,E,C)}}};jsPlumbUtil.extend(k,o);var c=function(t){o.apply(this,arguments);var s=this._jsPlumb.instance.endpointClass+" "+(t.cssClass||""),r={"class":s,_jsPlumb:this._jsPlumb,parent:t.parent,tooltip:self.tooltip};this.canvas=e(r);this.ctx=this.canvas.getContext("2d");this.appendDisplayElement(this.canvas);this.paint=function(w,u,z){jsPlumbUtil.sizeElement(this.canvas,this.x,this.y,this.w,this.h);if(w.outlineColor!=null){var y=w.outlineWidth||1,v=w.lineWidth+(2*y);var x={strokeStyle:w.outlineColor,lineWidth:v}}this._paint.apply(this,arguments)}};jsPlumbUtil.extend(c,o);jsPlumb.Endpoints.canvas.Dot=function(u){jsPlumb.Endpoints.Dot.apply(this,arguments);c.apply(this,arguments);var t=this,s=function(v){try{return parseInt(v,10)}catch(w){if(v.substring(v.length-1)=="%"){return parseInt(v.substring(0,v-1),10)}}},r=function(x){var v=t.defaultOffset,w=t.defaultInnerRadius;if(x.offset){v=s(x.offset)}if(x.innerRadius){w=s(x.innerRadius)}return[v,w]};this._paint=function(z){if(z!=null){var v=t.canvas.getContext("2d"),w=u.endpoint.anchor.getOrientation(u.endpoint);jsPlumb.extend(v,z);if(z.gradient){var C=r(z.gradient),B=w[1]==1?C[0]*-1:C[0],y=w[0]==1?C[0]*-1:C[0],A=v.createRadialGradient(t.radius,t.radius,t.radius,t.radius+y,t.radius+B,C[1]);for(var x=0;x<z.gradient.stops.length;x++){A.addColorStop(z.gradient.stops[x][0],z.gradient.stops[x][1])}v.fillStyle=A}v.beginPath();v.arc(t.radius,t.radius,t.radius,0,Math.PI*2,true);v.closePath();if(z.fillStyle||z.gradient){v.fill()}if(z.strokeStyle){v.stroke()}}}};jsPlumbUtil.extend(jsPlumb.Endpoints.canvas.Dot,[jsPlumb.Endpoints.Dot,c]);jsPlumb.Endpoints.canvas.Rectangle=function(s){var r=this;jsPlumb.Endpoints.Rectangle.apply(this,arguments);c.apply(this,arguments);this._paint=function(t){var B=r.canvas.getContext("2d"),w=s.endpoint.anchor.getOrientation(s.endpoint);jsPlumb.extend(B,t);if(t.gradient){var A=w[1]==1?r.h:w[1]===0?r.h/2:0;var z=w[1]==-1?r.h:w[1]===0?r.h/2:0;var v=w[0]==1?r.w:w[0]===0?r.w/2:0;var u=w[0]==-1?r.w:w[0]===0?r.w/2:0;var y=B.createLinearGradient(v,A,u,z);for(var x=0;x<t.gradient.stops.length;x++){y.addColorStop(t.gradient.stops[x][0],t.gradient.stops[x][1])}B.fillStyle=y}B.beginPath();B.rect(0,0,r.w,r.h);B.closePath();if(t.fillStyle||t.gradient){B.fill()}if(t.strokeStyle){B.stroke()}}};jsPlumbUtil.extend(jsPlumb.Endpoints.canvas.Rectangle,[jsPlumb.Endpoints.Rectangle,c]);jsPlumb.Endpoints.canvas.Triangle=function(s){var r=this;jsPlumb.Endpoints.Triangle.apply(this,arguments);c.apply(this,arguments);this._paint=function(w){var u=r.canvas.getContext("2d"),t=0,y=0,x=0,v=s.endpoint.anchor.getOrientation(s.endpoint);if(v[0]==1){t=r.width;y=r.height;x=180}if(v[1]==-1){t=r.width;x=90}if(v[1]==1){y=r.height;x=-90}u.fillStyle=w.fillStyle;u.translate(t,y);u.rotate(x*Math.PI/180);u.beginPath();u.moveTo(0,0);u.lineTo(r.width/2,r.height/2);u.lineTo(0,r.height);u.closePath();if(w.fillStyle||w.gradient){u.fill()}if(w.strokeStyle){u.stroke()}}};jsPlumbUtil.extend(jsPlumb.Endpoints.canvas.Triangle,[jsPlumb.Endpoints.Triangle,c]);jsPlumb.Endpoints.canvas.Image=jsPlumb.Endpoints.Image;jsPlumb.Endpoints.canvas.Blank=jsPlumb.Endpoints.Blank;jsPlumb.Overlays.canvas.Label=jsPlumb.Overlays.Label;jsPlumb.Overlays.canvas.Custom=jsPlumb.Overlays.Custom;var i=function(){jsPlumb.jsPlumbUIComponent.apply(this,arguments)};jsPlumbUtil.extend(i,jsPlumb.jsPlumbUIComponent);var g=function(s,r){s.apply(this,r);i.apply(this,r);this.paint=function(w,u){var t=w.component.ctx,v=w.d;if(v){t.save();t.lineWidth=w.lineWidth;t.beginPath();t.translate(w.component.translateX,w.component.translateY);t.moveTo(v.hxy.x,v.hxy.y);t.lineTo(v.tail[0].x,v.tail[0].y);t.lineTo(v.cxy.x,v.cxy.y);t.lineTo(v.tail[1].x,v.tail[1].y);t.lineTo(v.hxy.x,v.hxy.y);t.closePath();if(w.strokeStyle){t.strokeStyle=w.strokeStyle;t.stroke()}if(w.fillStyle){t.fillStyle=w.fillStyle;t.fill()}t.restore()}}};jsPlumb.Overlays.canvas.Arrow=function(){g.apply(this,[jsPlumb.Overlays.Arrow,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.canvas.Arrow,[jsPlumb.Overlays.Arrow,i]);jsPlumb.Overlays.canvas.PlainArrow=function(){g.apply(this,[jsPlumb.Overlays.PlainArrow,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.canvas.PlainArrow,[jsPlumb.Overlays.PlainArrow,i]);jsPlumb.Overlays.canvas.Diamond=function(){g.apply(this,[jsPlumb.Overlays.Diamond,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.canvas.Diamond,[jsPlumb.Overlays.Diamond,i])})();(function(){var l={joinstyle:"stroke-linejoin","stroke-linejoin":"stroke-linejoin","stroke-dashoffset":"stroke-dashoffset","stroke-linecap":"stroke-linecap"},w="stroke-dasharray",B="dashstyle",e="linearGradient",b="radialGradient",c="fill",a="stop",A="stroke",q="stroke-width",h="style",m="none",t="jsplumb_gradient_",o="lineWidth",D={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml"},g=function(G,E){for(var F in E){G.setAttribute(F,""+E[F])}},f=function(F,E){var G=document.createElementNS(D.svg,F);E=E||{};E.version="1.1";E.xmlns=D.xhtml;g(G,E);return G},n=function(E){return"position:absolute;left:"+E[0]+"px;top:"+E[1]+"px"},i=function(F){for(var E=0;E<F.childNodes.length;E++){if(F.childNodes[E].tagName==e||F.childNodes[E].tagName==b){F.removeChild(F.childNodes[E])}}},v=function(O,J,G,E,K){var H=t+K._jsPlumb.instance.idstamp();i(O);var M;if(!G.gradient.offset){M=f(e,{id:H,gradientUnits:"userSpaceOnUse"})}else{M=f(b,{id:H})}O.appendChild(M);for(var L=0;L<G.gradient.stops.length;L++){var I=K.segment==1||K.segment==2?L:G.gradient.stops.length-1-L,N=jsPlumbUtil.convertStyle(G.gradient.stops[I][1],true),P=f(a,{offset:Math.floor(G.gradient.stops[L][0]*100)+"%","stop-color":N});M.appendChild(P)}var F=G.strokeStyle?A:c;J.setAttribute(h,F+":url(#"+H+")")},x=function(L,H,F,E,I){if(F.gradient){v(L,H,F,E,I)}else{i(L);H.setAttribute(h,"")}H.setAttribute(c,F.fillStyle?jsPlumbUtil.convertStyle(F.fillStyle,true):m);H.setAttribute(A,F.strokeStyle?jsPlumbUtil.convertStyle(F.strokeStyle,true):m);if(F.lineWidth){H.setAttribute(q,F.lineWidth)}if(F[B]&&F[o]&&!F[w]){var M=F[B].indexOf(",")==-1?" ":",",J=F[B].split(M),G="";J.forEach(function(N){G+=(Math.floor(N*F.lineWidth)+M)});H.setAttribute(w,G)}else{if(F[w]){H.setAttribute(w,F[w])}}for(var K in l){if(F[K]){H.setAttribute(l[K],F[K])}}},C=function(G){var E=/([0-9].)(p[xt])\s(.*)/,F=G.match(E);return{size:F[1]+F[2],font:F[3]}},r=function(J,K,F){var L=F.split(" "),I=J.className,H=I.baseVal.split(" ");for(var G=0;G<L.length;G++){if(K){if(H.indexOf(L[G])==-1){H.push(L[G])}}else{var E=H.indexOf(L[G]);if(E!=-1){H.splice(E,1)}}}J.className.baseVal=H.join(" ")},u=function(F,E){r(F,true,E)},k=function(F,E){r(F,false,E)},z=function(F,G,E){if(F.childNodes.length>E){F.insertBefore(G,F.childNodes[E])}else{F.appendChild(G)}};jsPlumbUtil.svg={addClass:u,removeClass:k,node:f,attr:g,pos:n};var s=function(I){var G=I.pointerEventsSpec||"all",H={};jsPlumb.jsPlumbUIComponent.apply(this,I.originalArgs);this.canvas=null;this.path=null;this.svg=null;var F=I.cssClass+" "+(I.originalArgs[0].cssClass||""),J={style:"",width:0,height:0,"pointer-events":G,position:"absolute"};this.svg=f("svg",J);if(I.useDivWrapper){this.canvas=document.createElement("div");this.canvas.style.position="absolute";jsPlumbUtil.sizeElement(this.canvas,0,0,1,1);this.canvas.className=F}else{g(this.svg,{"class":F});this.canvas=this.svg}I._jsPlumb.appendElement(this.canvas,I.originalArgs[0].parent);if(I.useDivWrapper){this.canvas.appendChild(this.svg)}var E=[this.canvas];this.getDisplayElements=function(){return E};this.appendDisplayElement=function(K){E.push(K)};this.paint=function(M,L,N){if(M!=null){var P=[this.x,this.y],K=[this.w,this.h],O;if(N!=null){if(N.xmin<0){P[0]+=N.xmin}if(N.ymin<0){P[1]+=N.ymin}K[0]=N.xmax+((N.xmin<0)?-N.xmin:0);K[1]=N.ymax+((N.ymin<0)?-N.ymin:0)}if(I.useDivWrapper){jsPlumbUtil.sizeElement(this.canvas,P[0],P[1],K[0],K[1]);P[0]=0;P[1]=0;O=n([0,0])}else{O=n([P[0],P[1]])}H.paint.apply(this,arguments);g(this.svg,{style:O,width:K[0],height:K[1]})}};return{renderer:H}};jsPlumbUtil.extend(s,jsPlumb.jsPlumbUIComponent,{cleanup:function(){jsPlumbUtil.removeElement(this.canvas);this.svg=null;this.canvas=null;this.path=null}});var d=jsPlumb.ConnectorRenderers.svg=function(G){var E=this,F=s.apply(this,[{cssClass:G._jsPlumb.connectorClass,originalArgs:arguments,pointerEventsSpec:"none",_jsPlumb:G._jsPlumb}]);F.renderer.paint=function(H,L,Q){var M=E.getSegments(),I="",J=[0,0];if(Q.xmin<0){J[0]=-Q.xmin}if(Q.ymin<0){J[1]=-Q.ymin}for(var K=0;K<M.length;K++){I+=jsPlumb.Segments.svg.SegmentRenderer.getPath(M[K]);I+=" "}var R={d:I,transform:"translate("+J[0]+","+J[1]+")","pointer-events":G["pointer-events"]||"visibleStroke"},O=null,N=[E.x,E.y,E.w,E.h];if(H.outlineColor){var P=H.outlineWidth||1,S=H.lineWidth+(2*P);O=jsPlumb.CurrentLibrary.extend({},H);O.strokeStyle=jsPlumbUtil.convertStyle(H.outlineColor);O.lineWidth=S;if(E.bgPath==null){E.bgPath=f("path",R);z(E.svg,E.bgPath,0);E.attachListeners(E.bgPath,E)}else{g(E.bgPath,R)}x(E.svg,E.bgPath,O,N,E)}if(E.path==null){E.path=f("path",R);z(E.svg,E.path,H.outlineColor?1:0);E.attachListeners(E.path,E)}else{g(E.path,R)}x(E.svg,E.path,H,N,E)};this.reattachListeners=function(){if(this.bgPath){this.reattachListenersForElement(this.bgPath,this)}if(this.path){this.reattachListenersForElement(this.path,this)}}};jsPlumbUtil.extend(jsPlumb.ConnectorRenderers.svg,s);jsPlumb.Segments.svg={SegmentRenderer:{getPath:function(E){return({Straight:function(){var F=E.getCoordinates();return"M "+F.x1+" "+F.y1+" L "+F.x2+" "+F.y2},Bezier:function(){var F=E.params;return"M "+F.x1+" "+F.y1+" C "+F.cp1x+" "+F.cp1y+" "+F.cp2x+" "+F.cp2y+" "+F.x2+" "+F.y2},Arc:function(){var H=E.params,F=E.sweep>Math.PI?1:0,G=E.anticlockwise?0:1;return"M"+E.x1+" "+E.y1+" A "+E.radius+" "+H.r+" 0 "+F+","+G+" "+E.x2+" "+E.y2}})[E.type]()}}};var y=window.SvgEndpoint=function(F){var E=s.apply(this,[{cssClass:F._jsPlumb.endpointClass,originalArgs:arguments,pointerEventsSpec:"all",useDivWrapper:true,_jsPlumb:F._jsPlumb}]);E.renderer.paint=function(H){var G=jsPlumb.extend({},H);if(G.outlineColor){G.strokeWidth=G.outlineWidth;G.strokeStyle=jsPlumbUtil.convertStyle(G.outlineColor,true)}if(this.node==null){this.node=this.makeNode(G);this.svg.appendChild(this.node);this.attachListeners(this.node,this)}else{if(this.updateNode!=null){this.updateNode(this.node)}}x(this.svg,this.node,G,[this.x,this.y,this.w,this.h],this);n(this.node,[this.x,this.y])}.bind(this)};jsPlumbUtil.extend(y,s,{reattachListeners:function(){if(this.node){this.reattachListenersForElement(this.node,this)}}});jsPlumb.Endpoints.svg.Dot=function(){jsPlumb.Endpoints.Dot.apply(this,arguments);y.apply(this,arguments);this.makeNode=function(E){return f("circle",{cx:this.w/2,cy:this.h/2,r:this.radius})};this.updateNode=function(E){g(E,{cx:this.w/2,cy:this.h/2,r:this.radius})}};jsPlumbUtil.extend(jsPlumb.Endpoints.svg.Dot,[jsPlumb.Endpoints.Dot,y]);jsPlumb.Endpoints.svg.Rectangle=function(){jsPlumb.Endpoints.Rectangle.apply(this,arguments);y.apply(this,arguments);this.makeNode=function(E){return f("rect",{width:this.w,height:this.h})};this.updateNode=function(E){g(E,{width:this.w,height:this.h})}};jsPlumbUtil.extend(jsPlumb.Endpoints.svg.Rectangle,[jsPlumb.Endpoints.Rectangle,y]);jsPlumb.Endpoints.svg.Image=jsPlumb.Endpoints.Image;jsPlumb.Endpoints.svg.Blank=jsPlumb.Endpoints.Blank;jsPlumb.Overlays.svg.Label=jsPlumb.Overlays.Label;jsPlumb.Overlays.svg.Custom=jsPlumb.Overlays.Custom;var p=function(H,G){H.apply(this,G);jsPlumb.jsPlumbUIComponent.apply(this,G);this.isAppendedAtTopLevel=false;var E=this;this.path=null;this.paint=function(L,I){if(L.component.svg&&I){if(this.path==null){this.path=f("path",{"pointer-events":"all"});L.component.svg.appendChild(this.path);this.attachListeners(this.path,L.component);this.attachListeners(this.path,this)}var J=G&&(G.length==1)?(G[0].cssClass||""):"",K=[0,0];if(I.xmin<0){K[0]=-I.xmin}if(I.ymin<0){K[1]=-I.ymin}g(this.path,{d:F(L.d),"class":J,stroke:L.strokeStyle?L.strokeStyle:null,fill:L.fillStyle?L.fillStyle:null,transform:"translate("+K[0]+","+K[1]+")"})}};var F=function(I){return"M"+I.hxy.x+","+I.hxy.y+" L"+I.tail[0].x+","+I.tail[0].y+" L"+I.cxy.x+","+I.cxy.y+" L"+I.tail[1].x+","+I.tail[1].y+" L"+I.hxy.x+","+I.hxy.y};this.reattachListeners=function(){if(this.path){this.reattachListenersForElement(this.path,this)}}};jsPlumbUtil.extend(p,jsPlumb.jsPlumbUIComponent,{cleanup:function(){if(this.path!=null){jsPlumb.CurrentLibrary.removeElement(this.path)}}});jsPlumb.Overlays.svg.Arrow=function(){p.apply(this,[jsPlumb.Overlays.Arrow,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.svg.Arrow,[jsPlumb.Overlays.Arrow,p]);jsPlumb.Overlays.svg.PlainArrow=function(){p.apply(this,[jsPlumb.Overlays.PlainArrow,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.svg.PlainArrow,[jsPlumb.Overlays.PlainArrow,p]);jsPlumb.Overlays.svg.Diamond=function(){p.apply(this,[jsPlumb.Overlays.Diamond,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.svg.Diamond,[jsPlumb.Overlays.Diamond,p]);jsPlumb.Overlays.svg.GuideLines=function(){var I=null,E=this,H,G;jsPlumb.Overlays.GuideLines.apply(this,arguments);this.paint=function(L,J){if(I==null){I=f("path");L.connector.svg.appendChild(I);E.attachListeners(I,L.connector);E.attachListeners(I,E);H=f("path");L.connector.svg.appendChild(H);E.attachListeners(H,L.connector);E.attachListeners(H,E);G=f("path");L.connector.svg.appendChild(G);E.attachListeners(G,L.connector);E.attachListeners(G,E)}var K=[0,0];if(J.xmin<0){K[0]=-J.xmin}if(J.ymin<0){K[1]=-J.ymin}g(I,{d:F(L.head,L.tail),stroke:"red",fill:null,transform:"translate("+K[0]+","+K[1]+")"});g(H,{d:F(L.tailLine[0],L.tailLine[1]),stroke:"blue",fill:null,transform:"translate("+K[0]+","+K[1]+")"});g(G,{d:F(L.headLine[0],L.headLine[1]),stroke:"green",fill:null,transform:"translate("+K[0]+","+K[1]+")"})};var F=function(K,J){return"M "+K.x+","+K.y+" L"+J.x+","+J.y}};jsPlumbUtil.extend(jsPlumb.Overlays.svg.GuideLines,jsPlumb.Overlays.GuideLines)})();(function(){var h={"stroke-linejoin":"joinstyle",joinstyle:"joinstyle",endcap:"endcap",miterlimit:"miterlimit"},c=null;if(document.createStyleSheet&&document.namespaces){var m=[".jsplumb_vml","jsplumb\\:textbox","jsplumb\\:oval","jsplumb\\:rect","jsplumb\\:stroke","jsplumb\\:shape","jsplumb\\:group"],g="behavior:url(#default#VML);position:absolute;";c=document.createStyleSheet();for(var r=0;r<m.length;r++){c.addRule(m[r],g)}document.namespaces.add("jsplumb","urn:schemas-microsoft-com:vml")}jsPlumb.vml={};var t=1000,s={},a=function(u,i){var w=jsPlumb.getId(u),v=s[w];if(!v){v=f("group",[0,0,t,t],{"class":i});v.style.backgroundColor="red";s[w]=v}return v},e=function(v,w){for(var u in w){v[u]=w[u]}},f=function(u,y,z,w,i,v){z=z||{};var x=document.createElement("jsplumb:"+u);if(v){i.appendElement(x,w)}else{jsPlumb.CurrentLibrary.appendElement(x,w)}x.className=(z["class"]?z["class"]+" ":"")+"jsplumb_vml";k(x,y);e(x,z);return x},k=function(u,i,v){u.style.left=i[0]+"px";u.style.top=i[1]+"px";u.style.width=i[2]+"px";u.style.height=i[3]+"px";u.style.position="absolute";if(v){u.style.zIndex=v}},p=jsPlumb.vml.convertValue=function(i){return Math.floor(i*t)},b=function(w,u,v,i){if("transparent"===u){i.setOpacity(v,"0.0")}else{i.setOpacity(v,"1.0")}},q=function(y,u,B,C){var x={};if(u.strokeStyle){x.stroked="true";var D=jsPlumbUtil.convertStyle(u.strokeStyle,true);x.strokecolor=D;b(x,D,"stroke",B);x.strokeweight=u.lineWidth+"px"}else{x.stroked="false"}if(u.fillStyle){x.filled="true";var v=jsPlumbUtil.convertStyle(u.fillStyle,true);x.fillcolor=v;b(x,v,"fill",B)}else{x.filled="false"}if(u.dashstyle){if(B.strokeNode==null){B.strokeNode=f("stroke",[0,0,0,0],{dashstyle:u.dashstyle},y,C)}else{B.strokeNode.dashstyle=u.dashstyle}}else{if(u["stroke-dasharray"]&&u.lineWidth){var E=u["stroke-dasharray"].indexOf(",")==-1?" ":",",z=u["stroke-dasharray"].split(E),w="";for(var A=0;A<z.length;A++){w+=(Math.floor(z[A]/u.lineWidth)+E)}if(B.strokeNode==null){B.strokeNode=f("stroke",[0,0,0,0],{dashstyle:w},y,C)}else{B.strokeNode.dashstyle=w}}}e(y,x)},n=function(){var i=this,v={};jsPlumb.jsPlumbUIComponent.apply(this,arguments);this.opacityNodes={stroke:null,fill:null};this.initOpacityNodes=function(w){i.opacityNodes.stroke=f("stroke",[0,0,1,1],{opacity:"0.0"},w,i._jsPlumb.instance);i.opacityNodes.fill=f("fill",[0,0,1,1],{opacity:"0.0"},w,i._jsPlumb.instance)};this.setOpacity=function(w,y){var x=i.opacityNodes[w];if(x){x.opacity=""+y}};var u=[];this.getDisplayElements=function(){return u};this.appendDisplayElement=function(x,w){if(!w){i.canvas.parentNode.appendChild(x)}u.push(x)}};jsPlumbUtil.extend(n,jsPlumb.jsPlumbUIComponent,{cleanup:function(){if(this.bgCanvas){jsPlumbUtil.removeElement(this.bgCanvas)}jsPlumbUtil.removeElement(this.canvas)}});var d=jsPlumb.ConnectorRenderers.vml=function(u){this.strokeNode=null;this.canvas=null;n.apply(this,arguments);var i=this._jsPlumb.instance.connectorClass+(u.cssClass?(" "+u.cssClass):"");this.paint=function(w){if(w!==null){var z=this.getSegments(),x={path:""},A=[this.x,this.y,this.w,this.h];for(var y=0;y<z.length;y++){x.path+=jsPlumb.Segments.vml.SegmentRenderer.getPath(z[y]);x.path+=" "}if(w.outlineColor){var C=w.outlineWidth||1,D=w.lineWidth+(2*C),B={strokeStyle:jsPlumbUtil.convertStyle(w.outlineColor),lineWidth:D};for(var v in h){B[v]=w[v]}if(this.bgCanvas==null){x["class"]=i;x.coordsize=(A[2]*t)+","+(A[3]*t);this.bgCanvas=f("shape",A,x,u.parent,this._jsPlumb.instance,true);k(this.bgCanvas,A);this.appendDisplayElement(this.bgCanvas,true);this.attachListeners(this.bgCanvas,this);this.initOpacityNodes(this.bgCanvas,["stroke"])}else{x.coordsize=(A[2]*t)+","+(A[3]*t);k(this.bgCanvas,A);e(this.bgCanvas,x)}q(this.bgCanvas,B,this)}if(this.canvas==null){x["class"]=i;x.coordsize=(A[2]*t)+","+(A[3]*t);this.canvas=f("shape",A,x,u.parent,this._jsPlumb.instance,true);this.appendDisplayElement(this.canvas,true);this.attachListeners(this.canvas,this);this.initOpacityNodes(this.canvas,["stroke"])}else{x.coordsize=(A[2]*t)+","+(A[3]*t);k(this.canvas,A);e(this.canvas,x)}q(this.canvas,w,this,this._jsPlumb.instance)}}};jsPlumbUtil.extend(d,n,{reattachListeners:function(){if(this.canvas){this.reattachListenersForElement(this.canvas,this)}}});var l=window.VmlEndpoint=function(i){n.apply(this,arguments);this._jsPlumb.vml=null;this.canvas=document.createElement("div");this.canvas.style.position="absolute";this._jsPlumb.clazz=this._jsPlumb.instance.endpointClass+(i.cssClass?(" "+i.cssClass):"");i._jsPlumb.appendElement(this.canvas,i.parent);this.paint=function(w,v){var x={},u=this._jsPlumb.vml;jsPlumbUtil.sizeElement(this.canvas,this.x,this.y,this.w,this.h);if(this._jsPlumb.vml==null){x["class"]=this._jsPlumb.clazz;u=this._jsPlumb.vml=this.getVml([0,0,this.w,this.h],x,v,this.canvas,this._jsPlumb.instance);this.attachListeners(u,this);this.appendDisplayElement(u,true);this.appendDisplayElement(this.canvas,true);this.initOpacityNodes(u,["fill"])}else{k(u,[0,0,this.w,this.h]);e(u,x)}q(u,w,this)}};jsPlumbUtil.extend(l,n,{reattachListeners:function(){if(this._jsPlumb.vml){this.reattachListenersForElement(this._jsPlumb.vml,this)}}});jsPlumb.Segments.vml={SegmentRenderer:{getPath:function(i){return({Straight:function(u){var v=u.params;return"m"+p(v.x1)+","+p(v.y1)+" l"+p(v.x2)+","+p(v.y2)+" e"},Bezier:function(u){var v=u.params;return"m"+p(v.x1)+","+p(v.y1)+" c"+p(v.cp1x)+","+p(v.cp1y)+","+p(v.cp2x)+","+p(v.cp2y)+","+p(v.x2)+","+p(v.y2)+" e"},Arc:function(z){var B=z.params,u=Math.min(B.x1,B.x2),y=Math.max(B.x1,B.x2),C=Math.min(B.y1,B.y2),w=Math.max(B.y1,B.y2),A=z.anticlockwise?1:0,v=(z.anticlockwise?"at ":"wa "),x=function(){var D=[null,[function(){return[u,C]},function(){return[u-B.r,C-B.r]}],[function(){return[u-B.r,C]},function(){return[u,C-B.r]}],[function(){return[u-B.r,C-B.r]},function(){return[u,C]}],[function(){return[u,C-B.r]},function(){return[u-B.r,C]}]][z.segment][A]();return p(D[0])+","+p(D[1])+","+p(D[0]+(2*B.r))+","+p(D[1]+(2*B.r))};return v+x()+","+p(B.x1)+","+p(B.y1)+","+p(B.x2)+","+p(B.y2)+" e"}})[i.type](i)}}};jsPlumb.Endpoints.vml.Dot=function(){jsPlumb.Endpoints.Dot.apply(this,arguments);l.apply(this,arguments);this.getVml=function(w,x,u,v,i){return f("oval",w,x,v,i)}};jsPlumbUtil.extend(jsPlumb.Endpoints.vml.Dot,l);jsPlumb.Endpoints.vml.Rectangle=function(){jsPlumb.Endpoints.Rectangle.apply(this,arguments);l.apply(this,arguments);this.getVml=function(w,x,u,v,i){return f("rect",w,x,v,i)}};jsPlumbUtil.extend(jsPlumb.Endpoints.vml.Rectangle,l);jsPlumb.Endpoints.vml.Image=jsPlumb.Endpoints.Image;jsPlumb.Endpoints.vml.Blank=jsPlumb.Endpoints.Blank;jsPlumb.Overlays.vml.Label=jsPlumb.Overlays.Label;jsPlumb.Overlays.vml.Custom=jsPlumb.Overlays.Custom;var o=function(x,v){x.apply(this,v);n.apply(this,v);var u=this,w=null;u.canvas=null;u.isAppendedAtTopLevel=true;var i=function(y){return"m "+p(y.hxy.x)+","+p(y.hxy.y)+" l "+p(y.tail[0].x)+","+p(y.tail[0].y)+" "+p(y.cxy.x)+","+p(y.cxy.y)+" "+p(y.tail[1].x)+","+p(y.tail[1].y)+" x e"};this.paint=function(C,D){var z={},I=C.d,B=C.component;if(C.strokeStyle){z.stroked="true";z.strokecolor=jsPlumbUtil.convertStyle(C.strokeStyle,true)}if(C.lineWidth){z.strokeweight=C.lineWidth+"px"}if(C.fillStyle){z.filled="true";z.fillcolor=C.fillStyle}var y=Math.min(I.hxy.x,I.tail[0].x,I.tail[1].x,I.cxy.x),L=Math.min(I.hxy.y,I.tail[0].y,I.tail[1].y,I.cxy.y),E=Math.max(I.hxy.x,I.tail[0].x,I.tail[1].x,I.cxy.x),A=Math.max(I.hxy.y,I.tail[0].y,I.tail[1].y,I.cxy.y),K=Math.abs(E-y),G=Math.abs(A-L),F=[y,L,K,G];z.path=i(I);z.coordsize=(B.w*t)+","+(B.h*t);F[0]=B.x;F[1]=B.y;F[2]=B.w;F[3]=B.h;if(u.canvas==null){var J=B._jsPlumb.overlayClass||"";var H=v&&(v.length==1)?(v[0].cssClass||""):"";z["class"]=H+" "+J;u.canvas=f("shape",F,z,B.canvas.parentNode,B._jsPlumb.instance,true);B.appendDisplayElement(u.canvas,true);u.attachListeners(u.canvas,B);u.attachListeners(u.canvas,u)}else{k(u.canvas,F);e(u.canvas,z)}};this.reattachListeners=function(){if(u.canvas){u.reattachListenersForElement(u.canvas,u)}};this.cleanup=function(){if(u.canvas!=null){jsPlumb.CurrentLibrary.removeElement(u.canvas)}}};jsPlumbUtil.extend(o,n);jsPlumb.Overlays.vml.Arrow=function(){o.apply(this,[jsPlumb.Overlays.Arrow,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.vml.Arrow,[jsPlumb.Overlays.Arrow,o]);jsPlumb.Overlays.vml.PlainArrow=function(){o.apply(this,[jsPlumb.Overlays.PlainArrow,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.vml.PlainArrow,[jsPlumb.Overlays.PlainArrow,o]);jsPlumb.Overlays.vml.Diamond=function(){o.apply(this,[jsPlumb.Overlays.Diamond,arguments])};jsPlumbUtil.extend(jsPlumb.Overlays.vml.Diamond,[jsPlumb.Overlays.Diamond,o])})();(function(b){var a=function(c){return typeof(c)=="string"?b("#"+c):b(c)};jsPlumb.CurrentLibrary={addClass:function(d,c){d=a(d);try{if(d[0].className.constructor==SVGAnimatedString){jsPlumbUtil.svg.addClass(d[0],c)}}catch(f){}try{d.addClass(c)}catch(f){}},animate:function(e,d,c){e.animate(d,c)},appendElement:function(d,c){a(c).append(d)},ajax:function(c){c=c||{};c.type=c.type||"get";b.ajax(c)},bind:function(c,d,e){c=a(c);c.bind(d,e)},destroyDraggable:function(c){if(b(c).data("draggable")){b(c).draggable("destroy")}},destroyDroppable:function(c){if(b(c).data("droppable")){b(c).droppable("destroy")}},dragEvents:{start:"start",stop:"stop",drag:"drag",step:"step",over:"over",out:"out",drop:"drop",complete:"complete"},extend:function(d,c){return b.extend(d,c)},getClientXY:function(c){return[c.clientX,c.clientY]},getDragObject:function(c){return c[1].draggable||c[1].helper},getDragScope:function(c){return b(c).draggable("option","scope")},getDropEvent:function(c){return c[0]},getDropScope:function(c){return b(c).droppable("option","scope")},getDOMElement:function(c){if(c==null){return null}if(typeof(c)=="string"){return document.getElementById(c)}else{if(c.context||c.length!=null){return c[0]}else{return c}}},getElementObject:a,getOffset:function(c){return c.offset()},getOriginalEvent:function(c){return c.originalEvent},getPageXY:function(c){return[c.pageX,c.pageY]},getParent:function(c){return a(c).parent()},getScrollLeft:function(c){return c.scrollLeft()},getScrollTop:function(c){return c.scrollTop()},getSelector:function(d,c){if(arguments.length==2){return a(d).find(c)}else{return b(d)}},getSize:function(c){c=b(c);return[c.outerWidth(),c.outerHeight()]},getTagName:function(c){var d=a(c);return d.length>0?d[0].tagName:null},getUIPosition:function(d,e){e=e||1;if(d.length==1){ret={left:d[0].pageX,top:d[0].pageY}}else{var f=d[1],c=f.offset;ret=c||f.absolutePosition;f.position.left/=e;f.position.top/=e}return{left:ret.left/e,top:ret.top/e}},hasClass:function(d,c){return d.hasClass(c)},initDraggable:function(e,d,f,c){d=d||{};e=b(e);d.start=jsPlumbUtil.wrap(d.start,function(){b("body").addClass(c.dragSelectClass)},false);d.stop=jsPlumbUtil.wrap(d.stop,function(){b("body").removeClass(c.dragSelectClass)});if(!d.doNotRemoveHelper){d.helper=null}if(f){d.scope=d.scope||jsPlumb.Defaults.Scope}e.draggable(d)},initDroppable:function(d,c){c.scope=c.scope||jsPlumb.Defaults.Scope;b(d).droppable(c)},isAlreadyDraggable:function(c){return b(c).hasClass("ui-draggable")},isDragSupported:function(d,c){return b(d).draggable},isDropSupported:function(d,c){return b(d).droppable},removeClass:function(d,c){d=a(d);try{if(d[0].className.constructor==SVGAnimatedString){jsPlumbUtil.svg.removeClass(d[0],c);return}}catch(f){}d.removeClass(c)},removeElement:function(c){a(c).remove()},setDragFilter:function(d,c){if(jsPlumb.CurrentLibrary.isAlreadyDraggable(d)){d.draggable("option","cancel",c)}},setDraggable:function(d,c){d.draggable("option","disabled",!c)},setDragScope:function(d,c){d.draggable("option","scope",c)},setOffset:function(c,d){a(c).offset(d)},trigger:function(e,f,c){var d=jQuery._data(a(e)[0],"handle");d(c)},unbind:function(c,d,e){c=a(c);c.unbind(d,e)}};b(document).ready(jsPlumb.init)})(jQuery);//jsPlumb options
var dynamicAnchors = [ 0.5, 0.25, 0.75, 0, 1, 0.375, 0.625, 0.125, 0.875 ];

var connectionColors = [ "#92e1aa", "#F7BE81", "#BDBDBD", "#5882FA", "#E1F5A9",
		"#FA5858", "#FFFF00", "#FF0000", "#D8F781" ];

var sourceEndpointOptions = {
	connector : [ "Flowchart", { cornerRadius: 5 } ],
	paintStyle : {
		fillStyle : '#92e1aa'
	},
	isSource : true,
	isTarget : false,
	uniqueEndpoint : true,
	maxConnections : 1
};

var targetEndpointOptions = {
	paintStyle : {
		fillStyle : '#003f7d'
	},
	isSource : false,
	isTarget : true,
	reattach : true,
	// without specifying this the targetEndpoint doesn't accept multiple
	// connections
	maxConnections : -1
};

function jsPlumbInitializeDefault() {
	jsPlumb.importDefaults({
		DragOptions : {
			cursor : "pointer",
			zIndex : 2000
		},
		PaintStyle : {
			strokeStyle : "#92e1aa",
			lineWidth : 3,
			outlineWidth : 2,
			outlineColor : "white",
			joinstyle : "round"
		},
		Endpoint : [ "Dot", {
			radius : 6
		} ],
		ConnectionOverlays : [ [ "Arrow", {
			location : 0.8
		}, {
			foldback : 0.9,
			fillStyle : "#92e1aa",
			width : 14
		} ] ]
	});
};
function getConnectionOverlayLabel(colour, condition) {
	return [ [ "Arrow", {
		location : 0.8
	}, {
		foldback : 0.9,
		fillStyle : "#92e1aa",
		width : 14
	} ], [ "Label", {
		label : "<span title=\"" + condition + "\">" + condition + "</span>",
		cssClass : "workflow_connection_label",
		location : 0.6
	} ] ];
}
// --> end jsPlumbOptions
// display graph
function countElement(item, array) {
	var count = 0;
	jQuery.each(array, function(i, v) {
		if (v === item)
			count++;
	});
	return count;
};
function displayGraph(data, divContainerTargetId) {
	jQuery.each(data['nodes'], function() {
		var node = '<div class="workflow_node" id="' + this.id + '">' + this.title
				+ '</div>';
		var el = jQuery(node).appendTo('#' + divContainerTargetId).css(
				'position', 'absolute').css('left', this.x).css('top', this.y);

		if (this.isStartNode) {
			el.addClass('workflow_start_node');
		} else if (this.isEndNode) {
			el.addClass('workflow_end_node');
		} else if (this.isMerge) {
			el.addClass('workflow_merge_node');
		} else if (this.isMultiTask) {
			el.addClass('workflow_multiple_task');
		} else if (this.hasSubWorkflow) {
			el.addClass('workflow_subworkflow_task');
		} else {
			el.addClass('workflow_simple_task');
		}
		if (this.state == 'suspended') {
			el.addClass('workflow_node_suspended');
		}

	});
	// initialize connection source points
	var nodes = [];

	// determine number of source endpoints per node
	var sourceEndpoints = {};
	jQuery.each(data['transitions'], function() {
		sourceEndpoints[this.nodeSourceId] = (sourceEndpoints[this.nodeSourceId] || 0) + 1;
	});

	// use fixed dynamic anchors, only 9 items supported, after this everything
	// is displayed on the center
	jQuery.each(data['transitions'], function() {
		var anchorIndex = countElement(this.nodeSourceId, nodes);
		if (anchorIndex > 9) {
			anchorIndex = 0;
		}
		nodes.push(this.nodeSourceId);
		// determine anchors for this node
		var anchors = dynamicAnchors.slice(0, sourceEndpoints[this.nodeSourceId]).sort();
		// increase index
		var endPointSource = jsPlumb.addEndpoint(this.nodeSourceId, {
			anchor : [ anchors[anchorIndex], 1, 0, 1 ]
		}, sourceEndpointOptions);
		var endPointTarget = jsPlumb.addEndpoint(this.nodeTargetId, {
			anchor : "TopCenter"
		}, targetEndpointOptions);
		// prepare the transition's path
		// ignore paths with only one segment
		if (this.path && this.path.length > 2) {
			var segments = [];
			for (var i = 1; i < this.path.length; i++) {
				segments.push({
					start: [this.path[i - 1].x, this.path[i - 1].y],
					end: [this.path[i].x, this.path[i].y]
				});
			}
		}
		jsPlumb.connect({
			source : endPointSource,
			target : endPointTarget,
			overlays : getConnectionOverlayLabel(connectionColors[anchorIndex],
					this.label),
			paintStyle : {
				lineWidth : 3,
				strokeStyle : connectionColors[anchorIndex],
				outlineWidth : 2,
				outlineColor : "white",
				joinstyle : "round"
			},
			detachable:false,
			path: segments
		});
	});
	jQuery(document.getElementById(divContainerTargetId)).append(
            "<input type='hidden' name='graphInitDone' value='true' />");
};

function invokeGetGraphOp(routeId, currentLang, divContainerTargetId) {
	var automationCtx = {};
	var options = {repository : ctx.repository };
	var getGraphNodesExec = jQuery().automation('Document.Routing.GetGraph', options);
	getGraphNodesExec.setContext(automationCtx);
	getGraphNodesExec.addParameter("routeDocId", routeId);
	getGraphNodesExec.addParameter("language", currentLang);
	getGraphNodesExec.executeGetBlob(function(data, status, xhr) {
		displayGraph(data, divContainerTargetId);
	}, function(xhr, status, errorMessage) {
		jQuery('<div>Can not load graph </div>').appendTo(
				'#' + divContainerTargetId);
	}, true);
};

function loadGraph(routeDocId, currentLang, divContainerTargetId) {
    jsPlumbInitializeDefault();
    invokeGetGraphOp(routeDocId, currentLang, divContainerTargetId);
};function createNewTag(term, data) {
    return {
        id : term,
        displayLabel : term,
        newTag : true
    };
}

function addTagHandler(tag) {
    return addTagging(tag.id);
}

function removeTagHandler(tag) {
    return removeTagging(tag.id);
}

function formatSuggestedTags(tag) {
    if (tag.newTag) {
        return "<span class='s2newTag'>" + tag.displayLabel + "</span>"
    } else {
        return "<span class='s2existingTag'>" + tag.displayLabel + "</span>"
    }
}

function formatSelectedTags(tag) {
    var jsFragment = "listDocumentsForTag('" + tag.displayLabel + "');";
    return '<span class="s2newTag"><a href="' + window.nxContextPath + '/search/tag_search_results.faces?conversationId=' + currentConversationId + '" onclick="' + jsFragment + '">'
            + tag.displayLabel + '</a></span>'
}
function formatSuggestedCollection(collection) {
  var isNew = collection.id && collection.id.indexOf("-999999") == 0;
  var markup = "<table><tbody>";
  if (!collection.id) {
    markup = "<table class='select2-nx-disabled'><tbody>";
  } else {
    markup = "<table><tbody>";
  }
  markup += "<tr><td>";
  if (!isNew) {
    if (collection.icon) {
      markup += "<img src='" + window.nxContextPath
          + collection.icon + "'/>"
    }
  } else {
    markup += "<img src='" + window.nxContextPath + "/icons/action_add.gif'/>"
  }
  markup += "</td><td>";
  markup += collection.displayLabel;
  markup += "</td></tr></tbody></table>";
  return markup;
}

var formatSelectedCollection = formatSuggestedCollection;