import { useSearchParams } from 'react-router-dom';
import { useCallback, useState, useEffect, useRef } from 'react';
import { PLACEHOLDERS } from '#src/constants/config.js';

const QUERY_PARAMS = {
  MODAL: 'modal',
  PHOTO_ID: 'photoId',
  BATCH: 'batch',
  SELECTED: 'selected',
  COLLAPSED: 'collapsed',
  ANCHOR: 'anchor',
  COLS: 'cols',
  TAB: 'tab',
} as const;

type ModalType = 'edit' | 'delete' | 'add' | 'upload' | 'batch-edit' | 'settings' | 'ai-batch' | 'group-create' | 'group-detail' | 'group-edit' | 'category-edit' | 'tag-edit' | 'manufacturer-edit' | 'none';

/**
 * useModalActions
 * Handles modal visibility and associated photo ID.
 */
export function useModalActions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const modal = searchParams.get(QUERY_PARAMS.MODAL) as ModalType || 'none';
  const photoId = searchParams.get(QUERY_PARAMS.PHOTO_ID) || '';

  const setModal = useCallback((type: ModalType | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (type && type !== 'none') next.set(QUERY_PARAMS.MODAL, type);
      else next.delete(QUERY_PARAMS.MODAL);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPhotoId = useCallback((id: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) next.set(QUERY_PARAMS.PHOTO_ID, id);
      else next.delete(QUERY_PARAMS.PHOTO_ID);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const openModal = useCallback((type: ModalType, id?: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(QUERY_PARAMS.MODAL, type);
      if (id) next.set(QUERY_PARAMS.PHOTO_ID, id);
      else next.delete(QUERY_PARAMS.PHOTO_ID);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const closeModal = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(QUERY_PARAMS.MODAL);
      next.delete(QUERY_PARAMS.PHOTO_ID);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return { modal, setModal, photoId, setPhotoId, openModal, closeModal };
}

/**
 * useUI
 * General UI state hook.
 */
export function useUI() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modalActions = useModalActions();

  const batch = searchParams.get(QUERY_PARAMS.BATCH) === 'true';
  const selected = searchParams.get(QUERY_PARAMS.SELECTED)?.split(',').filter(Boolean) || [];
  const showGroupsCollapsed = searchParams.get(QUERY_PARAMS.COLLAPSED) !== 'false';
  const anchor = searchParams.get(QUERY_PARAMS.ANCHOR) || '';
  const columns = searchParams.get(QUERY_PARAMS.COLS) || '';
  const tab = searchParams.get(QUERY_PARAMS.TAB) || '';

  const setBatch = useCallback((val: boolean | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(QUERY_PARAMS.BATCH, 'true');
      else next.delete(QUERY_PARAMS.BATCH);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSelected = useCallback((val: string[] | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val && val.length > 0) next.set(QUERY_PARAMS.SELECTED, val.join(','));
      else next.delete(QUERY_PARAMS.SELECTED);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setShowGroupsCollapsed = useCallback((val: boolean | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val === false) next.set(QUERY_PARAMS.COLLAPSED, 'false');
      else next.delete(QUERY_PARAMS.COLLAPSED);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setAnchor = useCallback((val: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(QUERY_PARAMS.ANCHOR, val);
      else next.delete(QUERY_PARAMS.ANCHOR);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setColumns = useCallback((val: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(QUERY_PARAMS.COLS, val);
      else next.delete(QUERY_PARAMS.COLS);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setTab = useCallback((val: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(QUERY_PARAMS.TAB, val);
      else next.delete(QUERY_PARAMS.TAB);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    ...modalActions,
    batch, setBatch,
    selected, setSelected,
    showGroupsCollapsed, setShowGroupsCollapsed,
    anchor, setAnchor,
    columns, setColumns,
    tab, setTab,
  };
}

export { useFilters, useSearchTransition } from '../photo/useFilters.js';


