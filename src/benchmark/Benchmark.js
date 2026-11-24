"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Benchmark = void 0;
const Utils_1 = require("../src/common/Utils");
const Message_1 = require("../src/common/entities/Message");
const Experiments_1 = require("./Experiments");
/**
 * This class converts PiGallery2 Routers to benchamrkable steps to the Benchmark class
 */
class BMExpressApp {
    constructor(benchmark) {
        this.benchmark = benchmark;
    }
    get(match, ...functions) {
        functions.forEach((f) => {
            this.benchmark.addAStep({
                name: this.camelToSpaceSeparated(f.name),
                fn: (request) => this.nextToPromise(f, request)
            });
        });
    }
    camelToSpaceSeparated(text) {
        const result = (text.replace(/([A-Z])/g, ' $1')).toLocaleLowerCase();
        return result.charAt(0).toUpperCase() + result.slice(1);
    }
    nextToPromise(fn, request) {
        return new Promise((resolve, reject) => {
            const response = {
                header: () => {
                },
                json: (data) => {
                    resolve(data);
                }
            };
            fn(request, response, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(request.resultPipe);
            });
        });
    }
}
class Benchmark {
    constructor(name, request = {}, beforeEach, afterEach, beforeAll, afterAll) {
        this.steps = [];
        this.name = name;
        this.request = request;
        this.beforeEach = beforeEach;
        this.afterEach = afterEach;
        this.beforeAll = beforeAll;
        this.afterAll = afterAll;
        this.bmExpressApp = new BMExpressApp(this);
    }
    get BmExpressApp() {
        return this.bmExpressApp;
    }
    async run(RUNS) {
        const ret = [];
        const r = async () => {
            if (this.beforeAll) {
                await this.beforeAll();
            }
            ret.push(await this.runAnExperiment(RUNS));
            if (this.afterAll) {
                await this.afterAll();
            }
        };
        await r();
        for (const exp of Object.values(Experiments_1.Experiments)) {
            for (const group of Object.values(exp.groups)) {
                Experiments_1.ActiveExperiments[exp.name] = group;
                await r();
                ret[ret.length - 1].experiment = exp.name + '=' + group;
            }
            delete Experiments_1.ActiveExperiments[exp.name];
        }
        return ret;
    }
    async runAnExperiment(RUNS) {
        console.log('Running benchmark: ' + this.name);
        const scanned = await this.scanSteps();
        const start = process.hrtime();
        let skip = 0;
        const stepTimer = new Array(this.steps.length).fill(0);
        for (let i = 0; i < RUNS; i++) {
            if (this.beforeEach) {
                const startSkip = process.hrtime();
                await this.beforeEach();
                const endSkip = process.hrtime(startSkip);
                skip += (endSkip[0] * 1000 + endSkip[1] / 1000000);
            }
            await this.runOneRound(stepTimer);
            if (this.afterEach) {
                const startSkip = process.hrtime();
                await this.afterEach();
                const endSkip = process.hrtime(startSkip);
                skip += (endSkip[0] * 1000 + endSkip[1] / 1000000);
            }
        }
        const end = process.hrtime(start);
        const duration = (end[0] * 1000 + end[1] / 1000000 - skip) / RUNS;
        const ret = this.outputToBMResult(this.name, scanned[scanned.length - 1]);
        ret.duration = duration;
        ret.subBenchmarks = scanned.map((o, i) => {
            const stepBm = this.outputToBMResult(this.steps[i].name, o);
            stepBm.duration = stepTimer[i] / RUNS;
            return stepBm;
        });
        return ret;
    }
    outputToBMResult(name, output) {
        if (output) {
            if (Array.isArray(output)) {
                return {
                    name,
                    duration: null,
                    items: output,
                };
            }
            if (output.directory || output.searchResult || output.notModified) {
                return {
                    name,
                    duration: null,
                    contentWrapper: output
                };
            }
            if (output instanceof Message_1.Message) {
                const msg = output.result;
                if (Array.isArray(msg)) {
                    return {
                        name,
                        duration: null,
                        items: msg,
                    };
                }
                if (msg.directory || msg.searchResult || msg.notModified) {
                    return {
                        name,
                        duration: null,
                        contentWrapper: msg
                    };
                }
            }
        }
        return {
            name,
            duration: null
        };
    }
    async scanSteps() {
        const request = Utils_1.Utils.clone(this.request);
        const stepOutput = new Array(this.steps.length);
        for (let j = 0; j < this.steps.length; ++j) {
            if (this.beforeEach) {
                await this.beforeEach();
            }
            for (let i = 0; i <= j; ++i) {
                stepOutput[j] = await this.steps[i].fn(request);
            }
            if (this.afterEach) {
                await this.afterEach();
            }
        }
        return stepOutput;
    }
    async runOneRound(stepTimer) {
        const request = Utils_1.Utils.clone(this.request);
        for (let i = 0; i < this.steps.length; ++i) {
            const start = process.hrtime();
            await this.steps[i].fn(request);
            const end = process.hrtime(start);
            stepTimer[i] += (end[0] * 1000 + end[1] / 1000000);
        }
        return stepTimer;
    }
    addAStep(step) {
        this.steps.push(step);
    }
}
exports.Benchmark = Benchmark;
//# sourceMappingURL=Benchmark.js.map