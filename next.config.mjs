/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "storage.tally.so",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "drive.usercontent.google.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com", // Add this line
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/dash",
        has: [
          {
            type: "host",
            value: "dashboard.recruitify.tech",
          },
        ],
      },
    ];
  },
};

export default nextConfig;