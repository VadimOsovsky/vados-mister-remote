import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, MathUtils, SRGBColorSpace, TextureLoader, type Texture } from 'three';

const offsetVarnish = { roughness: 0.66, ior: 1.45, clearcoat: 0.22, clearcoatRoughness: 0.46 };

type BoxSceneProps = {
    front: string;
    back?: string;
    title: string;
    angle: { x: number; y: number };
    offset: { x: number; y: number };
    zoom: number;
};

function useCoverTexture(url?: string) {
    const [loaded, setLoaded] = useState<{ url: string; texture: Texture }>();
    useEffect(() => {
        if (!url) return;
        let active = true;
        const texture = new TextureLoader().load(url, result => {
            if (active) setLoaded({ url, texture: result });
        }, undefined, () => {
            // A missing or cross-origin scan leaves the mock face visible.
        });
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        return () => {
            active = false;
            texture.dispose();
        };
    }, [url]);
    return loaded && loaded.url === url ? loaded.texture : undefined;
}

function MockFace({ attach, label, vertical = false }: { attach: string; label: string; vertical?: boolean }) {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = vertical ? 128 : 768;
        canvas.height = vertical ? 768 : 256;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.fillStyle = vertical ? '#e9b719' : '#ffcf19';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.translate(canvas.width / 2, canvas.height / 2);
        if (vertical) context.rotate(Math.PI / 2);
        context.fillStyle = '#172848';
        context.font = 'bold 52px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label, 0, 0, 690);
        const next = new CanvasTexture(canvas);
        next.colorSpace = SRGBColorSpace;
        return next;
    }, [label, vertical]);
    useEffect(() => () => texture?.dispose(), [texture]);
    return <meshPhysicalMaterial {...offsetVarnish} attach={attach} map={texture ?? null} color={texture ? 'white' : '#ffcf19'} />;
}

function BoxMesh({ front, back, title, angle, offset, zoom }: BoxSceneProps) {
    const { size: { width, height }, viewport } = useThree();
    const unitsPerPixel = viewport.height / height;
    const boxWidth = Math.min(width * 0.64, height * 0.4, 340);
    const frontMap = useCoverTexture(front);
    const backMap = useCoverTexture(back);

    return (
        <mesh position={[offset.x * unitsPerPixel, -offset.y * unitsPerPixel, 0]}
            rotation={[MathUtils.degToRad(-angle.x), MathUtils.degToRad(angle.y), 0]}
            scale={boxWidth * unitsPerPixel * zoom}>
            <boxGeometry args={[1, 1.43, 0.19]} />
            <MockFace attach="material-0" label={title} vertical />
            <MockFace attach="material-1" label={title} vertical />
            <MockFace attach="material-2" label={title} />
            <MockFace attach="material-3" label="Nintendo" />
            {frontMap
                ? <meshPhysicalMaterial {...offsetVarnish} key="front-scan" attach="material-4" map={frontMap} />
                : <meshPhysicalMaterial {...offsetVarnish} key="front-placeholder" attach="material-4" color="#ffcf19" />}
            {backMap
                ? <meshPhysicalMaterial {...offsetVarnish} attach="material-5" map={backMap} />
                : <MockFace attach="material-5" label={title} />}
        </mesh>
    );
}

export default function PreviewBoxScene(props: BoxSceneProps) {
    return (
        <Canvas frameloop="demand" dpr={[1, 2]}
            camera={{ position: [0, 0, 1000], fov: 38, far: 4000 }}
            fallback={<p className="preview-box-message">3D is unavailable. Open a cover in Library to view it in 2D.</p>}>
            <hemisphereLight color="#fff8ee" groundColor="#becae2" intensity={1.5} />
            <directionalLight position={[-400, 650, 850]} intensity={1.9} />
            <directionalLight position={[500, 250, -650]} intensity={1.1} />
            <BoxMesh {...props} />
        </Canvas>
    );
}
