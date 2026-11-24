"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteTestingHelper = void 0;
const ObjectManagers_1 = require("../../../../src/backend/model/ObjectManagers");
const UserDTO_1 = require("../../../../src/common/entities/UserDTO");
const Utils_1 = require("../../../../src/common/Utils");
const SearchQueryDTO_1 = require("../../../../src/common/entities/SearchQueryDTO");
const chai = require("chai");
const should = chai.should();
class RouteTestingHelper {
    static async createSharing(testUser, password = null) {
        const sharing = {
            sharingKey: 'sharing_test_key_' + Date.now(),
            searchQuery: { type: SearchQueryDTO_1.SearchQueryTypes.directory, value: 'test', matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match },
            expires: Date.now() + 1000,
            timeStamp: Date.now(),
            creator: testUser
        };
        if (password) {
            sharing.password = password;
        }
        await ObjectManagers_1.ObjectManagers.getInstance().SharingManager.createSharing(Utils_1.Utils.clone(sharing)); // do not rewrite the password
        return sharing;
    }
    static getExpectedSharingUserForUI(sharing) {
        const u = {
            name: 'Guest',
            role: UserDTO_1.UserRoles.LimitedGuest,
            usedSharingKey: sharing.sharingKey,
        };
        const q = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildAllowListForSharing(sharing);
        u.projectionKey = ObjectManagers_1.ObjectManagers.getInstance().SessionManager.createProjectionKey(q);
        return u;
    }
    /**
     * Check if the result sent to UI is a valid user object
     * @param result
     * @param user
     */
    static { this.shouldBeValidUIUser = (result, user) => {
        result.should.have.status(200);
        result.body.should.be.a('object');
        should.equal(result.body.error, null);
        const { ...u } = result.body.result;
        // Ensure sensitive fields are not leaked
        u.should.not.have.property('password');
        // Ensure server does not leak internal allow/block queries
        u.should.not.have.property('allowQuery');
        u.should.not.have.property('blockQuery');
        u.should.not.have.property('overrideAllowBlockList');
        // Check core identity fields
        u.should.have.property('name', user.name);
        u.should.have.property('role', user.role);
        if (typeof user.id !== 'undefined') {
            u.should.have.property('id', user.id);
        }
        if (typeof user.usedSharingKey !== 'undefined') {
            u.should.have.property('usedSharingKey', user.usedSharingKey);
        }
        // projectionKey may be present; if present, ensure it is a non-empty string
        if (typeof u.projectionKey !== 'undefined') {
            u.projectionKey.should.be.a('string');
            u.projectionKey.length.should.be.greaterThan(0);
        }
        u.should.deep.equal(user);
    }; }
}
exports.RouteTestingHelper = RouteTestingHelper;
//# sourceMappingURL=RouteTestingHelper.js.map