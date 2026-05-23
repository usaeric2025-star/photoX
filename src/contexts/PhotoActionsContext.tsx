import { createContext, useContext } from 'react';
import { Photo } from '../types';

export interface PhotoActions {
  onTogglePinned?: (photo: Photo) => Promise<void>;
  onDeletePhoto?: (id: string | string[]) => Promise<void>;
  onUpdatePhoto?: (id: string, updates: Partial<Photo>) => Promise<void>;
  onUpdatePhotosBulk?: (ids: string[], updates: Partial<Photo>, taskName?: string) => Promise<void>;
  onToggleHidden?: (photo: Photo) => Promise<void>;
  onGroupPhotos?: (ids: string[]) => Promise<void>;
  onUngroup?: (groupId: string) => Promise<void>;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onEditPhoto?: (p: Photo | string) => void;
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onSetGroupCover?: (id: string, gid: string) => Promise<void>;
  onCancelAnalyze?: () => void;
}

export const PhotoActionsContext = createContext<PhotoActions>({});

export const usePhotoActions = () => useContext(PhotoActionsContext);
