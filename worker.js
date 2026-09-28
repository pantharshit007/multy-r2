var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/.pnpm/hono@4.12.27/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/shared/constants/index.ts
var API_KEY_HEADER = "x-api-key";
var BINDING_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_-]*$/;
var DEFAULT_PRIVATE_LINK_TTL_SECONDS = 3600;
var DEFAULT_MIME_TYPE = "application/octet-stream";
var FOLDER_CONTENT_TYPE = "application/x-directory";
var R2_API_PREFIX = "/api/r2";
var PUBLIC_ALIAS_PREFIX = "/cdn";

// src/server/constants/index.ts
var API_PREFIX = "/api";
var BUCKET_SCOPE_BASE = "/bucket/:bindingName";
var CORS_ALLOWED_METHODS = ["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"];
var CORS_ALLOWED_HEADERS = ["content-type", "x-api-key"];
var CORS_MAX_AGE_SECONDS = 86400;
var DEFAULT_OBJECT_LIST_LIMIT = 100;
var MIN_OBJECT_LIST_LIMIT = 1;
var MAX_OBJECT_LIST_LIMIT = 1e3;
var MIN_PRIVATE_LINK_TTL_SECONDS = 60;
var MAX_PRIVATE_LINK_TTL_SECONDS = 604800;
var SIGNED_OBJECT_CACHE_CONTROL = "private, max-age=0";
var DEFAULT_R2_BINDING_NAMES = ["R2_BUCKET", "BUCKET_A"];
var R2_PROBE_LIMIT = 1;
var DEFAULT_BUCKET_ACCESS_MODE = "public";
var DEFAULT_BUCKET_SORT_ORDER = 0;
var ACCESS_MODES = ["public", "private", "signed-link"];
var HEALTH_CHECK_MESSAGE = "Multy R2 endpoint worker";

// src/server/middleware/cors.ts
var ALLOW_METHODS = CORS_ALLOWED_METHODS.join(", ");
var ALLOW_HEADERS = CORS_ALLOWED_HEADERS.join(", ");
function applyCorsHeaders(headers, requestOrigin) {
  headers.set("Access-Control-Allow-Origin", requestOrigin && requestOrigin.length > 0 ? requestOrigin : "*");
  headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  headers.set("Access-Control-Max-Age", String(CORS_MAX_AGE_SECONDS));
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Origin");
  } else if (!vary.split(",").map((v) => v.trim().toLowerCase()).includes("origin")) {
    headers.append("Vary", "Origin");
  }
}
__name(applyCorsHeaders, "applyCorsHeaders");
var corsMiddleware = /* @__PURE__ */ __name(async (c, next) => {
  const requestOrigin = c.req.header("Origin");
  if (c.req.method === "OPTIONS") {
    const headers = new Headers();
    applyCorsHeaders(headers, requestOrigin);
    return new Response(null, { status: 204, headers });
  }
  await next();
  applyCorsHeaders(c.res.headers, requestOrigin);
}, "corsMiddleware");

// src/shared/utils/contentType.ts
function guessContentType(key) {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "css":
      return "text/css; charset=utf-8";
    case "gif":
      return "image/gif";
    case "htm":
    case "html":
      return "text/html; charset=utf-8";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "js":
    case "mjs":
      return "text/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "txt":
      return "text/plain; charset=utf-8";
    case "webp":
      return "image/webp";
    default:
      return DEFAULT_MIME_TYPE;
  }
}
__name(guessContentType, "guessContentType");

// src/shared/utils/objectKeys.ts
function encodeKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}
__name(encodeKey, "encodeKey");
function isDirectoryContentType(contentType) {
  if (!contentType) return false;
  return contentType.split(";")[0].trim().toLowerCase() === FOLDER_CONTENT_TYPE;
}
__name(isDirectoryContentType, "isDirectoryContentType");

// src/shared/utils/url.ts
function joinUrl(base, key) {
  const cleanBase = base.replace(/\/+$/, "");
  const hasTrailingSlash = key.endsWith("/");
  const cleanKey = key.split("/").filter(Boolean).map((part) => encodeURIComponent(part)).join("/");
  return `${cleanBase}/${cleanKey}${hasTrailingSlash ? "/" : ""}`;
}
__name(joinUrl, "joinUrl");

