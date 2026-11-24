"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("../../../../src/common/config/private/Config");
const server_1 = require("../../../../src/backend/server");
const path = require("path");
const chai = require("chai");
const chai_1 = require("chai");
const ProjectPath_1 = require("../../../../src/backend/ProjectPath");
const DBTestHelper_1 = require("../../DBTestHelper");
const PrivateConfig_1 = require("../../../../src/common/config/private/PrivateConfig");
const TestHelper_1 = require("../../../TestHelper");
const chai_http_1 = require("chai-http");
const Error_1 = require("../../../../src/common/entities/Error");
process.env.NODE_ENV = 'test';
chai.should();
chai.use(chai_http_1.default);
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe({ sqlite: true });
describe('GalleryRouter', (sqlHelper) => {
    describe = tmpDescribe;
    let server;
    const setUp = async () => {
        await sqlHelper.initDB();
        Config_1.Config.Users.authenticationRequired = false;
        Config_1.Config.Media.Video.enabled = true;
        Config_1.Config.Media.folder = path.join(__dirname, '../../assets');
        Config_1.Config.Media.tempFolder = TestHelper_1.TestHelper.TMP_DIR;
        ProjectPath_1.ProjectPath.reset();
        server = new server_1.Server(false);
        await server.onStarted.wait();
    };
    const tearDown = async () => {
        await sqlHelper.clearDB();
    };
    describe('/GET /api/gallery/content/', async () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should load gallery', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result.directory).to.not.be.equal(null);
        });
        it('should load gallery twice (to force loading form db)', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            const _ = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/orientation');
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/orientation');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result.directory).to.not.be.equal(null);
        });
    });
    describe('express uri parsing', async () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('express should parse path orientation/JPEG', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/orientation/JPEG');
            result.should.have.status(404);
        });
        it('express should parse path orientation encoded', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/' + encodeURIComponent('orientation'));
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result.directory).to.not.be.equal(null);
        });
        it('express should parse path orientation/JPEG encoded', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/' + encodeURIComponent('orientation/JPEG'));
            result.should.have.status(404);
        });
    });
    describe('/GET /api/gallery/content/video.mp4/bestFit', async () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should get video without transcoding', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/video.mp4/bestFit');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body).to.be.instanceof(Buffer);
        });
    });
    describe('/GET /api/gallery//', async () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should list root directory even with double slash', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery//');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result.directory).to.not.be.equal(null);
        });
    });
    describe('/GET raw video, icon and thumbnail', async () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should get raw video', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/video.mp4');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body).to.be.instanceof(Buffer);
        });
        it('should get video icon', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/video.mp4/icon');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body).to.be.instanceof(Buffer);
        });
        it('should get video thumbnail (size 240)', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/video.mp4/240');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body).to.be.instanceof(Buffer);
        });
    });
    describe('negative paths for non-existent media/meta', async () => {
        beforeEach(setUp);
        afterEach(tearDown);
        it('should return PATH_ERROR for non-existent video (raw)', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/nonexistent.mp4');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.be.equal(null);
            (0, chai_1.expect)(result.body.error.code).to.be.equal(Error_1.ErrorCodes.PATH_ERROR);
        });
        it('should return PATH_ERROR for non-existent video icon', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/nonexistent.mp4/icon');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.be.equal(null);
            (0, chai_1.expect)(result.body.error.code).to.be.equal(Error_1.ErrorCodes.PATH_ERROR);
        });
        it('should return PATH_ERROR for non-existent meta file (gpx)', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/nonexistent.gpx');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.be.equal(null);
            (0, chai_1.expect)(result.body.error.code).to.be.equal(Error_1.ErrorCodes.PATH_ERROR);
        });
        it('should return PATH_ERROR for non-existent meta file bestFit (gpx)', async () => {
            const result = await chai_http_1.request.execute(server.Server)
                .get(Config_1.Config.Server.apiPath + '/gallery/content/nonexistent.gpx/bestFit');
            result.should.have.status(200);
            (0, chai_1.expect)(result.body.error).to.not.be.equal(null);
            (0, chai_1.expect)(result.body.result).to.be.equal(null);
            (0, chai_1.expect)(result.body.error.code).to.be.equal(Error_1.ErrorCodes.PATH_ERROR);
        });
    });
});
//# sourceMappingURL=GalleryRouter.spec.js.map