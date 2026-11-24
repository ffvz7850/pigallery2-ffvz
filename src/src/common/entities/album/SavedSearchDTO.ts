import {AlbumBaseDTO, AlbumCacheDTO} from './AlbumBaseDTO';
import {SearchQueryDTO} from '../SearchQueryDTO';

export interface SavedSearchDTO extends AlbumBaseDTO {
  id: number;
  name: string;
  locked: boolean;
  cache?: AlbumCacheDTO;

  searchQuery: SearchQueryDTO;
}
