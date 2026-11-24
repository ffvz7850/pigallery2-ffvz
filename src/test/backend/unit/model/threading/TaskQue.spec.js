"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const TaskQue_1 = require("../../../../../src/backend/model/fileaccess/TaskQue");
describe('TaskQue', () => {
    it('should be empty', () => {
        const tq = new TaskQue_1.TaskQue();
        (0, chai_1.expect)(tq.isEmpty()).to.be.equal(true);
        tq.add(2);
        (0, chai_1.expect)(tq.isEmpty()).to.be.equal(false);
        tq.ready(tq.get());
        (0, chai_1.expect)(tq.isEmpty()).to.be.equal(true);
    });
    it('should get', () => {
        const tq = new TaskQue_1.TaskQue();
        tq.add(2);
        (0, chai_1.expect)(tq.get().data).to.be.equal(2);
        (0, chai_1.expect)(tq.get).to.throw();
    });
    it('should set ready', () => {
        const tq = new TaskQue_1.TaskQue();
        tq.add(2);
        const task = tq.get();
        tq.ready(task);
        (0, chai_1.expect)(tq.isEmpty()).to.be.equal(true);
        (0, chai_1.expect)(tq.ready.bind(tq, task)).to.be.throw('Task does not exist');
    });
});
//# sourceMappingURL=TaskQue.spec.js.map