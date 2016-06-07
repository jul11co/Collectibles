var path = require('path');
var fs = require('fs');
var async = require('async');

var db = require('../db');
var comicreading = require('../../lib/comic-reading');

var config = require('../config');

// GET /comics
// GET /comics?skip=...&limit=...
exports.viewComicSeries = function(req, res, next) {
  var options = {};
  if (req.query.skip) {
    options.skip = parseInt(req.query.skip);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  db.getComicSerieCount({}, function(err, count) {
    if (err) return next(err);

    db.getRecentAddedComicSeries(options, function(err, series) {
      if (err) return next(err);

      async.each(series, function(serie, cb) {
        db.getComicIssues({serie: serie._id}, 
          {limit: 1,sort: {release_date: -1,name: -1}}, function(err, issues) {
          if (err) return cb(err);
          
          serie.issues = issues;
          cb();
        });
      }, function(err) {
        if (err) return next(err);

        var layout = (req.query.inplace=='1')?false:'layout';
        res.render('comic_series', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          series: series,
          helpers: req.handlebars.helpers
        });
      });
    });
  });
}

// POST /comics
// req.body
// {
//   name: String,
//   description: String,
//   cover_image: String,
//   year_begin: Number,
//   year_end: Number,
//   issues_count: Number,
//   publisher: String,
//   characters: [String],
//   authors: [String],
//   category: [String]
// }
exports.addComicSerie = function(req, res, next) {
  db.addComicSerie(req.body, function(err, newSerie) {
    if (err) return res.status(500).json({error: err.message});
    res.json(newSerie);
  });
}

var escapeRegExp = function(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// GET /comics/search?q=...
// GET /comics/search?q=...&type=... (type: 'series' or 'issues')
exports.searchComics = function(req, res, next) {
  var layout = (req.query.inplace=='1')?false:'layout';
  if (typeof req.query.q == 'undefined' || req.query.q == '') {
    return res.render('comic_search', {
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
  options.sort = {release_date: -1};

  var findSeries = function(cb) {
    db.findComicSeries(condition, options, function(err, result) {
      if (err) return cb(err);
      cb(null, {
        count: result.count,
        skip: options.skip,
        limit: result.limit,
        series: result.series
      });
    });
  }

  var findIssues = function(cb) {
    db.findComicIssues(condition, options, function(err, result) {
      if (err) return cb(err);
      cb(null, {
        count: result.count,
        skip: options.skip,
        limit: result.limit,
        issues: result.issues
      });
    });
  }

  if (req.query.type == 'series') {
    findSeries(function(err, result) {
      if (err) return next(err);

      res.render('comic_search', {
        layout: layout,
        query: req.query,
        series_result: result,
        helpers: req.handlebars.helpers
      });
    });
  } else if (req.query.type == 'issues') {
    findIssues(function(err, result) {
      if (err) return next(err);

      res.render('comic_search', {
        layout: layout,
        query: req.query,
        issues_result: result,
        helpers: req.handlebars.helpers
      });
    });
  } else {
    async.parallel({
      series_result: findSeries,
      issues_result: findIssues
    }, function(err, results) {
      if (err) return next(err);

      res.render('comic_search', {
        layout, layout,
        query: req.query,
        series_result: results['series_result'],
        issues_result: results['issues_result'],
        helpers: req.handlebars.helpers
      });
    });
  }
}

// GET /comics/:serie_id
// GET /comics/:serie_id?skip=...&limit=...
exports.viewComicSerie = function(req, res, next) {
  db.getComicSerie({_id: req.params.serie_id}, function(err, serie) {
    if (err) return next(err);
    if (!serie) {
      return next(new Error('The comic serie is not available'));
    }

    var options = {};
    if (req.query.skip) {
      options.skip = parseInt(req.query.skip);
    }
    if (req.query.limit) {
      options.limit = parseInt(req.query.limit);
    } else {
      options.limit = 30;
    }
    options.sort = {release_date: -1,name: -1};

    db.getComicIssueCount({serie: req.params.serie_id}, function(err, count) {
      if (err) return next(err);

      db.getComicIssues({serie: req.params.serie_id}, options, function(err, issues) {
        if (err) return next(err);

        var layout = (req.query.inplace=='1')?false:'layout';
        res.render('comic_serie', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          serie: serie,
          issues: issues,
          helpers: req.handlebars.helpers
        });
      });
    });
  });
}

// GET /comics/:serie_id/delete
exports.deleteComicSerie = function(req, res, next) {
  db.getComicSerie({_id: req.params.serie_id}, function(err, serie) {
    if (err) return next(err);
    if (!serie) {
      return next(new Error('The comic serie is not available'));
    }

    // remove related comic issues
    db.removeComicIssue({serie: req.params.serie_id}, {multi: true}, function(err, numRemoved) {
      if (err) return next(err);

      var issuesRemoved = numRemoved;

      // remove itself
      db.removeComicSerie({_id: req.params.serie_id}, function(err) {
        if (err) return next(err);

        var layout = (req.query.inplace=='1')?false:'layout';
        res.render('notice', {
          layout: layout,
          message: 'Comic serie: "' + serie.name + '" has been removed (with ' + issuesRemoved + ' issues)'
        });
      });
    });
  });
}

// GET /comic_issues
// GET /comic_issues?skip=...&limit=...
// GET /comic_issues?sort=... // (sort: 'published_date' or 'added_date')
exports.viewComicIssues = function(req, res, next) {
  var layout = (req.query.inplace=='1')?false:'layout';
  var options = {};
  if (req.query.skip) {
    options.skip = parseInt(req.query.skip);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  db.getComicIssueCount({}, function(err, count) {
    if (err) return next(err);

    if (req.query.sort == 'added_date') {
      options.sort = {added_at: -1};
      db.getRecentAddedComicIssues(options, function(err, issues) {
        if (err) return next(err);

        res.render('comic_issues', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          issues: issues,
          helpers: req.handlebars.helpers
        });
      });
    } else { // default
      options.sort = {release_date: -1,name: -1};
      db.getRecentPublishedComicIssues(options, function(err, issues) {
        if (err) return next(err);

        res.render('comic_issues', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          issues: issues,
          helpers: req.handlebars.helpers
        });
      });
    }
  });
}

// POST /comic_issues
// req.body
// {
//   force_update: Boolean, // OPTIONAL
//   serie: { name: String },
//   issue: {
//     md5sum: String, // REQUIRED
//     filepath: String, // REQUIRED
//     filename: String, // OPTIONAL
//     filetype: String, // OPTIONAL
//     filesize: Number, // REQUIRED, in bytes
//     folder: String, // OPTIONAL
//     name: String, // REQUIRED
//     cover_image: String, // REQUIRED
//     pages: Number, // REQUIRED
//     issue_no: String, // OPTIONAL
//     volume_no: String, // OPTIONAL
//     release_year: Number, // REQUIRED
//     release_date: Date // OPTIONAL
//   }
// }
exports.addComicIssue = function(req, res, next) {
  var options = {};
  if (req.body.force_update) options.force_update = true;
  if (req.body.update_path) options.update_path = true;
  var series = req.body.series || req.body.serie;
  var issue = req.body.issue;
  db.addComicIssue(series, issue, options, function(err, issue) {
    if (err) return res.status(500).json({error: err.message});
    res.json(issue);
  });
}

// GET /comic_issues/:issue_id
exports.viewComicIssue = function(req, res, next) {
  db.getComicIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    if (!issue) {
      return next(new Error('The comic issue is not available'));
    }
    
    db.getComicSerie({_id: issue.serie}, function(err, serie) {
      // if (err) return next(err);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('comic_issue', {
        layout: layout,
        query: req.query,
        issue: issue,
        serie: serie,
        helpers: req.handlebars.helpers
      });
    });

  });
}

