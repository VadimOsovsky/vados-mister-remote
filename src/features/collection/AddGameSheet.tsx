import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { useAppContext } from '../../AppContext';
import { EditGameForm } from '../game-sheet/EditGameForm';
import { addCustomGame, getGameOverrides } from '../../lib/storage';
import type { LaunchBoxGame } from '../../types';
import '../game-sheet/GameSheet.css';
import '../game-sheet/EditGameForm.css';

function createGameStub(): LaunchBoxGame {
    return {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: '',
        year: '',
        genre: '',
        desc: '',
        developer: '',
        publisher: '',
        maxPlayers: '',
        rating: 0,
        ratingCount: 0,
        images: {},
    };
}

export function AddGameSheet({ open, onOpenChange }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { activeConsole, platform, addToCollection } = useAppContext();
    const [stub, setStub] = useState(createGameStub);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stub when sheet opens
        if (open) setStub(createGameStub());
    }, [open]);

    function handleSave() {
        const overrides = getGameOverrides(stub.id, activeConsole);
        const gameWithTitle = overrides.title ? { ...stub, title: overrides.title } : stub;
        addCustomGame(activeConsole, gameWithTitle);
        addToCollection(stub.id);
        onOpenChange(false);
    }

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="sheet-overlay" />
                <Drawer.Content className="sheet" aria-describedby={undefined}>
                    <Drawer.Handle className="sheet-handle" />
                    <Drawer.Title className="sr-only">Add Game</Drawer.Title>
                    <div className="sheet-content">
                        <div className="sheet-title-bar">
                            <div className="sheet-title">Add Game</div>
                        </div>
                        <EditGameForm
                            game={stub}
                            regions={platform.imageRegions}
                            activeConsole={activeConsole}
                            onSave={handleSave}
                            onCancel={() => onOpenChange(false)}
                            onDelete={() => {}}
                            isNew
                        />
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
