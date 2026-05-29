import { createMachine, assign } from 'xstate';

export interface FiltersContext {
  categoryId: string | null;
  tagIds: string[];
  searchQuery: string;
  showGroupsCollapsed: boolean;
}

export type FiltersEvent =
  | { type: 'SET_CATEGORY'; categoryId: string | null }
  | { type: 'SET_TAGS'; tagIds: string[] }
  | { type: 'SET_SEARCH'; searchQuery: string }
  | { type: 'SET_GROUPS_COLLAPSED'; showGroupsCollapsed: boolean }
  | { type: 'RESET' };

export const filtersMachine = createMachine({
  id: 'filters',
  initial: 'idle',
  context: {
    categoryId: null,
    tagIds: [],
    searchQuery: '',
    showGroupsCollapsed: true,
  } as FiltersContext,
  states: {
    idle: {
      on: {
        SET_CATEGORY: {
          actions: assign({ categoryId: ({ event }) => event.categoryId })
        },
        SET_TAGS: {
          actions: assign({ tagIds: ({ event }) => event.tagIds })
        },
        SET_SEARCH: {
          actions: assign({ searchQuery: ({ event }) => event.searchQuery })
        },
        SET_GROUPS_COLLAPSED: {
          actions: assign({ showGroupsCollapsed: ({ event }) => event.showGroupsCollapsed })
        },
        RESET: {
          actions: assign({
            categoryId: () => null,
            tagIds: () => [],
            searchQuery: '',
            showGroupsCollapsed: true,
          })
        }
      }
    }
  }
});
