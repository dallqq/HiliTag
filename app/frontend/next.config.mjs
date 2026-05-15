/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/predict",
        destination: process.env.FLASK_API_URL
          ? `${process.env.FLASK_API_URL}/api/predict`
          : "http://localhost:5000/api/predict",
      },
    ];
  },
};

export default nextConfig;
