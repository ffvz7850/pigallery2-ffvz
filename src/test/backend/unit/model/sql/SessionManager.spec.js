"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-unused-expressions,@typescript-eslint/no-unused-expressions */
const chai_1 = require("chai");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const UserEntity_1 = require("../../../../../src/backend/model/database/enitites/UserEntity");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const UserDTO_1 = require("../../../../../src/common/entities/UserDTO");
const typeorm_1 = require("typeorm");
const DBTestHelper_1 = require("../../../DBTestHelper");
const SharingEntity_1 = require("../../../../../src/backend/model/database/enitites/SharingEntity");
const SessionManager_1 = require("../../../../../src/backend/model/database/SessionManager");
const Config_1 = require("../../../../../src/common/config/private/Config");
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe(); // fake it so the IDE plays nicely (recognize the test)
describe('SessionManager', (sqlHelper) => {
    describe = tmpDescribe;
    describe('buildContext', () => {
        // Reset ObjectManagers before each test
        beforeEach(async () => {
            await sqlHelper.initDB();
        });
        afterEach(sqlHelper.clearDB);
        it('should create a basic context with user and no queries', async () => {
            // Create a basic user with no queries
            const sm = new SessionManager_1.SessionManager();
            const user = new UserEntity_1.UserEntity();
            user.id = 1;
            user.name = 'testuser';
            user.role = UserDTO_1.UserRoles.Admin;
            // Create the context
            const context = await sm.buildContext(user);
            // Verify the context
            (0, chai_1.expect)(context).to.not.be.null;
            (0, chai_1.expect)(context.user).to.be.eql(user);
            (0, chai_1.expect)(context.projectionQuery).to.be.undefined;
        });
        it('should create a context with allowQuery and set projectionQuery', async () => {
            // Create a basic user with no queries
            const sm = new SessionManager_1.SessionManager();
            // Create a user with allowQuery
            const user = new UserEntity_1.UserEntity();
            user.id = 2;
            user.name = 'allowuser';
            user.role = UserDTO_1.UserRoles.Admin;
            user.overrideAllowBlockList = true;
            user.allowQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/allowed/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            // Mock the SearchManager.prepareAndBuildWhereQuery method
            const mockProjectionQuery = new typeorm_1.Brackets(qb => qb.where('directory.path = :path', { path: '/allowed/path' }));
            ObjectManagers_1.ObjectManagers.getInstance().SearchManager = {
                prepareAndBuildWhereQuery: (query) => {
                    // Verify the query is passed correctly
                    (0, chai_1.expect)(query).to.be.eql(user.allowQuery);
                    return Promise.resolve(mockProjectionQuery);
                },
                hasDirectoryQuery: () => true
            };
            // Create the context
            const context = await sm.buildContext(user);
            // Verify the context
            (0, chai_1.expect)(context).to.not.be.null;
            (0, chai_1.expect)(context.user).to.be.eql(user);
            (0, chai_1.expect)(context.projectionQuery).to.be.eql(mockProjectionQuery);
            (0, chai_1.expect)(context.user.projectionKey).to.be.a('string').and.not.empty;
        });
        it('should create a context with blockQuery, negate it, and set projectionQuery', async () => {
            // Create a basic user with no queries
            const sm = new SessionManager_1.SessionManager();
            // Create a user with blockQuery
            const user = new UserEntity_1.UserEntity();
            user.id = 3;
            user.name = 'blockuser';
            user.role = UserDTO_1.UserRoles.Admin;
            user.overrideAllowBlockList = true;
            user.blockQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/blocked/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                negate: false
            };
            // Clone the original blockQuery for later comparison
            const originalBlockQuery = JSON.parse(JSON.stringify(user.blockQuery));
            // Mock the SearchManager.prepareAndBuildWhereQuery method
            const mockProjectionQuery = new typeorm_1.Brackets(qb => qb.where('directory.path != :path', { path: '/blocked/path' }));
            ObjectManagers_1.ObjectManagers.getInstance().SearchManager = {
                prepareAndBuildWhereQuery: (query) => {
                    // Verify the query has been negated
                    (0, chai_1.expect)(query).to.not.be.eql(originalBlockQuery);
                    (0, chai_1.expect)(query.negate).to.be.true;
                    return Promise.resolve(mockProjectionQuery);
                },
                hasDirectoryQuery: () => true
            };
            // Create the context
            const context = await sm.buildContext(user);
            // Verify the context
            (0, chai_1.expect)(context).to.not.be.null;
            (0, chai_1.expect)(context.user).to.be.eql(user);
            (0, chai_1.expect)(context.projectionQuery).to.be.eql(mockProjectionQuery);
            (0, chai_1.expect)(context.user.projectionKey).to.be.a('string').and.not.empty;
            // Verify the blockQuery was not changed
            (0, chai_1.expect)(user.blockQuery.negate).to.be.false;
        });
        it('should create a context with both allowQuery and blockQuery, combine them with AND', async () => {
            const sm = new SessionManager_1.SessionManager();
            // Create a user with both allowQuery and blockQuery
            const user = new UserEntity_1.UserEntity();
            user.id = 4;
            user.name = 'bothuser';
            user.role = UserDTO_1.UserRoles.Admin;
            user.overrideAllowBlockList = true;
            user.allowQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.directory,
                        value: '/allowed/path',
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                    },
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                        value: 'photo',
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                    }
                ]
            };
            user.blockQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/blocked/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                negate: false
            };
            // Clone the original queries for later comparison
            const originalAllowQuery = JSON.parse(JSON.stringify(user.allowQuery));
            const originalBlockQuery = JSON.parse(JSON.stringify(user.blockQuery));
            // Mock the SearchManager.prepareAndBuildWhereQuery method
            const mockProjectionQuery = new typeorm_1.Brackets(qb => qb.where('complex combined query'));
            ObjectManagers_1.ObjectManagers.getInstance().SearchManager = {
                prepareAndBuildWhereQuery: (query) => {
                    // Verify the query is an AND combination of allowQuery and negated blockQuery
                    (0, chai_1.expect)(query.type).to.be.eql(SearchQueryDTO_1.SearchQueryTypes.AND);
                    (0, chai_1.expect)(query.list).to.have.lengthOf(2);
                    (0, chai_1.expect)(query.list[0]).to.be.eql(originalAllowQuery);
                    (0, chai_1.expect)(query.list[1].negate).to.be.true;
                    return Promise.resolve(mockProjectionQuery);
                },
                hasDirectoryQuery: () => true
            };
            // Create the context
            const context = await sm.buildContext(user);
            // Verify the context
            (0, chai_1.expect)(context).to.not.be.null;
            (0, chai_1.expect)(context.user).to.be.eql(user);
            (0, chai_1.expect)(context.projectionQuery).to.be.eql(mockProjectionQuery);
            (0, chai_1.expect)(context.user.projectionKey).to.be.a('string').and.not.empty;
            // Verify the blockQuery was not changed
            (0, chai_1.expect)(user.blockQuery.negate).to.be.false;
        });
        it('should generate consistent projectionKey for the same query', async () => {
            const sm = new SessionManager_1.SessionManager();
            // Create two identical users with the same query
            const user1 = new UserEntity_1.UserEntity();
            user1.id = 5;
            user1.name = 'user1';
            user1.role = UserDTO_1.UserRoles.Admin;
            user1.overrideAllowBlockList = true;
            user1.allowQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/allowed/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            const user2 = new UserEntity_1.UserEntity();
            user2.id = 6;
            user2.name = 'user2';
            user2.role = UserDTO_1.UserRoles.Admin;
            user2.overrideAllowBlockList = true;
            user2.allowQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/allowed/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            // Mock the SearchManager.prepareAndBuildWhereQuery method
            const mockProjectionQuery = new typeorm_1.Brackets(qb => qb.where('directory.path = :path', { path: '/allowed/path' }));
            /*     ObjectManagers.getInstance().SearchManager = {
                   prepareAndBuildWhereQuery: (query: any) => {
                     return Promise.resolve(mockProjectionQuery);
                   }
                 } as any;*/
            // Create the contexts
            const context1 = await sm.buildContext(user1);
            const context2 = await sm.buildContext(user2);
            // Verify both users have the same projectionKey despite being different users
            (0, chai_1.expect)(context1.user.projectionKey).to.be.a('string').and.not.empty;
            (0, chai_1.expect)(context2.user.projectionKey).to.be.a('string').and.not.empty;
            (0, chai_1.expect)(context1.user.projectionKey).to.be.eql(context2.user.projectionKey);
        });
    });
    describe('buildAllowListForSharing', () => {
        // Reset ObjectManagers before each test
        beforeEach(async () => {
            await sqlHelper.initDB();
        });
        afterEach(sqlHelper.clearDB);
        it('should return sharing.searchQuery unchanged when creator has no allow/block query', async () => {
            const sm = new SessionManager_1.SessionManager();
            const creator = new UserEntity_1.UserEntity();
            creator.id = 10;
            creator.name = 'creator1';
            creator.role = UserDTO_1.UserRoles.Admin;
            creator.overrideAllowBlockList = true; // use only user queries; none set
            const sharing = new SharingEntity_1.SharingEntity();
            sharing.creator = creator;
            sharing.searchQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/shared/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            const result = sm.buildAllowListForSharing(sharing);
            (0, chai_1.expect)(result).to.be.eql(sharing.searchQuery);
        });
        it('should AND creator allowQuery with sharing.searchQuery', async () => {
            const sm = new SessionManager_1.SessionManager();
            const creator = new UserEntity_1.UserEntity();
            creator.id = 11;
            creator.name = 'creator2';
            creator.role = UserDTO_1.UserRoles.Admin;
            creator.overrideAllowBlockList = true;
            creator.allowQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/allowed/by/creator',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            const sharing = new SharingEntity_1.SharingEntity();
            sharing.creator = creator;
            sharing.searchQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'holiday',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            const result = sm.buildAllowListForSharing(sharing);
            (0, chai_1.expect)(result.type).to.be.eql(SearchQueryDTO_1.SearchQueryTypes.AND);
            (0, chai_1.expect)(result.list).to.have.lengthOf(2);
            (0, chai_1.expect)(result.list[0]).to.be.eql(creator.allowQuery);
            (0, chai_1.expect)(result.list[1]).to.be.eql(sharing.searchQuery);
        });
        it('should AND creator (allow AND negated block) with sharing.searchQuery', async () => {
            const sm = new SessionManager_1.SessionManager();
            const creator = new UserEntity_1.UserEntity();
            creator.id = 12;
            creator.name = 'creator3';
            creator.role = UserDTO_1.UserRoles.Admin;
            creator.overrideAllowBlockList = true;
            creator.allowQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/allowed',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            creator.blockQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                value: 'secret',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                negate: false
            };
            const sharing = new SharingEntity_1.SharingEntity();
            sharing.creator = creator;
            sharing.searchQuery = {
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '/event/path',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            const result = sm.buildAllowListForSharing(sharing);
            (0, chai_1.expect)(result.type).to.be.eql(SearchQueryDTO_1.SearchQueryTypes.AND);
            (0, chai_1.expect)(result.list).to.have.lengthOf(2);
            const creatorQuery = result.list[0];
            (0, chai_1.expect)(creatorQuery.type).to.be.eql(SearchQueryDTO_1.SearchQueryTypes.AND);
            (0, chai_1.expect)(creatorQuery.list).to.have.lengthOf(2);
            (0, chai_1.expect)(creatorQuery.list[0]).to.be.eql(creator.allowQuery);
            (0, chai_1.expect)(creatorQuery.list[1].negate).to.be.true;
            (0, chai_1.expect)(result.list[1]).to.be.eql(sharing.searchQuery);
        });
    });
    describe('getAvailableUserSessions', () => {
        // Reset ObjectManagers before each test
        beforeEach(async () => {
            await sqlHelper.initDB();
        });
        afterEach(sqlHelper.clearDB);
        it('should return unauthenticated session when authenticationRequired is false', async () => {
            const sm = new SessionManager_1.SessionManager();
            // Backup and override config
            const originalAuthRequired = Config_1.Config.Users.authenticationRequired;
            Config_1.Config.Users.authenticationRequired = false;
            // Stub UserManager.getUnAuthenticatedUser
            const om = ObjectManagers_1.ObjectManagers.getInstance();
            const originalGetUnauth = om.UserManager.getUnAuthenticatedUser;
            const unauthUser = new UserEntity_1.UserEntity();
            unauthUser.id = 99;
            unauthUser.name = 'unauth';
            unauthUser.role = UserDTO_1.UserRoles.Guest;
            om.UserManager.getUnAuthenticatedUser = () => unauthUser;
            // Also ensure find() would not be used (defensive)
            const originalFind = om.UserManager.find;
            om.UserManager.find = () => { throw new Error('find() should not be called when auth is disabled'); };
            try {
                const sessions = await sm.getAvailableUserSessions();
                (0, chai_1.expect)(sessions).to.have.lengthOf(1);
                (0, chai_1.expect)(sessions[0].user).to.eql(unauthUser);
                (0, chai_1.expect)(sessions[0].projectionQuery).to.be.undefined;
                (0, chai_1.expect)(sessions[0].user.projectionKey).to.be.a('string').and.not.empty;
            }
            finally {
                // restore stubs and config
                om.UserManager.getUnAuthenticatedUser = originalGetUnauth;
                om.UserManager.find = originalFind;
                Config_1.Config.Users.authenticationRequired = originalAuthRequired;
            }
        });
        it('should return contexts for users when authenticationRequired is true', async () => {
            const sm = new SessionManager_1.SessionManager();
            // Backup and enforce config
            const originalAuthRequired = Config_1.Config.Users.authenticationRequired;
            Config_1.Config.Users.authenticationRequired = true;
            const om = ObjectManagers_1.ObjectManagers.getInstance();
            // Stub UserManager.find to return two users
            const originalFind = om.UserManager.find;
            const u1 = new UserEntity_1.UserEntity();
            u1.id = 1;
            u1.name = 'u1';
            u1.role = UserDTO_1.UserRoles.User;
            const u2 = new UserEntity_1.UserEntity();
            u2.id = 2;
            u2.name = 'u2';
            u2.role = UserDTO_1.UserRoles.Admin;
            om.UserManager.find = () => Promise.resolve([u1, u2]);
            try {
                const sessions = await sm.getAvailableUserSessions();
                (0, chai_1.expect)(sessions).to.have.lengthOf(2);
                const users = sessions.map(s => s.user);
                (0, chai_1.expect)(users).to.have.members([u1, u2]);
                sessions.forEach(s => {
                    (0, chai_1.expect)(s.projectionQuery).to.be.undefined;
                    (0, chai_1.expect)(s.user.projectionKey).to.be.a('string').and.not.empty;
                });
            }
            finally {
                om.UserManager.find = originalFind;
                Config_1.Config.Users.authenticationRequired = originalAuthRequired;
            }
        });
    });
});
//# sourceMappingURL=SessionManager.spec.js.map