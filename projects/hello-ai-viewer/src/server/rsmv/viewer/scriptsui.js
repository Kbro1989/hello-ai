import { TypedEmitter, toArrayBufferView } from "../utils";
import { useEffect } from "react";
import * as React from "react";
import { TabStrip } from "./commoncontrols";
import { showModal } from "./jsonsearch";
import VR360Viewer from "../libs/vr360viewer";
//see if we have access to a valid electron import
let electron = null;
export class WebFsScriptFS {
    constructor(handle) {
        this.dirhandles = new Map();
        this.roothandle = handle;
        this.dirhandles.set("", handle);
    }
    async getDir(dir, create) {
        let parts = dir.split("/");
        let cdir = this.roothandle;
        let cpath = "";
        for (let p of parts) {
            if (p == "..") {
                throw new Error("unexpected");
            }
            if (p == "." || p == "") {
                continue;
            }
            cpath += p + "/";
            let subdir = this.dirhandles.get(cpath);
            if (!subdir) {
                subdir = await cdir.getDirectoryHandle(p, { create: create });
                this.dirhandles.set(cpath, subdir);
            }
            cdir = subdir;
        }
        return cdir;
    }
    async getFile(name, create) {
        let parts = name.split("/");
        let filename = parts.pop();
        let dir = await this.getDir(parts.join("/"), false);
        return dir.getFileHandle(filename, { create });
    }
    async mkDir(dir) {
        await this.getDir(dir, true);
    }
    async readDir(dirname) {
        let dir = await this.getDir(dirname, false);
        let files = [];
        for await (let [name, v] of dir.entries()) {
            files.push({ name, kind: v.kind });
        }
        return files;
    }
    async writeFile(name, data) {
        let file = await this.getFile(name, true);
        let str = await file.createWritable({ keepExistingData: false });
        await str.write(toArrayBufferView(data));
        await str.close();
    }
    async unlink(name) {
        throw new Error("not implemented");
        // let parts = name.split("/");
        // let filename = parts.pop()!;
        // let dir = await this.getDir(parts.join("/"), false);
        // dir.removeEntry(filename);
    }
    async copyFile(from, to, symlink) {
        await this.writeFile(to, await this.readFileBuffer(from));
    }
    async readFileBuffer(name) {
        let file = await this.getFile(name, false);
        return Buffer.from(await (await file.getFile()).arrayBuffer());
    }
    async readFileText(name) {
        let file = await this.getFile(name, false);
        return (await file.getFile()).text();
    }
}
function getsubnode(node, name) {
    if (node.kind != "directory") {
        return undefined;
    }
    if (name == "" || name == ".") {
        return node;
    }
    if (name == "..") {
        throw new Error("directory up (..) not allowed");
    }
    return node.files.get(name);
}
export class UIScriptFS extends TypedEmitter {
    constructor(output, backingfs = null) {
        super();
        this.rootmemfsnode = { name: ".", kind: "directory", files: new Map() };
        this.stallmkdir = null;
        this.totalfiles = 0;
        this.totalbacksaved = 0;
        this.output = output;
        this.backingfs = backingfs;
        this.backingfsstarted = !!backingfs;
    }
    getFileNode(name, parent) {
        let parts = name.split("/");
        let end = (!!parent ? parts.length - 1 : parts.length);
        let node = this.rootmemfsnode;
        for (let i = 0; i < end; i++) {
            let part = parts[i];
            let newnode = getsubnode(node, part);
            if (!newnode) {
                return null;
            }
            node = newnode;
        }
        return node;
    }
    async mkDir(name) {
        if (this.stallmkdir) {
            //prevent race condition when migrating to backing fs
            await this.stallmkdir;
        }
        if (this.backingfs) {
            await this.backingfs.mkDir(name);
        }
        else {
            let node = this.rootmemfsnode;
            let parts = name.split("/");
            for (let part of parts) {
                if (node.kind != "directory") {
                    throw new Error("trying to create directory where there is already a file");
                }
                let sub = getsubnode(node, part);
                if (!sub) {
                    sub = { name: part, kind: "directory", files: new Map() };
                    node.files.set(part, sub);
                }
                node = sub;
            }
        }
        this.emit("mkdir", name);
    }
    async writeFile(name, data) {
        if (this.backingfs) {
            this.totalfiles++;
            this.totalbacksaved++;
            await this.backingfs.writeFile(name, data);
        }
        else {
            let parent = this.getFileNode(name, true);
            if (!parent || parent.kind != "directory") {
                throw new Error("target directory doesn't exist");
            }
            let filename = name.split("/").at(-1);
            let fileentry = { name: filename, kind: "file", data };
            if (parent.files.has(filename)) {
                this.output?.log(`overwriting file "${name}"`);
            }
            else {
                this.totalfiles++;
            }
            parent.files.set(filename, fileentry);
        }
        this.emit("writefile", name);
    }
    async readFileBuffer(name) {
        let entry = this.getFileNode(name);
        if (!entry) {
            if (this.backingfs) {
                return this.backingfs.readFileBuffer(name);
            }
            else {
                throw new Error("file not found");
            }
        }
        if (entry.kind != "file") {
            throw new Error(`node for '${name}' is not a file`);
        }
        return (typeof entry.data == "string" ? Buffer.from(entry.data, "utf8") : entry.data);
    }
    async readFileText(name) {
        let entry = this.getFileNode(name);
        if (!entry) {
            if (this.backingfs) {
                return this.backingfs.readFileText(name);
            }
            else {
                throw new Error("file not found");
            }
        }
        if (entry.kind != "file") {
            throw new Error(`node for '${name}' is not a file`);
        }
        return (typeof entry.data == "string" ? entry.data : entry.data.toString("utf8"));
    }
    async readDir(dir) {
        let files = await this.backingfs?.readDir(dir) ?? [];
        let node = this.getFileNode(dir);
        if (node) {
            if (node.kind != "directory") {
                throw new Error("directory expected");
            }
            for (let entry of node.files.values()) {
                files.push({ name: entry.name, kind: entry.kind });
            }
        }
        return files;
    }
    unlink(name) {
        throw new Error("not implemented");
    }
    async copyFile(from, to, symlink) {
        this.totalfiles++;
        if (this.backingfs) {
            this.totalbacksaved++;
            await this.backingfs.copyFile(from, to, symlink);
        }
        else {
            let node = this.getFileNode(from);
            let toparent = this.getFileNode(to, true);
            if (!node) {
                throw new Error("file doesn't exist");
            }
            if (!toparent || toparent.kind != "directory") {
                throw new Error("symlink target directory doesn't exist");
            }
            toparent.files.set(to.split("/").at(-1), node);
        }
        this.emit("writefile", to);
    }
    async lateBindBackingFs(fs) {
        if (this.backingfsstarted) {
            throw new Error("UIScriptFS already has a backingfs");
        }
        this.backingfsstarted = true;
        //re-create all virtual dirs
        //1st pass is parallel to any virtual writing that might be going on. 2nd pass is blocking
        let copyfs = async (node, path, dirsonly) => {
            if (!dirsonly && node.kind == "file") {
                this.totalbacksaved++;
                await fs.writeFile(path, node.data);
                this.emit("download", path);
            }
            if (node.kind == "directory") {
                await fs.mkDir(path);
                for (let [name, sub] of node.files) {
                    if (!dirsonly || sub.kind == "directory") {
                        await copyfs(sub, `${path}/${sub.name}`, dirsonly);
                    }
                    if (!dirsonly) {
                        node.files.delete(name);
                    }
                }
            }
        };
        this.stallmkdir = copyfs(this.rootmemfsnode, ".", true);
        await this.stallmkdir;
        //all dirs are sync now, we can start writing to the backing fs
        this.backingfs = fs;
        this.stallmkdir = null;
        //don't await this
        copyfs(this.rootmemfsnode, ".", false);
    }
}
export class UIScriptOutput extends TypedEmitter {
    log(...args) {
        let str = args.join(" ");
        this.logs.push(str);
        this.emit("log", str);
    }
    setState(state) {
        this.state = state;
        this.emit("statechange", undefined);
    }
    setUI(el) {
        this.outputui = el;
        this.emit("statechange", undefined);
    }
    constructor() {
        super();
        this.state = "running";
        this.logs = [];
        this.outputui = null;
        this.fs = {};
    }
    makefs(name) {
        let fs = new UIScriptFS(this);
        this.fs[name] = fs;
        this.emit("statechange", undefined);
        return fs;
    }
    async run(fn, ...args) {
        try {
            return await fn(this, ...args);
        }
        catch (e) {
            console.warn(e);
            if (this.state != "canceled") {
                this.log(e);
                this.setState("error");
            }
            return null;
        }
        finally {
            if (this.state == "running") {
                this.setState("done");
            }
        }
    }
}
function forceUpdateReducer(i) { return i + 1; }
export function useForceUpdate() {
    const [, forceUpdate] = React.useReducer(forceUpdateReducer, 0);
    return forceUpdate;
}
export function useForceUpdateDebounce(delay = 50) {
    const forceUpdate = useForceUpdate();
    let ref = React.useRef(() => { });
    React.useMemo(() => {
        let timer = 0;
        let tick = () => {
            timer = 0;
            forceUpdate();
        };
        ref.current = () => {
            if (!timer) {
                timer = +setTimeout(tick, delay);
            }
        };
        return () => {
            clearTimeout(timer);
            timer = 0;
        };
    }, [forceUpdate, ref]);
    return ref.current;
}
export function VR360View(p) {
    let viewer = React.useRef(null);
    if (!viewer.current) {
        viewer.current = new VR360Viewer(p.img);
        viewer.current.cnv.style.width = "100%";
        viewer.current.cnv.style.height = "100%";
    }
    let currentimg = React.useRef(p.img);
    if (p.img != currentimg.current) {
        viewer.current.setImage(p.img);
        currentimg.current = p.img;
    }
    React.useEffect(() => () => viewer.current?.free(), []);
    let wrapper = React.useRef(null);
    let ref = (el) => {
        viewer.current?.cnv && el && el.appendChild(viewer.current?.cnv);
        wrapper.current = el;
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("div", null,
            React.createElement("input", { type: "button", className: "sub-btn", value: "Fullscreen", onClick: () => wrapper.current?.requestFullscreen() })),
        React.createElement("div", { ref: ref, style: { position: "relative", paddingBottom: "60%" } })));
}
export function DomWrap(p) {
    let ref = (el) => {
        p.el && el && el.replaceChildren(p.el);
    };
    let Tagname = p.tagName ?? "div";
    return React.createElement(Tagname, { ref: ref, style: p.style, className: p.className });
}
export function OutputUI(p) {
    let [tab, setTab] = React.useState("console");
    let forceUpdate = useForceUpdateDebounce();
    React.useEffect(() => {
        p.output?.on("statechange", forceUpdate);
        return () => { p.output?.off("statechange", forceUpdate); };
    }, [p.output]);
    if (!p.output) {
        return (React.createElement("div", null, "Waiting"));
    }
    let fstabmatch = tab.match(/^fs-(.*)$/);
    let selectedfs = fstabmatch && p.output && p.output.fs[fstabmatch[1]];
    let tabs = { console: "Console" };
    for (let fsname in p.output?.fs) {
        tabs["fs-" + fsname] = fsname;
    }
    return (React.createElement("div", null,
        React.createElement("div", null,
            "Script state: ",
            p.output.state,
            p.output.state == "running" && React.createElement("input", { type: "button", className: "sub-btn", value: "cancel", onClick: e => p.output?.setState("canceled") })),
        p.output.outputui && React.createElement("input", { type: "button", className: "sub-btn", value: "Script ui", onClick: e => showModal({ title: "Script output" }, React.createElement(DomWrap, { el: p.output?.outputui })) }),
        React.createElement(TabStrip, { value: tab, onChange: setTab, tabs: tabs }),
        tab == "console" && React.createElement(UIScriptConsole, { output: p.output }),
        selectedfs && React.createElement(UIScriptFiles, { fs: selectedfs, ctx: p.ctx })));
}
export function UIScriptFiles(p) {
    const initialMaxlist = 4000;
    let [maxlist, setMaxlist] = React.useState(initialMaxlist);
    let [folder, setfolder] = React.useState("");
    let [hasbacking, setbacking] = React.useState(false);
    let queueRender = useForceUpdateDebounce(50);
    let [files, folders, addfile, addfolder] = React.useMemo(() => {
        let files = new Set();
        let folders = new Set();
        let init = async () => {
            if (p.fs) {
                let all = await p.fs.readDir(folder);
                for (let entry of all) {
                    if (entry.kind == "file") {
                        files.add(entry.name);
                    }
                    if (entry.kind == "directory") {
                        folders.add(entry.name);
                    }
                }
            }
            else {
                files.clear();
                folders.clear();
            }
            queueRender();
        };
        let addfolder = (name) => {
            if (name.startsWith(folder)) {
                let subname = name.slice(folder.length).split("/")[0];
                if (subname == "") {
                    return;
                }
                if (!folders.has(subname)) {
                    folders.add(subname);
                    queueRender();
                }
            }
        };
        let addfile = (name) => {
            if (name.startsWith(folder) && name.indexOf("/", folder.length + 1) == -1) {
                files.add(name.slice(folder.length));
                queueRender();
            }
        };
        init();
        return [files, folders, addfile, addfolder];
    }, [p.fs, folder, hasbacking]);
    React.useEffect(() => {
        p.fs?.on("writefile", addfile);
        p.fs?.on("mkdir", addfolder);
        p.fs?.on("download", queueRender);
        return () => {
            p.fs?.off("writefile", queueRender);
            p.fs?.off("mkdir", addfolder);
            p.fs?.off("download", queueRender);
        };
    }, [p.fs, addfile, addfolder]);
    let openFile = React.useCallback(async (name) => {
        let data = await p.fs.readFileBuffer(`${folder}/${name}`);
        p.ctx.openFile({ fs: p.fs, name, data });
    }, [p.fs, p.ctx, folder]);
    let listkeydown = React.useCallback((e) => {
        if (p.fs && p.ctx.openedfile && e.key == "ArrowDown" || e.key == "ArrowUp") {
            e.preventDefault();
            //bit of a yikes, map behaves as a single linked list and i'm trying to not
            //piss of the god of JIT by writing a custom iterator
            let previous = null;
            let match = null;
            let grabnext = false;
            for (let file of files) {
                if (grabnext) {
                    match = file;
                    break;
                }
                else if (file == p.ctx.openedfile?.name) {
                    if (e.key == "ArrowUp") {
                        match = previous;
                        break;
                    }
                    else {
                        grabnext = true;
                    }
                }
                previous = file;
            }
            if (match) {
                openFile(match);
            }
        }
    }, [p.fs, files, openFile]);
    //expose the fs to script, but make sure we don't leak it after it's gone from ui
    useEffect(() => {
        globalThis.scriptfs = p.fs;
        return () => {
            globalThis.scriptfs = null;
        };
    });
    if (!files) {
        return React.createElement("div", null);
    }
    else {
        let filelist = [];
        if (folder != "") {
            filelist.push(React.createElement("div", { key: "..", onClick: e => setfolder(folder.split("/").slice(0, -1).join("/")) }, "../"));
        }
        for (let subfolder of folders) {
            filelist.push(React.createElement("div", { key: subfolder, onClick: e => setfolder(`${folder}/${subfolder}`) },
                subfolder,
                "/"));
        }
        for (let name of files) {
            if (filelist.length > maxlist) {
                break;
            }
            filelist.push(React.createElement("div", { key: name, onClick: e => openFile(name), style: name == p.ctx.openedfile?.name ? { background: "black" } : undefined }, name));
        }
        let clicksave = async () => {
            if (!p.fs) {
                return;
            }
            let subfs;
            // if (electron) {
            // 	let dir: Electron.OpenDialogReturnValue = await electron.ipcRenderer.invoke("openfolder", path.resolve(process.env.HOME!, "downloads"));
            // 	if (dir.canceled || !dir.filePaths[0]) { return; }
            // 	subfs = new CLIScriptFS(dir.filePaths[0]);
            // } else {
            let dir = await showDirectoryPicker({ mode: "readwrite", startIn: "downloads" });
            await dir.requestPermission({ mode: "readwrite" });
            subfs = new WebFsScriptFS(dir);
            // }
            await p.fs.lateBindBackingFs(subfs);
            setbacking(true);
        };
        //TODO file dowload counter
        return (React.createElement("div", null,
            p.fs && !p.fs.backingfsstarted && React.createElement("input", { type: "button", className: "sub-btn", value: "Save files " + p.fs.totalfiles, onClick: clicksave }),
            p.fs?.backingfsstarted && React.createElement("div", null, p.fs.totalbacksaved != p.fs.totalfiles ? `Saving to disk: ${p.fs.totalbacksaved}/${p.fs.totalfiles}` : `Saved to disk ${p.fs.totalbacksaved}`),
            folder != "" && (React.createElement("div", null,
                "Current folder: ",
                folder.split("/").flatMap((q, i) => [
                    React.createElement("span", { key: i * 2, onClick: e => setfolder(folder.split("/").slice(0, i + 1).join("/")) }, q),
                    React.createElement("span", { key: i * 2 + 1 }, "/")
                ]))),
            files.size > maxlist && React.createElement("div", null,
                "Only showing first ",
                maxlist,
                " files"),
            React.createElement("div", { tabIndex: 0, onKeyDownCapture: listkeydown },
                filelist,
                files.size > maxlist && React.createElement("input", { type: "button", className: "sub-btn", onClick: e => setMaxlist(maxlist + 4000), value: `Show more(${maxlist} / ${files.size})` }))));
    }
}
export function UIScriptConsole(p) {
    let [el, setEl] = React.useState(null);
    useEffect(() => {
        if (el && p.output) {
            let onlog = (e) => {
                let line = document.createElement("div");
                line.innerText = e;
                el.appendChild(line);
            };
            p.output.on("log", onlog);
            p.output.logs.forEach(onlog);
            return () => {
                p.output.off("log", onlog);
                el.innerHTML = "";
            };
        }
    }, [p.output, el]);
    return (React.createElement("div", { ref: setEl }));
}
