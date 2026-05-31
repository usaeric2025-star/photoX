const OriginalRO = window.ResizeObserver;
window.ResizeObserver = class extends OriginalRO {
  constructor(callback: ResizeObserverCallback) {
    super((entries, observer) => {
      requestAnimationFrame(() => callback(entries, observer));
    });
  }
};
