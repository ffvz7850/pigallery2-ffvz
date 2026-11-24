import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthenticationService} from './model/network/authentication.service';
import {Config} from '../../common/config/public/Config';
import {Title} from '@angular/platform-browser';
import {ShareService} from './ui/gallery/share.service';
import 'hammerjs';
import {Subscription} from 'rxjs';
import {NavigationService} from './model/navigation.service';
import {ThemeService} from './model/theme.service';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-pi-gallery2',
    template: `
    <router-outlet></router-outlet>`,
    imports: [RouterOutlet]
})
export class AppComponent implements OnInit, OnDestroy {
  private subscription: Subscription = null;

  constructor(
    private authenticationService: AuthenticationService,
    private shareService: ShareService,
    private navigation: NavigationService,
    private title: Title,
    private themeService: ThemeService
  ) {
    themeService.init();
  }

  async ngOnInit(): Promise<void> {
    this.applyInterfaceZoom();
    this.title.setTitle(Config.Server.applicationTitle);
    await this.shareService.wait();
    this.subscription = this.authenticationService.user.subscribe(() => {
      if (this.authenticationService.isAuthenticated()) {
        if (this.navigation.isLoginPage()) {
          return this.navigation.toDefault();
        }
      } else {
        if (!this.navigation.isLoginPage()) {
          return this.navigation.toLogin();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription != null) {
      this.subscription.unsubscribe();
    }
  }

  /** 定制的“界面缩放”：等价浏览器缩放，用于飞牛桌面等无法调浏览器缩放的环境 */
  private applyInterfaceZoom(): void {
    const raw = Number(Config.Gallery.interfaceZoom);
    const pct = isFinite(raw) && raw > 0 ? Math.min(150, Math.max(50, raw)) : 100;
    const html = document.documentElement;
    if (pct === 100) {
      html.style.removeProperty('zoom');
    } else {
      html.style.setProperty('zoom', String(pct / 100));
    }
  }

}
