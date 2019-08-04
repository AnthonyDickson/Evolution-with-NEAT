const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
require("babel-register");

const config = {
    entry: {
        bundle: path.join(__dirname, 'app/index.js'),
        worker: path.join(__dirname, 'app/worker.js')
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    module: {
        rules: [{
            test: /\.js/,
            exclude: /(node_modules|bower_components)/,
            use: [{
                loader: 'babel-loader'
            }]
        },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Genetic Algorithms',
            template: "app/index.html"
        })
    ],
    stats: {
        colors: true
    },
    devtool: 'source-map',
    watch: true,
    mode: "development",
    devServer: {
        contentBase: './dist',
        inline: true,
        port: 3000
    }
};

module.exports = config;