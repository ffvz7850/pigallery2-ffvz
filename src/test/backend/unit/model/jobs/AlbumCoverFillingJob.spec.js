"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DBTestHelper_1 = require("../../../DBTestHelper");
const SessionContext_1 = require("../../../../../src/backend/model/SessionContext");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const JobDTO_1 = require("../../../../../src/common/entities/job/JobDTO");
const JobRepository_1 = require("../../../../../src/backend/model/jobs/JobRepository");
const Config_1 = require("../../../../../src/common/config/private/Config");
const UserEntity_1 = require("../../../../../src/backend/model/database/enitites/UserEntity");
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe();
describe('AlbumCoverFillingJob', (sqlHelper) => {
    describe = tmpDescribe;
    let connection;
    const waitForJobToFinish = async (jobName, timeout = 5000) => {
        const start = Date.now();
        // find the job instance by name in repository
        const job = JobRepository_1.JobRepository.Instance.getAvailableJobs().find(j => j.Name === jobName);
        if (!job) {
            throw new Error('Job not found: ' + jobName);
        }
        while (job.InProgress && Date.now() - start < timeout) {
            await new Promise(res => setTimeout(res, 10));
        }
        if (job.InProgress) {
            throw new Error('Job did not finish in time: ' + jobName);
        }
    };
    before(async () => {
        await sqlHelper.initDB();
        await sqlHelper.setUpTestGallery();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        connection = await SQLConnection_1.SQLConnection.getConnection();
    });
    after(async () => {
        await sqlHelper.clearDB();
    });
    it('runs full flow: Persons -> Albums -> Directory for all sessions and directories', async () => {
        // Arrange: fake sessions
        const s1 = new SessionContext_1.SessionContext();
        const s2 = new SessionContext_1.SessionContext();
        s1.user = { projectionKey: 'pk1' };
        s2.user = { projectionKey: 'pk2' };
        const sessions = [s1, s2];
        // Stub SessionManager.getAvailableUserSessions
        const origGetSessions = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.getAvailableUserSessions;
        ObjectManagers_1.ObjectManagers.getInstance().SessionManager.getAvailableUserSessions = (() => Promise.resolve(sessions));
        // Prepare directories: two directories without covers, and then empty on re-fetch
        const dirs = [
            { id: 1, name: 'd1', path: '/a/' },
            { id: 2, name: 'd2', path: '/b/' }
        ];
        let coverCall = 0;
        const origGetDirs = ObjectManagers_1.ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers;
        ObjectManagers_1.ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers = (async () => {
            coverCall++;
            return coverCall === 1 ? dirs.slice() : [];
        });
        // Spy PersonManager.getAll and AlbumManager.getAll counts
        let personCalls = 0;
        let albumCalls = 0;
        const origGetAllPersons = ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll;
        const origGetAllAlbums = ObjectManagers_1.ObjectManagers.getInstance().AlbumManager.getAll;
        ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll = ((..._args) => {
            personCalls++;
            return Promise.resolve([]);
        });
        ObjectManagers_1.ObjectManagers.getInstance().AlbumManager.getAll = ((..._args) => {
            albumCalls++;
            return Promise.resolve([]);
        });
        // Spy ProjectedCacheManager.setAndGetCacheForDirectory calls and arguments
        let cacheCalls = 0;
        const cacheArgs = [];
        const origSetAndGetCache = ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory;
        ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory = (async (...args) => {
            cacheCalls++;
            cacheArgs.push(args);
            return Promise.resolve({});
        });
        try {
            // Act: run the job via JobManager
            const jobName = JobDTO_1.DefaultsJobs[JobDTO_1.DefaultsJobs['Album Cover Filling']];
            await ObjectManagers_1.ObjectManagers.getInstance().JobManager.run(jobName, {}, true, false);
            await waitForJobToFinish(jobName);
            // Assert
            expect(coverCall).to.equal(2, 'CoverManager.getPartialDirsWithoutCovers should be called twice (initial + refresh)');
            expect(personCalls).to.equal(sessions.length, 'PersonManager.getAll should be called once per session');
            expect(albumCalls).to.equal(sessions.length, 'AlbumManager.getAll should be called once per session');
            expect(cacheCalls).to.equal(sessions.length * dirs.length, 'Cache should be built for each session-directory pair');
            // Check a couple of argument shapes to ensure proper call order
            for (let i = 0; i < cacheArgs.length; i++) {
                // args: (conn, session, directory)
                expect(cacheArgs[i][0]).to.equal(connection);
                expect(sessions).to.include(cacheArgs[i][1]);
                expect(dirs.map(d => d.id)).to.include(cacheArgs[i][2].id);
            }
        }
        finally {
            // Restore stubs
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.getAvailableUserSessions = origGetSessions;
            ObjectManagers_1.ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers = origGetDirs;
            ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll = origGetAllPersons;
            ObjectManagers_1.ObjectManagers.getInstance().AlbumManager.getAll = origGetAllAlbums;
            ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory = origSetAndGetCache;
        }
    });
    it('handles no directories gracefully (still refreshes once, no cache calls)', async () => {
        // Arrange sessions
        const s1 = new SessionContext_1.SessionContext();
        s1.user = { projectionKey: 'pk1' };
        const sessions = [s1];
        const origGetSessions = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.getAvailableUserSessions;
        ObjectManagers_1.ObjectManagers.getInstance().SessionManager.getAvailableUserSessions = (() => Promise.resolve(sessions));
        // No directories on initial and refresh
        let coverCall = 0;
        const origGetDirs = ObjectManagers_1.ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers;
        ObjectManagers_1.ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers = (async () => {
            coverCall++;
            return [];
        });
        // Count person/album loads
        let personCalls = 0;
        let albumCalls = 0;
        const origGetAllPersons = ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll;
        const origGetAllAlbums = ObjectManagers_1.ObjectManagers.getInstance().AlbumManager.getAll;
        ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll = ((..._args) => {
            personCalls++;
            return Promise.resolve([]);
        });
        ObjectManagers_1.ObjectManagers.getInstance().AlbumManager.getAll = ((..._args) => {
            albumCalls++;
            return Promise.resolve([]);
        });
        // Ensure no cache calls happen
        let cacheCalls = 0;
        const origSetAndGetCache = ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory;
        ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory = (async (..._args) => {
            cacheCalls++;
            return Promise.resolve({});
        });
        try {
            const jobName = JobDTO_1.DefaultsJobs[JobDTO_1.DefaultsJobs['Album Cover Filling']];
            await ObjectManagers_1.ObjectManagers.getInstance().JobManager.run(jobName, {}, true, false);
            await waitForJobToFinish(jobName);
            expect(coverCall).to.equal(2, 'CoverManager.getPartialDirsWithoutCovers should be called twice (initial + refresh)');
            expect(personCalls).to.equal(sessions.length);
            expect(albumCalls).to.equal(sessions.length);
            expect(cacheCalls).to.equal(0, 'No cache calls when there are no directories');
        }
        finally {
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.getAvailableUserSessions = origGetSessions;
            ObjectManagers_1.ObjectManagers.getInstance().CoverManager.getPartialDirsWithoutCovers = origGetDirs;
            ObjectManagers_1.ObjectManagers.getInstance().PersonManager.getAll = origGetAllPersons;
            ObjectManagers_1.ObjectManagers.getInstance().AlbumManager.getAll = origGetAllAlbums;
            ObjectManagers_1.ObjectManagers.getInstance().ProjectedCacheManager.setAndGetCacheForDirectory = origSetAndGetCache;
        }
    });
    it('should finish when authentication is not required', async () => {
        Config_1.Config.Users.authenticationRequired = false;
        await connection.getRepository(UserEntity_1.UserEntity).deleteAll();
        const runJob = async (jobName) => {
            await ObjectManagers_1.ObjectManagers.getInstance().JobManager.run(jobName, {}, true, false);
            await waitForJobToFinish(jobName);
        };
        await runJob(JobDTO_1.DefaultsJobs[JobDTO_1.DefaultsJobs['Album Cover Reset']]);
        await runJob(JobDTO_1.DefaultsJobs[JobDTO_1.DefaultsJobs['Album Cover Filling']]);
    });
});
//# sourceMappingURL=AlbumCoverFillingJob.spec.js.map