/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        module: false,
        'node:assert': false,
        'node:child_process': false,
        'node:crypto': false,
        'node:fs': false,
        'node:net': false,
        'node:os': false,
        'node:path': false,
        'node:stream': false,
        'node:url': false,
        'node:util': false,
      }
    }
    return config
  },
}

module.exports = nextConfig