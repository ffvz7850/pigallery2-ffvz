"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const SQLConnection_1 = require("../../../../../src/backend/model/database/SQLConnection");
const SharingManager_1 = require("../../../../../src/backend/model/database/SharingManager");
const UserEntity_1 = require("../../../../../src/backend/model/database/enitites/UserEntity");
const UserDTO_1 = require("../../../../../src/common/entities/UserDTO");
const DBTestHelper_1 = require("../../../DBTestHelper");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
describe = DBTestHelper_1.DBTestHelper.describe();
describe('SharingManager', (sqlHelper) => {
    let creator = null;
    const setUpSqlDB = async () => {
        await sqlHelper.initDB();
        const conn = await SQLConnection_1.SQLConnection.getConnection();
        creator = await conn.getRepository(UserEntity_1.UserEntity).save({
            id: null,
            name: 'test use',
            password: '',
            role: UserDTO_1.UserRoles.User
        });
        await SQLConnection_1.SQLConnection.close();
    };
    beforeEach(async () => {
        await setUpSqlDB();
    });
    after(async () => {
        await sqlHelper.clearDB();
    });
    it('should create sharing', async () => {
        const sm = new SharingManager_1.SharingManager();
        const sharing = {
            id: null,
            sharingKey: 'testKey',
            searchQuery: { value: '/', type: SearchQueryDTO_1.SearchQueryTypes.directory },
            password: null,
            creator,
            expires: Date.now() + 1000,
            timeStamp: Date.now()
        };
        const saved = await sm.createSharing(sharing);
        (0, chai_1.expect)(saved.id).to.not.equals(null);
        (0, chai_1.expect)(saved.creator.id).to.equals(creator.id);
        (0, chai_1.expect)(saved.sharingKey).to.equals(sharing.sharingKey);
        (0, chai_1.expect)(saved.timeStamp).to.equals(sharing.timeStamp);
        (0, chai_1.expect)(saved.password).to.equals(sharing.password);
        (0, chai_1.expect)(saved.expires).to.equals(sharing.expires);
    });
    it('should find sharing', async () => {
        const sm = new SharingManager_1.SharingManager();
        const sharing = {
            id: null,
            sharingKey: 'testKey',
            searchQuery: { value: '/', type: SearchQueryDTO_1.SearchQueryTypes.directory },
            password: null,
            creator,
            expires: Date.now() + 1000,
            timeStamp: Date.now()
        };
        const saved = await sm.createSharing(sharing);
        const found = await sm.findOne('testKey');
        (0, chai_1.expect)(found.id).to.not.equals(null);
        (0, chai_1.expect)(found.sharingKey).to.equals(sharing.sharingKey);
        (0, chai_1.expect)(found.timeStamp).to.equals(sharing.timeStamp);
        (0, chai_1.expect)(found.password).to.equals(sharing.password);
        (0, chai_1.expect)(found.expires).to.equals(sharing.expires);
    });
    it('should update sharing', async () => {
        const sm = new SharingManager_1.SharingManager();
        const sharing = {
            id: null,
            sharingKey: 'testKey',
            searchQuery: { value: '/', type: SearchQueryDTO_1.SearchQueryTypes.directory },
            password: null,
            creator,
            expires: Date.now() + 1000,
            timeStamp: Date.now()
        };
        const saved = await sm.createSharing(sharing);
        (0, chai_1.expect)(saved.password).to.equals(sharing.password);
        (0, chai_1.expect)(saved.expires).to.equals(sharing.expires);
        const update = {
            id: saved.id,
            sharingKey: saved.sharingKey,
            searchQuery: saved.searchQuery,
            password: null,
            creator,
            expires: Date.now() + 2000,
            timeStamp: Date.now()
        };
        const updated = await sm.updateSharing(update, false);
        (0, chai_1.expect)(updated.id).to.equals(saved.id);
        (0, chai_1.expect)(updated.sharingKey).to.equals(sharing.sharingKey);
        (0, chai_1.expect)(updated.timeStamp).to.equals(sharing.timeStamp);
        (0, chai_1.expect)(updated.password).to.equals(update.password);
        (0, chai_1.expect)(updated.expires).to.equals(update.expires);
    });
});
//# sourceMappingURL=SharingManager.spec.js.map