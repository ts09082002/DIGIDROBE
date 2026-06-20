module.exports = function (api) {
    api.cache(true);

    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-transform-flow-strip-types', { allowDeclareFields: true }],
            'react-native-reanimated/plugin', // MUST be last
        ],
    };
};
