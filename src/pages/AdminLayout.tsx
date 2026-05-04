import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { CombinedAdminProvider } from '../context/CombinedAdminProvider';

export const AdminLayout: React.FC = () => {
    return (
        <CombinedAdminProvider>
            <div className="flex h-screen overflow-hidden">
                <nav className="w-64 bg-slate-100 p-4 shrink-0 overflow-y-auto">
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
        </CombinedAdminProvider>
    );
};
