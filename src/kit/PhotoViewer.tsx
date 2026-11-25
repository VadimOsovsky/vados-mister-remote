import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import './PhotoViewer.css';

export function PhotoViewer({ index, onClose, slides, crossOrigin }: {
    index: number | null;
    onClose: () => void;
    slides: Slide[];
    crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
}) {
    return <Lightbox open={index !== null} close={onClose} index={index ?? 0}
        plugins={[Zoom]} slides={slides} carousel={{ imageProps: { crossOrigin } }}
        controller={{ closeOnPullDown: true }} />;
}
