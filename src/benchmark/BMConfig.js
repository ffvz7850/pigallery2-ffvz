"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BMConfig = exports.PrivateConfigClass = exports.BenchmarksConfig = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-inferrable-types */
const path = require("path");
const node_1 = require("typeconfig/node");
const common_1 = require("typeconfig/common");
let BenchmarksConfig = class BenchmarksConfig {
    constructor() {
        this.bmScanDirectory = true;
        this.bmSaveDirectory = true;
        this.bmListDirectory = true;
        this.bmListPersons = true;
        this.bmAllSearch = true;
        this.bmAutocomplete = true;
    }
};
exports.BenchmarksConfig = BenchmarksConfig;
tslib_1.__decorate([
    (0, common_1.ConfigProperty)(),
    tslib_1.__metadata("design:type", Boolean)
], BenchmarksConfig.prototype, "bmScanDirectory", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)(),
    tslib_1.__metadata("design:type", Boolean)
], BenchmarksConfig.prototype, "bmSaveDirectory", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)(),
    tslib_1.__metadata("design:type", Boolean)
], BenchmarksConfig.prototype, "bmListDirectory", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)(),
    tslib_1.__metadata("design:type", Boolean)
], BenchmarksConfig.prototype, "bmListPersons", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)(),
    tslib_1.__metadata("design:type", Boolean)
], BenchmarksConfig.prototype, "bmAllSearch", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)(),
    tslib_1.__metadata("design:type", Boolean)
], BenchmarksConfig.prototype, "bmAutocomplete", void 0);
exports.BenchmarksConfig = BenchmarksConfig = tslib_1.__decorate([
    (0, common_1.SubConfigClass)({ softReadonly: true })
], BenchmarksConfig);
let PrivateConfigClass = class PrivateConfigClass {
    constructor() {
        this.path = '/app/data/images';
        this.system = '';
        this.RUNS = 50;
        this.Benchmarks = new BenchmarksConfig();
    }
};
exports.PrivateConfigClass = PrivateConfigClass;
tslib_1.__decorate([
    (0, common_1.ConfigProperty)({
        description: 'Images are loaded from this folder (read permission required)',
    }),
    tslib_1.__metadata("design:type", String)
], PrivateConfigClass.prototype, "path", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)({ description: 'Describe your system setup' }),
    tslib_1.__metadata("design:type", String)
], PrivateConfigClass.prototype, "system", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)({ description: 'Number of times to run the benchmark' }),
    tslib_1.__metadata("design:type", Number)
], PrivateConfigClass.prototype, "RUNS", void 0);
tslib_1.__decorate([
    (0, common_1.ConfigProperty)({ description: 'Enables / disables benchmarks' }),
    tslib_1.__metadata("design:type", BenchmarksConfig)
], PrivateConfigClass.prototype, "Benchmarks", void 0);
exports.PrivateConfigClass = PrivateConfigClass = tslib_1.__decorate([
    (0, node_1.ConfigClass)({
        configPath: path.join(__dirname, './../bm_config.json'),
        saveIfNotExist: true,
        attachDescription: true,
        enumsAsString: true,
        softReadonly: true,
        cli: {
            prefix: 'bm-config',
            enable: {
                configPath: true,
                attachState: true,
                attachDescription: true,
                rewriteCLIConfig: true,
                rewriteENVConfig: true,
                enumsAsString: true,
                saveIfNotExist: true,
                exitOnConfig: true,
            },
            defaults: {
                enabled: true,
            },
        },
    })
], PrivateConfigClass);
exports.BMConfig = node_1.ConfigClassBuilder.attachInterface(new PrivateConfigClass());
exports.BMConfig.loadSync();
//# sourceMappingURL=BMConfig.js.map