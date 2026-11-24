"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = require("path");
const fs = require("fs");
const UploadManager_1 = require("../../../../src/backend/model/UploadManager");
const ProjectPath_1 = require("../../../../src/backend/ProjectPath");
const Config_1 = require("../../../../src/common/config/private/Config");
const ObjectManagers_1 = require("../../../../src/backend/model/ObjectManagers");
describe('UploadManager', () => {
    const uploadManager = new UploadManager_1.UploadManager();
    const testDir = path.join(__dirname, 'tmp');
    before(async () => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        Config_1.Config.Media.folder = testDir;
        Config_1.Config.Upload.enabled = true;
        ProjectPath_1.ProjectPath.reset();
        // Mock ObjectManagers
        const om = ObjectManagers_1.ObjectManagers.getInstance();
        om.VersionManager = { onNewDataVersion: () => Promise.resolve() };
        om.initDone = true;
    });
    after(async () => {
        await ObjectManagers_1.ObjectManagers.reset();
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    it('should save a supported file', async () => {
        const file = {
            originalname: 'test.jpg',
            buffer: Buffer.from('test image content')
        };
        await uploadManager.saveFile('test_subdir', file);
        const savedPath = path.join(testDir, 'test_subdir', 'test.jpg');
        (0, chai_1.expect)(fs.existsSync(savedPath)).to.be.true;
        (0, chai_1.expect)(fs.readFileSync(savedPath).toString()).to.equal('test image content');
    });
    it('should throw error for unsupported file', async () => {
        const file = {
            originalname: 'test.exe',
            buffer: Buffer.from('test content')
        };
        try {
            await uploadManager.saveFile('', file);
            chai_1.expect.fail('Should have thrown an error');
        }
        catch (e) {
            (0, chai_1.expect)(e.message).to.contain('Unsupported file format');
        }
    });
    it('should handle multiple files with some errors', async () => {
        const files = [
            {
                originalname: 'valid.jpg',
                buffer: Buffer.from('valid jpg')
            },
            {
                originalname: 'invalid.exe',
                buffer: Buffer.from('invalid exe')
            }
        ];
        const errors = await uploadManager.saveFiles('multi_test', files);
        (0, chai_1.expect)(errors.length).to.equal(1);
        (0, chai_1.expect)(errors[0].filename).to.equal('invalid.exe');
        (0, chai_1.expect)(errors[0].error).to.contain('Unsupported file format');
        const validPath = path.join(testDir, 'multi_test', 'valid.jpg');
        (0, chai_1.expect)(fs.existsSync(validPath)).to.be.true;
    });
    it('should throw error if upload is disabled', async () => {
        Config_1.Config.Upload.enabled = false;
        try {
            const file = {
                originalname: 'test.jpg',
                buffer: Buffer.from('test content')
            };
            await uploadManager.saveFiles('', [file]);
            chai_1.expect.fail('Should have thrown an error');
        }
        catch (e) {
            (0, chai_1.expect)(e.message).to.equal('Upload is disabled');
        }
        finally {
            Config_1.Config.Upload.enabled = true;
        }
    });
    it('should throw error if enforcedDirectoryConfig is true and .uploader.pg2conf is missing', async () => {
        Config_1.Config.Upload.enforcedDirectoryConfig = true;
        try {
            const file = {
                originalname: 'test.jpg',
                buffer: Buffer.from('test content')
            };
            await uploadManager.saveFiles('no_config_dir', [file]);
            chai_1.expect.fail('Should have thrown an error');
        }
        catch (e) {
            (0, chai_1.expect)(e.message).to.equal('Upload is not enabled in this directory');
        }
        finally {
            Config_1.Config.Upload.enforcedDirectoryConfig = false;
        }
    });
    it('should save file if enforcedDirectoryConfig is true and .uploader.pg2conf exists', async () => {
        Config_1.Config.Upload.enforcedDirectoryConfig = true;
        const dir = 'config_dir';
        const fullDirPath = path.join(testDir, dir);
        if (!fs.existsSync(fullDirPath)) {
            fs.mkdirSync(fullDirPath, { recursive: true });
        }
        fs.writeFileSync(path.join(fullDirPath, '.uploader.pg2conf'), '');
        try {
            const file = {
                originalname: 'test.jpg',
                buffer: Buffer.from('test content')
            };
            await uploadManager.saveFiles(dir, [file]);
            const savedPath = path.join(fullDirPath, 'test.jpg');
            (0, chai_1.expect)(fs.existsSync(savedPath)).to.be.true;
        }
        finally {
            Config_1.Config.Upload.enforcedDirectoryConfig = false;
        }
    });
    it('should return error if file already exists', async () => {
        const file = {
            originalname: 'exists.jpg',
            buffer: Buffer.from('content')
        };
        await uploadManager.saveFile('exists_test', file);
        const errors = await uploadManager.saveFiles('exists_test', [file]);
        (0, chai_1.expect)(errors.length).to.equal(1);
        (0, chai_1.expect)(errors[0].filename).to.equal('exists.jpg');
        (0, chai_1.expect)(errors[0].error).to.contain('already exists');
    });
});
//# sourceMappingURL=UploadManager.spec.js.map