import {AuthenticationMWs} from '../middlewares/user/AuthenticationMWs';
import {Express, Request, Response} from 'express';
import {GalleryMWs} from '../middlewares/GalleryMWs';
import {RenderingMWs} from '../middlewares/RenderingMWs';
import {ThumbnailGeneratorMWs} from '../middlewares/thumbnail/ThumbnailGeneratorMWs';
import {MemoryPreviewMWs} from '../middlewares/thumbnail/MemoryPreviewMWs';
import {UserRoles} from '../../common/entities/UserDTO';
import {ThumbnailSourceType} from '../model/fileaccess/PhotoWorker';
import {VersionMWs} from '../middlewares/VersionMWs';
import {SupportedFormats} from '../../common/SupportedFormats';
import {ServerTimingMWs} from '../middlewares/ServerTimingMWs';
import {MetaFileMWs} from '../middlewares/MetaFileMWs';
import {Config} from '../../common/config/private/Config';

export class GalleryRouter {
  public static route(app: Express): void {
    this.addGetImageIcon(app);
    this.addGetVideoIcon(app);
    this.addGetResizedPhoto(app);
    this.addGetBestFitVideo(app);
    this.addGetVideoThumbnail(app);
    this.addGetImage(app);
    this.addGetVideo(app);
    this.addGetMetaFile(app);
    this.addGetBestFitMetaFile(app);
    this.addRandom(app);
    this.addPreviewCacheClear(app);
    this.addDirectoryList(app);
    this.addDirectoryZip(app);

    this.addSearch(app);
    this.addAutoComplete(app);
  }

  /**
   * 竖图流关闭时清空「临时预览档」的内存缓存（见 MemoryPreviewMWs）。
   * 用 GET 而不是 DELETE：它只清进程内内存、不碰任何数据，避开 CSRF 拦截更省事。
   */
  protected static addPreviewCacheClear(app: Express): void {
    app.get(
      Config.Server.apiPath + '/gallery/preview-cache',
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Guest),
      (req: Request, res: Response): void => {
        MemoryPreviewMWs.clear();
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(MemoryPreviewMWs.stats());
      }
    );
  }

  protected static addDirectoryList(app: Express): void {
    app.get(
      [Config.Server.apiPath + '/gallery/content/:directory(*)', Config.Server.apiPath + '/gallery/', Config.Server.apiPath + '/gallery//'],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.Guest), //sharing user can only go through search. They can't just wander through the whole gallery
      AuthenticationMWs.normalizePathParam('directory'),
      VersionMWs.injectGalleryVersion,

      // specific part
      GalleryMWs.listDirectory,
      ThumbnailGeneratorMWs.addThumbnailInformation,
      GalleryMWs.cleanUpGalleryResults,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderResult
    );
  }

  protected static addDirectoryZip(app: Express): void {
    app.get(
      [Config.Server.apiPath + '/gallery/zip/:searchQueryDTO(*)'],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.LimitedGuest),

      // specific part
      GalleryMWs.parseSearchQuery,
      ServerTimingMWs.addServerTiming,
      GalleryMWs.zipDirectory
    );
  }

  protected static addGetImage(app: Express): void {
    app.get(
      [
        Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
        SupportedFormats.Photos.join('|') +
        '))',
      ],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetVideo(app: Express): void {
    app.get(
      [
        Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
        SupportedFormats.Videos.join('|') +
        '))',
      ],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetBestFitVideo(app: Express): void {
    app.get(
      [
        Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
        SupportedFormats.Videos.join('|') +
        '))/bestFit',
      ],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      GalleryMWs.loadBestFitVideo,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetMetaFile(app: Express): void {
    app.get(
      [
        Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
        SupportedFormats.MetaFiles.join('|') +
        '))',
      ],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMetaFiles('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetBestFitMetaFile(app: Express): void {
    app.get(
      [
        Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
        SupportedFormats.MetaFiles.join('|') +
        '))/bestFit',
      ],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMetaFiles('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      MetaFileMWs.compressGPX,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addRandom(app: Express): void {
    app.get(
      [Config.Server.apiPath + '/gallery/random/:searchQueryDTO'],
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.LimitedGuest),
      VersionMWs.injectGalleryVersion,

      // specific part
      GalleryMWs.parseSearchQuery,
      GalleryMWs.getRandomImage,
      GalleryMWs.loadFile,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  /**
   * Used for serving photo thumbnails and previews
   * @param app
   * @protected
   */
  protected static addGetResizedPhoto(app: Express): void {
    app.get(
      Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
      SupportedFormats.Photos.join('|') +
      '))/:size',
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ThumbnailGeneratorMWs.generateThumbnailFactory(ThumbnailSourceType.Photo),
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetVideoThumbnail(app: Express): void {
    app.get(
      Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
      SupportedFormats.Videos.join('|') +
      '))/:size',
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ThumbnailGeneratorMWs.generateThumbnailFactory(ThumbnailSourceType.Video),
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetVideoIcon(app: Express): void {
    app.get(
      Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
      SupportedFormats.Videos.join('|') +
      '))/icon',
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ThumbnailGeneratorMWs.generateIconFactory(ThumbnailSourceType.Video),
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addGetImageIcon(app: Express): void {
    app.get(
      Config.Server.apiPath + '/gallery/content/:mediaPath(*\\.(' +
      SupportedFormats.Photos.join('|') +
      '))/icon',
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.normalizePathParam('mediaPath'),
      AuthenticationMWs.authoriseMedia('mediaPath'),

      // specific part
      GalleryMWs.loadFile,
      ThumbnailGeneratorMWs.generateIconFactory(ThumbnailSourceType.Photo),
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderFile
    );
  }

  protected static addSearch(app: Express): void {
    app.get(
      Config.Server.apiPath + '/search/:searchQueryDTO(*)',
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.LimitedGuest),
      VersionMWs.injectGalleryVersion,

      // specific part
      GalleryMWs.parseSearchQuery,
      GalleryMWs.search,
      ThumbnailGeneratorMWs.addThumbnailInformation,
      GalleryMWs.cleanUpGalleryResults,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderResult
    );
  }

  protected static addAutoComplete(app: Express): void {
    app.get(
      Config.Server.apiPath + '/autocomplete/:value(*)',
      // common part
      AuthenticationMWs.authenticate,
      AuthenticationMWs.authorise(UserRoles.LimitedGuest),
      VersionMWs.injectGalleryVersion,

      // specific part
      GalleryMWs.autocomplete,
      ServerTimingMWs.addServerTiming,
      RenderingMWs.renderResult
    );
  }
}
