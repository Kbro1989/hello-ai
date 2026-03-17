import * as React from "react";
import { WasmGameCacheLoader } from "../cache/sqlitewasm";
import { CallbackCacheLoader } from "../cache";
import * as datastore from "idb-keyval";
import { StringInput, TabStrip, CanvasView, BlobImage, BlobAudio, CopyButton } from "./commoncontrols";
import { Openrs2CacheSource, validOpenrs2Caches } from "../cache/openrs2loader";
import { DomWrap } from "./scriptsui";
import prettyJson from "json-stringify-pretty-compact";
import { TypedEmitter } from "../utils";
import { ParsedTexture } from "../3d/textures";
import { parse } from "../opdecoder";
import classNames from "classnames";
import { drawTexture } from "../imgutils";
import { RsUIViewer } from "./rsuiviewer";
import { ClientScriptViewer } from "./cs2viewer";
//see if we have access to a valid electron import
let electron = null;
export function downloadBlob(name, data) {
    const parts = [];
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        parts.push(data instanceof ArrayBuffer ? data : data.buffer);
    }
    else if (data?.buffer instanceof ArrayBuffer) {
        parts.push(data.buffer);
    }
    else {
        parts.push(data);
    }
    const blob = new Blob(parts, { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}
/**@deprecated requires a service worker and is pretty sketchy, also no actual streaming output file sources atm */
export async function downloadStream(name, stream) {
    if (!electron && navigator.serviceWorker) {
        let url = new URL(`download_${Math.random() * 10000 | 0}_${name}`, document.location.href).href;
        let sw = await navigator.serviceWorker.ready;
        if (!sw.active) {
            throw new Error("no service worker");
        }
        sw.active.postMessage({ type: "servedata", url, stream }, [stream]);
        await delay(100);
        let fr = document.createElement("iframe");
        fr.src = url;
        fr.hidden = true;
        document.body.appendChild(fr);
    }
    else {
        //TODO
        console.log("TODO");
    }
}
function OpenRs2IdSelector(p) {
    let [relevantcaches, setrelevantcaches] = React.useState(null);
    let [loading, setLoading] = React.useState(false);
    let [relevantonly, setrelevantonly] = React.useState(true);
    let [gameFilter, setGameFilter] = React.useState("runescape");
    let [yearFilter, setYearfilter] = React.useState("");
    let [langFilter, setLangfilter] = React.useState("en");
    let openselector = React.useCallback(async () => {
        setLoading(true);
        setrelevantcaches(await validOpenrs2Caches());
    }, []);
    let games = [];
    let years = [];
    let langs = [];
    for (let cache of relevantcaches ?? []) {
        if (cache.timestamp) {
            let year = "" + new Date(cache.timestamp ?? 0).getUTCFullYear();
            if (years.indexOf(year) == -1) {
                years.push(year);
            }
        }
        if (games.indexOf(cache.game) == -1) {
            games.push(cache.game);
        }
        if (langs.indexOf(cache.language) == -1) {
            langs.push(cache.language);
        }
    }
    years.sort((a, b) => (+b) - (+a));
    let showncaches = (relevantcaches ?? []).filter(cache => {
        if (gameFilter && cache.game != gameFilter) {
            return false;
        }
        if (langFilter && cache.language != langFilter) {
            return false;
        }
        if (yearFilter && new Date(cache.timestamp ?? 0).getUTCFullYear() != +yearFilter) {
            return false;
        }
        return true;
    });
    showncaches.sort((a, b) => +new Date(b.timestamp ?? 0) - +new Date(a.timestamp ?? 0));
    let enterCacheId = async (idstring) => {
        let id = +idstring;
        // negative id means latest-x cache
        if (id <= 0) {
            id = (await Openrs2CacheSource.getRecentCache(-id)).id;
        }
        p.onSelect(id);
    };
    return (React.createElement(React.Fragment, null,
        React.createElement(StringInput, { initialid: p.initialid + "", onChange: enterCacheId }),
        !loading && !relevantcaches && React.createElement("input", { type: "button", className: "sub-btn", onClick: openselector, value: "More options..." }),
        relevantcaches && (React.createElement(React.Fragment, null,
            React.createElement("div", { style: { overflowY: "auto" } },
                React.createElement("table", null,
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("td", null),
                            React.createElement("td", null,
                                React.createElement("select", { value: yearFilter, onChange: e => setYearfilter(e.currentTarget.value) },
                                    React.createElement("option", { value: "" }, "Date"),
                                    years.map(year => React.createElement("option", { key: year, value: year }, year)))),
                            React.createElement("td", null, "Build"))),
                    React.createElement("tbody", null, showncaches.map(cache => (React.createElement("tr", { key: cache.language + cache.id },
                        React.createElement("td", null,
                            React.createElement("input", { type: "button", value: cache.id, className: "sub-btn", onClick: p.onSelect.bind(null, cache.id) })),
                        React.createElement("td", null, cache.timestamp ? new Date(cache.timestamp).toDateString() : ""),
                        React.createElement("td", null, cache.builds.map(q => q.major + (q.minor ? "." + q.minor : "")).join(","))))))))))));
}
export class CacheSelector extends React.Component {
    constructor(p) {
        super(p);
        this.state = {
            lastFolderOpen: null
        };
        this.onDragOver = this.onDragOver.bind(this);
        this.clickOpen = this.clickOpen.bind(this);
        this.clickOpenNative = this.clickOpenNative.bind(this);
        this.clickOpenLive = this.clickOpenLive.bind(this);
        this.clickReopen = this.clickReopen.bind(this);
        this.onFileDrop = this.onFileDrop.bind(this);
        this.openOpenrs2Cache = this.openOpenrs2Cache.bind(this);
        if (!this.props.noReopen) {
            datastore.get("lastfolderopen").then(f => {
                if (f) {
                    this.setState({ lastFolderOpen: f });
                }
            });
        }
    }
    componentDidMount() {
        document.body.addEventListener("dragover", this.onDragOver);
        document.body.addEventListener("drop", this.onFileDrop);
    }
    componentWillUnmount() {
        document.body.removeEventListener("dragover", this.onDragOver);
        document.body.removeEventListener("drop", this.onFileDrop);
    }
    onDragOver(e) {
        e.preventDefault();
    }
    async clickOpen() {
        let dir = await showDirectoryPicker();
        this.props.onOpen({ type: "autohandle", handle: dir });
    }
    // async clickOpenNative() {
    // 	if (!electron) { return; }
    // 	let dir: import("electron").OpenDialogReturnValue = await electron.ipcRenderer.invoke("openfolder", path.resolve(process.env.ProgramData!, "jagex/runescape"));
    // 	if (!dir.canceled) {
    // 		this.props.onOpen({ type: "autofs", location: dir.filePaths[0], writable: !!globalThis.writecache });//TODO propper ui for this
    // 	}
    // }
    // async clickOpenLive() {
    // 	this.props.onOpen({ type: "live" });
    // }
    async clickReopen() {
        if (!this.state.lastFolderOpen) {
            return;
        }
        if (await this.state.lastFolderOpen.requestPermission() == "granted") {
            this.props.onOpen({ type: "autohandle", handle: this.state.lastFolderOpen });
        }
    }
    async onFileDrop(e) {
        e.preventDefault();
        if (e.dataTransfer) {
            let files = {};
            let items = [];
            let folderhandles = [];
            let filehandles = [];
            for (let i = 0; i < e.dataTransfer.items.length; i++) {
                items.push(e.dataTransfer.items[i]);
            }
            //needs to start synchronously as the list is cleared after the event stack
            await Promise.all(items.map(async (item) => {
                if (item.getAsFileSystemHandle) {
                    let filehandle = (await item.getAsFileSystemHandle());
                    if (filehandle.kind == "file") {
                        let file = filehandle;
                        filehandles.push(file);
                        files[filehandle.name] = await file.getFile();
                    }
                    else {
                        let dir = filehandle;
                        folderhandles.push(dir);
                        for await (let handle of dir.values()) {
                            if (handle.kind == "file") {
                                files[handle.name] = await handle.getFile();
                            }
                        }
                    }
                }
                else if (item.kind == "file") {
                    let file = item.getAsFile();
                    files[file.name] = file;
                }
            }));
            if (folderhandles.length == 1 && filehandles.length == 0) {
                console.log("stored folder " + folderhandles[0].name);
                datastore.set("lastfolderopen", folderhandles[0]);
                this.props.onOpen({ type: "autohandle", handle: folderhandles[0] });
            }
            else {
                console.log(`added ${Object.keys(files).length} files`);
                this.props.onOpen({ type: "sqliteblobs", blobs: files });
            }
        }
    }
    openOpenrs2Cache(cachename) {
        this.props.onOpen({ type: "openrs2", cachename: cachename + "" });
    }
    render() {
        return (React.createElement(React.Fragment, null,
            React.createElement("h2", null, "Local Cache"),
            React.createElement(CacheDragNDropHelp, null),
            !this.props.noReopen && this.state.lastFolderOpen && React.createElement("input", { type: "button", className: "sub-btn", onClick: this.clickReopen, value: `Reopen ${this.state.lastFolderOpen.name}` }),
            React.createElement("h2", null, "Historical caches"),
            React.createElement("p", null,
                "Enter any valid cache id from ",
                React.createElement("a", { target: "_blank", href: "https://archive.openrs2.org/" }, "OpenRS2"),
                ". Entering 0 will load the latest RS3 cache, negative values will load previous caches."),
            React.createElement(OpenRs2IdSelector, { initialid: 0, onSelect: this.openOpenrs2Cache })));
    }
}
function CacheDragNDropHelp() {
    const canfsapi = typeof FileSystemHandle != "undefined";
    let [open, setOpen] = React.useState(false);
    let [mode, setmode] = React.useState(canfsapi ? "fsapi" : "blob");
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null,
            canfsapi && "Drag a folder containing the RS3 cache files here in order to view it.",
            !canfsapi && "Drag the RS3 cache files you wish to view",
            React.createElement("a", { style: { float: "right" }, onClick: e => setOpen(!open) }, !open ? "More info" : "Close")),
        open && (React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
            React.createElement(TabStrip, { value: mode, tabs: { fsapi: "Full folder", blob: "Files" }, onChange: setmode }),
            mode == "fsapi" && (React.createElement(React.Fragment, null,
                !canfsapi && React.createElement("p", { className: "mv-errortext" }, "You browser does not support full folder loading!"),
                React.createElement("p", null, "Drop the RuneScape folder into this window."),
                React.createElement("input", { type: "text", onFocus: e => e.target.select(), readOnly: true, value: "C:\\ProgramData\\Jagex" }),
                React.createElement("video", { src: new URL("../assets/dragndrop.mp4", import.meta.url).href, autoPlay: true, loop: true, style: { aspectRatio: "352/292" } }))),
            mode == "blob" && (React.createElement(React.Fragment, null,
                React.createElement("p", null, "Drop and drop the cache files into this window."),
                React.createElement("input", { type: "text", onFocus: e => e.target.select(), readOnly: true, value: "C:\\ProgramData\\Jagex" }),
                React.createElement("video", { src: new URL("../assets/dragndropblob.mp4", import.meta.url).href, autoPlay: true, loop: true, style: { aspectRatio: "458/380" } })))))));
}
//i should figure out this redux thing...
export class UIContext extends TypedEmitter {
    constructor(rootelement, useServiceWorker) {
        super();
        this.source = null;
        this.sceneCache = null;
        this.renderer = null;
        this.openedfile = null;
        this.rootElement = rootelement;
        this.useServiceWorker = useServiceWorker;
        this.openFile = this.openFile.bind(this);
        if (useServiceWorker) {
            //this service worker holds a reference to the cache fs handle which will keep the handles valid 
            //across tab reloads
            navigator.serviceWorker?.register(new URL('../assets/contextholder.js', import.meta.url).href, { scope: './', });
        }
    }
    setCacheSource(source) {
        this.source = source;
        this.emit("statechange", undefined);
    }
    setSceneCache(sceneCache) {
        this.sceneCache = sceneCache;
        this.emit("statechange", undefined);
    }
    setRenderer(renderer) {
        this.renderer = renderer;
        this.emit("statechange", undefined);
    }
    canRender() {
        return !!this.source && !!this.sceneCache && !!this.renderer;
    }
    openFile(file) {
        this.openedfile = file;
        this.emit("openfile", file);
    }
}
export async function openSavedCache(source, remember) {
    let cache = null;
    if (source.type == "sqliteblobs" || source.type == "autohandle") {
        if (source.type == "autohandle") {
            let perm = await source.handle.queryPermission({ mode: "read" });
            if (perm == "granted") {
                let wasmcache = new WasmGameCacheLoader();
                // let fs = new UIScriptFS(null);
                // await fs.setSaveDirHandle(source.handle);
                // cache = await selectFsCache(fs);
                await wasmcache.giveFsDirectory(source.handle);
                navigator.serviceWorker?.ready.then(q => q.active?.postMessage({ type: "sethandle", handle: source.handle }));
                cache = wasmcache;
            }
        }
        else {
            let wasmcache = new WasmGameCacheLoader();
            wasmcache.giveBlobs(source.blobs);
            cache = wasmcache;
        }
    }
    if (source.type == "openrs2") {
        cache = await Openrs2CacheSource.fromId(+source.cachename);
    }
    // if (electron && source.type == "autofs") {
    // 	let fs = new CLIScriptFS(source.location);
    // 	cache = await selectFsCache(fs, { writable: source.writable });
    // }
    // if (source.type == "live") {
    // 	cache = new CacheDownloader();
    // }
    if (remember) {
        datastore.set("openedcache", source);
        localStorage.rsmv_openedcache = JSON.stringify(source);
    }
    return cache;
}
function bufToHexView(buf) {
    let resulthex = "";
    let resultchrs = "";
    let linesize = 16;
    let groupsize = 8;
    outer: for (let lineindex = 0;; lineindex += linesize) {
        if (lineindex != 0) {
            resulthex += "\n";
            resultchrs += "\n";
        }
        for (let groupindex = 0; groupindex < linesize; groupindex += groupsize) {
            if (groupindex != 0) {
                resulthex += "  ";
                resultchrs += " ";
            }
            for (let chrindex = 0; chrindex < groupsize; chrindex++) {
                let i = lineindex + groupindex + chrindex;
                if (i >= buf.length) {
                    break outer;
                }
                let byte = buf[i];
                if (chrindex != 0) {
                    resulthex += " ";
                }
                resulthex += byte.toString(16).padStart(2, "0");
                resultchrs += (byte < 0x20 ? "." : String.fromCharCode(byte));
            }
        }
    }
    return { resulthex, resultchrs };
}
function annotatedHexDom(data, chunks) {
    let resulthex = "";
    let resultchrs = "";
    let linesize = 16;
    let groupsize = 8;
    let hexels = document.createDocumentFragment();
    let textels = document.createDocumentFragment();
    let labelel = document.createElement("span");
    let currentchunk = { offset: 0, len: 0, label: "start" };
    let mappedchunks = [];
    let hoverenter = (e) => {
        let index = +e.currentTarget.dataset.index;
        if (isNaN(index)) {
            return;
        }
        let chunk = mappedchunks[index];
        chunk.hexel.classList.add("mv-hex--select");
        chunk.textel.classList.add("mv-hex--select");
        labelel.innerText = `0x${chunk.chunk.offset.toString(16)} - ${chunk.chunk.len} ${index}\n${chunk.chunk.label}`;
    };
    let hoverleave = (e) => {
        let index = +e.currentTarget.dataset.index;
        if (isNaN(index)) {
            return;
        }
        let chunk = mappedchunks[index];
        chunk.hexel.classList.remove("mv-hex--select");
        chunk.textel.classList.remove("mv-hex--select");
        labelel.innerText = "";
    };
    let endchunk = () => {
        if (resulthex != "" && resultchrs != "") {
            let hexnode = document.createTextNode(resulthex);
            let textnode = document.createTextNode(resultchrs);
            if (currentchunk) {
                let index = mappedchunks.length;
                let hexspan = document.createElement("span");
                let textspan = document.createElement("span");
                hexspan.dataset.index = "" + index;
                textspan.dataset.index = "" + index;
                hexspan.onmouseenter = hoverenter;
                hexspan.onmouseleave = hoverleave;
                textspan.onmouseenter = hoverenter;
                textspan.onmouseleave = hoverleave;
                hexspan.appendChild(hexnode);
                textspan.appendChild(textnode);
                hexels.appendChild(hexspan);
                textels.appendChild(textspan);
                mappedchunks.push({ chunk: currentchunk, hexel: hexspan, textel: textspan });
            }
            else {
                hexels.appendChild(hexnode);
                textels.appendChild(textnode);
            }
        }
        currentchunk = undefined;
        resulthex = "";
        resultchrs = "";
    };
    for (let i = 0; i < data.length; i++) {
        let hexsep = (i == 0 ? "" : i % linesize == 0 ? "\n" : i % groupsize == 0 ? "  " : " ");
        let textsep = (i == 0 ? "" : i % linesize == 0 ? "\n" : i % groupsize == 0 ? " " : "");
        if (currentchunk && (i < currentchunk.offset || i >= currentchunk.offset + currentchunk.len)) {
            endchunk();
            //TODO yikes n^2, worst case currently is maptiles ~20k chunks
            currentchunk = chunks.find(q => q.offset <= i && q.offset + q.len > i);
        }
        else if (!currentchunk) {
            let newchunk = chunks.find(q => q.offset <= i && q.offset + q.len > i);
            if (newchunk) {
                endchunk();
            }
            currentchunk = newchunk;
        }
        let byte = data[i];
        resulthex += hexsep + byte.toString(16).padStart(2, "0");
        resultchrs += textsep + (byte < 0x20 ? "." : String.fromCharCode(byte));
    }
    endchunk();
    return { hexels, textels, labelel };
}
function UnknownFileViewer(p) {
    let finalext = p.ext.split(".").at(-1);
    let istext = ["json", "jsonc", "ts", "js"].includes(finalext);
    let [override, setoverride] = React.useState(null);
    if (override?.ext == p.ext) {
        istext = override.istext;
    }
    return (React.createElement(React.Fragment, null,
        React.createElement("input", { type: "button", className: "sub-btn", value: istext ? "View hex" : "View text", onClick: e => setoverride({ ext: p.ext, istext: !istext }) }),
        React.createElement(CopyButton, { getText: () => istext ? p.data.toString("utf8") : p.data.toString("hex") }),
        istext && React.createElement(SimpleTextViewer, { file: p.data.toString("utf8") }),
        !istext && React.createElement(TrivialHexViewer, { data: p.data })));
}
function TrivialHexViewer(p) {
    let { resulthex, resultchrs } = bufToHexView(p.data);
    return (React.createElement("table", null,
        React.createElement("tbody", null,
            React.createElement("tr", null,
                React.createElement("td", { className: "mv-hexrow" }, resulthex),
                React.createElement("td", { className: "mv-hexrow" }, resultchrs)))));
}
function AnnotatedHexViewer(p) {
    let { hexels, textels, labelel } = React.useMemo(() => annotatedHexDom(p.data, p.chunks), [p.data, p.chunks]);
    return (React.createElement("table", null,
        React.createElement("tbody", null,
            React.createElement("tr", null,
                React.createElement(DomWrap, { tagName: "td", el: hexels, className: "mv-hexrow" }),
                React.createElement(DomWrap, { tagName: "td", el: textels, className: "mv-hexrow" }),
                React.createElement("td", null,
                    React.createElement(DomWrap, { el: labelel, className: "mv-hexlabel" }))))));
}
function FileDecodeErrorViewer(p) {
    let [mode, setmode] = React.useState("split");
    let [err, buffer] = React.useMemo(() => {
        let err = JSON.parse(p.file);
        let buffer = Buffer.from(err.originalFile, "hex");
        return [err, buffer];
    }, [p.file]);
    let clickstickylabel = (e) => {
        let target = findParentElement(e.currentTarget, el => el.tagName == "TR");
        let scrollparent = findParentElement(e.currentTarget, el => ["auto", "scroll"].includes(window.getComputedStyle(el).overflowY));
        if (!target || !scrollparent) {
            return;
        }
        let scrollbounds = scrollparent.getBoundingClientRect();
        let bounds = target.getBoundingClientRect();
        let isbelow = (bounds.top + bounds.bottom) / 2 > (scrollbounds.top + scrollbounds.bottom) / 2;
        let margin = scrollbounds.height / 4;
        scrollparent.scrollTop += (isbelow ? bounds.bottom - margin : bounds.top - scrollbounds.height + margin);
    };
    return (React.createElement("div", { className: "mv-hexrow" },
        React.createElement("div", null,
            React.createElement("input", { type: "button", className: classNames("sub-btn", { "active": mode == "split" }), onClick: e => setmode("split"), value: "split" }),
            React.createElement("input", { type: "button", className: classNames("sub-btn", { "active": mode == "full" }), onClick: e => setmode("full"), value: "full" }),
            React.createElement("input", { type: "button", className: "sub-btn", onClick: e => downloadBlob("file.bin", new Blob([toBlobPart(buffer)], { type: "application/octet-stream" })), value: "download original" }),
            React.createElement(CopyButton, { getText: () => bufToHexView(buffer).resulthex })),
        err.error,
        mode == "full" && (React.createElement(AnnotatedHexViewer, { data: buffer, chunks: err.chunks })),
        mode == "split" && (React.createElement(React.Fragment, null,
            React.createElement("div", null, "Chunks"),
            React.createElement("table", null,
                React.createElement("tbody", null, err.chunks.map((q, i) => {
                    let hexview = bufToHexView(buffer.slice(q.offset, q.offset + q.len));
                    return (React.createElement("tr", { key: q.offset + "-" + i },
                        React.createElement("td", null, hexview.resulthex),
                        React.createElement("td", null, hexview.resultchrs),
                        React.createElement("td", null, q.len > 16 * 20 ? React.createElement("span", { className: "mv-hexstickylabel", onClick: clickstickylabel }, q.label) : q.label)));
                }))))),
        React.createElement("div", null, "State"),
        prettyJson(err.state)));
}
function SimpleTextViewer(p) {
    return (React.createElement("div", { className: "mv-hexrow" }, p.file));
}
export function FileDisplay(p) {
    let el = null;
    let cnvref = React.useRef(null);
    let ext = (p.file.name.match(/\.([\w\.]+)$/i)?.[1] ?? "").toLowerCase();
    let fileBuffer = () => {
        return (typeof p.file.data == "string" ? Buffer.from(p.file.data, "utf8") : p.file.data);
    };
    let fileText = () => {
        return (typeof p.file.data == "string" ? p.file.data : p.file.data.toString("utf8"));
    };
    if (ext == "hexerr.json") {
        el = React.createElement(FileDecodeErrorViewer, { file: fileText() });
    }
    else if (ext == "ui.json") {
        el = React.createElement(RsUIViewer, { data: fileText() });
    }
    else if (ext == "cs2.json") {
        el = React.createElement(ClientScriptViewer, { data: fileText() });
    }
    else if (ext == "html") {
        el = React.createElement("iframe", { srcDoc: fileText(), sandbox: "allow-scripts", style: { width: "95%", height: "95%" } });
    }
    else if (ext == "rstex") {
        let tex = new ParsedTexture(fileBuffer(), false, false);
        cnvref.current ?? (cnvref.current = document.createElement("canvas"));
        const cnv = cnvref.current;
        tex.toWebgl().then(img => drawTexture(cnv.getContext("2d"), img));
        el = React.createElement(CanvasView, { canvas: cnvref.current, fillHeight: true });
    }
    else if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) {
        el = React.createElement(BlobImage, { file: fileBuffer(), ext: ext, fillHeight: true });
    }
    else if (ext == "jaga" || ext == "ogg") {
        let buf = fileBuffer();
        let header = buf.readUint32BE(0);
        if (header == 0x4a414741) { //"JAGA"
            let parts = parse.audio.read(buf, new CallbackCacheLoader(() => { throw new Error("dummy cache"); }, false));
            el = (React.createElement(React.Fragment, null, parts.chunks.map((q, i) => (q.data ? React.createElement(BlobAudio, { key: i, file: q.data, autoplay: i == 0 }) : React.createElement("div", { key: i }, q.fileid)))));
        }
        else if (header == 0x4f676753) { //"OggS"
            el = React.createElement(BlobAudio, { file: fileBuffer(), autoplay: true });
        }
        else {
            console.log("unexpected header", header, header.toString(16));
        }
    }
    else {
        el = React.createElement(UnknownFileViewer, { data: fileBuffer(), ext: ext });
    }
    return el;
}
export function FileViewer(p) {
    return (React.createElement("div", { style: { display: "grid", gridTemplateRows: "auto 1fr" } },
        React.createElement("div", { className: "mv-modal-head" },
            React.createElement("span", null, p.file.name),
            React.createElement("span", { style: { float: "right", marginLeft: "10px" }, onClick: e => downloadBlob(p.file.name, new Blob([toBlobPart(p.file.data)])) }, "download"),
            React.createElement("span", { style: { float: "right", marginLeft: "10px" }, onClick: e => p.onSelectFile(null) }, "x")),
        React.createElement("div", { style: { overflow: "auto", flex: "1", position: "relative" } },
            React.createElement(FileDisplay, { file: p.file }))));
}
