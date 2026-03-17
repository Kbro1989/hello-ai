import { filesource, cliArguments } from "../cliparser";
import { run, command, number, option } from "cmd-ts";
import { cacheMajors, cacheMapFiles } from "../constants";
import { parse } from "../opdecoder";
var worldStride = 128;
let cmd = command({
    name: "download",
    args: {
        ...filesource,
        locid: option({ long: "id", short: "i", type: number })
    },
    handler: async (args) => {
        let source = await args.source();
        let index = await source.getCacheIndex(cacheMajors.mapsquares);
        let result = [];
        for (let sq of index) {
            if (!sq) {
                continue;
            }
            let chunkx = sq.minor % worldStride;
            let chunkz = Math.floor(sq.minor / worldStride);
            let chunkarch = await source.getFileArchive(sq);
            let locsconfig = sq.subindices.indexOf(cacheMapFiles.locations);
            if (locsconfig != -1) {
                let locs = parse.mapsquareLocations.read(chunkarch[locsconfig].buffer, source);
                for (let loc of locs.locations) {
                    if (loc.id == args.locid) {
                        result.push(...loc.uses.map(q => ({
                            chunkx, chunkz,
                            subx: q.x, subz: q.y
                        })));
                    }
                }
            }
        }
        console.log(result);
    }
});
run(cmd, cliArguments());
