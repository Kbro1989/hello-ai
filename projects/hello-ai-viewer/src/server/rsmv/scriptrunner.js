import path from "path";
import fs from "fs";
export function naiveDirname(filename) {
    return filename.split("/").slice(0, -1).join("/");
}
export class CLIScriptFS {
    constructor(dir) {
        this.copyOnSymlink = true;
        this.dir = path.resolve(dir);
        if (dir) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    convertPath(sub) {
        let target = path.resolve(this.dir, sub.replace(/^\//g, ""));
        //make sure the result is indeed a subfolder of the fs
        let rel = path.relative(this.dir, target);
        if (target != this.dir && (rel.startsWith("..") || path.isAbsolute(rel))) {
            throw new Error("Error while converting CLIScriptFS path");
        }
        return target;
    }
    mkDir(name) {
        return fs.promises.mkdir(this.convertPath(name), { recursive: true });
    }
    writeFile(name, data) {
        return fs.promises.writeFile(this.convertPath(name), data);
    }
    readFileBuffer(name) {
        return fs.promises.readFile(this.convertPath(name));
    }
    readFileText(name) {
        return fs.promises.readFile(this.convertPath(name), "utf-8");
    }
    async readDir(name) {
        let files = await fs.promises.readdir(this.convertPath(name), { withFileTypes: true });
        return files.map(q => ({ name: q.name, kind: (q.isDirectory() ? "directory" : "file") }));
    }
    unlink(name) {
        return fs.promises.unlink(this.convertPath(name));
    }
    copyFile(from, to, symlink) {
        if (!symlink || this.copyOnSymlink) {
            //don't actually symliink because its weird in windows
            return fs.promises.copyFile(this.convertPath(from), this.convertPath(to));
        }
        else {
            return fs.promises.symlink(this.convertPath(to), this.convertPath(from));
        }
    }
}
export class CLIScriptOutput {
    constructor() {
        this.state = "running";
        //bind instead of call so the original call site is retained while debugging
        this.log = console.log.bind(console);
    }
    setUI(ui) {
        if (ui && typeof document != "undefined") {
            document.body.appendChild(ui);
        }
    }
    setState(state) {
        this.state = state;
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