// src/server/errors.ts
var ApiError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  static {
    __name(this, "ApiError");
  }
};
function normalizeError(error) {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message };
  }
  console.error(error);
  return { status: 500, message: "Unexpected server error" };
}
__name(normalizeError, "normalizeError");

// src/server/utils/request.ts
function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}
__name(clampNumber, "clampNumber");
function isFile(value) {
  return Boolean(value && typeof value === "object" && "name" in value && "stream" in value);
}
__name(isFile, "isFile");
function trimToNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
__name(trimToNull, "trimToNull");

// src/server/repositories/bucketRepository.ts
var ACCESS_MODE_SET = new Set(ACCESS_MODES);
async function listBuckets(env) {
  const result = await env.DB.prepare(
    "SELECT * FROM buckets ORDER BY sort_order ASC, name COLLATE NOCASE ASC"
  ).all();
  return (result.results ?? []).map(toBucket);
}
__name(listBuckets, "listBuckets");
async function createBucket(env, input) {
  const parsed = parseBucketInput(input);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO buckets (id, name, binding_name, endpoint, custom_domain, access_mode, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    parsed.name,
    parsed.bindingName,
    parsed.endpoint,
    parsed.customDomain,
    parsed.accessMode,
    parsed.sortOrder,
    now,
    now
  ).run();
  return getBucket(env, id);
}
__name(createBucket, "createBucket");
async function getBucket(env, id) {
  const row = await env.DB.prepare("SELECT * FROM buckets WHERE id = ?").bind(id).first();
  if (!row) {
    throw new ApiError(404, "Bucket not found");
  }
  return toBucket(row);
}
__name(getBucket, "getBucket");
async function updateBucket(env, bucketId, input) {
  const current = await getBucket(env, bucketId);
  const patch = parseBucketPatchInput(input);
  const next = { ...current, ...patch };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.prepare(
    `UPDATE buckets
     SET name = ?, binding_name = ?, endpoint = ?, custom_domain = ?, access_mode = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    next.name,
    next.bindingName,
    next.endpoint,
    next.customDomain,
    next.accessMode,
    next.sortOrder,
    now,
    bucketId
  ).run();
  return getBucket(env, bucketId);
}
__name(updateBucket, "updateBucket");
async function deleteBucket(env, bucketId) {
  await getBucket(env, bucketId);
  await env.DB.prepare("DELETE FROM buckets WHERE id = ?").bind(bucketId).run();
}
__name(deleteBucket, "deleteBucket");
function toBucket(row) {
  const publicBaseUrl = normalizeUrl(row.custom_domain) ?? normalizeUrl(row.endpoint);
  const connectionMode = row.binding_name ? "binding" : row.endpoint || row.custom_domain ? "endpoint" : "unconfigured";
  return {
    id: row.id,
    name: row.name,
    bindingName: row.binding_name,
    endpoint: normalizeUrl(row.endpoint),
    customDomain: normalizeUrl(row.custom_domain),
    accessMode: row.access_mode,
    sortOrder: row.sort_order,
    publicBaseUrl,
    connectionMode,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toBucket, "toBucket");
function parseBucketInput(input) {
  const name = trimToNull(input.name);
  if (!name) {
    throw new ApiError(400, "Bucket name is required");
  }
  return {
    name,
    bindingName: normalizeBindingName(input.bindingName),
    endpoint: normalizeUrl(input.endpoint),
    customDomain: normalizeUrl(input.customDomain),
    accessMode: normalizeAccessMode(input.accessMode ?? DEFAULT_BUCKET_ACCESS_MODE),
    sortOrder: normalizeSortOrder(input.sortOrder)
  };
}
__name(parseBucketInput, "parseBucketInput");
function parseBucketPatchInput(input) {
  const patch = {};
  if ("name" in input) {
    const name = trimToNull(input.name);
    if (!name) {
      throw new ApiError(400, "Bucket name is required");
    }
    patch.name = name;
  }
  if ("bindingName" in input) patch.bindingName = normalizeBindingName(input.bindingName);
  if ("endpoint" in input) patch.endpoint = normalizeUrl(input.endpoint);
  if ("customDomain" in input) patch.customDomain = normalizeUrl(input.customDomain);
  if ("accessMode" in input) patch.accessMode = normalizeAccessMode(input.accessMode);
  if ("sortOrder" in input) patch.sortOrder = normalizeSortOrder(input.sortOrder);
  return patch;
}
__name(parseBucketPatchInput, "parseBucketPatchInput");
function normalizeBindingName(value) {
  const binding = trimToNull(value);
  if (!binding) return null;
  if (!BINDING_NAME_REGEX.test(binding)) {
    throw new ApiError(400, "Binding name must be a valid R2 binding name (letters, digits, underscores)");
  }
  return binding;
}
__name(normalizeBindingName, "normalizeBindingName");
function normalizeAccessMode(value) {
  if (typeof value !== "string" || !ACCESS_MODE_SET.has(value)) {
    throw new ApiError(400, "Access mode must be public, private, or signed-link");
  }
  return value;
}
__name(normalizeAccessMode, "normalizeAccessMode");
function normalizeSortOrder(value) {
  if (value === void 0 || value === null || value === "") return DEFAULT_BUCKET_SORT_ORDER;
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new ApiError(400, "Sort order must be an integer");
  }
  return number;
}
__name(normalizeSortOrder, "normalizeSortOrder");
function normalizeUrl(value) {
  const raw2 = trimToNull(value);
  if (!raw2) return null;
  const withProtocol = /^https?:\/\//i.test(raw2) ? raw2 : `https://${raw2}`;
  try {
    const url = new URL(withProtocol);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new ApiError(400, "URL fields must be valid URLs or domains");
  }
}
__name(normalizeUrl, "normalizeUrl");

// src/server/utils/crypto.ts
async function hmacSha256Base64Url(secretValue, payload) {
  const encoder = new TextEncoder();
  const secret = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretValue),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", secret, encoder.encode(payload));
  return base64Url(signature);
}
__name(hmacSha256Base64Url, "hmacSha256Base64Url");
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
function base64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64Url, "base64Url");

