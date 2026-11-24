"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs = require("fs");
const Config_1 = require("../../../../../src/common/config/private/Config");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const UserEntity_1 = require("../../../../../src/backend/model/database/enitites/UserEntity");
const UserDTO_1 = require("../../../../../src/common/entities/UserDTO");
const PasswordHelper_1 = require("../../../../../src/backend/model/PasswordHelper");
const DirectoryEntity_1 = require("../../../../../src/backend/model/database/enitites/DirectoryEntity");
const PhotoEntity_1 = require("../../../../../src/backend/model/database/enitites/PhotoEntity");
const MediaEntity_1 = require("../../../../../src/backend/model/database/enitites/MediaEntity");
const VersionEntity_1 = require("../../../../../src/backend/model/database/enitites/VersionEntity");
const PrivateConfig_1 = require("../../../../../src/common/config/private/PrivateConfig");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const TestHelper_1 = require("../../../../TestHelper");
describe('Typeorm integration', () => {
    const setUpSqlDB = async () => {
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true, force: true });
        Config_1.Config.Database.type = PrivateConfig_1.DatabaseType.sqlite;
        Config_1.Config.Database.dbFolder = TestHelper_1.TestHelper.TMP_DIR;
        ProjectPath_1.ProjectPath.reset();
    };
    const teardownUpSqlDB = async () => {
        await SQLConnection_1.SQLConnection.close();
        await fs.promises.rm(TestHelper_1.TestHelper.TMP_DIR, { recursive: true });
    };
    beforeEach(async () => {
        await setUpSqlDB();
    });
    afterEach(async () => {
        await teardownUpSqlDB();
    });
    const getDir = (namePrefix = '') => {
        const d = new DirectoryEntity_1.DirectoryEntity();
        d.name = namePrefix + 'test dir';
        d.path = '.';
        d.lastModified = Date.now();
        d.lastScanned = null;
        d.parent = null;
        d.media = [];
        d.directories = [];
        return d;
    };
    const getPhoto = () => {
        const sd = new MediaEntity_1.MediaDimensionEntity();
        sd.height = 200;
        sd.width = 200;
        const gps = new MediaEntity_1.GPSMetadataEntity();
        gps.latitude = 1;
        gps.longitude = 1;
        const pd = new MediaEntity_1.PositionMetaDataEntity();
        pd.city = 'New York';
        pd.country = 'Alderan';
        pd.state = 'Death star';
        pd.GPSData = gps;
        const cd = new MediaEntity_1.CameraMetadataEntity();
        cd.ISO = 100;
        cd.model = '60D';
        cd.make = 'Canon';
        cd.fStop = 1;
        cd.exposure = 1;
        cd.focalLength = 1;
        cd.lens = 'Lens';
        const m = new PhotoEntity_1.PhotoMetadataEntity();
        m.keywords = ['apple'];
        m.cameraData = cd;
        m.positionData = pd;
        m.size = sd;
        m.creationDate = Date.now();
        m.fileSize = 123456789;
        const d = new PhotoEntity_1.PhotoEntity();
        d.name = 'test media.jpg';
        d.directory = null;
        d.metadata = m;
        return d;
    };
    it('should migrate users', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const a = new UserEntity_1.UserEntity();
        a.name = 'migrated admin';
        a.password = PasswordHelper_1.PasswordHelper.cryptPassword('Test admin');
        a.role = UserDTO_1.UserRoles.Admin;
        await conn.getRepository(UserEntity_1.UserEntity).save(a);
        const version = (await conn.getRepository(VersionEntity_1.VersionEntity).find())[0];
        version.version--;
        await conn.getRepository(VersionEntity_1.VersionEntity).save(version);
        await SQLConnection_1.SQLConnection.close();
        const conn2 = await SQLConnection_1.SQLConnection.getConnection();
        const admins = await conn2.getRepository(UserEntity_1.UserEntity).findBy({ name: 'migrated admin' });
        (0, chai_1.expect)(admins.length).to.be.equal(1);
    });
    it('should open and close connection', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        (0, chai_1.expect)(conn.isConnected).to.equal(true);
        await SQLConnection_1.SQLConnection.close();
        (0, chai_1.expect)(conn.isConnected).to.equal(false);
    });
    it('should open and close connection twice', async () => {
        let conn = await SQLConnection_1.SQLConnection.getConnection();
        (0, chai_1.expect)(conn.isConnected).to.equal(true);
        await SQLConnection_1.SQLConnection.close();
        (0, chai_1.expect)(conn.isConnected).to.equal(false);
        conn = await SQLConnection_1.SQLConnection.getConnection();
        (0, chai_1.expect)(conn.isConnected).to.equal(true);
        await SQLConnection_1.SQLConnection.close();
        (0, chai_1.expect)(conn.isConnected).to.equal(false);
    });
    it('should add a user', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const userRepository = conn.getRepository(UserEntity_1.UserEntity);
        const a = new UserEntity_1.UserEntity();
        a.name = 'test';
        a.password = PasswordHelper_1.PasswordHelper.cryptPassword('test');
        a.role = UserDTO_1.UserRoles.Admin;
        await userRepository.save(a);
        (0, chai_1.expect)((await userRepository.find()).length).to.equal(1);
    });
    it('should add a dir', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const dr = conn.getRepository(DirectoryEntity_1.DirectoryEntity);
        await dr.save(getDir());
        (0, chai_1.expect)((await dr.find()).length).to.equal(1);
    });
    it('should add a media', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const pr = conn.getRepository(PhotoEntity_1.PhotoEntity);
        const dir = await conn.getRepository(DirectoryEntity_1.DirectoryEntity).save(getDir());
        const photo = getPhoto();
        photo.directory = dir;
        await pr.save(photo);
        (0, chai_1.expect)((await pr.find()).length).to.equal(1);
    });
    it('should find a media', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const pr = conn.getRepository(PhotoEntity_1.PhotoEntity);
        const dir = await conn.getRepository(DirectoryEntity_1.DirectoryEntity).save(getDir());
        const photo = getPhoto();
        photo.directory = dir;
        await pr.save(photo);
        const photos = await pr
            .createQueryBuilder('media')
            .orderBy('media.metadata.creationDate', 'ASC') //TODO: Offset: Create a test where it is ".orderBy('media.metadata.creationDate + (media.metadata.creationDateOffset * 60000)', 'ASC')" instead
            .where('media.metadata.positionData.city LIKE :text COLLATE utf8_general_ci', { text: '%' + photo.metadata.positionData.city + '%' })
            .innerJoinAndSelect('media.directory', 'directory')
            .limit(10)
            .getMany();
        (0, chai_1.expect)(photos.length).to.equal(1);
        (0, chai_1.expect)(photos[0].directory.name).to.equal(dir.name);
    });
    it('should not find a media', async () => {
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        const pr = conn.getRepository(PhotoEntity_1.PhotoEntity);
        const dir = await conn.getRepository(DirectoryEntity_1.DirectoryEntity).save(getDir());
        const photo = getPhoto();
        photo.directory = dir;
        const city = photo.metadata.positionData.city;
        photo.metadata.positionData = null;
        await pr.save(photo);
        const photos = await pr
            .createQueryBuilder('media')
            .orderBy('media.metadata.creationDate', 'ASC') //TODO: Offset: Create a test where it is ".orderBy('media.metadata.creationDate + (media.metadata.creationDateOffset * 60000)', 'ASC')" instead
            .where('media.metadata.positionData.city LIKE :text COLLATE utf8_general_ci', { text: '%' + city + '%' })
            .innerJoinAndSelect('media.directory', 'directory')
            .limit(10)
            .getMany();
        (0, chai_1.expect)(photos.length).to.equal(0);
    });
    it('should open and close connection twice with media added ', async () => {
        let conn = await SQLConnection_1.SQLConnection.getConnection();
        const dir = await conn.getRepository(DirectoryEntity_1.DirectoryEntity).save(getDir());
        const dir2 = getDir('dir2');
        dir2.parent = dir;
        await conn.getRepository(DirectoryEntity_1.DirectoryEntity).save(dir2);
        const photo = getPhoto();
        photo.directory = dir2;
        await await conn.getRepository(PhotoEntity_1.PhotoEntity).save(photo);
        await SQLConnection_1.SQLConnection.close();
        (0, chai_1.expect)(conn.isConnected).to.equal(false);
        conn = await SQLConnection_1.SQLConnection.getConnection();
        (0, chai_1.expect)(conn.isConnected).to.equal(true);
        await SQLConnection_1.SQLConnection.close();
        (0, chai_1.expect)(conn.isConnected).to.equal(false);
    });
});
//# sourceMappingURL=typeorm.js.map