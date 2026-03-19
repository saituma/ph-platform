import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
  turbopack: {
    root: path.join(dirname, "../.."),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
