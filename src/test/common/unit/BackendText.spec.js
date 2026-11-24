"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const BackendTexts_1 = require("../../../src/common/BackendTexts");
describe('BackendText', () => {
    it('should all number be unique', () => {
        const numbers = [];
        const getNumbers = (obj) => {
            for (const key of Object.keys(obj)) {
                if (typeof obj[key] === 'object') {
                    getNumbers(obj[key]);
                    continue;
                }
                (0, chai_1.expect)(numbers.indexOf(obj[key])).to.be.equal(-1, 'duplicate backend number id found:' + obj[key]);
                numbers.push(obj[key]);
            }
        };
        getNumbers(BackendTexts_1.backendTexts);
    });
});
//# sourceMappingURL=BackendText.spec.js.map