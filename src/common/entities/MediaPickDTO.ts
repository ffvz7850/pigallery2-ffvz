import {SearchQueryDTO} from './SearchQueryDTO';
import {SortingMethod} from './SortingMethods';
import {UserDTO} from './UserDTO';

export interface MediaPickDTO {
  creatorId?: number;
  searchQuery: SearchQueryDTO;
  sortBy: SortingMethod[];
  pick: number;
}
