export function CollectionEmptyArt() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 320 210">
            <title>Room for your first game</title>
            <defs>
            <pattern id="empty-art-dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r=".8" fill="var(--ink)" opacity=".14"/>
            </pattern>
            </defs>
            <g strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="165" cy="187" rx="115" ry="10" fill="var(--ink)" opacity=".08"/>
            <circle cx="164" cy="99" r="81" fill="var(--accent)" opacity=".055"/>
            <path d="m64 156-12-96 55-7 12 105m111 0 14-97 32 5-13 94" fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="5 6"/>
            <path d="M103 160V43l15-12h96v131Z" fill="var(--ink)" opacity=".12" transform="translate(4 5)"/>
            <path d="m102 43 14-12v131l-14 8Z" fill="var(--line)" stroke="var(--ink)" strokeWidth="2.5"/>
            <path d="M116 31h98v131h-98Z" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.5"/>
            <path d="M122 37h86v119h-86Z" fill="url(#empty-art-dots)"/>
            <path d="M126 127h78" stroke="var(--ink)" strokeWidth="1.5" opacity=".18"/>
            <path d="M106 49v101" stroke="var(--card)" strokeWidth="1.5"/>
            <path d="M128 137h7v7h-7Zm12 0h7v7h-7Zm12 0h7v7h-7Zm12 0h7v7h-7Z" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.2"/>
            <circle cx="165" cy="83" r="27" fill="var(--ink)" opacity=".12" transform="translate(2 3)"/>
            <circle cx="165" cy="83" r="27" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2.5"/>
            <circle cx="165" cy="83" r="21" fill="none" stroke="var(--card)" strokeWidth="2"/>
            <path d="M153 83h24m-12-12v24" stroke="var(--ink)" strokeWidth="3.5"/>
            <path d="M42 166h234l-11 12H54Z" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.5"/>
            <path d="M51 166h214" stroke="var(--card)" strokeWidth="2"/>
            <path d="M76 180h166" stroke="var(--accent)" strokeWidth="2.5" opacity=".3"/>
            <path d="m60 24 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.8"/>
            <path d="m258 89 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5"/>
            <circle cx="239" cy="29" r="3" fill="var(--accent)" opacity=".4"/>
            <path d="m79 111 3 3m0-3-3 3" stroke="var(--accent)" strokeWidth="1.5" opacity=".65"/>
            </g>
            </svg>
    );
}
