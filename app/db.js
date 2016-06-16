var path = require('path');
var async = require('async');
var fse = require('fs-extra');

var Datastore = require('nedb');

var config = require('./config');

fse.ensureDirSync(config.getDataFolder());

var magazinedb = new Datastore({ 
  filename: config.getDataPath('magazines.db'), 
  autoload: true
});
var magazineissuedb = new Datastore({ 
  filename: config.getDataPath('magazineissues.db'),
  autoload: true
});

var comicseriedb = new Datastore({ 
  filename: config.getDataPath('comicseries.db'),
  autoload: true
});
var comicissuedb = new Datastore({
  filename: config.getDataPath('comicissues.db'),
  autoload: true
});

var bookdb = new Datastore({ 
  filename: config.getDataPath('books.db'),
  autoload: true
});

var readinglist = new Datastore({
  filename: config.getDataPath('readinglist.db'),
  autoload: true
});

magazineissuedb.ensureIndex({ fieldName: 'md5sum' }, function (err) {
  if (err) console.log(err);
});
comicissuedb.ensureIndex({ fieldName: 'md5sum' }, function (err) {
  if (err) console.log(err);
});
bookdb.ensureIndex({ fieldName: 'md5sum' }, function (err) {
  if (err) console.log(err);
});

/* Magazines & Issues */

// magazine object
// {
//   name: String,             // REQUIRED
//   description: String,      // OPTIONAL
//   cover_image: String,      // OPTIONAL
//   publisher: String,        // OPTIONAL
//   issues_per_year: Number,  // OPTIONAL
//   category: [String]        // OPTIONAL
// }
exports.addMagazine = function(magazine, callback) {
  var mag = {};

  if (magazine.name) mag.name = magazine.name;
  if (magazine.description) mag.description = magazine.description;
  if (magazine.cover_image) mag.cover_image = magazine.cover_image;
  if (magazine.publisher) mag.publisher = magazine.publisher;
  if (magazine.issues_per_year) mag.issues_per_year = magazine.issues_per_year;
  if (magazine.category) mag.category = magazine.category;

  mag.added_at = new Date();
  magazinedb.insert(mag, function(err, newMag) {
    callback(err, newMag);
  });
}

exports.getMagazine = function(condition, callback) {
  magazinedb.findOne(condition, function(err, mag) {
    callback(err, mag);
  });
}

exports.getRecentAddedMagazines = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var mag_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var mag_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var mag_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  magazinedb.find({}).sort(mag_sort).skip(mag_skip).limit(mag_limit).exec(function(err, mags) {
    callback(err, mags);
  });
}

exports.getMagazineCount = function(condition, callback) {
  if (typeof condition == 'function') {
    callback = condition;
    condition = {};
  }
  magazinedb.count(condition, function(err, count) {
    callback(err, count);
  });
}

exports.findMagazines = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var mag_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var mag_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var mag_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  magazinedb.count(condition, function(err, count) {
    if (err) return callback(err);

    magazinedb.find(condition)
      .sort(mag_sort)
      .skip(mag_skip).limit(mag_limit).exec(function(err, mags) {
      if (err) return callback(err);

      var result = {
        count: count,
        limit: mag_limit,
        mags: mags
      };
      callback(null, result);
    });
  });
}

exports.updateMagazine = function(condition, update, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  magazinedb.update(condition, update, options, function(err) {
    callback(err);
  });
}

exports.removeMagazine = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  magazinedb.remove(condition, options, function(err, numRemoved) {
    callback(err, numRemoved);
  });
}

