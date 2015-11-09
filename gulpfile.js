var gulp = require('gulp');
var connect = require('gulp-connect');

gulp.task('connect', function() {
  connect.server({
    root: 'src'
  });
});

gulp.task('default', ['connect']);

