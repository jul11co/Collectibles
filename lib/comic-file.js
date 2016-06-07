var path = require('path');
var ua = require('unpack-all');
var fs = require('fs');
var fse = require('fs-extra');
var crypto = require('crypto');
var md5file = require('md5-file');

var easyimg = require('easyimage');

var md5cache = require('./md5cache');

exports.parse = function(comic_file, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var result = {};
  ua.list(comic_file, {}, function(err, files, text) {
    if (err) return callback(err);
    if (files) {
      files.sort();
      // console.log('files', files);
      result.pages = files.length;
      result.cover_page = files[0];
    }
    callback(null, result);
  });
}

var fileExists = function(file_path) {
  try {
    var stats = fs.statSync(file_path);
    if (stats.isFile()) {
      return true;
    }
  } catch (e) {
  }
  return false;
}

exports.parseAndExtractCoverImage = function(comic_file, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  
  var result = {};

  // result.md5sum = md5file.sync(comic_file);

  md5cache.getMD5(comic_file, function(err, md5sum) {
    if (err) return callback(err);

    result.md5sum = md5sum;

    // list files in archive
    ua.list(comic_file, {}, function(err, files, text) {
      if (err) return callback(err);
      if (!files) {
        return callback(new Error('No files available!'));
      }

      files.sort();
      // console.log('files', files);
      result.pages = files.length;

      var cover_page = undefined;
      for (var i = 0; i < files.length; i++) {
        if (/\.jpg|\.jpeg|\.png|\.gif/.test(files[i].toLowerCase())) {
          cover_page = files[i];
          break; // first satisfied file 
        }
      }
      if (!cover_page) {
        return callback(new Error('Cover page not found!'));
      }

      console.log('Cover page:', cover_page);

      var tmpdir = options.tmpdir || path.join(__dirname, '..', '.tmp/out');
      var outputdir = options.outputdir || path.join(__dirname, '..', '.tmp/comic_covers');
      fse.ensureDirSync(tmpdir);
      fse.ensureDirSync(outputdir);

      var cover_file = path.join(tmpdir, cover_page);
      var cover_image = path.join(
        outputdir,
        result.md5sum + path.extname(cover_file)
      );

      if (fileExists(cover_image)) {
        result.cover_image = cover_image;
        return callback(null, result);
      }

      fse.emptyDirSync(tmpdir); // cleaned if exists, created if not exist

      // unpack to get cover page
      ua.unpack(comic_file, {
        targetDir: tmpdir,
        noDirectory: true
      }, function(err, files, text) {
        if (err) return callback(err);

        // copy & resize the cover image to outputdir
        easyimg.resize({
          src: cover_file, 
          dst: cover_image,
          width: 640, 
          height: 400
        }).then(function (file) {
          result.cover_file = file;
          result.cover_image = file.path;
          callback(null, result);
        }, function(err) {
          callback(err);
        });
      });
    });
  });

}
