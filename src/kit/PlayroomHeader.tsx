import type { ReactNode } from 'react';
import './PlayroomHeader.css';

export function PlayroomHeader({ children }: { children: ReactNode }) {
    return (
        <header className="header playroom-header">
            <div className="header-top">{children}</div>
        </header>
    );
}
