#!/usr/bin/env node

var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var fs = require('fs');
var path = require('path');
var async = require('async');

var handlebars = require('express-handlebars');

var app = express();
var app_port = process.env.PORT || 8810;

// view engine setup
app.set('views', path.join(__dirname, '..', 'views'));
// handlebars
app.engine('hbs', handlebars({ 
  extname: 'hbs', 
  defaultLayout: 'layout.hbs',
  layoutsDir: path.join(app.settings.views, "layouts"), 
  partialsDir: path.join(app.settings.views, "partials")
}));
app.set('view engine', 'hbs');

// helpers for the handlebars templating
handlebars = handlebars.create({
  helpers: {
    encodeURI : function(uri) {
      return encodeURIComponent(uri);
    },
    formatBytes : function(bytes) {
      if (bytes == 0) return '0 Byte';
      var k = 1000;
      var decimals = 2;
      var dm = decimals + 1 || 3;
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
    },
    math : function(lvalue, operator, rvalue, options) {
      lvalue = parseFloat(lvalue);
      rvalue = parseFloat(rvalue);  
      return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
      }[operator];
    },
    equal : function(lvalue, rvalue, options) {
      // http://doginthehat.com.au/2012/02/comparison-block-helper-for-handlebars-templates/
      if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
      
      if (lvalue != rvalue) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    },
    nequal : function(lvalue, rvalue, options) {
      if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
      
      if (lvalue != rvalue) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    }
  }
});

