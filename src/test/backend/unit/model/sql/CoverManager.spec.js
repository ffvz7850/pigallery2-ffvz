"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SearchManager_1 = require("../../../../../src/backend/model/database/SearchManager");
const DBTestHelper_1 = require("../../../DBTestHelper");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const IndexingManager_1 = require("../../../../../src/backend/model/database/IndexingManager");
const TestHelper_1 = require("../../../../TestHelper");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const GalleryManager_1 = require("../../../../../src/backend/model/database/GalleryManager");
const CoverManager_1 = require("../../../../../src/backend/model/database/CoverManager");
const Config_1 = require("../../../../../src/common/config/private/Config");
const SortingMethods_1 = require("../../../../../src/common/entities/SortingMethods");
const Utils_1 = require("../../../../../src/common/Utils");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const ClientConfig_1 = require("../../../../../src/common/config/public/ClientConfig");
const ProjectedDirectoryCacheEntity_1 = require("../../../../../src/backend/model/database/enitites/ProjectedDirectoryCacheEntity");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe(); // fake it os IDE plays nicely (recognize the test)
class IndexingManagerTest extends IndexingManager_1.IndexingManager {
    async saveToDB(scannedDirectory) {
        return super.saveToDB(scannedDirectory);
    }
}
class SearchManagerTest extends SearchManager_1.SearchManager {
    flattenSameOfQueries(query) {
        return super.flattenSameOfQueries(query);
    }
}
class GalleryManagerTest extends GalleryManager_1.GalleryManager {
    async getDirIdAndTime(connection, directoryName, directoryParent) {
        return super.getDirIdAndTime(connection, directoryName, directoryParent);
    }
    async getParentDirFromId(connection, session, dir) {
        return super.getParentDirFromId(connection, session, dir);
    }
}
describe('CoverManager', (sqlHelper) => {
    describe = tmpDescribe;
    /**
     * dir
     * |-> subDir
     *     |- pFaceLess
     *     |- v
     *     |- p
     *     |- p2
     * |-> subDir2
     *     |- p4
     */
    let dir;
    let subDir;
    let subDir2;
    let v;
    let p;
    let p2;
    let pFaceLess;
    let p4;
    const setUpTestGallery = async () => {
        const directory = TestHelper_1.TestHelper.getDirectoryEntry(null, 'éűáúőóüöÉŰÚŐÓÜÖ[]^[[]]][asd]');
        subDir = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'The Phantom Menace');
        subDir2 = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'Return of the Jedi');
        p = TestHelper_1.TestHelper.getPhotoEntry1(subDir);
        p.metadata.rating = 4;
        p.metadata.creationDate = 10000;
        p2 = TestHelper_1.TestHelper.getPhotoEntry2(subDir);
        p2.metadata.rating = 4;
        p2.metadata.creationDate = 20000;
        v = TestHelper_1.TestHelper.getVideoEntry1(subDir);
        v.metadata.creationDate = 500;
        const pFaceLessTmp = TestHelper_1.TestHelper.getPhotoEntry3(subDir);
        pFaceLessTmp.metadata.rating = 0;
        pFaceLessTmp.metadata.creationDate = 400000;
        delete pFaceLessTmp.metadata.faces;
        p4 = TestHelper_1.TestHelper.getPhotoEntry4(subDir2);
        p4.metadata.rating = 5;
        p4.metadata.creationDate = 100;
        dir = await DBTestHelper_1.DBTestHelper.persistTestDir(directory);
        subDir = dir.directories[0];
        subDir2 = dir.directories[1];
        p = subDir.media.filter(m => m.name === p.name)[0];
        p.directory = subDir;
        p2 = subDir.media.filter(m => m.name === p2.name)[0];
        p2.directory = subDir;
        v = subDir.media.filter(m => m.name === v.name)[0];
        v.directory = subDir;
        pFaceLess = subDir.media.filter(m => m.name === pFaceLessTmp.name)[0];
        pFaceLess.directory = subDir;
        p4 = subDir2.media[0];
        p4.directory = subDir2;
    };
    const setUpSqlDB = async () => {
        await sqlHelper.initDB();
        await setUpTestGallery();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
    };
    before(async () => {
        await setUpSqlDB();
        Config_1.Config.Gallery.ignoreTimestampOffset = false;
    });
    const previewifyMedia = (m) => {
        const tmpDir = m.directory;
        const tmpM = tmpDir.media;
        const tmpD = tmpDir.directories;
        const tmpMT = tmpDir.metaFile;
        delete tmpDir.directories;
        delete tmpDir.media;
        delete tmpDir.cache.cover;
        delete tmpDir.cache.valid;
        delete tmpDir.metaFile;
        const ret = Utils_1.Utils.clone(m);
        delete ret.directory.id;
        delete ret.directory.lastScanned;
        delete ret.directory.lastModified;
        delete ret.directory.cache;
        delete ret.metadata;
        tmpDir.directories = tmpD;
        tmpDir.media = tmpM;
        tmpDir.metaFile = tmpMT;
        return ret;
    };
    after(async () => {
        await sqlHelper.clearDB();
    });
    afterEach(() => {
        Config_1.Config.AlbumCover.SearchQuery = null;
        Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false),
            new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Date, false)];
    });
    it('should list directories without cover', async () => {
        const pm = new CoverManager_1.CoverManager();
        const partialDir = (d) => {
            return { id: d.id, name: d.name, path: d.path };
        };
        expect(await pm.getPartialDirsWithoutCovers()).to.deep.equalInAnyOrder([]);
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        await conn.createQueryBuilder()
            .update(ProjectedDirectoryCacheEntity_1.ProjectedDirectoryCacheEntity).set({ valid: false }).execute();
        expect(await pm.getPartialDirsWithoutCovers()).to.deep.equalInAnyOrder([dir, subDir, subDir2].map(d => partialDir(d)));
    });
    it('should get cover for saved search', async () => {
        const pm = new CoverManager_1.CoverManager();
        Config_1.Config.AlbumCover.SearchQuery = null;
        expect(Utils_1.Utils.clone(await pm.getCoverForAlbum(DBTestHelper_1.DBTestHelper.defaultSession, {
            searchQuery: {
                type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                value: 'sw'
            }
        }))).to.deep.equalInAnyOrder(previewifyMedia(p4));
        Config_1.Config.AlbumCover.SearchQuery = { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'Boba' };
        expect(Utils_1.Utils.clone(await pm.getCoverForAlbum(DBTestHelper_1.DBTestHelper.defaultSession, {
            searchQuery: {
                type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                value: 'sw'
            }
        }))).to.deep.equalInAnyOrder(previewifyMedia(p));
        Config_1.Config.AlbumCover.SearchQuery = { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'Derem' };
        expect(Utils_1.Utils.clone(await pm.getCoverForAlbum(DBTestHelper_1.DBTestHelper.defaultSession, {
            searchQuery: {
                type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                value: 'sw'
            }
        }))).to.deep.equalInAnyOrder(previewifyMedia(p2));
        // Having a preview search query that does not return valid result
        Config_1.Config.AlbumCover.SearchQuery = { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'wont find it' };
        expect(Utils_1.Utils.clone(await pm.getCoverForAlbum(DBTestHelper_1.DBTestHelper.defaultSession, {
            searchQuery: {
                type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                value: 'Derem'
            }
        }))).to.deep.equalInAnyOrder(previewifyMedia(p2));
        // having a saved search that does not have any image
        Config_1.Config.AlbumCover.SearchQuery = { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'Derem' };
        expect(Utils_1.Utils.clone(await pm.getCoverForAlbum(DBTestHelper_1.DBTestHelper.defaultSession, {
            searchQuery: {
                type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                value: 'wont find it'
            }
        }))).to.deep.equal(null);
    });
});
//# sourceMappingURL=CoverManager.spec.js.map