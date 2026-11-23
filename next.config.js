/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  reactStrictMode: process.env.NODE_ENV === 'development',
  transpilePackages: ['lucide-react'],
  trailingSlash: false,
  poweredByHeader: false, // Remove powered by header for security

  // Performance and cross-platform optimizations
  compress: true,

  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive image sizes for all devices
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon and thumbnail sizes
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console in production
  },
  // CORS and caching configuration
  async headers() {
    // Restrict allowed origins per environment — never use wildcard with credentials
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? 'https://markaztikrar.id'
      : 'http://localhost:3006';

    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigins,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Client-Version',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
      // Default security & anti-stale-HTML headers for all HTML pages/redirects.
      // Never cache HTML documents or 307 redirects so clients always fetch current chunk hashes after deploy.
      {
        source: '/(.*)',
        headers: [
          // Security headers (alternative to Helmet.js)
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: process.env.NODE_ENV === 'production'
              ? 'max-age=31536000; includeSubDomains'
              : 'max-age=0'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Content Security Policy - allow Google Fonts and blob for audio
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
              "img-src 'self' data: https: https://*.googleusercontent.com",
              "media-src 'self' blob:",
              "connect-src 'self' http://localhost:* https://markaztikrar.id https://www.markaztikrar.id https://*.sentry.io https://*.google-analytics.com https://api.aladhan.com https://api.bigdatacloud.net https://ipapi.co",
            ].join('; ')
          },
          // Allow microphone for audio features globally
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self)'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ],
      },
      // Dynamic pages - explicitly enforce no-store
      {
        source: '/seleksi/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ],
      },
      {
        source: '/pendaftaran/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ],
      },
      {
        source: '/dashboard',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ],
      },
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          }
        ],
      },
      // Static assets optimization (hashed filenames are safe to cache long-term)
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate'
          }
        ]
      },
      // Images optimization for all platforms
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate'
          }
        ]
      },
      {
        source: '/(.*).(png|jpg|jpeg|gif|webp|avif|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400'
          }
        ]
      },
      // API optimization
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      }
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
}

module.exports = nextConfig
