module.exports = {
    apps: [
        {
            name: "alizzah-api",
            script: "apps/api/dist/index.js",
            interpreter: "node",
            env: {
                NODE_ENV: "production",
                PORT: 3001,
            }
        },
        {
            name: "alizzah-web-keuangan",
            script: "apps/web-keuangan/.output/server/index.mjs", // Output dari Nitro/Vinxi server
            interpreter: "node",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            }
        }
    ]
};
