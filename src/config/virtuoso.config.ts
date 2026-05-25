export const VIRTUOSO_CONFIG = {
  overscan: (columns: number) => columns * 2,
  increaseViewportBy: 300,
};

export const PHOTO_GRID_CONFIG = {
  overscan: (columns: number) => 100, // Fixed default for grid
  increaseViewportBy: 400,
};

export const GROUP_LIST_CONFIG = {
  overscan: (columns: number) => 200,
  increaseViewportBy: 200,
};

export const STAFF_SMALL_LIST_CONFIG = {
  overscan: (columns: number) => 50,
  increaseViewportBy: 100,
};
