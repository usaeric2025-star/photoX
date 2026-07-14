import { useQueryState } from 'nuqs';
import { modalParser, parseAsPhotoId } from '#lib/nuqs/parsers.js';
import { ModalType } from './useFilters.js';

/**
 * useModalActions
 * 
 * 專門處理彈窗控制邏輯。
 */
export function useModalActions() {
  const [modal, setModal] = useQueryState('m', modalParser);
  const [photoId, setPhotoId] = useQueryState('id', parseAsPhotoId);

  const openModal = (type: ModalType, id?: string) => {
    setModal(type);
    if (id) setPhotoId(id);
  };

  const closeModal = () => {
    setModal('none');
    setPhotoId(null);
  };

  return { modal: modal as ModalType, photoId, openModal, closeModal };
}
