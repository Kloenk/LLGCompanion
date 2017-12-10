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
const execSync = require('child_process').execSync
const replace = require('gulp-replace')

const browsers = ['>1% in DE']

function gitRevision() {
  return execSync('git describe --always --abbrev=7 --dirty', { cwd: __dirname }).toString().trim()
}

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
    replace('${BUILD_DATE}', new Date().valueOf()),
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
    replace('${GIT_REVISION}', gitRevision()),
    gulp.dest('dist'),
    gulp.dest('dev')
  ], cb)
})

gulp.task('serve', ['dist'], () => {
  browserSync.init({
    proxy: 'localhost:8080/'
  })

  gulp.watch('app/**/*.html', ['html', 'sw', browserSync.reload])
  gulp.watch('app/scripts/*.js', ['scripts', 'sw', browserSync.reload])
  gulp.watch('app/sw.js', ['sw', browserSync.reload])
  gulp.watch('app/styles/*.css', ['styles', 'sw'])
})

gulp.task('dist', ['clean', 'scripts', 'styles', 'copy', 'html', 'sw'])

gulp.task('default', ['dist'])
