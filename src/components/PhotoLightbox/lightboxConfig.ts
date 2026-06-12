import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";

export const LIGHTBOX_PLUGINS = [Zoom, Thumbnails];

export const LIGHTBOX_OPTIONS = {
  zoom: { 
    maxZoomPixelRatio: 5, 
    doubleClickMaxStops: 2,
    pinchZoomV4: true,
    scrollToZoom: true
  },
  thumbnails: { position: "bottom" as const, width: 80, height: 48 },
};