// src/server/utils/objectKeys.ts
function sanitizeObjectKey(value) {
  const key = value.replace(/^\/+/, "").trim();
  if (!key || key === "." || key.includes("..")) {
    throw new ApiError(400, "Object key is invalid");
  }
  return key;
}
__name(sanitizeObjectKey, "sanitizeObjectKey");

// src/server/services/privateLinks.ts
async function createPrivateObjectLink(env, bucketId, key, expires, origin) {
  const signature = await signPrivateLink(env, bucketId, key, expires);
  const privateUrl = new URL(`/api/buckets/${encodeURIComponent(bucketId)}/signed/${encodeKey(key)}`, origin);
  privateUrl.searchParams.set("expires", String(expires));
  privateUrl.searchParams.set("signature", signature);
  return privateUrl.toString();
}
__name(createPrivateObjectLink, "createPrivateObjectLink");
async function signPrivateLink(env, bucketId, key, expires) {
  if (!env.PRIVATE_LINK_SECRET || env.PRIVATE_LINK_SECRET.startsWith("replace-with")) {
    throw new ApiError(500, "PRIVATE_LINK_SECRET must be configured before generating private links");
  }
  return hmacSha256Base64Url(env.PRIVATE_LINK_SECRET, `${bucketId}:${key}:${expires}`);
}
__name(signPrivateLink, "signPrivateLink");

// src/server/generated/bucketNames.ts
var BUCKET_NAMES = {
  "BUCKET_A": "shottr-bucket",
  "BUCKET_B": "mine"
};

