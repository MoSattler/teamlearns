/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
    ignoredRouteFiles: ['**/.*'],
    assetsBuildDirectory: 'public/web-old/build',
    publicPath: '/web-old/build/',
    serverDependenciesToBundle: ['@org/ui'],
    // appDirectory: "app",
    // serverBuildPath: "build/index.js",
    watchPaths: ['../../packages/ui', '../../packages/shared'],
};
