import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import './BottomSheet.css';

export function BottomSheet({ open, onOpenChange, autoFocus = false, className, overlayClassName, children }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    autoFocus?: boolean;
    className: string;
    overlayClassName: string;
    children: ReactNode;
}) {
    return <Drawer.Root open={open} onOpenChange={onOpenChange} autoFocus={autoFocus} repositionInputs={false}>
        <Drawer.Portal>
            <Drawer.Overlay className={overlayClassName} />
            <Drawer.Content className={`bottom-sheet ${className}`} aria-describedby={undefined}>
                {children}
            </Drawer.Content>
        </Drawer.Portal>
    </Drawer.Root>;
}
