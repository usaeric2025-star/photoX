export type InteractionBridge = {
  onScroll?: (offset: number) => void;
  onItemResize?: (index: number, size: number) => void;
};
