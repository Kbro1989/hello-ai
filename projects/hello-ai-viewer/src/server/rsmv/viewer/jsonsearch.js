import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { JsonDisplay } from "./commoncontrols";
function ModalFrame(p) {
    return (React.createElement("div", { className: "mv-modal-container" },
        React.createElement("div", { className: "mv-modal", style: { maxWidth: p.maxWidth } },
            React.createElement("div", { className: "mv-modal-head" },
                React.createElement("span", null, p.title),
                React.createElement("span", { onClick: p.onClose }, "X")),
            React.createElement("div", { className: "mv-modal-body" }, p.children))));
}
export function selectEntity(ctx, mode, callback, initialFilters = []) {
    let onselect = (id, obj) => {
        modal.close();
        callback(id);
    };
    let modal = showModal({ title: "Select item" }, (React.createElement(JsonSearchPreview, { cache: ctx.sceneCache.engine, mode: mode, onSelect: onselect, initialFilters: initialFilters })));
}
export function showModal(config, children) {
    let rootel = document.createElement("div");
    rootel.classList.add("mv-style");
    document.body.appendChild(rootel);
    let root = ReactDOM.createRoot(rootel);
    let close = () => {
        if (root) {
            root.unmount();
            rootel.remove();
            root = null;
        }
    };
    root.render((React.createElement(ModalFrame, { onClose: close, title: config.title, maxWidth: config.maxWidth ?? "" }, children)));
    return { close };
}
export function JsonSearchPreview(p) {
    let [selid, setSelid] = React.useState(-1);
    let [selobj, setSelobj] = React.useState(null);
    const onchange = (id, obj) => {
        setSelid(id);
        setSelobj(obj);
    };
    return (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "40% 60%", height: "100%" } },
        React.createElement("div", { style: { display: "flex", flexDirection: "column", overflow: "hidden" } },
            React.createElement(JsonSearch, { cache: p.cache, mode: p.mode, onSelect: onchange, initialFilters: p.initialFilters })),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", overflow: "hidden" } },
            selobj && React.createElement("input", { type: "button", className: "sub-btn", value: "Select", onClick: e => p.onSelect(selid, selobj) }),
            React.createElement(JsonDisplay, { obj: selobj }))));
}
export function JsonSearch(p) {
    let initfilters = p.initialFilters;
    // if (p.initialFilters.length == 0 && typeof schema == "object") {
    // 	if (schema.properties?.name) { initfilters = [{ path: ["name"], search: "" }] }
    // }
    const [filters, setFilters] = React.useState(initfilters);
    const { filtered, getprop, actualfilters, loaded } = useJsonCacheSearch(p.cache, p.mode, filters);
    const editFilters = (index, cb) => {
        let newfilters = filters.map(q => ({ path: q.path.slice(), search: q.search }));
        if (!cb) {
            newfilters.splice(index, 1);
        }
        else {
            let filter = newfilters[index];
            if (!filter) {
                filter = { path: [], search: "" };
                newfilters[index] = filter;
            }
            cb(filter);
        }
        setFilters(newfilters);
    };
    return (React.createElement(React.Fragment, null,
        actualfilters.map((q, i) => React.createElement(JsonFilterUI, { key: i, index: i, filter: q.filter, editFilters: editFilters, optsthree: q.optsthree, searchtype: q.searchtype })),
        React.createElement("input", { type: "button", className: "sub-btn", value: "extra filter", onClick: e => editFilters(actualfilters.length, () => { }) }),
        React.createElement("div", null, loaded ? `${filtered.length} Matches` : "Loading..."),
        React.createElement("div", { style: { flex: "1", overflowY: "auto" } }, filtered.slice(0, 500).map((q, i) => (React.createElement("div", { key: q.$fileid, onClick: e => p.onSelect(q.$fileid, q) },
            q.$fileid,
            " - ",
            filters.map(f => getprop(q, f.path, 0).next().value + "").join(", ")))))));
}
export function useJsonCacheSearch(cache, mode, filters, dryrun = false) {
    const searchmeta = (dryrun ? null : cache.getJsonSearchData(mode));
    const [files, setFiles] = React.useState(null);
    React.useEffect(() => { !files && searchmeta?.files.then(setFiles); }, [searchmeta?.files]);
    const hasprop = (o, p) => o && Object.prototype.hasOwnProperty.call(o, p);
    const getprop = function* (prop, path, depth) {
        if (Array.isArray(prop)) {
            for (let sub of prop) {
                yield* getprop(sub, path, depth);
            }
            return false;
        }
        else if (depth < path.length) {
            let part = path[depth];
            if (typeof prop != "object" || !hasprop(prop, part)) {
                return false;
            }
            yield* getprop(prop[part], path, depth + 1);
        }
        else {
            yield prop;
        }
    };
    let filtered = files ?? [];
    let actualfilters = [];
    if (!dryrun) {
        for (let filter of filters) {
            let optsthree = [];
            let def = searchmeta.schema;
            let searchtype = "any";
            let partindex = 0;
            let lastdef = null;
            while (lastdef != def) {
                let part = filter.path[partindex];
                lastdef = def;
                if (typeof def != "object") {
                    break;
                }
                if (def.oneOf) {
                    if (def.oneOf.length == 2 && typeof def.oneOf[1] == "object" && def.oneOf[1].type == "null") {
                        def = def.oneOf[part == "null" ? 1 : 0];
                    }
                }
                else if (def.type == "object") {
                    if (def.properties) {
                        optsthree.push(Object.keys(def.properties));
                        if (part) {
                            def = def.properties[part];
                            partindex++;
                        }
                    }
                }
                else if (def.type == "array") {
                    if (def.items) {
                        if (typeof def.items != "object") {
                            throw new Error("only standard array props supported");
                        }
                        if (Array.isArray(def.items)) {
                            optsthree.push(Object.keys(def.items));
                            if (part) {
                                def = def.items[part];
                                partindex++;
                            }
                        }
                        else {
                            def = def.items;
                        }
                    }
                }
                else if (typeof def.type == "string") {
                    searchtype = def.type;
                }
                else {
                    console.log("unknown jsonschema type");
                }
            }
            actualfilters.push({ filter, optsthree, searchtype });
            const searchstring = filter.search.toLowerCase();
            const searchnum = +filter.search;
            const searchbool = filter.search == "true";
            filtered = filtered.filter(file => {
                for (let prop of getprop(file, filter.path, 0)) {
                    let match = false;
                    if (searchtype == "string" && typeof prop == "string" && prop.toLowerCase().indexOf(searchstring) != -1) {
                        match = true;
                    }
                    if ((searchtype == "integer" || searchtype == "number") && typeof prop == "number" && prop == searchnum) {
                        match = true;
                    }
                    if (searchtype == "boolean" && typeof prop == "boolean" && prop == searchbool) {
                        match = true;
                    }
                    if (match) {
                        return true;
                    }
                }
                return false;
            });
        }
    }
    return { filtered, getprop, actualfilters, loaded: !!files };
}
function JsonFilterUI(p) {
    return (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,auto)" } },
        p.optsthree.map((opts, i) => (React.createElement("select", { key: i, value: p.filter.path[i], onChange: e => p.editFilters(p.index, f => f.path.splice(i, 100, e.currentTarget.value)) }, opts.map((opt, j) => (React.createElement("option", { key: opt, value: opt }, opt)))))),
        p.searchtype == "string" && (React.createElement("input", { value: p.filter.search, onChange: e => p.editFilters(p.index, f => f.search = e.currentTarget.value), type: "text" })),
        (p.searchtype == "number" || p.searchtype == "integer") && (React.createElement("input", { value: p.filter.search, onChange: e => p.editFilters(p.index, f => f.search = e.currentTarget.value), type: "number" })),
        p.searchtype == "boolean" && (React.createElement("label", null,
            React.createElement("input", { checked: p.filter.search == "true", onChange: e => p.editFilters(p.index, f => f.search = e.currentTarget.checked + ""), type: "checkbox" }),
            "True")),
        React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => p.editFilters(p.index) })));
}
