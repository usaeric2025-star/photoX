import { queryKeys } from './keys';
import type { FilterOptions } from '@/types/api';

/**
 * 照片 Query Key 链式构建器
 */
export class PhotoKeyBuilder {
  private filters: FilterOptions = {};

  category(id?: string | null) { this.filters.category = id || undefined; return this; }
  tag(id?: string | null) { if (id) this.filters.tags = [id]; return this; }
  search(q?: string | null) { this.filters.q = q || undefined; return this; }
  sort(s?: string | null) { this.filters.sort = s || undefined; return this; }
  
  infinite(mode: 'public' | 'admin' = 'public') { return queryKeys.photos.infinite(this.filters, mode); }
  count() { return queryKeys.photos.count(this.filters); }
  list() { return queryKeys.photos.list(this.filters); }
}
