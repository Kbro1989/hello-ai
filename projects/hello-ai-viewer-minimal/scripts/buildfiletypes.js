"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var opcode_reader_js_1 = require("../src/opcode_reader.js");
var commentjson = require("comment-json");
var jsonschemas_js_1 = require("../src/rsmv/jsonschemas.js");
function buildFileTypes() {
    return __awaiter(this, void 0, void 0, function () {
        var basedir, outdir, files, typedef, _i, files_1, file, srcfile, objname, jsontext, opcodes, typesfile, outfile;
        return __generator(this, function (_a) {
            basedir = path.resolve("./src/opcodes");
            outdir = path.resolve("./generated");
            files = fs.readdirSync(basedir);
            if (files.some(function (f) { return !path.basename(f).match(/\.jsonc?$/); })) {
                console.error("non-json files matched, is path wrong?");
            }
            typedef = commentjson.parse(fs.readFileSync(path.resolve(basedir, "typedef.jsonc"), "utf-8"), undefined, true);
            for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                file = files_1[_i];
                srcfile = path.resolve(basedir, file);
                objname = path.parse(srcfile).name;
                jsontext = fs.readFileSync(srcfile, "utf8");
                opcodes = commentjson.parse(jsontext, undefined, true);
                typesfile = "// GENERATED DO NOT EDIT\n" +
                    "// This source data is located at '" + path.relative(outdir, srcfile) + "'\n" +
                    "// run `npm run filetypes` to rebuild\n\n";
                typesfile += "export type " + objname + " = ";
                try {
                    typesfile += (0, opcode_reader_js_1.buildParser)(null, opcodes, typedef).getTypescriptType("") + ";\n";
                }
                catch (e) {
                    //console.error(e);
                    typesfile += "any;\n";
                    typesfile += "// " + e.toString().replace(/\n/g, "\n//");
                }
                //I'm sorry, git made me do this
                typesfile = typesfile.replace(/(?<!\r)\n/g, "\r\n");
                outfile = path.resolve(outdir, objname + ".d.ts");
                fs.writeFileSync(outfile, typesfile);
            }
            //other one off files
            fs.writeFileSync(path.resolve(outdir, "maprenderconfig.schema.json"), JSON.stringify(jsonschemas_js_1.maprenderConfigSchema, undefined, "\t"));
            return [2 /*return*/];
        });
    });
}
buildFileTypes();
