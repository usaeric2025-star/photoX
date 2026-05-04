import React, { useState, useEffect } from 'react';
import { adService } from '../../services/adService';
import { useAdminUI } from '../../context/AdminContexts';
import { Trash2, Edit2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export const AdManagement: React.FC = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { setAlertDialog, showToast } = useAdminUI();

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await adService.getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to fetch ad templates:', err);
            showToast('获取广告模板失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleDelete = (id: string) => {
        setAlertDialog({
            title: '确认删除',
            message: '确定要删除此广告模板吗？此操作无法撤销。',
            onConfirm: async () => {
                try {
                    await adService.deleteTemplate(id);
                    await fetchTemplates();
                    showToast('广告模板已成功删除', 'success');
                } catch (err) {
                    console.error('Failed to delete template:', err);
                    showToast('删除广告模板失败', 'error');
                }
            }
        });
    };

    if (loading) return <div className="p-4 space-y-4"><div className="h-20 bg-gray-200 rounded animate-pulse" /><div className="h-20 bg-gray-200 rounded animate-pulse" /></div>;

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">廣告模板管理</h2>
            {templates.length === 0 ? (
                <div className="text-center py-20 text-slate-500">暫無廣告模板</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                        <div key={template.id} className="p-4 border rounded shadow bg-white flex justify-between items-start">
                            <div>
                                <h3 className="font-bold">{template.name}</h3>
                                <p className="text-sm text-gray-500">{template.description}</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="p-2 hover:bg-slate-100 rounded-full">
                                    <MoreVertical size={16} />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => console.log('Edit', template.id)}>
                                        <Edit2 className="mr-2" size={16} /> 编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(template.id)} className="text-red-600">
                                        <Trash2 className="mr-2" size={16} /> 删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
