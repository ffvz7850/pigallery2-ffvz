"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const UserDTO_1 = require("../../../src/common/entities/UserDTO");
describe('UserDTO', () => {
    it('should expose UserRoles enum', () => {
        (0, chai_1.expect)(UserDTO_1.UserRoles.Admin).to.be.a('number');
    });
});
//# sourceMappingURL=UserDTO.js.map