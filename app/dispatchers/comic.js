var path = require('path');
var md5file = require('md5-file');

var parseComicName = require('../../lib/parse-comic-name');
var comicFile = require('../../lib/comic-file');

var importer = require('../importer');

var config = require('../config');

var ComicDispatcher = function() {
  this.type = 'comic';
}

ComicDispatcher.prototype.dispatch = function(file, options, callback) {
  var file_name = file.name;
  var file_ext = path.extname(file_name);
  if (!/\.cbr|\.cbz|\.cbc|\.cbt|\.cba|\.cb7/.test(file_ext.toLowerCase())) {
    return callback();
  }
  
  var comic = parseComicName(file.name);
  // console.log(comic);

  if (!comic.name) {
    console.log('No name detected!');
    return callback(new Error('No name detected'));
  }
  if (!comic.year) {
    console.log('No year detected!');
    return callback(new Error('No year detected'));
  }

  var series_info = {
    name: comic.name
  };

  var issue_info = {
    filepath: file.path,
    filename: file.name,
    filesize: file.size,

    name: comic.name,
    release_year: parseInt(comic.year),
    format: comic.format
  };

  if (comic.issue) {
    issue_info.issue_no = comic.issue;
    issue_info.name += ' #' + comic.issue;
  }
  if (comic.volume) {
    issue_info.volume_no = comic.volume;
    issue_info.name += ' Vol. ' + comic.volume;
  }

  issue_info.release_date = new Date(issue_info.release_year, 0, 1, 0, 0, 0, 0);

  // console.log(issue_info);
  // return callback();

  comicFile.parseAndExtractCoverImage(file.path, {
    tmpdir: config.getDataPath('out'),
    outputdir: config.getDataPath('comic_covers')
  }, function(err, info) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    // console.log(info);

    if (info['pages']) {
      issue_info.pages = info['pages'];
    }
    if (info['cover_image']) {
      issue_info.cover_image = path.resolve('/', config.getRelativePath(info['cover_image']));
    }
    if (info['md5sum']) {
      issue_info.md5sum = info['md5sum'];
    }

    // console.log(issue_info);

    // if (options.import) {
      var import_data = {
        series: series_info,
        issue: issue_info
      };
      if (options.force_update) import_data.force_update = true;
      if (options.update_path) import_data.update_path = true;
      // Import to Collectibles Server via API
      importer.importComicIssue(import_data, function(err) {
        if (err) {
          console.log(err);
        }
        return callback(err, import_data);
      });
    // } else {
    //   // Add to database directly
    //   db.addComicIssue(series_info, issue_info, function(err, iss) {
    //     if (err) {
    //       console.log(err);
    //     }
    //     if (iss) {
    //       console.log(iss);
    //     }
    //     return callback(err);
    //   });
    // }
  });
}

module.exports = ComicDispatcher;

