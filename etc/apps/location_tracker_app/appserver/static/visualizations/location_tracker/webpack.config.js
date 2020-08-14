var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: 'location_tracker',
    resolve: {
        modules: [
            path.join(__dirname, 'src'),
            "node_modules"
        ]
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components|search_mrsparkle)/,
                use: [
                    {
                        loader: 'babel-loader'
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader!css-loader'
                    }
                ]
            },
            {
                test: /\.png$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: '100000'
                        }
                    }
                ]
            }
        ]
    },
    output: {
        path: path.join(__dirname),
        filename: 'visualization.js',
        libraryTarget: 'amd'
    },
    externals: [
        'api/SplunkVisualizationBase',
        'api/SplunkVisualizationUtils'
    ]
};