// src/server/services/r2Buckets.ts
function getBoundBucket(env, bucket) {
  if (!bucket.bindingName) {
    throw new ApiError(400, "This bucket needs a Worker R2 binding for file operations");
  }
  const binding = env[bucket.bindingName];
  if (!isR2Bucket(binding)) {
    throw new ApiError(400, `R2 binding '${bucket.bindingName}' is not configured on this Worker`);
  }
  return binding;
}
__name(getBoundBucket, "getBoundBucket");
function getDefaultEndpointBucket(env) {
  const bucket = env[DEFAULT_R2_BINDING_NAMES[0]] ?? env[DEFAULT_R2_BINDING_NAMES[1]];
  if (!isR2Bucket(bucket)) {
    throw new ApiError(500, `Configure an R2 binding named ${DEFAULT_R2_BINDING_NAMES[0]} or ${DEFAULT_R2_BINDING_NAMES[1]} for endpoint mode`);
  }
  return bucket;
}
__name(getDefaultEndpointBucket, "getDefaultEndpointBucket");
function getSelectedEndpointBucket(env, bucketBindingName) {
  const bindingName = normalizeBucketBindingName(bucketBindingName);
  if (!bindingName) return getDefaultEndpointBucket(env);
  const bucket = getEndpointBucketBinding(env, bindingName);
  if (!bucket) {
    throw new ApiError(400, `R2 binding '${bindingName}' is not configured on this Worker`);
  }
  return bucket;
}
__name(getSelectedEndpointBucket, "getSelectedEndpointBucket");
function getEndpointBucketBinding(env, bucketBindingName) {
  const bindingName = normalizeBucketBindingName(bucketBindingName);
  if (!bindingName) return null;
  const bucket = env[bindingName];
  return isR2Bucket(bucket) ? bucket : null;
}
__name(getEndpointBucketBinding, "getEndpointBucketBinding");
async function listEndpointBucketBindings(env) {
  const bindings = await Promise.all(
    Object.entries(env).map(async ([bindingName, value]) => {
      if (!isR2Bucket(value)) return null;
      try {
        await value.list({ limit: R2_PROBE_LIMIT });
        return {
          id: bindingName,
          // Friendly label is the real bucket_name from wrangler.jsonc; the
          // binding name stays the stable identifier used in URLs.
          name: BUCKET_NAMES[bindingName] ?? bindingName,
          bindingName
        };
      } catch {
        return null;
      }
    })
  );
  return bindings.filter((binding) => binding !== null).sort((left, right) => bucketBindingSortRank(left.bindingName) - bucketBindingSortRank(right.bindingName) || left.bindingName.localeCompare(right.bindingName));
}
__name(listEndpointBucketBindings, "listEndpointBucketBindings");
function isR2Bucket(value) {
  return Boolean(
    value && typeof value === "object" && "head" in value && "list" in value && "put" in value && "get" in value && "delete" in value && typeof value.head === "function" && typeof value.list === "function" && typeof value.put === "function" && typeof value.get === "function" && typeof value.delete === "function"
  );
}
__name(isR2Bucket, "isR2Bucket");
function normalizeBucketBindingName(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!BINDING_NAME_REGEX.test(trimmed)) {
    throw new ApiError(400, "bucketId must be a valid R2 binding name (letters, digits, underscores)");
  }
  return trimmed;
}
__name(normalizeBucketBindingName, "normalizeBucketBindingName");
function bucketBindingSortRank(bindingName) {
  if (bindingName === DEFAULT_R2_BINDING_NAMES[0]) return 0;
  if (bindingName === DEFAULT_R2_BINDING_NAMES[1]) return 1;
  return 2;
}
__name(bucketBindingSortRank, "bucketBindingSortRank");

// src/server/utils/http.ts
async function readJsonBody(c) {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "Expected a JSON request body");
  }
}
__name(readJsonBody, "readJsonBody");

