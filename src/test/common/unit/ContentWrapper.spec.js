"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ContentWrapper_1 = require("../../../src/common/entities/ContentWrapper");
const TestHelper_1 = require("../../TestHelper");
const SearchQueryDTO_1 = require("../../../src/common/entities/SearchQueryDTO");
const Utils_1 = require("../../../src/common/Utils");
const MediaDTO_1 = require("../../../src/common/entities/MediaDTO");
describe('ContentWrapper', () => {
    const cleanUpCW = (cw) => {
        if (typeof cw.notModified === 'undefined') {
            delete cw.notModified;
        }
        const content = (cw?.directory ? cw.directory : cw?.searchResult);
        for (let i = 0; i < content.media.length; ++i) {
            const m = content.media[i];
            if (MediaDTO_1.MediaDTOUtils.isPhoto(m)) {
                delete m.metadata.bitRate;
                delete m.metadata.duration;
                if (!m.metadata.caption) {
                    delete m.metadata.caption;
                }
            }
            else if (MediaDTO_1.MediaDTOUtils.isVideo(m)) {
                delete m.metadata.rating;
                delete m.metadata.caption;
                delete m.metadata.cameraData;
                delete m.metadata.keywords;
                delete m.metadata.faces;
                delete m.metadata.positionData;
            }
            if (m.missingThumbnails === 0) {
                delete m.missingThumbnails;
            }
        }
        if (!(content.directories?.length > 0)) {
            delete content.directories;
        }
        for (let i = 0; i < content.metaFile.length; ++i) {
            delete content.metaFile[i].id;
        }
        return cw;
    };
    it('pack and unpack directory', () => {
        const parent = TestHelper_1.TestHelper.getDirectoryEntry();
        TestHelper_1.TestHelper.getPhotoEntry(parent);
        TestHelper_1.TestHelper.getPhotoEntry1(parent);
        TestHelper_1.TestHelper.getPhotoEntry2(parent);
        TestHelper_1.TestHelper.getVideoEntry(parent);
        TestHelper_1.TestHelper.getGPXEntry(parent);
        const parentOrig = TestHelper_1.TestHelper.getDirectoryEntry();
        TestHelper_1.TestHelper.getPhotoEntry(parentOrig);
        TestHelper_1.TestHelper.getPhotoEntry1(parentOrig);
        TestHelper_1.TestHelper.getPhotoEntry2(parentOrig);
        TestHelper_1.TestHelper.getVideoEntry(parentOrig);
        TestHelper_1.TestHelper.getGPXEntry(parentOrig);
        const cwOrig = ContentWrapper_1.ContentWrapperUtils.build(parentOrig, null);
        const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
        (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.unpack(ContentWrapper_1.ContentWrapperUtils.pack(cw))).to.deep.equals(cleanUpCW(cwOrig));
    });
    it('pack and unpack search result', () => {
        const parent = {
            name: 'parent',
            path: ''
        };
        const subDir = {
            name: 'subDir',
            path: 'parent/'
        };
        const sr = {
            directories: [subDir],
            media: [TestHelper_1.TestHelper.getPhotoEntry(parent),
                TestHelper_1.TestHelper.getPhotoEntry1(parent),
                TestHelper_1.TestHelper.getPhotoEntry2(subDir),
                TestHelper_1.TestHelper.getVideoEntry(parent)
            ],
            metaFile: [
                TestHelper_1.TestHelper.getGPXEntry(parent)
            ],
            resultOverflow: false,
            searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' }
        };
        const cw = ContentWrapper_1.ContentWrapperUtils.build(null, sr);
        (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.unpack(ContentWrapper_1.ContentWrapperUtils.pack(Utils_1.Utils.clone(cw)))).to.deep.equals(cleanUpCW(cw));
    });
    describe('equals', () => {
        it('should directory equal', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parent);
            TestHelper_1.TestHelper.getPhotoEntry1(parent);
            TestHelper_1.TestHelper.getPhotoEntry2(parent);
            TestHelper_1.TestHelper.getVideoEntry(parent);
            TestHelper_1.TestHelper.getGPXEntry(parent);
            const parentOrig = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry1(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry2(parentOrig);
            TestHelper_1.TestHelper.getVideoEntry(parentOrig);
            TestHelper_1.TestHelper.getGPXEntry(parentOrig);
            const cwOrig = ContentWrapper_1.ContentWrapperUtils.build(parentOrig, null);
            const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cwOrig, cw)).to.equal(true);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw, cwOrig)).to.equal(true);
        });
        it('should directory NOT equal when metafile is missing', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parent);
            TestHelper_1.TestHelper.getPhotoEntry1(parent);
            TestHelper_1.TestHelper.getPhotoEntry2(parent);
            TestHelper_1.TestHelper.getVideoEntry(parent);
            const parentOrig = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry1(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry2(parentOrig);
            TestHelper_1.TestHelper.getVideoEntry(parentOrig);
            TestHelper_1.TestHelper.getGPXEntry(parentOrig);
            const cwOrig = ContentWrapper_1.ContentWrapperUtils.build(parentOrig, null);
            const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
            (0, chai_1.expect)(cwOrig).to.not.deep.equals(cw);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cwOrig, cw)).to.equals(false);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw, cwOrig)).to.equals(false);
        });
        it('should directory NOT equal when metafile is missing', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parent);
            TestHelper_1.TestHelper.getPhotoEntry1(parent);
            TestHelper_1.TestHelper.getPhotoEntry2(parent);
            TestHelper_1.TestHelper.getVideoEntry(parent);
            TestHelper_1.TestHelper.getGPXEntry(parent);
            parent.metaFile[0].name = 'new name';
            const parentOrig = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry1(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry2(parentOrig);
            TestHelper_1.TestHelper.getVideoEntry(parentOrig);
            TestHelper_1.TestHelper.getGPXEntry(parentOrig);
            const cwOrig = ContentWrapper_1.ContentWrapperUtils.build(parentOrig, null);
            const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
            (0, chai_1.expect)(cwOrig).to.not.deep.equals(cw);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cwOrig, cw)).to.equals(false);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw, cwOrig)).to.equals(false);
        });
        it('should directory NOT equal when media is different', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parent);
            TestHelper_1.TestHelper.getPhotoEntry1(parent);
            TestHelper_1.TestHelper.getPhotoEntry2(parent);
            TestHelper_1.TestHelper.getVideoEntry(parent);
            TestHelper_1.TestHelper.getGPXEntry(parent);
            const parentOrig = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry1(parentOrig);
            TestHelper_1.TestHelper.getPhotoEntry2(parentOrig);
            TestHelper_1.TestHelper.getVideoEntry(parentOrig);
            TestHelper_1.TestHelper.getGPXEntry(parentOrig);
            const cwOrig = ContentWrapper_1.ContentWrapperUtils.build(parentOrig, null);
            const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
            const test = (outcome, reason) => {
                (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cwOrig, cw)).to.equals(outcome, reason);
                (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw, cwOrig)).to.equals(outcome, reason);
            };
            test(true, 'no diff');
            let tmp = parent.media[0].name;
            parent.media[0].name = 'new name';
            test(false, 'new name');
            parent.media[0].name = tmp;
            test(true);
            tmp = parent.media[0].metadata.size.height;
            parent.media[0].metadata.size.height = -1;
            test(false);
            parent.media[0].metadata.size.height = tmp;
            test(true);
            tmp = parent.media.pop();
            test(false);
            parent.media.push(tmp);
            test(true);
            tmp = parent.media.shift();
            test(false);
            parent.media.push(tmp); // order should not matter
            test(true, 'different order, but same elements');
            tmp = parent.media;
            parent.media = null;
            test(false);
            parent.media = tmp;
            test(true);
        });
        it('should NOT equal when notModified flag differs', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(parent);
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(parent, null, true);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(parent, null, false);
            const cw3 = ContentWrapper_1.ContentWrapperUtils.build(parent, null, true);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw3)).to.equal(true);
        });
        it('should handle null and undefined inputs safely', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
            // both null
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(null, null)).to.equal(true);
            // one null
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw, null)).to.equal(false);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(null, cw)).to.equal(false);
        });
        it('should NOT equal when directory properties differ', () => {
            const parent1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const parent2 = TestHelper_1.TestHelper.getDirectoryEntry();
            parent2.name = 'different name';
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(parent1, null);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(parent2, null);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should NOT equal when subdirectories differ', () => {
            const parent1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const parent2 = TestHelper_1.TestHelper.getDirectoryEntry();
            parent1.directories.push(TestHelper_1.TestHelper.getDirectoryEntry(parent1, 'sub'));
            // parent2 has no subdirectories
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(parent1, null);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(parent2, null);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should equal when comparing the same object reference', () => {
            const parent = TestHelper_1.TestHelper.getDirectoryEntry();
            const cw = ContentWrapper_1.ContentWrapperUtils.build(parent, null);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw, cw)).to.equal(true);
        });
        it('should still equal when subdirectories are in different order', () => {
            const parent1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const sub1 = TestHelper_1.TestHelper.getDirectoryEntry(parent1, 'a');
            const sub2 = TestHelper_1.TestHelper.getDirectoryEntry(parent1, 'b');
            parent1.directories = [sub1, sub2];
            const parent2 = TestHelper_1.TestHelper.getDirectoryEntry();
            const sub3 = TestHelper_1.TestHelper.getDirectoryEntry(parent2, 'b');
            const sub4 = TestHelper_1.TestHelper.getDirectoryEntry(parent2, 'a');
            parent2.directories = [sub3, sub4];
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(parent1, null);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(parent2, null);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(true);
        });
        it('should equal when both directories have no media or metafiles', () => {
            const parent1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const parent2 = TestHelper_1.TestHelper.getDirectoryEntry();
            parent1.media = [];
            parent2.media = [];
            parent1.metaFile = [];
            parent2.metaFile = [];
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(parent1, null);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(parent2, null);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(true);
        });
        it('should equal when search results are identical', () => {
            const dir1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const dir2 = TestHelper_1.TestHelper.getDirectoryEntry();
            const p1 = TestHelper_1.TestHelper.getPhotoEntry(dir1);
            const p2 = TestHelper_1.TestHelper.getPhotoEntry(dir2);
            const sr1 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir1],
                media: [p1],
                metaFile: [],
                resultOverflow: true
            };
            const sr2 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir2],
                media: [p2],
                metaFile: [],
                resultOverflow: true
            };
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(null, sr1);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr2);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(true);
        });
        it('should NOT equal when search result directories differ', () => {
            const dir1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const dir2 = TestHelper_1.TestHelper.getDirectoryEntry();
            dir2.name = 'different';
            const p1 = TestHelper_1.TestHelper.getPhotoEntry(dir1);
            const p2 = TestHelper_1.TestHelper.getPhotoEntry(dir2);
            const sr1 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir1],
                media: [p1],
                metaFile: [],
                resultOverflow: true
            };
            const sr2 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir2],
                media: [p2],
                metaFile: [],
                resultOverflow: true
            };
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(null, sr1);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr2);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should NOT equal when search result media differ', () => {
            const dir1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const dir2 = TestHelper_1.TestHelper.getDirectoryEntry();
            const p1 = TestHelper_1.TestHelper.getPhotoEntry(dir1);
            const p2 = TestHelper_1.TestHelper.getPhotoEntry(dir2);
            p2.name = 'renamed.jpg';
            const sr1 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir1],
                media: [p1],
                metaFile: [],
                resultOverflow: false
            };
            const sr2 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir2],
                media: [p2],
                metaFile: [],
                resultOverflow: false
            };
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(null, sr1);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr2);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should NOT equal when metaFile differs', () => {
            const dir1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const dir2 = TestHelper_1.TestHelper.getDirectoryEntry();
            const p1 = TestHelper_1.TestHelper.getPhotoEntry(dir1);
            const p2 = TestHelper_1.TestHelper.getPhotoEntry(dir2);
            const gpx1 = TestHelper_1.TestHelper.getGPXEntry(dir1);
            const gpx2 = TestHelper_1.TestHelper.getGPXEntry(dir2);
            gpx2.name = 'renamed.gpx';
            const sr1 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir1],
                media: [p1],
                metaFile: [gpx1],
                resultOverflow: false
            };
            const sr2 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir2],
                media: [p2],
                metaFile: [gpx2],
                resultOverflow: false
            };
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(null, sr1);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr2);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should NOT equal when notModified flag differs', () => {
            const dir1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const p1 = TestHelper_1.TestHelper.getPhotoEntry(dir1);
            const sr = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir1],
                media: [p1],
                metaFile: [],
                resultOverflow: true
            };
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(null, sr, true);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr, false);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should NOT equal when one is directory-based and other is search-based', () => {
            const dir = TestHelper_1.TestHelper.getDirectoryEntry();
            TestHelper_1.TestHelper.getPhotoEntry(dir);
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(dir, null);
            const sr = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir],
                media: dir.media,
                metaFile: [],
                resultOverflow: false
            };
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
        it('should NOT equal when one searchResult has missing media', () => {
            const dir1 = TestHelper_1.TestHelper.getDirectoryEntry();
            const dir2 = TestHelper_1.TestHelper.getDirectoryEntry();
            const p1 = TestHelper_1.TestHelper.getPhotoEntry(dir1);
            const p2 = TestHelper_1.TestHelper.getPhotoEntry(dir2);
            const sr1 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir1],
                media: [p1],
                metaFile: [],
                resultOverflow: false
            };
            const sr2 = {
                searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: '' },
                directories: [dir2],
                media: [],
                metaFile: [],
                resultOverflow: false
            };
            const cw1 = ContentWrapper_1.ContentWrapperUtils.build(null, sr1);
            const cw2 = ContentWrapper_1.ContentWrapperUtils.build(null, sr2);
            (0, chai_1.expect)(ContentWrapper_1.ContentWrapperUtils.equals(cw1, cw2)).to.equal(false);
        });
    });
});
//# sourceMappingURL=ContentWrapper.spec.js.map