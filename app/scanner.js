#!/usr/bin/env node

var async = require('async');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var util = require('util');

var LevelStore = require('../lib/levelstore');
var md5cache = require('../lib/md5cache');

var config = require('./config');

var dispatchers = [];
fs.readdirSync(__dirname + '/dispatchers').forEach(function(file) {
  if (file.indexOf('.js') > 0) {
    // console.log(file);
    var dispatcher = require("./dispatchers/" + file);
    dispatchers.push(new dispatcher());
  }
});

function printUsage() {
  console.log('Usage: collectibles-scanner [OPTIONS] <DIRECTORY>');
  console.log('');
  console.log('OPTIONS:');
  console.log('  --magazine       : to scan magazines (PDF files)');
  console.log('  --book           : to scan books (PDF files)');
  console.log('  --comic          : to scan comics (CBR, CBZ,... files)');
  console.log('');
  console.log('  --rescan         : to retrieve information from already added files');
  console.log('  --update-path    : to update path of files (useful when you moving them to other places)');
  console.log('  --force-update   : to override previous added information');
  console.log('');
}

var argv = [];
var options = {};
for (var i = 2; i < process.argv.length; i++) {
  if (process.argv[i] == '--magazine') {
    options.magazine = true;
  } else if (process.argv[i] == '--comic') {
    options.comic = true;
  } else if (process.argv[i] == '--book') {
    options.book = true;
  } else if (process.argv[i] == '--ignore-errors') {
    options.ignore_errors = true;
  } else if (process.argv[i] == '--errors') {
    options.ignore_errors = false;
  } /*else if (process.argv[i] == '--import') {
    options.import = true;
  }*/ else if (process.argv[i] == '--rescan') {
    options.rescan = true;
  } else if (process.argv[i] == '--update-path') {
    options.update_path = true;
  } else if (process.argv[i] == '--force-update') {
    options.force_update = true;
  } else {
    argv.push(process.argv[i]);
  }
}

if (typeof options.ignore_errors == 'undefined') {
  options.ignore_errors = true;
}

if (!argv[0]) {
  printUsage();
  process.exit();
}

var INPUT_DIR = argv[0];
INPUT_DIR = path.resolve(INPUT_DIR);
console.log('Input dir: ' + INPUT_DIR);

fse.ensureDirSync(config.getDataFolder());
fse.ensureDirSync(config.getDataPath('magazine_covers'));
fse.ensureDirSync(config.getDataPath('comic_covers'));
fse.ensureDirSync(config.getDataPath('book_covers'));

var scannerdb = new LevelStore(config.getDataPath('scanner'));

md5cache.setDataStore(config.getDataPath('md5cache'));

function ellipsisMiddle(str, max_length, first_part, last_part) {
  if (!max_length) max_length = 140;
  if (!first_part) first_part = 40;
  if (!last_part) last_part = 20;
  if (str.length > max_length) {
    return str.substr(0, first_part) + '...' + str.substr(str.length-last_part, str.length);
  }
  return str;
}

var dispatchFile = function(file, options, callback) {
  async.eachSeries(dispatchers, function(dispatcher, cb) {
    if (options.magazine) {
      if (dispatcher.type == 'magazine') {
        dispatcher.dispatch(file, options, cb);
      } else {
        cb();
      }
    } else if (options.comic) {
      if (dispatcher.type == 'comic') {
        dispatcher.dispatch(file, options, cb);
      } else {
        cb();
      }
    } else if (options.book) {
      if (dispatcher.type == 'book') {
        dispatcher.dispatch(file, options, cb);
      } else {
        cb();
      }
    } else {
      dispatcher.dispatch(file, options, cb);
    }
  }, function(err) {
    if (err) return callback(err);
    callback();
  });
}

var scanDirRecursive = function(abspath, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  console.log('Directory:', ellipsisMiddle(abspath));

  var dirlist = [];
  dirlist.push(abspath);

  var filelist = [];
  fs.readdir(abspath, function(err, files) {
    if (err) return callback(err);

    async.eachSeries(files, function(file, cb) {
      
      if (file.indexOf('.') == 0) {
        return cb();
      }

      var file_abs_path = path.join(abspath, file);

      var stats = undefined;
      try {
        stats = fs.lstatSync(file_abs_path);
      } catch(e) {
        console.log(e);
        return cb();
      }
      if (!stats) return cb();
      
      // console.log(stats);
      if (stats.isFile()) {
          var file_type = path.extname(file).replace('.','');
          
          var file_info = {
            path: file_abs_path,
            name: file,
            type: file_type,
            size: stats['size']
          };

          filelist.push(file_info);
          cb();
      } else if (stats.isDirectory()) {
        scanDirRecursive(file_abs_path, options, function(err, files, dirs) {
          if (err) return cb(err);

          filelist = filelist.concat(files);
          dirlist = dirlist.concat(dirs);
          cb();
        });
      } else {
        cb();
      }
    }, function(err) {
      callback(err, filelist, dirlist);
    });
  });
}

console.log('Scanning files...');
scanDirRecursive(INPUT_DIR, options, function(err, files, dirs) {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Files:', files.length);

  var errors = [];
  var imported = [];

  var total = files.length;
  var count = 0;
  async.eachSeries(files, function(file, cb) {
    count++;
    console.log('Progress:', count + '/' + total);
    console.log('File:', file.path);
    scannerdb.get(file.path, function(err, value) {
      if (err) return cb(err);
      if (value && !options.rescan) return cb();

      dispatchFile(file, options, function(err) {
        if (err) {
          console.log('dispatch error:', file.path);
          errors.push({
            file: file.path,
            error: err.message
          });
          if (options.ignore_errors) {
            // console.log(err);
            return cb();
          }
          return cb(err);
        }

        imported.push(file.path);
        scannerdb.set(file.path, file, function(err) {
          if (err) return cb(err);
          cb();
        });
      });
    });
  }, function(err) {
    if (err) {
      console.log(err);
    }
    console.log(dirs.length + ' directories, ' + files.length + ' files.');
    console.log(imported.length + ' imported.');
    console.log(errors.length + ' errors.');
    if (errors.length) {
      errors.forEach(function(error) {
        console.log(error);
      });
    } else {
      console.log('Done.');
    }
  });
});