// magazine object
// {
//   name: String
// }
//
// magazine issue object
// {
//   md5sum: String,          // REQUIRED
//   filepath: String,        // REQUIRED
//   filename: String,        // OPTIONAL
//   filetype: String,        // OPTIONAL
//   filesize: Number,        // REQUIRED, in bytes
//   folder: String,          // OPTIONAL
//   name: String,            // REQUIRED
//   cover_image: String,     // REQUIRED
//   pages: Number,           // REQUIRED
//   release_year: Number,    // OPTIONAL
//   release_date: Date       // OPTIONAL
// }
exports.addMagazineIssue = function(magazine, issue, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  async.waterfall([
    function(cb) {
      exports.getMagazine(magazine, function(err, mag) {
        if (err) return cb(err);
        if (mag) {
          return cb(null, mag);
        }
        // return cb(new Error('No magazine available'));
        console.log('Add new magazine:', magazine.name);
        exports.addMagazine(magazine, function(err, newMag) {
          return cb(err, newMag);
        });
      });
    },
    function(mag, cb) {
      exports.getMagazineIssue({md5sum: issue.md5sum}, function(err, oldIssue) {
        if (err) return cb(err);
        if (oldIssue && !options.force_update) {
          if (oldIssue.filepath == issue.filepath) {
            console.log('Already added:', oldIssue.filepath);
            return cb(null, oldIssue);
          } else if (!options.update_path) {
            console.log('Duplicated with:', oldIssue.filepath);
            return cb(null, oldIssue);
          }
        }
        
        var iss = {};

        if (oldIssue) {
          iss = oldIssue;
        }

        iss.magazine = mag._id;

        if (issue.md5sum) {
          iss.md5sum = issue.md5sum;
        }

        // file info
        if (issue.filepath) iss.filepath = issue.filepath;
        if (issue.filename) {
          iss.filename = issue.filename;
        } else if (issue.filepath) {
          iss.filename = path.basename(issue.filepath);
        }
        if (issue.filetype) {
          iss.filetype = issue.filetype;
        } else if (issue.filepath) {
          iss.filetype = path.extname(issue.filepath);
        }
        if (issue.folder) {
          iss.folder = issue.folder;
        } else if (issue.filepath) {
          iss.folder = path.dirname(issue.filepath);
        }
        if (issue.filesize) iss.filesize = issue.filesize;

        // issue info
        if (issue.name) iss.name = issue.name;
        if (issue.cover_image) iss.cover_image = issue.cover_image;
        if (issue.pages) iss.pages = issue.pages;
        if (issue.release_year) iss.release_year = issue.release_year;
        if (issue.release_date) iss.release_date = issue.release_date;

        if (oldIssue) {
          console.log('Update issue:', oldIssue.name);
          iss.added_at = oldIssue.added_at;
          magazineissuedb.update({_id: oldIssue._id}, iss, {}, function(err) {
            cb(err, oldIssue);
          });
        } else {
          console.log('New issue:', iss.name);
          iss.added_at = new Date();
          magazineissuedb.insert(iss, function(err, newIssue) {
            cb(err, newIssue);
          });
        }
      });
    }
  ], function(err, newIssue) {
    callback(err, newIssue);
  });
}

exports.getMagazineIssue = function(condition, callback) {
  magazineissuedb.findOne(condition, function(err, issue) {
    callback(err, issue);
  });
}

exports.getRecentAddedMagazineIssues = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  magazineissuedb.find({}).sort(issue_sort).skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
    callback(err, issues);
  });
}

exports.getRecentPublishedMagazineIssues = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {release_date: -1};
  magazineissuedb.find({}).sort(issue_sort).skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
    callback(err, issues);
  });
}

exports.getMagazineIssueCount = function(condition, callback) {
  if (typeof condition == 'function') {
    callback = condition;
    condition = {};
  }
  magazineissuedb.count(condition, function(err, count) {
    callback(err, count);
  });
}

exports.findMagazineIssues = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  magazineissuedb.count(condition, function(err, count) {
    if (err) return callback(err);

    magazineissuedb.find(condition)
      .sort(issue_sort)
      .skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
      if (err) return callback(err);

      var result = {
        count: count,
        limit: issue_limit,
        issues: issues
      };
      callback(null, result);
    });
  });
}

