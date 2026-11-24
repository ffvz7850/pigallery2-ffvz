"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-unused-expressions,@typescript-eslint/no-unused-expressions */
const chai_1 = require("chai");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const SettingsMWs_1 = require("../../../../../src/backend/middlewares/admin/SettingsMWs");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
const Config_1 = require("../../../../../src/common/config/private/Config");
const UserDTO_1 = require("../../../../../src/common/entities/UserDTO");
const ExtensionConfigWrapper_1 = require("../../../../../src/backend/model/extension/ExtensionConfigWrapper");
const node_1 = require("typeconfig/node");
const DBTestHelper_1 = require("../../../DBTestHelper");
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe();
describe('Settings middleware', (sqlHelper) => {
    describe = tmpDescribe;
    before(sqlHelper.clearDB);
    beforeEach(async () => {
        await sqlHelper.initDB();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
    });
    it('should save empty enforced users settings', (done) => {
        const req = {
            session: {},
            sessionOptions: {},
            query: {},
            params: {},
            body: {
                settingsPath: 'Users',
                settings: node_1.ConfigClassBuilder.attachPrivateInterface(new PrivateConfig_1.ServerUserConfig()).toJSON()
            }
        };
        req.body.settings.enforcedUsers = [];
        const next = (err) => {
            try {
                (0, chai_1.expect)(err).to.be.undefined;
                (0, chai_1.expect)(Config_1.Config.Users.enforcedUsers.length).to.be.equal(0);
                done();
            }
            catch (err) {
                console.error(err);
                done(err);
            }
        };
        SettingsMWs_1.SettingsMWs.updateSettings(req, null, next);
    });
    it('should save enforced users settings', (done) => {
        const req = {
            session: {},
            sessionOptions: {},
            query: {},
            params: {},
            body: {
                settingsPath: 'Users',
                settings: {
                    enforcedUsers: [],
                    authenticationRequired: false,
                    unAuthenticatedUserRole: UserDTO_1.UserRoles.User
                }
            }
        };
        req.body.settings.enforcedUsers = [{ name: 'Apple', password: 'Apple pass', role: UserDTO_1.UserRoles.User }];
        const next2 = (err) => {
            try {
                (0, chai_1.expect)(Config_1.Config.Users.enforcedUsers.length).to.be.equal(1);
                (0, chai_1.expect)(Config_1.Config.Users.enforcedUsers[0].name).to.be.equal('Apple');
                (0, chai_1.expect)(Config_1.Config.Users.enforcedUsers.length).to.be.equal(1);
                ExtensionConfigWrapper_1.ExtensionConfigWrapper.original().then((cfg) => {
                    try {
                        (0, chai_1.expect)(cfg.Users.enforcedUsers.length).to.be.equal(1);
                        (0, chai_1.expect)(cfg.Users.enforcedUsers[0].name).to.be.equal('Apple');
                        done();
                    }
                    catch (err) {
                        console.error(err);
                        done(err);
                    }
                }).catch(done);
            }
            catch (err) {
                console.error(err);
                done(err);
            }
        };
        SettingsMWs_1.SettingsMWs.updateSettings(req, null, next2);
    });
});
//# sourceMappingURL=SettingsMWs.spec.js.map