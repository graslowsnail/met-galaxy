/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/art/:id",
        destination: "/?path=:id",
        permanent: false,
      },
    ];
  },
};

export default config;
