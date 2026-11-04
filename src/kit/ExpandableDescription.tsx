import { useId, useState } from 'react';
import './ExpandableDescription.css';
import { ChevronDownIcon } from '../lib/icons';

export function ExpandableDescription({ text }: { text: string }) {
    const id = useId();
    const [expanded, setExpanded] = useState(false);
    const canExpand = text.length > 150;

    if (!text) return null;
    return (
        <div className="expandable-description">
            <p id={id} className={canExpand && !expanded ? 'description-clamped' : undefined}>{text}</p>
            {canExpand && (
                <button type="button" aria-controls={id} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                    {expanded ? 'Show less' : 'Show more'}<span aria-hidden="true">{ChevronDownIcon}</span>
                </button>
            )}
        </div>
    );
}
