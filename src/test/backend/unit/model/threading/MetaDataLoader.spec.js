"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-var-requires */
const chai_1 = require("chai");
const MetadataLoader_1 = require("../../../../../src/backend/model/fileaccess/MetadataLoader");
const Utils_1 = require("../../../../../src/common/Utils");
const path = require("path");
const fs = require("fs");
const PhotoProcessing_1 = require("../../../../../src/backend/model/fileaccess/fileprocessing/PhotoProcessing");
const VideoProcessing_1 = require("../../../../../src/backend/model/fileaccess/fileprocessing/VideoProcessing");
const Config_1 = require("../../../../../src/common/config/private/Config");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
function getFileModificationTime(filename) {
    return new Promise((resolve, reject) => {
        fs.stat(filename, (err, stats) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(stats.mtime);
            }
        });
    });
}
describe('MetadataLoader', () => {
    // loading default settings (this might have been changed by other tests)
    before(() => {
        Config_1.Config.loadSync();
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
        Config_1.Config.Faces.enabled = true;
        Config_1.Config.Faces.keywordsToPersons = true;
        Config_1.Config.Extensions.enabled = false;
    });
    it('should load heic', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/parsingfromheic.heic'));
        const expected = require(path.join(__dirname, '/../../../assets/parsingfromheic.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load png', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/test_png.png'));
        const expected = require(path.join(__dirname, '/../../../assets/test_png.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load png with faces and dates', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/png_with_faces_and_dates.png'));
        const expected = require(path.join(__dirname, '/../../../assets/png_with_faces_and_dates.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load png with description', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/title_caption/description.png'));
        const expected = require(path.join(__dirname, '/../../../assets/title_caption/description.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load image with metadata saved by digikam', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/title_caption/digikam.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/title_caption/digikam.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/test image öüóőúéáű-.,.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/test image öüóőúéáű-.,.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load miss dated jpg', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/date_issue.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/date_issue.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load xmp section dc:subject into keywords', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/xmp/xmp_subject.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/xmp/xmp_subject.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load Rating and not overwrite its value by RatingPercent', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/two_ratings.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/two_ratings.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg 2', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/old_photo.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/old_photo.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load special names', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/special_names.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/special_names.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with special characters', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/Chars.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/Chars.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with special characters saved by exiftool', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/Chars_exiftool.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/Chars_exiftool.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps, timezone AEST (UTC+10) and gps (UTC)', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/sydney_opera_house.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/sydney_opera_house.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps and gps (UTC) and calculate offset +10', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/sydney_opera_house_no_tsoffset_but_gps_utc.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/sydney_opera_house_no_tsoffset_but_gps_utc.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps, timezone BST (UTC+1) and gps (UTC)', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/big_ben.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/big_ben.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps and gps (UTC) and calculate offset +1', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/big_ben_no_tsoffset_but_gps_utc.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/big_ben_no_tsoffset_but_gps_utc.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps and gps (UTC) and calculate offset +1, but GPS is off by 1 min', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/big_ben_no_tsoffset_but_gps_utc_off_by_1min.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/big_ben_no_tsoffset_but_gps_utc_off_by_1min.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps and gps (UTC) and calculate offset +1, but GPS is off by 1 min - no XMP GPS', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/big_ben_no_tsoffset_but_gps_utc_off_by_1min_no_xmpgps.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/big_ben_no_tsoffset_but_gps_utc_off_by_1min_no_xmpgps.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with timestamps but no offset and no GPS to calculate it from', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/timestamps/big_ben_only_time.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/timestamps/big_ben_only_time.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    describe('sidecar', () => {
        it('should load sidecar file with file extension for video', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec.mp4'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should load sidecar file without file extension for video', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec_v2.mp4'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec.json')); //sidecar "bunny_1sec_v2.xmp" is identical to "bunny_1sec.mp4.xmp" so we expect the same result
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should retrieve both keywords from sidecar file for video', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec.mp4'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should retrieve one keyword from sidecar file for video', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec_v3.mp4'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/bunny_1sec_v3.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should load sidecar file with file extension for photo', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/sidecar/no_metadata.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/no_metadata.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should load sidecar file without file extension for photo', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/sidecar/no_metadata_v2.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/no_metadata_v2.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should retrieve both keywords from sidecar file for photo', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/sidecar/no_metadata.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/no_metadata.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should retrieve one keyword from sidecar file for photo', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/sidecar/no_metadata_v3.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/no_metadata_v3.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should read keywords from photo without sidecar file', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/sidecar/metadata.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/metadata.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should merge keywords from photo with keywords from sidecar', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/sidecar/metadata_v2.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/sidecar/metadata_v2.json')); //"metadata_v2.jpg" is identical to "metadata.jpg" and "metadata_v2.xmp" contains 2 different keywords
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('should load faces with right orientation', async () => {
            // see https://github.com/bpatrik/pigallery2/issues/979
            for (const i of [3, 6, 8]) {
                const embedded = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, `/../../../assets/sidecar/orientation/photo.${i}.embedded.jpg`));
                const sidecar = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, `/../../../assets/sidecar/orientation/photo.${i}.embedded_sidecar.jpg`));
                delete embedded.fileSize;
                delete sidecar.fileSize;
                delete embedded.creationDate;
                delete sidecar.creationDate;
                (0, chai_1.expect)(Utils_1.Utils.clone(embedded)).to.be.deep.equal(Utils_1.Utils.clone(sidecar), `processing: photo.${i}.embedded.jpg`);
            }
        });
        describe('should load metadata from sidecar files', () => {
            const root = path.join(__dirname, '/../../../assets/sidecar');
            const files = fs.readdirSync(root);
            for (const item of files) {
                const fullFilePath = path.join(root, item);
                if (PhotoProcessing_1.PhotoProcessing.isPhoto(fullFilePath)) {
                    it(item, async () => {
                        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(fullFilePath);
                        const expected = require(fullFilePath.split('.').slice(0, -1).join('.') + '.json');
                        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
                    });
                }
                else if (VideoProcessing_1.VideoProcessing.isVideo(fullFilePath)) {
                    it(item, async () => {
                        const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(fullFilePath);
                        const expected = require(fullFilePath.split('.').slice(0, -1).join('.') + '.json');
                        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
                    });
                }
            }
        });
    });
    describe('should load jpg with proper height and orientation', () => {
        it('jpg 1', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/orientation/broken_orientation_exif.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/orientation/broken_orientation_exif.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
        it('jpg 2', async () => {
            const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/orientation/broken_orientation_exif2.jpg'));
            const expected = require(path.join(__dirname, '/../../../assets/orientation/broken_orientation_exif2.json'));
            (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
        });
    });
    it('should respect heic orientation', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/orientation/IMG_0307.HEIC'));
        const expected = require(path.join(__dirname, '/../../../assets/orientation/IMG_0307.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load wild-1-small image with CreateDate from 2015, but no DateTimeOriginal', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/wild-1-small.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/wild-1-small.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load wild-2-small image with xmp-CreateDate from 2015 and negative offset', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/wild-2-small.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/wild-2-small.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    describe('should load jpg with edge case exif data', () => {
        const root = path.join(__dirname, '/../../../assets/edge_case_exif_data');
        const files = fs.readdirSync(root);
        for (const item of files) {
            const fullFilePath = path.join(root, item);
            if (PhotoProcessing_1.PhotoProcessing.isPhoto(fullFilePath)) {
                it(item, async () => {
                    const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(fullFilePath);
                    const expected = require(fullFilePath.split('.').slice(0, -1).join('.') + '.json');
                    if (expected.creationDate == 'fileModificationTime') {
                        await getFileModificationTime(fullFilePath).then((modificationTime) => {
                            if (modificationTime) {
                                expected.creationDate = new Date(modificationTime).getTime();
                            }
                            else {
                                expected.creationDate = 0;
                            }
                        });
                    }
                    if (expected.skip) {
                        expected.skip.forEach((s) => {
                            delete data[s];
                            delete expected[s];
                        });
                        delete expected.skip;
                    }
                    (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
                });
            }
        }
    });
    // TODO: deprecated tests. We do not save orientation anymore.
    describe('should read orientation', () => {
        for (let i = 0; i <= 8; ++i) {
            it('Landscape ' + i, async () => {
                const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/orientation/Landscape_' + i + '.jpg'));
                const expected = require(path.join(__dirname, '/../../../assets/orientation/Landscape.json'));
                delete data.fileSize;
                delete data.creationDate;
                delete data.creationDateOffset;
                (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
            });
            it('Portrait ' + i, async () => {
                const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/orientation/Portrait_' + i + '.jpg'));
                const expected = require(path.join(__dirname, '/../../../assets/orientation/Portrait.json'));
                delete data.fileSize;
                delete data.creationDate;
                delete data.creationDateOffset;
                (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
            });
        }
    });
    it('should load jpg edited with exiftool', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/exiftool.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/exiftool.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load jpg with provided ImageWidth but missing imageSize', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(path.join(__dirname, '/../../../assets/imageSizeError.jpg'));
        const expected = require(path.join(__dirname, '/../../../assets/imageSizeError.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load mp4', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/video.mp4'));
        const expected = require(path.join(__dirname, '/../../../assets/video.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should respect mp4 rotate transformation', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/video_rotate.mp4'));
        const expected = require(path.join(__dirname, '/../../../assets/video_rotate.json'));
        delete data.duration;
        delete expected.duration;
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    it('should load mkv', async () => {
        const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(path.join(__dirname, '/../../../assets/video_mkv.mkv'));
        const expected = require(path.join(__dirname, '/../../../assets/video_mkv.json'));
        (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
    });
    describe('should load metadata from files with times and coordinates in different parts of the world', () => {
        const root = path.join(__dirname, '/../../../assets/4MinsAroundTheWorld');
        const files = fs.readdirSync(root);
        for (const item of files) {
            const fullFilePath = path.join(root, item);
            if (PhotoProcessing_1.PhotoProcessing.isPhoto(fullFilePath)) {
                it(item, async () => {
                    const data = await MetadataLoader_1.MetadataLoader.loadPhotoMetadata(fullFilePath);
                    const expected = require(fullFilePath.split('.').slice(0, -1).join('.') + '.json');
                    (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
                });
            }
            else if (VideoProcessing_1.VideoProcessing.isVideo(fullFilePath)) {
                it(item, async () => {
                    const data = await MetadataLoader_1.MetadataLoader.loadVideoMetadata(fullFilePath);
                    const expected = require(fullFilePath.split('.').slice(0, -1).join('.') + '.json');
                    (0, chai_1.expect)(Utils_1.Utils.clone(data)).to.be.deep.equal(expected);
                });
            }
        }
    });
});
//# sourceMappingURL=MetaDataLoader.spec.js.map