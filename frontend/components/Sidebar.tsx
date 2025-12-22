'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const menuItems = [
        { title: 'Dashboard', icon: '🏠', href: '/' },
        { title: 'Client Intake', icon: '📋', href: '/intake' },
        { title: 'Fund Selection', icon: '🔍', href: '/funds' },
        { title: 'Compare Funds', icon: '⚖️', href: '/compare' },
        { title: 'Results', icon: '⚡', href: '/results' },
        { title: 'Analytics', icon: '📈', href: '/analytics' },
        { title: 'Rebalancing', icon: '📊', href: '/rebalance' },
    ];

    return (
        <div className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'
            }`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                {!isCollapsed && (
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Portfolio Pro
                    </h1>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                >
                    {isCollapsed ? '→' : '←'}
                </button>
            </div>

            {/* User Profile Section */}
            {!isCollapsed && user && (
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                            {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {user.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 220px)' }}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            {!isCollapsed && (
                                <span className="font-medium text-sm">{item.title}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all bg-red-50 hover:bg-red-100 text-red-600 ${isCollapsed ? 'justify-center' : ''
                        }`}
                >
                    <span className="text-xl">🚪</span>
                    {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
                </button>
            </div>
        </div>
    );
}
