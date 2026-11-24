"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("../../../../src/common/config/private/Config");
const server_1 = require("../../../../src/backend/server");
const UserDTO_1 = require("../../../../src/common/entities/UserDTO");
const SQLConnection_1 = require("../../../../src/backend/model/database/SQLConnection");
const ObjectManagers_1 = require("../../../../src/backend/model/ObjectManagers");
const QueryParams_1 = require("../../../../src/common/QueryParams");
const Utils_1 = require("../../../../src/common/Utils");
const RouteTestingHelper_1 = require("./RouteTestingHelper");
const Error_1 = require("../../../../src/common/entities/Error");
const PrivateConfig_1 = require("../../../../src/common/config/private/PrivateConfig");
const chai = require("chai");
const chai_http_1 = require("chai-http");
const DBTestHelper_1 = require("../../DBTestHelper");
process.env.NODE_ENV = 'test';
const should = chai.should();
chai.use(chai_http_1.default);
describe('UserRouter', () => {
    const sqlHelper = new DBTestHelper_1.DBTestHelper(PrivateConfig_1.DatabaseType.sqlite);
    const testUser = {
        id: 1,
        name: 'test',
        password: 'test',
        projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey,
        role: UserDTO_1.UserRoles.User
    };
    const { password, ...expectedUser } = testUser;
    let server;
    const setUp = async () => {
        await sqlHelper.initDB();
        server = new server_1.Server(false);
        await server.onStarted.wait();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        await ObjectManagers_1.ObjectManagers.getInstance().UserManager.createUser(Utils_1.Utils.clone(testUser));
        await SQLConnection_1.SQLConnection.close();
    };
    const tearDown = async () => {
        await sqlHelper.clearDB();
    };
    const login = async (srv) => {
        const result = await chai_http_1.request.execute(srv.Server)
            .post(Config_1.Config.Server.apiPath + '/user/login')
            .send({
            loginCredential: {
                password: testUser.password,
                username: testUser.name,
                rememberMe: false
            }
        });
        RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(result, expectedUser);
        return result;
    };
    describe('/POST user/login', () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('it should login', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            await login(server);
        });
        it('it skip login', async () => {
            Config_1.Config.Users.authenticationRequired = false;
            const result = await chai_http_1.request.execute(server.Server)
                .post(Config_1.Config.Server.apiPath + '/user/login');
            result.should.have.status(404);
        });
    });
    describe('/GET user/me', () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('it should GET the authenticated user', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            const loginRes = await login(server);
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/user/me')
                .set('Cookie', loginRes.res.headers['set-cookie']);
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(result, expectedUser);
        });
        it('it should not authenticate', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/user/me');
            result.should.have.status(401);
        });
        it('it should authenticate as user with sharing key', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            Config_1.Config.Sharing.enabled = true;
            Config_1.Config.Sharing.passwordRequired = true;
            const sharingKey = (await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser, 'pass')).sharingKey;
            const loginRes = await login(server);
            const q = {};
            q[QueryParams_1.QueryParams.gallery.sharingKey_query] = sharingKey;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/user/me?' + QueryParams_1.QueryParams.gallery.sharingKey_query + '=' + sharingKey)
                .set('Cookie', loginRes.res.headers['set-cookie']);
            // should return with logged in user, not limited sharing one
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(result, expectedUser);
        });
        it('it should authenticate with sharing key', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            Config_1.Config.Sharing.enabled = true;
            Config_1.Config.Sharing.passwordRequired = false;
            const sharing = (await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser));
            const q = {};
            q[QueryParams_1.QueryParams.gallery.sharingKey_query] = sharing.sharingKey;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/user/me?' + QueryParams_1.QueryParams.gallery.sharingKey_query + '=' + sharing.sharingKey);
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(result, RouteTestingHelper_1.RouteTestingHelper.getExpectedSharingUserForUI(sharing));
        });
        it('it should not authenticate with sharing key without password', async () => {
            Config_1.Config.Users.authenticationRequired = true;
            Config_1.Config.Sharing.enabled = true;
            Config_1.Config.Sharing.passwordRequired = true;
            const sharing = (await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser, 'pass_secret'));
            const q = {};
            q[QueryParams_1.QueryParams.gallery.sharingKey_query] = sharing.sharingKey;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/user/me?' + QueryParams_1.QueryParams.gallery.sharingKey_query + '=' + sharing.sharingKey);
            result.should.have.status(401);
            result.body.should.be.a('object');
            result.body.error.should.be.a('object');
            should.equal(result.body.error.code, Error_1.ErrorCodes.NOT_AUTHENTICATED);
        });
        it('it should authenticate as guest', async () => {
            Config_1.Config.Users.authenticationRequired = false;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/user/me');
            const expectedGuestUser = {
                name: UserDTO_1.UserRoles[Config_1.Config.Users.unAuthenticatedUserRole],
                projectionKey: DBTestHelper_1.DBTestHelper.defaultSession.user.projectionKey,
                role: Config_1.Config.Users.unAuthenticatedUserRole
            };
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(result, expectedGuestUser);
        });
    });
});
//# sourceMappingURL=UserRouter.spec.js.map