import {Component, Input} from '@angular/core';
import { NgIf } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
    selector: 'app-gallery-grid-photo-loading',
    templateUrl: './loading.photo.grid.gallery.component.html',
    styleUrls: ['./loading.photo.grid.gallery.component.css'],
    imports: [NgIf, NgIconComponent]
})
export class GalleryPhotoLoadingComponent {
  @Input() animate: boolean;
  @Input() error: boolean;
}

