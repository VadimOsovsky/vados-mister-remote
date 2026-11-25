import { Link } from 'react-router';
import { GridIcon, RemoteIcon } from '../lib/icons';
import { PlayroomConsoleHeader } from './PlayroomConsoleHeader';
import './MisterOfflinePage.css';

export function MisterOfflinePage({ screen }: { screen: 'collection' | 'remote' }) {
    const collection = screen === 'collection';

    return (
        <div className="page-layout">
            <PlayroomConsoleHeader />
            <main className="page-scroll playroom-stage mister-offline">
                <section className="mister-offline-card" aria-labelledby="mister-offline-title">
                    <div className="mister-offline-icon" aria-hidden="true">
                        {collection ? GridIcon : RemoteIcon}
                        <span />
                    </div>
                    <h1 id="mister-offline-title">MiSTer is offline</h1>
                    <p>{collection ? 'Connect your MiSTer to open your game collection.' : 'Connect your MiSTer to use the remote control.'}</p>
                    <Link className="playroom-button playroom-primary playroom-press" to="/settings">Connect MiSTer</Link>
                </section>
            </main>
        </div>
    );
}
