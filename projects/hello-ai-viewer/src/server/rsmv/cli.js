import * as cmdts from "cmd-ts";
import { cliApi } from "./clicommands";
import { cliArguments } from "./cliparser";
import { CLIScriptFS, CLIScriptOutput } from "./scriptrunner";
let ctx = {
    getFs(fsname) { return new CLIScriptFS(fsname); },
    getConsole() { return new CLIScriptOutput(); }
};
let api = cliApi(ctx);
cmdts.run(api.subcommands, cliArguments());
