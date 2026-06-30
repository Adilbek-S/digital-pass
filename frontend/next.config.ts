import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async rewrites() {
    let backend = process.env.BACKEND_URL ?? "http://localhost:8000";
    if (backend && !backend.startsWith("http://") && !backend.startsWith("https://")) {
      backend = `https://${backend}`;
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
