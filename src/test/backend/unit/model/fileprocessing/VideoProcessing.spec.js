"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const VideoProcessing_1 = require("../../../../../src/backend/model/fileaccess/fileprocessing/VideoProcessing");
const Config_1 = require("../../../../../src/common/config/private/Config");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const path = require("path");
describe('VideoProcessing', () => {
    /* eslint-disable no-unused-expressions,@typescript-eslint/no-unused-expressions */
    it('should generate converted file path', async () => {
        ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, './../../../assets');
        const videoPath = path.join(ProjectPath_1.ProjectPath.ImageFolder, 'video.mp4');
        (0, chai_1.expect)(await VideoProcessing_1.VideoProcessing
            .isValidConvertedPath(VideoProcessing_1.VideoProcessing.generateConvertedFilePath(videoPath)))
            .to.be.true;
        (0, chai_1.expect)(await VideoProcessing_1.VideoProcessing
            .isValidConvertedPath(VideoProcessing_1.VideoProcessing.generateConvertedFilePath(videoPath + 'noPath')))
            .to.be.false;
        {
            const convertedPath = VideoProcessing_1.VideoProcessing.generateConvertedFilePath(videoPath);
            Config_1.Config.Media.Video.transcoding.bitRate = 10;
            (0, chai_1.expect)(await VideoProcessing_1.VideoProcessing.isValidConvertedPath(convertedPath)).to.be.false;
        }
        {
            const convertedPath = VideoProcessing_1.VideoProcessing.generateConvertedFilePath(videoPath);
            Config_1.Config.Media.Video.transcoding.mp4Codec = 'codec_text';
            (0, chai_1.expect)(await VideoProcessing_1.VideoProcessing.isValidConvertedPath(convertedPath)).to.be.false;
        }
        {
            const convertedPath = VideoProcessing_1.VideoProcessing.generateConvertedFilePath(videoPath);
            Config_1.Config.Media.Video.transcoding.format = 'format_test';
            (0, chai_1.expect)(await VideoProcessing_1.VideoProcessing.isValidConvertedPath(convertedPath)).to.be.false;
        }
        {
            const convertedPath = VideoProcessing_1.VideoProcessing.generateConvertedFilePath(videoPath);
            Config_1.Config.Media.Video.transcoding.resolution = 1;
            (0, chai_1.expect)(await VideoProcessing_1.VideoProcessing.isValidConvertedPath(convertedPath)).to.be.false;
        }
    });
});
//# sourceMappingURL=VideoProcessing.spec.js.map