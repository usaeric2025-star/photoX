import { useQueryState } from '#lib/url/index.js';
import { QUERY_PARAMS } from '#lib/url/constants.js';
import { 
  batchParser, selectedIdsParser, showGroupsCollapsedParser, 
  anchorParser, modalParser, parseAsPhotoId, columnsParser, tabParser
} from '#lib/url/parsers.js';
import { useCallback, useState, useEffect, useRef } from 'react';
import { PLACEHOLDERS } from '#src/constants/config.js';

type ModalType = 'edit' | 'delete' | 'add' | 'upload' | 'batch-edit' | 'settings' | 'ai-batch' | 'group-create' | 'group-detail' | 'group-edit' | 'category-edit' | 'tag-edit' | 'manufacturer-edit' | 'none';

/**
 * useModalActions
 * Handles modal visibility and associated photo ID.
 */
export function useModalActions() {
  const [modal, setModal] = useQueryState(QUERY_PARAMS.MODAL, modalParser);
  const [photoId, setPhotoId] = useQueryState(QUERY_PARAMS.PHOTO_ID, parseAsPhotoId);

  const openModal = (type: ModalType, id?: string) => {
    setModal(type);
    if (id) setPhotoId(id);
  };

  const closeModal = () => {
    setModal(PLACEHOLDERS.NONE as ModalType);
    setPhotoId(null);
  };

  return { modal: modal as ModalType, setModal, photoId, setPhotoId, openModal, closeModal };
}

/**
 * useUI
 * General UI state hook.
 */
export function useUI() {
  const [batch, setBatch] = useQueryState(QUERY_PARAMS.BATCH, batchParser);
  const [selected, setSelected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useQueryState(QUERY_PARAMS.COLLAPSED, showGroupsCollapsedParser);
  const [anchor, setAnchor] = useQueryState(QUERY_PARAMS.ANCHOR, anchorParser);
  const [columns, setColumns] = useQueryState(QUERY_PARAMS.COLS, columnsParser);
  const [tab, setTab] = useQueryState(QUERY_PARAMS.TAB, tabParser);

  const { modal, photoId, setPhotoId, openModal, closeModal, setModal: setModalState } = useModalActions();

  return {
    modal, setModal: setModalState,
    photoId, setPhotoId,
    batch, setBatch,
    selected, setSelected,
    showGroupsCollapsed, setShowGroupsCollapsed,
    anchor, setAnchor,
    columns, setColumns,
    tab, setTab,
    openModal,
    closeModal
  };
}

export { useFilters, useSearchTransition } from '../photo/useFilters.js';