// get magazine issues: condition = {magazine: magazine_id}
exports.getMagazineIssues = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 10;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  magazineissuedb.find(condition)
    .sort(issue_sort)
    .skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
    callback(err, issues);
  });
}

exports.updateMagazineIssue = function(condition, update, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  magazineissuedb.update(condition, update, options, function(err) {
    callback(err);
  });
}

exports.removeMagazineIssue = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  magazineissuedb.remove(condition, options, function(err, numRemoved) {
    callback(err, numRemoved);
  });
}

/* Comic Series & Issues */

// comic serie object
// {
//   name: String,            // REQUIRED
//   description: String,     // OPTIONAL
//   cover_image: String,     // OPTIONAL
//   year_begin: Number,      // OPTIONAL
//   year_end: Number,        // OPTIONAL
//   issues_count: Number,    // OPTIONAL
//   publisher: String,       // OPTIONAL
//   characters: [String],    // OPTIONAL
//   authors: [String],       // OPTIONAL
//   category: [String]       // OPTIONAL
// }
exports.addComicSerie = function(serie, callback) {
  var ser = {};

  if (serie.name) ser.name = serie.name;
  if (serie.description) ser.description = serie.description;
  if (serie.cover_image) ser.cover_image = serie.cover_image;
  if (serie.year_begin) ser.year_begin = serie.year_begin;
  if (serie.year_end) ser.year_end = serie.year_end;
  if (serie.issues_count) ser.issues_count = serie.issues_count;
  if (serie.publisher) ser.publisher = serie.publisher;
  if (serie.characters) ser.characters = serie.characters;
  if (serie.authors) ser.authors = serie.authors;
  if (serie.category) ser.category = serie.category;

  ser.added_at = new Date();
  comicseriedb.insert(ser, function(err, newSerie) {
    callback(err, newSerie);
  });
}

exports.getComicSerie = function(condition, callback) {
  comicseriedb.findOne(condition, function(err, serie) {
    callback(err, serie);
  });
}

exports.findComicSeries = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var ser_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var ser_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var ser_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  comicseriedb.count(condition, function(err, count) {
    if (err) return callback(err);

    comicseriedb.find(condition).sort(ser_sort).skip(ser_skip).limit(ser_limit).exec(function(err, series) {
      if (err) return callback(err);

      var result = {
        count: count,
        limit: ser_limit,
        series: series
      };
      callback(null, result);
    });
  });
}

exports.getRecentAddedComicSeries = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var ser_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var ser_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var ser_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  comicseriedb.find({}).sort(ser_sort).skip(ser_skip).limit(ser_limit).exec(function(err, series) {
    callback(err, series);
  });
}

exports.getComicSerieCount = function(condition, callback) {
  if (typeof condition == 'function') {
    callback = condition;
    condition = {};
  }
  comicseriedb.count(condition, function(err, count) {
    callback(err, count);
  });
}

exports.updateComicSerie = function(condition, update, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  comicseriedb.update(condition, update, options, function(err) {
    callback(err);
  });
}

exports.removeComicSerie = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  comicseriedb.remove(condition, options, function(err, numRemoved) {
    callback(err, numRemoved);
  });
}

