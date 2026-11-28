import { useMemo, useState } from 'react';
import Lightbox, { isImageSlide, type Slide } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { coverImageCrossOrigin } from '../services/coverUploads';
import 'yet-another-react-lightbox/styles.css';
import './PhotoViewer.css';

type PhotoViewerProps = {
    index: number | null;
    onClose: () => void;
    slides: (Slide & { fallbackSrcs?: string[] })[];
    crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
};

export function PhotoViewer({ index, ...props }: PhotoViewerProps) {
    return index === null ? null : <OpenPhotoViewer key={index} index={index} {...props} />;
}

function OpenPhotoViewer({ index, onClose, slides, crossOrigin }: PhotoViewerProps & { index: number }) {
    const [failed, setFailed] = useState<string[]>([]);
    const [active, setActive] = useState<number>();
    const displaySlides = useMemo(() => {
        if (!failed.length) return slides;
        return slides.map(slide => {
            if (!isImageSlide(slide) || !failed.includes(slide.src)) return slide;
            const [next, ...fallbackSrcs] = (slide.fallbackSrcs ?? []).filter(src => !failed.includes(src));
            return next ? { ...slide, src: next, fallbackSrcs } : { ...slide, fallbackSrcs: [] };
        });
    }, [slides, failed]);

    return <Lightbox open close={onClose} index={active ?? index}
        plugins={[Zoom]} slides={displaySlides} on={{ view: ({ index: viewed }) => setActive(viewed) }}
        carousel={{ imageProps: (slide: Slide & { fallbackSrcs?: string[] }) => ({
            crossOrigin: isImageSlide(slide) ? coverImageCrossOrigin(slide.src) ?? crossOrigin : crossOrigin,
            ...(isImageSlide(slide) && slide.fallbackSrcs?.some(src => src !== slide.src && !failed.includes(src))
                ? { onError: () => setFailed(sources => sources.includes(slide.src) ? sources : [...sources, slide.src]) }
                : {}),
        }) }}
        controller={{ closeOnPullDown: true }} />;
}
