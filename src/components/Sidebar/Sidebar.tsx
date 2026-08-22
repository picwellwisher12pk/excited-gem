import { useState } from 'react';
import { Menu, Button } from 'antd';
import { LayoutGrid, Folder, Settings, Menu as MenuIcon, X } from 'lucide-react';
import type { MenuProps } from 'antd';

interface SidebarProps {
    currentPage: 'tabs' | 'sessions' | 'settings';
    collapsed?: boolean;
    onToggle?: () => void;
}

export function SidebarToggleButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            type="primary"
            icon={<MenuIcon size={16} />}
            onClick={onClick}
            style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        />
    );
}

export default function Sidebar({ currentPage, collapsed: externalCollapsed, onToggle }: SidebarProps) {
    const [internalCollapsed, setInternalCollapsed] = useState(true);
    const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

    const handleToggle = () => {
        if (onToggle) {
            onToggle();
        } else {
            setInternalCollapsed(!internalCollapsed);
        }
    };

    const items: MenuProps['items'] = [
        {
            key: 'tabs',
            icon: <LayoutGrid size={18} />,
            label: <a href="/tabs/home.html">Tabs</a>,
        },
        {
            key: 'sessions',
            icon: <Folder size={18} />,
            label: <a href="/tabs/sessions.html">Sessions</a>,
        },
        {
            key: 'settings',
            icon: <Settings size={18} />,
            label: <a href="/tabs/settings.html">Settings</a>,
        },
    ];

    return (
        <>
            {/* Overlay */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40"
                    onClick={handleToggle}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed left-0 top-0 h-full bg-gradient-to-b from-blue-600 to-indigo-600 shadow-lg transition-transform duration-300 z-40 ${collapsed ? '-translate-x-full' : 'translate-x-0'
                    } flex flex-col`}
                style={{ width: '240px' }}
            >
                <div className="flex justify-between items-center p-4 border-b border-white/20">
                    <h2 className="text-white font-semibold text-lg">Menu</h2>
                    <Button
                        type="text"
                        icon={<X size={20} />}
                        onClick={handleToggle}
                        className="!text-white hover:!bg-white/10 flex items-center justify-center"
                    />
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[currentPage]}
                    items={items}
                    className="!bg-transparent !border-0 pt-4 flex-1"
                    theme="dark"
                />

                {/* Footer */}
                <div className="p-4 border-t border-white/20">
                    <div className="text-white font-semibold text-sm">Excited Gem</div>
                    <div className="text-white/60 text-xs mt-1">v{chrome.runtime.getManifest().version}</div>
                </div>
            </div>
        </>
    );
}
