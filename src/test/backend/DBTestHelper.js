"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBTestHelper = void 0;
const Config_1 = require("../../src/common/config/private/Config");
const path = require("path");
const fs = require("fs");
const SQLConnection_1 = require("../../src/backend/model/database/SQLConnection");
const PrivateConfig_1 = require("../../src/common/config/private/PrivateConfig");
const ProjectPath_1 = require("../../src/backend/ProjectPath");
const ObjectManagers_1 = require("../../src/backend/model/ObjectManagers");
const DiskManager_1 = require("../../src/backend/model/fileaccess/DiskManager");
const IndexingManager_1 = require("../../src/backend/model/database/IndexingManager");
const GalleryManager_1 = require("../../src/backend/model/database/GalleryManager");
const Utils_1 = require("../../src/common/Utils");
const TestHelper_1 = require("../TestHelper");
const Logger_1 = require("../../src/backend/Logger");
const SessionManager_1 = require("../../src/backend/model/database/SessionManager");
const DirectoryEntity_1 = require("../../src/backend/model/database/enitites/DirectoryEntity");
const MediaEntity_1 = require("../../src/backend/model/database/enitites/MediaEntity");
const ProjectedDirectoryCacheEntity_1 = require("../../src/backend/model/database/enitites/ProjectedDirectoryCacheEntity");
const savedDescribe = describe;
class IndexingManagerTest extends IndexingManager_1.IndexingManager {
    async saveToDB(scannedDirectory) {
        return super.saveToDB(scannedDirectory);
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
const LOG_TAG = '[DBTestHelper]';
class DBTestHelper {
    static { this.enable = {
        sqlite: process.env.TEST_SQLITE !== 'false',
        mysql: process.env.TEST_MYSQL !== 'false'
    }; }
    static { this.savedDescribe = savedDescribe; }
    static get defaultSession() {
        return { user: { projectionKey: SessionManager_1.SessionManager.NO_PROJECTION_KEY } };
    }
    constructor(dbType) {
        this.dbType = dbType;
        this.testGalleyEntities = {
            /**
             * dir
             * |- v
             * |- p
             * |- p2
             * |-> subDir
             *     |- p3
             * |-> subDir2
             *     |- p4
             */
            dir: null,
            subDir: null,
            subDir2: null,
            v: null,
            p: null,
            p2: null,
            p3: null,
            p4: null
        };
    }
    static describe(settingsOverride = {}) {
        const settings = Utils_1.Utils.clone(DBTestHelper.enable);
        for (const key of Object.keys(settingsOverride)) {
            settings[key] = settingsOverride[key];
        }
        return (name, tests) => {
            savedDescribe(name, async () => {
                if (settings.sqlite) {
                    const helper = new DBTestHelper(PrivateConfig_1.DatabaseType.sqlite);
                    savedDescribe('sqlite', () => {
                        return tests(helper);
                    });
                }
                if (settings.mysql) {
                    const helper = new DBTestHelper(PrivateConfig_1.DatabaseType.mysql);
                    savedDescribe('mysql', function () {
                        this.timeout(99999999); // hint for the test environment
                        return tests(helper);
                    });
                }
            });
        };
    }
    static async persistTestDir(directory) {
        await ObjectManagers_1.ObjectManagers.getInstance().init();
        const connection = await SQLConnection_1.SQLConnection.getConnection();
        ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.indexDirectory = () => Promise.resolve(null);
        await ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.saveToDB(directory);
        // not saving subdirs. saveToDB destroys data
        // await im.saveToDB(subDir);
        // await im.saveToDB(subDir2);
        if (ObjectManagers_1.ObjectManagers.getInstance().IndexingManager &&
            ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.IsSavingInProgress) {
            await ObjectManagers_1.ObjectManagers.getInstance().IndexingManager.SavingReady;
        }
        const gm = new GalleryManagerTest();
        const dir = await gm.getParentDirFromId(connection, this.defaultSession, (await gm.getDirIdAndTime(connection, directory.name, path.join(directory.path, path.sep))).id);
        const populateDir = async (d) => {
            for (let i = 0; i < d.directories.length; i++) {
                d.directories[i] = await gm.getParentDirFromId(connection, this.defaultSession, (await gm.getDirIdAndTime(connection, d.directories[i].name, path.join(DiskManager_1.DiskManager.pathFromParent(d), path.sep))).id);
                await populateDir(d.directories[i]);
            }
        };
        await populateDir(dir);
        await ObjectManagers_1.ObjectManagers.reset();
        return dir;
    }
    async initDB() {
        await Config_1.Config.load();
        Config_1.Config.Extensions.enabled = false; // make all tests clean
        if (this.dbType === PrivateConfig_1.DatabaseType.sqlite) {
            await this.initSQLite();
        }
        else if (this.dbType === PrivateConfig_1.DatabaseType.mysql) {
            await this.initMySQL();
        }
    }
    async clearDB() {
        if (this.dbType === PrivateConfig_1.DatabaseType.sqlite) {
            await this.clearUpSQLite();
        }
        else if (this.dbType === PrivateConfig_1.DatabaseType.mysql) {
            await this.clearUpMysql();
        }
    }
    async setUpTestGallery() {
        const directory = TestHelper_1.TestHelper.getDirectoryEntry(null, '.');
        this.testGalleyEntities.subDir = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'The Phantom Menace');
        this.testGalleyEntities.subDir2 = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'Return of the Jedi');
        this.testGalleyEntities.p = TestHelper_1.TestHelper.getRandomizedPhotoEntry(directory, 'Photo1');
        this.testGalleyEntities.p2 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(directory, 'Photo2');
        this.testGalleyEntities.p3 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(this.testGalleyEntities.subDir, 'Photo3');
        this.testGalleyEntities.p4 = TestHelper_1.TestHelper.getRandomizedPhotoEntry(this.testGalleyEntities.subDir2, 'Photo4');
        this.testGalleyEntities.v = TestHelper_1.TestHelper.getVideoEntry1(directory);
        this.testGalleyEntities.dir = await DBTestHelper.persistTestDir(directory);
        this.testGalleyEntities.subDir = this.testGalleyEntities.dir.directories[0];
        this.testGalleyEntities.subDir2 = this.testGalleyEntities.dir.directories[1];
        this.testGalleyEntities.p = this.testGalleyEntities.dir.media.filter(m => m.name === this.testGalleyEntities.p.name)[0];
        this.testGalleyEntities.p.directory = this.testGalleyEntities.dir;
        this.testGalleyEntities.p2 = this.testGalleyEntities.dir.media.filter(m => m.name === this.testGalleyEntities.p2.name)[0];
        this.testGalleyEntities.p2.directory = this.testGalleyEntities.dir;
        this.testGalleyEntities.v = this.testGalleyEntities.dir.media.filter(m => m.name === this.testGalleyEntities.v.name)[0];
        this.testGalleyEntities.v.directory = this.testGalleyEntities.dir;
        this.testGalleyEntities.p3 = this.testGalleyEntities.dir.directories[0].media[0];
        this.testGalleyEntities.p3.directory = this.testGalleyEntities.dir.directories[0];
        this.testGalleyEntities.p4 = this.testGalleyEntities.dir.directories[1].media[0];
        this.testGalleyEntities.p2.directory = this.testGalleyEntities.dir.directories[1];
    }
    static async printDB() {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const dirs = await conn.getRepository(DirectoryEntity_1.DirectoryEntity).createQueryBuilder('dir').getMany();
        const dCache = await conn.getRepository(ProjectedDirectoryCacheEntity_1.ProjectedDirectoryCacheEntity).createQueryBuilder('c').leftJoinAndSelect('c.cover', 'cover').getMany();
        const media = await conn.getRepository(MediaEntity_1.MediaEntity).createQueryBuilder('m').getMany();
        return JSON.stringify({ dirs, dCache, media }, null, 2);
    }
    async initMySQL() {
        await this.resetMySQL();
    }
    async resetMySQL() {
        Logger_1.Logger.debug(LOG_TAG, 'resetting up mysql');
        await this.clearUpMysql();
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        await conn.query('CREATE DATABASE IF NOT EXISTS ' + conn.options.database);
        await SQLConnection_1.SQLConnection.close();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
    }
    async clearUpMysql() {
        Logger_1.Logger.debug(LOG_TAG, 'clearing up mysql');
        await ObjectManagers_1.ObjectManagers.reset();
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.mysql;
        Config_1.Config.Database.mysql.database = 'pigallery2_test';
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        await conn.query('DROP DATABASE IF EXISTS ' + conn.options.database);
        await SQLConnection_1.SQLConnection.close();
    }
    async initSQLite() {
        await this.resetSQLite();
    }
    async resetSQLite() {
        Logger_1.Logger.debug(LOG_TAG, 'resetting sqlite');
        await this.clearUpSQLite();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
    }
    async clearUpSQLite() {
        Logger_1.Logger.debug(LOG_TAG, 'clearing up sqlite');
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
        Config_1.Config.Database.dbFolder = TestHelper_1.TestHelper.TMP_DIR;
        ProjectPath_1.ProjectPath.reset();
        await ObjectManagers_1.ObjectManagers.reset();
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
    }
}
exports.DBTestHelper = DBTestHelper;
//# sourceMappingURL=DBTestHelper.js.map