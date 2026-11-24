"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Config_1 = require("../../../../../src/common/config/private/Config");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const path = require("path");
const PhotoProcessing_1 = require("../../../../../src/backend/model/fileaccess/fileprocessing/PhotoProcessing");
describe('PhotoProcessing', () => {
    it('should generate converted gif file path', async () => {
        await Config_1.Config.load();
        Config_1.Config.Media.Photo.thumbnailSizes = [];
        ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, './../../../assets');
        const gifPath = path.join(ProjectPath_1.ProjectPath.ImageFolder, 'earth.gif');
        for (const thSize of Config_1.Config.Media.Photo.thumbnailSizes) {
            Config_1.Config.Media.Photo.animateGif = true;
            (0, chai_1.expect)(await PhotoProcessing_1.PhotoProcessing
                .isValidConvertedPath(PhotoProcessing_1.PhotoProcessing.generateConvertedPath(gifPath, thSize)))
                .to.be.true;
            Config_1.Config.Media.Photo.animateGif = false;
            (0, chai_1.expect)(await PhotoProcessing_1.PhotoProcessing
                .isValidConvertedPath(PhotoProcessing_1.PhotoProcessing.generateConvertedPath(gifPath, thSize)))
                .to.be.true;
        }
    });
    /* eslint-disable no-unused-expressions,@typescript-eslint/no-unused-expressions */
    it('should generate converted thumbnail path', async () => {
        await Config_1.Config.load();
        Config_1.Config.Media.Photo.thumbnailSizes = [10, 20];
        ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, './../../../assets');
        const photoPath = path.join(ProjectPath_1.ProjectPath.ImageFolder, 'test_png.png');
        for (const thSize of Config_1.Config.Media.Photo.thumbnailSizes) {
            (0, chai_1.expect)(await PhotoProcessing_1.PhotoProcessing
                .isValidConvertedPath(PhotoProcessing_1.PhotoProcessing.generateConvertedPath(photoPath, thSize)))
                .to.be.true;
            (0, chai_1.expect)(await PhotoProcessing_1.PhotoProcessing
                .isValidConvertedPath(PhotoProcessing_1.PhotoProcessing.generateConvertedPath(photoPath + 'noPath', thSize)))
                .to.be.false;
        }
        (0, chai_1.expect)(await PhotoProcessing_1.PhotoProcessing
            .isValidConvertedPath(PhotoProcessing_1.PhotoProcessing.generateConvertedPath(photoPath, 30)))
            .to.be.false;
    });
});
//# sourceMappingURL=PhotoProcessing.spec.js.map