import {expect} from 'chai';
import { readFile } from 'fs/promises';
import {ExtensionRepository} from '../../../../../src/backend/model/extension/ExtensionRepository';
import {ProjectPath} from '../../../../../src/backend/ProjectPath';
import path = require('path');

// to help WebStorm to handle the test cases
declare let describe: any;
declare const after: any;
declare const before: any;
declare const it: any;


describe('ExtensionRepository', () => {

  it('should parse MD repo file', async () => {

    const text = await readFile(path.join(ProjectPath.Root,'extension/REPOSITORY.md'), 'utf8');
    const extensions = (new ExtensionRepository()).repoMD(text);
    expect(extensions[0].id).to.deep.equal('sample-extension');
  });
});