// src/server/controllers/adminController.ts
var nowInSeconds = /* @__PURE__ */ __name(() => Math.floor(Date.now() / 1e3), "nowInSeconds");
var bucketIdParam = /* @__PURE__ */ __name((c) => c.req.param("bucketId") ?? "", "bucketIdParam");
var objectKeyParam = /* @__PURE__ */ __name((c) => sanitizeObjectKey(c.req.param("key") ?? ""), "objectKeyParam");
async function listBucketsHandler(c) {
  return c.json(await listBuckets(c.env));
}
__name(listBucketsHandler, "listBucketsHandler");
async function createBucketHandler(c) {
  const bucket = await createBucket(c.env, await readJsonBody(c));
  return c.json(bucket, 201);
}
__name(createBucketHandler, "createBucketHandler");
async function updateBucketHandler(c) {
  const input = await readJsonBody(c);
  return c.json(await updateBucket(c.env, bucketIdParam(c), input));
}
__name(updateBucketHandler, "updateBucketHandler");
async function deleteBucketHandler(c) {
  await deleteBucket(c.env, bucketIdParam(c));
  return c.json({ ok: true });
}
__name(deleteBucketHandler, "deleteBucketHandler");
async function listObjectsHandler(c) {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  const limit = clampNumber(
    Number(c.req.query("limit") ?? DEFAULT_OBJECT_LIST_LIMIT),
    MIN_OBJECT_LIST_LIMIT,
    MAX_OBJECT_LIST_LIMIT
  );
  const listed = await r2.list({
    prefix: c.req.query("prefix") ?? void 0,
    cursor: c.req.query("cursor") ?? void 0,
    limit,
    include: ["httpMetadata"]
  });
  return c.json({
    objects: listed.objects.map((object) => {
      const contentType = object.httpMetadata?.contentType ?? null;
      return {
        key: object.key,
        size: object.size,
        uploaded: object.uploaded?.toISOString() ?? null,
        etag: object.etag,
        publicUrl: bucket.publicBaseUrl ? joinUrl(bucket.publicBaseUrl, object.key) : null,
        contentType,
        isFolder: object.key.endsWith("/") || isDirectoryContentType(contentType)
      };
    }),
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : null
  });
}
__name(listObjectsHandler, "listObjectsHandler");
async function uploadObjectHandler(c) {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  const form = await c.req.raw.formData();
  const file = form.get("file");
  if (!isFile(file)) {
    throw new ApiError(400, "Expected a multipart file field named 'file'");
  }
  const requestedKey = trimToNull(form.get("key"));
  const key = sanitizeObjectKey(requestedKey ?? file.name);
  await r2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || void 0 },
    customMetadata: { originalName: file.name }
  });
  return c.json(
    {
      key,
      publicUrl: bucket.publicBaseUrl ? joinUrl(bucket.publicBaseUrl, key) : null
    },
    201
  );
}
__name(uploadObjectHandler, "uploadObjectHandler");
async function deleteObjectHandler(c) {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  await r2.delete(objectKeyParam(c));
  return c.json({ ok: true });
}
__name(deleteObjectHandler, "deleteObjectHandler");
async function createPrivateLinkHandler(c) {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  getBoundBucket(c.env, bucket);
  const key = objectKeyParam(c);
  const ttlSeconds = clampNumber(
    Number(c.req.query("expires") ?? DEFAULT_PRIVATE_LINK_TTL_SECONDS),
    MIN_PRIVATE_LINK_TTL_SECONDS,
    MAX_PRIVATE_LINK_TTL_SECONDS
  );
  const expires = nowInSeconds() + ttlSeconds;
  const privateUrl = await createPrivateObjectLink(c.env, bucket.id, key, expires, new URL(c.req.url).origin);
  return c.json({
    url: privateUrl,
    expiresAt: new Date(expires * 1e3).toISOString()
  });
}
__name(createPrivateLinkHandler, "createPrivateLinkHandler");
async function getSignedObjectHandler(c) {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  const key = objectKeyParam(c);
  const expires = Number(c.req.query("expires"));
  const signature = c.req.query("signature") ?? "";
  if (!Number.isInteger(expires) || expires < nowInSeconds()) {
    throw new ApiError(401, "Private link has expired");
  }
  const expected = await signPrivateLink(c.env, bucket.id, key, expires);
  if (!constantTimeEqual(signature, expected)) {
    throw new ApiError(401, "Invalid private link signature");
  }
  const object = await r2.get(key);
  if (!object) {
    throw new ApiError(404, "Object not found");
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", SIGNED_OBJECT_CACHE_CONTROL);
  return new Response(object.body, { headers });
}
__name(getSignedObjectHandler, "getSignedObjectHandler");

// src/server/middleware/auth.ts
function requireApiKey(request, env, missingSecretMessage) {
  if (!env.AUTH_KEY_SECRET) {
    throw new ApiError(500, missingSecretMessage);
  }
  const provided = request.headers.get(API_KEY_HEADER) ?? "";
  if (!constantTimeEqual(provided, env.AUTH_KEY_SECRET)) {
    throw new ApiError(401, "Unauthorized");
  }
}
__name(requireApiKey, "requireApiKey");
var adminAuth = /* @__PURE__ */ __name(async (c, next) => {
  requireApiKey(c.req.raw, c.env, "AUTH_KEY_SECRET must be configured before using the admin API");
  await next();
}, "adminAuth");
var endpointAuth = /* @__PURE__ */ __name(async (c, next) => {
  requireApiKey(c.req.raw, c.env, "AUTH_KEY_SECRET must be configured on this endpoint Worker");
  await next();
}, "endpointAuth");

// src/server/routes/admin.ts
var adminRoutes = new Hono2({ strict: false });
adminRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  const response = c.json({ error: message }, status);
  applyCorsHeaders(response.headers, c.req.header("Origin"));
  return response;
});
adminRoutes.use("*", corsMiddleware);
adminRoutes.get("/buckets/:bucketId/signed/:key{.+}", getSignedObjectHandler);
adminRoutes.use("*", adminAuth);
adminRoutes.get("/buckets", listBucketsHandler);
adminRoutes.post("/buckets", createBucketHandler);
adminRoutes.patch("/buckets/:bucketId", updateBucketHandler);
adminRoutes.delete("/buckets/:bucketId", deleteBucketHandler);
adminRoutes.get("/buckets/:bucketId/objects", listObjectsHandler);
adminRoutes.post("/buckets/:bucketId/upload", uploadObjectHandler);
adminRoutes.delete("/buckets/:bucketId/objects/:key{.+}", deleteObjectHandler);
adminRoutes.get("/buckets/:bucketId/private-link/:key{.+}", createPrivateLinkHandler);
adminRoutes.all("*", () => {
  throw new ApiError(404, "API route not found");
});

