import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import './PhotoViewer.css';

export function PhotoViewer({ index, onClose, slides }: {
    index: number | null;
    onClose: () => void;
    slides: Slide[];
}) {
    return <Lightbox open={index !== null} close={onClose} index={index ?? 0}
        plugins={[Zoom]} slides={slides} controller={{ closeOnPullDown: true }} />;
}
