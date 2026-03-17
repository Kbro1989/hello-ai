import { Openrs2CacheSource, openrs2GetEffectiveBuildnr, validOpenrs2Caches } from "../cache/openrs2loader";
import { cacheMajors } from "../constants";
import { cacheFileDecodeModes } from "./filetypes";
import { testDecodeFile } from "./testdecode";
export async function fileHistory(output, outdir, mode, id, basecache, buildnrs) {
    let histsources = await validOpenrs2Caches();
    if (buildnrs) {
        histsources = histsources.filter(q => {
            let build = openrs2GetEffectiveBuildnr(q);
            return buildnrs.some(q => build >= q.start[0] && build <= q.end[0]);
        });
    }
    let decoder = cacheFileDecodeModes[mode]({});
    let allsources = function* () {
        if (basecache) {
            yield basecache;
        }
        for (let id of histsources) {
            yield new Openrs2CacheSource(id);
        }
    };
    let lastversion = null;
    let history = [];
    for (let source of allsources()) {
        if (output.state == "canceled") {
            break;
        }
        try {
            let sourcemeta = source.getCacheMeta();
            let sourcename = `${sourcemeta.name.replace(/:/g, "-")}-${source.getBuildNr()}`;
            let changed = false;
            let fileid = decoder.logicalToFile(source, id);
            let indexfile = await source.getCacheIndex(fileid.major);
            let filemeta = indexfile.at(fileid.minor);
            let newfile = null;
            let decoded = null;
            let success = true;
            let ext = "bin";
            if (filemeta) {
                let newarchive = await source.getFileArchive(filemeta);
                newfile = newarchive[fileid.subid]?.buffer;
                if (!newfile) {
                    throw new Error("invalid subid");
                }
                if (!lastversion?.file || Buffer.compare(newfile, lastversion.file) != 0) {
                    if (lastversion && filemeta.crc == lastversion.hash) {
                        console.log("file change detected without crc change");
                    }
                    changed = true;
                    if (decoder.parser) {
                        let res = testDecodeFile(decoder.parser, newfile, source);
                        decoded = res.getDebugFile("json");
                        success = res.success;
                        ext = "hexerr.json";
                    }
                    else {
                        try {
                            decoded = await decoder.read(newfile, id, source);
                            success = true;
                            ext = decoder.ext;
                        }
                        catch {
                            decoded = newfile;
                            success = false;
                            ext = "bin";
                        }
                    }
                }
            }
            else if (lastversion && lastversion.file) {
                changed = true;
            }
            if (changed) {
                if (!decoded) {
                    decoded = "";
                    ext = "";
                }
                let majorname = Object.entries(cacheMajors).find(([k, v]) => v == fileid.major)?.[0] ?? `unkown-${fileid.major}`;
                let status = (!decoded ? "empty" : success ? "pass" : "fail");
                let decodedname = `${status}-${majorname}-${fileid.minor}-${fileid.subid}-${sourcename}${ext && "."}${ext}`;
                lastversion = {
                    cacheids: [],
                    buildnr: [],
                    hash: filemeta?.crc ?? 0,
                    decoded,
                    decodedname,
                    file: newfile,
                };
                history.push(lastversion);
                await outdir.writeFile(decodedname, decoded ?? "");
            }
            lastversion.buildnr.push(source.getBuildNr());
            lastversion.cacheids.push(source.getCacheMeta().name);
        }
        catch (e) {
            output.log(`error while decoding diffing file ${id} in "${source.getCacheMeta().name}, ${source.getCacheMeta().descr}"`);
            //TODO use different stopping condition
            // return history;
        }
        finally {
            if (source != basecache) {
                source.close();
            }
        }
    }
    return history;
}
