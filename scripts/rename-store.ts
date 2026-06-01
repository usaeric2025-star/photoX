import fs from 'fs';
import path from 'path';

const storeFiles = [
  'src/features/photo/useBatchConfirmDialog.ts',
  'src/features/photo/useBatchEdit.ts',
  'src/features/photo/usePhotoSelection.ts',
  'src/features/photo/useTagFiltering.ts',
  'src/features/photos/usePhotoGallery.ts',
  'src/hooks/core/infra/useSyncEngine.ts',
  'src/hooks/core/auth/useAdminMode.ts',
  'src/hooks/core/auth/usePermission.ts',
  'src/hooks/__tests__/hookContracts.test.ts',
  'src/hooks/usePhotoFilters.ts',
  'src/pages/PublicPage.tsx',
  'src/pages/AdminPage/AdminViewContent.tsx',
  'src/components/admin/edit/BatchEditForm.tsx',
  'src/components/admin/edit/PhotoTagSelector.tsx',
  'src/components/admin/PhotoEditDrawer/DrawerHeader.tsx',
  'src/components/admin/PhotoEditDrawer/PhotoEditDrawer.tsx',
  'src/components/admin/PhotoEditDrawer/usePhotoEditLogic.ts',
  'src/components/admin/AdminSidebar.tsx',
  'src/components/admin/LoginScreen.tsx',
  'src/components/admin/FormShared.tsx',
  'src/components/admin/AdminGlobalModals.tsx',
  'src/components/admin/ManufacturerItem.tsx',
  'src/components/admin/TagEditor.tsx',
  'src/components/settings/ManufacturersSection.tsx',
  'src/components/settings/TagsSection.tsx',
  'src/components/settings/TagItem.tsx',
  'src/components/settings/SyncSettings.tsx',
  'src/components/settings/CategoriesSection.tsx',
  'src/components/settings/MaintenanceSection.tsx',
  'src/components/settings/useSettingsLogic.ts',
  'src/components/settings/SyncSection.tsx',
  'src/components/ui/FilterPanel.tsx',
  'src/components/ui/BaseFilters.tsx',
  'src/components/ui/LanguageSwitcher.tsx',
  'src/components/PhotoLightbox/LightboxInfoPanel.tsx',
  'src/components/PhotoLightbox/PhotoLightbox.tsx',
  'src/components/layouts/headers/AdminHeader.tsx',
  'src/components/layouts/headers/PublicHeader.tsx',
  'src/components/layouts/headers/StaffHeader.tsx',
  'src/components/groups/GroupSettingsSheet/GroupSettingsHeader.tsx',
  'src/components/groups/GroupSettingsSheet.tsx',
  'src/components/groups/GroupPhotoPicker.tsx',
  'src/components/groups/GroupGridView.tsx',
  'src/components/groups/GroupAdminShell.tsx',
  'src/components/groups/GroupHeader.tsx',
  'src/components/groups/useGroupAdminLogic.ts',
  'src/components/photo/PublicGallery.tsx',
  'src/components/photo/PhotoCard.tsx',
  'src/components/photo/AdminGallery.tsx',
  'src/components/photo/PhotoListContainer.tsx',
  'src/components/photo/VirtualPhotoGrid.tsx',
  'src/components/shared/ToolsMenu.tsx',
  'src/components/shared/GalleryDialogs.tsx',
  'src/components/shared/SelectionToolbar.tsx',
  'src/components/GroupDetailView.tsx',
  'src/components/AdminScreen.tsx',
  'src/components/SettingsScreen.tsx'
];

const categoryFiles = [
  'src/pages/PublicPage.tsx',
  'src/components/admin/edit/BatchEditForm.tsx',
  'src/components/admin/PhotoEditDrawer/usePhotoEditLogic.ts',
  'src/components/admin/StatisticsScreen.tsx',
  'src/components/ui/FilterPanel.tsx',
  'src/components/PhotoLightbox/PhotoLightbox.tsx',
  'src/components/photo/PublicGallery.tsx',
  'src/components/photo/PhotoCard.tsx',
  'src/components/photo/AdminGallery.tsx',
  'src/components/SettingsScreen.tsx'
];

storeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/useGalleryUIStore/g, 'useUIStore');
    content = content.replace(/@\/store\/useGalleryUIStore/g, '@/store/useUIStore');
    fs.writeFileSync(file, content);
    console.log('Updated store:', file);
  }
});

categoryFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/useCategoryList/g, 'useCategories');
    content = content.replace(/useTagList/g, 'useTags');
    content = content.replace(/useManufacturerList/g, 'useManufacturers');
    fs.writeFileSync(file, content);
    console.log('Updated category/tags/man:', file);
  }
});
