import { NavLink } from 'react-router';
import type { ReactNode } from 'react';
import './TabBar.css';

interface TabItem {
    to: string;
    icon: ReactNode;
    label: string;
}

export function TabBar({ items }: { items: TabItem[] }) {
    return (
        <nav className="tab-bar">
            {items.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    {item.icon}
                    <span className="tab-item-label">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
