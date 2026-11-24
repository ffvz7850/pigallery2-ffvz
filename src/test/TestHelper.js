"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHelper = void 0;
const MediaEntity_1 = require("../src/backend/model/database/enitites/MediaEntity");
const PhotoEntity_1 = require("../src/backend/model/database/enitites/PhotoEntity");
const DirectoryEntity_1 = require("../src/backend/model/database/enitites/DirectoryEntity");
const VideoEntity_1 = require("../src/backend/model/database/enitites/VideoEntity");
const DiskManager_1 = require("../src/backend/model/fileaccess/DiskManager");
const path = require("path");
const Config_1 = require("../src/common/config/private/Config");
const SortingMethods_1 = require("../src/common/entities/SortingMethods");
class TestHelper {
    static { this.creationCounter = 0; }
    static { this.TMP_DIR = path.join(__dirname, './tmp'); }
    static getDirectoryEntry(parent = null, name = '.') {
        const dir = new DirectoryEntity_1.DirectoryEntity();
        dir.name = name;
        dir.path = DiskManager_1.DiskManager.pathFromParent({ path: '', name: '.' });
        dir.cache = { mediaCount: 0, youngestMedia: 10, oldestMedia: 1000 };
        dir.directories = [];
        dir.metaFile = [];
        dir.media = [];
        dir.lastModified = 1656069687773;
        dir.lastScanned = 1656069687773;
        // dir.parent = null;
        if (parent !== null) {
            dir.path = DiskManager_1.DiskManager.pathFromParent(parent);
            parent.directories.push(dir);
        }
        return dir;
    }
    static getBasePhotoEntry(dir, name = 'base media.jpg') {
        const sd = new MediaEntity_1.MediaDimensionEntity();
        sd.height = 400;
        sd.width = 200;
        const m = new PhotoEntity_1.PhotoMetadataEntity();
        m.caption = null;
        m.size = sd;
        m.creationDate = 1656069387772;
        m.creationDateOffset = '+02:00';
        m.fileSize = 123456789;
        // m.rating = 0; no rating by default
        // TODO: remove when typeorm is fixed
        m.duration = null;
        m.bitRate = null;
        const d = new PhotoEntity_1.PhotoEntity();
        d.name = name;
        d.directory = dir;
        if (dir.media) {
            dir.media.push(d);
            dir.cache.mediaCount++;
        }
        d.metadata = m;
        return d;
    }
    static getPhotoEntry(dir) {
        const sd = new MediaEntity_1.MediaDimensionEntity();
        sd.height = 400;
        sd.width = 200;
        const gps = new MediaEntity_1.GPSMetadataEntity();
        gps.latitude = 1;
        gps.longitude = 1;
        const pd = new MediaEntity_1.PositionMetaDataEntity();
        pd.city = 'New York';
        pd.country = 'Alderan';
        pd.state = 'Kamino';
        pd.GPSData = gps;
        const cd = new MediaEntity_1.CameraMetadataEntity();
        cd.ISO = 100;
        cd.model = '60D';
        cd.make = 'Canon';
        cd.fStop = 1;
        cd.exposure = 1;
        cd.focalLength = 1;
        cd.lens = 'Lens';
        const m = new PhotoEntity_1.PhotoMetadataEntity();
        m.caption = null;
        m.keywords = ['apple'];
        m.cameraData = cd;
        m.positionData = pd;
        m.size = sd;
        m.creationDate = 1656069387772;
        m.creationDateOffset = '-05:00';
        m.fileSize = 123456789;
        // m.rating = 0; no rating by default
        // TODO: remove when typeorm is fixed
        m.duration = null;
        m.bitRate = null;
        const d = new PhotoEntity_1.PhotoEntity();
        d.name = 'test media.jpg';
        d.directory = dir;
        if (dir.media) {
            dir.media.push(d);
            dir.cache.mediaCount++;
        }
        d.metadata = m;
        return d;
    }
    static getVideoEntry(dir) {
        const sd = new MediaEntity_1.MediaDimensionEntity();
        sd.height = 200;
        sd.width = 300;
        const m = new VideoEntity_1.VideoMetadataEntity();
        m.caption = null;
        m.keywords = null;
        m.rating = null;
        m.size = sd;
        m.creationDate = 1656069387771;
        m.fileSize = 123456789;
        m.duration = 10000;
        m.bitRate = 4000;
        const d = new VideoEntity_1.VideoEntity();
        d.name = 'test video.mp4';
        d.directory = dir;
        if (dir.media) {
            dir.media.push(d);
            dir.cache.mediaCount++;
        }
        d.metadata = m;
        return d;
    }
    static getGPXEntry(dir) {
        const d = {
            id: null,
            name: 'saturdayRun.gpx',
            directory: dir
        };
        if (dir.metaFile) {
            dir.metaFile.push(d);
        }
        return d;
    }
    static getVideoEntry1(dir) {
        const p = TestHelper.getVideoEntry(dir);
        p.name = 'swVideo.mp4';
        return p;
    }
    static getPhotoEntry1(dir) {
        const p = TestHelper.getPhotoEntry(dir);
        p.metadata.caption = 'Han Solo\'s dice';
        p.metadata.keywords = ['Boba Fett', 'star wars', 'Anakin', 'death star', 'phantom menace'];
        p.metadata.positionData.city = 'Mos Eisley';
        p.metadata.positionData.country = 'Tatooine';
        p.name = 'sw1.jpg';
        p.metadata.positionData.GPSData.latitude = 10;
        p.metadata.positionData.GPSData.longitude = 10;
        p.metadata.creationDate = 1656069387772 - 1000;
        p.metadata.creationDateOffset = '+00:00';
        p.metadata.rating = 1;
        p.metadata.size.height = 1000;
        p.metadata.size.width = 1000;
        p.metadata.faces = [{
                box: { height: 10, width: 10, left: 10, top: 10 },
                name: 'Boba Fett'
            }, {
                box: { height: 10, width: 10, left: 102, top: 102 },
                name: 'Luke Skywalker'
            }, {
                box: { height: 10, width: 10, left: 103, top: 103 },
                name: 'Han Solo'
            }, {
                box: { height: 10, width: 10, left: 101, top: 101 },
                name: 'Anakin Skywalker'
            }, {
                box: { height: 10, width: 10, left: 104, top: 104 },
                name: 'Unkle Ben'
            }, {
                box: { height: 10, width: 10, left: 201, top: 201 },
                name: 'R2-D2'
            }];
        return p;
    }
    static getPhotoEntry2(dir) {
        const p = TestHelper.getPhotoEntry(dir);
        p.metadata.caption = 'Light saber';
        p.metadata.keywords = ['Padmé Amidala', 'star wars', 'Natalie Portman', 'death star', 'wookiee'];
        p.metadata.positionData.city = 'Derem City';
        p.metadata.positionData.state = 'Research City';
        p.metadata.positionData.country = 'Kamino';
        p.name = 'sw2.jpg';
        p.metadata.positionData.GPSData.latitude = -10;
        p.metadata.positionData.GPSData.longitude = -10;
        p.metadata.creationDate = 1656069387772 - 2000;
        p.metadata.creationDateOffset = '+11:00';
        p.metadata.rating = 2;
        p.metadata.size.height = 2000;
        p.metadata.size.width = 1000;
        p.metadata.faces = [{
                box: { height: 10, width: 10, left: 10, top: 10 },
                name: 'Padmé Amidala'
            }, {
                box: { height: 10, width: 10, left: 101, top: 101 },
                name: 'Anakin Skywalker'
            }, {
                box: { height: 10, width: 10, left: 101, top: 101 },
                name: 'Obivan Kenobi'
            }, {
                box: { height: 10, width: 10, left: 201, top: 201 },
                name: 'R2-D2'
            }];
        return p;
    }
    static getPhotoEntry3(dir) {
        const p = TestHelper.getPhotoEntry(dir);
        p.metadata.caption = 'Amber stone';
        p.metadata.keywords = ['star wars', 'wookiees'];
        p.metadata.positionData.city = 'Castilon';
        p.metadata.positionData.state = 'Devaron';
        p.metadata.positionData.country = 'Ajan Kloss';
        p.name = 'sw3.jpg';
        p.metadata.positionData.GPSData.latitude = 10;
        p.metadata.positionData.GPSData.longitude = 15;
        p.metadata.creationDate = 1656069387772 - 3000;
        p.metadata.creationDateOffset = '-03:45';
        p.metadata.rating = 3;
        p.metadata.size.height = 1000;
        p.metadata.size.width = 2000;
        p.metadata.faces = [{
                box: { height: 10, width: 10, left: 10, top: 10 },
                name: 'Kylo Ren'
            }, {
                box: { height: 10, width: 10, left: 101, top: 101 },
                name: 'Leia Organa'
            }, {
                box: { height: 10, width: 10, left: 103, top: 103 },
                name: 'Han Solo'
            }];
        return p;
    }
    static getPhotoEntry4(dir) {
        const p = TestHelper.getPhotoEntry(dir);
        p.metadata.caption = 'Millennium falcon';
        p.metadata.keywords = ['star wars', 'ewoks'];
        p.metadata.positionData.city = 'Tipoca City';
        p.metadata.positionData.state = 'Exegol';
        p.metadata.positionData.country = 'Jedha';
        p.name = 'sw4.jpg';
        p.metadata.positionData.GPSData.latitude = 15;
        p.metadata.positionData.GPSData.longitude = 10;
        p.metadata.creationDate = 1656069387772 - 4000;
        p.metadata.creationDateOffset = '+04:30';
        p.metadata.size.height = 3000;
        p.metadata.size.width = 2000;
        p.metadata.faces = [{
                box: { height: 10, width: 10, left: 10, top: 10 },
                name: 'Kylo Ren'
            }, {
                box: { height: 10, width: 10, left: 101, top: 101 },
                name: 'Anakin Skywalker'
            }, {
                box: { height: 10, width: 10, left: 101, top: 101 },
                name: 'Obivan Kenobi'
            }, {
                box: { height: 10, width: 10, left: 201, top: 201 },
                name: 'R2-D2'
            }];
        return p;
    }
    static getRandomizedDirectoryEntry(parent = null, forceStr = null) {
        const dir = {
            id: null,
            name: DiskManager_1.DiskManager.dirName(forceStr || Math.random().toString(36).substring(7)),
            path: DiskManager_1.DiskManager.pathFromParent({ path: '', name: '.' }),
            cache: {
                mediaCount: 0,
                recursiveMediaCount: 0,
                cover: null,
                valid: false,
            },
            directories: [],
            metaFile: [],
            media: [],
            lastModified: Date.now(),
            lastScanned: null,
            parent
        };
        if (parent !== null) {
            dir.path = DiskManager_1.DiskManager.pathFromParent(parent);
            parent.directories.push(dir);
        }
        return dir;
    }
    static getRandomizedGPXEntry(dir, forceStr = null) {
        const d = {
            id: null,
            name: forceStr + '_' + Math.random().toString(36).substring(7) + '.gpx',
            directory: dir
        };
        dir.metaFile.push(d);
        return d;
    }
    static getRandomizedFace(media, forceStr = null) {
        const rndStr = () => {
            return forceStr + '_' + Math.random().toString(36).substring(7);
        };
        const rndInt = (max = 5000) => {
            return Math.floor(Math.random() * max);
        };
        const f = {
            name: rndStr() + '.jpg',
            box: {
                left: rndInt(),
                top: rndInt(),
                width: rndInt(),
                height: rndInt()
            }
        };
        media.metadata.faces = (media.metadata.faces || []);
        media.metadata.faces.push(f);
        return f;
    }
    static getRandomizedPhotoEntry(dir, forceStr = null, faces = 2, rating) {
        const rndStr = () => {
            return forceStr + '_' + Math.random().toString(36).substring(7);
        };
        const rndInt = (max = 5000) => {
            return Math.floor(Math.random() * max);
        };
        const sd = {
            height: rndInt(),
            width: rndInt(),
        };
        const gps = {
            latitude: rndInt(1000),
            longitude: rndInt(1000)
        };
        const pd = {
            city: rndStr(),
            country: rndStr(),
            state: rndStr(),
            GPSData: gps
        };
        const cd = {
            ISO: rndInt(500),
            model: rndStr(),
            make: rndStr(),
            fStop: rndInt(10),
            exposure: rndInt(10),
            focalLength: rndInt(10),
            lens: rndStr()
        };
        const m = {
            keywords: [rndStr(), rndStr()],
            cameraData: cd,
            positionData: pd,
            size: sd,
            creationDate: Date.now() + ++TestHelper.creationCounter * (1000 * 60 * 10),
            creationDateOffset: '+01:00',
            fileSize: rndInt(10000),
            caption: rndStr(),
            ...(!isNaN(rating) && { rating })
        };
        const p = {
            id: null,
            name: rndStr() + '.jpg',
            directory: dir,
            metadata: m
        };
        for (let i = 0; i < faces; i++) {
            this.getRandomizedFace(p, 'Person ' + i);
        }
        dir.media.push(p);
        TestHelper.updateDirCache(dir);
        return p;
    }
    static updateDirCache(dir) {
        // Ensure back-references are intact (removeReferences() may null them)
        dir.media.forEach((m) => (m.directory = dir));
        // Sort media by creation time (newest first) for cache boundaries
        const sortedByDate = dir.media
            .slice()
            .sort((a, b) => b.metadata.creationDate - a.metadata.creationDate);
        // Build candidate list for album cover
        // Prefer media from this directory; otherwise, use covers from subdirectories
        const mediaForCover = dir.media.length > 0
            ? dir.media.slice()
            : dir.directories
                .filter((d) => !!d.cache?.cover)
                .map((d) => {
                // Make sure cover has correct directory reference
                d.cache.cover.directory = d;
                return d.cache.cover;
            });
        // Sort cover candidates by configured method
        const sortBy = Config_1.Config.AlbumCover.Sorting[0].method;
        mediaForCover.sort((a, b) => sortBy == SortingMethods_1.SortByTypes.Rating
            ? (b.metadata.rating || 0) - (a.metadata.rating || 0)
            : b.metadata.creationDate - a.metadata.creationDate);
        const cover = mediaForCover?.[0] || null;
        // Update directory cache
        if (dir.cache) {
            dir.cache.mediaCount = sortedByDate.length;
            dir.cache.recursiveMediaCount = dir.directories.reduce((acc, d) => acc + d.cache.mediaCount, 0) + sortedByDate.length;
            if (sortedByDate.length > 0) {
                dir.cache.youngestMedia = sortedByDate[0].metadata.creationDate;
                dir.cache.oldestMedia = sortedByDate[sortedByDate.length - 1].metadata.creationDate;
            }
            if (cover) {
                dir.cache.cover = cover;
            }
            dir.cache.valid = true;
        }
        // Propagate cache update upward
        if (dir.parent) {
            TestHelper.updateDirCache(dir.parent);
        }
    }
}
exports.TestHelper = TestHelper;
//# sourceMappingURL=TestHelper.js.map