import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Download from "yet-another-react-lightbox/plugins/download";

export const LIGHTBOX_PLUGINS = [Zoom, Counter, Thumbnails, Captions, Download];

export const LIGHTBOX_OPTIONS = {
  zoom: { maxZoomPixelRatio: 3, doubleClickMaxZoom: 2 },
  counter: { container: { style: { fontSize: "14px" } } },
  thumbnails: { position: "bottom" as const, width: 80, height: 48 },
};
