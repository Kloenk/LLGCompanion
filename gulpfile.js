const gulp = require('gulp');
const pump = require('pump');
const rimraf = require('rimraf');
const rollupPluginBabel = require('rollup-plugin-babel');
const rollupPluginUglify = require('rollup-plugin-uglify');
const rollupPluginResolve = require('rollup-plugin-node-resolve');
const rollup = require('rollup-stream');
const loadGulpPlugins = require('gulp-load-plugins');
const cleanCss = require('postcss-clean');
const normalize = require('postcss-normalize');
const autoprefixer = require('autoprefixer');
const source = require('vinyl-source-stream');
const { minify } = require('uglify-es');
const { execSync } = require('child_process');
const { readFileSync } = require('fs');

const gulpPlugins = loadGulpPlugins();
const browsers = ['last 2 versions'];

// load config
var config;
const defaultConf = config = require('./config.example.json');
try {
	config = require('./config.json');
} catch (e) {
	config = defaultConf;
}

// functions for replacing
function gitRevision () {
	return execSync('git describe --tags --always --abbrev=7 --dirty', {
		cwd: __dirname
	}).toString().trim();
}

function gitUrl () {
	return execSync('git remote get-url origin', {
		cwd: __dirname
	}).toString().trim();
}

function impressumUrl () {
	if (config.hasOwnProperty('html')) {
		if (config.html.hasOwnProperty('impressumUrl')) {
			return config.html.impressumUrl;
		}
	}
	return defaultConf.html.impressumUrl;
}

gulp.task('clean', (done) => {
	rimraf.sync('tmp');
	rimraf.sync('dist');
	done();
});

gulp.task('js', (cb) => {
	pump([
		rollup({
			input: 'app/main.js',
			format: 'iife',
			plugins: [
				rollupPluginResolve(),
				rollupPluginBabel({
					babelrc: false,
					presets: [
						[
							'env',
							{
								targets: {
									browsers: browsers
								},
								modules: false
							}
						]
					],
					plugins: ['external-helpers']
				}),
				rollupPluginUglify({
					toplevel: true
				}, minify)
			]
		}),
		source('main.js'),
		gulpPlugins.replace('__GIT_REVISION', gitRevision()),
		gulpPlugins.replace('__GIT_URL', gitUrl()),
		gulpPlugins.replace('__IMPRESSUM_URL', impressumUrl()),
		gulp.dest('dist')
	], cb);
});

gulp.task('colorlib-js', (cb) => {
	pump([
		rollup({
			input: 'app/colorlib.js',
			format: 'iife',
			plugins: [
				rollupPluginResolve(),
				rollupPluginBabel({
					babelrc: false,
					presets: [
						[
							'env',
							{
								targets: {
									browsers: browsers
								},
								modules: false
							}
						]
					],
					plugins: ['external-helpers']
				}),
				rollupPluginUglify({
					toplevel: true
				}, minify)
			]
		}),
		source('colorlib.js'),
		gulp.dest('dist')
	], cb);
});

gulp.task('sw', (cb) => {
	pump([
		rollup({
			input: 'app/sw.js',
			format: 'es',
			plugins: [
				rollupPluginUglify({
					toplevel: true
				}, minify)
			]
		}),
		source('sw.js'),
		gulpPlugins.replace('__BUILD_DATE', new Date().valueOf()),
		gulp.dest('dist')
	], cb);
});

gulp.task('css', (cb) => {
	pump([
		gulp.src('app/*.css'),
		gulpPlugins.postcss([
			autoprefixer({
				browsers: browsers
			}),
			normalize({
				browsers: browsers
			}),
			cleanCss()
		]),
		gulp.dest('tmp')
	], cb);
});

gulp.task('copy', (cb) => {
	pump([
		gulp.src(['app/**', '!app/*.{html,css,js,json}'], {
			dot: true
		}),
		gulp.dest('dist')
	], cb);
});

gulp.task('html', (cb) => {
	pump([
		gulp.src('app/*.html'),
		gulpPlugins.htmlmin({
			collapseWhitespace: true
		}),
		gulpPlugins.replace('__INLINE_CSS', readFileSync('tmp/main.css')),
		gulpPlugins.replace('__COLORLIB_CSS', readFileSync('tmp/colorlib.css')),
		gulp.dest('dist')
	], cb);
});

gulp.task('manifest', (cb) => {
	pump([
		gulp.src('app/*.json'),
		gulpPlugins.jsonminify(),
		gulp.dest('dist')
	], cb);
});

gulp.task('dist', gulp.parallel('clean', 'copy', 'js', 'colorlib-js', gulp.series('css', 'html'), 'manifest', 'sw'));

gulp.task('watch', gulp.series('dist', () => {
	gulp.watch('app/*.js', gulp.series('js', 'html', 'sw'));
	gulp.watch('app/*.{css}', gulp.series('css', 'html', 'sw'));
	gulp.watch('app/*.{html}', gulp.series('html', 'sw'));
	gulp.watch('app/*.json', gulp.series('manifest', 'html', 'sw'));
	gulp.watch('app/sw.js', gulp.series('html', 'sw'));
}));

gulp.task('test', (done) => {
	console.log('FIXME: implement tests');
	done();
});

gulp.task('default', gulp.series('dist'));
