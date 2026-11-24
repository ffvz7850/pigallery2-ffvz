"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const PersonManager_1 = require("../../../../../src/backend/model/database/PersonManager");
const DBTestHelper_1 = require("../../../DBTestHelper");
const TestHelper_1 = require("../../../../TestHelper");
const Utils_1 = require("../../../../../src/common/Utils");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const PersonEntry_1 = require("../../../../../src/backend/model/database/enitites/person/PersonEntry");
const PersonJunctionTable_1 = require("../../../../../src/backend/model/database/enitites/person/PersonJunctionTable");
const ProjectedPersonCacheEntity_1 = require("../../../../../src/backend/model/database/enitites/person/ProjectedPersonCacheEntity");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const tmpDescribe = describe;
// eslint-disable-next-line prefer-const
describe = DBTestHelper_1.DBTestHelper.describe();
describe('PersonManager', (sqlHelper) => {
    describe = tmpDescribe;
    let dir;
    let v;
    let p;
    let p2;
    let pFaceLess;
    let savedPerson = [];
    const setUpSqlDB = async () => {
        await sqlHelper.initDB();
        const directory = TestHelper_1.TestHelper.getDirectoryEntry();
        p = TestHelper_1.TestHelper.getPhotoEntry1(directory);
        p2 = TestHelper_1.TestHelper.getPhotoEntry2(directory);
        const pFaceLessTmp = TestHelper_1.TestHelper.getPhotoEntry3(directory);
        delete pFaceLessTmp.metadata.faces;
        v = TestHelper_1.TestHelper.getVideoEntry1(directory);
        dir = await DBTestHelper_1.DBTestHelper.persistTestDir(directory);
        p = dir.media.filter(m => m.name === p.name)[0];
        p2 = dir.media.filter(m => m.name === p2.name)[0];
        pFaceLess = dir.media[2];
        v = dir.media.filter(m => m.name === v.name)[0];
        savedPerson = await (await SQLConnection_1.SQLConnection.getConnection()).getRepository(PersonEntry_1.PersonEntry).createQueryBuilder('person')
            .leftJoin('person.cache', 'cache', 'cache.projectionKey = :pk AND cache.valid = 1', { pk: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey })
            .leftJoin('cache.sampleRegion', 'sampleRegion')
            .leftJoin('sampleRegion.media', 'media')
            .leftJoin('media.directory', 'directory')
            .select([
            'person.id',
            'person.name',
            'person.isFavourite',
            'cache.count',
            'sampleRegion',
            'media.name',
            'directory.path',
            'directory.name'
        ])
            .getMany();
    };
    const createProjectionSession = async (query) => {
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        return await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
            allowQuery: query,
            overrideAllowBlockList: true
        });
    };
    before(async () => {
        await setUpSqlDB();
    });
    after(async () => {
        await sqlHelper.clearDB();
    });
    describe('Basic Operations', () => {
        it('should get person with default session', async () => {
            const pm = new PersonManager_1.PersonManager();
            const person = Utils_1.Utils.clone(savedPerson[0]);
            const selected = Utils_1.Utils.clone(await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Boba Fett'));
            (0, chai_1.expect)(selected).to.not.be.undefined;
            (0, chai_1.expect)(selected.cache).to.be.not.undefined;
            (0, chai_1.expect)(selected.cache.count).to.be.greaterThan(0);
            delete selected.cache;
            delete person.cache;
            (0, chai_1.expect)(selected).to.deep.equal(person);
        });
        it('should get all persons with default session', async () => {
            const pm = new PersonManager_1.PersonManager();
            const allPersons = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            (0, chai_1.expect)(allPersons).to.not.be.undefined;
            (0, chai_1.expect)(allPersons.length).to.be.greaterThan(0);
            // Check that persons have expected properties
            allPersons.forEach(person => {
                (0, chai_1.expect)(person).to.have.property('id');
                (0, chai_1.expect)(person).to.have.property('name');
                (0, chai_1.expect)(person).to.have.property('isFavourite');
                // Check that cache is a single object, not an array
                if (person.cache) {
                    (0, chai_1.expect)(Array.isArray(person.cache)).to.be.false;
                    (0, chai_1.expect)(person.cache).to.have.property('count');
                    (0, chai_1.expect)(person.cache.count).to.be.a('number');
                }
            });
        });
        it('should get person that does not exist', async () => {
            const pm = new PersonManager_1.PersonManager();
            const selected = await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Non Existent Person');
            (0, chai_1.expect)(selected).to.be.undefined;
        });
        it('should count faces', async () => {
            const pm = new PersonManager_1.PersonManager();
            const count = await pm.countFaces();
            (0, chai_1.expect)(count).to.be.a('number');
            (0, chai_1.expect)(count).to.be.equal(10);
        });
        it('should update person', async () => {
            const pm = new PersonManager_1.PersonManager();
            const originalPerson = await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Boba Fett');
            (0, chai_1.expect)(originalPerson).to.not.be.undefined;
            await pm.updatePerson('Boba Fett', {
                id: originalPerson.id,
                name: 'Updated Boba Fett',
                isFavourite: !originalPerson.isFavourite
            });
            // Verify the person was actually updated in the database
            const fetchedPerson = await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Updated Boba Fett');
            (0, chai_1.expect)(fetchedPerson).to.not.be.undefined;
            (0, chai_1.expect)(fetchedPerson.name).to.equal('Updated Boba Fett');
            (0, chai_1.expect)(fetchedPerson.isFavourite).to.equal(!originalPerson.isFavourite);
        });
        it('should save new persons', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Get initial count
            const initialPersonCount = await connection.getRepository(PersonEntry_1.PersonEntry).count();
            const initialJunctionCount = await connection.getRepository(PersonJunctionTable_1.PersonJunctionTable).count();
            // Add new persons
            const newPersons = [
                { name: 'New Person 1', mediaId: p.id },
                { name: 'New Person 2', mediaId: p2.id }
            ];
            await pm.saveAll(newPersons);
            // Verify persons were added
            const finalPersonCount = await connection.getRepository(PersonEntry_1.PersonEntry).count();
            const finalJunctionCount = await connection.getRepository(PersonJunctionTable_1.PersonJunctionTable).count();
            (0, chai_1.expect)(finalPersonCount).to.equal(initialPersonCount + 2);
            (0, chai_1.expect)(finalJunctionCount).to.equal(initialJunctionCount + 2);
            // Verify we can retrieve the new persons
            const newPerson1 = await connection.getRepository(PersonEntry_1.PersonEntry).findOne({
                where: { name: 'New Person 1' }
            });
            const newPerson2 = await connection.getRepository(PersonEntry_1.PersonEntry).findOne({
                where: { name: 'New Person 2' }
            });
            (0, chai_1.expect)(newPerson1).to.not.be.null;
            (0, chai_1.expect)(newPerson2).to.not.be.null;
        });
        it('should not save duplicate persons', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Get initial count
            const initialPersonCount = await connection.getRepository(PersonEntry_1.PersonEntry).count();
            // Try to add existing person
            const duplicatePersons = [
                { name: 'Unkle Ben', mediaId: p.id }
            ];
            await pm.saveAll(duplicatePersons);
            // Verify no new persons were added
            const persons = await connection.getRepository(PersonEntry_1.PersonEntry).find();
            (0, chai_1.expect)(persons.length).to.equal(initialPersonCount, JSON.stringify(persons.map(p => p.name)));
        });
    });
    describe('Projection Tests', () => {
        beforeEach(async () => {
            // Reset cache before each projection test
            const pm = new PersonManager_1.PersonManager();
            await pm.invalidateCache();
        });
        it('should get persons with projection session filtering by filename', async () => {
            const pm = new PersonManager_1.PersonManager();
            // Create projection session that filters by filename
            const projectionSession = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'photo1',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            const personsWithProjection = await pm.getAll(projectionSession);
            const personsWithDefault = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            (0, chai_1.expect)(personsWithProjection).to.not.be.undefined;
            (0, chai_1.expect)(personsWithProjection.length).to.equal(0);
            (0, chai_1.expect)(personsWithDefault).to.not.be.undefined;
            (0, chai_1.expect)(personsWithDefault.length).to.equal(10);
            // With projection, some persons might have different counts or be filtered out
            // The exact behavior depends on which photos match the projection
            (0, chai_1.expect)(projectionSession.user.projectionKey).to.not.equal(DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey);
        });
        it('should handle cache correctly with different projections', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Get persons with default session first
            const personsDefault = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            (0, chai_1.expect)(personsDefault.length).to.be.equal(10);
            // Create projection session
            const projectionSession = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'photo1',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            // Trigger cache filling
            await pm.getAll(projectionSession);
            // Verify that cache entries exist for both projection keys
            const defaultCacheEntries = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey } });
            const projectionCacheEntries = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { projectionKey: projectionSession.user.projectionKey } });
            (0, chai_1.expect)(defaultCacheEntries).to.be.equal(10);
            (0, chai_1.expect)(projectionCacheEntries).to.be.equal(10);
        });
        it('should get single person with projection session', async () => {
            const pm = new PersonManager_1.PersonManager();
            // Create projection session
            const projectionSession = await createProjectionSession({
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'sw1',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
            });
            const personWithProjection = await pm.get(projectionSession, 'Unkle Ben');
            const personWithDefault = await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Unkle Ben');
            (0, chai_1.expect)(personWithProjection).to.not.be.undefined;
            (0, chai_1.expect)(personWithDefault).to.not.be.undefined;
            (0, chai_1.expect)(personWithProjection.name).to.equal(personWithDefault.name);
            (0, chai_1.expect)(await pm.get(projectionSession, 'Padmé Amidala')).to.be.undefined;
        });
        it('should filter out persons with count = 0 from getAll()', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Create a test person with no media associations (count will be 0)
            const personRepo = connection.getRepository(PersonEntry_1.PersonEntry);
            const testPerson = new PersonEntry_1.PersonEntry();
            testPerson.name = 'Test Person Zero Count';
            testPerson.isFavourite = false;
            const savedTestPerson = await personRepo.save(testPerson);
            // Force cache invalidation to rebuild with the new person
            await pm.invalidateCache();
            // Get all persons - the person with count = 0 should not be included
            const allPersons = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            // Verify the test person is not in the results
            const foundPerson = allPersons.find(p => p.name === 'Test Person Zero Count');
            (0, chai_1.expect)(foundPerson).to.be.undefined;
            // Verify that all returned persons have count > 0
            for (const person of allPersons) {
                (0, chai_1.expect)(person.cache).to.not.be.undefined;
                (0, chai_1.expect)(person.cache.count).to.be.greaterThan(0);
            }
            // Verify the person exists in the database but not in results
            const dbPerson = await personRepo.findOne({ where: { name: 'Test Person Zero Count' } });
            (0, chai_1.expect)(dbPerson).to.not.be.undefined;
            (0, chai_1.expect)(dbPerson.name).to.equal('Test Person Zero Count');
            // Clean up
            await personRepo.remove(savedTestPerson);
        });
        it('should handle persons with exactly count = 0 correctly', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Create a person and manually set their cache count to 0
            const personRepo = connection.getRepository(PersonEntry_1.PersonEntry);
            const cacheRepo = connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity);
            const testPerson = new PersonEntry_1.PersonEntry();
            testPerson.name = 'Test Person Exact Zero';
            testPerson.isFavourite = false;
            const savedTestPerson = await personRepo.save(testPerson);
            // Manually create a cache entry with count = 0
            const cacheEntry = new ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity();
            cacheEntry.projectionKey = DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey;
            cacheEntry.person = savedTestPerson;
            cacheEntry.count = 0;
            cacheEntry.valid = true;
            cacheEntry.sampleRegion = null;
            await cacheRepo.save(cacheEntry);
            // Reset memory cache to force reload from database
            await pm.invalidateCache();
            // Verify the person is not returned by getAll
            const allPersons = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            const foundInAll = allPersons.find(p => p.name === 'Test Person Exact Zero');
            (0, chai_1.expect)(foundInAll).to.be.undefined;
            // Verify the person is not returned by get
            const foundByGet = await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Test Person Exact Zero');
            (0, chai_1.expect)(foundByGet).to.be.undefined;
            // Clean up
            await cacheRepo.remove(cacheEntry);
            await personRepo.remove(savedTestPerson);
        });
    });
    describe('Cache Management', () => {
        it('should reset previews and invalidate cache', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Ensure there are valid cache entries
            await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            let validCacheCount = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { valid: true } });
            (0, chai_1.expect)(validCacheCount).to.be.equal(10);
            // Reset previews
            await pm.invalidateCache();
            // Check that all cache entries are now invalid
            validCacheCount = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { valid: true } });
            (0, chai_1.expect)(validCacheCount).to.equal(0);
        });
        it('should invalidate cache for specific directory', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Ensure there are valid cache entries
            await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            let validCacheCount = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { valid: true } });
            (0, chai_1.expect)(validCacheCount).to.be.equal(10);
            // Trigger cache invalidation for the directory
            await pm.onNewDataVersion(dir);
            // Some cache entries should be invalidated
            const validCacheCountAfter = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { valid: true } });
            (0, chai_1.expect)(validCacheCountAfter).to.be.lessThan(validCacheCount);
        });
        it('should handle cache invalidation for non-existent directory', async () => {
            const pm = new PersonManager_1.PersonManager();
            // Should not throw error
            await pm.onNewDataVersion(null);
            await pm.onNewDataVersion({});
            await pm.onNewDataVersion({ id: 999999 });
        });
        it('should rebuild cache when accessing persons after invalidation', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Reset cache
            await pm.invalidateCache();
            // Verify cache is invalid
            let validCacheCount = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { valid: true } });
            (0, chai_1.expect)(validCacheCount).to.equal(0);
            // Access persons - this should rebuild cache
            const persons = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            (0, chai_1.expect)(persons).to.not.be.undefined;
            (0, chai_1.expect)(persons.length).to.be.equal(10);
            // Verify cache is now valid
            validCacheCount = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity)
                .count({ where: { valid: true } });
            (0, chai_1.expect)(validCacheCount).to.be.equal(10);
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty person list in saveAll', async () => {
            const pm = new PersonManager_1.PersonManager();
            // Should not throw error
            await pm.saveAll([]);
        });
        it('should handle large batch of persons in saveAll', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Create a large batch of persons (more than 200 to test batching)
            const largeBatch = [];
            for (let i = 0; i < 250; i++) {
                largeBatch.push({ name: `Batch Person ${i}`, mediaId: p.id });
            }
            const initialCount = await connection.getRepository(PersonEntry_1.PersonEntry).count();
            await pm.saveAll(largeBatch);
            const finalCount = await connection.getRepository(PersonEntry_1.PersonEntry).count();
            (0, chai_1.expect)(finalCount).to.equal(initialCount + 250);
        });
        it('should handle cache when no persons exist', async () => {
            const pm = new PersonManager_1.PersonManager();
            const connection = await SQLConnection_1.SQLConnection.getConnection();
            // Remove all persons temporarily - need to check if any exist first
            const junctionCount = await connection.getRepository(PersonJunctionTable_1.PersonJunctionTable).count();
            const personCount = await connection.getRepository(PersonEntry_1.PersonEntry).count();
            const cacheCount = await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity).count();
            if (junctionCount > 0) {
                await connection.getRepository(PersonJunctionTable_1.PersonJunctionTable).createQueryBuilder().delete().execute();
            }
            if (personCount > 0) {
                await connection.getRepository(PersonEntry_1.PersonEntry).createQueryBuilder().delete().execute();
            }
            if (cacheCount > 0) {
                await connection.getRepository(ProjectedPersonCacheEntity_1.ProjectedPersonCacheEntity).createQueryBuilder().delete().execute();
            }
            const persons = await pm.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            (0, chai_1.expect)(persons).to.be.an('array');
            (0, chai_1.expect)(persons.length).to.equal(0);
            const nonExistentPerson = await pm.get(DBTestHelper_1.DBTestHelper.defaultSession, 'Nobody');
            (0, chai_1.expect)(nonExistentPerson).to.be.undefined;
            const faceCount = await pm.countFaces();
            (0, chai_1.expect)(faceCount).to.equal(0);
        });
    });
});
//# sourceMappingURL=PersonManager.spec.js.map