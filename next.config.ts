import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Capacitor native builds
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" } : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.deepgram.com wss://api.deepgram.com https://api.anthropic.com; media-src 'self' blob:; img-src 'self' data: blob:;" },
        ],
      },
    ];
  },
};

export default nextConfig;
