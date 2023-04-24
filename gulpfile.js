const { src, dest } = require("gulp");
const minifyJs = require("gulp-minify");
const concat = require("gulp-concat");

const bundleJs = () => {
  return src([
    "./js/leaflet/leaflet.js",
    "./js/proj4/proj4.js",
    "./js/proj4leaflet/proj4leaflet.js",
    "./js/script.js",
  ])
    .pipe(minifyJs())
    .pipe(concat("bundle.js"))
    .pipe(dest("dist"));
};

exports.bundleJs = bundleJs;
