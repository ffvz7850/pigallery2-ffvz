"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-unused-expressions,@typescript-eslint/no-unused-expressions */
const chai_1 = require("chai");
const AuthenticationMWs_1 = require("../../../../../src/backend/middlewares/user/AuthenticationMWs");
const Error_1 = require("../../../../../src/common/entities/Error");
const UserDTO_1 = require("../../../../../src/common/entities/UserDTO");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const Config_1 = require("../../../../../src/common/config/private/Config");
const path = require("path");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const DBTestHelper_1 = require("../../../DBTestHelper");
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe();
describe('Authentication middleware', (sqlHelper) => {
    describe = tmpDescribe;
    before(sqlHelper.clearDB);
    beforeEach(async () => {
        await sqlHelper.initDB();
    });
    describe('authenticate', () => {
        it('should call next on authenticated', (done) => {
            const req = {
                session: {
                    context: {
                        user: 'A user'
                    }
                },
                sessionOptions: {},
                query: {},
                params: {}
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    done();
                }
                catch (err) {
                    done(err);
                }
            };
            AuthenticationMWs_1.AuthenticationMWs.authenticate(req, null, next);
        });
        it('should call next with error on not authenticated', (done) => {
            const req = {
                session: {},
                sessionOptions: {},
                query: {},
                params: {}
            };
            Config_1.Config.Users.authenticationRequired = true;
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).not.to.be.undefined;
                    (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.NOT_AUTHENTICATED);
                    done();
                }
                catch (err) {
                    done(err);
                }
            };
            AuthenticationMWs_1.AuthenticationMWs.authenticate(req, {
                status: () => {
                    // empty
                }
            }, next);
        });
        it('should rebuild context to restore projectionQuery if missing but projectionKey is present', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            const user = { name: 'Guest', role: UserDTO_1.UserRoles.LimitedGuest, projectionKey: 'k1' };
            const rebuiltContext = { user, projectionQuery: { some: 'query' } };
            const req = {
                session: { context: { user, projectionQuery: undefined } },
                query: {},
                params: {}
            };
            let called = 0;
            const orig = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext;
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async (u) => {
                called++;
                (0, chai_1.expect)(u).to.eql(user);
                return rebuiltContext;
            };
            let nextErr = 'not-called';
            await AuthenticationMWs_1.AuthenticationMWs.authenticate(req, null, (err) => {
                nextErr = err;
            });
            // restore
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = orig;
            (0, chai_1.expect)(nextErr).to.be.undefined;
            (0, chai_1.expect)(called).to.eql(1);
            (0, chai_1.expect)(req.session.context).to.eql(rebuiltContext);
            (0, chai_1.expect)(req.session.context.projectionQuery).to.deep.equal({ some: 'query' });
        });
        it('should rebuild context if projectionQuery is an empty object', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            const user = { name: 'Guest', role: UserDTO_1.UserRoles.LimitedGuest, projectionKey: 'k-empty' };
            const rebuiltContext = { user, projectionQuery: { restored: true } };
            const req = {
                session: { context: { user, projectionQuery: {} } },
                query: {},
                params: {}
            };
            let called = 0;
            const orig = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext;
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async (u) => {
                called++;
                (0, chai_1.expect)(u).to.eql(user);
                return rebuiltContext;
            };
            let nextErr = 'not-called';
            await AuthenticationMWs_1.AuthenticationMWs.authenticate(req, null, (err) => {
                nextErr = err;
            });
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = orig;
            (0, chai_1.expect)(nextErr).to.be.undefined;
            (0, chai_1.expect)(called).to.eql(1);
            (0, chai_1.expect)(req.session.context).to.eql(rebuiltContext);
            (0, chai_1.expect)(req.session.context.projectionQuery).to.deep.equal({ restored: true });
        });
        it('should NOT rebuild context if projectionQuery is present', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            const user = { name: 'Guest', role: UserDTO_1.UserRoles.LimitedGuest, projectionKey: 'k2' };
            const originalContext = { user, projectionQuery: { ok: true } };
            const req = { session: { context: originalContext }, query: {}, params: {} };
            let called = 0;
            const orig = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext;
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async () => {
                called++;
                return originalContext;
            };
            let nextErr = 'not-called';
            await AuthenticationMWs_1.AuthenticationMWs.authenticate(req, null, (err) => {
                nextErr = err;
            });
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = orig;
            (0, chai_1.expect)(nextErr).to.be.undefined;
            (0, chai_1.expect)(called).to.eql(0);
            (0, chai_1.expect)(req.session.context).to.eql(originalContext);
        });
    });
    describe('inverseAuthenticate', () => {
        it('should call next with error on authenticated', (done) => {
            const req = {
                session: {},
                sessionOptions: {},
            };
            const res = {};
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    done();
                }
                catch (err) {
                    done(err);
                }
            };
            AuthenticationMWs_1.AuthenticationMWs.inverseAuthenticate(req, null, next);
        });
        it('should call next error on authenticated', (done) => {
            const req = {
                session: {
                    context: {
                        user: 'A user'
                    }
                },
                sessionOptions: {},
            };
            const next = (err) => {
                (0, chai_1.expect)(err).not.to.be.undefined;
                (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.ALREADY_AUTHENTICATED);
                done();
            };
            AuthenticationMWs_1.AuthenticationMWs.inverseAuthenticate(req, null, next);
        });
    });
    describe('authorise', () => {
        it('should call next on authorised', (done) => {
            const req = {
                session: {
                    context: {
                        user: {
                            role: UserDTO_1.UserRoles.LimitedGuest
                        }
                    }
                },
                sessionOptions: {}
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    done();
                }
                catch (err) {
                    done(err);
                }
            };
            AuthenticationMWs_1.AuthenticationMWs.authorise(UserDTO_1.UserRoles.LimitedGuest)(req, null, next);
        });
        it('should call next with error on not authorised', (done) => {
            const req = {
                session: {
                    context: {
                        user: {
                            role: UserDTO_1.UserRoles.LimitedGuest
                        }
                    }
                },
                sessionOptions: {}
            };
            const next = (err) => {
                (0, chai_1.expect)(err).not.to.be.undefined;
                (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.NOT_AUTHORISED);
                done();
            };
            AuthenticationMWs_1.AuthenticationMWs.authorise(UserDTO_1.UserRoles.Developer)(req, null, next);
        });
    });
    describe('login', () => {
        beforeEach(async () => {
            await sqlHelper.initDB();
        });
        describe('should call input ErrorDTO next on missing...', () => {
            it('body', (done) => {
                const req = {
                    query: {},
                    params: {}
                };
                const next = (err) => {
                    (0, chai_1.expect)(err).not.to.be.undefined;
                    (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.INPUT_ERROR);
                    done();
                };
                AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
            });
            it('loginCredential', (done) => {
                const req = {
                    body: {},
                    query: {},
                    params: {}
                };
                const next = (err) => {
                    try {
                        (0, chai_1.expect)(err).not.to.be.undefined;
                        (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.INPUT_ERROR);
                        done();
                    }
                    catch (err) {
                        done(err);
                    }
                };
                AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
            });
            it('loginCredential content', (done) => {
                const req = {
                    body: { loginCredential: {} },
                    query: {},
                    params: {}
                };
                const next = (err) => {
                    try {
                        (0, chai_1.expect)(err).not.to.be.undefined;
                        (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.INPUT_ERROR);
                        done();
                    }
                    catch (err) {
                        done(err);
                    }
                };
                AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
            });
        });
        it('should call next with error on not finding user', (done) => {
            const req = {
                body: {
                    loginCredential: {
                        username: 'aa',
                        password: 'bb'
                    }
                },
                query: {},
                params: {}
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).not.to.be.undefined;
                    (0, chai_1.expect)(err.code).to.be.eql(Error_1.ErrorCodes.CREDENTIAL_NOT_FOUND);
                    done();
                }
                catch (err) {
                    done(err);
                }
            };
            ObjectManagers_1.ObjectManagers.getInstance().UserManager = {
                findOne: (_) => {
                    return Promise.reject(null);
                }
            };
            AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
        });
        it('should call next with user on the session on finding user', (done) => {
            const req = {
                session: {},
                body: {
                    loginCredential: {
                        username: 'aa',
                        password: 'bb'
                    }
                },
                query: {},
                params: {}
            };
            const testUser = 'test user';
            const testContext = { user: testUser };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    (0, chai_1.expect)(req.session.context).to.be.eql(testContext);
                    done();
                }
                catch (error) {
                    console.error(error);
                    done(error);
                }
            };
            ObjectManagers_1.ObjectManagers.getInstance().UserManager = {
                findOne: (filter) => {
                    return Promise.resolve(testUser);
                }
            };
            // Add SearchManager mock to avoid errors in buildContext
            ObjectManagers_1.ObjectManagers.getInstance().SearchManager = {
                prepareAndBuildWhereQuery: (query) => {
                    return Promise.resolve(null);
                }
            };
            // @ts-ignore
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async (user) => {
                (0, chai_1.expect)(user).to.be.eql(testUser);
                return testContext;
            };
            AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
        });
        it('should create context with allowQuery', (done) => {
            const req = {
                session: {},
                body: {
                    loginCredential: {
                        username: 'aa',
                        password: 'bb'
                    }
                },
                query: {},
                params: {}
            };
            const testUser = {
                name: 'testuser',
                role: UserDTO_1.UserRoles.Admin,
                allowQuery: {
                    type: SearchQueryDTO_1.SearchQueryTypes.directory,
                    text: '/allowed/path',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                }
            };
            const projectionQuery = { someQueryObject: true };
            const testContext = {
                user: testUser,
                projectionQuery: projectionQuery
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    (0, chai_1.expect)(req.session?.context).to.be.eql(testContext);
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            ObjectManagers_1.ObjectManagers.getInstance().UserManager = {
                findOne: (filter) => {
                    return Promise.resolve(testUser);
                }
            };
            // @ts-ignore
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async (user) => {
                (0, chai_1.expect)(user).to.be.eql(testUser);
                return testContext;
            };
            AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
        });
        it('should create context with blockQuery', (done) => {
            const req = {
                session: {},
                body: {
                    loginCredential: {
                        username: 'aa',
                        password: 'bb'
                    }
                },
                query: {},
                params: {}
            };
            const testUser = {
                name: 'testuser',
                role: UserDTO_1.UserRoles.Admin,
                blockQuery: {
                    type: SearchQueryDTO_1.SearchQueryTypes.directory,
                    text: '/blocked/path',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                }
            };
            const projectionQuery = { someQueryObject: true };
            const testContext = {
                user: testUser,
                projectionQuery: projectionQuery
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    (0, chai_1.expect)(req.session?.context).to.be.eql(testContext);
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            // @ts-ignore
            ObjectManagers_1.ObjectManagers.getInstance().UserManager = {
                findOne: (filter) => {
                    return Promise.resolve(testUser);
                }
            };
            ObjectManagers_1.ObjectManagers.getInstance().SearchManager = {
                prepareAndBuildWhereQuery: (query) => {
                    // In real code, the blockQuery would be negated first
                    (0, chai_1.expect)(query).not.to.be.undefined;
                    return Promise.resolve(projectionQuery);
                }
            };
            // @ts-ignore
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async (user) => {
                (0, chai_1.expect)(user).to.be.eql(testUser);
                return testContext;
            };
            AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
        });
        it('should create context with both allowQuery and blockQuery', (done) => {
            const req = {
                session: {},
                body: {
                    loginCredential: {
                        username: 'aa',
                        password: 'bb'
                    }
                },
                query: {},
                params: {}
            };
            const testUser = {
                name: 'testuser',
                role: UserDTO_1.UserRoles.Admin,
                allowQuery: {
                    type: SearchQueryDTO_1.SearchQueryTypes.directory,
                    text: '/allowed/path',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                },
                blockQuery: {
                    type: SearchQueryDTO_1.SearchQueryTypes.directory,
                    text: '/blocked/path',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                }
            };
            const projectionQuery = { someQueryObject: true };
            const testContext = {
                user: {
                    ...testUser,
                    projectionKey: 'some-hash-value'
                },
                projectionQuery: projectionQuery
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    (0, chai_1.expect)(req.session.context).to.be.eql(testContext);
                    (0, chai_1.expect)(req.session.context.user.projectionKey).not.to.be.undefined;
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            // @ts-ignore
            ObjectManagers_1.ObjectManagers.getInstance().UserManager = {
                findOne: (filter) => {
                    return Promise.resolve({ ...testUser });
                }
            };
            ObjectManagers_1.ObjectManagers.getInstance().SearchManager = {
                prepareAndBuildWhereQuery: (query) => {
                    // In the real code, this would be an AND query combining allowQuery and negated blockQuery
                    (0, chai_1.expect)(query.type).to.be.eql(SearchQueryDTO_1.SearchQueryTypes.AND);
                    (0, chai_1.expect)(query.list).to.have.lengthOf(2);
                    return Promise.resolve(projectionQuery);
                }
            };
            // @ts-ignore
            ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext = async (user) => {
                (0, chai_1.expect)(user).to.deep.include({
                    name: testUser.name,
                    role: testUser.role
                });
                return testContext;
            };
            AuthenticationMWs_1.AuthenticationMWs.login(req, null, next);
        });
    });
    describe('authoriseMedia', () => {
        const buildReq = (mediaRelPath) => ({
            session: {
                context: {
                    user: { role: UserDTO_1.UserRoles.LimitedGuest }
                }
            },
            params: {
                mediaPath: path.normalize(mediaRelPath)
            }
        });
        const run = (req) => new Promise((resolve) => {
            const res = { sendStatus: (code) => resolve(code) };
            const next = () => resolve('ok');
            const mw = AuthenticationMWs_1.AuthenticationMWs.authoriseMedia('mediaPath');
            // Normalization is called by the router, mimic it here
            AuthenticationMWs_1.AuthenticationMWs.normalizePathParam('mediaPath')(req, {}, () => {
                mw(req, res, next);
            });
        });
        it('should call next if GalleryManager.authoriseMedia allows', async () => {
            const req = buildReq('/allowed/dir/photo.jpg');
            // Mock GalleryManager to allow
            ObjectManagers_1.ObjectManagers.getInstance().GalleryManager = {
                authoriseMedia: async (_session, _mediaPath) => true
            };
            const result = await run(req);
            (0, chai_1.expect)(result).to.eql('ok');
        });
        it('should deny if GalleryManager.authoriseMedia denies', async () => {
            const req = buildReq('/allowed/dir/photo.jpg');
            // Mock GalleryManager to deny
            ObjectManagers_1.ObjectManagers.getInstance().GalleryManager = {
                authoriseMedia: async (_session, _mediaPath) => false
            };
            const result = await run(req);
            (0, chai_1.expect)(result).to.eql(403);
        });
        it('should deny (403) on error thrown by GalleryManager.authoriseMedia', async () => {
            const req = buildReq('/allowed/dir/photo.jpg');
            ObjectManagers_1.ObjectManagers.getInstance().GalleryManager = {
                authoriseMedia: async () => {
                    throw new Error('db error');
                }
            };
            const result = await run(req);
            (0, chai_1.expect)(result).to.eql(403);
        });
    });
    describe('authoriseMetaFiles', () => {
        const buildReq = (metaPath) => ({
            session: {
                context: {
                    user: { role: UserDTO_1.UserRoles.LimitedGuest }
                }
            },
            params: {
                metaPath: path.normalize(metaPath)
            }
        });
        const run = (req) => new Promise((resolve) => {
            const res = { sendStatus: (code) => resolve(code) };
            const next = () => resolve('ok');
            const mw = AuthenticationMWs_1.AuthenticationMWs.authoriseMetaFiles('metaPath');
            AuthenticationMWs_1.AuthenticationMWs.normalizePathParam('metaPath')(req, {}, () => {
                mw(req, res, next);
            });
        });
        it('should call next if GalleryManager.authoriseMetaFile allows', async () => {
            const req = buildReq('/some/dir/notes.md');
            ObjectManagers_1.ObjectManagers.getInstance().GalleryManager = {
                authoriseMetaFile: async (_session, _path) => true
            };
            const result = await run(req);
            (0, chai_1.expect)(result).to.eql('ok');
        });
        it('should deny if GalleryManager.authoriseMetaFile denies', async () => {
            const req = buildReq('/some/dir/notes.md');
            ObjectManagers_1.ObjectManagers.getInstance().GalleryManager = {
                authoriseMetaFile: async (_session, _path) => false
            };
            const result = await run(req);
            (0, chai_1.expect)(result).to.eql(403);
        });
        it('should deny (403) on error thrown by GalleryManager.authoriseMetaFile', async () => {
            const req = buildReq('/some/dir/notes.md');
            ObjectManagers_1.ObjectManagers.getInstance().GalleryManager = {
                authoriseMetaFile: async () => {
                    throw new Error('db error');
                }
            };
            const result = await run(req);
            (0, chai_1.expect)(result).to.eql(403);
        });
    });
    describe('logout', () => {
        it('should call next on logout', (done) => {
            const req = {
                session: {
                    context: {
                        user: {
                            role: UserDTO_1.UserRoles.LimitedGuest
                        }
                    }
                }
            };
            const next = (err) => {
                try {
                    (0, chai_1.expect)(err).to.be.undefined;
                    (0, chai_1.expect)(req.session.context).to.be.undefined;
                    done();
                }
                catch (err) {
                    done(err);
                }
            };
            AuthenticationMWs_1.AuthenticationMWs.logout(req, null, next);
        });
    });
});
//# sourceMappingURL=AuthenticationMWs.spec.js.map