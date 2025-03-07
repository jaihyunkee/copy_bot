import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      enabled: true, // 필요한 경우 설정
    },
  },
};

export default nextConfig;
