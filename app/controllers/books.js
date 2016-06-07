var path = require('path');
var fs = require('fs');

var db = require('../db');

// GET /books
// GET /books?skip=...&limit=...
exports.viewBooks = function(req, res, next) {
  var options = {};
  if (req.query.skip) {
    options.skip = parseInt(req.query.skip);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  db.getRecentAddedBooks(options, function(err, books) {
    if (err) return next(err);

    db.getBookCount({}, function(err, count) {
      if (err) return next(err);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('books', {
        layout: layout,
        query: req.query,
        count: count,
        skip: options.skip,
        limit: options.limit,
        books: books,
        helpers: req.handlebars.helpers
      });
    });
  });
}

// POST /books
// req.body
// {
//   force_update: Boolean, // OPTIONAL
//   md5sum: String, // REQUIRED
//   filepath: String, // REQUIRED
//   filename: String, // OPTIONAL
//   filetype: String, // OPTIONAL
//   filesize: Number, // REQUIRED, in bytes
//   folder: String, // OPTIONAL
//   name: String, // REQUIRED
//   description: String, // OPTIONAL
//   cover_image: String, // REQUIRED
//   pages: Number, // REQUIRED
//   release_year: Number, // REQUIRED
//   release_date: Date, // OPTIONAL
//   publisher: String, // OPTIONAL
//   category: [String] // OPTIONAL
// }
exports.addBook = function(req, res, next) {
  var options = {};
  if (req.body.force_update) options.force_update = true;
  if (req.body.update_path) options.update_path = true;
  db.addBook(req.body, options, function(err, newBook) {
    if (err) return res.status(500).json({error: err.message});
    res.json(newBook);
  });
}

// GET /books/:book_id
// GET /books/:book_id?skip=...&limit=...
exports.viewBook = function(req, res, next) {
  db.getBook({_id: req.params.book_id}, function(err, book) {
    if (err) return next(err);

    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('book', {
      layout: layout,
      query: req.query,
      book: book,
      helpers: req.handlebars.helpers
    });
  });
}

// GET /books/:book_id/delete
exports.deleteBook = function(req, res, next) {
  db.getBook({_id: req.params.book_id}, function(err, book) {
    if (err) return next(err);

    db.removeBook({_id: req.params.book_id}, function(err) {
      if (err) return next(err);

      res.render('notice', {
        message: 'Book: "' + book.name + '" has been deleted'
      });
    });
  });
}

var escapeRegExp = function(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// GET /books/search?q=...
exports.searchBooks = function(req, res, next) {
  if (typeof req.query.q == 'undefined' || req.query.q == '') {
    var layout = (req.query.inplace=='1')?false:'layout';
    return res.render('book_search', {
      layout: layout,
      query: {},
      helpers: req.handlebars.helpers
    });
  }

  var condition = {};
  condition.name = new RegExp(escapeRegExp(req.query.q), 'gi');

  var options = {};
  if (req.query.skip) {
    options.skip = parseInt(req.query.skip);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  options.sort = {added_at: -1};

  db.findBooks(condition, options, function(err, result) {
    if (err) return next(err);

    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('book_search', {
      layout: layout,
      query: req.query,
      count: result.count,
      skip: options.skip,
      limit: result.limit,
      books: result.books,
      helpers: req.handlebars.helpers
    });
  });
}

// GET /download/book/:book_id
exports.downloadBook = function(req, res, next) {
  console.log('downloadBook:', req.params.book_id);
  db.getBook({_id: req.params.book_id}, function(err, book) {
    if (err) return next(err);
    console.log('Path:', book.filepath);

    try {
      var stat = fs.statSync(book.filepath);
      if (stat.isFile()) {
        var file = fs.createReadStream(book.filepath);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + book.filename);
        // res.setHeader('Content-Disposition', 'inline; filename=' + book.filename);
        file.pipe(res);
      } else {
        return next(new Error('File not found!'));
      }
    } catch (e) {
      console.log(e);
      return next(e);
    }
  });
}

// GET /read/book/:book_id
exports.readBook = function(req, res, next) {
  console.log('readBook:', req.params.book_id);
  db.getBook({_id: req.params.book_id}, function(err, book) {
    if (err) return next(err);
    console.log('Path:', book.filepath);

    try {
      var stat = fs.statSync(book.filepath);
      if (stat.isFile()) {

        db.addToReadingList({
          doc_type: 'book',
          doc_id: book._id,
          read: true
        }, function(err) {
          if (err) {
            console.log(err);
          }

          var file = fs.createReadStream(book.filepath);
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Type', 'application/pdf');
          // res.setHeader('Content-Disposition', 'attachment; filename=' + book.filename);
          res.setHeader('Content-Disposition', 'inline; filename=' + book.filename);
          file.pipe(res);
        });
      } else {
        return next(new Error('File not found!'));
      }
    } catch (e) {
      console.log(e);
      return next(e);
    }
  });
}
