/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Performance optimizations
    // swcMinify: true, // Deprecated in Next.js 16+

    compiler: {
        // Remove console logs in production
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },

    // Static Export Config
    output: 'export',
    images: {
        unoptimized: true,
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // Optimize production builds
    productionBrowserSourceMaps: false,

    // Environment variables
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '',
    },

    // Experimental features for better performance
    experimental: {
        optimizeCss: false,
        optimizePackageImports: ['echarts-for-react', 'echarts', '@heroicons/react'],
    },

    // Allowed origins for development
    allowedDevOrigins: ['localhost:3000', '192.168.1.3:3000', '192.168.1.3', 'grainiest-nona-oversqueamishly.ngrok-free.dev'],

    // Rewrites are NOT supported in static export
    // async rewrites() { ... }
}

module.exports = nextConfig
