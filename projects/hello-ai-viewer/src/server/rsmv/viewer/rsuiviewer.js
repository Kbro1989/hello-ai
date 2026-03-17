import * as React from "react";
import { UiRenderContext, loadRsInterfaceData, renderRsInterfaceDOM } from "../scripts/renderrsinterface";
import { DomWrap } from "./scriptsui";
export function RsUIViewer(p) {
    let [ui, setui] = React.useState(null);
    let [hovering, sethovering] = React.useState(true);
    let [refreshcount, refresh] = React.useReducer((v) => v + 1, 0);
    let scene = globalThis.sceneCache; //TODO pass this properly using args
    let render = globalThis.render; //TODO
    let ctx = React.useMemo(() => {
        let res = new UiRenderContext(scene.engine);
        res.sceneCache = scene;
        res.renderer = render;
        return res;
    }, [scene, render]);
    React.useEffect(() => {
        let needed = true;
        let uiinfo = JSON.parse(p.data);
        let cleanup = () => { };
        loadRsInterfaceData(ctx, uiinfo.id).then(ui => {
            if (!needed) {
                return;
            }
            let res = renderRsInterfaceDOM(ctx, ui);
            cleanup = res.dispose;
            setui(res);
        });
        return () => {
            needed = false;
            cleanup();
        };
    }, [ctx, p.data, refreshcount, ctx.runOnloadScripts]);
    let scrollfix = React.useCallback((el) => {
        if (!el || !ui) {
            return;
        }
        let expandbounds = (el, bounds) => {
            let box = el.getBoundingClientRect();
            bounds.x1 = Math.min(bounds.x1, box.left);
            bounds.x2 = Math.max(bounds.x2, box.right);
            bounds.y1 = Math.min(bounds.y1, box.top);
            bounds.y2 = Math.max(bounds.y2, box.bottom);
            for (let child of Array.from(el.children)) {
                expandbounds(child, bounds);
            }
        };
        let bounds = { x1: 0, x2: 0, y1: 0, y2: 0 };
        expandbounds(ui.el, bounds);
        let ownbounds = el.getBoundingClientRect();
        let negx = Math.round(ownbounds.left - bounds.x1);
        let negy = Math.round(ownbounds.top - bounds.y1);
        ui.container.style.left = `${negx}px`;
        ui.container.style.top = `${negy}px`;
        el.scrollLeft = negx;
        el.scrollTop = negy;
    }, [ui]);
    let mouseevent = React.useCallback((e) => {
        let comp = null;
        let target = e.target;
        while (target && target != ui?.el) {
            let compid = target.compid;
            if (typeof compid == "number") {
                comp = ctx.comps.get(compid) ?? null;
                break;
            }
            target = target.parentElement;
        }
        if (e.type == "mouseout") {
            ctx.emit("hover", null);
        }
        else if (e.type == "mouseover") {
            ctx.emit("hover", comp);
        }
        else if (e.type == "click") {
            ctx.emit("select", comp);
        }
    }, [hovering, ctx, ui]);
    return (React.createElement("div", { style: { position: "absolute", inset: "0px", display: "grid", gridTemplate: '"a" 1fr "b" auto "c" 1fr / 1fr' } },
        React.createElement("div", { style: { position: "relative", overflow: "auto" }, ref: scrollfix, onMouseOver: mouseevent, onMouseOut: mouseevent, onClick: mouseevent },
            React.createElement(DomWrap, { el: ui?.el })),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: ctx.runOnloadScripts, onChange: e => { ctx.runOnloadScripts = e.currentTarget.checked; refresh(); } }),
                "Run load scripts"),
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: hovering, onChange: e => sethovering(e.currentTarget.checked) }),
                "Hover"),
            React.createElement("input", { type: "button", className: "sub-btn", onClick: refresh, value: "reload" })),
        React.createElement("div", { style: { overflowY: "auto" } }, ui?.rootcomps.map((q, i) => React.createElement(RsInterfaceDebugger, { ctx: ctx, key: i, source: scene.engine, comp: q })))));
}
function RsInterfaceDebugger(p) {
    let data = p.comp.data;
    let [selected, setselected] = React.useState(false);
    let [hovered, sethovered] = React.useState(false);
    let mouseevent = React.useCallback((e) => {
        p.ctx.toggleHighLightComp(p.comp.compid, e.type == "mouseenter");
    }, [p.ctx, p.comp]);
    React.useEffect(() => {
        let hover = (e) => sethovered(e == p.comp);
        let click = (e) => setselected(e == p.comp);
        p.ctx.on("hover", hover);
        p.ctx.on("select", click);
        return () => {
            p.ctx.off("hover", hover);
            p.ctx.off("select", click);
        };
    }, [p.ctx, p.comp]);
    let ref = React.useCallback((el) => {
        if (el && selected) {
            el.scrollIntoView();
        }
    }, [selected]);
    return (React.createElement("div", { className: "rs-componentmeta" + (selected || hovered ? " rs-componentmeta--active" : ""), ref: ref, onMouseEnter: mouseevent, onMouseLeave: mouseevent, onClick: e => e.target == e.currentTarget && console.log(p.comp) },
        "id=",
        p.comp.compid & 0xffff,
        " t=",
        data.type,
        " ",
        data.textdata?.text ?? "no text",
        React.createElement("br", null),
        data.spritedata && "sprite: " + data.spritedata.spriteid,
        data.modeldata && "model: " + data.modeldata.modelid,
        React.createElement(CallbackDebugger, { ctx: p.ctx, comp: p.comp, source: p.source }),
        React.createElement("hr", null),
        React.createElement("div", { className: "rs-componentmeta-children" }, p.comp.children.map((q, i) => React.createElement(RsInterfaceDebugger, { ctx: p.ctx, key: i, comp: q, source: p.source })))));
}
function CallbackDebugger(p) {
    return (React.createElement("div", null, Object.entries(p.comp.data.scripts).filter(q => q[1] && q[1].length != 0).map(([key, v]) => {
        if (!v) {
            throw new Error("unexpected");
        }
        if (typeof v[0] != "number") {
            throw new Error("unexpected");
        }
        let callbackid = v[0];
        return (React.createElement("div", { key: key, className: "rs-componentcallback", onClick: e => p.ctx.runClientScriptCallback(p.comp.compid, v) },
            key,
            " ",
            callbackid,
            "(",
            v.slice(1).map(q => typeof q == "string" ? `"${q}"` : q).join(","),
            ")"));
    })));
}