// src/server/controllers/endpointController.ts
function resolveBucket(c) {
  return getSelectedEndpointBucket(c.env, c.req.param("bindingName") ?? null);
}
__name(resolveBucket, "resolveBucket");
function objectKeyParam2(c) {
  const key = sanitizeObjectKey(c.req.param("key") ?? "");
  return new URL(c.req.url).pathname.endsWith("/") && !key.endsWith("/") ? `${key}/` : key;
}
__name(objectKeyParam2, "objectKeyParam");
async function listBindingsHandler(c) {
  return c.json(await listEndpointBucketBindings(c.env));
}
__name(listBindingsHandler, "listBindingsHandler");
function healthCheckHandler(c) {
  return c.text(HEALTH_CHECK_MESSAGE);
}
__name(healthCheckHandler, "healthCheckHandler");
async function listObjectsHandler2(c) {
  const bucket = resolveBucket(c);
  const listed = await bucket.list({
    cursor: c.req.query("cursor") ?? void 0,
    include: ["httpMetadata"]
  });
  return c.json({
    objects: listed.objects.map((object) => {
      const contentType = object.httpMetadata?.contentType ?? null;
      return {
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        etag: object.etag,
        httpEtag: object.httpEtag,
        contentType,
        isFolder: object.key.endsWith("/") || isDirectoryContentType(contentType)
      };
    }),
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : void 0
  });
}
__name(listObjectsHandler2, "listObjectsHandler");
async function headObjectHandler(c) {
  const bucket = resolveBucket(c);
  const object = await bucket.head(objectKeyParam2(c));
  if (!object) throw new ApiError(404, "Object not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(null, { status: 200, headers });
}
__name(headObjectHandler, "headObjectHandler");
async function headPublicAliasHandler(c) {
  const { bucket, key } = resolvePublicAlias(c);
  const object = await bucket.head(key);
  if (!object) throw new ApiError(404, "Object not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(null, { status: 200, headers });
}
__name(headPublicAliasHandler, "headPublicAliasHandler");
async function getObjectHandler(c) {
  const bucket = resolveBucket(c);
  const key = objectKeyParam2(c);
  const object = await bucket.get(key);
  if (!object) throw new ApiError(404, "Object not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", guessContentType(key));
  }
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}
__name(getObjectHandler, "getObjectHandler");
async function getPublicAliasHandler(c) {
  const { bucket, key } = resolvePublicAlias(c);
  const object = await bucket.get(key);
  if (!object) throw new ApiError(404, "Object not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", guessContentType(key));
  }
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}
__name(getPublicAliasHandler, "getPublicAliasHandler");
async function putObjectHandler(c) {
  const bucket = resolveBucket(c);
  let key = objectKeyParam2(c);
  const contentType = c.req.header("content-type") ?? guessContentType(key);
  if (contentType.split(";")[0].trim().toLowerCase() === FOLDER_CONTENT_TYPE && !key.endsWith("/")) {
    key = `${key}/`;
  }
  await bucket.put(key, c.req.raw.body, {
    httpMetadata: {
      contentType
    }
  });
  return c.text("Done");
}
__name(putObjectHandler, "putObjectHandler");
async function deleteObjectHandler2(c) {
  const bucket = resolveBucket(c);
  await bucket.delete(objectKeyParam2(c));
  return c.body(null, 204);
}
__name(deleteObjectHandler2, "deleteObjectHandler");
function resolvePublicAlias(c) {
  const bindingName = c.req.param("bindingName") ?? null;
  const routeKey = c.req.param("key") ?? "";
  const explicitBucket = bindingName ? getEndpointBucketBinding(c.env, bindingName) : null;
  if (explicitBucket) {
    return {
      bucket: explicitBucket,
      key: sanitizeObjectKey(routeKey)
    };
  }
  return {
    bucket: getSelectedEndpointBucket(c.env, null),
    key: sanitizeObjectKey(bindingName ? `${bindingName}/${routeKey}` : routeKey)
  };
}
__name(resolvePublicAlias, "resolvePublicAlias");

