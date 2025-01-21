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
        hostname: "storage.tally.so", // Add this line
      },
      {
        protocol: "https",
        hostname: "media.licdn.com", // Add this line
      },
    ],
  },
};

export default nextConfig;