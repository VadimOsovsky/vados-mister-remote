import { Drawer } from 'vaul';
import { useAppContext } from '../../AppContext';
import { PLATFORMS } from '../../constants';
import { ChevronDownIcon } from '../../lib/icons';
import { ConsoleCarousel } from './ConsoleCarousel';
import { ConsoleControls } from './ConsoleControls';
import type { ConsoleKey } from '../../types';
import './ConsoleSheet.css';

export function ConsoleBadge({ onClick }: { onClick: () => void }) {
    const { platform } = useAppContext();

    return (
        <button className="console-badge" onClick={onClick}>
            <img src={platform.logo} alt={platform.name} className="console-badge-img" draggable={false} />
            {ChevronDownIcon}
        </button>
    );
}

export function ConsoleSheet({ open, onOpenChange, onSwitch }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitch: (key: ConsoleKey) => void;
}) {
    const { activeConsole } = useAppContext();
    const platform = PLATFORMS[activeConsole];
    const hasControls = !!platform.controls?.length;

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="console-sheet-overlay" />
                <Drawer.Content className="console-sheet" aria-describedby={undefined}>
                    <Drawer.Handle className="console-sheet-handle" />
                    <Drawer.Title className="sr-only">Select Console</Drawer.Title>

                    <div className="console-sheet-body">
                        <div className="console-sheet-branding">{platform.branding}</div>

                        <ConsoleCarousel
                            activeConsole={activeConsole}
                            onSwitch={onSwitch}
                        />

                        {hasControls && (
                            <>
                                <div className="console-sheet-divider" />
                                <ConsoleControls activeConsole={activeConsole} />
                            </>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
