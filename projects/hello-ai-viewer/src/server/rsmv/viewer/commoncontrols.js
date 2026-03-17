// src/rsmv/viewer/commoncontrols.tsx
import * as React from "react";
import prettyJson from "json-stringify-pretty-compact";
import classNames from "classnames";
import { useJsonCacheSearch } from "./jsonsearch";
import { toArrayBufferView } from "../../utils/buffer-utils";
export function CanvasView(p) {
    let ref = React.useCallback((el) => {
        p.canvas.classList.add("mv-image-preview-canvas");
        if (el) {
            el.appendChild(p.canvas);
        }
        else {
            p.canvas.remove();
        }
    }, [p.canvas]);
    return (React.createElement("div", { ref: ref, className: "mv-image-preview", style: p.fillHeight ? { height: "100%" } : {} }));
}
export function BlobImage(p) {
    let urlref = React.useRef("");
    let ref = React.useCallback((el) => {
        if (el) {
            let blob = new Blob([toArrayBufferView(p.file)], { type: `image/${p.ext == "svg" ? "svg+xml" : p.ext}` });
            let url = URL.createObjectURL(blob);
            urlref.current = url;
            el.src = url;
            el.decode().finally(() => URL.revokeObjectURL(url));
        }
        else {
            URL.revokeObjectURL(urlref.current);
        }
    }, [p.file]);
    return (React.createElement("div", { className: "mv-image-preview", style: p.fillHeight ? { height: "100%" } : {} },
        React.createElement("img", { ref: ref, className: "mv-image-preview-canvas" })));
}
export function BlobAudio(p) {
    let urlref = React.useRef("");
    let ref = React.useCallback((el) => {
        if (el) {
            let blob = new Blob([toArrayBufferView(p.file)], { type: `audio/ogg` });
            let url = URL.createObjectURL(blob);
            urlref.current = url;
            el.src = url;
        }
        else {
            URL.revokeObjectURL(urlref.current);
        }
    }, [p.file]);
    return (React.createElement("div", { className: "mv-image-preview" },
        React.createElement("audio", { ref: ref, controls: true, autoPlay: p.autoplay })));
}
export function TabStrip(p) {
    const templatecols = `repeat(${Math.min(4, Object.keys(p.tabs).length)},minmax(0,1fr))`;
    return (React.createElement("div", { className: "mv-tab-strip mv-inset", style: { gridTemplateColumns: templatecols } }, Object.entries(p.tabs).map(([k, v]) => (React.createElement("div", { key: k, className: classNames("mv-icon-button", { active: p.value == k }), onClick: () => p.onChange(k) }, v)))));
}
export function JsonDisplay(p) {
    return (React.createElement("pre", { className: "mv-json-block" }, prettyJson(p.obj, { maxLength: 32 })));
}
export function IdInput({ initialid, onChange }) {
    let [idstate, setId] = React.useState(initialid ?? 0);
    let stale = React.useRef(false);
    let id = (stale.current || typeof initialid == "undefined" ? idstate : initialid);
    let incr = () => { setId(id + 1); onChange(id + 1); stale.current = false; };
    let decr = () => { setId(id - 1); onChange(id - 1); stale.current = false; };
    let submit = (e) => { onChange(id); e.preventDefault(); stale.current = false; };
    return (React.createElement("form", { className: "mv-searchbar", onSubmit: submit },
        React.createElement("input", { type: "button", style: { width: "25px", height: "25px" }, onClick: decr, value: "", className: "sub-btn sub-btn-minus" }),
        React.createElement("input", { type: "button", style: { width: "25px", height: "25px" }, onClick: incr, value: "", className: "sub-btn sub-btn-plus" }),
        React.createElement("input", { type: "text", className: "mv-searchbar-input", spellCheck: "false", value: id, onChange: e => { setId(+e.currentTarget.value); stale.current = true; } }),
        React.createElement("input", { type: "submit", style: { width: "25px", height: "25px" }, value: "", className: "sub-btn sub-btn-search" })));
}
export function IdInputSearch(p) {
    let [search, setSearch] = React.useState("" + (p.initialid ?? ""));
    let [id, setidstate] = React.useState(p.initialid ?? 0);
    let [searchopen, setSearchopen] = React.useState(false);
    const filters = [{ path: ["name"], search: search }];
    let { loaded, filtered, getprop } = useJsonCacheSearch(p.cache, p.mode, filters, !searchopen);
    const submitid = (v) => {
        setidstate(v);
        p.onChange(v);
    };
    let incr = () => { submitid(id + 1); setSearchText(id + 1 + ""); };
    let decr = () => { submitid(id - 1); setSearchText(id - 1 + ""); };
    let submit = (e) => { e.preventDefault(); submitid(id); };
    const setSearchText = (v) => {
        let n = +v;
        let isNumber = !isNaN(n);
        setSearch(v);
        setSearchopen(!isNumber);
        if (isNumber) {
            setidstate(n);
        }
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("form", { className: "mv-searchbar", onSubmit: submit },
            React.createElement("input", { type: "button", style: { width: "25px", height: "25px" }, onClick: decr, value: "", className: "sub-btn sub-btn-minus" }),
            React.createElement("input", { type: "button", style: { width: "25px", height: "25px" }, onClick: incr, value: "", className: "sub-btn sub-btn-plus" }),
            React.createElement("input", { type: "text", className: "mv-searchbar-input", spellCheck: "false", value: search, onChange: e => setSearchText(e.currentTarget.value) }),
            React.createElement("input", { type: "submit", style: { width: "25px", height: "25px" }, value: "", className: "sub-btn sub-btn-search" })),
        searchopen && !loaded && (React.createElement("div", null, "Loading...")),
        searchopen && loaded && (React.createElement("div", { className: "mv-sidebar-scroll" }, filtered.slice(0, 100).map((q, i) => (React.createElement("div", { key: q.$fileid, onClick: e => submitid(q.$fileid) },
            q.$fileid,
            " - ",
            getprop(q, ["name"], 0).next().value))))),
        searchopen && React.createElement("input", { type: "button", className: "sub-btn", value: "Close", onClick: e => setSearchText(id + "") })));
}
export function StringInput({ initialid, onChange }) {
    let [idstate, setId] = React.useState(initialid ?? "");
    let stale = React.useRef(false);
    let id = (stale.current || typeof initialid == "undefined" ? idstate : initialid);
    let submit = (e) => { onChange(id); e.preventDefault(); stale.current = false; };
    return (React.createElement("form", { className: "mv-searchbar", onSubmit: submit },
        React.createElement("input", { type: "text", className: "mv-searchbar-input", spellCheck: "false", value: id, onChange: e => { setId(e.currentTarget.value); stale.current = true; } }),
        React.createElement("input", { type: "submit", style: { width: "25px", height: "25px" }, value: "", className: "sub-btn sub-btn-search" })));
}
export function LabeledInput(p) {
    return (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr" } },
        React.createElement("div", null, p.label),
        p.children));
}
export function CopyButton(p) {
    let [didcopy, setdidcopy] = React.useState(false);
    let copy = async () => {
        await navigator.clipboard.writeText("text" in p ? p.text : p.getText());
        setdidcopy(true);
        setTimeout(() => setdidcopy(false), 2000);
    };
    return (React.createElement("input", { type: "button", className: "sub-btn", onClick: copy, value: didcopy ? "copied!" : "copy" }));
}
export function PasteButton(p) {
    let [didcopy, setdidcopy] = React.useState(false);
    let paste = async () => {
        let v = await navigator.clipboard.readText();
        setdidcopy(true);
        setTimeout(() => setdidcopy(false), 2000);
        p.onPaste(v);
    };
    return (React.createElement("input", { type: "button", className: "sub-btn", onClick: paste, value: didcopy ? "pasted!" : "paste" }));
}
export class InputCommitted extends React.Component {
    constructor(props) {
        super(props);
        this.el = null;
        this.stale = false;
        this.onInput = this.onInput.bind(this);
        this.onChange = this.onChange.bind(this);
        this.ref = this.ref.bind(this);
    }
    onInput() {
        this.stale = true;
    }
    onChange(e) {
        this.props.onChange?.(e);
        this.stale = false;
    }
    ref(el) {
        if (this.el) {
            this.el.removeEventListener("change", this.onChange);
            this.el.removeEventListener("input", this.onInput);
        }
        if (el) {
            el.addEventListener("change", this.onChange);
            el.addEventListener("input", this.onInput);
            this.el = el;
        }
    }
    render() {
        if (!this.stale && this.el && this.props.value) {
            this.el.value = this.props.value;
        }
        let newp = { ...this.props, onChange: undefined, value: undefined, defaultValue: this.props.value };
        return React.createElement("input", { ref: this.ref, ...newp });
    }
}
