'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { isAuthenticated, isLoading } = useAuth();

    // Public routes that don't need sidebar
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Show sidebar only for authenticated users on protected routes
    const showSidebar = !isPublicRoute && isAuthenticated && !isLoading;

    return (
        <>
            {showSidebar && <Sidebar />}
            <div className={showSidebar ? "ml-64 min-h-screen bg-gray-50" : "min-h-screen bg-gray-50"}>
                {children}
            </div>
        </>
    );
}
