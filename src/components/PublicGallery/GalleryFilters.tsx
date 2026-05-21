import React from 'react';
import { PublicGalleryFilters } from '../PublicGalleryFilters';
import { AppSettings, Category, Tag } from '../../types';

interface GalleryFiltersProps {
  settings?: AppSettings;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'newest' | 'oldest' | 'name';
  toggleSortOrder: () => void;
  columns: 2 | 3 | 5;
  setColumns: (val: 2 | 3 | 5) => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (val: boolean) => void;
  categories: Category[];
  selectedCatCode: string | null;
  setSelectedCatCode: (id: string | null) => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  sortedTags: Tag[];
  lang: string;
  t: any;
  onScrollToTop: () => void;
}

export const GalleryFilters: React.FC<GalleryFiltersProps> = (props) => {
  return (
    <PublicGalleryFilters 
      settings={props.settings}
      searchQuery={props.searchQuery}
      setSearchQuery={props.setSearchQuery}
      sortOrder={props.sortOrder}
      toggleSortOrder={props.toggleSortOrder}
      columns={props.columns}
      setColumns={props.setColumns}
      showGroupsCollapsed={props.showGroupsCollapsed}
      setShowGroupsCollapsed={props.setShowGroupsCollapsed}
      categories={props.categories}
      selectedCatCode={props.selectedCatCode}
      setSelectedCatCode={props.setSelectedCatCode}
      filterSubId={props.filterSubId}
      setFilterSubId={props.setFilterSubId}
      selectedTagIds={props.selectedTagIds}
      setSelectedTagIds={props.setSelectedTagIds}
      sortedTags={props.sortedTags}
      lang={props.lang}
      t={props.t}
      onScrollToTop={props.onScrollToTop}
      showHotEffects={true}
    />
  );
};
