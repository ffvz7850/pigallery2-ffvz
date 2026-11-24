"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const DBTestHelper_1 = require("../../../DBTestHelper");
const GalleryManager_1 = require("../../../../../src/backend/model/database/GalleryManager");
const SessionContext_1 = require("../../../../../src/backend/model/SessionContext");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const Config_1 = require("../../../../../src/common/config/private/Config");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
const IndexingManager_1 = require("../../../../../src/backend/model/database/IndexingManager");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe();
class GalleryManagerTest extends GalleryManager_1.GalleryManager {
    async getDirIdAndTime(connection, directoryName, directoryParent) {
        return super.getDirIdAndTime(connection, directoryName, directoryParent);
    }
    async getParentDirFromId(connection, session, dir) {
        return super.getParentDirFromId(connection, session, dir);
    }
}
describe('GalleryManager', (sqlHelper) => {
    describe = tmpDescribe;
    let galleryManager;
    let connection;
    before(async () => {
        await sqlHelper.initDB();
        await sqlHelper.setUpTestGallery();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        connection = await SQLConnection_1.SQLConnection.getConnection();
        galleryManager = new GalleryManagerTest();
    });
    after(async () => {
        await sqlHelper.clearDB();
    });
    describe('Projection Query Tests', () => {
        it('should return all media when no projection query is provided', async () => {
            // Setup a session with no projection query
            const session = DBTestHelper_1.DBTestHelper.defaultSession;
            // Get the directory contents without any filtering using our directory's name and path
            const dirInfo = await galleryManager.getDirIdAndTime(connection, sqlHelper.testGalleyEntities.dir.name, sqlHelper.testGalleyEntities.dir.path);
            expect(dirInfo).to.not.be.null;
            const directory = await galleryManager.getParentDirFromId(connection, session, dirInfo.id);
            // Verify that all media is returned
            expect(directory.media).to.not.be.empty;
            const originalMediaCount = directory.media.length;
            expect(originalMediaCount).to.be.greaterThan(0);
        });
        it('should filter media based on the projection query', async () => {
            // Create a projection query that filters based on media name
            const searchQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'photo1', // We've named our test photo specifically with this pattern
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            };
            const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                allowQuery: searchQuery,
                overrideAllowBlockList: true
            });
            // Get the directory contents with filtering using our directory's name and path
            const dirInfo = await galleryManager.getDirIdAndTime(connection, sqlHelper.testGalleyEntities.dir.name, sqlHelper.testGalleyEntities.dir.path);
            expect(dirInfo).to.not.be.null;
            // Get the directory contents with filtering
            const directory = await galleryManager.getParentDirFromId(connection, session, dirInfo.id);
            // Verify that only media matching the query is returned
            expect(directory.media).to.not.be.undefined;
            // All returned media should match the query (name contains 'photo1')
            if (directory.media.length > 0) {
                directory.media.forEach(media => {
                    expect(media.name.toLowerCase()).to.include('photo1');
                });
            }
        });
        it('should return directory with empty media when projection filters out all media', async () => {
            const searchQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'this_file_name_does_not_exist_anywhere',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            };
            const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                allowQuery: searchQuery,
                overrideAllowBlockList: true
            });
            const dirInfo = await galleryManager.getDirIdAndTime(connection, sqlHelper.testGalleyEntities.dir.name, sqlHelper.testGalleyEntities.dir.path);
            expect(dirInfo).to.not.be.null;
            const directory = await galleryManager.getParentDirFromId(connection, session, dirInfo.id);
            // The directory itself should still be returned
            expect(directory).to.not.be.undefined;
            expect(directory).to.not.be.null;
            // And media should be an empty array when nothing matches the projection
            expect(directory.media).to.be.an('array');
            expect(directory.media.length).to.equal(0);
        });
        it('blocks child directory when blockQuery contains normal directory search', async () => {
            const root = sqlHelper.testGalleyEntities.dir;
            const child = sqlHelper.testGalleyEntities.subDir;
            const blockQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like,
                value: child.name
            };
            const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                blockQuery,
                overrideAllowBlockList: true
            });
            const dirInfo = await galleryManager.getDirIdAndTime(connection, root.name, root.path);
            const directory = await galleryManager.getParentDirFromId(connection, session, dirInfo.id);
            expect(((await galleryManager.getParentDirFromId(connection, DBTestHelper_1.DBTestHelper.defaultSession, dirInfo.id)).directories || [])
                .map(d => d.name)).to.include(child.name);
            expect(((await galleryManager.getParentDirFromId(connection, session, dirInfo.id)).directories || [])
                .map(d => d.name)).to.not.include(child.name);
        });
    });
    describe('GalleryManager.listDirectory - reindexing severities and projection behavior', () => {
        const origStatSync = fs.statSync;
        let gm;
        let sessionNoProj;
        let sessionProj;
        const indexed = { id: 1, lastScanned: 0, lastModified: 0 };
        let calledArgs = [];
        let bgCalls = 0;
        beforeEach(() => {
            // Reset config defaults that matter for tests
            Config_1.Config.loadSync();
            gm = new GalleryManagerTest();
            sessionNoProj = new SessionContext_1.SessionContext();
            sessionProj = new SessionContext_1.SessionContext();
            // Make projectionQuery truthy without relying on SearchManager
            sessionProj.projectionQuery = {};
            // Stub fs.statSync to control directory mtime/ctime -> lastModified
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            fs.statSync = (() => ({ ctime: new Date(0), mtime: new Date(0) }));
            // Stub getDirIdAndTime and getParentDirFromId to avoid DB
            gm.getDirIdAndTime = () => Promise.resolve(indexed);
            gm.getParentDirFromId = () => Promise.resolve('DB_RESULT');
            // Stub IndexingManager.indexDirectory to capture calls
            calledArgs = [];
            bgCalls = 0;
            ObjectManagers_1.ObjectManagers.getInstance().IndexingManager = new IndexingManager_1.IndexingManager();
            ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.indexDirectory = ((...args) => {
                calledArgs = args;
                bgCalls++;
                const retObj = { directories: [], media: [], metaFile: [], name: 'INDEX_RESULT' };
                return Promise.resolve(retObj);
            });
        });
        afterEach(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            fs.statSync = origStatSync;
        });
        const setStatTime = (t) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            fs.statSync = (() => ({ ctime: new Date(t), mtime: new Date(t) }));
        };
        it('never: returns DB result when already scanned (no projection) and known times are missing', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.never;
            indexed.lastScanned = 123;
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionNoProj, './');
            expect(res).to.equal('DB_RESULT');
        });
        it('never: returns DB result when already scanned (with projection) and known times are missing', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.never;
            indexed.lastScanned = 123;
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionProj, './');
            expect(res).to.equal('DB_RESULT');
        });
        it('low + mismatch: returns DB result when no projection', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            indexed.lastScanned = 10;
            indexed.lastModified = 0; // DB says 0
            setStatTime(1); // FS says 1 -> mismatch
            const res = await gm.listDirectory(sessionNoProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(calledArgs[0]).to.equal('./');
            expect(calledArgs[1]).to.equal(true); // waitForSave
        });
        it('low + mismatch: waits for save and returns DB result when projection set', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            indexed.lastScanned = 10;
            indexed.lastModified = 0;
            setStatTime(1);
            const res = await gm.listDirectory(sessionProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(calledArgs[0]).to.equal('./');
            expect(calledArgs[1]).to.equal(true); // waitForSave
        });
        it('low + unchanged with known times: returns null (no projection)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            indexed.lastScanned = 10;
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionNoProj, './', 1, 10);
            expect(res).to.equal(null);
        });
        it('low + unchanged with known times: returns null (with projection)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            indexed.lastScanned = 10;
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionProj, './', 1, 10);
            expect(res).to.equal(null);
        });
        it('medium + unchanged within cache (known times): returns null', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.medium;
            // Set lastScanned close to now so within cachedFolderTimeout
            indexed.lastScanned = Date.now();
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionNoProj, './', 1, indexed.lastScanned);
            expect(res).to.equal(null);
        });
        it('medium + cache expired (no known times): background reindex and DB result (no projection)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.medium;
            indexed.lastScanned = Date.now() - (Config_1.Config.Indexing.cachedFolderTimeout + 1000);
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionNoProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(bgCalls).to.be.greaterThan(0);
        });
        it('medium + cache expired (no known times): background reindex and DB result (with projection)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.medium;
            indexed.lastScanned = Date.now() - (Config_1.Config.Indexing.cachedFolderTimeout + 1000);
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(bgCalls).to.be.greaterThan(0);
        });
        it('high + unchanged: background reindex and DB result (no projection)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.high;
            indexed.lastScanned = Date.now();
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionNoProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(bgCalls).to.be.greaterThan(0);
        });
        it('high + unchanged: background reindex and DB result (with projection)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.high;
            indexed.lastScanned = Date.now();
            indexed.lastModified = 1;
            setStatTime(1);
            const res = await gm.listDirectory(sessionProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(bgCalls).to.be.greaterThan(0);
        });
        it('never scanned (lastScanned=null): without projection returns scanned result', async () => {
            // Simulate never scanned dir
            indexed.lastScanned = null;
            indexed.lastModified = 0;
            setStatTime(0);
            const res = await gm.listDirectory(sessionNoProj, './');
            expect(res).to.be.an('object');
            expect(res.name).to.equal('INDEX_RESULT');
        });
        it('never scanned (lastScanned=null): with projection waits for save and returns DB result', async () => {
            // Simulate never scanned dir
            indexed.lastScanned = null;
            indexed.lastModified = 0;
            setStatTime(0);
            const res = await gm.listDirectory(sessionProj, './');
            expect(res).to.equal('DB_RESULT');
            expect(calledArgs[1]).to.equal(true);
        });
    });
    describe('GalleryManager authorisation', () => {
        let gm;
        before(async () => {
            await sqlHelper.initDB();
            await sqlHelper.setUpTestGallery();
            await ObjectManagers_1.ObjectManagers.getInstance().init();
            gm = new GalleryManager_1.GalleryManager();
        });
        after(async () => {
            await sqlHelper.clearDB();
        });
        describe('authoriseMedia', () => {
            it('returns true without projection', async () => {
                const session = new SessionContext_1.SessionContext();
                const root = sqlHelper.testGalleyEntities.dir;
                const media = sqlHelper.testGalleyEntities.p; // Photo1_*.jpg in root
                const mediaPath = path.join(root.path, root.name, media.name);
                const res = await gm.authoriseMedia(session, mediaPath);
                expect(res).to.equal(true);
            });
            it('enforces projection: allows only matching media name (like "Photo1")', async () => {
                const searchQuery = {
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                    value: 'photo1',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like,
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    allowQuery: searchQuery,
                    overrideAllowBlockList: true,
                });
                const root = sqlHelper.testGalleyEntities.dir;
                const p1 = sqlHelper.testGalleyEntities.p; // Photo1_*.jpg
                const p2 = sqlHelper.testGalleyEntities.p2; // Photo2_*.jpg
                const p1Path = path.join(root.path, root.name, p1.name);
                const p2Path = path.join(root.path, root.name, p2.name);
                expect(await gm.authoriseMedia(session, p1Path)).to.equal(true);
                expect(await gm.authoriseMedia(session, p2Path)).to.equal(false);
            });
            it('returns false when file exists but under different directory (directory constraint)', async () => {
                const searchQuery = {
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                    value: 'photo1',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like,
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    allowQuery: searchQuery,
                    overrideAllowBlockList: true,
                });
                const subDir = sqlHelper.testGalleyEntities.subDir; // The Phantom Menace
                const p1 = sqlHelper.testGalleyEntities.p; // lives in root
                const wrongPath = path.join(subDir.path, subDir.name, p1.name);
                expect(await gm.authoriseMedia(session, wrongPath)).to.equal(false);
            });
            it('returns false for non-existent file under projection', async () => {
                const searchQuery = {
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                    value: 'photo1',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like,
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    allowQuery: searchQuery,
                    overrideAllowBlockList: true,
                });
                const root = sqlHelper.testGalleyEntities.dir;
                const nonExist = path.join(root.path, root.name, 'does_not_exist.jpg');
                expect(await gm.authoriseMedia(session, nonExist)).to.equal(false);
            });
        });
        describe('authoriseMetaFile', () => {
            it('returns true without projection', async () => {
                const session = new SessionContext_1.SessionContext();
                const root = sqlHelper.testGalleyEntities.dir;
                const metaPath = path.join(root.path, root.name, 'README.md');
                expect(await gm.authoriseMetaFile(session, metaPath)).to.equal(true);
            });
            it('allows directory that contains matching media (projection applied)', async () => {
                const searchQuery = {
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                    value: 'photo1',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like,
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    allowQuery: searchQuery,
                    overrideAllowBlockList: true,
                });
                const root = sqlHelper.testGalleyEntities.dir; // root contains Photo1_*.jpg
                const metaPath = path.join(root.path, root.name, 'folder.gpx');
                expect(await gm.authoriseMetaFile(session, metaPath)).to.equal(true);
            });
            it('denies directory that has no matching media under projection', async () => {
                const searchQuery = {
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                    value: 'photo1',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like,
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    allowQuery: searchQuery,
                    overrideAllowBlockList: true,
                });
                const subDir = sqlHelper.testGalleyEntities.subDir; // contains Photo3_*.jpg
                const metaPath = path.join(subDir.path, subDir.name, 'info.md');
                expect(await gm.authoriseMetaFile(session, metaPath)).to.equal(false);
            });
        });
    });
    describe('Cache optimization tests', () => {
        before(async () => {
            await sqlHelper.initDB();
            await sqlHelper.setUpTestGallery();
            await ObjectManagers_1.ObjectManagers.getInstance().init();
        });
        after(async () => {
            await sqlHelper.clearDB();
        });
        it('should not call setAndGetCacheForDirectory when gallery is fully indexed with valid caches', async () => {
            // make sure gallery is fully indexed and caches are valid
            await ObjectManagers_1.ObjectManagers.getInstance().GalleryManager.listDirectory(DBTestHelper_1.DBTestHelper.defaultSession, './');
            const fn = ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory;
            ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory = async (...args) => {
                await fn(...args);
                throw new Error('Should not be called');
            };
            await ObjectManagers_1.ObjectManagers.getInstance().GalleryManager.listDirectory(DBTestHelper_1.DBTestHelper.defaultSession, './');
            ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory = fn;
        });
    });
});
//# sourceMappingURL=GalleryManager.spec.js.map