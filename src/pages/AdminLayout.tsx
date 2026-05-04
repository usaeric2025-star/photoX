import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { AdminPhotoProvider } from '../context/AdminContexts';

export const AdminLayout: React.FC = () => {
    // Provide a dummy value for now to prevent context errors until state is migrated
    const dummyPhotoValue = {
        photos: [],
        setPhotos: () => {},
        categories: [],
        setCategories: () => {},
        tags: [],
        setTags: () => {},
        manufacturers: [],
        setManufacturers: () => {},
        adTemplates: [],
        setAdTemplates: () => {},
        handleSingleAiAnalyze: async () => {},
        handleTranslate: async () => ({ en: '', ms: '' }),
        handleBatchAiIdentify: async () => {},
        handleGroupAiIdentify: async () => {},
        handlePhotoImport: async () => {},
        deletePhoto: async () => {},
        deleteGroup: async () => {},
        handleGroupPhotos: async () => ({}),
        handleUngroup: async () => {},
        saveNewPhoto: async () => {},
        saveBatchEdit: async () => {},
        updateTag: async () => {},
        deleteTag: async () => {},
        addTag: async () => {},
        updateCategory: async () => {},
        deleteCategory: async () => {},
        addCategory: async () => {},
        addManufacturer: async () => ({}),
        updateManufacturer: async () => {},
        deleteManufacturer: async () => {},
        removeTagFromPhoto: async () => {},
        quickAddTag: () => {},
        quickAddManufacturer: () => {}
    } as any;

    return (
        <AdminPhotoProvider value={dummyPhotoValue}>
            <div className="flex min-h-screen">
                <nav className="w-64 bg-slate-100 p-4">
                    <h1 className="text-xl font-bold mb-8">管理後台</h1>
                    <div className="flex flex-col gap-2">
                        <NavLink to="/admin/photos" className="p-2 rounded hover:bg-slate-200">照片管理</NavLink>
                        <NavLink to="/admin/groups" className="p-2 rounded hover:bg-slate-200">群組管理</NavLink>
                        <NavLink to="/admin/ads" className="p-2 rounded hover:bg-slate-200">廣告管理</NavLink>
                        <NavLink to="/admin/settings" className="p-2 rounded hover:bg-slate-200">設置</NavLink>
                    </div>
                </nav>
                <main className="flex-1 p-8 flex flex-col min-h-0 overflow-hidden relative">
                    <Outlet />
                </main>
            </div>
        </AdminPhotoProvider>
    );
};
