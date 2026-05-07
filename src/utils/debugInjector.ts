let globalSetPhotos: any = null;

export const setDebugSetPhotosCallback = (callback: any) => {
  globalSetPhotos = callback;
};

export const injectBadData = () => {
  if (!globalSetPhotos) {
    console.error("setPhotos callback not set! Call setDebugSetPhotosCallback first.");
    return;
  }
  console.log("Injecting bad data...");
  globalSetPhotos((prevPhotos: any[]) => {
    const newPhotos = [...prevPhotos];
    // 1. Set some elements to null
    if (newPhotos.length > 2) {
      newPhotos[0] = null;
      newPhotos[1] = null;
    }
    // 2. Mess with tagIds
    newPhotos.forEach(p => {
      if (p && Math.random() > 0.8) {
        p.tagIds = "abc"; // Not an array
      }
    });
    // 3. Mess with dimensions
    newPhotos.forEach(p => {
      if (p && Math.random() > 0.8) {
        p.dimensions = null; // null dimensions
      }
    });
    console.log("Bad data injected:", newPhotos);
    return newPhotos;
  });
};
