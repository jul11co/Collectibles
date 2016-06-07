var async = require('async');
var path = require('path');
var ua = require('unpack-all');
var fse = require('fs-extra');
var crypto = require('crypto');

// http://stackoverflow.com/questions/2998784/
function numberPad(num, size) {
  var s = "000000000" + num;
  return s.substr(s.length-size);
}

exports.startRead = function(comic_file, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  
  var result = {};

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

    // var comic_hash = crypto.createHash('md5').update(comic_file).digest("hex")
    // var tmpdir = options.tmpdir || path.join(__dirname, '..', '.reading', comic_hash);
    var tmpdir = options.tmpdir || path.join(__dirname, '..', '.tmp/reading');
    fse.emptyDirSync(tmpdir); // cleaned if exists, created if not exist

    // result.cover_image = path.join(tmpdir, cover_page);
    
    // unpack to get cover page
    ua.unpack(comic_file, {
      targetDir: tmpdir,
      noDirectory: true
    }, function(err) {
      if (err) return callback(err);

      result.files = [];

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (/\.jpg|\.jpeg|\.png|\.gif/.test(file.toLowerCase())) {
          var imagefile = 'page-' + numberPad(i, 3) + path.extname(file);
          var targetfile = path.join(tmpdir, imagefile);
          try {
            fse.copySync(path.join(tmpdir, file), targetfile);
            result.files.push(targetfile);
          } catch(e) {
            console.log(e);
          }
        }
      }

      callback(null, result);      
    });
  });
}