import { buildParser } from "../src/opcode_reader.ts";

const simpleTypedef = {
    "test": "string"
};

const simpleOpcodes = {
    "0": {
        "name": "test",
        "read": "test"
    }
};

try {
    const parser = buildParser(null, simpleOpcodes, simpleTypedef);
    console.log(parser.getTypescriptType(""));
} catch (e) {
    console.error(e);
}
