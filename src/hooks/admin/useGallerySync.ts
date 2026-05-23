import { useEffect, useRef, useCallback } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings } from '../../types';
import { useGalleryStore, useShallow } from '../../store';

/**
 * Syncs external data and query results into the global Gallery Store.
 */
export const useGallerySync = (
  photos: Photo[],
  cloudCount: number | undefined,
  isFetching: boolean,
  isFetchingNextPage: boolean,
  hasNextPage: boolean,
  handleLoadMore: () => void,
  settings: AppSettings | null,
  setGeminiApiKey: (k: string) => void,
  setCustomModel: (m: string) => void,
  setAccessPasscode: (p: string) => void
) => {
  const { 
    setPhotos, setTotalCount, setIsFetching, setIsFetchingNextPage, 
    setHasNextPage, setLoadMorePhotos 
  } = useGalleryStore(useShallow(s => ({
    setPhotos: s.setPhotos,
    setTotalCount: s.setTotalCount,
    setIsFetching: s.setIsFetching,
    setIsFetchingNextPage: s.setIsFetchingNextPage,
    setHasNextPage: s.setHasNextPage,
    setLoadMorePhotos: s.setLoadMorePhotos
  })));

  useEffect(() => {
    setPhotos(photos);
  }, [photos, setPhotos]);

  useEffect(() => {
    setTotalCount(cloudCount || 0);
  }, [cloudCount, setTotalCount]);

  useEffect(() => {
    setIsFetching(isFetching);
    setIsFetchingNextPage(isFetchingNextPage);
    setHasNextPage(!!hasNextPage);
  }, [isFetching, isFetchingNextPage, hasNextPage, setIsFetching, setIsFetchingNextPage, setHasNextPage]);

  useEffect(() => {
    setLoadMorePhotos(handleLoadMore);
  }, [handleLoadMore, setLoadMorePhotos]);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (settings.gemini_api_key) setGeminiApiKey(settings.gemini_api_key);
      if (settings.custom_model) setCustomModel(settings.custom_model);
      if (settings.access_passcode) setAccessPasscode(settings.access_passcode);
    }
  }, [settings, setGeminiApiKey, setCustomModel, setAccessPasscode]);
};
