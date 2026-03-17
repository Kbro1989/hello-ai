var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/constants.ts
var API = {
  GET_TYPEDEF: "/api/typedef",
  GET_MODELS: "/api/models",
  GET_MODEL_BY_ID: /* @__PURE__ */ __name((id) => `/api/model/${id}`, "GET_MODEL_BY_ID"),
  AI_SUGGEST_MATERIALS: "/ai/suggest-materials",
  AI_SUGGEST_ANIMATION: "/ai/suggest-animation"
};
var KV_KEYS = {
  TYPEDEF: "typedef",
  MODELS: "models",
  MODEL_OB3: /* @__PURE__ */ __name((id) => `model_${id}.ob3`, "MODEL_OB3")
};

// src/rsmv/constants.ts
var lastLegacyBuildnr = 377;

// src/rsmv/opcode_reader.ts
function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return new Uint8Array(bytes);
}
__name(hexToBytes, "hexToBytes");
function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
    hex.push((bytes[i] >>> 4).toString(16));
    hex.push((bytes[i] & 15).toString(16));
  }
  return hex.join("");
}
__name(bytesToHex, "bytesToHex");
var parserFunctions = {};
var hardcodes = {};
var parserPrimitives = {};
var BufferTypes = {
  buffer: { constr: Uint8Array },
  hex: { constr: Uint8Array },
  //used to debug into json file
  byte: { constr: Int8Array },
  ubyte: { constr: Uint8Array },
  short: { constr: Int16Array },
  ushort: { constr: Uint16Array },
  int: { constr: Int32Array },
  uint: { constr: Uint32Array },
  float: { constr: Float32Array }
};
var debugdata = null;
async function resolveAlias(typename, parent, typedef) {
  if (!Object.hasOwn(typedef, typename)) {
    throw new Error(`Type '${typename}' not found in typedef.json`);
  }
  let newtype = typedef[typename];
  if (typeof newtype != "string") {
    return await buildParser(parent, newtype, typedef);
  } else if (Object.hasOwn(parserPrimitives, newtype)) {
    return parserPrimitives[newtype];
  } else {
    return resolveAlias(newtype, parent, typedef);
  }
}
__name(resolveAlias, "resolveAlias");
async function buildParser(parent, chunkdef, typedef) {
  parent ??= /* @__PURE__ */ __name(() => {
    throw new Error("reference failed to resolve");
  }, "parent");
  await new Promise((resolve) => queueMicrotask(resolve));
  switch (typeof chunkdef) {
    case "boolean":
    case "number":
      return literalValueParser(chunkdef);
    case "string": {
      if (Object.hasOwn(parserPrimitives, chunkdef)) {
        return parserPrimitives[chunkdef];
      } else {
        return await resolveAlias(chunkdef, parent, typedef);
      }
    }
    case "object":
      if (chunkdef == null) {
        return literalValueParser(null);
      } else if (!Array.isArray(chunkdef)) {
        return await opcodesParser(chunkdef, parent, typedef);
      } else {
        if (chunkdef.length < 1) throw new Error(`'read' variables must either be a valid type-defining string, an array of type-defining strings / objects, or a valid type-defining object: ${JSON.stringify(chunkdef)}`);
        let args = chunkdef.slice(1);
        if (parserFunctions[chunkdef[0]]) {
          return await parserFunctions[chunkdef[0]](args, parent, typedef);
        }
      }
    default:
      throw new Error(`'read' variables must either be a valid type-defining string, an array of type-defining strings / objects, or a valid type-defining object: ${JSON.stringify(chunkdef)}`);
  }
}
__name(buildParser, "buildParser");
async function opcodesParser(chunkdef, parent, typedef) {
  let r = {
    async read(state) {
      let r2 = {};
      let hidden = { $opcode: 0 };
      state.stack.push(r2);
      state.hiddenstack.push(hidden);
      if (debugdata && !debugdata.rootstate) {
        debugdata.rootstate = r2;
      }
      while (true) {
        await new Promise((resolve) => queueMicrotask(resolve));
        if (state.scan == state.endoffset) {
          if (!hasexplicitnull) {
            console.log("ended reading opcode struct at end of file without 0x00 opcode");
          }
          break;
        }
        let opt = opcodetype.read(state);
        hidden.$opcode = opt;
        if (!hasexplicitnull && opt == 0) {
          break;
        }
        let parser = map.get(opt);
        if (debugdata) {
          debugdata.opcodes.push({ op: parser ? parser.key : `_0x${opt.toString(16)}_`, index: state.scan - 1, stacksize: state.stack.length });
        }
        if (!parser) {
          throw new Error("unknown chunk 0x" + opt.toString(16).toUpperCase());
        }
        r2[parser.key] = parser.parser.read(state);
      }
      state.stack.pop();
      state.hiddenstack.pop();
      return r2;
    },
    write(state, value) {
      if (typeof value != "object" || !value) {
        throw new Error("oject expected");
      }
      state.stack.push(value);
      state.hiddenstack.push({});
      for (let key in value) {
        if (key.startsWith("$")) {
          continue;
        }
        let opt = opts[key];
        if (!opt) {
          throw new Error("unknown property " + key);
        }
        opcodetype.write(state, opt.op);
        opt.parser.write(state, value[key]);
      }
      if (!hasexplicitnull) {
        opcodetype.write(state, 0);
      }
      state.stack.pop();
      state.hiddenstack.pop();
    },
    getTypescriptType(indent) {
      let r2 = "{\n";
      let newindent = indent + "	";
      for (let val of map.values()) {
        r2 += newindent + val.key + "?: " + val.parser.getTypescriptType(newindent) + " | null\n";
      }
      r2 += indent + "}";
      return r2;
    },
    getJsonSchema() {
      return {
        type: "object",
        properties: Object.fromEntries(
          [...map.values()].filter((prop) => !prop.key.startsWith("$")).map((prop) => {
            return [prop.key, { oneOf: [prop.parser.getJsonSchema(), { type: "null" }] }];
          })
        )
      };
    }
  };
  let resolveReference = /* @__PURE__ */ __name(function(targetprop, name, childresolve) {
    let result = {
      stackdepth: childresolve.stackdepth + 1,
      resolve(v, oldvalue) {
        if (typeof v != "object" || !v) {
          throw new Error("object expected");
        }
        let res = v[targetprop];
        return childresolve.resolve(res, oldvalue);
      }
    };
    if (name == "$opcode" || Object.prototype.hasOwnProperty.call(opts, name)) {
      refs[name] ??= [];
      refs[name].push(result);
      return result;
    } else {
      return buildReference(name, parent, result);
    }
  }, "resolveReference");
  let refs = {};
  let opcodetype = await buildParser(null, chunkdef["$opcode"] ?? "unsigned byte", typedef);
  let opts = {};
  for (let key in chunkdef) {
    await new Promise((resolve) => queueMicrotask(resolve));
    if (key.startsWith("$")) {
      continue;
    }
    let op = chunkdef[key];
    if (typeof op != "object" || !op) {
      throw new Error("op name expected");
    }
    let opname = op["name"];
    if (typeof opname != "string") {
      throw new Error("op name expected");
    }
    if (opts[opname]) {
      throw new Error("duplicate opcode key " + opname);
    }
    opts[opname] = {
      op: parseInt(key),
      parser: await buildParser(resolveReference.bind(null, key), op["read"], typedef)
    };
  }
  let map = /* @__PURE__ */ new Map();
  for (let key in opts) {
    let opt = opts[key];
    map.set(opt.op, { key, parser: opt.parser });
  }
  let hasexplicitnull = !!map.get(0);
  return r;
}
__name(opcodesParser, "opcodesParser");
async function tuppleParser(args, parent, typedef) {
  let r = {
    read(state) {
      let r2 = [];
      for (let prop of props) {
        let v = prop.read(state);
        r2.push(v);
      }
      return r2;
    },
    write(state, value) {
      if (!Array.isArray(value)) {
        throw new Error("array expected");
      }
      for (let [i, prop] of props.entries()) {
        prop.write(state, value[i]);
      }
    },
    getTypescriptType(indent) {
      let r2 = "[\n";
      let newindent = indent + "	";
      for (let prop of props) {
        r2 += newindent + prop.getTypescriptType(newindent) + ",\n";
      }
      r2 += indent + "]";
      return r2;
    },
    getJsonSchema() {
      return {
        type: "array",
        items: Object.entries(props).map(([k, v]) => v.getJsonSchema()),
        minItems: Object.keys(props).length,
        maxItems: Object.keys(props).length
      };
    }
  };
  const resolveReference = /* @__PURE__ */ __name(function(index, name, child) {
    return buildReference(name, parent, {
      stackdepth: child.stackdepth,
      resolve(v, old) {
        if (!Array.isArray(v)) {
          throw new Error("Array expected");
        }
        return child.resolve(v[index], old);
      }
    });
  }, "resolveReference");
  let props = await Promise.all(args.map(async (d, i) => {
    await new Promise((resolve) => queueMicrotask(resolve));
    return await buildParser(resolveReference.bind(null, i), d, typedef);
  }));
  return r;
}
__name(tuppleParser, "tuppleParser");
function buildReference(name, container, startingpoint) {
  if (!container) {
    throw new Error("reference " + name + " could not be resolved");
  }
  return container(name, startingpoint);
}
__name(buildReference, "buildReference");
function refgetter(refparent, propname, resolve) {
  let final = buildReference(propname, refparent, { stackdepth: 0, resolve });
  let depth = final.stackdepth;
  let hidden = propname.startsWith("$");
  return {
    read(state) {
      let stack = hidden ? state.hiddenstack : state.stack;
      return stack[stack.length - depth][propname];
    },
    write(state, newvalue) {
      if (state.isWrite && !hidden) {
        throw new Error(`can update ref values in write mode when they are hidden (prefixed with $) in ${propname}`);
      }
      let stack = hidden ? state.hiddenstack : state.stack;
      stack[stack.length - depth][propname] = newvalue;
    }
  };
}
__name(refgetter, "refgetter");
async function structParser(args, parent, typedef) {
  let refs = {};
  let r = {
    async read(state) {
      let r2 = {};
      let hidden = {};
      state.stack.push(r2);
      state.hiddenstack.push(hidden);
      if (debugdata && !debugdata.rootstate) {
        debugdata.rootstate = r2;
      }
      for (let key of keys) {
        await new Promise((resolve) => queueMicrotask(resolve));
        if (debugdata) {
          debugdata.opcodes.push({ op: key, index: state.scan, stacksize: state.stack.length });
        }
        let v = props[key].read(state);
        if (v !== void 0) {
          if (key[0] == "$") {
            hidden[key] = v;
          } else {
            r2[key] = v;
          }
        }
      }
      state.stack.pop();
      state.hiddenstack.pop();
      return r2;
    },
    write(state, value) {
      if (typeof value != "object" || !value) {
        throw new Error("object expected");
      }
      let hiddenvalue = {};
      state.stack.push(value);
      state.hiddenstack.push(hiddenvalue);
      for (let key of keys) {
        let propvalue = value[key];
        let prop = props[key];
        if (key.startsWith("$")) {
          if (prop.readConst != void 0) {
            propvalue = prop.readConst(state);
          } else {
            let refarray = refs[key];
            if (!refarray) {
              throw new Error("cannot write hidden values if they are not constant or not referenced");
            }
            propvalue ??= 0;
            for (let ref of refarray) {
              propvalue = ref.resolve(value, propvalue);
            }
          }
          hiddenvalue[key] = propvalue;
        }
        prop.write(state, propvalue);
      }
      state.stack.pop();
      state.hiddenstack.pop();
    },
    getTypescriptType(indent) {
      let r2 = "{\n";
      let newindent = indent + "	";
      for (let key of keys) {
        if (key[0] == "$") {
          continue;
        }
        r2 += newindent + key + ": " + props[key].getTypescriptType(newindent) + ",\n";
      }
      r2 += indent + "}";
      return r2;
    },
    getJsonSchema() {
      return {
        type: "object",
        properties: Object.fromEntries(
          [...Object.entries(props)].filter(([key]) => !key.startsWith("$")).map(([key, prop]) => [key, prop.getJsonSchema()])
        ),
        required: keys.filter((k) => !k.startsWith("$"))
      };
    }
  };
  let resolveReference = /* @__PURE__ */ __name(function(targetprop, name, childresolve) {
    let result = {
      stackdepth: childresolve.stackdepth + 1,
      resolve(v, oldvalue) {
        if (typeof v != "object" || !v) {
          throw new Error("object expected");
        }
        let res = v[targetprop];
        return childresolve.resolve(res, oldvalue);
      }
    };
    if (Object.prototype.hasOwnProperty.call(props, name)) {
      refs[name] ??= [];
      refs[name].push(result);
      return result;
    } else {
      return buildReference(name, parent, result);
    }
  }, "resolveReference");
  let props = {};
  for (let propdef of args) {
    await new Promise((resolve) => queueMicrotask(resolve));
    if (!Array.isArray(propdef) || propdef.length != 2) {
      throw new Error("each struct args should be a [name,type] pair");
    }
    if (typeof propdef[0] != "string") {
      throw new Error("prop name should be string");
    }
    if (props[propdef[0]]) {
      throw new Error("duplicate struct prop " + propdef[0]);
    }
    props[propdef[0]] = await buildParser(resolveReference.bind(null, propdef[0]), propdef[1], typedef);
  }
  let keys = Object.keys(props);
  return r;
}
__name(structParser, "structParser");
async function optParser(args, parent, typedef) {
  let r = {
    read(state) {
      let matchindex = condchecker.match(state);
      if (matchindex == -1) {
        return null;
      }
      return type.read(state);
    },
    write(state, value) {
      if (value != null) {
        return type.write(state, value);
      }
    },
    getTypescriptType(indent) {
      return type.getTypescriptType(indent) + " | null";
    },
    getJsonSchema() {
      return {
        oneOf: [
          type.getJsonSchema(),
          { type: "null" }
        ]
      };
    }
  };
  let resolveReference = /* @__PURE__ */ __name(function(name, child) {
    return buildReference(name, parent, {
      stackdepth: child.stackdepth,
      resolve(v, old) {
        return v != null ? child.resolve(v, old) : old;
      }
    });
  }, "resolveReference");
  if (args.length < 2) throw new Error(`2 arguments exptected for proprety with type opt`);
  let arg1 = args[0];
  let condstr = "";
  if (typeof arg1 == "string") {
    condstr = arg1;
  } else {
    let condvar;
    let condvalue;
    let cmpmode = "eq";
    if (Array.isArray(arg1)) {
      if (typeof arg1[1] != "number") {
        throw new Error("only literal ints as condition value are supported");
      }
      condvar = arg1[0];
      cmpmode = arg1[2] ?? "eq";
      condvalue = arg1[1];
    } else {
      if (typeof arg1 != "number") {
        throw new Error("");
      }
      condvar = "$opcode";
      condvalue = arg1;
    }
    let condmap = {
      bitand: "&=",
      bitflag: "&",
      bitflagnot: "!&",
      bitor: "&",
      eq: "==",
      eqnot: "!=",
      gteq: ">=",
      lteq: "<="
    };
    let mapped = condmap[cmpmode];
    if (cmpmode == "bitflag" || cmpmode == "bitflagnot") {
      condvalue = 1 << condvalue;
    }
    condstr = `${condvar}${mapped}${condvalue}`;
  }
  let condchecker = conditionParser(resolveReference, [condstr], (v) => v == null ? -1 : 0);
  let type = await buildParser(resolveReference, args[1], typedef);
  return r;
}
__name(optParser, "optParser");
function chunkedArrayParser(args, parent, typedef) {
  let r = {
    async read(state) {
      let len = lengthtype.read(state);
      let r2 = [];
      let hiddenprops = [];
      for (let chunkindex = 0; chunkindex < chunktypes.length; chunkindex++) {
        await new Promise((resolve) => queueMicrotask(resolve));
        let proptype = chunktypes[chunkindex];
        if (debugdata) {
          debugdata.opcodes.push({ op: Object.keys(proptype).join(), index: state.scan, stacksize: state.stack.length });
        }
        for (let i = 0; i < len; i++) {
          let hidden;
          let obj;
          if (chunkindex == 0) {
            obj = {};
            r2.push(obj);
            hidden = {};
            hiddenprops.push(hidden);
          } else {
            obj = r2[i];
            hidden = hiddenprops[i];
          }
          state.stack.push(obj);
          state.hiddenstack.push(hidden);
          for (let key in proptype) {
            let value = proptype[key].read(state);
            if (key.startsWith("$")) {
              hidden[key] = value;
            } else {
              obj[key] = value;
            }
          }
          state.stack.pop();
          state.hiddenstack.pop();
        }
      }
      return r2;
    },
    write(state, v) {
      if (!Array.isArray(v)) {
        throw new Error("array expected");
      }
      lengthtype.write(state, v.length);
      let hiddenprops = [];
      for (let chunkindex = 0; chunkindex < chunktypes.length; chunkindex++) {
        let proptype = chunktypes[chunkindex];
        for (let i = 0; i < v.length; i++) {
          let entry = v[i];
          let hiddenvalue = chunkindex == 0 ? hiddenprops[i] = {} : hiddenprops[i];
          state.stack.push(entry);
          state.hiddenstack.push(hiddenvalue);
          if (typeof entry != "object" || !entry) {
            throw new Error("object expected");
          }
          for (let key in proptype) {
            let prop = proptype[key];
            let propvalue = entry[key];
            if (key.startsWith("$")) {
              if (prop.readConst != void 0) {
                propvalue = prop.readConst(state);
              } else {
                let refarray = refs[key];
                if (!refarray) {
                  throw new Error("cannot write hidden values if they are not constant or not referenced");
                }
                propvalue ??= 0;
                for (let ref of refarray) {
                  propvalue = ref.resolve(entry, propvalue);
                }
              }
              hiddenvalue[key] = propvalue;
            }
            prop.write(state, propvalue);
          }
          state.stack.pop();
          state.hiddenstack.pop();
        }
      }
    },
    getTypescriptType(indent) {
      let r2 = "{\n";
      let newindent = indent + "	";
      for (let [key, prop] of Object.entries(fullobj)) {
        if (key[0] == "$") {
          continue;
        }
        r2 += newindent + key + ": " + prop.getTypescriptType(newindent) + ",\n";
      }
      r2 += indent + "}[]";
      return r2;
    },
    getJsonSchema() {
      return {
        type: "array",
        items: {
          type: "object",
          properties: Object.fromEntries(
            [...Object.entries(fullobj)].filter(([key]) => !key.startsWith("$")).map(([key, prop]) => [key, prop.getJsonSchema()])
          ),
          required: keys.filter((k) => !k.startsWith("$"))
        }
      };
    }
  };
  const resolveLength = /* @__PURE__ */ __name(function(prop, childresolve) {
    return buildReference(prop, parent, {
      stackdepth: childresolve.stackdepth,
      resolve(v, old) {
        if (!Array.isArray(v)) {
          throw new Error("array expected");
        }
        return childresolve.resolve(v.length, old);
      }
    });
  }, "resolveLength");
  const resolveReference = /* @__PURE__ */ __name(function(targetprop, name, childresolve) {
    let result = {
      stackdepth: childresolve.stackdepth + 1,
      resolve(v, oldvalue) {
        if (typeof v != "object" || !v) {
          throw new Error("object expected");
        }
        let res = v[targetprop];
        return childresolve.resolve(res, oldvalue);
      }
    };
    if (Object.prototype.hasOwnProperty.call(fullobj, name)) {
      refs[name] ??= [];
      refs[name].push(result);
      return result;
    } else {
      return buildReference(name, parent, result);
    }
  }, "resolveReference");
  let rawchunks = args.slice(1);
  let lengthtype = buildParser(resolveLength, args[0], typedef);
  let refs = {};
  let fullobj = {};
  let chunktypes = [];
  for (let chunk of rawchunks) {
    if (!Array.isArray(chunk)) {
      throw new Error("each argument for composed chunk should be an array");
    }
    let group = {};
    chunktypes.push(group);
    for (let propdef of chunk) {
      if (!Array.isArray(propdef) || propdef.length != 2 || typeof propdef[0] != "string") {
        throw new Error("each composedchunk should be a [name,type] pair");
      }
      let p = buildParser(resolveReference.bind(null, propdef[0]), propdef[1], typedef);
      group[propdef[0]] = p;
      fullobj[propdef[0]] = p;
    }
  }
  let keys = chunktypes.flatMap(Object.keys);
  return r;
}
__name(chunkedArrayParser, "chunkedArrayParser");
function bufferParserValue(value, type, scalartype) {
  if (typeof value == "string") {
    if (scalartype == "hex") {
      return hexToBytes(value);
    } else {
      let m = value.match(/^buffer ([\[\w]+){([\d,\-\.]*)}$/);
      if (!m) {
        throw new Error("invalid arraybuffer string");
      }
      return new type.constr(m[2].split(",").map((q) => +q));
    }
  }
  if (!(value instanceof type.constr)) {
    throw new Error("arraybuffer expected");
  }
  return value;
}
__name(bufferParserValue, "bufferParserValue");
async function bufferParser(args, parent, typedef) {
  let r = {
    read(state) {
      let len = lengthtype.read(state);
      let bytelen = len * vectorLength * type.constr.BYTES_PER_ELEMENT;
      let backing = new ArrayBuffer(bytelen);
      if (state.scan + bytelen > state.endoffset) {
        throw new Error("trying to read outside buffer bounds");
      }
      let bytes = new Uint8Array(backing);
      bytes.set(state.buffer.subarray(state.scan, state.scan + bytelen));
      state.scan += bytelen;
      let array = scalartype == "buffer" ? bytes : new type.constr(backing);
      if (scalartype == "hex") {
        array.toJSON = () => bytesToHex(bytes);
      } else if (state.args.keepBufferJson === true) {
        array.toJSON = () => `buffer ${scalartype}${vectorLength != 1 ? `[${vectorLength}]` : ""}[${len}]`;
      } else {
        array.toJSON = () => `buffer ${scalartype}${vectorLength != 1 ? `[${vectorLength}]` : ""}[{${[...array].join(",")}}]`;
      }
      return array;
    },
    write(state, rawvalue) {
      let value = bufferParserValue(rawvalue, type, scalartype);
      if (value.length % vectorLength != 0) {
        throw new Error("araybuffer is not integer multiple of vectorlength");
      }
      lengthtype.write(state, value.length / vectorLength);
      let bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      state.buffer.set(bytes, state.scan);
      state.scan += bytes.byteLength;
    },
    getTypescriptType(indent) {
      return type.constr.name;
    },
    getJsonSchema() {
      return { type: "string" };
    }
  };
  const resolveLengthReference = /* @__PURE__ */ __name(function(name, child) {
    return buildReference(name, parent, {
      stackdepth: child.stackdepth,
      resolve(rawvalue, old) {
        let value = bufferParserValue(rawvalue, type, scalartype);
        return child.resolve(value.length / vectorLength, old);
      }
    });
  }, "resolveLengthReference");
  if (args.length < 1) throw new Error(`'read' variables interpretted as an array must contain items: ${JSON.stringify(args)}`);
  let typestring = args[1] ?? "buffer";
  let lenarg = args[2] ?? 1;
  if (typeof typestring != "string" || !Object.hasOwn(BufferTypes, typestring)) {
    throw new Error("unknown buffer type " + args[1]);
  }
  if (typeof lenarg != "number") {
    throw new Error("vectorlength should be a number");
  }
  let vectorLength = lenarg;
  let scalartype = typestring;
  let lengthtype = await buildParser(resolveLengthReference, args[0], typedef);
  const type = BufferTypes[typestring];
  return r;
}
__name(bufferParser, "bufferParser");
async function arrayParser(args, parent, typedef) {
  let r = {
    async read(state) {
      let len = lengthtype.read(state);
      let r2 = [];
      for (let i = 0; i < len; i++) {
        await new Promise((resolve) => queueMicrotask(resolve));
        r2.push(subtype.read(state));
      }
      return r2;
    },
    write(state, value) {
      if (!Array.isArray(value)) {
        throw new Error("array expected");
      }
      lengthtype.write(state, value.length);
      for (let i = 0; i < value.length; i++) {
        subtype.write(state, value[i]);
      }
    },
    getTypescriptType(indent) {
      return `${subtype.getTypescriptType(indent)}[]`;
    },
    getJsonSchema() {
      return {
        type: "array",
        items: subtype.getJsonSchema()
      };
    }
  };
  const resolveLengthReference = /* @__PURE__ */ __name(function(name, child) {
    return buildReference(name, parent, {
      stackdepth: child.stackdepth,
      resolve(v, old) {
        if (!Array.isArray(v)) {
          throw new Error("array expected");
        }
        return child.resolve(v.length, old);
      }
    });
  }, "resolveLengthReference");
  const resolvePropReference = /* @__PURE__ */ __name(function(name, child) {
    return buildReference(name, parent, {
      stackdepth: child.stackdepth,
      resolve(v, old) {
        if (!Array.isArray(v)) {
          throw new Error("array expected");
        }
        return child.resolve(v[0], old);
      }
    });
  }, "resolvePropReference");
  if (args.length < 1) throw new Error(`'read' variables interpretted as an array must contain items: ${JSON.stringify(args)}`);
  let sizearg = args.length >= 2 ? args[0] : "variable unsigned short";
  let lengthtype = await buildParser(resolveLengthReference, sizearg, typedef);
  let subtype = await buildParser(resolvePropReference, args[args.length >= 2 ? 1 : 0], typedef);
  return r;
}
__name(arrayParser, "arrayParser");
async function arrayNullTerminatedParser(args, parent, typedef) {
  let r = {
    async read(state) {
      let r2 = [];
      let ctx = { "$opcode": 0 };
      state.hiddenstack.push(ctx);
      state.stack.push({});
      while (true) {
        await new Promise((resolve) => queueMicrotask(resolve));
        let oldscan = state.scan;
        let header = lengthtype.read(state);
        if (debugdata) {
          debugdata.opcodes.push({ op: "$opcode", index: oldscan, stacksize: state.stack.length });
        }
        ctx.$opcode = header;
        let endint = endvalue.read(state);
        if (header == endint) {
          break;
        }
        r2.push(subtype.read(state));
      }
      state.hiddenstack.pop();
      state.stack.pop();
      return r2;
    },
    write(state, value) {
      if (!Array.isArray(value)) {
        throw new Error("array expected");
      }
      state.stack.push(value);
      state.hiddenstack.push({});
      for (let prop of value) {
        lengthtype.write(state, 1);
        subtype.write(state, prop);
      }
      lengthtype.write(state, 0);
      state.stack.pop();
      state.hiddenstack.pop();
    },
    getTypescriptType(indent) {
      return `${subtype.getTypescriptType(indent)}[]`;
    },
    getJsonSchema() {
      return {
        type: "array",
        items: subtype.getJsonSchema()
      };
    }
  };
  const resolveReference = /* @__PURE__ */ __name(function(name, child) {
    if (name == "$opcode") {
      return {
        stackdepth: child.stackdepth + 1,
        resolve(v, old) {
          throw new Error("not implemented");
        }
      };
    }
    return buildReference(name, parent, {
      stackdepth: child.stackdepth + 1,
      resolve(v, old) {
        if (!Array.isArray(v)) {
          throw new Error("array expected");
        }
        return child.resolve(v[0], old);
      }
    });
  }, "resolveReference");
  if (args.length < 1) throw new Error(`'read' variables interpretted as an array must contain items: ${JSON.stringify(args)}`);
  let sizearg = args.length >= 2 ? args[0] : "variable unsigned short";
  let endintarg = args.length >= 3 ? args[1] : 0;
  let lengthtype = await buildParser(null, sizearg, typedef);
  let endvalue = await buildParser(null, endintarg, typedef);
  let subtype = await buildParser(resolveReference, args[args.length - 1], typedef);
  return r;
}
__name(arrayNullTerminatedParser, "arrayNullTerminatedParser");
function literalValueParser(constvalue) {
  if (typeof constvalue != "number" && typeof constvalue != "string" && typeof constvalue != "boolean" && constvalue != null) {
    throw new Error("only bool, number, string or null literals allowed");
  }
  let r = {
    read(state) {
      return constvalue;
    },
    readConst() {
      return constvalue;
    },
    write(state, value) {
      if (value != constvalue) throw new Error(`expected constant ${constvalue} was not present during write`);
    },
    getTypescriptType() {
      return JSON.stringify(constvalue);
    },
    getJsonSchema() {
      return { const: constvalue };
    }
  };
  return r;
}
__name(literalValueParser, "literalValueParser");
function referenceValueParser(args, parent, typedef) {
  let read = /* @__PURE__ */ __name((state) => {
    let value = ref.read(state);
    if (minbit != -1) {
      value = value >> minbit & ~(~0 << bitlength);
    }
    return value + offset;
  }, "read");
  let r = {
    read,
    readConst: read,
    write(state, value) {
    },
    getTypescriptType() {
      return "number";
    },
    getJsonSchema() {
      return {
        type: "integer",
        minimum: bitlength == -1 ? void 0 : 0,
        maximum: bitlength == -1 ? void 0 : 2 ** bitlength - 1
      };
    }
  };
  if (args.length < 1) throw new Error(`1 argument exptected for proprety with type ref`);
  if (typeof args[0] != "string") {
    throw new Error("ref propname expected");
  }
  let propname = args[0];
  let [minbit, bitlength] = [-1, -1];
  if (args[1]) {
    if (Array.isArray(args[1]) && args[1].length == 2 && typeof args[1][0] == "number" && typeof args[1][1] == "number") {
      minbit = args[1][0];
      bitlength = args[1][1];
    } else {
      throw new Error("second argument for ref should be [minbit,bitlen] pair");
    }
  }
  let offset = args[2] ?? 0;
  if (typeof offset != "number") {
    throw new Error("ref offset should be a number");
  }
  let ref = refgetter(parent, propname, (v, old) => {
    if (typeof v != "number") {
      throw new Error("number expected");
    }
    if (minbit != -1) {
      let mask = ~(-1 << bitlength) << minbit;
      return old & ~mask | v << minbit;
    } else {
      return v;
    }
  });
  return r;
}
__name(referenceValueParser, "referenceValueParser");
function bytesRemainingParser() {
  return {
    read(state) {
      return state.endoffset - state.scan;
    },
    write(state, value) {
    },
    getTypescriptType() {
      return "number";
    },
    getJsonSchema() {
      return { type: "integer" };
    }
  };
}
__name(bytesRemainingParser, "bytesRemainingParser");
function intAccumolatorParser(args, parent, typedef) {
  let r = {
    read(state) {
      let increment = value.read(state);
      let newvalue;
      let refvalue = ref.read(state) ?? 0;
      if (mode == "add" || mode == "add-1" || mode == "postadd") {
        newvalue = refvalue + (increment ?? 0) + (mode == "add-1" ? -1 : 0);
      } else if (mode == "hold") {
        newvalue = increment ?? refvalue;
      } else {
        throw new Error("unknown accumolator mode");
      }
      ref.write(state, newvalue);
      return mode == "postadd" ? refvalue : newvalue;
    },
    write(state, v) {
      if (typeof v != "number") {
        throw new Error("number expected");
      }
      let refvalue = ref.read(state) ?? 0;
      let increment;
      if (mode == "add" || mode == "add-1") {
        increment = v - refvalue + (mode == "add-1" ? 1 : 0);
      } else if (mode == "hold") {
        throw new Error("writing accum intaccum hold not implemented");
      } else if (mode == "postadd") {
        throw new Error("writing accum intaccum postadd not implemented");
      } else {
        throw new Error("unknown accumolator mode");
      }
      value.write(state, increment);
      ref.write(state, v);
    },
    getTypescriptType() {
      return "number";
    },
    getJsonSchema() {
      return { type: "integer" };
    }
  };
  if (args.length < 2) throw new Error(`2 arguments exptected for proprety with type accum`);
  let refname = args[0];
  let value = buildParser(parent, args[1], typedef);
  let mode = args[2] ?? "add";
  if (typeof refname != "string") {
    throw new Error("ref name should be a string");
  }
  let ref = refgetter(parent, refname, (v, old) => {
    return old;
  });
  return r;
}
__name(intAccumolatorParser, "intAccumolatorParser");
function stringParser(prebytes) {
  const encoding = "latin1";
  return {
    async read(state) {
      let terminator = getClientVersion(state.args) <= lastLegacyBuildnr ? 10 : 0;
      for (let i = 0; i < prebytes.length; i++, state.scan++) {
        await new Promise((resolve) => queueMicrotask(resolve));
        if (state.dataView.getUint8(state.scan) != prebytes[i]) {
          throw new Error("failed to match string header bytes");
        }
      }
      let end = state.scan;
      while (true) {
        await new Promise((resolve) => queueMicrotask(resolve));
        if (end == state.endoffset) {
          throw new Error("reading string without null termination");
        }
        if (state.dataView.getUint8(end) == terminator) {
          break;
        }
        end++;
      }
      let outputstr = new TextDecoder(encoding).decode(state.buffer.subarray(state.scan, end));
      state.scan = end + 1;
      return outputstr;
    },
    write(state, value) {
      if (typeof value != "string") throw new Error(`string expected`);
      let terminator = getClientVersion(state.args) <= lastLegacyBuildnr ? 10 : 0;
      let writebytes = [
        ...prebytes,
        ...new TextEncoder().encode(value),
        terminator
      ];
      state.buffer.set(writebytes, state.scan);
      state.scan += writebytes.length;
      ;
    },
    getTypescriptType() {
      return "string";
    },
    getJsonSchema() {
      return { type: "string" };
    }
  };
}
__name(stringParser, "stringParser");
async function conditionParser(parent, optionstrings, writegetindex) {
  let varmap = [];
  let options = [];
  for (let str of optionstrings) {
    await new Promise((resolve) => queueMicrotask(resolve));
    str = str.replace(/\s/g, "");
    let parts = str.split(/&&/g);
    let conds = [];
    for (let opt of parts) {
      let op;
      let varname;
      let value = 0;
      if (opt == "default" || opt == "other") {
        continue;
      } else {
        let m = opt.match(/^((?<var>[\$a-zA-Z]\w*)?(?<op><|<=|>|>=|&|==|=|!&|&=|!=)?)?(?<version>0x[\da-fA=F]+|-?\d+)$/);
        if (!m) {
          throw new Error("invalid match value, expected <op><version>. For example '>10'");
        }
        value = parseInt(m.groups.version);
        op = m.groups.op ?? "=";
        if (op == "==") {
          op = "=";
        }
        varname = m.groups.var ?? "$opcode";
      }
      let varindex = varmap.findIndex((q) => q.name == varname);
      if (varindex == -1) {
        varindex = varmap.length;
        varmap.push({
          name: varname,
          parser: refgetter(parent, varname, (v, oldvalue) => {
            if (!writegetindex) {
              throw new Error("write not implemented");
            }
            let index = writegetindex(v);
            for (let optionindex = 0; optionindex < options.length; optionindex++) {
              let option = options[optionindex];
              for (let con of option) {
                if (con.varindex != varindex) {
                  continue;
                }
                let state = optionindex == index;
                let compValue = con.value;
                switch (con.op) {
                  case "=":
                    oldvalue = state ? compValue : oldvalue;
                    break;
                  case "!=":
                    oldvalue = state ? oldvalue : compValue;
                    break;
                  case "&":
                    oldvalue = state ? oldvalue | compValue : oldvalue & ~compValue;
                    break;
                  case "&=":
                    oldvalue = state ? oldvalue | compValue : oldvalue & ~compValue;
                    break;
                  case "!&":
                    oldvalue = state ? oldvalue & ~compValue : oldvalue | compValue;
                    break;
                  case ">=":
                    oldvalue = state ? Math.max(compValue, oldvalue) : oldvalue;
                    break;
                  case ">":
                    oldvalue = state ? Math.max(compValue + 1, oldvalue) : oldvalue;
                    break;
                  case "<=":
                    oldvalue = state ? Math.min(compValue, oldvalue) : oldvalue;
                    break;
                  case "<":
                    oldvalue = state ? Math.min(compValue - 1, oldvalue) : oldvalue;
                    break;
                  default:
                    throw new Error("unknown condition " + con.op);
                }
              }
            }
            return oldvalue;
          })
        });
      }
      conds.push({ op, value, varname, varindex });
    }
    options.push(conds);
  }
  let match = /* @__PURE__ */ __name(async (state) => {
    let vars = varmap.map((q) => q.parser.read(state));
    for (let optindex = 0; optindex < options.length; optindex++) {
      await new Promise((resolve) => queueMicrotask(resolve));
      let opt = options[optindex];
      let matched = true;
      for (let cond of opt) {
        let value = vars[cond.varindex];
        switch (cond.op) {
          case "=":
            matched = value == cond.value;
            break;
          case "!=":
            matched = value != cond.value;
            break;
          case "<":
            matched = value < cond.value;
            break;
          case "<=":
            matched = value <= cond.value;
            break;
          case ">":
            matched = value > cond.value;
            break;
          case ">=":
            matched = value >= cond.value;
            break;
          case "&":
            matched = (value & cond.value) != 0;
            break;
          case "!&":
            matched = (value & cond.value) == 0;
            break;
          case "&=":
            matched = (value & cond.value) == cond.value;
            break;
          default:
            throw new Error("unknown op" + cond.op);
        }
        if (!matched) {
          break;
        }
      }
      if (matched) {
        return optindex;
      }
    }
    return -1;
  }, "match");
  return { match };
}
__name(conditionParser, "conditionParser");
Object.assign(hardcodes, {
  playeritem: /* @__PURE__ */ __name(function() {
    return {
      read(state) {
        let byte0 = state.dataView.getUint8(state.scan++);
        if (byte0 == 0) {
          return 0;
        }
        let byte1 = state.dataView.getUint8(state.scan++);
        if (byte1 == 255 && byte0 == 255) {
          return -1;
        }
        return byte0 << 8 | byte1;
      },
      write(state, value) {
        if (typeof value != "number") {
          throw new Error("number expected");
        }
        if (value == 0) {
          state.dataView.setUint8(state.scan++, 0);
        } else {
          state.dataView.setUint16(state.scan, value == -1 ? 65535 : value & 65535);
          state.scan += 2;
        }
      },
      getTypescriptType() {
        return "number";
      },
      getJsonSchema() {
        return { type: "integer", minimum: -1, maximum: 65535 - 16384 - 1 };
      }
    };
  }, "playeritem"),
  itemvar: /* @__PURE__ */ __name(function(args) {
    let type = args[0];
    if (typeof type != "string" || !["ref", "matcount", "colorcount", "modelcount"].includes(type)) {
      throw new Error();
    }
    return {
      read(state) {
        let activeitem = typeof state.args.activeitem == "number" ? state.args.activeitem : -1;
        if (type == "ref") {
          activeitem++;
          state.args.activeitem = activeitem;
        }
        if (!Array.isArray(state.args.slots)) {
          throw new Error("");
        }
        let ref = state.args.slots[activeitem];
        if (type == "ref") {
          return ref;
        } else if (type == "matcount") {
          return ref?.replaceMaterials?.length ?? 0;
        } else if (type == "colorcount") {
          return ref?.replaceColors?.length ?? 0;
        } else if (type == "modelcount") {
          return ref?.models.length;
        } else {
          throw new Error();
        }
      },
      write() {
      },
      getTypescriptType() {
        return type == "ref" ? "any" : "number";
      },
      getJsonSchema() {
        return { type: type == "ref" ? "any" : "integer" };
      }
    };
  }, "itemvar"),
  buildnr: /* @__PURE__ */ __name(function(args, typedef) {
    return {
      readConst(state) {
        return getClientVersion(state.args);
      },
      read(state) {
        return getClientVersion(state.args);
      },
      write(state, v) {
      },
      getTypescriptType(indent) {
        return "number";
      },
      getJsonSchema() {
        return { type: "number" };
      }
    };
  }, "buildnr"),
  match: /* @__PURE__ */ __name(async function(args, parent, typedef) {
    let r = {
      read(state) {
        let opcodeprop = { $opcode: 0 };
        state.stack.push({});
        state.hiddenstack.push(opcodeprop);
        let value = opvalueparser ? opvalueparser.read(state) : 0;
        opcodeprop.$opcode = value;
        let opindex = conditionparser.match(state);
        if (opindex == -1) {
          throw new Error("no opcode matched");
        }
        let res = optionvalues[opindex].read(state);
        state.stack.pop();
        state.hiddenstack.pop();
        return res;
      },
      write(state, v) {
        let opcodeprop = { $opcode: 0 };
        state.stack.push({});
        state.hiddenstack.push(opcodeprop);
        if (opvalueparser) {
          if (!opvalueparser.readConst) {
            throw new Error("non-const or non-reference match value not implemented in write mode");
          }
          opcodeprop.$opcode = opvalueparser.readConst(state);
        }
        let opindex = conditionparser.match(state);
        if (opindex == -1) {
          throw new Error("no opcode matched");
        }
        optionvalues[opindex].write(state, v);
        state.stack.pop();
        state.hiddenstack.pop();
      },
      getTypescriptType(indent) {
        return "(" + optionvalues.map((opt) => opt.getTypescriptType(indent + "	")).join("|") + ")";
      },
      getJsonSchema() {
        return { anyOf: optionvalues.map((opt) => opt.getJsonSchema()) };
      }
    };
    const resolveReference = /* @__PURE__ */ __name(function(name, child) {
      let res = {
        stackdepth: child.stackdepth + 1,
        resolve(v, old) {
          throw new Error("write not supported");
        }
      };
      if (name == "$opcode") {
        return res;
      }
      return buildReference(name, parent, res);
    }, "resolveReference");
    if (args.length == 1) {
      args = [null, args[0]];
    }
    if (args.length != 2) {
      throw new Error("match chunks needs 2 arguments");
    }
    if (typeof args[1] != "object") {
      throw new Error("match chunk requires 2n+2 arguments");
    }
    let opvalueparser = args[0] ? await buildParser(resolveReference, args[0], typedef) : null;
    let conditionstrings = Object.keys(args[1]);
    let optionvalues = await Promise.all(Object.values(args[1]).map(async (q) => await buildParser(resolveReference, q, typedef)));
    let conditionparser = conditionParser(resolveReference, conditionstrings);
    return r;
  }, "match"),
  footer: /* @__PURE__ */ __name(async function(args, parent, typedef) {
    if (args.length != 2) {
      throw new Error("footer requires length and subtype arguments");
    }
    let lentype = await buildParser(parent, args[0], typedef);
    let subtype = await buildParser(parent, args[1], typedef);
    return {
      read(state) {
        let len = lentype.read(state);
        let oldscan = state.scan;
        let footstart = state.endoffset - len;
        state.scan = footstart;
        if (debugdata) {
          debugdata.opcodes.push({ op: "footer", index: oldscan, stacksize: state.stack.length + 1, jump: { to: footstart } });
        }
        let res = subtype.read(state);
        if (debugdata) {
          debugdata.opcodes.push({ op: "footer", index: state.scan, stacksize: state.stack.length + 1, jump: { to: oldscan } });
        }
        if (state.scan != state.endoffset) {
          console.log(`didn't read full footer, ${state.endoffset - state.scan} bytes left`);
        }
        state.scan = oldscan;
        state.endoffset = state.endoffset - len;
        return res;
      },
      write(state, v) {
        let oldscan = state.scan;
        subtype.write(state, v);
        let len = state.scan - oldscan;
        state.buffer.copyWithin(state.endoffset - len, oldscan, state.scan);
        state.scan = oldscan;
        state.endoffset -= len;
      },
      getTypescriptType(indent) {
        return subtype.getTypescriptType(indent);
      },
      getJsonSchema() {
        return subtype.getJsonSchema();
      }
    };
  }, "footer"),
  "tailed varushort": /* @__PURE__ */ __name(function(args, parent, typedef) {
    const overflowchunk = 32767;
    return {
      async read(state) {
        let sum = 0;
        while (true) {
          await new Promise((resolve) => queueMicrotask(resolve));
          let byte0 = state.dataView.getUint8(state.scan++);
          let v;
          if ((byte0 & 128) == 0) {
            v = byte0;
          } else {
            let byte1 = state.dataView.getUint8(state.scan++);
            v = (byte0 & 127) << 8 | byte1;
          }
          sum += v;
          if (v != overflowchunk) {
            return sum;
          }
        }
      },
      write(state, v) {
        if (typeof v != "number") {
          throw new Error("number expected");
        }
        while (v >= 0) {
          let chunk = Math.min(overflowchunk, v);
          if (chunk < 128) {
            state.dataView.setUint8(state.scan++, chunk);
          } else {
            state.dataView.setUint16(state.scan, chunk | 32768);
            state.scan += 2;
          }
          v -= chunk;
        }
      },
      getTypescriptType(indent) {
        return "number";
      },
      getJsonSchema() {
        return { type: "number" };
      }
    };
  }, "tailed varushort"),
  "legacy_maptile": /* @__PURE__ */ __name(function(args, parent, typedef) {
    return {
      async read(state) {
        let res = {
          flags: 0,
          shape: null,
          overlay: null,
          settings: null,
          underlay: null,
          height: null
        };
        while (true) {
          await new Promise((resolve) => queueMicrotask(resolve));
          let op = state.dataView.getUint8(state.scan++);
          if (op == 0) {
            break;
          }
          if (op == 1) {
            res.height = state.dataView.getUint8(state.scan++);
            break;
          }
          if (op >= 2 && op <= 49) {
            res.shape = op - 2;
            res.overlay = state.dataView.getUint8(state.scan);
            state.scan += 1;
          }
          if (op >= 50 && op <= 81) {
            res.settings = op - 49;
          }
          if (op >= 82) {
            res.underlay = op - 81;
          }
        }
        return res;
      },
      write(state) {
        throw new Error("not implemented");
      },
      getTypescriptType(indent) {
        let newindent = indent + "	";
        return `{
	${newindent}flags: number,
	${newindent}shape: number | null,
	${newindent}overlay: number | null,
	${newindent}settings: number | null,
	${newindent}underlay: number | null,
	${newindent}height: number | null,
	${indent}}`;
      },
      getJsonSchema() {
        return { type: "any" };
      }
    };
  }, "legacy_maptile"),
  scriptopt: /* @__PURE__ */ __name(function(args, parent, typedef) {
    return {
      read(state) {
        let cali = state.args.clientScriptDeob;
        if (!cali) {
          throw new Error("opcode callibration not set for clientscript with obfuscated opcodes");
        }
        if (debugdata) {
          debugdata.opcodes.push({ op: "opcode", index: state.scan, stacksize: state.stack.length + 1 });
        }
        let res = cali.readOpcode(state);
        return res;
      },
      write(state, v) {
        let cali = state.args.clientScriptDeob;
        ;
        if (!cali) {
          throw new Error("opcode callibration not set for clientscript with obfuscated opcodes");
        }
        cali.writeOpCode(state, v);
      },
      getJsonSchema() {
        return {
          type: "object",
          properties: {
            opcode: { type: "number" },
            imm: { type: "number" },
            imm_obj: { oneOf: [{ type: "number" }, { type: "string" }, { type: "null" }] }
          }
        };
      },
      getTypescriptType(indent) {
        let newindent = indent + "	";
        return `{
${newindent}opcode:number,
${newindent}imm:number,
${newindent}imm_obj:number|string|[number,number]|null,
${indent}}`;
      }
    };
  }, "scriptopt")
});
function getClientVersion(args) {
  if (typeof args.clientVersion != "number") {
    throw new Error("client version not set");
  }
  return args.clientVersion;
}
__name(getClientVersion, "getClientVersion");
var numberTypes = {
  ubyte: {
    read(s) {
      let r = s.dataView.getUint8(s.scan);
      s.scan += 1;
      return r;
    },
    write(s, v) {
      s.dataView.setUint8(s.scan, v);
      s.scan += 1;
    },
    min: 0,
    max: 255
  },
  byte: {
    read(s) {
      let r = s.dataView.getInt8(s.scan);
      s.scan += 1;
      return r;
    },
    write(s, v) {
      s.dataView.setInt8(s.scan, v);
      s.scan += 1;
    },
    min: -128,
    max: 127
  },
  ushort: {
    read(s) {
      let r = s.dataView.getUint16(s.scan);
      s.scan += 2;
      return r;
    },
    write(s, v) {
      s.dataView.setUint16(s.scan, v);
      s.scan += 2;
    },
    min: 0,
    max: 2 ** 16 - 1
  },
  short: {
    read(s) {
      let r = s.dataView.getInt16(s.scan);
      s.scan += 2;
      return r;
    },
    write(s, v) {
      s.dataView.setInt16(s.scan, v);
      s.scan += 2;
    },
    min: -(2 ** 15),
    max: 2 ** 15 - 1
  },
  uint: {
    read(s) {
      let r = s.dataView.getUint32(s.scan);
      s.scan += 4;
      return r;
    },
    write(s, v) {
      s.dataView.setUint32(s.scan, v);
      s.scan += 4;
    },
    min: 0,
    max: 2 ** 32 - 1
  },
  int: {
    read(s) {
      let r = s.dataView.getInt32(s.scan);
      s.scan += 4;
      return r;
    },
    write(s, v) {
      s.dataView.setInt32(s.scan, v);
      s.scan += 4;
    },
    min: -(2 ** 31),
    max: 2 ** 31 - 1
  },
  uint_le: {
    read(s) {
      let r = s.dataView.getUint32(s.scan, true);
      s.scan += 4;
      return r;
    },
    write(s, v) {
      s.dataView.setUint32(s.scan, v, true);
      s.scan += 4;
    },
    min: 0,
    max: 2 ** 32 - 1
  },
  ushort_le: {
    read(s) {
      let r = s.dataView.getUint16(s.scan, true);
      s.scan += 2;
      return r;
    },
    write(s, v) {
      s.dataView.setUint16(s.scan, v, true);
      s.scan += 2;
    },
    min: 0,
    max: 2 ** 16 - 1
  },
  utribyte: {
    read(s) {
      let r = s.dataView.getUint8(s.scan) << 16 | s.dataView.getUint8(s.scan + 1) << 8 | s.dataView.getUint8(s.scan + 2);
      s.scan += 3;
      return r;
    },
    write(s, v) {
      s.dataView.setUint8(s.scan, v >>> 16 & 255);
      s.dataView.setUint8(s.scan + 1, v >>> 8 & 255);
      s.dataView.setUint8(s.scan + 2, v & 255);
      s.scan += 3;
    },
    min: 0,
    max: 2 ** 24 - 1
  },
  float: {
    read(s) {
      let r = s.dataView.getFloat32(s.scan);
      s.scan += 4;
      return r;
    },
    write(s, v) {
      s.dataView.setFloat32(s.scan, v);
      s.scan += 4;
    },
    min: Number.MIN_VALUE,
    max: Number.MAX_VALUE
  },
  varushort: {
    read(s) {
      let firstByte = s.dataView.getUint8(s.scan++);
      if ((firstByte & 128) == 0) {
        return firstByte;
      }
      let secondByte = s.dataView.getUint8(s.scan++);
      return (firstByte & 127) << 8 | secondByte;
    },
    write(s, v) {
      if (v < 128) {
        s.dataView.setUint8(s.scan, v);
        s.scan += 1;
      } else {
        s.dataView.setUint16(s.scan, v | 32768);
        s.scan += 2;
      }
    },
    min: 0,
    max: 2 ** 15 - 1
  },
  varshort: {
    read(s) {
      let firstByte = s.dataView.getUint8(s.scan++);
      if ((firstByte & 128) == 0) {
        return firstByte << 32 - 7 >> 32 - 7;
      }
      let secondByte = s.dataView.getUint8(s.scan++);
      return ((firstByte & 127) << 8 | secondByte) << 32 - 15 >> 32 - 15;
    },
    write(s, v) {
      if (v < 64 && v >= -64) {
        s.dataView.setUint8(s.scan, v & 127);
        s.scan += 1;
      } else {
        s.dataView.setInt16(s.scan, v | 32768);
        s.scan += 2;
      }
    },
    min: -(2 ** 14),
    max: 2 ** 14 - 1
  },
  varuint: {
    read(s) {
      let firstWord = s.dataView.getUint16(s.scan);
      s.scan += 2;
      if ((firstWord & 32768) == 0) {
        return firstWord;
      } else {
        let secondWord = s.dataView.getUint16(s.scan);
        s.scan += 2;
        return (firstWord & 32767) << 16 | secondWord;
      }
    },
    write(s, v) {
      if (v < 32768) {
        s.dataView.setUint16(s.scan, v);
        s.scan += 2;
      } else {
        s.dataView.setUint32(s.scan, (v | 2147483648) >>> 0);
        s.scan += 4;
      }
    },
    min: 0,
    max: 2 ** 31 - 1
  },
  varnullint: {
    read(s) {
      let firstWord = s.dataView.getUint16(s.scan);
      s.scan += 2;
      if (firstWord == 32767) {
        return -1;
      } else if ((firstWord & 32768) == 0) {
        return firstWord;
      } else {
        let secondWord = s.dataView.getUint16(s.scan);
        s.scan += 2;
        return (firstWord & 32767) << 16 | secondWord;
      }
    },
    write(s, v) {
      if (v == -1) {
        s.dataView.setUint16(s.scan, 32767);
        s.scan += 2;
      } else if (v < 32768) {
        s.dataView.setUint16(s.scan, v);
        s.scan += 2;
      } else {
        s.dataView.setUint32(s.scan, (v | 2147483648) >>> 0);
        s.scan += 4;
      }
    },
    min: -1,
    max: 2 ** 31 - 1
  },
  varint: {
    read(s) {
      let firstWord = s.dataView.getUint16(s.scan);
      s.scan += 2;
      if ((firstWord & 32768) == 0) {
        return firstWord << 32 - 15 >> 32 - 15;
      }
      let secondWord = s.dataView.getUint16(s.scan);
      s.scan += 2;
      return ((firstWord & 32767) << 16 | secondWord) << 32 - 31 >> 32 - 31;
    },
    write(s, v) {
      if (v < 16384 && v >= -16384) {
        s.dataView.setUint16(s.scan, v & 32767);
        s.scan += 2;
      } else {
        s.dataView.setInt32(s.scan, v | 8388608);
        s.scan += 4;
      }
    },
    min: -(2 ** 30),
    max: 2 ** 30 - 1
  }
};
Object.assign(parserPrimitives, {
  ...Object.fromEntries(Object.entries(numberTypes).map(([k, e]) => [k, {
    read: e.read,
    write: /* @__PURE__ */ __name((s, v) => {
      if (typeof v != "number" || v > e.max || v < e.min) {
        throw new Error();
      }
      e.write(s, v);
    }, "write"),
    getJsonSchema() {
      return { type: "number", maximum: e.max, minimum: e.min };
    },
    getTypescriptType(indent) {
      return "number";
    }
  }])),
  bool: {
    read(s) {
      let r = s.dataView.getUint8(s.scan++);
      if (r != 0 && r != 1) {
        throw new Error("1 or 0 expected boolean value");
      }
      return r != 0;
    },
    write(s, v) {
      if (typeof v != "boolean") {
        throw new Error("boolean expected");
      }
      s.dataView.setUint8(s.scan++, +v);
    },
    getJsonSchema() {
      return { type: "boolean" };
    },
    getTypescriptType(indent) {
      return "boolean";
    }
  },
  string: stringParser([]),
  paddedstring: stringParser([0])
});
Object.assign(parserFunctions, {
  ref: referenceValueParser,
  accum: intAccumolatorParser,
  opt: optParser,
  chunkedarray: chunkedArrayParser,
  bytesleft: bytesRemainingParser,
  buffer: bufferParser,
  nullarray: arrayNullTerminatedParser,
  array: arrayParser,
  struct: structParser,
  tuple: tuppleParser,
  ...hardcodes,
  ...parserPrimitives
});

// src/rsmv/opdecoder.ts
var scratchbuf = new Uint8Array(2 * 1024 * 1024);
var scratchdataview = new DataView(scratchbuf.buffer);
var bytesleftoverwarncount = 0;
var FileParser = class _FileParser {
  constructor(parserPromise) {
    this.totaltime = 0;
    this.parserPromise = parserPromise;
  }
  static {
    __name(this, "FileParser");
  }
  static async init(opcodeobj, typedef) {
    const parser = await buildParser(null, opcodeobj, typedef);
    return new _FileParser(Promise.resolve(parser));
  }
  static fromJson(jsonObject) {
    let opcodeobj = jsonObject;
    return _FileParser.init(opcodeobj);
  }
  async getParser() {
    return this.parserPromise;
  }
  async readInternal(state) {
    let t = performance.now();
    const parser = await this.getParser();
    let res = parser.read(state);
    this.totaltime += performance.now() - t;
    if (state.scan != state.endoffset) {
      bytesleftoverwarncount++;
      if (bytesleftoverwarncount < 100) {
        console.log(`bytes left over after decoding file: ${state.endoffset - state.scan}`);
      }
      if (bytesleftoverwarncount == 100) {
        console.log("too many bytes left over warning, no more warnings will be logged");
      }
      if (state.buffer.byteLength < 1e5) {
        throw new Error(`bytes left over after decoding file: ${state.endoffset - state.scan}`);
      }
    }
    return res;
  }
  read(buffer, source, args) {
    let state = {
      isWrite: false,
      buffer,
      dataView: new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
      stack: [],
      hiddenstack: [],
      scan: 0,
      endoffset: buffer.byteLength,
      args: {
        ...source.getDecodeArgs(),
        ...args
      }
    };
    return this.readInternal(state);
  }
  async write(obj, args) {
    let state = {
      isWrite: true,
      stack: [],
      hiddenstack: [],
      buffer: scratchbuf,
      dataView: scratchdataview,
      scan: 0,
      endoffset: scratchbuf.byteLength,
      args: {
        clientVersion: 1e3,
        //TODO
        ...args
      }
    };
    const parser = await this.getParser();
    parser.write(state, obj);
    if (state.scan > state.endoffset) {
      throw new Error("tried to write file larger than scratchbuffer size");
    }
    scratchbuf.copyWithin(state.scan, state.endoffset, scratchbuf.byteLength);
    state.scan += scratchbuf.byteLength - state.endoffset;
    let r = scratchbuf.slice(0, state.scan);
    scratchbuf.fill(0, 0, state.scan);
    return r;
  }
};
globalThis.parserTimings = () => {
  let all = Object.entries(parse).map((q) => ({ name: q[0], t: q[1].totaltime }));
  all.sort((a, b) => b.t - a.t);
  all.slice(0, 10).filter((q) => q.t > 0.01).forEach((q) => console.log(`${q.name} ${q.t.toFixed(3)}s`));
};
var parsePromise = null;
function getParsers(env) {
  if (parsePromise === null) {
    parsePromise = (async () => {
      const typedefResponse = await fetch("/typedef.json");
      const typedefContent = await typedefResponse.json();
      const modelsResponse = await fetch("/models.json");
      const modelsContent = await modelsResponse.json();
      const modelsFileParser = await FileParser.init(modelsContent, typedefContent);
      return { models: modelsFileParser };
    })();
  }
  return parsePromise;
}
__name(getParsers, "getParsers");

// src/index.ts
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      const indexHtml = await env.ASSETS.get("index.html", "text");
      if (indexHtml) {
        return new Response(indexHtml, { headers: { "Content-Type": "text/html" } });
      } else {
        return new Response("Index HTML not found", { status: 404 });
      }
    }
    if (url.pathname.startsWith("/api/")) {
      const parsers = await getParsers(env);
      if (url.pathname === API.GET_TYPEDEF) {
        const typedefJSON = await env.CACHE_KV.get(KV_KEYS.TYPEDEF);
        return new Response(typedefJSON || "{}", { headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname === API.GET_MODELS) {
        const modelsJSON = await env.CACHE_KV.get(KV_KEYS.MODELS);
        return new Response(modelsJSON || "[]", { headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.startsWith("/api/model/")) {
        const id = url.pathname.split("/").pop();
        if (!id) return new Response("Model ID required", { status: 400 });
        const ob3Binary = await env.CACHE_KV.get(KV_KEYS.MODEL_OB3(id), "arrayBuffer");
        if (!ob3Binary) return new Response("Model not found", { status: 404 });
        const parsedModel = await parsers.models.read(new Uint8Array(ob3Binary));
        return new Response(JSON.stringify(parsedModel), { headers: { "Content-Type": "application/json" } });
      }
    }
    if (url.pathname === API.AI_SUGGEST_MATERIALS) {
      const body = await request.json();
      const suggestion = await env.AI.suggestMaterials(body.modelId, body.currentMaterials);
      return new Response(JSON.stringify(suggestion), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname === API.AI_SUGGEST_ANIMATION) {
      const body = await request.json();
      const suggestion = await env.AI.suggestAnimation(body.modelId, body.currentAnimation);
      return new Response(JSON.stringify(suggestion), { headers: { "Content-Type": "application/json" } });
    }
    const asset = await env.ASSETS.get(url.pathname.substring(1), "arrayBuffer");
    if (asset) {
      const mimeType = getMimeType(url.pathname);
      return new Response(asset, { headers: { "Content-Type": mimeType } });
    }
    return new Response("Not Found", { status: 404 });
  }
};
function getMimeType(pathname) {
  const ext = pathname.split(".").pop();
  switch (ext) {
    case "html":
      return "text/html";
    case "css":
      return "text/css";
    case "js":
      return "application/javascript";
    case "json":
      return "application/json";
    case "ico":
      return "image/x-icon";
    case "ob3":
      return "application/octet-stream";
    // For .ob3 model files
    // Add more MIME types as needed
    default:
      return "application/octet-stream";
  }
}
__name(getMimeType, "getMimeType");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-mDcpbS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-mDcpbS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
