/* eslint-disable @typescript-eslint/no-inferrable-types */
import 'reflect-metadata';
import {ServerConfig} from './PrivateConfig';
import {WebConfigClass} from 'typeconfig/web';
import {ConfigState} from 'typeconfig/common';


@WebConfigClass({softReadonly: true})
export class WebConfig extends ServerConfig {
  @ConfigState()
  State: any;
}
