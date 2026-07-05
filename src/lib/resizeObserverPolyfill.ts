const OriginalRO = typeof window !== 'undefined' ? window.ResizeObserver : null;

if (OriginalRO) {
  window.ResizeObserver = class extends OriginalRO {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          if (typeof callback === 'function') {
            callback(entries, observer);
          }
        });
      });
    }
  };
}

export {};