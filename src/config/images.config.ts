export const IMAGE_SIZES = {
  THUMB: 300,
  PREVIEW: 800,
  ORIGINAL: 0,
};

export const getThumbUrl = (url: string) => {
  if (url.includes('supabase.co')) {
    return `${url}?width=${IMAGE_SIZES.THUMB}`;
  }
  return url;
};
