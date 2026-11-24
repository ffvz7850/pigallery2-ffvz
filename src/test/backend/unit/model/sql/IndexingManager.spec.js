"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Config_1 = require("../../../../../src/common/config/private/Config");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const GalleryManager_1 = require("../../../../../src/backend/model/database/GalleryManager");
const DirectoryDTO_1 = require("../../../../../src/common/entities/DirectoryDTO");
const TestHelper_1 = require("../../../../TestHelper");
const Utils_1 = require("../../../../../src/common/Utils");
const IndexingManager_1 = require("../../../../../src/backend/model/database/IndexingManager");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const DBTestHelper_1 = require("../../../DBTestHelper");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const path = require("path");
const AlbumManager_1 = require("../../../../../src/backend/model/database/AlbumManager");
const SortingMethods_1 = require("../../../../../src/common/entities/SortingMethods");
const ClientConfig_1 = require("../../../../../src/common/config/public/ClientConfig");
const DiskManager_1 = require("../../../../../src/backend/model/fileaccess/DiskManager");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
class GalleryManagerTest extends GalleryManager_1.GalleryManager {
    async getDirIdAndTime(connection, directoryName, directoryParent) {
        return super.getDirIdAndTime(connection, directoryName, directoryParent);
    }
    async getParentDirFromId(connection, session, dir) {
        return super.getParentDirFromId(connection, session, dir);
    }
}
class IndexingManagerTest extends IndexingManager_1.IndexingManager {
    async queueForSave(scannedDirectory) {
        return super.queueForSave(scannedDirectory);
    }
    async saveToDB(scannedDirectory) {
        return await super.saveToDB(scannedDirectory);
    }
}
// eslint-disable-next-line prefer-const
describe = DBTestHelper_1.DBTestHelper.describe();
describe('IndexingManager', (sqlHelper) => {
    beforeEach(async () => {
        Config_1.Config.loadSync();
        Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false)];
        await sqlHelper.initDB();
    });
    afterEach(async () => {
        await sqlHelper.clearDB();
    });
    after(() => {
        Config_1.Config.loadSync();
    });
    const setPartial = (dir) => {
        if (!dir.cache.cover && dir.media && dir.media.length > 0) {
            dir.cache.cover = dir.media[0];
        }
        dir.isPartial = true;
        delete dir.directories;
        delete dir.metaFile;
        delete dir.media;
    };
    const makePreview = (m) => {
        delete m.directory?.id;
        delete m.metadata;
        return m;
    };
    const indexifyReturn = (dir) => {
        const d = Utils_1.Utils.clone(dir);
        if (d.cache.cover) {
            delete d.cache.cover.metadata;
        }
        if (d.directories) {
            for (const subD of d.directories) {
                if (subD.cache.cover) {
                    delete subD.cache.cover.metadata;
                }
            }
        }
        return d;
    };
    const removeIds = (dir) => {
        delete dir.id;
        dir.media.forEach((media) => {
            delete media.id;
        });
        if (dir.cache) {
            delete dir.cache.id;
        }
        if (dir.cache.cover) {
            delete dir.cache.cover.id;
        }
        if (dir.cache.directory) {
            delete dir.cache.directory.id;
        }
        if (dir.metaFile) {
            if (dir.metaFile.length === 0) {
                delete dir.metaFile;
            }
            else {
                dir.metaFile.forEach((file) => {
                    delete file.id;
                });
            }
        }
        if (dir.directories) {
            dir.directories.forEach((directory) => {
                removeIds(directory);
            });
        }
        return dir;
    };
    it('should support case sensitive file names', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1', 2, 3);
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo2', 2, 2);
        p1.name = 'test.jpg';
        p2.name = 'Test.jpg';
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(removeIds(selected))))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should stop indexing on empty folder', async () => {
        const gm = new GalleryManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        ProjectPath_1.ProjectPath.reset();
        ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, '/../../../assets');
        await ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.indexDirectory('.');
        if (ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.IsSavingInProgress) {
            await ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.SavingReady;
        }
        const directoryPath = GalleryManager_1.GalleryManager.parseRelativeDirPath('.');
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, directoryPath.name, directoryPath.parent)).id);
        expect(selected?.media?.length)
            .to.be.greaterThan(0);
        if (!fs.existsSync(TestHelper_1.TestHelper.TMP_DIR)) {
            fs.mkdirSync(TestHelper_1.TestHelper.TMP_DIR);
        }
        const tmpDir = path.join(TestHelper_1.TestHelper.TMP_DIR, '/rnd5sdf_emptyDir');
        fs.mkdirSync(tmpDir);
        ProjectPath_1.ProjectPath.ImageFolder = tmpDir;
        let notFailed = false;
        try {
            await ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.indexDirectory('.');
            notFailed = true;
        }
        catch (e) {
            // it expected to fail
        }
        if (notFailed) {
            expect(true).to.equal(false, 'indexDirectory is expected to fail');
        }
    });
    it('should support case sensitive directory', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'parent');
        const subDir1 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir');
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir1, 'subPhoto1', 0, 5);
        const subDir2 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'SUBDIR');
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir2, 'subPhoto2', 0, 3);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        setPartial(subDir1);
        setPartial(subDir2);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should support case sensitive directory path', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent1 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'parent');
        const parent2 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'PARENT');
        const subDir1 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent1, 'subDir');
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir1, 'subPhoto1', 0);
        const subDir2 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent2, 'subDir2');
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir2, 'subPhoto2', 0);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent1);
        await im.saveToDB(Utils_1.Utils.clone(parent1));
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent2);
        await im.saveToDB(Utils_1.Utils.clone(parent2));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        {
            const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent1.name, parent1.path)).id);
            DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
            removeIds(selected);
            setPartial(subDir1);
            expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
                .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent1)));
        }
        {
            const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent2.name, parent2.path)).id);
            DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
            removeIds(selected);
            setPartial(subDir2);
            expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
                .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent2)));
        }
    });
    it('should support emoji in names', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'parent dir 😀');
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1');
        p1.name = 'test 😀.jpg';
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(removeIds(selected))))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should select cover', async () => {
        const selectDirectory = async (gmTest, dir) => {
            const conn = await SQLConnection_1.SQLConnection.getConnection();
            const session = DBTestHelper_1.DBTestHelper.defaultSession;
            const selected = await gmTest.getParentDirFromId(conn, session, (await gmTest.getDirIdAndTime(conn, dir.name, dir.path)).id);
            DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
            removeIds(selected);
            return selected;
        };
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'parent');
        const checkParent = async () => {
            const selected = await selectDirectory(gm, parent);
            const cloned = Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent));
            if (cloned.directories) {
                cloned.directories.forEach(d => setPartial(d));
            }
            expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
                .to.deep.equalInAnyOrder(cloned);
        };
        const saveToDBAndCheck = async (dir) => {
            DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
            await im.saveToDB(Utils_1.Utils.clone(dir));
            await checkParent();
            DirectoryDTO_1.DirectoryDTOUtils.addReferences(parent);
        };
        await saveToDBAndCheck(parent);
        const subDir1 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir');
        await saveToDBAndCheck(parent);
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir1, 'subPhoto1', 0, 3);
        await saveToDBAndCheck(subDir1);
        const subDir2 = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir2');
        await saveToDBAndCheck(parent);
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir2, 'subPhoto2', 0, 2);
        await saveToDBAndCheck(subDir2);
        const p = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'photo', 0, 5);
        await saveToDBAndCheck(parent);
    });
    it('should be able to save parent after child', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'parentDir');
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1', 2, 2);
        const subDir = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'subDir');
        subDir.path = DiskManager_1.DiskManager.pathFromParent(parent);
        const sp1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto1', 0, 5);
        const sp2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto2', 0, 3);
        Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false)];
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(subDir);
        await im.saveToDB(Utils_1.Utils.clone(subDir));
        parent.directories.push(subDir);
        TestHelper_1.TestHelper.updateDirCache(parent);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        setPartial(subDir);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should save root parent after child', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, '.');
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1');
        const subDir = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, 'subDir');
        subDir.path = DiskManager_1.DiskManager.pathFromParent(parent);
        const sp1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto1', 0);
        sp1.metadata.rating = 5;
        const sp2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto2', 0);
        sp2.metadata.rating = 3;
        Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false)];
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(subDir);
        await im.saveToDB(Utils_1.Utils.clone(subDir));
        parent.directories.push(subDir);
        TestHelper_1.TestHelper.updateDirCache(parent);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        setPartial(subDir);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should save parent directory', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(null, '.');
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1', 2, 4);
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo2', 2, 3);
        const gpx = TestHelper_1.TestHelper.getRandomizedGPXEntry(parent, 'GPX1');
        const subDir = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir');
        const sp1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto1', 0, 5);
        const sp2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto2', 0, 3);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        setPartial(subDir);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)), 'db content:' + await DBTestHelper_1.DBTestHelper.printDB());
    });
    it('should save photos with extreme parameters', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1');
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo2');
        const minFloat = parseFloat((1.1 * Math.pow(10, -38)).toFixed(10));
        const maxFloat = parseFloat((3.4 * Math.pow(10, +38)).toFixed(10));
        p1.metadata.cameraData.fStop = minFloat;
        p2.metadata.cameraData.fStop = maxFloat;
        p1.metadata.cameraData.exposure = minFloat;
        p2.metadata.cameraData.exposure = maxFloat;
        p1.metadata.cameraData.focalLength = minFloat;
        p2.metadata.cameraData.focalLength = maxFloat;
        p1.metadata.positionData.GPSData.latitude = maxFloat;
        p2.metadata.positionData.GPSData.latitude = minFloat;
        p1.metadata.positionData.GPSData.longitude = maxFloat;
        p2.metadata.positionData.GPSData.longitude = minFloat;
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should skip meta files', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1', 2, 3);
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo2', 2, 4);
        const gpx = TestHelper_1.TestHelper.getRandomizedGPXEntry(parent, 'GPX1');
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        Config_1.Config.MetaFile.gpx = true;
        Config_1.Config.MetaFile.markdown = true;
        Config_1.Config.MetaFile.pg2conf = true;
        await im.saveToDB(Utils_1.Utils.clone(parent));
        Config_1.Config.MetaFile.gpx = false;
        Config_1.Config.MetaFile.markdown = false;
        Config_1.Config.MetaFile.pg2conf = false;
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        delete parent.metaFile;
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should update sub directory', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        parent.name = 'parent';
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent);
        const subDir = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir');
        subDir.name = 'subDir';
        const sp1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto1', 5, 5);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const sp2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto2', 2, 2);
        const sp3 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto3', 3, 3);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(subDir);
        await im.saveToDB(Utils_1.Utils.clone(subDir));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, subDir.name, subDir.path)).id);
        // subDir.isPartial = true;
        //  delete subDir.directories;
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        delete subDir.parent;
        delete subDir.metaFile;
        removeIds(selected);
        // selected.directories[0].parent = selected;
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(subDir)));
    });
    it('should avoid race condition', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        Config_1.Config.MetaFile.gpx = true;
        Config_1.Config.MetaFile.markdown = true;
        Config_1.Config.MetaFile.pg2conf = true;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1', 2, 2);
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo2', 2, 3);
        const gpx = TestHelper_1.TestHelper.getRandomizedGPXEntry(parent, 'GPX1');
        const subDir = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir');
        const sp1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto1', 1, 5);
        const sp2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'subPhoto2', 1, 3);
        Config_1.Config.AlbumCover.Sorting = [new ClientConfig_1.ClientSortingConfig(SortingMethods_1.SortByTypes.Rating, false)];
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        const s1 = im.queueForSave(Utils_1.Utils.clone(parent));
        const s2 = im.queueForSave(Utils_1.Utils.clone(parent));
        const s3 = im.queueForSave(Utils_1.Utils.clone(parent));
        await Promise.all([s1, s2, s3]);
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        setPartial(subDir);
        parent.directories.forEach(d => delete (d.cache?.cover.metadata).faces);
        delete sp1.metadata.faces;
        delete sp2.metadata.faces;
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equalInAnyOrder(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
    });
    it('should reset DB', async () => {
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        const p1 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo1', 2, 3);
        const p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(parent, 'Photo2', 2, 4);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, parent.name, parent.path)).id);
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(selected);
        removeIds(selected);
        expect(Utils_1.Utils.clone(Utils_1.Utils.removeNullOrEmptyObj(selected)))
            .to.deep.equal(Utils_1.Utils.removeNullOrEmptyObj(indexifyReturn(parent)));
        await im.resetDB();
        const selectReset = await gm.getDirIdAndTime(conn, parent.name, parent.path);
        expect(selectReset).to.deep.equal(null);
    });
    it('should save 1500 photos', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const gm = new GalleryManagerTest();
        const im = new IndexingManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        Config_1.Config.MetaFile.gpx = true;
        Config_1.Config.MetaFile.markdown = true;
        Config_1.Config.MetaFile.pg2conf = true;
        const parent = TestHelper_1.TestHelper.getRandomizedDirectoryEntry();
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(Utils_1.Utils.clone(parent));
        const subDir = TestHelper_1.TestHelper.getRandomizedDirectoryEntry(parent, 'subDir');
        for (let i = 0; i < 1500; i++) {
            TestHelper_1.TestHelper.getRandomizedPhotoEntry(subDir, 'p' + i);
        }
        DirectoryDTO_1.DirectoryDTOUtils.removeReferences(parent);
        await im.saveToDB(subDir);
        const selected = await gm.getParentDirFromId(conn, session, (await gm.getDirIdAndTime(conn, subDir.name, subDir.path)).id);
        expect(selected.media.length).to.equal(subDir.media.length);
    }).timeout(40000);
    it('should save .md with date', async () => {
        Config_1.Config.Album.enabled = true;
        Config_1.Config.Faces.enabled = true;
        Config_1.Config.Media.folder = path.join(__dirname, '/../../../assets');
        ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, '/../../../assets');
        const im = new IndexingManagerTest();
        const gm = new GalleryManagerTest();
        const session = DBTestHelper_1.DBTestHelper.defaultSession;
        const d = await DiskManager_1.DiskManager.scanDirectory('/');
        await im.saveToDB(d);
        const dir = await gm.listDirectory(session, '/');
        expect(dir.metaFile).to.be.an('array');
        expect(dir.metaFile).to.be.deep.equal([
            {
                date: 1126455782000,
                id: 1,
                name: 'index.md'
            }
        ]);
    });
    DBTestHelper_1.DBTestHelper.savedDescribe('Test listDirectory', () => {
        const statSync = fs.statSync;
        let dirTime = 0;
        const indexedTime = {
            lastScanned: 0,
            lastModified: 0
        };
        beforeEach(() => {
            dirTime = 0;
            ObjectManagers_1.ObjectManagers.getInstance().IndexingManager = new IndexingManagerTest();
            indexedTime.lastModified = 0;
            indexedTime.lastScanned = 0;
        });
        afterEach(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            fs.statSync = statSync;
        });
        it('with re indexing severity low', async () => {
            Config_1.Config.Indexing.reIndexingSensitivity = PrivateConfig_1.ReIndexingSensitivity.low;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            fs.statSync = () => ({ ctime: new Date(dirTime), mtime: new Date(dirTime) });
            const gm = new GalleryManagerTest();
            const session = DBTestHelper_1.DBTestHelper.defaultSession;
            gm.getDirIdAndTime = () => {
                return Promise.resolve(indexedTime);
            };
            gm.getParentDirFromId = () => {
                return Promise.resolve(indexedTime);
            };
            ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.indexDirectory = (...args) => {
                return Promise.resolve('indexing');
            };
            indexedTime.lastScanned = null;
            expect(await gm.listDirectory(session, './')).to.be.equal('indexing');
            indexedTime.lastModified = 0;
            dirTime = 1;
            expect(await gm.listDirectory(session, './')).to.be.equal('indexing');
            indexedTime.lastScanned = 10;
            indexedTime.lastModified = 1;
            dirTime = 1;
            expect(await gm.listDirectory(session, './')).to.be.equal(indexedTime);
            expect(await gm.listDirectory(session, './', 1, 10))
                .to.be.equal(null);
        });
    });
    DBTestHelper_1.DBTestHelper.savedDescribe('indexDirectory(waitForSave)', () => {
        beforeEach(async () => {
            await sqlHelper.initDB();
        });
        afterEach(async () => {
            Config_1.Config.loadSync();
            await sqlHelper.clearDB();
        });
        it('resolves after the specific directory is saved and does not wait for the whole queue (even with duplicates)', async () => {
            // Ensure ImageFolder is non-empty for the empty-root guard
            Config_1.Config.Album.enabled = true;
            Config_1.Config.Faces.enabled = true;
            ProjectPath_1.ProjectPath.reset();
            Config_1.Config.Media.folder = path.join(__dirname, '/../../../assets');
            ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, '/../../../assets');
            const completedSaves = [];
            class IMWithDelay extends IndexingManager_1.IndexingManager {
                async saveToDB(scannedDirectory) {
                    // mimic original concurrency guard
                    this.isSaving = true;
                    try {
                        if (scannedDirectory.name === 'B') {
                            await new Promise((res) => setTimeout(res, 30));
                            completedSaves.push('B');
                            return;
                        }
                        if (scannedDirectory.name === 'C') {
                            await new Promise((res) => setTimeout(res, 80));
                            completedSaves.push('C');
                            return;
                        }
                        await new Promise((res) => setTimeout(res, 10));
                        completedSaves.push(scannedDirectory.name);
                    }
                    finally {
                        this.isSaving = false;
                    }
                }
            }
            // Stub DiskManager.scanDirectory to return consistent DTOs
            const originalScan = DiskManager_1.DiskManager.scanDirectory;
            const makeDir = (name) => ({
                name,
                path: path.join(path.sep),
                mediaCount: 0,
                lastModified: 1,
                lastScanned: 1,
                youngestMedia: 0,
                oldestMedia: 0,
                directories: [],
                media: [],
                metaFile: []
            });
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            DiskManager_1.DiskManager.scanDirectory = async (rel) => makeDir(rel);
            const im = new IMWithDelay();
            try {
                // Queue two saves for the same directory ('B'), then another different directory ('C')
                const pB1 = im.indexDirectory('B', true);
                const pB2 = im.indexDirectory('B', true);
                const pC = im.indexDirectory('C', true); // queued after Bs and slower
                // Wait for first 'B' save only; should not wait for 'C'
                await pB1;
                expect(completedSaves[0]).to.equal('B');
                expect(completedSaves.filter(n => n === 'B').length).to.be.equal(1);
                expect(completedSaves.includes('C')).to.equal(false);
                // Wait for second 'B' save; regardless of dedupe, it should finish before 'C'
                await pB2;
                expect(completedSaves.filter(n => n === 'B').length).to.be.equal(2);
                expect(completedSaves.includes('C')).to.equal(false);
                // Now ensure 'C' completes afterwards
                await pC;
                expect(completedSaves[completedSaves.length - 1]).to.equal('C');
            }
            finally {
                // restore stubs
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                DiskManager_1.DiskManager.scanDirectory = originalScan;
                ProjectPath_1.ProjectPath.reset();
            }
        });
    });
    DBTestHelper_1.DBTestHelper.savedDescribe('should index .pg2conf', () => {
        it('.saved_searches.pg2conf', async () => {
            Config_1.Config.Album.enabled = true;
            Config_1.Config.Faces.enabled = true;
            Config_1.Config.Media.folder = path.join(__dirname, '/../../../assets');
            ProjectPath_1.ProjectPath.ImageFolder = path.join(__dirname, '/../../../assets');
            const im = new IndexingManagerTest();
            const am = new AlbumManager_1.AlbumManager();
            const dir = await DiskManager_1.DiskManager.scanDirectory('/');
            const p = Utils_1.Utils.clone(dir.media.find(m => m.name === 'exiftool.jpg')); // .saved_searches.pg2conf should match this file
            p.directory = {
                path: dir.path,
                name: dir.name
            };
            await im.saveToDB(dir);
            const albums = await am.getAll(DBTestHelper_1.DBTestHelper.defaultSession);
            expect(albums).to.be.deep.equal([
                {
                    id: 1,
                    name: 'Alvin',
                    locked: true,
                    cache: {
                        cover: makePreview(Utils_1.Utils.clone(p)),
                        id: 1,
                        itemCount: 1,
                        oldestMedia: p.metadata.creationDate,
                        valid: true,
                        youngestMedia: p.metadata.creationDate,
                    },
                    searchQuery: {
                        type: SearchQueryDTO_1.SearchQueryTypes.person,
                        value: 'Alvin',
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.like
                    }
                }
            ]);
        });
    });
});
//# sourceMappingURL=IndexingManager.spec.js.map