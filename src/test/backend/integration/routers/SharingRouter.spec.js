"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("../../../../src/common/config/private/Config");
const server_1 = require("../../../../src/backend/server");
const UserDTO_1 = require("../../../../src/common/entities/UserDTO");
const path = require("path");
const fs = require("fs");
const SQLConnection_1 = require("../../../../src/backend/model/database/SQLConnection");
const ObjectManagers_1 = require("../../../../src/backend/model/ObjectManagers");
const Utils_1 = require("../../../../src/common/Utils");
const RouteTestingHelper_1 = require("./RouteTestingHelper");
const QueryParams_1 = require("../../../../src/common/QueryParams");
const Error_1 = require("../../../../src/common/entities/Error");
const PrivateConfig_1 = require("../../../../src/common/config/private/PrivateConfig");
const ProjectPath_1 = require("../../../../src/backend/ProjectPath");
const chai = require("chai");
const chai_http_1 = require("chai-http");
process.env.NODE_ENV = 'test';
const should = chai.should();
chai.use(chai_http_1.default);
describe('SharingRouter', () => {
    const testUser = {
        id: 1,
        name: 'test',
        password: 'test',
        role: UserDTO_1.UserRoles.User
    };
    const { password: pass, ...expectedUser } = testUser;
    const tempDir = path.join(__dirname, '../../tmp');
    let server;
    const setUp = async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        Config_1.Config.Users.authenticationRequired = true;
        Config_1.Config.Sharing.enabled = true;
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
        Config_1.Config.Database.dbFolder = tempDir;
        ProjectPath_1.ProjectPath.reset();
        server = new server_1.Server(false);
        await server.onStarted.wait();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        await ObjectManagers_1.ObjectManagers.getInstance().UserManager.createUser(Utils_1.Utils.clone(testUser));
        await SQLConnection_1.SQLConnection.close();
    };
    const tearDown = async () => {
        await ObjectManagers_1.ObjectManagers.reset();
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    };
    const shareLogin = async (srv, sharingKey, password) => {
        return chai_http_1.request.execute(srv.Server)
            .post(Config_1.Config.Server.apiPath + '/share/login?' + QueryParams_1.QueryParams.gallery.sharingKey_query + '=' + sharingKey)
            .send({ password });
    };
    describe('/POST share/login', () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should login with passworded share when password required', async () => {
            Config_1.Config.Sharing.passwordRequired = true;
            const sharing = await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser, 'secret_pass');
            const res = await shareLogin(server, sharing.sharingKey, sharing.password);
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(res, RouteTestingHelper_1.RouteTestingHelper.getExpectedSharingUserForUI(sharing));
        });
        it('should login with passworded share when password not required', async () => {
            Config_1.Config.Sharing.passwordRequired = false;
            const sharing = await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser, 'secret_pass');
            const res = await shareLogin(server, sharing.sharingKey, sharing.password);
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(res, RouteTestingHelper_1.RouteTestingHelper.getExpectedSharingUserForUI(sharing));
        });
        it('should login without passworded share when password not required', async () => {
            Config_1.Config.Sharing.passwordRequired = false;
            const sharing = await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser);
            const res = await shareLogin(server, sharing.sharingKey, sharing.password);
            RouteTestingHelper_1.RouteTestingHelper.shouldBeValidUIUser(res, RouteTestingHelper_1.RouteTestingHelper.getExpectedSharingUserForUI(sharing));
        });
        it('should not login with passworded share without password', async () => {
            Config_1.Config.Sharing.passwordRequired = true;
            const sharing = await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser, 'secret_pass');
            const result = await shareLogin(server, sharing.sharingKey);
            result.should.have.status(401);
            result.body.should.be.a('object');
            result.body.error.should.be.a('object');
            should.equal(result.body.error.code, Error_1.ErrorCodes.CREDENTIAL_NOT_FOUND);
        });
        it('should not login to share without password  when password required', async () => {
            Config_1.Config.Sharing.passwordRequired = false;
            const sharing = await RouteTestingHelper_1.RouteTestingHelper.createSharing(testUser);
            Config_1.Config.Sharing.passwordRequired = true;
            const result = await shareLogin(server, sharing.sharingKey);
            result.should.have.status(401);
            result.body.should.be.a('object');
            result.body.error.should.be.a('object');
            should.equal(result.body.error.code, Error_1.ErrorCodes.CREDENTIAL_NOT_FOUND);
        });
    });
});
//# sourceMappingURL=SharingRouter.spec.js.map