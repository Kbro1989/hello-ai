import { ThreeJsRenderer } from "./threejsrender";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import * as datastore from "idb-keyval";
import { EngineCache, ThreejsSceneCache } from "../3d/modeltothree";
import { ModelBrowser, RendererControls } from "./scenenodes";
import { UIScriptFS } from "./scriptsui";
import { UIContext, FileViewer, CacheSelector, openSavedCache } from "./maincomponents";
import classNames from "classnames";
import { cliApi } from "../clicommands";
import { CLIScriptOutput } from "../scriptrunner";
import * as cmdts from "cmd-ts";
export function unload(root) {
    root.unmount();
}
export function start(rootelement, serviceworker) {
    window.addEventListener("keydown", e => {
        if (e.key == "F5") {
            document.location.reload();
        }
        // if (e.key == "F12") { electron.remote.getCurrentWebContents().toggleDevTools(); }
    });
    let ctx = new UIContext(rootelement, serviceworker ?? false);
    let root = ReactDOM.createRoot(rootelement);
    root.render(React.createElement(App, { ctx: ctx }));
    globalThis.cli = async (args) => {
        let cliconsole = new CLIScriptOutput();
        let outputs = {};
        let clictx = {
            getConsole() { return cliconsole; },
            getFs(name) { return outputs[name] ?? (outputs[name] = new UIScriptFS(null)); },
            getDefaultCache() { return ctx.source; }
        };
        let api = cliApi(clictx);
        let res = await cmdts.runSafely(api.subcommands, args.split(/\s+/g));
        if (cliconsole.state == "running") {
            cliconsole.setState(res._tag == "error" ? "error" : "done");
        }
        if (res._tag == "error") {
            console.error(res.error.config.message);
            outputs.code = res.error.config.exitCode;
        }
        else {
            outputs.code = 0;
            // console.log("cmd completed", res.value);
        }
        return outputs;
    };
    return root;
}
class App extends React.Component {
    constructor(p) {
        super(p);
        this.state = {
            openedFile: this.props.ctx.openedfile
        };
        this.openCache = this.openCache.bind(this);
        this.initCnv = this.initCnv.bind(this);
        this.closeCache = this.closeCache.bind(this);
        this.stateChanged = this.stateChanged.bind(this);
        this.resized = this.resized.bind(this);
        this.openFile = this.openFile.bind(this);
        (async () => {
            try {
                let c = await Promise.race([
                    datastore.get("openedcache"),
                    new Promise((d, f) => setTimeout(f, 1000))
                ]);
                if (c) {
                    this.openCache(c);
                }
            }
            catch (e) {
                console.log("failed to open indexedDB openedcache, fallback to localStorage (without webfs support)");
                try {
                    let cache = JSON.parse(localStorage.rsmv_openedcache);
                    this.openCache(cache);
                }
                catch (e) { }
            }
            ;
        })();
    }
    async openCache(source) {
        let cache = await openSavedCache(source, true);
        if (cache) {
            globalThis.source = cache;
            this.props.ctx.setCacheSource(cache);
            try {
                let engine = await EngineCache.create(cache);
                console.log("engine loaded", cache.getBuildNr());
                let scene = await ThreejsSceneCache.create(engine);
                this.props.ctx.setSceneCache(scene);
                globalThis.sceneCache = scene;
                globalThis.engine = engine;
            }
            catch (e) {
                console.log("failed to create scenecache");
                console.error(e);
            }
        }
        ;
    }
    initCnv(cnv) {
        this.props.ctx.setRenderer(cnv ? new ThreeJsRenderer(cnv) : null);
    }
    closeCache() {
        datastore.del("openedcache");
        localStorage.rsmv_openedcache = "";
        navigator.serviceWorker?.ready.then(q => q.active?.postMessage({ type: "sethandle", handle: null }));
        this.props.ctx.source?.close();
        this.props.ctx.setCacheSource(null);
        this.props.ctx.setSceneCache(null);
    }
    stateChanged() {
        this.forceUpdate();
    }
    resized() {
        this.forceUpdate();
    }
    componentDidMount() {
        this.props.ctx.on("openfile", this.openFile);
        this.props.ctx.on("statechange", this.stateChanged);
        window.addEventListener("resize", this.resized);
    }
    componentWillUnmount() {
        this.props.ctx.off("openfile", this.openFile);
        this.props.ctx.off("statechange", this.stateChanged);
        window.removeEventListener("resize", this.resized);
        this.closeCache();
    }
    openFile(file) {
        this.setState({ openedFile: file });
    }
    render() {
        let width = this.props.ctx.rootElement.clientWidth;
        let vertical = width < 550;
        let cachemeta = this.props.ctx.source?.getCacheMeta();
        return (React.createElement("div", { className: classNames("mv-root", "mv-style", { "mv-root--vertical": vertical }) },
            React.createElement("canvas", { className: "mv-canvas", ref: this.initCnv, style: { display: this.state.openedFile ? "none" : "block" } }),
            this.state.openedFile && React.createElement(FileViewer, { file: this.state.openedFile, onSelectFile: this.props.ctx.openFile }),
            React.createElement("div", { className: "mv-sidebar" },
                !this.props.ctx.source && (React.createElement(React.Fragment, null,
                    React.createElement(CacheSelector, { onOpen: this.openCache }),
                    React.createElement("div", { style: { flex: "1" } }),
                    React.createElement("div", { style: { textAlign: "center" } },
                        "Go to ",
                        React.createElement("a", { href: "https://runeapps.org/modelviewer_about" }, "RuneApps"),
                        " for more info. Source code hosted at ",
                        React.createElement("a", { href: "https://github.com/skillbert/rsmv", target: "_blank" }, "github.com/skillbert/rsmv")))),
                cachemeta && (React.createElement(React.Fragment, null,
                    React.createElement("input", { type: "button", className: "sub-btn", onClick: this.closeCache, value: `Close ${cachemeta.name}`, title: cachemeta.descr }),
                    React.createElement(RendererControls, { ctx: this.props.ctx }),
                    React.createElement(ModelBrowser, { ctx: this.props.ctx }))))));
    }
}
