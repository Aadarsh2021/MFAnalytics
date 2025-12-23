'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { isAuthenticated, isLoading } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Public routes that don't need sidebar
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Show sidebar only for authenticated users on protected routes
    const showSidebar = !isPublicRoute && isAuthenticated && !isLoading;

    return (
        <>
            {showSidebar && (
                <Sidebar
                    isCollapsed={isCollapsed}
                    toggle={() => setIsCollapsed(!isCollapsed)}
                />
            )}
            <div className={`min-h-screen bg-gray-50 transition-all duration-300 ${showSidebar ? (isCollapsed ? "ml-20" : "ml-64") : ""
                }`}>
                {children}
            </div>
        </>
    );
}
