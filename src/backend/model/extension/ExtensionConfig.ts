import {IExtensionConfig} from './IExtension';
import {Config} from '../../../common/config/private/Config';
import {ServerExtensionsEntryConfig} from '../../../common/config/private/subconfigs/ServerExtensionsConfig';

export class ExtensionConfig<C> implements IExtensionConfig<C> {

  /**
   * @param configKey - The key used in Config.Extensions.extensions map (matches the extension's folder name)
   */
  constructor(private readonly configKey: string) {
  }


  public getConfig(): C {
    const c = Config.Extensions.extensions[this.configKey] as ServerExtensionsEntryConfig;

    return c?.configs as C;
  }


}
