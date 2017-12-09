const gulp = require('gulp')
const cleanCss = require('gulp-clean-css')
const autoprefixer = require('gulp-autoprefixer')
const htmlmin = require('gulp-htmlmin')
const sourcemaps = require('gulp-sourcemaps')
const browserSync = require('browser-sync')
const pump = require('pump')
const rimraf = require('rimraf')
const rollup = require('gulp-rollup')
const rollupResolve = require('rollup-plugin-node-resolve')
const rollupUglify = require('rollup-plugin-uglify')
const minify = require('uglify-es').minify

const browsers = ['>1% in DE']

gulp.task('clean', () => {
  rimraf.sync('dev')
  rimraf.sync('dist')
})

gulp.task('scripts', (cb) => {
  pump([
    gulp.src('app/scripts/main.js'),
    sourcemaps.init(),
    rollup({
      allowRealFiles: true,
      input: 'app/scripts/main.js',
      format: 'iife',
      plugins: [
        rollupUglify({
          toplevel: true
        }, minify)
      ]
    }),
    gulp.dest('dist'),
    sourcemaps.write(),
    gulp.dest('dev')
  ], cb)
})

gulp.task('sw', (cb) => {
  pump([
    gulp.src('app/sw.js'),
    sourcemaps.init(),
    rollup({
      allowRealFiles: true,
      input: 'app/sw.js',
      format: 'es',
      plugins: [
        rollupUglify({
          toplevel: true
        }, minify)
      ]
    }),
    gulp.dest('dist'),
    sourcemaps.write(),
    gulp.dest('dev')
  ], cb)
})

gulp.task('styles', (cb) => {
  pump([
    gulp.src('app/styles/main.css'),
    sourcemaps.init(),
    autoprefixer({
      browsers: browsers
    }),
    cleanCss(),
    gulp.dest('dist'),
    sourcemaps.write(),
    gulp.dest('dev'),
    browserSync.stream()
  ], cb)
})

gulp.task('copy', (cb) => {
  pump([
    gulp.src(['app/**', '!app/**/*.{html,css,js}'], {dot: true}),
    gulp.dest('dist'),
    gulp.dest('dev')
  ], cb)
})

gulp.task('html', (cb) => {
  pump([
    gulp.src('app/**/*.html'),
    htmlmin(),
    gulp.dest('dist'),
    gulp.dest('dev')
  ], cb)
})

gulp.task('serve', ['dist'], () => {
  browserSync.init({
    server: {
      baseDir: 'dev'
    }
  })

  gulp.watch('app/**/*.html', ['html', browserSync.reload])
  gulp.watch('app/scripts/*.js', ['scripts', browserSync.reload])
  gulp.watch('app/sw.js', ['scripts', browserSync.reload])
  gulp.watch('app/styles/*.css', ['styles'])
})

gulp.task('dist', ['clean', 'scripts', 'styles', 'sw', 'copy', 'html'])

gulp.task('default', ['dist'])