// comic serie object
// {
//   name: String
// }
//
// comic issue object
// {
//   md5sum: String,          // REQUIRED
//   filepath: String,        // REQUIRED
//   filename: String,        // OPTIONAL
//   filetype: String,        // OPTIONAL
//   filesize: Number,        // REQUIRED, in bytes
//   folder: String,          // OPTIONAL
//   name: String,            // REQUIRED
//   cover_image: String,     // REQUIRED
//   issue_no: String,        // OPTIONAL
//   volume_no: String,       // OPTIONAL
//   pages: Number,           // REQUIRED
//   release_year: Number,    // OPTIONAL
//   release_date: Date       // OPTIONAL
// }
exports.addComicIssue = function(serie, issue, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  async.waterfall([
    function(cb) {
      exports.getComicSerie(serie, function(err, ser) {
        if (err) return cb(err);
        if (ser) {
          return cb(null, ser);
        }
        // return cb(new Error('No serie available'));
        console.log('Add new serie:', serie.name);
        exports.addComicSerie(serie, function(err, newSerie) {
          return cb(err, newSerie);
        });
      });
    },
    function(ser, cb) {
      exports.getComicIssue({md5sum: issue.md5sum}, function(err, oldIssue) {
        if (err) return cb(err);
        if (oldIssue && !options.force_update) {
          if (oldIssue.filepath == issue.filepath) {
            console.log('Already added:', oldIssue.filepath);
            return cb(null, oldIssue);
          } else if (!options.update_path) {
            console.log('Duplicated with:', oldIssue.filepath);
            return cb(null, oldIssue);
          }
        }

        var iss = {};

        if (oldIssue) {
          iss = oldIssue;
        }

        iss.serie = ser._id;

        if (issue.md5sum) {
          iss.md5sum = issue.md5sum;
        }
        
        // file info
        if (issue.filepath) iss.filepath = issue.filepath;
        if (issue.filename) {
          iss.filename = issue.filename;
        } else if (issue.filepath) {
          iss.filename = path.basename(issue.filepath);
        }
        if (issue.filetype) {
          iss.filetype = issue.filetype;
        } else if (issue.filepath) {
          iss.filetype = path.extname(issue.filepath);
        }
        if (issue.folder) {
          iss.folder = issue.folder;
        } else if (issue.filepath) {
          iss.folder = path.dirname(issue.filepath);
        }
        if (issue.filesize) iss.filesize = issue.filesize;

        // issue info
        if (issue.name) iss.name = issue.name;
        if (issue.cover_image) iss.cover_image = issue.cover_image;
        if (issue.issue_no) iss.issue_no = issue.issue_no;
        if (issue.volume_no) iss.volume_no = issue.volume_no;
        if (issue.pages) iss.pages = issue.pages;
        if (issue.release_year) iss.release_year = issue.release_year;
        if (issue.release_date) iss.release_date = issue.release_date;

        if (oldIssue) {
          console.log('Update issue:', oldIssue.name);
          iss.added_at = oldIssue.added_at;
          comicissuedb.update({_id: oldIssue._id}, iss, {}, function(err) {
            callback(err, oldIssue);
          });
        } else {
          console.log('New issue:', iss.name);
          iss.added_at = new Date();
          comicissuedb.insert(iss, function(err, newIssue) {
            cb(err, newIssue);
          });
        }
      });
    }
  ], function(err, newIssue) {
    callback(err, newIssue);
  });
}

exports.getComicIssue = function(condition, callback) {
  comicissuedb.findOne(condition, function(err, issue) {
    callback(err, issue);
  });
}

// get comic serie's issues: condition = {serie: serie_id}
exports.getComicIssues = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 10;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  comicissuedb.find(condition)
    .sort(issue_sort)
    .skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
    callback(err, issues);
  });
}

exports.getRecentAddedComicIssues = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  comicissuedb.find({})
    .sort(issue_sort).skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
    callback(err, issues);
  });
}

exports.getRecentPublishedComicIssues = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {release_date: -1};
  comicissuedb.find({}).
    sort(issue_sort).skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
    callback(err, issues);
  });
}

exports.getComicIssueCount = function(condition, callback) {
  if (typeof condition == 'function') {
    callback = condition;
    condition = {};
  }
  comicissuedb.count(condition, function(err, count) {
    callback(err, count);
  });
}

exports.findComicIssues = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var issue_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var issue_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var issue_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  comicissuedb.count(condition, function(err, count) {
    if (err) return callback(err);

    comicissuedb.find(condition)
      .sort(issue_sort)
      .skip(issue_skip).limit(issue_limit).exec(function(err, issues) {
      if (err) return callback(err);

      var result = {
        count: count,
        limit: issue_limit,
        issues: issues
      };
      callback(null, result);
    });
  });
}

