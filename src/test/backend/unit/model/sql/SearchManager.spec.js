"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LocationManager_1 = require("../../../../../src/backend/model/database/LocationManager");
const SearchManager_1 = require("../../../../../src/backend/model/database/SearchManager");
const Utils_1 = require("../../../../../src/common/Utils");
const DBTestHelper_1 = require("../../../DBTestHelper");
const SearchQueryDTO_1 = require("../../../../../src/common/entities/SearchQueryDTO");
const TestHelper_1 = require("../../../../TestHelper");
const ObjectManagers_1 = require("../../../../../src/backend/model/ObjectManagers");
const AutoCompleteItem_1 = require("../../../../../src/common/entities/AutoCompleteItem");
const Config_1 = require("../../../../../src/common/config/private/Config");
const SearchQueryParser_1 = require("../../../../../src/common/SearchQueryParser");
const SortingMethods_1 = require("../../../../../src/common/entities/SortingMethods");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepEqualInAnyOrder = require('deep-equal-in-any-order');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chai = require('chai');
chai.use(deepEqualInAnyOrder);
const { expect } = chai;
const tmpDescribe = describe;
describe = DBTestHelper_1.DBTestHelper.describe(); // fake it os IDE plays nicely (recognize the test)
class SearchManagerTest extends SearchManager_1.SearchManager {
    flattenSameOfQueries(query) {
        return super.flattenSameOfQueries(query);
    }
}
describe('SearchManager', (sqlHelper) => {
    describe = tmpDescribe;
    /**
     * dir  <-- root: '.'
     * |- v
     * |- p
     * |- p2
     * |- gpx
     * |-> subDir
     *     |- pFaceLess
     * |-> subDir2
     *     |- p4
     */
    let dir;
    let subDir;
    let subDir2;
    let v;
    let p;
    let p2;
    let pFaceLess;
    let p4;
    //  let p5: PhotoDTO;
    // let p6: PhotoDTO;
    let gpx;
    const setUpTestGallery = async () => {
        const directory = TestHelper_1.TestHelper.getDirectoryEntry();
        subDir = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'The Phantom Menace');
        subDir2 = TestHelper_1.TestHelper.getDirectoryEntry(directory, 'Return of the Jedi');
        p = TestHelper_1.TestHelper.getPhotoEntry1(directory);
        p.metadata.creationDate = Date.now();
        p.metadata.creationDateOffset = '+02:00';
        p2 = TestHelper_1.TestHelper.getPhotoEntry2(directory);
        p2.metadata.creationDate = Date.now() - 60 * 60 * 24 * 1000;
        p2.metadata.creationDateOffset = '+02:00';
        v = TestHelper_1.TestHelper.getVideoEntry1(directory);
        v.metadata.creationDate = Date.now() - 60 * 60 * 24 * 7 * 1000;
        v.metadata.creationDateOffset = '+02:00';
        gpx = TestHelper_1.TestHelper.getRandomizedGPXEntry(directory);
        p4 = TestHelper_1.TestHelper.getPhotoEntry4(subDir2);
        let d = new Date();
        //set creation date to one year and one day earlier
        p4.metadata.creationDate = d.getTime() - 60 * 60 * 24 * (Utils_1.Utils.isDateFromLeapYear(d) ? 367 : 366) * 1000;
        p4.metadata.creationDateOffset = '+02:00';
        const pFaceLessTmp = TestHelper_1.TestHelper.getPhotoEntry3(subDir);
        delete pFaceLessTmp.metadata.faces;
        d = new Date();
        //we create a date 1 month and 1 day before now
        d = Utils_1.Utils.addMonthToDate(d, -1); //subtract 1 month in the "human way"
        d.setDate(d.getDate() - 1); //subtract 1 day
        pFaceLessTmp.metadata.creationDate = d.getTime();
        pFaceLessTmp.metadata.creationDateOffset = '+02:00';
        dir = await DBTestHelper_1.DBTestHelper.persistTestDir(directory);
        subDir = dir.directories[0];
        subDir2 = dir.directories[1];
        p = dir.media.filter(m => m.name === p.name)[0];
        p.directory = dir;
        p2 = dir.media.filter(m => m.name === p2.name)[0];
        p2.directory = dir;
        gpx = dir.metaFile[0];
        gpx.directory = dir;
        v = dir.media.filter(m => m.name === v.name)[0];
        v.directory = dir;
        p4 = dir.directories[1].media[0];
        p4.directory = dir.directories[1];
        pFaceLess = dir.directories[0].media[0];
        pFaceLess.directory = dir.directories[0];
    };
    const setUpSqlDB = async () => {
        await sqlHelper.initDB();
        await setUpTestGallery();
        await ObjectManagers_1.ObjectManagers.getInstance().init();
    };
    before(async () => {
        await setUpSqlDB();
    });
    after(async () => {
        await sqlHelper.clearDB();
    });
    beforeEach(() => {
        Config_1.Config.loadSync();
        Config_1.Config.Search.listDirectories = true;
        Config_1.Config.Search.listMetafiles = false;
    });
    it('should get autocomplete', async () => {
        const sm = new SearchManager_1.SearchManager();
        const cmp = (a, b) => {
            if (a.value === b.value) {
                return a.type - b.type;
            }
            return a.value.localeCompare(b.value);
        };
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'tat', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('Tatooine', SearchQueryDTO_1.SearchQueryTypes.position)
        ]);
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'star', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('star wars', SearchQueryDTO_1.SearchQueryTypes.keyword),
            new AutoCompleteItem_1.AutoCompleteItem('death star', SearchQueryDTO_1.SearchQueryTypes.keyword)
        ]);
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'wars', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('star wars', SearchQueryDTO_1.SearchQueryTypes.keyword)
        ]);
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'phantom', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('phantom menace', SearchQueryDTO_1.SearchQueryTypes.keyword),
            new AutoCompleteItem_1.AutoCompleteItem('The Phantom Menace', SearchQueryDTO_1.SearchQueryTypes.directory)
        ]);
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'arch', SearchQueryDTO_1.SearchQueryTypes.any_text))).eql([
            new AutoCompleteItem_1.AutoCompleteItem('Research City', SearchQueryDTO_1.SearchQueryTypes.position)
        ]);
        Config_1.Config.Search.AutoComplete.ItemsPerCategory.maxItems = 99999;
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'wa', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('star wars', SearchQueryDTO_1.SearchQueryTypes.keyword),
            new AutoCompleteItem_1.AutoCompleteItem('Anakin Skywalker', SearchQueryDTO_1.SearchQueryTypes.person),
            new AutoCompleteItem_1.AutoCompleteItem('Luke Skywalker', SearchQueryDTO_1.SearchQueryTypes.person)
        ]);
        Config_1.Config.Search.AutoComplete.ItemsPerCategory.maxItems = 1;
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'a', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('Anakin Skywalker', SearchQueryDTO_1.SearchQueryTypes.person),
            new AutoCompleteItem_1.AutoCompleteItem('Amber stone', SearchQueryDTO_1.SearchQueryTypes.caption),
            new AutoCompleteItem_1.AutoCompleteItem('Castilon', SearchQueryDTO_1.SearchQueryTypes.position),
            new AutoCompleteItem_1.AutoCompleteItem('star wars', SearchQueryDTO_1.SearchQueryTypes.keyword),
            new AutoCompleteItem_1.AutoCompleteItem('The Phantom Menace', SearchQueryDTO_1.SearchQueryTypes.directory)
        ]);
        Config_1.Config.Search.AutoComplete.ItemsPerCategory.maxItems = 5;
        Config_1.Config.Search.AutoComplete.ItemsPerCategory.fileName = 5;
        Config_1.Config.Search.AutoComplete.ItemsPerCategory.fileName = 5;
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'sw', SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([
            new AutoCompleteItem_1.AutoCompleteItem('sw1.jpg', SearchQueryDTO_1.SearchQueryTypes.file_name),
            new AutoCompleteItem_1.AutoCompleteItem('sw2.jpg', SearchQueryDTO_1.SearchQueryTypes.file_name),
            new AutoCompleteItem_1.AutoCompleteItem('sw3.jpg', SearchQueryDTO_1.SearchQueryTypes.file_name),
            new AutoCompleteItem_1.AutoCompleteItem('sw4.jpg', SearchQueryDTO_1.SearchQueryTypes.file_name),
            new AutoCompleteItem_1.AutoCompleteItem(v.name, SearchQueryDTO_1.SearchQueryTypes.file_name)
        ]);
        expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, v.name, SearchQueryDTO_1.SearchQueryTypes.any_text))).to.deep.equalInAnyOrder([new AutoCompleteItem_1.AutoCompleteItem(v.name, SearchQueryDTO_1.SearchQueryTypes.file_name)]);
    });
    const searchifyMedia = (m) => {
        const tmpDir = m.directory;
        const tmpM = tmpDir.media;
        const tmpD = tmpDir.directories;
        const tmpP = tmpDir.cache?.cover;
        const tmpMT = tmpDir.metaFile;
        delete tmpDir.directories;
        delete tmpDir.media;
        delete tmpDir.cache?.cover;
        delete tmpDir.cache?.valid;
        delete tmpDir.metaFile;
        const ret = Utils_1.Utils.clone(m);
        delete ret.directory.lastScanned;
        delete ret.directory.lastModified;
        delete ret.directory.cache;
        if (ret.metadata &&
            ret.metadata.faces && !ret.metadata.faces.length) {
            delete ret.metadata.faces;
        }
        tmpDir.directories = tmpD;
        tmpDir.media = tmpM;
        if (tmpDir.cache) {
            tmpDir.cache.cover = tmpP;
        }
        tmpDir.metaFile = tmpMT;
        return ret;
    };
    const searchifyDir = (d) => {
        const tmpM = d.media;
        const tmpD = d.directories;
        const tmpP = d.cache.cover;
        const tmpMT = d.metaFile;
        delete d.directories;
        delete d.media;
        delete d.metaFile;
        const ret = Utils_1.Utils.clone(d);
        delete ret.cache?.id;
        d.directories = tmpD;
        d.media = tmpM;
        d.cache.cover = tmpP;
        d.metaFile = tmpMT;
        ret.isPartial = true;
        return ret;
    };
    const removeDir = (result) => {
        result.media = result.media.map(m => searchifyMedia(m));
        result.metaFile = result.metaFile.map(m => searchifyMedia(m));
        result.directories = result.directories.map(m => searchifyDir(m));
        return Utils_1.Utils.clone(result);
    };
    describe('projectionQuery (session scoped filter)', () => {
        it('getCount should respect projectionQuery', async () => {
            const sm = new SearchManager_1.SearchManager();
            const projQ = {
                value: 'wookiees',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                type: SearchQueryDTO_1.SearchQueryTypes.keyword
            };
            const session = Utils_1.Utils.clone(DBTestHelper_1.DBTestHelper.defaultSession);
            session.projectionQuery = await sm.prepareAndBuildWhereQuery(projQ);
            const searchQ = { value: 'star wars', matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match, type: SearchQueryDTO_1.SearchQueryTypes.keyword };
            // validate projection less count
            expect(await sm.getCount(DBTestHelper_1.DBTestHelper.defaultSession, projQ)).to.equal(1);
            expect(await sm.getCount(DBTestHelper_1.DBTestHelper.defaultSession, searchQ)).to.equal(4);
            // test
            expect(await sm.getCount(session, searchQ)).to.equal(1);
        });
        it('getNMedia should respect projectionQuery', async () => {
            const sm = new SearchManager_1.SearchManager();
            const projQ = {
                value: 'wookiees',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                type: SearchQueryDTO_1.SearchQueryTypes.keyword
            };
            const session = Utils_1.Utils.clone(DBTestHelper_1.DBTestHelper.defaultSession);
            session.projectionQuery = await sm.prepareAndBuildWhereQuery(projQ);
            const searchQ = { value: 'star wars', matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match, type: SearchQueryDTO_1.SearchQueryTypes.keyword };
            const media = await sm.getNMedia(session, searchQ, [{
                    method: SortingMethods_1.SortByTypes.Random,
                    ascending: null
                }], 10, true);
            expect(Utils_1.Utils.clone(media)).to.deep.equalInAnyOrder([searchifyMedia(pFaceLess)]);
        });
        describe('autocomplete', () => {
            beforeEach(() => Config_1.Config.loadSync());
            it('autocomplete should respect projectionQuery', async () => {
                const sm = new SearchManager_1.SearchManager();
                const projQ = {
                    value: 'wookiees',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    overrideAllowBlockList: true,
                    allowQuery: projQ
                });
                // validate projection less count
                expect((await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'phantom', SearchQueryDTO_1.SearchQueryTypes.any_text)).length).to.equal(2);
                // test
                expect((await sm.autocomplete(session, 'star', SearchQueryDTO_1.SearchQueryTypes.any_text)).length).to.equal(1);
                expect(await sm.autocomplete(session, 'star', SearchQueryDTO_1.SearchQueryTypes.any_text)).to.deep.equal([{
                        value: 'star wars',
                        type: SearchQueryDTO_1.SearchQueryTypes.keyword,
                    }]);
            });
            it('autocomplete should apply directory projection to directory suggestions', async () => {
                const sm = new SearchManager_1.SearchManager();
                const projQ = {
                    value: 'The Phantom Menace',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    overrideAllowBlockList: true,
                    allowQuery: projQ
                });
                // Without projection, searching 'Return' yields the directory suggestion
                expect(await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'Return', SearchQueryDTO_1.SearchQueryTypes.directory))
                    .to.deep.equalInAnyOrder([new AutoCompleteItem_1.AutoCompleteItem('Return of the Jedi', SearchQueryDTO_1.SearchQueryTypes.directory)]);
                // With projection to a different directory, expect no directory suggestion (should be filtered out)
                expect(await sm.autocomplete(session, 'Return', SearchQueryDTO_1.SearchQueryTypes.directory))
                    .to.deep.equalInAnyOrder([]);
                expect(await sm.autocomplete(session, 'Phantom', SearchQueryDTO_1.SearchQueryTypes.directory))
                    .to.deep.equalInAnyOrder([new AutoCompleteItem_1.AutoCompleteItem('The Phantom Menace', SearchQueryDTO_1.SearchQueryTypes.directory)]);
            });
            it('autocomplete should apply directory projection to keyword suggestions', async () => {
                const sm = new SearchManager_1.SearchManager();
                const projQ = {
                    value: 'The Phantom Menace',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    overrideAllowBlockList: true,
                    allowQuery: projQ
                });
                // Without projection, searching 'Return' yields the directory suggestion
                expect(await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'Natalie', SearchQueryDTO_1.SearchQueryTypes.keyword))
                    .to.deep.equalInAnyOrder([new AutoCompleteItem_1.AutoCompleteItem('Natalie Portman', SearchQueryDTO_1.SearchQueryTypes.keyword)]);
                // With projection to a different directory, expect no directory suggestion (should be filtered out)
                expect(await sm.autocomplete(session, 'Natalie', SearchQueryDTO_1.SearchQueryTypes.keyword))
                    .to.deep.equalInAnyOrder([]);
            });
            it('autocomplete should apply keyword projection to file_name suggestions', async () => {
                const sm = new SearchManager_1.SearchManager();
                // Project to photos with keyword "wookiees" which earlier narrowed results to pFaceLess
                const projQ = {
                    value: 'wookiees',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    overrideAllowBlockList: true,
                    allowQuery: projQ
                });
                // Without projection, many sw*.jpg are returned for 'sw'
                const noProj = await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'sw', SearchQueryDTO_1.SearchQueryTypes.file_name);
                expect(noProj.length).to.be.greaterThan(1);
                // With projection, expect only the single media file name from the projected set
                const withProj = await sm.autocomplete(session, 'sw', SearchQueryDTO_1.SearchQueryTypes.file_name);
                expect(withProj).to.deep.equalInAnyOrder([
                    new AutoCompleteItem_1.AutoCompleteItem(pFaceLess.name, SearchQueryDTO_1.SearchQueryTypes.file_name)
                ]);
            });
            it('autocomplete should apply projection to person suggestions', async () => {
                const sm = new SearchManager_1.SearchManager();
                // Project to photos with "Boba Fett" person, which should include only p (sw1.jpg)
                // p contains: Boba Fett, Luke Skywalker, Han Solo, Unkle Ben, R2-D2
                const projQ = {
                    value: 'Boba Fett',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.person
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    overrideAllowBlockList: true,
                    allowQuery: projQ
                });
                // Without projection, searching 'a' should return multiple people
                const noProj = await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'a', SearchQueryDTO_1.SearchQueryTypes.person);
                expect(noProj.length).to.be.greaterThan(2); // Should include Anakin Skywalker from p2 and p4
                // With projection to Boba Fett photos, expect only people from that photo set
                // 'a' should match Han Solo (from p/sw1.jpg) but not Anakin Skywalker (from p2/p4)
                Config_1.Config.Search.AutoComplete.ItemsPerCategory.person = 999;
                Config_1.Config.Search.AutoComplete.ItemsPerCategory.maxItems = 999;
                const withProj = await sm.autocomplete(session, 'a', SearchQueryDTO_1.SearchQueryTypes.person);
                expect(withProj).to.deep.equalInAnyOrder([
                    new AutoCompleteItem_1.AutoCompleteItem('Boba Fett', SearchQueryDTO_1.SearchQueryTypes.person),
                    new AutoCompleteItem_1.AutoCompleteItem('Anakin Skywalker', SearchQueryDTO_1.SearchQueryTypes.person),
                    new AutoCompleteItem_1.AutoCompleteItem('Luke Skywalker', SearchQueryDTO_1.SearchQueryTypes.person),
                    new AutoCompleteItem_1.AutoCompleteItem('Han Solo', SearchQueryDTO_1.SearchQueryTypes.person)
                ]);
            });
            it('autocomplete should filter out persons with count=0 when projection is applied', async () => {
                const sm = new SearchManager_1.SearchManager();
                // Project to photos with keyword "wookiees" which only matches pFaceLess (sw3.jpg)
                // but pFaceLess has no faces, so all persons should have count=0
                const projQ = {
                    value: 'wookiees',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                    overrideAllowBlockList: true,
                    allowQuery: projQ
                });
                // Without projection, should return people matching the search term
                const noProj = await sm.autocomplete(DBTestHelper_1.DBTestHelper.defaultSession, 'skywalker', SearchQueryDTO_1.SearchQueryTypes.person);
                expect(noProj.length).to.be.equal(2); // Should find Luke and Anakin Skywalker
                // With projection to photos with no faces, expect no person suggestions (all have count=0)
                const withProj = await sm.autocomplete(session, 'skywalker', SearchQueryDTO_1.SearchQueryTypes.person);
                expect(withProj).to.deep.equalInAnyOrder([]);
                // Test with a broader search term
                const withProjBroad = await sm.autocomplete(session, 'a', SearchQueryDTO_1.SearchQueryTypes.person);
                expect(withProjBroad).to.deep.equalInAnyOrder([]);
            });
        });
        it('search should respect projectionQuery', async () => {
            const sm = new SearchManager_1.SearchManager();
            const projQ = {
                value: 'wookiees',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                type: SearchQueryDTO_1.SearchQueryTypes.keyword
            };
            const session = Utils_1.Utils.clone(DBTestHelper_1.DBTestHelper.defaultSession);
            session.projectionQuery = await sm.prepareAndBuildWhereQuery(projQ);
            const searchQ = { value: 'star wars', matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match, type: SearchQueryDTO_1.SearchQueryTypes.keyword };
            Config_1.Config.Search.listDirectories = false;
            Config_1.Config.Search.listMetafiles = false;
            const result = await sm.search(session, searchQ);
            expect(removeDir(result)).to.deep.equalInAnyOrder(removeDir({
                searchQuery: searchQ,
                directories: [],
                media: [pFaceLess],
                metaFile: [],
                resultOverflow: false
            }));
        });
    });
    describe('advanced search', () => {
        beforeEach(async () => {
            Config_1.Config.loadSync();
            Config_1.Config.Search.listDirectories = false;
            Config_1.Config.Search.listMetafiles = false;
        });
        it('should AND', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = {
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [{ value: p.metadata.faces[0].name, type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: p2.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [{ value: p.metadata.faces[0].name, type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: p.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }]
            };
            expect(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
            // make sure that this shows both photos. We need this the the rest of the tests
            query = { value: 'a', type: SearchQueryDTO_1.SearchQueryTypes.person };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [{
                        type: SearchQueryDTO_1.SearchQueryTypes.AND,
                        list: [{ value: 'a', type: SearchQueryDTO_1.SearchQueryTypes.person },
                            { value: p.metadata.keywords[0], type: SearchQueryDTO_1.SearchQueryTypes.keyword }]
                    },
                    { value: p.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }
                ]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should OR', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = {
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [{ value: 'Not a person', type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: 'Not a caption', type: SearchQueryDTO_1.SearchQueryTypes.caption }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [{ value: p.metadata.faces[0].name, type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: p2.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [{ value: p.metadata.faces[0].name, type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: p.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
            // make sure that this shows both photos. We need this the the rest of the tests
            query = { value: 'a', type: SearchQueryDTO_1.SearchQueryTypes.person };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [{
                        type: SearchQueryDTO_1.SearchQueryTypes.OR,
                        list: [{ value: 'a', type: SearchQueryDTO_1.SearchQueryTypes.person },
                            { value: p.metadata.keywords[0], type: SearchQueryDTO_1.SearchQueryTypes.keyword }]
                    },
                    { value: p.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }
                ]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [{
                        type: SearchQueryDTO_1.SearchQueryTypes.OR,
                        list: [{ value: p.metadata.keywords[0], type: SearchQueryDTO_1.SearchQueryTypes.keyword },
                            { value: p2.metadata.keywords[0], type: SearchQueryDTO_1.SearchQueryTypes.keyword }]
                    },
                    { value: pFaceLess.metadata.caption, type: SearchQueryDTO_1.SearchQueryTypes.caption }
                ]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, pFaceLess],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should minimum of', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = {
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                list: [{ value: 'jpg', type: SearchQueryDTO_1.SearchQueryTypes.file_name },
                    { value: 'mp4', type: SearchQueryDTO_1.SearchQueryTypes.file_name }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, pFaceLess, p4, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                list: [{ value: 'R2', type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: 'Anakin', type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: 'Luke', type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: 'Non-Existing', type: SearchQueryDTO_1.SearchQueryTypes.person }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query.min = 2;
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query.min = 3;
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
            query.min = 4;
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                min: 3,
                list: [{ value: 'sw', type: SearchQueryDTO_1.SearchQueryTypes.file_name },
                    { value: 'R2', type: SearchQueryDTO_1.SearchQueryTypes.person },
                    { value: 'Kamino', type: SearchQueryDTO_1.SearchQueryTypes.position },
                    { value: 'Han', type: SearchQueryDTO_1.SearchQueryTypes.person }]
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should search date', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = { max: 0, type: SearchQueryDTO_1.SearchQueryTypes.date };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                min: p2.metadata.creationDate, type: SearchQueryDTO_1.SearchQueryTypes.date
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                min: p.metadata.creationDate,
                negate: true,
                type: SearchQueryDTO_1.SearchQueryTypes.date
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p2, pFaceLess, p4, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                max: p.metadata.creationDate + 1000000000,
                type: SearchQueryDTO_1.SearchQueryTypes.date
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, pFaceLess, v, p4],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should search rating', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = { max: 0, type: SearchQueryDTO_1.SearchQueryTypes.rating };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 5, type: SearchQueryDTO_1.SearchQueryTypes.rating };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, pFaceLess],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 5, negate: true, type: SearchQueryDTO_1.SearchQueryTypes.rating };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 2, type: SearchQueryDTO_1.SearchQueryTypes.rating };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p2, pFaceLess],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 2, negate: true, type: SearchQueryDTO_1.SearchQueryTypes.rating };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should search person count', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = { max: 0, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [pFaceLess, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 20, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, pFaceLess, p4, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 20, negate: true, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 4, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p2, p4, pFaceLess, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 2, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 5, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 2, negate: true, type: SearchQueryDTO_1.SearchQueryTypes.person_count };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [v, pFaceLess],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should search resolution', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = { max: 0, type: SearchQueryDTO_1.SearchQueryTypes.resolution };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 1, type: SearchQueryDTO_1.SearchQueryTypes.resolution };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 3, type: SearchQueryDTO_1.SearchQueryTypes.resolution };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = { min: 3, negate: true, type: SearchQueryDTO_1.SearchQueryTypes.resolution };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, pFaceLess, v],
                metaFile: [],
                resultOverflow: false
            }));
            query = { max: 3, negate: true, type: SearchQueryDTO_1.SearchQueryTypes.resolution };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p4],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should search orientation', async () => {
            const sm = new SearchManager_1.SearchManager();
            let query = {
                landscape: false,
                type: SearchQueryDTO_1.SearchQueryTypes.orientation
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                landscape: true,
                type: SearchQueryDTO_1.SearchQueryTypes.orientation
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, pFaceLess, v],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('should search distance', async () => {
            ObjectManagers_1.ObjectManagers.getInstance().LocationManager = new LocationManager_1.LocationManager();
            const sm = new SearchManager_1.SearchManager();
            ObjectManagers_1.ObjectManagers.getInstance().LocationManager.getGPSData = async () => {
                return {
                    longitude: 10,
                    latitude: 10
                };
            };
            let query = {
                from: { value: 'Tatooine' },
                distance: 1,
                type: SearchQueryDTO_1.SearchQueryTypes.distance
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                from: { GPSData: { latitude: 0, longitude: 0 } },
                distance: 112 * 10, // number of km per degree = ~111km
                type: SearchQueryDTO_1.SearchQueryTypes.distance
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                from: { GPSData: { latitude: 0, longitude: 0 } },
                distance: 112 * 10, // number of km per degree = ~111km
                negate: true,
                type: SearchQueryDTO_1.SearchQueryTypes.distance
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [pFaceLess, p4],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                from: { GPSData: { latitude: 10, longitude: 10 } },
                distance: 1,
                type: SearchQueryDTO_1.SearchQueryTypes.distance
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                from: { GPSData: { latitude: 10, longitude: 10 } },
                distance: 112 * 5, // number of km per degree = ~111km
                type: SearchQueryDTO_1.SearchQueryTypes.distance
            };
            expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, pFaceLess, p4],
                metaFile: [],
                resultOverflow: false
            }));
        });
        /**
         * flattenSameOfQueries  converts some-of queries to AND and OR queries
         * E.g.:
         * 2-of:(A B C) to (A and (B or C)) or (B and C)
         * this tests makes sure that all queries has at least 2 constraints
         */
        it('should flatter SOME_OF query', () => {
            const sm = new SearchManagerTest();
            const parser = new SearchQueryParser_1.SearchQueryParser();
            const alphabet = 'abcdefghijklmnopqrs';
            const shortestDepth = (q) => {
                let depth = 0;
                if (q.list) {
                    if (q.type === SearchQueryDTO_1.SearchQueryTypes.AND) {
                        for (const l of q.list) {
                            depth += shortestDepth(l);
                        }
                        return depth;
                    }
                    // it's an OR
                    const lengths = q.list.map(l => shortestDepth(l)).sort();
                    return lengths[0];
                }
                return 1;
            };
            const checkBoolLogic = (q) => {
                if (q.list) {
                    expect(q.list).to.not.equal(1);
                    for (const l of q.list) {
                        checkBoolLogic(l);
                    }
                }
            };
            // eslint-disable-next-line @typescript-eslint/prefer-for-of
            for (let i = 1; i < alphabet.length / 2; ++i) {
                const query = {
                    type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                    min: i,
                    //
                    list: alphabet.split('').map(t => ({
                        type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                        value: t
                    }))
                };
                const q = sm.flattenSameOfQueries(query);
                expect(shortestDepth(q)).to.equal(i, parser.stringify(query) + '\n' + parser.stringify(q));
                checkBoolLogic(q);
            }
        }).timeout(20000);
        it('should execute complex SOME_OF query', async () => {
            const sm = new SearchManager_1.SearchManager();
            const query = {
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                min: 5,
                //
                list: 'abcdefghijklmnopqrstu'.split('').map(t => ({
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name,
                    value: t
                }))
            };
            expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [v],
                metaFile: [],
                resultOverflow: false
            }));
        }).timeout(40000);
        it('search result should return directory', async () => {
            Config_1.Config.Search.listDirectories = true;
            const sm = new SearchManager_1.SearchManager();
            const cloned = Utils_1.Utils.clone(searchifyDir(subDir));
            cloned.cache.valid = true;
            cloned.cache.cover = {
                directory: {
                    name: subDir.name,
                    path: subDir.path
                },
                name: pFaceLess.name
            };
            const query = {
                value: subDir.name,
                type: SearchQueryDTO_1.SearchQueryTypes.any_text
            };
            expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [cloned],
                media: [pFaceLess],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('search result should not return recursively empty directory', async () => {
            Config_1.Config.Search.listDirectories = true;
            const sm = new SearchManager_1.SearchManager();
            const session = await ObjectManagers_1.ObjectManagers.getInstance().SessionManager.buildContext({
                allowQuery: { value: 'YOU WONT FIND IT', type: SearchQueryDTO_1.SearchQueryTypes.keyword },
                overrideAllowBlockList: true
            });
            let query = {
                value: subDir.name,
                type: SearchQueryDTO_1.SearchQueryTypes.any_text
            };
            expect(removeDir(await sm.search(session, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
            query = {
                value: dir.name,
                type: SearchQueryDTO_1.SearchQueryTypes.any_text
            };
            expect(removeDir(await sm.search(session, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [],
                metaFile: [],
                resultOverflow: false
            }));
        });
        it('search result should return meta files', async () => {
            Config_1.Config.Search.listMetafiles = true;
            const sm = new SearchManager_1.SearchManager();
            const query = {
                value: dir.name,
                type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            };
            expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                .to.deep.equalInAnyOrder(removeDir({
                searchQuery: query,
                directories: [],
                media: [p, p2, v],
                metaFile: [gpx],
                resultOverflow: false
            }));
        });
        describe('should search text', () => {
            it('as any', async () => {
                const sm = new SearchManager_1.SearchManager();
                let query = { value: 'sw', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, { value: 'sw', type: SearchQueryDTO_1.SearchQueryTypes.any_text })))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, pFaceLess, v, p4],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = { value: 'sw', negate: true, type: SearchQueryDTO_1.SearchQueryTypes.any_text };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = { value: 'Boba', type: SearchQueryDTO_1.SearchQueryTypes.any_text };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = { value: 'Boba', negate: true, type: SearchQueryDTO_1.SearchQueryTypes.any_text };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p2, pFaceLess, p4],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = { value: 'Boba', negate: true, type: SearchQueryDTO_1.SearchQueryTypes.any_text };
                // all should have faces
                const sRet = await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query);
                for (const item of sRet.media) {
                    if (item.id === pFaceLess.id) {
                        continue;
                    }
                    expect(item.metadata.faces).to.be.not.an('undefined');
                    expect(item.metadata.faces).to.be.lengthOf.above(1);
                }
                query = {
                    value: 'Boba',
                    type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = {
                    value: 'Boba Fett',
                    type: SearchQueryDTO_1.SearchQueryTypes.any_text,
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
            });
            it('as position', async () => {
                const sm = new SearchManager_1.SearchManager();
                const query = { value: 'Tatooine', type: SearchQueryDTO_1.SearchQueryTypes.position };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('as keyword', async () => {
                const sm = new SearchManager_1.SearchManager();
                let query = {
                    value: 'kie',
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p2, pFaceLess],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'wa',
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, pFaceLess, p4],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'han s',
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'star wars',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, pFaceLess, p4],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'wookiees',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.keyword
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [pFaceLess],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('as caption', async () => {
                const sm = new SearchManager_1.SearchManager();
                const query = {
                    value: 'han',
                    type: SearchQueryDTO_1.SearchQueryTypes.caption
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('as file_name', async () => {
                const sm = new SearchManager_1.SearchManager();
                let query = {
                    value: 'sw',
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, pFaceLess, v, p4],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'sw4',
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, {
                    value: 'sw4',
                    type: SearchQueryDTO_1.SearchQueryTypes.file_name
                }))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p4],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('as directory', async () => {
                const sm = new SearchManager_1.SearchManager();
                let query = {
                    value: 'of the J',
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p4],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = {
                    value: '.',
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, v, pFaceLess, p4],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = {
                    value: '.',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, v],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = {
                    value: '/Return of the Jedi',
                    //    matchType: TextSearchQueryMatchTypes.like,
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p4],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
                query = {
                    value: '/Return of the Jedi',
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                    type: SearchQueryDTO_1.SearchQueryTypes.directory
                };
                expect(removeDir(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p4],
                    metaFile: [],
                    resultOverflow: false
                }), JSON.stringify(query));
            });
            it('as person', async () => {
                const sm = new SearchManager_1.SearchManager();
                let query = {
                    value: 'Boba',
                    type: SearchQueryDTO_1.SearchQueryTypes.person
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'Boba',
                    type: SearchQueryDTO_1.SearchQueryTypes.person,
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    value: 'Boba Fett',
                    type: SearchQueryDTO_1.SearchQueryTypes.person,
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, {
                    value: 'Boba Fett',
                    type: SearchQueryDTO_1.SearchQueryTypes.person,
                    matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
                }))).to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
        });
        describe('search date pattern', () => {
            let p5;
            let p6;
            let p7;
            let sm;
            before(async () => {
                Config_1.Config.loadSync();
                await sqlHelper.clearDB();
                await setUpSqlDB();
                p5 = TestHelper_1.TestHelper.getBasePhotoEntry(subDir2, 'p5-23h-ago.jpg');
                p5.metadata.creationDate = Date.now() - 60 * 60 * 24 * 1000 - 1000;
                //p5.metadata.creationDateOffset = "+02:00";
                p6 = TestHelper_1.TestHelper.getBasePhotoEntry(subDir2, 'p6-300d-ago.jpg');
                p6.metadata.creationDate = Date.now() - 60 * 60 * 24 * 300 * 1000;
                //p6.metadata.creationDateOffset = "+02:00";
                p7 = TestHelper_1.TestHelper.getBasePhotoEntry(subDir2, 'p7-1y-1min-ago.jpg');
                const d = new Date();
                d.setUTCFullYear(d.getUTCFullYear() - 1);
                d.setUTCMinutes(d.getUTCMinutes() - 1);
                p7.metadata.creationDate = d.getTime();
                //p7.metadata.creationDateOffset = "+02:00";
                subDir2 = await DBTestHelper_1.DBTestHelper.persistTestDir(subDir2);
                p4 = subDir2.media[0];
                p4.directory = subDir2;
                p5 = subDir2.media[1];
                p5.directory = subDir2;
                p6 = subDir2.media[2];
                p6.directory = subDir2;
                p7 = subDir2.media[3];
                p7.directory = subDir2;
                Config_1.Config.Search.listDirectories = false;
                Config_1.Config.Search.listMetafiles = false;
                sm = new SearchManager_1.SearchManager();
            });
            //TODO: this is flaky test for mysql
            it('last-0-days:every-year', async () => {
                let query = {
                    daysLength: 0,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 0,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p2, p4, pFaceLess, v, p5, p6],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            //TODO: this is flaky test for mysql
            it('last-1-days:every-year', async () => {
                let query = {
                    daysLength: 1,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 1,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p2, p4, pFaceLess, v, p5, p6],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-2-days:every-year', async () => {
                let query = {
                    daysLength: 2,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, p4, p5, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 2,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [v, pFaceLess, p6],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-1-days:10-days-ago', async () => {
                let query = {
                    daysLength: 1,
                    agoNumber: 10,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.days_ago,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 1,
                    agoNumber: 10,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.days_ago,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, p4, pFaceLess, v, p5, p6, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-3-days:1-month-ago', async () => {
                let query = {
                    daysLength: 3,
                    agoNumber: 1,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.months_ago,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [pFaceLess],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 3,
                    agoNumber: 1,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.months_ago,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, p4, v, p5, p6, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-3-days:12-month-ago', async () => {
                let query = {
                    daysLength: 3,
                    agoNumber: 12,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.months_ago,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p4, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 3,
                    agoNumber: 12,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.months_ago,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, v, p5, p6, pFaceLess],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-366-days:every-year', async () => {
                let query = {
                    daysLength: 366,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, p4, pFaceLess, v, p5, p6, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 366,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-32-days:every-month', async () => {
                const query = {
                    daysLength: 32,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_month,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, p4, pFaceLess, v, p5, p6, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
            it('last-364-days:every-year', async () => {
                let query = {
                    daysLength: 364,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [p, p2, p4, pFaceLess, v, p5, p6, p7],
                    metaFile: [],
                    resultOverflow: false
                }));
                query = {
                    daysLength: 364,
                    negate: true,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year,
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern
                };
                expect(Utils_1.Utils.clone(await sm.search(DBTestHelper_1.DBTestHelper.defaultSession, query)))
                    .to.deep.equalInAnyOrder(removeDir({
                    searchQuery: query,
                    directories: [],
                    media: [],
                    metaFile: [],
                    resultOverflow: false
                }));
            });
        });
    });
    it('should get random photo', async () => {
        const sm = new SearchManager_1.SearchManager();
        let query = {
            value: 'xyz',
            type: SearchQueryDTO_1.SearchQueryTypes.keyword
        };
        // eslint-disable-next-line
        expect(await sm.getNMedia(DBTestHelper_1.DBTestHelper.defaultSession, query, [{
                method: SortingMethods_1.SortByTypes.Random,
                ascending: null
            }], 1, true)).to.deep.equalInAnyOrder([]);
        query = {
            value: 'wookiees',
            matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
            type: SearchQueryDTO_1.SearchQueryTypes.keyword
        };
        expect(Utils_1.Utils.clone(await sm.getNMedia(DBTestHelper_1.DBTestHelper.defaultSession, query, [{
                method: SortingMethods_1.SortByTypes.Random,
                ascending: null
            }], 1, true))).to.deep.equalInAnyOrder([searchifyMedia(pFaceLess)]);
    });
});
//# sourceMappingURL=SearchManager.spec.js.map