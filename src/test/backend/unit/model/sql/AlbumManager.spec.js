"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DBTestHelper_1 = require("../../../DBTestHelper");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const AlbumManager_1 = require("../../../../../src/backend/model/database/AlbumManager");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const AlbumBaseEntity_1 = require("../../../../../src/backend/model/database/enitites/album/AlbumBaseEntity");
const Utils_1 = require("../../../../../src/common/Utils");
const ProjectedAlbumCacheEntity_1 = require("../../../../../src/backend/model/database/enitites/album/ProjectedAlbumCacheEntity");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe(); // fake it os IDE plays nicely (recognize the test)
describe('AlbumManager', (sqlHelper) => {
    describe = tmpDescribe;
    const setUpSqlDB = async () => {
        await sqlHelper.initDB();
        await sqlHelper.setUpTestGallery();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
    };
    const createProjectionSession = async (query) => {
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        return await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
            allowQuery: query,
            overrideAllowBlockList: true
        });
    };
    const toAlbumCover = (m) => {
        // generated dirs for test contain everything, not like return values from the server.
        const tmpDir = m.directory;
        const tmpM = tmpDir.media;
        const tmpD = tmpDir.directories;
        const tmpP = tmpDir.cache.cover;
        const tmpMT = tmpDir.metaFile;
        delete tmpDir.directories;
        delete tmpDir.media;
        delete tmpDir.cache.cover;
        delete tmpDir.metaFile;
        const ret = Utils_1.Utils.clone(m);
        delete ret.id;
        ret.directory = { path: ret.directory.path, name: ret.directory.name };
        delete ret.metadata;
        tmpDir.directories = tmpD;
        tmpDir.media = tmpM;
        tmpDir.cache.cover = tmpP;
        tmpDir.metaFile = tmpMT;
        return ret;
    };
    before(setUpSqlDB);
    after(sqlHelper.clearDB);
    describe('Saved search', () => {
        beforeEach(setUpSqlDB);
        afterEach(sqlHelper.clearDB);
        it('should add album', async () => {
            const am = new AlbumManager_1.AlbumManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            const query = { value: 'test', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            expect(await connection.getRepository(AlbumBaseEntity_1.AlbumBaseEntity).find()).to.deep.equalInAnyOrder([]);
            await am.addSavedSearch('Test Album', Utils_1.Utils.clone(query));
            expect(await connection.getRepository(AlbumBaseEntity_1.AlbumBaseEntity).find()).to.deep.equalInAnyOrder([{
                    id: 1,
                    name: 'Test Album',
                    locked: false,
                    searchQuery: query
                }]);
        });
        it('should delete album', async () => {
            const am = new AlbumManager_1.AlbumManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            const query = { value: 'test', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            await am.addSavedSearch('Test Album', Utils_1.Utils.clone(query));
            await am.addSavedSearch('Test Album2', Utils_1.Utils.clone(query), true);
            expect(await connection.getRepository(AlbumBaseEntity_1.AlbumBaseEntity).find()).to.deep.equalInAnyOrder([
                {
                    id: 1,
                    name: 'Test Album',
                    locked: false,
                    searchQuery: query
                },
                {
                    id: 2,
                    name: 'Test Album2',
                    locked: true,
                    searchQuery: query
                }
            ]);
            await am.deleteAlbum(1);
            expect(await connection.getRepository(AlbumBaseEntity_1.AlbumBaseEntity).find()).to.deep.equalInAnyOrder([{
                    id: 2,
                    name: 'Test Album2',
                    locked: true,
                    searchQuery: query
                }]);
            try {
                await am.deleteAlbum(2);
                expect(false).to.be.equal(true); // should not reach
            }
            catch (e) {
                expect(e.message).to.equal('Could not delete album, id: 2. Album id is not found or the album is locked.');
            }
            expect(await connection.getRepository(AlbumBaseEntity_1.AlbumBaseEntity).find()).to.deep.equalInAnyOrder([{
                    id: 2,
                    name: 'Test Album2',
                    locked: true,
                    searchQuery: query
                }]);
        });
    });
    it('should list album', async () => {
        const am = new AlbumManager_1.AlbumManager();
        const query = { value: 'photo1', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
        await am.addSavedSearch('Test Album', Utils_1.Utils.clone(query));
        expect(await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession)).to.deep.equalInAnyOrder([{
                id: 1,
                name: 'Test Album',
                searchQuery: query,
                locked: false,
                cache: {
                    cover: toAlbumCover(sqlHelper.testGalleyEntities.p),
                    id: 1,
                    itemCount: 1,
                    oldestMedia: sqlHelper.testGalleyEntities.p.metadata.creationDate,
                    valid: true,
                    youngestMedia: sqlHelper.testGalleyEntities.p.metadata.creationDate,
                },
            }]);
    });
    describe('Projection Tests', () => {
        beforeEach(setUpSqlDB);
        afterEach(sqlHelper.clearDB);
        it('should get albums with projection session filtering by filename', async () => {
            const am = new AlbumManager_1.AlbumManager();
            // Create albums with different search queries
            const query1 = { value: 'photo1', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            const query2 = { value: 'sw1', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            await am.addSavedSearch('Album Photo1', Utils_1.Utils.clone(query1));
            await am.addSavedSearch('Album SW1', Utils_1.Utils.clone(query2));
            // Create projection session that filters by filename
            const projectionSession = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'sw1',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            const albumsWithProjection = await am.getAll(projectionSession);
            const albumsWithDefault = await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            expect(albumsWithProjection).to.not.be.undefined;
            expect(albumsWithDefault).to.not.be.undefined;
            // Albums should exist but may have different cache content based on projection
            expect(albumsWithProjection.length).to.equal(2);
            expect(albumsWithDefault.length).to.equal(2);
            // Verify projection keys are different
            expect(projectionSession.user.projectionKey).to.not.equal(DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey);
            // Albums with projection should have different cache results
            const projectedAlbum1 = albumsWithProjection.find(a => a.name === 'Album Photo1');
            const defaultAlbum1 = albumsWithDefault.find(a => a.name === 'Album Photo1');
            expect(projectedAlbum1).to.not.be.undefined;
            expect(defaultAlbum1).to.not.be.undefined;
            // The album searching for 'photo1' should have no items under the 'sw1' filename projection
            if (projectedAlbum1.cache) {
                expect(projectedAlbum1.cache.itemCount).to.equal(0);
            }
            if (defaultAlbum1.cache) {
                expect(defaultAlbum1.cache.itemCount).to.equal(1);
            }
        });
        it('should handle cache correctly with different projections', async () => {
            const am = new AlbumManager_1.AlbumManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Create album that will match the projection
            const query = { value: 'photo', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            await am.addSavedSearch('Test Album Cache', Utils_1.Utils.clone(query));
            // Get albums with default session first
            const albumsDefault = await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            expect(albumsDefault.length).to.be.equal(1);
            // Create projection session that will also match content
            const projectionSession = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'photo',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            // Trigger cache filling for projection
            const albumsProjected = await am.getAll(projectionSession);
            expect(albumsProjected.length).to.be.equal(1);
            // Verify that cache entries exist for both projection keys
            const defaultCacheEntries = await connection.getRepository(ProjectedAlbumCacheEntity_1.ProjectedAlbumCacheEntity)
                .count({ where: { projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey } });
            const projectionCacheEntries = await connection.getRepository(ProjectedAlbumCacheEntity_1.ProjectedAlbumCacheEntity)
                .count({ where: { projectionKey: projectionSession.user.projectionKey } });
            expect(defaultCacheEntries).to.be.equal(1);
            expect(projectionCacheEntries).to.be.equal(1);
        });
        it('should return albums with empty cache when projection has no matches', async () => {
            const am = new AlbumManager_1.AlbumManager();
            // Create album that searches for content that won't match projection
            const query = { value: 'photo1', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            await am.addSavedSearch('No Match Album', Utils_1.Utils.clone(query));
            // Create projection session that filters to non-existent content
            const projectionSession = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'nonexistent',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            const albumsWithProjection = await am.getAll(projectionSession);
            expect(albumsWithProjection).to.not.be.undefined;
            expect(albumsWithProjection.length).to.equal(1);
            const album = albumsWithProjection[0];
            expect(album.name).to.equal('No Match Album');
            // Album should exist but cache should indicate no matches
            if (album.cache) {
                expect(album.cache.itemCount).to.equal(0);
                expect(album.cache.cover).to.be.null;
            }
        });
        it('should handle multiple albums with different projection results', async () => {
            const am = new AlbumManager_1.AlbumManager();
            // Create multiple albums with different search criteria
            const queries = [
                { name: 'Album All Photos', query: { value: 'photo', type: SearchQueryDTO_1.SearchQueryTypes.any_text } },
                { name: 'Album SW1', query: { value: 'sw1', type: SearchQueryDTO_1.SearchQueryTypes.any_text } },
                { name: 'Album Boba', query: { value: 'Boba', type: SearchQueryDTO_1.SearchQueryTypes.any_text } }
            ];
            for (const { name, query } of queries) {
                await am.addSavedSearch(name, Utils_1.Utils.clone(query));
            }
            // Test with different projections
            const projectionSW1 = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'sw1',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            const albumsDefault = await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            const albumsSW1 = await am.getAll(projectionSW1);
            expect(albumsDefault.length).to.equal(3);
            expect(albumsSW1.length).to.equal(3);
            // Check that different albums have different results under projections
            const defaultAlbumSW1 = albumsDefault.find(a => a.name === 'Album SW1');
            const projectedAlbumSW1 = albumsSW1.find(a => a.name === 'Album SW1');
            if (defaultAlbumSW1?.cache && projectedAlbumSW1?.cache) {
                // SW1 album should have same or fewer results under SW1 filename projection
                expect(projectedAlbumSW1.cache.itemCount).to.be.lessThanOrEqual(defaultAlbumSW1.cache.itemCount);
            }
        });
        it('should invalidate cache properly for projections', async () => {
            const am = new AlbumManager_1.AlbumManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Create album
            const query = { value: 'photo1', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
            await am.addSavedSearch('Cache Test Album', Utils_1.Utils.clone(query));
            // Build cache for default session
            await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            // Verify cache exists and is valid
            let validCacheCount = await connection.getRepository(ProjectedAlbumCacheEntity_1.ProjectedAlbumCacheEntity)
                .count({ where: { valid: true, projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey } });
            expect(validCacheCount).to.be.greaterThan(0);
            // Reset covers (invalidate cache)
            await am.invalidateCache();
            // Cache should be marked as invalid but still exist
            const totalCacheCount = await connection.getRepository(ProjectedAlbumCacheEntity_1.ProjectedAlbumCacheEntity)
                .count({ where: { projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey } });
            validCacheCount = await connection.getRepository(ProjectedAlbumCacheEntity_1.ProjectedAlbumCacheEntity)
                .count({ where: { valid: true, projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey } });
            expect(totalCacheCount).to.be.greaterThan(0);
            expect(validCacheCount).to.equal(0);
            // Accessing albums again should rebuild cache
            await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            validCacheCount = await connection.getRepository(ProjectedAlbumCacheEntity_1.ProjectedAlbumCacheEntity)
                .count({ where: { valid: true, projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey } });
            expect(validCacheCount).to.be.greaterThan(0);
        });
    });
});
//# sourceMappingURL=AlbumManager.spec.js.map