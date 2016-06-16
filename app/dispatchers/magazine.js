var path = require('path');
var md5file = require('md5-file');

var parseMagazineName = require('../../lib/parse-magazine-name');
var pdfFile = require('../../lib/pdf-file');

var db = require('../db');
var importer = require('../importer');

var config = require('../config');

var MagazineDispatcher = function() {
  this.type = 'magazine';
}

var monthMap = { // from text to js Date month
  "Jan": 0,
  "Feb": 1,
  "Mar": 2,
  "Apr": 3,
  "May": 4,
  "Jun": 5,
  "Jul": 6,
  "Aug": 7,
  "Sep": 8,
  "Oct": 9,
  "Nov": 10,
  "Dec": 11,
  "January": 0,
  "February": 1,
  "March": 2,
  "April": 3,
  // "May": 4,
  "June": 5,
  "July": 6,
  "August": 7,
  "September": 8,
  "October": 9,
  "November": 10,
  "December": 11,
};

MagazineDispatcher.prototype.dispatch = function(file, options, callback) {
  var file_name = file.name;
  var file_ext = path.extname(file_name);
  if (!/\.pdf/.test(file_ext.toLowerCase())) {
    return callback();
  }
  
  var mag = parseMagazineName(path.basename(file.name, '.pdf'));
  // console.log(mag);

  if (!mag.name) {
    console.log('No name detected!');
    return callback(new Error('No name detected!'));
  }
  // if (!mag.year) {
  //   console.log('No year detected!');
  //   return callback(new Error('No year detected!'));
  // }

  var mag_info = {
    name: mag.name
  };

  console.log(mag_info);

  var issue_info = {
    filepath: file.path,
    filename: file.name,
    filesize: file.size,
    name: mag.basename
  };

  if (mag.year) {
    issue_info.release_year = parseInt(mag.year);
    issue_info.release_date = new Date(issue_info.release_year, 0, 1, 0, 0, 0, 0);
    if (mag.month) {
      var month = monthMap[mag.month];
      if (!isNaN(month)) {
        issue_info.release_date.setMonth(month);
      }
    }
  }

  // console.log(issue_info);
  // return callback();

  pdfFile.parseAndExtractCoverImage(file.path, {
    tmpdir: config.getDataPath('out'),
    outputdir: config.getDataPath('magazine_covers')
  }, function(err, info) {
    if (err) {
      return callback(err);
    }

    // console.log(info);

    if (info['pdfinfo'] && info['pdfinfo']['Pages']) {
      issue_info.pages = parseInt(info['pdfinfo']['Pages']);
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
        magazine: mag_info,
        issue: issue_info
      };
      if (options.force_update) import_data.force_update = true;
      if (options.update_path) import_data.update_path = true;
      // Import to Collectibles server
      importer.importMagazineIssue(import_data, function(err) {
        if (err) {
          console.log(err);
        }
        return callback(err, import_data);
      });
    // } else {
    //   // Add to database
    //   db.addMagazineIssue(mag_info, issue_info, function(err, iss) {
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

module.exports = MagazineDispatcher;
