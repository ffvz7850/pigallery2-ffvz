"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkRunner = exports.BMIndexingManager = void 0;
const Config_1 = require("../src/common/config/private/Config");
const ObjectManagers_1 = require("../src/backend/model/ObjectManagers");
const DiskManager_1 = require("../src/backend/model/fileaccess/DiskManager");
const IndexingManager_1 = require("../src/backend/model/database/IndexingManager");
const path = require("path");
const fs = require("fs");
const Utils_1 = require("../src/common/Utils");
const PrivateConfig_1 = require("../src/common/config/private/PrivateConfig");
const ProjectPath_1 = require("../src/backend/ProjectPath");
const Benchmark_1 = require("./Benchmark");
const IndexingJob_1 = require("../src/backend/model/jobs/jobs/IndexingJob");
const ContentWrapper_1 = require("../src/common/entities/ContentWrapper");
const GalleryManager_1 = require("../src/backend/model/database/GalleryManager");
const PersonManager_1 = require("../src/backend/model/database/PersonManager");
const GalleryRouter_1 = require("../src/backend/routes/GalleryRouter");
const PersonRouter_1 = require("../src/backend/routes/PersonRouter");
const SearchQueryDTO_1 = require("../src/common/entities/SearchQueryDTO");
const SearchQueryParser_1 = require("../src/common/SearchQueryParser");
const SessionManager_1 = require("../src/backend/model/database/SessionManager");
class BMIndexingManager extends IndexingManager_1.IndexingManager {
    async saveToDB(scannedDirectory) {
        return super.saveToDB(scannedDirectory);
    }
}
exports.BMIndexingManager = BMIndexingManager;
class BMGalleryRouter extends GalleryRouter_1.GalleryRouter {
    static addDirectoryList(app) {
        GalleryRouter_1.GalleryRouter.addDirectoryList(app);
    }
    static addSearch(app) {
        GalleryRouter_1.GalleryRouter.addSearch(app);
    }
    static addAutoComplete(app) {
        GalleryRouter_1.GalleryRouter.addAutoComplete(app);
    }
}
class BMPersonRouter extends PersonRouter_1.PersonRouter {
    static addGetPersons(app) {
        PersonRouter_1.PersonRouter.addGetPersons(app);
    }
}
class BenchmarkRunner {
    constructor(RUNS) {
        this.RUNS = RUNS;
        this.inited = false;
        this.biggestDirPath = null;
        this.requestTemplate = {
            requestPipe: null,
            params: {},
            query: {},
            session: {}
        };
        this.resetDB = async () => {
            await ObjectManagers_1.ObjectManagers.reset();
            await fs.promises.rm(ProjectPath_1.ProjectPath.DBFolder, { recursive: true, force: true });
            Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
            Config_1.Config.Jobs.scheduled = [];
            await ObjectManagers_1.ObjectManagers.getInstance().init();
        };
        Config_1.Config.Users.authenticationRequired = false;
        this.session = { user: { projectionKey: SessionManager_1.SessionManager.NO_PROJECTION_KEY } };
    }
    async bmSaveDirectory() {
        const dir = await DiskManager_1.DiskManager.scanDirectory(this.biggestDirPath);
        const bm = new Benchmark_1.Benchmark('Saving directory to DB', null, () => this.resetDB(), null, async () => {
            await this.init();
            await this.setupDB();
        });
        bm.addAStep({
            name: 'Saving directory to DB',
            fn: () => {
                const im = new BMIndexingManager();
                return im.saveToDB(dir);
            }
        });
        return await bm.run(this.RUNS);
    }
    async bmScanDirectory() {
        await this.init();
        const bm = new Benchmark_1.Benchmark('Scanning directory', {}, null, null, async () => {
            await this.init();
        });
        bm.addAStep({
            name: 'Scanning directory',
            fn: async () => ContentWrapper_1.ContentWrapperUtils.build(await DiskManager_1.DiskManager.scanDirectory(this.biggestDirPath))
        });
        return await bm.run(this.RUNS);
    }
    async bmListDirectory() {
        const req = Utils_1.Utils.clone(this.requestTemplate);
        req.params.directory = this.biggestDirPath;
        const bm = new Benchmark_1.Benchmark('List directory', req, async () => {
            await ObjectManagers_1.ObjectManagers.reset();
            await ObjectManagers_1.ObjectManagers.getInstance().init();
        }, null, async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            await this.init();
            await this.setupDB();
        });
        BMGalleryRouter.addDirectoryList(bm.BmExpressApp);
        return await bm.run(this.RUNS);
    }
    async bmListPersons() {
        const bm = new Benchmark_1.Benchmark('Listing Faces', Utils_1.Utils.clone(this.requestTemplate), async () => {
            await ObjectManagers_1.ObjectManagers.reset();
            await ObjectManagers_1.ObjectManagers.getInstance().init();
        }, null, async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            await this.setupDB();
        });
        BMPersonRouter.addGetPersons(bm.BmExpressApp);
        return await bm.run(this.RUNS);
    }
    async bmAllSearch() {
        await this.setupDB();
        const queryParser = new SearchQueryParser_1.SearchQueryParser(SearchQueryParser_1.defaultQueryKeywords);
        const names = (await ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll(this.session)).sort((a, b) => b.cache.count - a.cache.count);
        const queries = SearchQueryDTO_1.TextSearchQueryTypes.map(t => {
            const q = {
                type: t, text: 'a'
            };
            return {
                query: q, description: queryParser.stringify(q)
            };
        });
        // searching for everything
        queries.push({
            query: {
                type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '.'
            }, description: queryParser.stringify({
                type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '.'
            })
        });
        if (names.length > 0) {
            queries.push({
                query: {
                    type: SearchQueryDTO_1.SearchQueryTypes.person, value: names[0].name,
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                }, description: '<Most common name>'
            });
        }
        if (names.length > 1) {
            queries.push({
                query: {
                    type: SearchQueryDTO_1.SearchQueryTypes.AND, list: [
                        {
                            type: SearchQueryDTO_1.SearchQueryTypes.person, value: names[0].name,
                            matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                        },
                        {
                            type: SearchQueryDTO_1.SearchQueryTypes.person, value: names[1].name,
                            matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                        }
                    ]
                }, description: '<Most AND second common names>'
            });
            queries.push({
                query: {
                    type: SearchQueryDTO_1.SearchQueryTypes.OR, list: [
                        {
                            type: SearchQueryDTO_1.SearchQueryTypes.person, value: names[0].name,
                            matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                        },
                        {
                            type: SearchQueryDTO_1.SearchQueryTypes.person, value: names[1].name,
                            matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                        }
                    ]
                }, description: '<Most OR second common names>'
            });
            queries.push({
                query: {
                    type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                    min: 2,
                    list: names.map(n => ({
                        type: SearchQueryDTO_1.SearchQueryTypes.person, value: n.name,
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                    }))
                }, description: '<Contain at least 2 out of all names>'
            });
        }
        const results = [];
        for (const entry of queries) {
            const req = Utils_1.Utils.clone(this.requestTemplate);
            req.params.searchQueryDTO = JSON.stringify(entry.query);
            const bm = new Benchmark_1.Benchmark('Searching for `' + entry.description + '`', req, null, null, async () => {
                await this.setupDB();
            });
            BMGalleryRouter.addSearch(bm.BmExpressApp);
            results.push({ result: await bm.run(this.RUNS), searchQuery: entry.query });
        }
        return results;
    }
    async bmAutocomplete(text) {
        const req = Utils_1.Utils.clone(this.requestTemplate);
        req.params.text = text;
        const bm = new Benchmark_1.Benchmark('Auto complete for `' + text + '`', req, null, null, async () => {
            await this.setupDB();
        });
        BMGalleryRouter.addAutoComplete(bm.BmExpressApp);
        return await bm.run(this.RUNS);
    }
    async getStatistic() {
        await this.setupDB();
        const gm = new GalleryManager_1.GalleryManager();
        const pm = new PersonManager_1.PersonManager();
        return 'directories: ' + await gm.countDirectories() +
            ', photos: ' + await gm.countPhotos() +
            ', videos: ' + await gm.countVideos() +
            ', diskUsage : ' + Utils_1.Utils.renderDataSize(await gm.countMediaSize()) +
            ', persons : ' + await pm.countFaces() +
            ', unique persons (faces): ' + (await pm.getAll(this.session)).length;
    }
    async init() {
        if (this.inited === false) {
            await this.setupDB();
            const gm = new GalleryManager_1.GalleryManager();
            let biggest = 0;
            let biggestPath = '/';
            const queue = ['/'];
            while (queue.length > 0) {
                const dirPath = queue.shift();
                const dir = await gm.listDirectory(this.session, dirPath);
                dir.directories.forEach((d) => queue.push(path.join(d.path + d.name)));
                if (biggest < dir.media.length) {
                    biggestPath = path.join(dir.path + dir.name);
                    biggest = dir.media.length;
                }
            }
            this.biggestDirPath = biggestPath;
            console.log('updating path of biggest dir to: ' + this.biggestDirPath);
            this.inited = true;
        }
        return this.biggestDirPath;
    }
    async setupDB() {
        await this.resetDB();
        await new Promise((resolve, reject) => {
            try {
                const indexingJob = new IndexingJob_1.IndexingJob();
                indexingJob.JobListener = {
                    onJobFinished: (job, state, soloRun) => {
                        resolve();
                    },
                    onProgressUpdate: (progress) => {
                        // empty
                    }
                };
                indexingJob.start({ indexChangesOnly: false }).catch(console.error);
            }
            catch (e) {
                console.error(e);
                reject(e);
            }
        });
    }
}
exports.BenchmarkRunner = BenchmarkRunner;
//# sourceMappingURL=BenchmarkRunner.js.map