// GET /comic_issues/:issue_id/delete
exports.deleteComicIssue = function(req, res, next) {
  db.getComicIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    if (!issue) {
      return next(new Error('The comic issue is not available'));
    }

    db.removeComicIssue({_id: req.params.issue_id}, function(err) {
      if (err) return next(err);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('notice', {
        layout: layout,
        message: 'Comic issue: "' + issue.name + '" has been deleted'
      });
    });
  });
}

// GET /read/comic/:issue_id
exports.readComicIssue = function(req, res, next) {
  console.log('readComicIssue:', req.params.issue_id);
  db.getComicIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    if (!issue) {
      return next(new Error('The comic issue is not available'));
    }

    db.getComicSerie({_id: issue.serie}, function(err, serie) {
      // if (err) return next(err);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('comic_read', {
        layout: layout,
        query: req.query,
        issue: issue,
        serie: serie,
        helpers: req.handlebars.helpers
      });
    });
  });
}

// GET /read/comic/:issue_id/start
exports.readComicIssueStart = function(req, res, next) {
  db.getComicIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return res.status(500).json({error: err.message});
    console.log('Path:', issue.filepath);

    comicreading.startRead(issue.filepath, {
      tmpdir: config.getDataPath('reading')
    }, function(err, result) {
      if (err) return res.status(500).json({error: err.message});

      db.addToReadingList({
        doc_type: 'comic',
        doc_id: issue._id,
        read: true
      }, function(err) {
        if (err) {
          console.log(err);
        }

        var files = [];
        if (result.files) {
          result.files.forEach(function(file) {
            files.push(path.resolve('/', config.getRelativePath(file)));
          });
        }

        res.json({
          images: files
        });
      });
    });
  });
}