exports.updateComicIssue = function(condition, update, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  comicissuedb.update(condition, update, options, function(err) {
    callback(err);
  });
}

exports.removeComicIssue = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  comicissuedb.remove(condition, options, function(err, numRemoved) {
    callback(err, numRemoved);
  });
}

/* Books */

// book object
// {
//   md5sum: String,          // REQUIRED
//   filepath: String,        // REQUIRED
//   filename: String,        // OPTIONAL
//   filetype: String,        // OPTIONAL
//   filesize: Number,        // REQUIRED, in bytes
//   folder: String,          // OPTIONAL
//   name: String,            // REQUIRED
//   description: String,     // OPTIONAL
//   cover_image: String,     // REQUIRED
//   pages: Number,           // REQUIRED
//   release_year: Number,    // OPTIONAL
//   release_date: Date,      // OPTIONAL
//   publisher: String,       // OPTIONAL
//   category: [String]       // OPTIONAL
// }
exports.addBook = function(book_info, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  exports.getBook({md5sum: book_info.md5sum}, function(err, oldBook) {
    if (err) return callback(err);
    
    if (oldBook && !options.force_update) {
      if (oldBook.filepath == book_info.filepath) {
        console.log('Already added:', oldBook.filepath);
        return callback(null, oldBook);
      } else if (!options.update_path) {
        console.log('Duplicated with:', oldBook.filepath);
        return callback(null, oldBook);
      }
    }
    
    var book = {};
    
    if (oldBook) {
      book = oldBook;
    }

    if (book_info.md5sum) {
      book.md5sum = book_info.md5sum;
    }
    
    // file info
    if (book_info.filepath) book.filepath = book_info.filepath;
    if (book_info.filename) {
      book.filename = book_info.filename;
    } else if (book_info.filepath) {
      book.filename = path.basename(book_info.filepath);
    }
    if (book_info.filetype) {
      book.filetype = book_info.filetype;
    } else if (book_info.filepath) {
      book.filetype = path.extname(book_info.filepath);
    }
    if (book_info.folder) {
      book.folder = book_info.folder;
    } else if (book_info.filepath) {
      book.folder = path.dirname(book_info.filepath);
    }
    if (book_info.filesize) book.filesize = book_info.filesize;

    // book info
    if (book_info.name) book.name = book_info.name;
    if (book_info.description) book.description = book_info.description;
    if (book_info.cover_image) book.cover_image = book_info.cover_image;
    if (book_info.pages) book.pages = book_info.pages;
    if (book_info.release_year) book.release_year = book_info.release_year;
    if (book_info.release_date) book.release_date = book_info.release_date;

    if (book_info.publisher) book.publisher = book_info.publisher;
    if (book_info.category) book.category = book_info.category;

    if (oldBook) {
      console.log('Update book:', oldBook.name);
      book.added_at = oldBook.added_at;
      bookdb.update({_id: oldBook._id}, book, {}, function(err) {
        callback(err, oldBook);
      });
    } else {
      console.log('Add new book:', book_info.name);
      book.added_at = new Date();
      bookdb.insert(book, function(err, newBook) {
        callback(err, newBook);
      });
    }
  });
}

exports.getBook = function(condition, callback) {
  bookdb.findOne(condition, function(err, mag) {
    callback(err, mag);
  });
}

exports.getRecentAddedBooks = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var book_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var book_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var book_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  bookdb.find({}).sort(book_sort).skip(book_skip).limit(book_limit).exec(function(err, books) {
    callback(err, books);
  });
}

exports.getRecentPublishedBooks = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var book_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var book_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var book_sort = (typeof options.sort != 'undefined') ? options.sort : {release_date: -1};
  bookdb.find({}).sort(book_sort).skip(book_skip).limit(book_limit).exec(function(err, books) {
    callback(err, books);
  });
}

