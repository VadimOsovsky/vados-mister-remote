import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import './GameFormDrawer.css';

export function GameFormDrawer({ open, onOpenChange, title, showClose = false, autoFocus = false, children }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    showClose?: boolean;
    autoFocus?: boolean;
    children: ReactNode;
}) {
    const heading = <Drawer.Title className="add-game-title">{title}</Drawer.Title>;

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange} autoFocus={autoFocus}>
            <Drawer.Portal>
                <Drawer.Overlay className="sheet-overlay" />
                <Drawer.Content className={showClose ? 'sheet add-game-sheet owned-edit-sheet' : 'sheet add-game-sheet'} aria-describedby={undefined}>
                    <Drawer.Handle className="sheet-handle" />
                    {showClose ? (
                        <div className="owned-edit-header">
                            {heading}
                            <Drawer.Close className="owned-button owned-icon owned-edit-button playroom-press" aria-label="Close">×</Drawer.Close>
                        </div>
                    ) : heading}
                    <div className="sheet-content">{children}</div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
