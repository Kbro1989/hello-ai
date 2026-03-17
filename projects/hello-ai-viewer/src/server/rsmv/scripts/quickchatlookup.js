import { parse } from "../opdecoder";
import { cacheMajors } from "../constants";
import prettyJson from "json-stringify-pretty-compact";
export async function quickChatLookup(output, outdir, source) {
    let catarch = await source.getArchiveById(cacheMajors.quickchat, 0);
    let linesarch = await source.getArchiveById(cacheMajors.quickchat, 1);
    let cats = [];
    for (let file of catarch) {
        cats[file.fileid] = parse.quickchatCategories.read(file.buffer, source);
    }
    let lines = [];
    for (let file of linesarch) {
        lines[file.fileid] = parse.quickchatLines.read(file.buffer, source);
    }
    let hotkeys = {};
    let visited = new Map();
    let iter = (cat, hotkey) => {
        if (visited.has(cat)) {
            return;
        }
        visited.set(cat, true);
        let hotkeycounter = 1;
        let gethotkey = (key) => {
            if (key != 0) {
                return hotkey + String.fromCharCode(key);
            }
            return hotkey + ((hotkeycounter++) + "").slice(-1);
        };
        for (let child of cat.subcategories ?? []) {
            iter(cats[child.id], gethotkey(child.hotkey));
        }
        for (let line of cat.lines ?? []) {
            let lineobj = lines[line.id];
            hotkeys[gethotkey(line.hotkey)] = lineobj;
        }
    };
    iter(cats[85], "");
    await outdir.writeFile("quickchat.json", prettyJson(hotkeys));
}