// src/server/routes/endpoint.ts
function defineBucketRoutes(app2) {
  app2.get("/", healthCheckHandler);
  app2.patch("/", endpointAuth, listObjectsHandler2);
  app2.get("/:key{.+}", getObjectHandler);
  app2.on("HEAD", "/:key{.+}", endpointAuth, headObjectHandler);
  app2.put("/:key{.+}", endpointAuth, putObjectHandler);
  app2.delete("/:key{.+}", endpointAuth, deleteObjectHandler2);
}
__name(defineBucketRoutes, "defineBucketRoutes");
var endpointRoutes = new Hono2({ strict: false });
endpointRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  const response = c.text(message, status);
  applyCorsHeaders(response.headers, c.req.header("Origin"));
  return response;
});
endpointRoutes.use("*", corsMiddleware);
endpointRoutes.get("/bindings", endpointAuth, listBindingsHandler);
var bucketScopedRoutes = new Hono2({ strict: false });
defineBucketRoutes(bucketScopedRoutes);
endpointRoutes.route(BUCKET_SCOPE_BASE, bucketScopedRoutes);
defineBucketRoutes(endpointRoutes);
endpointRoutes.all("*", () => {
  throw new ApiError(404, "Endpoint route not found");
});

// src/server/routes/publicAlias.ts
var publicAliasRoutes = new Hono2({ strict: false });
publicAliasRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  const response = c.text(message, status);
  applyCorsHeaders(response.headers, c.req.header("Origin"));
  return response;
});
publicAliasRoutes.use("*", corsMiddleware);
publicAliasRoutes.get("/:bindingName/:key{.+}", getPublicAliasHandler);
publicAliasRoutes.on("HEAD", "/:bindingName/:key{.+}", headPublicAliasHandler);
publicAliasRoutes.get("/:key{.+}", getPublicAliasHandler);
publicAliasRoutes.on("HEAD", "/:key{.+}", headPublicAliasHandler);

// src/server/app.ts
var app = new Hono2({ strict: false });
app.use("*", corsMiddleware);
app.onError((error, c) => {
  console.error(error);
  const response = c.text(error instanceof Error ? error.message : "Internal Server Error", 500);
  applyCorsHeaders(response.headers, c.req.header("Origin"));
  return response;
});
app.get("/", (c) => c.text(HEALTH_CHECK_MESSAGE));
app.route(R2_API_PREFIX, endpointRoutes);
app.route(API_PREFIX, adminRoutes);
app.route(PUBLIC_ALIAS_PREFIX, publicAliasRoutes);

// src/server/index.ts
var index_default = {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};
export {
  index_default as default
};
