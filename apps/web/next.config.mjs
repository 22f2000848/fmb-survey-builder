/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  transpilePackages: ["@cg-dump/core", "@cg-dump/db", "@cg-dump/shared"]
};

export default nextConfig;
