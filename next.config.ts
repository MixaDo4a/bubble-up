import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/legacy/index.html" },
      { source: "/admin", destination: "/legacy/admin.html" },
      { source: "/admin.html", destination: "/legacy/admin.html" },
      { source: "/product-options.html", destination: "/legacy/product-options.html" },
      { source: "/index.html", destination: "/legacy/index.html" },
      { source: "/product.html", destination: "/legacy/product.html" },
    ];
  },
};

export default nextConfig;
