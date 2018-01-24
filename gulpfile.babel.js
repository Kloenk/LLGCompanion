import gulp from 'gulp';
import pump from 'pump';
import rimraf from 'rimraf';
import rollupPluginBabel from 'rollup-plugin-babel';
import rollupPluginUglify from 'rollup-plugin-uglify';
import cleanCss from 'postcss-clean';
import normalize from 'postcss-normalize';
import autoprefixer from 'autoprefixer';
import {
	minify
} from 'uglify-es';
import {
	execSync
} from 'child_process';
import {
	readFileSync
} from 'fs';

const loadGulpPlugins = require('gulp-load-plugins');
const gulpPlugins = loadGulpPlugins();
const browsers = ['last 2 versions'];

function gitRevision () {
	return execSync('git describe --tags --always --abbrev=7 --dirty', {
		cwd: __dirname
	}).toString().trim();
}

gulp.task('clean', () => {
	rimraf.sync('tmp');
	rimraf.sync('dev');
	rimraf.sync('dist');
});

gulp.task('js', (cb) => {
	pump([
		gulp.src('app/main.js'),
		gulpPlugins.sourcemaps.init(),
		gulpPlugins.rollup({
			allowRealFiles: true,
			input: 'app/main.js',
			format: 'iife',
			plugins: [
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
		gulp.dest('dist'),
		gulpPlugins.sourcemaps.write(),
		gulp.dest('dev')
	], cb);
});

gulp.task('sw', (cb) => {
	pump([
		gulp.src('app/sw.js'),
		gulpPlugins.sourcemaps.init(),
		gulpPlugins.rollup({
			allowRealFiles: true,
			input: 'app/sw.js',
			format: 'es',
			plugins: [
				rollupPluginUglify({
					toplevel: true
				}, minify)
			]
		}),
		gulpPlugins.replace('${BUILD_DATE}', new Date().valueOf()),
		gulp.dest('dist'),
		gulpPlugins.sourcemaps.write(),
		gulp.dest('dev')
	], cb);
});

gulp.task('css', (cb) => {
	pump([
		gulp.src('app/main.css'),
		gulpPlugins.sourcemaps.init(),
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
		gulp.dest('dist'),
		gulp.dest('dev')
	], cb);
});

gulp.task('html', ['css'], (cb) => {
	pump([
		gulp.src('app/*.html'),
		gulpPlugins.htmlmin({
			collapseWhitespace: true
		}),
		gulpPlugins.replace('${GIT_REVISION}', gitRevision()),
		gulpPlugins.replace('${INLINE_CSS}', readFileSync('tmp/main.css')),
		gulp.dest('dist'),
		gulp.dest('dev')
	], cb);
});

gulp.task('manifest', (cb) => {
	pump([
		gulp.src('app/*.json'),
		gulpPlugins.jsonminify(),
		gulp.dest('dist'),
		gulp.dest('dev')
	], cb);
});

gulp.task('watch', ['dist'], () => {
	gulp.watch('app/*.js', ['js', 'html', 'sw']);
	gulp.watch('app/*.{css,html}', ['html', 'sw']);
	gulp.watch('app/*.json', ['manifest', 'html', 'sw']);
	gulp.watch('app/sw.js', ['html', 'sw']);
});

gulp.task('dist', ['clean', 'copy', 'js', 'html', 'manifest', 'sw']);

gulp.task('default', ['dist']);
