"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ExtensionConfigWrapper_1 = require("../../../../../src/backend/model/extension/ExtensionConfigWrapper");
describe('ExtensionConfigWrapper', () => {
    it('should load original config multiple times with the same result', async () => {
        const get = async () => JSON.parse(JSON.stringify((await ExtensionConfigWrapper_1.ExtensionConfigWrapper.original()).toJSON({
            attachState: true,
            attachVolatile: true,
            skipTags: { secret: true }
        })));
        const a = await get();
        const b = await get();
        (0, chai_1.expect)(b).to.deep.equal(a);
        const c = await get();
        (0, chai_1.expect)(c).to.deep.equal(a);
    });
});
//# sourceMappingURL=ExtensionConfigWrapper.spec.js.map