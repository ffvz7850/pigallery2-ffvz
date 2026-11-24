import {CoverPhotoDTO} from '../PhotoDTO';

export interface AlbumBaseDTO {
  id: number;
  name: string;
  cache?: AlbumCacheDTO;
  locked: boolean;
}

export interface AlbumCacheDTO {
  id?: number;
  projectionKey?: string; // does not go to the client side
  itemCount: number;
  oldestMedia?: number;
  youngestMedia?: number;
  cover?: CoverPhotoDTO;
  valid?: boolean; // does not go to the client side
}
