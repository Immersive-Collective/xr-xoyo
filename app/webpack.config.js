const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    devtool: 'source-map',
    module: {
        rules: [{
                test: /\.handpose$/,
                use: 'file-loader',
                include: [path.resolve(__dirname, 'node_modules/handy-work/poses')],
            },
            {
                test: /\.wasm$/,
                type: "webassembly/async"
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.(glb|gltf)$/,
                use: {
                    loader: '@loaders.gl/gltf',
                    options: { type: 'arraybuffer' }
                }
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'assets/images/',
                    },
                }, ],
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Three.js with Webpack',
            template: './src/index.html',
        }),
        new CopyPlugin({

            patterns: [{
                    from: 'src/libs/hands/models',
                    to: 'hands/models',
                    globOptions: {
                        ignore: ['**/*.blend'] // Ignore .psd and .blend files
                    }
                },
                { from: 'src/assets/models', to: 'assets/models', globOptions: { ignore: ['**/*.blend'] } },
                { from: 'src/assets/audio', to: 'assets/audio' },
                { from: 'src/assets/fonts', to: 'assets/fonts' },
                { from: 'src/assets/data', to: 'assets/data' },
                { from: 'src/assets/video', to: 'assets/video' },
                {
                    from: 'src/assets/images',
                    to: 'assets/images',
                    globOptions: {
                        ignore: ['**/*.psd'] // Ignore .psd and .blend files
                    }
                },
                { from: 'node_modules/three/examples/jsm/libs/draco/', to: 'draco_decoder/' }
            ],


        }),
    ],
    devServer: {
        static: path.join(__dirname, 'dist'),
        https: {
            key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem')),
        },
    },
    experiments: {
        asyncWebAssembly: true
    },
};