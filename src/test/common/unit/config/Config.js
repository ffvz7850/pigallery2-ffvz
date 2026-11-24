"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_1 = require("typeconfig/node");
const ExtensionConfigWrapper_1 = require("../../../../src/backend/model/extension/ExtensionConfigWrapper");
const TestHelper_1 = require("../../../TestHelper");
const fs = require("fs");
describe('Config', () => {
    beforeEach(async () => {
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
    });
    afterEach(async () => {
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
    });
    it('should load default from env', () => {
        process.env['default-Media-tempFolder'] = 'test/test';
        const conf = ExtensionConfigWrapper_1.ExtensionConfigWrapper.originalSync();
        (0, chai_1.expect)(conf.Media.tempFolder).to.be.equal('test/test');
        (0, chai_1.expect)(node_1.ConfigClassBuilder.attachPrivateInterface(conf.Media).__defaults.tempFolder).to.be.equal('test/test');
        (0, chai_1.expect)(process.env['default-Media-tempFolder']).to.be.equal('test/test');
        const conf2 = ExtensionConfigWrapper_1.ExtensionConfigWrapper.originalSync();
        (0, chai_1.expect)(node_1.ConfigClassBuilder.attachPrivateInterface(conf2.Media).__defaults.tempFolder).to.be.equal('test/test');
        (0, chai_1.expect)(conf2.Media.tempFolder).to.be.equal('test/test');
    });
});
//# sourceMappingURL=Config.js.map