"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const Utils_1 = require("../../../src/common/Utils");
describe('Utils', () => {
    it('should concat urls', () => {
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('\\')).to.be.equal('.');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('\\*')).to.be.equal('/*');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc', 'cde')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc/', 'cde')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc\\', 'cde')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc/', 'cde/')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('./abc\\', 'cde/')).to.be.equal('./abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('/abc\\', 'cde/')).to.be.equal('/abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc/', '\\cde/')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('/abc/', '\\cde/')).to.be.equal('/abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc\\', '\\cde/')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc\\', '/cde/')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc/', '/cde/')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc\\/', '/cde/')).to.be.equal('abc/cde');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc\\/', '/cde/', 'fgh')).to.be.equal('abc/cde/fgh');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('abc\\/', '////cde/', 'fgh')).to.be.equal('abc/cde/fgh');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('http://abc\\/', '/cde/', 'fgh')).to.be.equal('http://abc/cde/fgh');
        (0, chai_1.expect)(Utils_1.Utils.concatUrls('https://abc\\/', '/cde/', 'fgh')).to.be.equal('https://abc/cde/fgh');
    });
    it('should find closest number', () => {
        (0, chai_1.expect)(Utils_1.Utils.findClosest(10, [10, 13, 4, 20])).to.be.equal(10);
        (0, chai_1.expect)(Utils_1.Utils.findClosest(10, [13, 4, 20])).to.be.equal(13);
        (0, chai_1.expect)(Utils_1.Utils.findClosest(10, [4, 20])).to.be.equal(4);
        (0, chai_1.expect)(Utils_1.Utils.findClosest(10, [20])).to.be.equal(20);
    });
    it('should find closest number in sorted array', () => {
        (0, chai_1.expect)(Utils_1.Utils.findClosestinSorted(10, [3, 5, 8, 10, 15, 20])).to.be.equal(10);
        (0, chai_1.expect)(Utils_1.Utils.findClosestinSorted(10, [3, 5, 8, 15, 20])).to.be.equal(8);
        (0, chai_1.expect)(Utils_1.Utils.findClosestinSorted(10, [3, 5, 15, 20])).to.be.equal(15);
        (0, chai_1.expect)(Utils_1.Utils.findClosestinSorted(10, [3, 5, 20])).to.be.equal(5);
        (0, chai_1.expect)(Utils_1.Utils.findClosestinSorted(10, [3, 20])).to.be.equal(3);
        (0, chai_1.expect)(Utils_1.Utils.findClosestinSorted(10, [20])).to.be.equal(20);
    });
    it('should equal', () => {
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter('abc', 'abc')).to.be.equal(true);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter('abc', 'abcd')).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(10, 10)).to.be.equal(true);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(10, 11)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(true, true)).to.be.equal(true);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(false, false)).to.be.equal(true);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(false, true)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(true, false)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(0, false)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(0, 0)).to.be.equal(true);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(false, 0)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(null, null)).to.be.equal(true);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(null, false)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter(false, null)).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter({ a: 0 }, { b: 0 })).to.be.equal(false);
        (0, chai_1.expect)(Utils_1.Utils.equalsFilter({ a: 0 }, { a: 0 })).to.be.equal(true);
    });
    describe('sortableFilename', () => {
        it('should trim extensions', () => {
            (0, chai_1.expect)(Utils_1.Utils.sortableFilename("10.jpg")).to.be.equal("10");
        });
        it('should not trim dotfiles to empty strings', () => {
            (0, chai_1.expect)(Utils_1.Utils.sortableFilename(".file")).to.be.equal(".file");
        });
        it('should trim dotfiles with extensions', () => {
            (0, chai_1.expect)(Utils_1.Utils.sortableFilename(".favourite.jpg")).to.be.equal(".favourite");
        });
        it('should not trim without dots', () => {
            (0, chai_1.expect)(Utils_1.Utils.sortableFilename("hello_world")).to.be.equal("hello_world");
        });
    });
});
//# sourceMappingURL=Utils.spec.js.map