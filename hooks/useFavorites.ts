import { create } from 'zustand';
import { allPlaces } from '../data/places';

type Place = typeof allPlaces[0];

interface FavoritesStore {
  favoriteIds: string[];
  favorites: Place[];
  toggleFavorite: (place: Place) => void;
}

export const useFavorites = create<FavoritesStore>((set) => ({
  favoriteIds: [],
  favorites: [],
  toggleFavorite: (place) =>
    set((state) => {
      const isFavorite = state.favoriteIds.includes(place.id);
      const newFavoriteIds = isFavorite
        ? state.favoriteIds.filter((id) => id !== place.id)
        : [...state.favoriteIds, place.id];
      
      return {
        favoriteIds: newFavoriteIds,
        favorites: allPlaces.filter((p) => newFavoriteIds.includes(p.id)),
      };
    }),
}));