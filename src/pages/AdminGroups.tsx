import React, { useState } from 'react';
import { GroupAdminShell } from '../components/groups/GroupAdminShell';
import { useGalleryContext } from '../context/GalleryContext';
import { useAdminPhoto } from '../context/AdminContexts';

export const AdminGroups: React.FC = () => {
    const { photos } = useGalleryContext();
    const { setPhotos } = useAdminPhoto();
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    return (
        <div className="flex h-full w-full bg-white rounded-xl overflow-hidden">
            <GroupAdminShell 
              photos={photos} 
              activeGroupId={activeGroupId} 
              setActiveGroupId={setActiveGroupId} 
              isAdminMode={true} 
              setPhotos={setPhotos}
            />
        </div>
    );
};
