import { useEffect, useState } from 'react';
import { GameFormDrawer } from '../game-sheet/GameFormDrawer';
import { useAppContext } from '../../AppContext';
import { EditGameForm } from '../game-sheet/EditGameForm';
import { addCustomGame, getGameOverrides } from '../../lib/storage';
import type { LaunchBoxGame } from '../../types';

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
        <GameFormDrawer open={open} onOpenChange={onOpenChange} title="Add game">
            <EditGameForm
                game={stub}
                regions={platform.imageRegions}
                activeConsole={activeConsole}
                onSave={handleSave}
                onCancel={() => onOpenChange(false)}
                isNew
            />
        </GameFormDrawer>
    );
}
