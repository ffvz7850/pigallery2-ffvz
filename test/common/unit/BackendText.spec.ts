import {expect} from 'chai';
import {backendTexts} from '../../../src/common/BackendTexts';


describe('BackendText', () => {
  it('should all number be unique', () => {
    const numbers: number[] = [];
    const getNumbers = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          getNumbers(obj[key]);
          continue;
        }
        expect(numbers.indexOf(obj[key])).to.be.equal(-1, 'duplicate backend number id found:' + obj[key]);
        numbers.push(obj[key]);
      }
    };
    getNumbers(backendTexts);
  });
});
