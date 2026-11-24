"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const promises_1 = require("fs/promises");
const ExtensionRepository_1 = require("../../../../../src/backend/model/extension/ExtensionRepository");
const ProjectPath_1 = require("../../../../../src/backend/ProjectPath");
const path = require("path");
describe('ExtensionRepository', () => {
    it('should parse MD repo file', async () => {
        const text = await (0, promises_1.readFile)(path.join(ProjectPath_1.ProjectPath.Root, 'extension/REPOSITORY.md'), 'utf8');
        const extensions = (new ExtensionRepository_1.ExtensionRepository()).repoMD(text);
        (0, chai_1.expect)(extensions[0].id).to.deep.equal('sample-extension');
    });
});
//# sourceMappingURL=ExtensionRepository.spec.js.map