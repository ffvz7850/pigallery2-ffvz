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
const PrivateConfig_1 = require("../../../../src/common/config/private/PrivateConfig");
const ProjectPath_1 = require("../../../../src/backend/ProjectPath");
const chai = require("chai");
const chai_http_1 = require("chai-http");
const DBTestHelper_1 = require("../../DBTestHelper");
process.env.NODE_ENV = 'test';
const should = chai.should();
chai.use(chai_http_1.default);
describe('UploadRouter', () => {
    const sqlHelper = new DBTestHelper_1.DBTestHelper(PrivateConfig_1.DatabaseType.sqlite);
    const testDir = path.join(__dirname, 'tmp_upload');
    const adminUser = {
        id: 1,
        name: 'admin',
        password: 'admin',
        role: UserDTO_1.UserRoles.Admin
    };
    let server;
    before(async () => {
        Config_1.Config.Upload.enabled = true;
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        Config_1.Config.Media.folder = testDir;
        ProjectPath_1.ProjectPath.reset();
    });
    after(async () => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    const setUp = async () => {
        Config_1.Config.Upload.enabled = true;
        await sqlHelper.initDB();
        server = new server_1.Server(false);
        await server.onStarted.wait();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        Config_1.Config.Upload.enabled = true; // Set it again after init
        await ObjectManagers_1.ObjectManagers.getInstance().UserManager.createUser(Utils_1.Utils.clone(adminUser));
        await SQLConnection_1.SQLConnection.close();
    };
    const tearDown = async () => {
        await sqlHelper.clearDB();
    };
    const login = async (srv) => {
        return await chai_http_1.request.execute(srv.Server)
            .post(Config_1.Config.Server.apiPath + '/user/login')
            .send({
            loginCredential: {
                password: adminUser.password,
                username: adminUser.name,
                rememberMe: false
            }
        });
    };
    describe('/POST upload', () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should upload a file', async () => {
            const loginRes = await login(server);
            const res = await chai_http_1.request.execute(server.Server)
                .post(Config_1.Config.Server.apiPath + '/upload/')
                .set('Cookie', loginRes.res.headers['set-cookie'])
                .attach('files', Buffer.from('test image'), 'test.jpg');
            if (res.body.error) {
                console.error(res.body.error);
            }
            res.should.have.status(200);
            should.equal(res.body.error, null);
            res.body.should.have.property('result');
            res.body.result.should.be.an('array').with.lengthOf(0); // No errors
            const savedPath = path.join(testDir, 'test.jpg');
            fs.existsSync(savedPath).should.be.true;
        });
        it('should upload a file to a sub-directory', async () => {
            const loginRes = await login(server);
            const res = await chai_http_1.request.execute(server.Server)
                .post(Config_1.Config.Server.apiPath + '/upload/sub_dir')
                .set('Cookie', loginRes.res.headers['set-cookie'])
                .attach('files', Buffer.from('test image 2'), 'test2.jpg');
            res.should.have.status(200);
            should.equal(res.body.error, null);
            const savedPath = path.join(testDir, 'sub_dir', 'test2.jpg');
            fs.existsSync(savedPath).should.be.true;
        });
        it('should return error for unsupported file', async () => {
            const loginRes = await login(server);
            const res = await chai_http_1.request.execute(server.Server)
                .post(Config_1.Config.Server.apiPath + '/upload/')
                .set('Cookie', loginRes.res.headers['set-cookie'])
                .attach('files', Buffer.from('test exe'), 'test.exe');
            res.should.have.status(200); // Middleware returns success, but result contains errors
            should.equal(res.body.error, null);
            res.body.result.should.be.an('array').with.lengthOf(1);
            res.body.result[0].should.have.property('error').which.contains('Unsupported file format');
        });
        it('should return 401 if not authenticated', async () => {
            const res = await chai_http_1.request.execute(server.Server)
                .post(Config_1.Config.Server.apiPath + '/upload/')
                .attach('files', Buffer.from('test'), 'test.jpg');
            res.should.have.status(401);
        });
    });
});
//# sourceMappingURL=UploadRouter.spec.js.map