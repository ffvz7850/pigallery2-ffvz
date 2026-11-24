"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = require("path");
const Config_1 = require("../../../../../src/common/config/private/Config");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const Utils_1 = require("../../../../../src/common/Utils");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
const DiskManager_1 = require("../../../../../src/backend/model/fileaccess/DiskManager");
describe('DiskMangerWorker', () => {
    // loading default settings (this might have been changed by other tests)
    before(() => {
        Config_1.Config.loadSync();
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
        Config_1.Config.Faces.enabled = true;
        Config_1.Config.Faces.keywordsToPersons = true;
        Config_1.Config.Extensions.enabled = false;
    });
    it('should parse metadata', async () => {
        Config_1.Config.Media.folder = path.join(__dirname, '/../../../assets');
        ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, '/../../../assets');
        const dir = await DiskManager_1.DiskManager.scanDirectory('/');
        // should match the number of media (photo/video) files in the assets folder
        // TODO: make this test less flaky. Every time a new image is added to the folder, it fails.
        (0, chai_1.expect)(dir.media.length).to.be.equals(18);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const expected = require(path.join(__dirname, '/../../../assets/test image öüóőúéáű-.,.json'));
        const i = dir.media.findIndex(m => m.name === 'test image öüóőúéáű-.,.jpg');
        (0, chai_1.expect)(Utils_1.Utils.clone(dir.media[i].name)).to.be.deep.equal('test image öüóőúéáű-.,.jpg');
        (0, chai_1.expect)(Utils_1.Utils.clone(dir.media[i].metadata)).to.be.deep.equal(expected);
    });
});
//# sourceMappingURL=DiskManagerWorker.spec.js.map