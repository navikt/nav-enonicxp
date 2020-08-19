const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = function (env, config) {
    const updatedConfig = config;
    // This makes 'npm link' symlinks in node_modules work:
    updatedConfig.resolve.symlinks = true;

    // Compile .scss and friends:
    updatedConfig.module.rules = [
        ...(updatedConfig.module.rules || []),
        {
            test: /\.less$/,
            use: [
                {
                    loader: 'style-loader',
                },
                {
                    loader: 'css-loader',
                },
                {
                    loader: 'less-loader',
                    options: {
                        lessOptions: {
                            strictMath: false,
                        },
                    },
                },
            ],
        },
        {
            test: /\.((sa|sc|c))ss$/i,
            use: [
                MiniCssExtractPlugin.loader,
                {
                    loader: 'css-loader',
                    options: {
                        importLoaders: 1,
                        modules: { auto: true },
                    },
                },
                {
                    loader: 'sass-loader',
                    options: {
                        sassOptions: {
                            outputStyle: 'compressed',
                        },
                    },
                },
            ],
        },
    ];

    // Set up how the compiled assets are exported:
    updatedConfig.plugins = [
        ...(updatedConfig.plugins || []),
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].[contenthash:9].css',
        }),
    ];

    return updatedConfig;
};
