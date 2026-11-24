"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const TaskExecuter_1 = require("../../../../../src/backend/model/fileaccess/TaskExecuter");
describe('TaskExecuter', () => {
    it('should execute', async () => {
        const taskWorker = (input) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(input * 2);
                }, 1);
            });
        };
        const tq = new TaskExecuter_1.TaskExecuter(10, taskWorker);
        (0, chai_1.expect)(await tq.execute(1)).to.be.equal(2);
        (0, chai_1.expect)(await tq.execute(10)).to.be.equal(20);
        (0, chai_1.expect)(await tq.execute(1)).to.be.equal(2);
        (0, chai_1.expect)(await tq.execute(111)).to.be.equal(222);
    });
    it('should fail', async () => {
        const taskWorker = (input) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject((input * 2).toString());
                }, 1);
            });
        };
        const tq = new TaskExecuter_1.TaskExecuter(10, taskWorker);
        try {
            await tq.execute(1);
            (0, chai_1.expect)(false).to.be.equal(true); // should not reach
        }
        catch (e) {
            (0, chai_1.expect)(e).to.be.equal('2');
        }
    });
    it('should handle race condition', async () => {
        let counter = 0;
        const taskWorker = (input) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    counter++;
                    resolve();
                }, 1);
            });
        };
        const tq = new TaskExecuter_1.TaskExecuter(10, taskWorker);
        const prs = [];
        prs.push(tq.execute(1));
        prs.push(tq.execute(1));
        prs.push(tq.execute(1));
        prs.push(tq.execute(2));
        prs.push(tq.execute(2));
        await Promise.all(prs);
        (0, chai_1.expect)(counter).to.be.equal(2);
    });
});
//# sourceMappingURL=TaskExecuter.spec.js.map