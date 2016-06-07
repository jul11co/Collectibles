var path = require('path');
var md5file = require('md5-file');

var parseBookName = require('../../lib/parse-book-name');
var pdfFile = require('../../lib/pdf-file');

var db = require('../db');
var importer = require('../importer');

var config = require('../config');

var BookDispatcher = function() {
  this.type = 'book';
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

BookDispatcher.prototype.dispatch = function(file, options, callback) {
  var file_name = file.name;
  var file_ext = path.extname(file_name);
  if (!/\.pdf/.test(file_ext.toLowerCase())) {
    return callback();
  }
  
  var book = parseBookName(path.basename(file.name, '.pdf'));
  console.log(book);

  if (!book.name) {
    console.log('No name detected!');
    return callback(new Error('No name detected!'));
  }

  var book_info = {
    filepath: file.path,
    filename: file.name,
    filesize: file.size,
    name: book.name
  };

  if (book.year) {
    book_info.release_year = parseInt(book.year);
    book_info.release_date = new Date(book_info.release_year, 0, 1, 0, 0, 0, 0);
    if (book.month) {
      var month = monthMap[book.month];
      if (!isNaN(month)) {
        book_info.release_date.setMonth(month);
      }
    }
  }

  book_info.md5sum = md5file.sync(file.path);

  pdfFile.parseAndExtractCoverImage(file.path, {
    tmpdir: config.getDataPath('out'),
    outputdir: config.getDataPath('book_covers')
  }, function(err, info) {
    if (err) {
      return callback(err);
    }

    // console.log(info);
    if (info['pdfinfo'] && info['pdfinfo']['Pages']) {
      book_info.pages = parseInt(info['pdfinfo']['Pages']);
    }
    if (info['cover_image']) {
      book_info.cover_image = path.resolve('/', config.getRelativePath(info['cover_image']));
    }

    // console.log(book_info);
    // if (options.import) {
      if (options.force_update) book_info.force_update = true;
      if (options.update_path) book_info.update_path = true;
      // Import to Collectibles server
      importer.importBook(book_info, function(err) {
        if (err) {
          console.log(err);
        }
        return callback(err, book_info);
      });
    // } else {
    //   // Add to database
    //   db.addBook(book_info, function(err, iss) {
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

module.exports = BookDispatcher;
