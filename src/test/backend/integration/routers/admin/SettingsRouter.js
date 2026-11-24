"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Config_1 = require("../../../../../src/common/config/private/Config");
const server_1 = require("../../../../../src/backend/server");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const UserDTO_1 = require("../../../../../src/common/entities/UserDTO");
const ExtensionConfigWrapper_1 = require("../../../../../src/backend/model/extension/ExtensionConfigWrapper");
const TestHelper_1 = require("../../../../TestHelper");
const chai = require("chai");
const chai_http_1 = require("chai-http");
process.env.NODE_ENV = 'test';
const should = chai.should();
chai.use(chai_http_1.default);
describe('SettingsRouter', () => {
    let server;
    beforeEach(async () => {
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
        Config_1.Config.Database.dbFolder = TestHelper_1.TestHelper.TMP_DIR;
        Config_1.Config.Extensions.folder = 'notexisting';
        ProjectPath_1.ProjectPath.reset();
        server = new server_1.Server(false);
        await server.onStarted.wait();
        //   await ObjectManagers.getInstance().init();
    });
    afterEach(async () => {
        await ObjectManagers_1.ObjectManagers.reset();
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
    });
    describe('/GET settings', () => {
        it('it should GET the settings', async () => {
            Config_1.Config.Users.authenticationRequired = false;
            Config_1.Config.Users.unAuthenticatedUserRole = UserDTO_1.UserRoles.Admin;
            const originalSettings = await ExtensionConfigWrapper_1.ExtensionConfigWrapper.original();
            originalSettings.Environment.upTime = null;
            const originalJSON = JSON.parse(JSON.stringify(originalSettings.toJSON({
                attachState: true,
                attachVolatile: true,
                skipTags: { secret: true }
            })));
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/settings');
            result.should.have.status(200);
            result.body.should.be.a('object');
            should.equal(result.body.error, null);
            result.body.result.Environment.upTime = null;
            result.body.result.should.deep.equal(originalJSON);
        });
    });
});
//# sourceMappingURL=SettingsRouter.js.map