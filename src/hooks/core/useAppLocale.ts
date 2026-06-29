import { useUI } from '@/lib/store';

const translations = {
  zh: {
    addPhotos: '添加照片',
    batchEdit: '批量编辑',
    aiIdentify: 'AI 识别',
    dissolve: '解散合组',
    dissolveConfirm: '确定要解散此合组吗？组内的照片将被移出但不会被删除。',
    database: '群组数据库',
    cover: '封面',
    photos: '张照片',
    menu: '菜单',
    edit: '编辑',
    ai: 'AI',
    close: '关闭',
    failed: '失败',
    hidden: '已隐藏',
    visible: '显示',
    editProduct: '编辑产品信息',
    analyzeProduct: '分析新产品',
    confirmDelete: '确认删除',
    confirmDeleteMsg: '确定要删除此照片吗？此操作不可恢复。',
    delete: '删除',
    cancel: '取消',
    analyzeFailed: '识别失败'
  },
  en: {
    addPhotos: 'Add Photos',
    batchEdit: 'Batch Edit',
    aiIdentify: 'AI Identify',
    dissolve: 'Dissolve',
    dissolveConfirm: 'Are you sure you want to dissolve this group? Photos will be removed but not deleted.',
    database: 'Database',
    cover: 'Cover',
    photos: 'photos',
    menu: 'Menu',
    edit: 'Edit',
    ai: 'AI',
    close: 'Close',
    failed: 'failed',
    hidden: 'Hidden',
    visible: 'Show',
    editProduct: 'Edit Product',
    analyzeProduct: 'Analyze Product',
    confirmDelete: 'Confirm Delete',
    confirmDeleteMsg: 'Are you sure you want to delete this photo? This action cannot be undone.',
    delete: 'Delete',
    cancel: 'Cancel',
    analyzeFailed: 'Identify Failed'
  },
  ms: {
    addPhotos: 'Tambah Foto',
    batchEdit: 'Edit Pukal',
    aiIdentify: 'Kenal Pasti AI',
    dissolve: 'Bubarkan',
    dissolveConfirm: 'Adakah anda pasti mahu membubarkan kumpulan ini? Foto akan dikeluarkan tetapi tidak dipadamkan.',
    database: 'Pangkalan Data',
    cover: 'Kulit',
    photos: 'foto',
    menu: 'Menu',
    edit: 'Edit',
    ai: 'AI',
    close: 'Tutup',
    failed: 'gagal',
    hidden: 'Sembunyi',
    visible: 'Tunjuk',
    editProduct: 'Edit Maklumat',
    analyzeProduct: 'Analisis Produk',
    confirmDelete: 'Sahkan Padam',
    confirmDeleteMsg: 'Adakah anda pasti mahu memadamkan foto ini? Tindakan ini tidak dapat diubah.',
    delete: 'Padam',
    cancel: 'Batal',
    analyzeFailed: 'Gagal Kenal Pasti'
  }
};

const useAppLocale = () => {
  const appLang = useUI((s) => s.appLang);
  const lang = appLang === 'zh' || appLang === 'en' || appLang === 'ms' ? appLang : 'en';
  return translations[lang];
};
