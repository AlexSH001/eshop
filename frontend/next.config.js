/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Long-term caching for build output and static images
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  
  // HTTPS redirect in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://:path*',
          permanent: true,
        },
      ];
    }
    return [];
  },
  
  allowedDevOrigins: [
    'local-origin.dev', 
    '*.local-origin.dev',
    'http://127.0.0.1:3000',
    'https://10.170.0.4',
    'http://backend:3001',
    'http://127.0.0.1:3001',
  ],
  
  // Optimize for development performance
  experimental: {
    // Disable image optimization in development for faster builds
    optimizePackageImports: ['lucide-react'],
  },
  
  // Webpack configuration for development optimization
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Exclude images from webpack processing in development
      config.module.rules.push({
        test: /\.(jpg|jpeg|png|gif|webp)$/,
        type: 'asset/resource',
        generator: {
          filename: 'uploads/[name][ext]',
        },
      });
      
      // Optimize webpack for development
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/public/images/**', // Ignore image changes in development
        ],
      };
    }
    
    return config;
  },
  
  images: {
    unoptimized: true,
    // Disable image optimization in development
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
