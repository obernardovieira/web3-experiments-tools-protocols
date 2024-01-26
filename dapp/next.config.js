/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // to work with antd
    transpilePackages: [
        "antd",
        "rc-util",
        "@ant-design/icons",
        "@ant-design/icons-svg",
        "rc-pagination",
        "rc-picker",
        "rc-tree",
        "rc-table",
    ]
};

module.exports = nextConfig;
