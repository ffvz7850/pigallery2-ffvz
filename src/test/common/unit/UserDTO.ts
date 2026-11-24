import {expect} from 'chai';
import {UserRoles} from '../../../src/common/entities/UserDTO';

describe('UserDTO', () => {
  it('should expose UserRoles enum', () => {
    expect(UserRoles.Admin).to.be.a('number');
  });
});
