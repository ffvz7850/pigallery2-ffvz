"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DBTestHelper_1 = require("../../../DBTestHelper");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const ProjectedCacheManager_1 = require("../../../../../src/backend/model/database/ProjectedCacheManager");
const DirectoryEntity_1 = require("../../../../../src/backend/model/database/enitites/DirectoryEntity");
const ProjectedDirectoryCacheEntity_1 = require("../../../../../src/backend/model/database/enitites/ProjectedDirectoryCacheEntity");
const SessionManager_1 = require("../../../../../src/backend/model/database/SessionManager");
const DiskManager_1 = require("../../../../../src/backend/model/fileaccess/DiskManager");
const TestHelper_1 = require("../../../../TestHelper");
const Config_1 = require("../../../../../src/common/config/private/Config");
const ClientConfig_1 = require("../../../../../src/common/config/public/ClientConfig");
const SortingMethods_1 = require("../../../../../src/common/entities/SortingMethods");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const Utils_1 = require("../../../../../src/common/Utils");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
const { expect } = chai;
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe();
describe('ProjectedCacheManager', (sqlHelper) => {
    describe = tmpDescribe;
    let connection;
    let pcm;
    const setup = async () => {
        await sqlHelper.initDB();
        await sqlHelper.setUpTestGallery();
        connection = await SQLConnection_1.SQLConnection.getConnection();
        pcm = new ProjectedCacheManager_1.ProjectedCacheManager();
    };
    describe('ProjectedCacheManager.invalidateDirectoryCache', () => {
        beforeEach(setup);
        afterEach(sqlHelper.clearDB);
        it('invalidates the given directory and all of its parents, but not descendants', async () => {
            const repoDir = connection.getRepository(DirectoryEntity_1.DirectoryEntity);
            const repoCache = connection.getRepository(ProjectedDirectoryCacheEntity_1.ProjectedDirectoryCacheEntity);
            // Entities from helper
            const root = sqlHelper.testGalleyEntities.dir; // ParentDirectoryDTO of root
            const child = sqlHelper.testGalleyEntities.subDir; // direct child of root
            const child2 = sqlHelper.testGalleyEntities.subDir2; // another child of root
            // For descendant, use a grandchild under child (if not present, we simulate by using child itself as descendant context-wise)
            // Our sample gallery only has one level of subdirs; to test descendant unaffected, we will use subDir2 as unrelated descendant (sibling),
            // and also ensure caches under child remain valid if targeting root's child.
            // Resolve DirectoryEntity records
            const rootEnt = await repoDir.findOne({ where: { name: root.name, path: root.path } });
            const childEnt = await repoDir.findOne({ where: { name: child.name, path: DiskManager_1.DiskManager.pathFromParent(root) } });
            const child2Ent = await repoDir.findOne({ where: { name: child2.name, path: DiskManager_1.DiskManager.pathFromParent(root) } });
            expect(rootEnt).to.not.be.null;
            expect(childEnt).to.not.be.null;
            expect(child2Ent).to.not.be.null;
            const projectionKey1 = SessionManager_1.SessionManager.NO_PROJECTION_KEY;
            const projectionKey2 = 'OTHER_PROJECTION_KEY';
            // Seed cache rows with valid=true initially for both projection keys
            const seed = async (directory, projectionKey) => {
                const row = new ProjectedDirectoryCacheEntity_1.ProjectedDirectoryCacheEntity();
                row.directory = directory;
                row.projectionKey = projectionKey;
                row.mediaCount = 0;
                row.valid = true;
                return repoCache.save(row);
            };
            await repoCache.createQueryBuilder().delete().from(ProjectedDirectoryCacheEntity_1.ProjectedDirectoryCacheEntity).execute();
            const rootCache1 = await seed(rootEnt, projectionKey1);
            const rootCache2 = await seed(rootEnt, projectionKey2);
            const childCache1 = await seed(childEnt, projectionKey1);
            const childCache2 = await seed(childEnt, projectionKey2);
            const child2Cache1 = await seed(child2Ent, projectionKey1);
            const child2Cache2 = await seed(child2Ent, projectionKey2);
            // Target: child directory => should invalidate child and its parents (root), but not sibling (child2)
            const target = { name: child.name, path: root.path }; // ParentDirectoryDTO minimal
            await pcm.invalidateDirectoryCache(target);
            // Reload caches for both projection keys
            const rc1 = await repoCache.findOne({ where: { id: rootCache1.id } });
            const rc2 = await repoCache.findOne({ where: { id: rootCache2.id } });
            const cc1 = await repoCache.findOne({ where: { id: childCache1.id } });
            const cc2 = await repoCache.findOne({ where: { id: childCache2.id } });
            const c2c1 = await repoCache.findOne({ where: { id: child2Cache1.id } });
            const c2c2 = await repoCache.findOne({ where: { id: child2Cache2.id } });
            expect(rc1.valid).to.equal(false, 'root (key1) should be invalidated');
            expect(rc2.valid).to.equal(false, 'root (key2) should be invalidated');
            expect(cc1.valid).to.equal(false, 'target child (key1) should be invalidated');
            expect(cc2.valid).to.equal(false, 'target child (key2) should be invalidated');
            expect(c2c1.valid).to.equal(true, 'sibling (key1) should not be invalidated');
            expect(c2c2.valid).to.equal(true, 'sibling (key2) should not be invalidated');
        });
    });
    describe('ProjectedCacheManager.setAndGetCacheForDirectory', () => {
        let dir;
        let subDir;
        let subDir2;
        let v;
        let p;
        let p2;
        let pFaceLess;
        let p4;
        const buildDeterministicGallery = async () => {
            const directory = TestHelper_1.TestHelper.getDirectoryEntry(null, '.');
            subDir = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'The Phantom Menace');
            subDir2 = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'Return of the Jedi');
            p = TestHelper_1.TestHelper.getPhotoEntry1(subDir);
            p.metadata.rating = 4;
            p.metadata.creationDate = 10000;
            p2 = TestHelper_1.TestHelper.getPhotoEntry2(subDir);
            p2.metadata.rating = 4;
            p2.metadata.creationDate = 20000;
            v = TestHelper_1.TestHelper.getVideoEntry1(subDir);
            v.metadata.creationDate = 500;
            const pFaceLessTmp = TestHelper_1.TestHelper.getPhotoEntry3(subDir);
            pFaceLessTmp.metadata.rating = 0;
            pFaceLessTmp.metadata.creationDate = 400000;
            delete pFaceLessTmp.metadata.faces;
            p4 = TestHelper_1.TestHelper.getPhotoEntry4(subDir2);
            p4.metadata.rating = 5;
            p4.metadata.creationDate = 100;
            dir = await DBTestHelper_1.DBTestHelper.persistTestDir(directory);
            subDir = dir.directories[0];
            subDir2 = dir.directories[1];
            p = subDir.media.filter(m => m.name === p.name)[0];
            p.directory = subDir;
            p2 = subDir.media.filter(m => m.name === p2.name)[0];
            p2.directory = subDir;
            v = subDir.media.filter(m => m.name === v.name)[0];
            v.directory = subDir;
            pFaceLess = subDir.media.filter(m => m.name === pFaceLessTmp.name)[0];
            pFaceLess.directory = subDir;
            p4 = subDir2.media[0];
            p4.directory = subDir2;
        };
        beforeEach(async () => {
            await sqlHelper.initDB();
            await buildDeterministicGallery();
            connection = await SQLConnection_1.SQLConnection.getConnection();
            pcm = new ProjectedCacheManager_1.ProjectedCacheManager();
            // Re-init managers as persistTestDir resets ObjectManagers
            await ObjectManagers_1.ObjectManagers.getInstance().init();
            // default sorting
            Config_1.Config.AlbumCover.Sorting = [
                new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false),
                new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Date, false)
            ];
            Config_1.Config.AlbumCover.SearchQuery = null;
            // match behavior of old CoverManager tests
            Config_1.Config.Gallery.ignoreTimestampOffset = false;
        });
        afterEach(sqlHelper.clearDB);
        const getCacheRow = async (d) => {
            return await connection.getRepository(ProjectedDirectoryCacheEntity_1.ProjectedDirectoryCacheEntity)
                .createQueryBuilder('pdc')
                .leftJoin('pdc.cover', 'cover')
                .leftJoin('cover.directory', 'cd')
                .where('pdc.directoryId = :dir AND pdc.projectionKey = :pk', { dir: d.id, pk: SessionManager_1.SessionManager.NO_PROJECTION_KEY })
                .select(['pdc', 'cd.name', 'cd.path', 'cover.name'])
                .getOne();
        };
        const coverify = (mIn) => {
            const tmpDir = mIn.directory;
            delete mIn.directory;
            const m = Utils_1.Utils.clone(mIn);
            mIn.directory = tmpDir;
            m.directory = {
                name: mIn.directory.name,
                path: mIn.directory.path,
            };
            delete m.metadata;
            delete m.id;
            return m;
        };
        it('should sort directory cover', async () => {
            // Rating desc, then Date desc -> expect p2 for subDir
            let saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: subDir.id,
                name: subDir.name,
                path: subDir.path
            });
            let row = await getCacheRow(subDir);
            expect(row.cover).to.deep.equal(saved.cover);
            expect(row.cover).to.deep.equal(coverify(p2));
            expect(row.mediaCount).to.equal(4);
            expect(row.recursiveMediaCount).to.equal(4);
            // Date desc only -> expect pFaceLess (latest by date even with no faces)
            Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Date, false)];
            saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: subDir.id,
                name: subDir.name,
                path: subDir.path
            });
            row = await getCacheRow(subDir);
            expect(row.cover).to.deep.equal(saved.cover);
            expect(row.cover).to.deep.equal(coverify(pFaceLess));
            // Rating desc only on root -> expect highest rated across subs => p4
            Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false)];
            saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: dir.id,
                name: dir.name,
                path: dir.path
            });
            row = await getCacheRow(dir);
            expect(row.cover).to.deep.equal(saved.cover);
            expect(row.cover).to.deep.equal(coverify(p4));
            // Name asc on root -> expect first by name (video v)
            Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Name, false)];
            saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: dir.id,
                name: dir.name,
                path: dir.path
            });
            row = await getCacheRow(dir);
            expect(row.cover).to.deep.equal(saved.cover);
            expect(row.cover).to.deep.equal(coverify(v));
            expect(row.recursiveMediaCount).to.equal(5);
        });
        it('should get cover for directory with search filter', async () => {
            // Under subDir with search queries
            Config_1.Config.AlbumCover.SearchQuery = { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'Boba' };
            let saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: subDir.id,
                name: subDir.name,
                path: subDir.path
            });
            let row = await getCacheRow(subDir);
            expect(row.cover).to.deep.equal(coverify(p));
            Config_1.Config.AlbumCover.SearchQuery = { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'Derem' };
            saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: subDir.id,
                name: subDir.name,
                path: subDir.path
            });
            row = await getCacheRow(subDir);
            expect(row.cover).to.deep.equal(saved.cover);
            expect(row.cover).to.deep.equal(coverify(p2));
            // Root cover should be selected from subDir by same query outcome
            saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: dir.id,
                name: dir.name,
                path: dir.path
            });
            let rootRow = await getCacheRow(dir);
            expect(rootRow.cover).to.deep.equal(saved.cover);
            expect(rootRow.cover).to.deep.equal(coverify(p2));
            // SubDir2 should resolve to p4
            saved = await pcm.setAndGetCacheForDirectory(connection, DBTestHelper_1.DBTestHelper.defaultSession, {
                id: subDir2.id,
                name: subDir2.name,
                path: subDir2.path
            });
            let row2 = await getCacheRow(subDir2);
            expect(row2.cover).to.deep.equal(saved.cover);
            expect(row2.cover).to.deep.equal(coverify(p4));
            expect(row2.mediaCount).to.equal(1);
            expect(row2.recursiveMediaCount).to.equal(1);
        });
    });
});
//# sourceMappingURL=ProjectedCacheManager.spec.js.map