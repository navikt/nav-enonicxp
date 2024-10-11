export default {
    plugins: ['@anders-nom/babel-plugin-import-graphql-string', './babel-logger-transformer'],
    presets: ['@babel/preset-env', '@babel/preset-typescript'],
};
