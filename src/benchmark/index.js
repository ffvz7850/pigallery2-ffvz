"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("../src/common/config/private/Config");
const ProjectPath_1 = require("../src/backend/ProjectPath");
const BenchmarkRunner_1 = require("./BenchmarkRunner");
const Utils_1 = require("../src/common/Utils");
const BMConfig_1 = require("./BMConfig");
const DirectoryDTO_1 = require("../src/common/entities/DirectoryDTO");
Config_1.Config.Media.folder = BMConfig_1.BMConfig.path;
ProjectPath_1.ProjectPath.reset();
const RUNS = BMConfig_1.BMConfig.RUNS;
let resultsText = '';
const printLine = (text) => {
    resultsText += text + '\n';
};
const printHeader = async (statistic) => {
    const dt = new Date();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    printLine('## PiGallery2 v' + require('./../package.json').version +
        ', ' + Utils_1.Utils.zeroPrefix(dt.getDate(), 2) +
        '.' + Utils_1.Utils.zeroPrefix(dt.getMonth() + 1, 2) +
        '.' + dt.getFullYear());
    if (Config_1.Config.Environment && Config_1.Config.Environment.buildCommitHash) {
        printLine('**Version**: v' + Config_1.Config.Environment.appVersion + ', built at: ' + new Date(Config_1.Config.Environment.buildTime) + ', git commit:' + Config_1.Config.Environment.buildCommitHash);
    }
    printLine('**System**: ' + BMConfig_1.BMConfig.system);
    printLine('\n**Gallery**: ' + statistic + '\n');
};
const printTableHeader = () => {
    printLine('| Action | Sub action | Average Duration | Result  |');
    printLine('|:------:|:----------:|:----------------:|:-------:|');
};
const printExperimentResult = (result, isSubResult = false) => {
    console.log('benchmarked: ' + result.name);
    const fileSize = (size) => {
        const postFixes = ['B', 'KB', 'MB', 'GB', 'TB'];
        let index = 0;
        while (size > 1000 && index < postFixes.length - 1) {
            size /= 1000;
            index++;
        }
        return size.toFixed(2) + postFixes[index];
    };
    let details = '-';
    if (result.items) {
        details = 'items: ' + result.items.length +
            ', size: ' + fileSize(JSON.stringify(result.items).length);
    }
    if (result.contentWrapper) {
        if (result.contentWrapper.directory) {
            details = 'media: ' + result.contentWrapper.directory.media.length +
                ', directories: ' + result.contentWrapper.directory.directories.length +
                ', size: ' + fileSize(JSON.stringify(DirectoryDTO_1.DirectoryDTOUtils.removeReferences(result.contentWrapper.directory)).length);
        }
        else {
            details = 'media: ' + result.contentWrapper.searchResult.media.length +
                ', directories: ' + result.contentWrapper.searchResult.directories.length +
                ', size: ' + fileSize(JSON.stringify(result.contentWrapper.searchResult).length);
        }
    }
    if (isSubResult) {
        printLine('| | ' + result.name + ' | ' + (result.duration).toFixed(1) + ' ms | ' + details + ' |');
    }
    else {
        printLine('| **' + (result.experiment ? '`[' + result.experiment + ']`' : '') + result.name + '** | | **' + (result.duration).toFixed(1) + ' ms** | **' + details + '** |');
    }
    if (result.subBenchmarks && result.subBenchmarks.length > 1) {
        for (const item of result.subBenchmarks) {
            printExperimentResult(item, true);
        }
    }
};
const printResult = (results) => {
    for (const result of results) {
        printExperimentResult(result);
    }
};
const run = async () => {
    console.log('Running, RUNS:' + RUNS);
    const start = Date.now();
    const bm = new BenchmarkRunner_1.BenchmarkRunner(RUNS);
    // header
    await printHeader(await bm.getStatistic());
    printTableHeader();
    if (BMConfig_1.BMConfig.Benchmarks.bmScanDirectory) {
        printResult(await bm.bmScanDirectory());
    }
    if (BMConfig_1.BMConfig.Benchmarks.bmSaveDirectory) {
        printResult(await bm.bmSaveDirectory());
    }
    if (BMConfig_1.BMConfig.Benchmarks.bmListDirectory) {
        printResult(await bm.bmListDirectory());
    }
    if (BMConfig_1.BMConfig.Benchmarks.bmListPersons) {
        printResult(await bm.bmListPersons());
    }
    if (BMConfig_1.BMConfig.Benchmarks.bmAllSearch) {
        (await bm.bmAllSearch()).forEach(res => printResult(res.result));
    }
    if (BMConfig_1.BMConfig.Benchmarks.bmAutocomplete) {
        printResult(await bm.bmAutocomplete('a'));
    }
    printLine('*Measurements run ' + RUNS + ' times and an average was calculated.');
    console.log(resultsText);
    console.log('run for : ' + ((Date.now() - start)).toFixed(1) + 'ms');
};
run().then(console.log).catch(console.error);
//# sourceMappingURL=index.js.map