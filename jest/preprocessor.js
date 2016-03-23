'use strict';

var babel = require('babel-core');
var jestPreset = require('babel-preset-jest');

var ignored = {
    'underscore.js': true,
    'moment.js': true
};

module.exports = {
    process: function (src, path) {
        if (path.slice(-5) === '.node') return '';
        if (path.slice(-3) !== '.js') return src;
        if (ignored[path.split('/').slice(-1)[0]]) return src;
        if (babel.util.canCompile(path)) {
            return babel.transform(src, {
                filename: path,
                presets: [jestPreset],
                retainLines: true,
                auxiliaryCommentBefore: "istanbul ignore next"
            }).code;
        }
        return src;
    }
};