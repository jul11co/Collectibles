var async = require('async');

var db = require('../db');

// GET /readinglist
// GET /readinglist?skip=...&limit=...
exports.viewReadingList = function(req, res, next) {
  var options = {};
  if (req.query.skip) {
    options.skip = parseInt(req.query.skip);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }

  db.getReadingListCount({}, function(err, count) {
    if (err) return next(err);

    db.getReadingList(options, function(err, entries) {
      if (err) return next(err);

      // console.log(entries);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('readinglist', {
        layout: layout,
        query: req.query,
        count: count,
        skip: options.skip,
        limit: options.limit,
        entries: entries,
        helpers: req.handlebars.helpers
      });
    });
  });
}

// POST /readinglist
// req.body
// {
//   doc_type: String, // 'magazine', 'comic', 'book'
//   doc_id: String, // ID of document,
//   read: Boolean
// }
exports.addToReadingList = function(req, res, next) {
  db.addToReadingList(req.body, function(err, newEntry) {
    if (err) return res.status(500).json({error: err.message});
    res.json(newEntry);
  });
}

// DELETE /readinglist/:entry_id
exports.removeFromReadingList = function(req, res, next) {
  db.removeFromReadingList({_id: req.params.entry_id}, function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({removed:1});
  });
}



