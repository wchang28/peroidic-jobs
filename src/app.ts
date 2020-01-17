import * as fs from "fs";
import * as pp from "periodic-polling";
import {CGIIO, StringReceiver} from "helper-ios";
import {PassThrough, pipeline} from "stream";
import {promisify} from "util";
const pipelineP = promisify(pipeline);

interface JobCmd {
    command: string;
    args?: string[];
    cwd?: string;
    env?: any;
}

interface JobDef {
    intervalSec: number;
    cmd: JobCmd
}

const jobDefsFile = process.env["JOB_DEFS_JSON"];
if (!jobDefsFile) {
    console.error(`env. vars. "JOB_DEFS_JSON" is required`);
    process.exit(1);
}

const jobDefs = JSON.parse(fs.readFileSync(jobDefsFile, "utf8")) as JobDef[];

const jobs = jobDefs.map((jobDef) => {
    const polling = pp.PeriodicPolling.get<void>(
        async (pollInfo) => {
            const cgiio = new CGIIO(() => jobDef.cmd);
            const pt = new PassThrough();
            const sr = new StringReceiver();
            pt.end();
            await pipelineP(pt, cgiio, sr);
            console.log(sr.text);
        }
        ,jobDef.intervalSec
    );
    polling.start();
    return polling; 
});
