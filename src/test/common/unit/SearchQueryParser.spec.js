"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const SearchQueryDTO_1 = require("../../../src/common/entities/SearchQueryDTO");
const SearchQueryParser_1 = require("../../../src/common/SearchQueryParser");
describe('SearchQueryParser', () => {
    const check = (query) => {
        const parser = new SearchQueryParser_1.SearchQueryParser(SearchQueryParser_1.defaultQueryKeywords);
        (0, chai_1.expect)(parser.parse(parser.stringify(query))).to.deep.equals(query, parser.stringify(query));
    };
    describe('should serialize and deserialize', () => {
        it('Text search', () => {
            check({ type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'test' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person, value: 'person_test' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.directory, value: 'directory' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.directory, value: '2000.10.15 (Some event)' });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.directory,
                value: '2000.10.15 (Some event)',
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match
            });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.directory, value: '2000.10.15 (Some event) ' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.caption, value: 'caption' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.file_name, value: 'filename' });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.position,
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                value: 'New York'
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.position,
                matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                negate: true,
                value: 'New York'
            });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'test', negate: true });
        });
        it('Date search', () => {
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 10)) });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 1)) });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, max: (Date.UTC(2020, 1, 20)) });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, max: (Date.UTC(2020, 1, 1)) });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 1)), max: (Date.UTC(2020, 6, 9)) });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 1)), max: (Date.UTC(2020, 6, 9)), negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 1)), negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.date, max: (Date.UTC(2020, 1, 1)), negate: true });
            const parser = new SearchQueryParser_1.SearchQueryParser(SearchQueryParser_1.defaultQueryKeywords);
            let query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 4)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '>=' + '2020-02-04'))
                .to.deep.equals(query, parser.stringify(query));
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '>=' + '2020-2-4'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 1, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '>=' + (new Date(query.min)).getFullYear() + '-' + '02'))
                .to.deep.equals(query, parser.stringify(query));
            // test if date gets simplified on 1st of Jan.
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, max: (Date.UTC(2020, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '<=' + (new Date(query.max)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '>=' + (new Date(query.min)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)), max: (Date.UTC(2021, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + ':' + (new Date(query.min)).getFullYear() + '..' + (new Date(query.max)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)), max: (Date.UTC(2021, 0, 1)), negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '!:' + (new Date(query.min)).getFullYear() + '..' + (new Date(query.max)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '>=' + (new Date(query.min)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)), max: (Date.UTC(2020, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '=' + (new Date(query.min)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)), max: (Date.UTC(2020, 0, 1)), negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '!=' + (new Date(query.min)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, max: (Date.UTC(2020, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '<=' + (new Date(query.max)).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, max: (Date.UTC(2019, 11, 31)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '<' + (new Date(Date.UTC(2020, 0, 1))).getFullYear()))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.date, min: (Date.UTC(2020, 0, 1)) };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.date + '>' + '2019-12-31'))
                .to.deep.equals(query, parser.stringify(query));
        });
        it('Rating search', () => {
            const parser = new SearchQueryParser_1.SearchQueryParser(SearchQueryParser_1.defaultQueryKeywords);
            check({ type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 10 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.rating, max: 1 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 10, max: 144 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 10, negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.rating, max: 1, negate: true });
            let query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, max: 1 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '<=1'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 1 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '>=1'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 1, negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '!>=1'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 2 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '>1'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 2, max: 5 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + ':2..5'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 2, max: 2 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '=2'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 2, max: 2 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + ':2'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 2, max: 2, negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '!=2'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, max: 2 };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '<3'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, max: 2, negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '!<3'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 4, negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '!>3'))
                .to.deep.equals(query, parser.stringify(query));
            query = { type: SearchQueryDTO_1.SearchQueryTypes.rating, min: 4, negate: true };
            (0, chai_1.expect)(parser.parse(SearchQueryParser_1.defaultQueryKeywords.rating + '!>3'))
                .to.deep.equals(query, parser.stringify(query));
        });
        it('Person count search', () => {
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, min: 10 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, min: 3, max: 3 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, min: 3, max: 10 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, max: 1 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, min: 3, max: 3, negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, min: 3, max: 10, negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, min: 10, negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.person_count, max: 1, negate: true });
        });
        it('Resolution search', () => {
            check({ type: SearchQueryDTO_1.SearchQueryTypes.resolution, min: 10 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.resolution, max: 5 });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.resolution, min: 10, negate: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.resolution, max: 5, negate: true });
        });
        it('Distance search', () => {
            // Test location-based distance search
            check({ type: SearchQueryDTO_1.SearchQueryTypes.distance, distance: 10, from: { value: 'New York' } });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.distance, distance: 10, from: { value: 'New York' }, negate: true });
            // Test coordinate-based distance search
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.712776,
                        longitude: -74.005974
                    }
                }
            });
            // Test coordinate-based distance search with negation
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.712776,
                        longitude: -74.005974
                    }
                },
                negate: true
            });
            // Test parsing specific coordinate formats
            const parser = new SearchQueryParser_1.SearchQueryParser(SearchQueryParser_1.defaultQueryKeywords);
            // Test basic coordinate format
            (0, chai_1.expect)(parser.parse('5-km-from:(40.712776, -74.005974)')).to.deep.equals({
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.712776,
                        longitude: -74.005974
                    }
                }
            });
            // Test coordinate format with extra spaces
            (0, chai_1.expect)(parser.parse('5-km-from:(  40.712776  ,  -74.005974  )')).to.deep.equals({
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.712776,
                        longitude: -74.005974
                    }
                }
            });
            // Test coordinates with different decimal places
            (0, chai_1.expect)(parser.parse('5-km-from:(40.7, -74.1)')).to.deep.equals({
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.7,
                        longitude: -74.1
                    }
                }
            });
            // Test negated coordinate search
            (0, chai_1.expect)(parser.parse('5-km-from!:(40.712776, -74.005974)')).to.deep.equals({
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.712776,
                        longitude: -74.005974
                    }
                },
                negate: true
            });
            // Test stringification of coordinates
            const query = {
                type: SearchQueryDTO_1.SearchQueryTypes.distance,
                distance: 5,
                from: {
                    GPSData: {
                        latitude: 40.712776,
                        longitude: -74.005974
                    }
                }
            };
            (0, chai_1.expect)(parser.stringify(query)).to.equals('5-km-from:(40.712776, -74.005974)');
            // Test stringification of negated coordinates
            const negatedQuery = {
                ...query,
                negate: true
            };
            (0, chai_1.expect)(parser.stringify(negatedQuery)).to.equals('5-km-from!:(40.712776, -74.005974)');
        });
        it('OrientationSearch search', () => {
            check({ type: SearchQueryDTO_1.SearchQueryTypes.orientation, landscape: true });
            check({ type: SearchQueryDTO_1.SearchQueryTypes.orientation, landscape: false });
        });
        it('Date patter search', () => {
            for (let i = 0; i <= 10; ++i) {
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_week
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_month
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.every_year
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.days_ago,
                    agoNumber: 0
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.days_ago,
                    agoNumber: 1
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.weeks_ago,
                    agoNumber: 1
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.months_ago,
                    agoNumber: 1
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.years_ago,
                    agoNumber: 1
                });
                check({
                    type: SearchQueryDTO_1.SearchQueryTypes.date_pattern, daysLength: i,
                    frequency: SearchQueryDTO_1.DatePatternFrequency.years_ago,
                    agoNumber: 1,
                    negate: true
                });
            }
        });
        it('Default logical operator should be AND', () => {
            const parser = new SearchQueryParser_1.SearchQueryParser(SearchQueryParser_1.defaultQueryKeywords);
            (0, chai_1.expect)(parser.parse('a b')).to.deep.equals({
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'a' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.any_text, value: 'b' }
                ]
            });
        });
        it('And search', () => {
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.position,
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                        value: 'New York'
                    }
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.caption, value: 'caption' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.AND,
                list: [
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                        min: 2,
                        list: [
                            { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                            { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' },
                            { type: SearchQueryDTO_1.SearchQueryTypes.caption, value: 'caption test' }
                        ]
                    },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                ]
            });
        });
        it('Or search', () => {
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.OR,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.person, value: 'person_test' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                ]
            });
        });
        it('Some of search', () => {
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                list: [
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.keyword,
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                        value: 'big boom'
                    },
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.position,
                        matchType: SearchQueryDTO_1.TextSearchQueryMatchTypes.exact_match,
                        value: 'New York'
                    },
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                min: 2,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.caption, value: 'caption test' }
                ]
            });
            check({
                type: SearchQueryDTO_1.SearchQueryTypes.SOME_OF,
                min: 2,
                list: [
                    { type: SearchQueryDTO_1.SearchQueryTypes.keyword, value: 'big boom' },
                    { type: SearchQueryDTO_1.SearchQueryTypes.person, value: 'person_test' },
                    {
                        type: SearchQueryDTO_1.SearchQueryTypes.AND,
                        list: [
                            { type: SearchQueryDTO_1.SearchQueryTypes.caption, value: 'caption' },
                            { type: SearchQueryDTO_1.SearchQueryTypes.position, value: 'New York' }
                        ]
                    }
                ]
            });
        });
    });
});
//# sourceMappingURL=SearchQueryParser.spec.js.map