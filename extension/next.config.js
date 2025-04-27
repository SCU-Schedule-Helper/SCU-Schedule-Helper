/** @type {import('next').NextConfig} */
const nextConfig = {
  // ignore ts build errors 
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "export", // Forces Next.js to export static files
  images: {
    unoptimized: true, // Required for static export
  },
  // Since this is a Chrome extension, disable features that won't work
  reactStrictMode: true,
  // Disable server features
  trailingSlash: true,
  assetPrefix: "./", // Required for static export
};

module.exports = nextConfig;
