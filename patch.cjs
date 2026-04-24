const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /  const renderSettingsScreen = \(\) => \{.+?    \);\n  \};\n/s;
const match = code.match(regex);

if (match) {
  const newCode = `  const renderSettingsScreen = () => {
    if (activeScreen !== 'settings') return null;

    const addManufacturer = () => {
      if (!newSubName.trim()) return;
      const newMfrId = crypto.randomUUID();
      const newMfr = {
        id: newMfrId,
        name: newSubName.trim(),
        aliases: [newSubName.trim()]
      };
      setManufacturers([...manufacturers, newMfr]);
      setNewSubName('');
      setCategories(prev => prev.map(c => ({
        ...c,
        subcategories: [...(c.subcategories || []), { ...newMfr }]
      })));
    };

    const deleteManufacturer = (id) => {
      setManufacturers(prev => prev.filter(m => m.id !== id));
      setCategories(prev => prev.map(c => ({
        ...c,
        subcategories: (c.subcategories || []).filter(sub => sub.id !== id)
      })));
    };

    const addTag = () => {
      if (!newTagName.trim()) return;
      const newTag = {
        id: crypto.randomUUID(),
        name: newTagName.trim(),
        aliases: [newTagName.trim()]
      };
      setTags([...tags, newTag]);
      setNewTagName('');
    };

    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-white shadow-sm">
          <button onClick={() => setActiveScreen('home')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-bold text-lg text-slate-800 flex-1 ml-1 tracking-tight">設定與管理</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-orange-500 rounded-full"></div>
                Logo 設定
              </h4>
              <div className="flex items-center gap-4">
                  {settings?.logo_url ? (
                      <img src={settings.logo_url} className="w-14 h-14 rounded-full object-cover shadow-sm border border-slate-100" alt="Company Logo" />
                  ) : (
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xs shadow-inner">No Logo</div>
                  )}
                  <div className="flex flex-col gap-1 flex-1">
                    <input type="file" onChange={handleLogoUpload} className="text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 transition-all cursor-pointer" accept="image/*" />
                    <p className="text-[9px] text-slate-400 font-medium leading-relaxed">選擇要顯示在公開相簿的專屬 Logo (建議正方形)</p>
                  </div>
              </div>
          </div>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
              統一廠商管理 (Manufacturers)
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium mt-1">
              建立的廠商會自動帶入每種目錄分類中，方便您在快速為不同類別的照片標記相同廠商。
            </p>
            <div className="flex gap-1.5 mt-2">
              <input 
                type="text" 
                placeholder="新增廠商名稱..."
                className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner font-medium"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addManufacturer()}
              />
              <button 
                onClick={addManufacturer}
                className="px-5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                新增
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner min-h-[40px]">
              {manufacturers.map(sub => (
                <div key={sub.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                  <span className="text-xs font-bold text-slate-700">{sub.name}</span>
                  <button onClick={() => deleteManufacturer(sub.id)} className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5 rounded-full hover:bg-red-50 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {manufacturers.length === 0 && <span className="text-[10px] text-slate-400 mt-1 italic flex items-center ml-1">尚無資料，請在上方新增</span>}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-purple-500 rounded-full"></div>
              標籤管理 (Tags)
            </h3>
            <div className="flex gap-1.5 mt-1">
              <input 
                type="text" 
                placeholder="輸入新標籤..."
                className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-purple-500 focus:bg-white transition-all shadow-inner font-medium"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
              />
              <button 
                onClick={addTag}
                className="px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                新增
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner min-h-[40px]">
              {tags.map(tag => (
                <div key={tag.id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                  <span className="text-xs font-bold text-slate-700">#{tag.name}</span>
                  <button onClick={() => deleteTag(tag.id)} className="text-slate-400 hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition-colors cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-md border border-slate-700 space-y-4 relative overflow-hidden group mt-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all duration-700"></div>
            
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Cloud size={18} className={user ? 'text-blue-400' : 'text-slate-400'} />
                雲端同步
              </h4>
              {user && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-bold text-blue-300 uppercase leading-none mt-[1px]">Connected</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              將您的家具照片、目錄分類及標籤備份至 Supabase 雲端。透過此功能，您可以在多台設備之間同步產品目錄。
            </p>

            {!user ? (
              <button 
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch(e) {
                    alert('登入失敗: ' + JSON.stringify(e));
                  }
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-900 py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-2"
              >
                <LogIn size={16} /> 連接雲端帳號
              </button>
            ) : (
              <div className="space-y-4 mt-2">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full border border-white/20 shadow-sm object-cover" alt="Avatar" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold border border-white/10 uppercase">
                        {String(user?.displayName || user?.email || 'U').charAt(0)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-white text-xs font-black truncate">{String(user?.displayName || user?.email || '')}</p>
                      <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">{String(user?.email || '')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { 
                      setConfirmDialog({
                        message: '確定要登出嗎？您的本地數據將會保留，但無法繼續自動同步。',
                        onConfirm: () => {
                          logout(); 
                          setUser(null);
                          setActiveScreen('home');
                        }
                      });
                    }}
                    className="bg-white/10 hover:bg-red-500/20 text-white px-3 py-2 rounded-xl transition-all active:scale-95 text-[10px] font-bold border border-white/10 flex items-center gap-1.5"
                  >
                    <LogOut size={14} /> 登出
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={performPushSync}
                    disabled={isSyncing}
                    className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSyncing && syncAction === 'push' ? (
                      <>
                        <RefreshCcw size={14} className="animate-spin" />
                        上傳中...
                      </>
                    ) : (
                      <>
                        <CloudUpload size={14} />
                        上傳備份
                      </>
                    )}
                  </button>
                  <button 
                    onClick={performPullSync}
                    disabled={isSyncing}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSyncing && syncAction === 'pull' ? (
                      <>
                        <RefreshCcw size={14} className="animate-spin" />
                        下載中...
                      </>
                    ) : (
                      <>
                        <CloudDownload size={14} />
                        下載備份
                      </>
                    )}
                  </button>
                  <div className="col-span-2 bg-black/20 border border-white/5 flex items-center justify-center rounded-xl p-2.5 text-center mt-1 shadow-inner">
                    <p className="text-[9px] text-slate-400 font-medium">
                      雲端共有 <span className="text-white font-bold">{cloudCount !== null ? cloudCount : '?'}</span> 張照片 | 最新備份: {lastSyncTime ? (isNaN(new Date(Number(lastSyncTime) || lastSyncTime).getTime()) ? '未知' : new Date(Number(lastSyncTime) || lastSyncTime).toLocaleString('zh-TW')) : '尚未'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles size={16} className="text-purple-500" />
              AI 智能辨識與自動打標
            </h4>
            <div className="space-y-3">
              <input 
                type="password" 
                placeholder="第三方 AI API Key (例如 Gemini)..."
                className="font-mono w-full rounded-xl border border-slate-200 p-3 text-xs bg-slate-50 shadow-inner focus:bg-white focus:border-purple-400 transition-all outline-none text-slate-800"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem('gemini_api_key_safe', obfuscateKey(e.target.value));
                }}
              />
              <input 
                type="text" 
                placeholder="指定模型名稱 (選填，如: tencent/hy3-preview:free)"
                className="font-mono w-full rounded-xl border border-slate-200 p-3 text-xs bg-slate-50 shadow-inner focus:bg-white focus:border-purple-400 transition-all outline-none text-slate-800"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  localStorage.setItem('ai_custom_model', e.target.value);
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Lock size={16} className="text-orange-500" />
              內部查詢密碼 (Staff Access)
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              設定密碼後，員工可在公開介面輸入此密碼，解鎖查看「廠商資訊」與「手動編號」，但無編輯權限。
            </p>
            <input 
              type="password" 
              placeholder="設定密碼 (例如: 1234)..."
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-orange-500 transition-all shadow-inner font-mono tracking-widest"
              value={internalPassword}
              onChange={(e) => {
                setInternalPassword(e.target.value);
                localStorage.setItem('internal_password', e.target.value);
              }}
            />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <CloudDownload size={16} className="text-slate-600" />
              本地資料匯出導入
            </h4>
            <div className="flex gap-2.5">
              <button 
                onClick={() => {
                  const data = JSON.stringify({ photos, categories, tags, manufacturers });
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'product_album_backup.json';
                  a.click();
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                匯出 JSON
              </button>
              <label className="flex-1 bg-white text-slate-700 text-center py-3 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/json" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const json = JSON.parse(event.target?.result);
                        if (json.photos) setPhotos(json.photos);
                        if (json.categories) setCategories(json.categories);
                        if (json.tags) setTags(json.tags);
                        if (json.manufacturers) setManufacturers(json.manufacturers);
                        alert('匯入成功');
                      } catch (err) {
                        alert('匯入失敗，請檢查文件格式');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                匯入 JSON
              </label>
            </div>
          </div>

        </div>
      </div>
    );
  };
`
  code = code.replace(regex, newCode);
  fs.writeFileSync('src/App.tsx', code);
  console.log('patched successfully');
} else {
  console.log("No match found");
}
