export interface PersonDTO {
  cache?: PersonCacheDTO;
  id: number;
  name: string;
  missingThumbnail?: boolean;
  isFavourite: boolean;
}

export interface PersonCacheDTO {
  count: number;
}


