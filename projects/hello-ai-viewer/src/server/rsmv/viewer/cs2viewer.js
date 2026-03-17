import * as React from "react";
import { ClientScriptInterpreter } from "../clientscript/interpreter";
import { getOpName } from "../clientscript/definitions";
import { useForceUpdate } from "./scriptsui";
import { prepareClientScript } from "../clientscript";
export function ClientScriptViewer(p) {
    let redraw = useForceUpdate();
    let [resetcounter, reset] = React.useReducer(c => c + 1, 0);
    let [calli, setcalli] = React.useState(null);
    let scene = globalThis.sceneCache; //TODO pass this properly using args
    React.useEffect(() => {
        let current = true;
        prepareClientScript(scene.engine).then(calli => current && setcalli(calli));
        return () => { current = false; };
    }, [resetcounter, calli]);
    let inter = React.useMemo(() => {
        if (!calli) {
            return null;
        } //force non-null here to make typescript shut up about it being null in non-reachable callbacks
        let script = JSON.parse(p.data);
        let inter = new ClientScriptInterpreter(calli);
        try {
            inter.callscript(script, -1);
        }
        catch (e) {
            console.log(e);
        }
        return inter;
    }, [calli, resetcounter, p.data]);
    if (!calli || !inter) {
        return (React.createElement("div", null, "Callibrating..."));
    }
    globalThis.inter = inter;
    let index = inter.scope?.index ?? 0;
    let offset = Math.max(0, index - 10);
    let relevantops = inter.scope?.ops.slice(offset, inter.scope.index + 600) ?? [];
    return (React.createElement("div", { style: { position: "absolute", inset: "0px", display: "grid", gridTemplate: '"a" fit-content "b" 1fr / 1fr' } },
        React.createElement("div", { style: { display: "grid", gridTemplate: '"a b c" / min-content 1fr 1fr' } },
            React.createElement("div", null,
                React.createElement("input", { type: "button", className: "sub-btn", value: "restart", onClick: e => reset() }),
                React.createElement("input", { type: "button", className: "sub-btn", value: "next", onClick: e => { inter.next(); redraw(); } })),
            React.createElement("div", { className: "cs-valuegroup" },
                React.createElement("div", null, inter.intstack.map((q, i) => React.createElement(IntValue, { key: i, index: i, inter: inter, type: "stack" }))),
                React.createElement("div", null, inter.longstack.map((q, i) => React.createElement(LongValue, { key: i, index: i, inter: inter, type: "stack" }))),
                React.createElement("div", null, inter.stringstack.map((q, i) => React.createElement(StringValue, { key: i, index: i, inter: inter, type: "stack" })))),
            React.createElement("div", { className: "cs-valuegroup" },
                React.createElement("div", null, inter.scope?.localints.map((q, i) => React.createElement(IntValue, { key: i, index: i, inter: inter, type: "local" }))),
                React.createElement("div", null, inter.scope?.locallongs.map((q, i) => React.createElement(LongValue, { key: i, index: i, inter: inter, type: "local" }))),
                React.createElement("div", null, inter.scope?.localstrings.map((q, i) => React.createElement(StringValue, { key: i, index: i, inter: inter, type: "local" }))))),
        React.createElement("div", { style: { overflowY: "auto", whiteSpace: "pre" } }, relevantops.map((q, i) => React.createElement("div", { key: i + offset },
            i + offset == index ? ">>" : "  ",
            i + offset,
            " ",
            getOpName(q.opcode),
            " ",
            q.imm,
            " ",
            (q.imm_obj ?? "") + "")))));
}
function IntValue(p) {
    let val = (p.type == "stack" ? p.inter.intstack[p.index] : p.inter.scope?.localints[p.index] ?? 0);
    return (React.createElement("div", { className: "cs2-value" },
        "int",
        p.index,
        " = ",
        val));
}
function LongValue(p) {
    let val = (p.type == "stack" ? p.inter.longstack[p.index] : p.inter.scope?.locallongs[p.index] ?? 0n);
    return (React.createElement("div", { className: "cs2-value" },
        "long",
        p.index,
        " = ",
        val.toString()));
}
function StringValue(p) {
    let val = (p.type == "stack" ? p.inter.stringstack[p.index] : p.inter.scope?.localstrings[p.index] ?? "");
    return (React.createElement("div", { className: "cs2-value" },
        "string",
        p.index,
        " = \"",
        val,
        "\""));
}
