/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/HiliTag" : "",
  assetPrefix: isGitHubPages ? "/HiliTag" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? "/HiliTag" : "",
  },
};

export default nextConfig;
