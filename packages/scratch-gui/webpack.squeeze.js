const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const squeezeRoot = path.resolve(__dirname, '../../src');
const brandingRoot = path.resolve(__dirname, '../../assets/branding');

module.exports = {
    squeezeRoot,
    brandingRoot,
    getResolveAlias () {
        return {
            squeeze: squeezeRoot,
            'squeeze-branding': brandingRoot
        };
    },
    getResolveExtensions () {
        return ['.wasm', '.mjs', '.js', '.jsx', '.json'];
    },
    getBabelInclude () {
        return squeezeRoot;
    },
    getExtraEntries () {
        return {
            'pyodide-worker/worker': path.join(squeezeRoot, 'pyodide-worker/worker.js')
        };
    },
    getExtraPlugins () {
        return [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(squeezeRoot, 'python-extension/index.js'),
                        to: 'python-extension/index.js'
                    },
                    {
                        from: path.resolve(__dirname, '../../public/pyodide'),
                        to: 'pyodide',
                        noErrorOnMissing: true
                    },
                    {
                        from: path.join(brandingRoot, 'logo.png'),
                        to: 'images/squeeze-logo.png',
                        noErrorOnMissing: true
                    },
                    {
                        from: path.join(brandingRoot, 'logo.png'),
                        to: 'images/apple-touch-icon.png',
                        noErrorOnMissing: true
                    }
                ]
            })
        ];
    },
    getDefinePluginValues () {
        return {
            'process.env.REACT_APP_PYODIDE_URL': JSON.stringify(
                process.env.REACT_APP_PYODIDE_URL || (
                    process.env.NODE_ENV === 'production' ? '/pyodide/' : 'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/'
                )
            )
        };
    }
};
