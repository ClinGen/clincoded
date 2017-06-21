'use strict';

if (process.env.NODE_ENV == 'production'){
    console.log("\n****** PRODUCTION ENVIRONMENT ******\n");
}

//eslint directive to ignore "undefined" global variables 
/* global __dirname process */

module.exports = function(grunt) {
    var path = require('path');

    function compressPath(p) {
        var src = 'src/clincoded/static/';
        p = path.relative(__dirname, p);
        if (p.slice(0, src.length) == src) {
            return '../' + p.slice(src.length);
        }
        return '../../' + p;
    }

    grunt.config('env', grunt.option('env') || process.env.GRUNT_ENV || 'production');
    var minifyEnabled = grunt.config('minifyEnabled', grunt.config('env') === 'production');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            brace: {
                dest: './src/clincoded/static/build/brace.js',
                require: [
                    'brace',
                    'brace/mode/json',
                    'brace/theme/solarized_light'
                ],
                plugin: [
                    ['minifyify', {
                        minify: minifyEnabled,
                        map: 'brace.js.map',
                        output: './src/clincoded/static/build/brace.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'}
                    }]
                ]
            },
            inline: {
                dest: './src/clincoded/static/build/inline.js',
                src: [
                    './src/clincoded/static/inline.js'
                ],
                require: [
                    'scriptjs',
                    'google-analytics'
                ],
                transform: [
                    ['babelify', {sourceMaps: true, babelrc: true}],
                    'brfs',
                    ['envify', {NODE_ENV: JSON.stringify("production")}]
                ],
                plugin: [
                    ['minifyify', {
                        minify: minifyEnabled,
                        map: '/static/build/inline.js.map',
                        output: './src/clincoded/static/build/inline.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'}
                    }]
                ]
            },
            browser: {
                dest: './src/clincoded/static/build/bundle.js',
                src: [
                    'es5-shims',
                    'es5-shim/es5-sham',
                    'babel-polyfill',
                    'html5shiv/dist/html5shiv',
                    './src/clincoded/static/libs/compat.js', // The shims should execute first
                    './src/clincoded/static/libs/sticky_header.js',
                    './src/clincoded/static/libs/respond.js',
                    './src/clincoded/static/browser.js'
                ],
                external: [
                    'brace',
                    'brace/mode/json',
                    'brace/theme/solarized_light',
                    'scriptjs',
                    'google-analytics'
                ],
                transform: [
                    ['babelify', {sourceMaps: true, babelrc: true}],
                    'brfs',
                    ['envify', {NODE_ENV: JSON.stringify("production")}]
                ],
                plugin: [
                    ['minifyify', {
                        minify: minifyEnabled,
                        map: 'bundle.js.map',
                        output: './src/clincoded/static/build/bundle.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'}
                    }]
                ]
            },
            server: {
                dest: './src/clincoded/static/build/renderer.js',
                src: ['./src/clincoded/static/server.js'],
                options: {
                    builtins: false,
                    detectGlobals: false
                },
                transform: [
                    ['babelify', {sourceMaps: true, babelrc: true}],
                    'brfs',
                    ['envify', {NODE_ENV: JSON.stringify("production")}]
                ],
                plugin: [
                    ['minifyify', {
                        minify: minifyEnabled,
                        map:'renderer.js.map',
                        output: './src/clincoded/static/build/renderer.js.map',
                        compressPath: compressPath,
                        uglify: {mangle: process.env.NODE_ENV == 'production'}
                    }]
                ],
                external: [
                    'assert',
                    'brace',
                    'brace/mode/json',
                    'brace/theme/solarized_light',
                    'source-map-support'
                ],
                ignore: [
                    'jquery',
                    'scriptjs',
                    'google-analytics',
                    'ckeditor'
                ]
            }
        },
        copy: {
            ckeditor: {
                expand: true,
                cwd: 'node_modules/node-ckeditor',
                src: 'ckeditor/**',
                dest: 'src/clincoded/static/build/'
            }
        },
        filerev: {
            options: {
                algorithm: 'md5',
                length: 8
            },
            css: {
                src: ['./src/clincoded/static/css/style.css'],
                dest: './src/clincoded/static/css'
            },
            js: {
                src: ['./src/clincoded/static/build/bundle.js'],
                dest: './src/clincoded/static/build/'
            }
        },
        replace: {
            dist: {
                options: {
                    patterns: [
                        {
                            match: 'bundleJsFile',
                            replacement: function () {
                                return grunt.filerev.summary["src/clincoded/static/build/bundle.js"].replace(new RegExp('src/clincoded'), '');
                            }
                        },
                        {
                            match: 'cssFile',
                            replacement: function () {
                                return grunt.filerev.summary["src/clincoded/static/css/style.css"].replace(new RegExp('src/clincoded'), '');
                            }
                        }
                    ]
                },
                files: [
                    {expand: true, flatten: true, src: ['src/clincoded/static/build/*.js'], dest: 'src/clincoded/static/build/'}
                ]
            },
            dev: {
                options: {
                    patterns: [
                        {
                            match: 'bundleJsFile',
                            replacement: "/static/build/bundle.js"
                        },
                        {
                            match: 'cssFile',
                            replacement: "/static/css/style.css"
                        }
                    ]
                },
                files: [
                    {expand: true, flatten: true, src: ['src/clincoded/static/build/*.js'], dest: 'src/clincoded/static/build/'}
                ]
            }
        },
        compass: {
            dev: {}
        },
        watch: {
            scripts: {
                files: 'src/clincoded/static/components/**/*.js',
                tasks: ['browserify:browser', 'browserify:server', 'replace:dev']
            },
            css: {
                files: 'src/clincoded/static/scss/**/*.scss',
                tasks: ['compass']
            }
        }
    });

    grunt.registerMultiTask('browserify', function () {
        var browserify = require('browserify');
        var _ = grunt.util._;
        var path = require('path');
        var fs = require('fs');
        var exorcist   = require('exorcist');
        var data = this.data;
        var options = _.extend({
            debug: true,
            cache: {},
            packageCache: {}
        }, data.options);

        var b = browserify(options);
        var i;
        var reqs = [];
        (data.src || []).forEach(function (src) {
            reqs.push.apply(reqs, grunt.file.expand({filter: 'isFile'}, src).map(function (f) {
                return [path.resolve(f), {entry: true}];
            }));
        });
        (data.require || []).forEach(function (req) {
            if (typeof req === 'string') req = [req];
            reqs.push(req);
        });

        for (i = 0; i < reqs.length; i++) {
            b.require.apply(b, reqs[i]);
        }

        var external = data.external || [];
        for (i = 0; i < external.length; i++) {
            b.external(external[i]);
        }

        options.filter = function (id) {
            return external.indexOf(id) < 0;
        };

        var ignore = data.ignore || [];
        for (i = 0; i < ignore.length; i++) {
            b.ignore(ignore[i]);
        }

        (data.transform || []).forEach(function (args) {
            if (typeof args === 'string') args = [args];
            b.transform.apply(b, args);
        });

        (data.plugin || []).forEach(function (args) {
            if (typeof args === 'string') args = [args];
            b.plugin.apply(b, args);
        });

        var dest = data.dest;
        grunt.file.mkdir(path.dirname(dest));
        var mapFilePath = dest + '.map';

        var bundle = function(done) {
            var out = fs.createWriteStream(dest);
            if (!minifyEnabled) {
                console.log("write map files in dev " + mapFilePath );
                b.bundle({ debug: true })
                    .pipe(exorcist(mapFilePath))
                    .pipe(out);
            } else {
                b.bundle().pipe(out);
            }
            out.on('close', function() {
                grunt.log.write('Wrote ' + dest + '\n');
                if (done !== undefined) done();
            });
        };
        b.on('update', function() { bundle(); });
        var done = this.async();
        bundle(done);
    });

    grunt.registerTask('wait', function() {
        grunt.log.write('Waiting for changes...\n');
        this.async();
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-filerev');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['browserify', 'copy', 'filerev', 'replace:dist']);
    grunt.registerTask('dev', ['browserify','replace:dev', 'watch']);

};

