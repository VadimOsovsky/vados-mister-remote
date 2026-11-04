import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import './PreviewBox.css';

const PreviewBoxScene = lazy(() => import("./PreviewBoxScene"));

const maxZoom = 3;
const glideDuration = 480;

export function PreviewBox({ front, back, title, onClose }: {
    front: string;
    back?: string;
    title: string;
    onClose: () => void;
}) {
    const [angle, setAngle] = useState({ x: -12, y: -24 });

    const [zoom, setZoom] = useState(1);
    function changeZoom(multiplier: number) {
        setZoom(current => Math.max(0.65, Math.min(maxZoom, current * multiplier)));
    }

    const pointer = useRef({ x: 0, y: 0, time: 0, vx: 0, vy: 0 });
    const touches = useRef(new Map<number, { x: number; y: number }>());
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const frame = useRef(0);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    function stopGlide() {
        cancelAnimationFrame(frame.current);
    }

    function glide(time: number) {
        const { vx, vy, time: lastMove } = pointer.current;
        if (reducedMotion.matches || time - lastMove > 75) return;

        let previousDistance = 0;
        function tick(now: number) {
            const progress = Math.min(1, (now - time) / glideDuration);
            const easedProgress = 1 - (1 - progress) ** 3;
            const distance = easedProgress * glideDuration / 3;
            const step = distance - previousDistance;
            rotate(vx * step, vy * step);
            previousDistance = distance;
            if (progress < 1) frame.current = requestAnimationFrame(tick);
        }
        frame.current = requestAnimationFrame(tick);
    }

    function rotate(x: number, y: number) {
        setAngle(current => ({ x: (current.x + x) % 360, y: (current.y + y) % 360 }));
    }

    return (
        <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="preview-box-overlay" />
                <Dialog.Content className="preview-box-dialog">
                    <Dialog.Title>{title}</Dialog.Title>
                    <Dialog.Close className="preview-box-close playroom-button playroom-press" aria-label="Close">×</Dialog.Close>
                    <div className="preview-box-stage" tabIndex={0} aria-label="Rotate the box with the arrow keys"
                        onWheel={event => changeZoom(Math.exp(-event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1) / 500))}
                        onPointerDown={event => {
                            if (event.button !== 0) return;
                            if (event.pointerType === 'touch') {
                                if (touches.current.size >= 2) return;
                                touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
                            } else if (touches.current.size || !event.isPrimary) return;
                            stopGlide();
                            pointer.current = { x: event.clientX, y: event.clientY, time: event.timeStamp, vx: 0, vy: 0 };
                            event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={event => {
                            const previousTouch = touches.current.get(event.pointerId);
                            if (previousTouch) {
                                const x = event.clientX - previousTouch.x;
                                const y = event.clientY - previousTouch.y;
                                touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
                                if (touches.current.size === 2) {
                                    const otherTouch = [...touches.current.entries()]
                                        .find(([id]) => id !== event.pointerId)?.[1];
                                    if (otherTouch) {
                                        const before = Math.hypot(previousTouch.x - otherTouch.x, previousTouch.y - otherTouch.y);
                                        const after = Math.hypot(event.clientX - otherTouch.x, event.clientY - otherTouch.y);
                                        changeZoom(Math.max(8, after) / Math.max(8, before));
                                    }
                                    setOffset(current => ({ x: current.x + x / 2, y: current.y + y / 2 }));
                                    return;
                                }
                            }
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                const { x, y, time } = pointer.current;
                                const dx = (y - event.clientY) / 2;
                                const dy = (event.clientX - x) / 2;
                                const elapsed = Math.max(8, event.timeStamp - time);
                                const limit = (speed: number) => Math.max(-0.25, Math.min(0.25, speed));
                                rotate(dx, dy);
                                pointer.current = {
                                    x: event.clientX, y: event.clientY, time: event.timeStamp,
                                    vx: limit(dx / elapsed), vy: limit(dy / elapsed),
                                };
                            }
                        }}
                        onPointerUp={event => {
                            if (touches.current.size === 2) return;
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) glide(performance.now());
                        }}
                        onLostPointerCapture={event => {
                            if (!touches.current.delete(event.pointerId)) return;
                            const remaining = touches.current.values().next().value;
                            if (remaining) {
                                pointer.current = { ...remaining, time: event.timeStamp, vx: 0, vy: 0 };
                            }
                        }}
                        onKeyDown={event => {
                            const steps: Record<string, [number, number]> = {
                                ArrowUp: [-15, 0], ArrowDown: [15, 0], ArrowLeft: [0, -15], ArrowRight: [0, 15],
                            };
                            const step = steps[event.key];
                            if (!step) return;
                            event.preventDefault();
                            stopGlide();
                            rotate(...step);
                        }}>
                        <Suspense fallback={<p className="preview-box-message">Loading 3D…</p>}>
                            <PreviewBoxScene front={front} back={back} title={title} angle={angle} offset={offset} zoom={zoom} />
                        </Suspense>
                    </div>
                    <footer className="preview-box-toolbar">
                        <Dialog.Description>Drag to rotate · Two fingers to move or pinch to zoom</Dialog.Description>
                        <div className="preview-box-controls">
                            <button className="playroom-button playroom-press" aria-label="Zoom out" disabled={zoom <= 0.65} onClick={() => changeZoom(1 / 1.2)}>−</button>
                            <button className="playroom-button playroom-press" onClick={() => {
                                stopGlide();
                                setAngle({ x: -12, y: -24 });
                                setZoom(1);
                                setOffset({ x: 0, y: 0 });
                            }}>Reset view</button>
                            <button className="playroom-button playroom-press" aria-label="Zoom in" disabled={zoom >= maxZoom} onClick={() => changeZoom(1.2)}>+</button>
                        </div>
                    </footer>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
