import React from 'react';
import { useGalleryContext } from '../context/GalleryContext';
import { PublicGallery } from '../components/PublicGallery';
import { useAuth } from '../hooks/useAuth';
import { useAdminUI, useAdminSession } from '../context/AdminContexts';

export const AdminPhotos: React.FC = () => {
    const { photos, setIsAdminMode } = useGalleryContext();
    const { user, loginWithGoogle } = useAuth();
    const { settings } = useAdminSession();

    // Ensure we are in admin mode
    React.useEffect(() => {
        setIsAdminMode(true);
        return () => setIsAdminMode(false);
    }, [setIsAdminMode]);

    return (
        <div className="flex flex-col h-full bg-[#FDFAF6] rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <PublicGallery 
                onExit={() => {}}
                onBatchEdit={() => {}}
                showExit={false}
                onLogin={() => {}}
                loginWithGoogle={loginWithGoogle}
                user={user}
                internalPassword=""
                settings={settings}
                isRefreshing={false}
                onRefresh={() => {}}
                onLoadMore={() => {}}
                hasMore={false}
                totalCount={photos.length}
                onTogglePinned={async () => {}}
            />
        </div>
    );
};