exports.findBooks = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var book_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var book_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var book_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  bookdb.count(condition, function(err, count) {
    if (err) return callback(err);

    bookdb.find(condition)
      .sort(book_sort)
      .skip(book_skip).limit(book_limit).exec(function(err, books) {
      if (err) return callback(err);

      var result = {
        count: count,
        limit: book_limit,
        books: books
      };
      callback(null, result);
    });
  });
}

exports.getBookCount = function(condition, callback) {
  if (typeof condition == 'function') {
    callback = condition;
    condition = {};
  }
  bookdb.count(condition, function(err, count) {
    callback(err, count);
  });
}

exports.updateBook = function(condition, update, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  bookdb.update(condition, update, options, function(err) {
    callback(err);
  });
}

exports.removeBook = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  bookdb.remove(condition, options, function(err, numRemoved) {
    callback(err, numRemoved);
  });
}

/* Reading List */

// info object
// {
//   doc_type: String, // {doc_type: 'magazine', 'comic', 'book'}
//   doc_id: String,
//   read: Boolean
// }
exports.addToReadingList = function(info, callback) {
  readinglist.findOne({
    doc_type: info.doc_type, 
    doc_id: info.doc_id
  }, function(err, oldEntry) {
    if (err) return callback(err);
    if (oldEntry) {
      return callback(null, oldEntry);
    }
    
    var entry = {};
    entry.doc_type = info.doc_type;
    entry.doc_id = info.doc_id;
    entry.read = info.read;

    entry.added_at = new Date();
    readinglist.insert(entry, function(err, newEntry) {
      callback(err, newEntry);
    });
  });
}

exports.removeFromReadingList = function(condition, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  readinglist.remove(condition, options, function(err, numRemoved) {
    callback(err, numRemoved);
  });
}

exports.markAsRead = function(condition, callback) {
  readinglist.findOne(condition, function(err, entry) {
    if (err) return callback(err);
    if (!entry) {
      return callback(new Error('The readinglist entry is not available'));
    }
    readinglist.update({_id: entry._id}, {$set: {read:true}}, function(err) {
      if (err) return callback(err);
      callback();
    });
  });
}

exports.markAsUnread = function(condition, callback) {
  readinglist.findOne(condition, function(err, entry) {
    if (err) return callback(err);
    if (!entry) {
      return callback(new Error('The readinglist entry is not available'));
    }
    readinglist.update({_id: entry._id}, {$set: {read:false}}, function(err) {
      if (err) return callback(err);
      callback();
    });
  });
}

exports.getReadingListCount = function(condition, callback) {
  if (typeof condition == 'function') {
    callback = condition;
    condition = {};
  }
  readinglist.count(condition, function(err, count) {
    callback(err, count);
  });
}

exports.getReadingList = function(options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var list_skip = (typeof options.skip != 'undefined') ? options.skip : 0;
  var list_limit = (typeof options.limit != 'undefined') ? options.limit : 20;
  var list_sort = (typeof options.sort != 'undefined') ? options.sort : {added_at: -1};
  readinglist.find({}).sort(list_sort).skip(list_skip).limit(list_limit).exec(function(err, entries) {
    if (err) return callback(err);

    async.each(entries, function(entry, cb) {
      if (entry.doc_type == 'comic') {
        exports.getComicIssue({_id: entry.doc_id}, function(err, issue) {
          // if (err) return cb(err);
          entry.issue = issue;
          cb();
        });
      } else if (entry.doc_type == 'magazine') {
        exports.getMagazineIssue({_id: entry.doc_id}, function(err, issue) {
          // if (err) return cb(err);
          entry.issue = issue;
          cb();
        });
      } else if (entry.doc_type == 'book') {
        exports.getBook({_id: entry.doc_id}, function(err, book) {
          // if (err) return cb(err);
          entry.book = book;
          cb();
        });
      } else {
        cb();
      }
    }, function(err) {
      if (err) return callback(err);
      callback(null, entries);
    });
  });
}

