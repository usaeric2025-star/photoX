/**
 * PhotoX Gallery Variants
 * Used to drive layout and component styling without directly referencing user roles.
 */
export type GalleryVariant = 
  | 'full-management'    // Complete administrative control (formerly 'admin')
  | 'staff-workspace'    // Operational view for staff members (formerly 'employee/staff')
  | 'public-showcase';   // Public-facing catalog view (formerly 'public')
