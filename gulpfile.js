const gulp = require('gulp');
const pump = require('pump');
const rimraf = require('rimraf');
const rollupPluginBabel = require('rollup-plugin-babel');
const rollupPluginUglify = require('rollup-plugin-uglify');
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

function gitRevision () {
	return execSync('git describe --tags --always --abbrev=7 --dirty', {
		cwd: __dirname
	}).toString().trim();
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
		gulpPlugins.replace('${BUILD_DATE}', new Date().valueOf()),
		gulp.dest('dist')
	], cb);
});

gulp.task('css', (cb) => {
	pump([
		gulp.src('app/main.css'),
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
		gulpPlugins.replace('${GIT_REVISION}', gitRevision()),
		gulpPlugins.replace('${INLINE_CSS}', readFileSync('tmp/main.css')),
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

gulp.task('dist', gulp.parallel('clean', 'copy', 'js', gulp.series('css', 'html'), 'manifest', 'sw'));

gulp.task('watch', gulp.series('dist', () => {
	gulp.watch('app/*.js', gulp.series('js', 'html', 'sw'));
	gulp.watch('app/*.{css}', gulp.series('css', 'html', 'sw'));
	gulp.watch('app/*.{html}', gulp.series('html', 'sw'));
	gulp.watch('app/*.json', gulp.series('manifest', 'html', 'sw'));
	gulp.watch('app/sw.js', gulp.series('html', 'sw'));
}));

gulp.task('default', gulp.series('dist'));
