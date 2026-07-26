export const SETTINGS_TEXT = {
  title: '系统设置',
  unsavedChanges: '有未保存的改动',
  saving: '正在自动保存...',
  tabs: {
    general: '核心配置',
    ai: '智能核心',
    assets: '资产管理',
    status: '系统监控',
  },

  general: {
    title: '基本设置',
    siteName: '网站名称',
    siteNameHint: '显示于标题与菜单',
  },

  logo: {
    title: '品牌标识',
    storeLogo: '商户 Logo',
    recommendation: '推荐比例 1:1 · 透明背景为佳',
    uploading: '上传中...',
    changeLogo: '更换 Logo',
    uploadLogo: '上传 Logo',
  },

  whatsapp: {
    title: '联系人设置',
    namePlaceholder: '名称',
    phonePlaceholder: '号码 (例: +86138...)',
  },

  ai: {
    title: 'AI 处理器配置',
    primary: '首选',
    active: '已启用',
    modelLabel: '模型型号',
    apiKeyPlaceholder: 'API Key',
    saveKey: '保存 Key',
    saveModel: '保存模型',
    test: '测试连通性',
    testConnection: '测试连通性',
    testingConnection: '测试连通性中...',
    openrouterSub: '多模型引擎',
    agnesSub: '原生引擎',
    geminiSub: '原生引擎',
  },

  categories: {
    title: '分类列表',
    add: '新增分类',
    edit: '编辑分类名称',
    editPromptDescription: '输入新的名称:',
    delete: '删除',
    confirmDelete: '确定要删除此分类吗？',
    placeholder: '输入分类名称...',
    items: '个项目',
  },

  tags: {
    title: '标签管理',
    add: '新增标签',
    edit: '编辑标签名称',
    editPromptDescription: '输入新的标签名称:',
    delete: '删除',
    hotLimit: '热门上限',
    hotMax: '热门上限',
    hotThreshold: '热度阈值',
    refreshHot: '刷新热门标签',
    items: '个项目',
    placeholder: '输入标签名称...',
  },

  manufacturers: {
    title: '厂商列表',
    add: '新增厂商',
    edit: '编辑厂商名称',
    delete: '删除',
    items: '个项目',
    placeholder: '输入厂商名称...',
  },

  common: {
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    loading: '加载中...',
    error: '操作失败',
    success: '操作成功',
  },
} as const;

export type SettingsText = typeof SETTINGS_TEXT;