if (app.get('env') === 'development') {
app.use(logger('dev'));
}
app.use(bodyParser.json({ limit: '16mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var config = require('./config');

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.static(config.getDataFolder()));

app.use("/font-awesome", express.static(path.join(__dirname, '..', 'public/libs/font-awesome/')));
app.use("/jquery", express.static(path.join(__dirname, '..', 'public/libs/jquery/dist/')));
app.use("/bootstrap", express.static(path.join(__dirname, '..', 'public/libs/bootstrap/dist/')));
app.use("/moment", express.static(path.join(__dirname, '..', 'public/libs/moment/min/')));
app.use("/pace", express.static(path.join(__dirname, '..', 'public/libs/PACE/')));
app.use("/handlebars", express.static(path.join(__dirname, '..', 'public/libs/handlebars/')));
app.use("/rangeslider", express.static(path.join(__dirname, '..', 'public/libs/rangeslider.js/dist/')));
app.use("/bootstrap-rowequalizer", express.static(path.join(__dirname, '..', 'public/libs/bootstrap-rowequalizer/')));
// app.use("/file", express.static(ROOT_PATH));

// Make stuff accessible to our router
app.use(function (req, res, next) {
  req.handlebars = handlebars;
  next();
});

var router = express.Router();

// Declare routes here...

var ReadingList = require('./controllers/readinglist');

var Magazines = require('./controllers/magazines');
var Comics = require('./controllers/comics');
var Books = require('./controllers/books');

var ComicVine = require('./controllers/comicvine');

var db = require('./db');

router.get('/', function(req, res, next) {
  async.series({
    readinglist_entries: function(cb) {
      db.getReadingList({limit: 6}, function(err, entries) {
        if (err) return cb(err);
        cb(null, entries);
      });
    },
    magazines_count: function(cb) {
      db.getMagazineCount(function(err, count) {
        if (err) return cb(err);
        cb(null, count);
      });
    },
    magazine_issues: function(cb) {
      db.getRecentPublishedMagazineIssues({limit: 12}, function(err, issues) {
        if (err) return cb(err);
        cb(null, issues);
      });
    },
    comic_series_count: function(cb) {
      db.getComicSerieCount(function(err, count) {
        if (err) return cb(err);
        cb(null, count);
      });
    },
    comic_issues: function(cb) {
      db.getRecentPublishedComicIssues({limit: 12,sort:{release_date:-1,name:-1}}, function(err, issues) {
        if (err) return cb(err);
        cb(null, issues);
      });
    },
    books_count: function(cb) {
      db.getBookCount(function(err, count) {
        if (err) return cb(err);
        cb(null, count);
      });
    },
    books: function(cb) {
      db.getRecentAddedBooks({limit: 12}, function(err, books) {
        if (err) return cb(err);
        cb(null, books);
      });
    }
  }, function(err, results) { // {magazines: [...],magazine_issues: [...],...}
    if (err) return next(err);

    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('index', {
      layout: layout,
      readinglist_entries: results.readinglist_entries,
      magazines_count: results.magazines_count,
      magazine_issues: results.magazine_issues,
      comic_series_count: results.comic_series_count,
      comic_issues: results.comic_issues,
      books_count: results.books_count,
      books: results.books,
      helpers: req.handlebars.helpers
    });
  });
});

router.get('/reading', ReadingList.viewReadingList);
router.post('/reading', ReadingList.addToReadingList);
router.delete('/reading/:entry_id', ReadingList.removeFromReadingList);

router.get('/reading-list', ReadingList.viewReadingList);
router.post('/reading-list', ReadingList.addToReadingList);
router.delete('/reading-list/:entry_id', ReadingList.removeFromReadingList);

router.get('/magazines', Magazines.viewMagazines);
router.post('/magazines', Magazines.addMagazine);
router.get('/magazines/search', Magazines.searchMagazines);
router.get('/magazines/:magazine_id', Magazines.viewMagazine);
router.get('/magazines/:magazine_id/delete', Magazines.deleteMagazine);

router.get('/magazine_issues', Magazines.viewMagazineIssues);
router.post('/magazine_issues', Magazines.addMagazineIssue);
router.get('/magazine_issues/:issue_id', Magazines.viewMagazineIssue);
router.get('/magazine_issues/:issue_id/delete', Magazines.deleteMagazineIssue);
router.get('/read/magazine/:issue_id', Magazines.readMagazineIssue);
// router.get('/read/magazine/:issue_id/start', Magazines.readMagazineIssueStart);
router.get('/download/magazine/:issue_id', Magazines.downloadMagazineIssue);

router.get('/comics', Comics.viewComicSeries);
router.post('/comics', Comics.addComicSerie);
router.get('/comics/search', Comics.searchComics);
router.get('/comics/:serie_id', Comics.viewComicSerie);
router.get('/comics/:serie_id/delete', Comics.deleteComicSerie);

router.get('/comic_issues', Comics.viewComicIssues);
router.post('/comic_issues', Comics.addComicIssue);
router.get('/comic_issues/:issue_id', Comics.viewComicIssue);
router.get('/comic_issues/:issue_id/delete', Comics.deleteComicIssue);
router.get('/read/comic/:issue_id', Comics.readComicIssue);
router.get('/read/comic/:issue_id/start', Comics.readComicIssueStart);

router.get('/books', Books.viewBooks);
router.post('/books', Books.addBook);
router.get('/books/search', Books.searchBooks);
router.get('/books/:book_id', Books.viewBook);
router.get('/books/:book_id/delete', Books.deleteBook);
router.get('/read/book/:book_id', Books.readBook);
router.get('/download/book/:book_id', Books.downloadBook);

router.get('/comicvine', ComicVine.viewComicVine);
router.get('/comicvine/search', ComicVine.search);
router.get('/comicvine/search_results', ComicVine.searchResults);
router.get('/comicvine/issues', ComicVine.viewIssues);
router.get('/comicvine/issues/:issue_id', ComicVine.viewIssue);
router.get('/comicvine/volumes', ComicVine.viewVolumes);
router.get('/comicvine/volumes/:volume_id', ComicVine.viewVolume);

app.use('/', router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  // development error handler
  // will print stacktrace
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });
}

// start the app
app.listen(app_port, function () {
  console.log('Collectibles Server listening on post: ' + app_port);
  console.log('Mode:', app.get('env'));
});

module.exports = app;
