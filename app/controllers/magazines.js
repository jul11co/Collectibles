var path = require('path');
var fs = require('fs');
var async = require('async');

var db = require('../db');
// var pdfreading = require('../../lib/pdf-reading');

var config = require('../config');

// GET /magazines
// GET /magazines?skip=...&limit=...
exports.viewMagazines = function(req, res, next) {
  var options = {};
  if (req.query.skip) {
    options.skip = parseInt(req.query.skip);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  db.getMagazineCount({}, function(err, count) {
    if (err) return next(err);

    db.getRecentAddedMagazines(options, function(err, mags) {
      if (err) return next(err);

      async.each(mags, function(mag, cb) {
        db.getMagazineIssues({magazine: mag._id}, 
          {limit: 1,sort: {release_date: -1}}, function(err, issues) {
          if (err) return cb(err);
          
          mag.issues = issues;
          cb();
        });
      }, function(err) {
        if (err) return next(err);

        var layout = (req.query.inplace=='1')?false:'layout';
        res.render('magazines', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          magazines: mags,
          helpers: req.handlebars.helpers
        });
      });
    });
  });
}

// POST /magazines
// req.body
// {
//   name: String,
//   description: String,
//   cover_image: String,
//   publisher: String,
//   issues_per_year: Number,
//   category: [String],
// }
exports.addMagazine = function(req, res, next) {
  db.addMagazine(req.body, function(err, newMag) {
    if (err) return res.status(500).json({error: err.message});
    res.json(newMag);
  });
}

var escapeRegExp = function(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// GET /magazines/search?q=...
// GET /magazines/search?q=...&type=... (type: 'magazines' or 'issues')
exports.searchMagazines = function(req, res, next) {
  var layout = (req.query.inplace=='1')?false:'layout';
  if (typeof req.query.q == 'undefined' || req.query.q == '') {
    return res.render('magazine_search', {
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

  var findMagazines = function(cb) {
    db.findMagazines(condition, options, function(err, result) {
      if (err) return cb(err);
      cb(null, {
        count: result.count,
        skip: options.skip,
        limit: result.limit,
        magazines: result.mags
      });
    });
  }

  var findIssues = function(cb) {
    db.findMagazineIssues(condition, options, function(err, result) {
      if (err) return cb(err);
      cb(null, {
        count: result.count,
        skip: options.skip,
        limit: result.limit,
        issues: result.issues
      });
    });
  }

  if (req.query.type == 'magazines') {
    findMagazines(function(err, result) {
      if (err) return next(err);

      res.render('magazine_search', {
        layout: layout,
        query: req.query,
        magazines_result: result,
        helpers: req.handlebars.helpers
      });
    });
  } else if (req.query.type == 'issues') {
    findIssues(function(err, result) {
      if (err) return next(err);

      res.render('magazine_search', {
        layout: layout,
        query: req.query,
        issues_result: result,
        helpers: req.handlebars.helpers
      });
    });
  } else {
    async.parallel({
      magazines_result: findMagazines,
      issues_result: findIssues
    }, function(err, results) {
      if (err) return next(err);

      res.render('magazine_search', {
        layout: layout,
        query: req.query,
        magazines_result: results['magazines_result'],
        issues_result: results['issues_result'],
        helpers: req.handlebars.helpers
      });
    });
  }
}

// GET /magazines/:magazine_id
// GET /magazines/:magazine_id?skip=...&limit=...
exports.viewMagazine = function(req, res, next) {
  db.getMagazine({_id: req.params.magazine_id}, function(err, mag) {
    if (err) return next(err);
    if (!mag) {
      return next(new Error('The magazine is not available'));
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
    options.sort = {release_date: -1};

    db.getMagazineIssueCount({magazine: req.params.magazine_id}, function(err, count) {
      if (err) return next(err);

      db.getMagazineIssues({magazine: req.params.magazine_id}, options, function(err, issues) {
        if (err) return next(err);

        var layout = (req.query.inplace=='1')?false:'layout';
        res.render('magazine', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          magazine: mag,
          issues: issues,
          helpers: req.handlebars.helpers
        });
      });
    });
  });
}

// GET /magazines/:magazine_id/delete
exports.deleteMagazine = function(req, res, next) {
  db.getMagazine({_id: req.params.magazine_id}, function(err, mag) {
    if (err) return next(err);
    if (!mag) {
      return next(new Error('The magazine is not available'));
    }

    // remove related magazine issues
    db.removeMagazineIssue({magazine: req.params.magazine_id}, {multi: true}, function(err, numRemoved) {
      if (err) return next(err);

      var issuesRemoved = numRemoved;

      // remove itself
      db.removeMagazine({_id: req.params.magazine_id}, function(err, numRemoved) {
        if (err) return next(err);

        var layout = (req.query.inplace=='1')?false:'layout';
        res.render('notice', {
          layout: layout,
          message: ' Magazine: "' + mag.name + '" has been deleted (with ' + issuesRemoved + ' issues)'
        });
      });
    });
  });
}

// GET /magazine_issues
// GET /magazine_issues?skip=...&limit=...
// GET /magazine_issues?sort=... // (sort: 'published_date' or 'added_date')
exports.viewMagazineIssues = function(req, res, next) {
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
  db.getMagazineIssueCount({}, function(err, count) {
    if (err) return next(err);
    
    if (req.query.sort == 'added_date') {
      db.getRecentAddedMagazineIssues(options, function(err, issues) {
        if (err) return next(err);

        res.render('magazine_issues', {
          layout: layout,
          query: req.query,
          count: count,
          skip: options.skip,
          limit: options.limit,
          issues: issues,
          helpers: req.handlebars.helpers
        });
      });
    } else {
      db.getRecentPublishedMagazineIssues(options, function(err, issues) {
        if (err) return next(err);

        res.render('magazine_issues', {
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

// POST /magazine_issues
// req.body
// {
//   force_update: Boolean, // OPTIONAL
//   magazine: { name: String },
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
//     release_year: Number, // REQUIRED
//     release_date: Date // OPTIONAL
//   }
// }
exports.addMagazineIssue = function(req, res, next) {
  var options = {};
  if (req.body.force_update) options.force_update = true;
  if (req.body.update_path) options.update_path = true;
  db.addMagazineIssue(req.body.magazine, req.body.issue, options, function(err, issue) {
    if (err) return res.status(500).json({error: err.message});
    res.json(issue);
  });
}

// GET /magazine_issues/:issue_id
exports.viewMagazineIssue = function(req, res, next) {
  db.getMagazineIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    if (!issue) {
      return next(new Error('The issue is not available'));
    }
    
    db.getMagazine({_id: issue.magazine}, function(err, magazine) {
      // if (err) return next(err);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('magazine_issue', {
        layout: layout,
        query: req.query,
        issue: issue,
        magazine: magazine,
        helpers: req.handlebars.helpers
      });
    });
  });
}

// GET /magazine_issues/:issue_id/delete
exports.deleteMagazineIssue = function(req, res, next) {
  db.getMagazineIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    if (!issue) {
      return next(new Error('The issue is not available'));
    }

    db.removeMagazineIssue({_id: req.params.issue_id}, function(err) {
      if (err) return next(err);

      var layout = (req.query.inplace=='1')?false:'layout';
      res.render('notice', {
        layout: layout,
        message: 'Magazine issue: "' + issue.name + '" has been deleted'
      });
    });
  });
}

// GET /download/magazine/:issue_id
exports.downloadMagazineIssue = function(req, res, next) {
  console.log('downloadMagazineIssue:', req.params.issue_id);
  db.getMagazineIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    console.log('Path:', issue.filepath);

    try {
      var stat = fs.statSync(issue.filepath);
      if (stat.isFile()) {
        var file = fs.createReadStream(issue.filepath);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + issue.filename);
        // res.setHeader('Content-Disposition', 'inline; filename=' + issue.filename);
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

// GET /read/magazine/:issue_id
exports.readMagazineIssue = function(req, res, next) {
  console.log('readMagazineIssue:', req.params.issue_id);
  db.getMagazineIssue({_id: req.params.issue_id}, function(err, issue) {
    if (err) return next(err);
    console.log('Path:', issue.filepath);

    try {
      var stat = fs.statSync(issue.filepath);
      if (stat.isFile()) {

        db.addToReadingList({
          doc_type: 'magazine',
          doc_id: issue._id,
          read: true
        }, function(err) {
          if (err) {
            console.log(err);
          }
        
          var file = fs.createReadStream(issue.filepath);
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Type', 'application/pdf');
          // res.setHeader('Content-Disposition', 'attachment; filename=' + issue.filename);
          res.setHeader('Content-Disposition', 'inline; filename=' + issue.filename);
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

// // GET /read/magazine/:issue_id
// exports.readMagazineIssue = function(req, res, next) {
//   console.log('readMagazineIssue:', req.params.issue_id);
//   db.getMagazineIssue({_id: req.params.issue_id}, function(err, issue) {
//     if (err) return next(err);
    
//     res.render('magazine_read', {
//       query: req.query,
//       issue: issue,
//       helpers: req.handlebars.helpers
//     });
//   });
// }

// // GET /read/magazine/:issue_id/start
// exports.readMagazineIssueStart = function(req, res, next) {
//   db.getMagazineIssue({_id: req.params.issue_id}, function(err, issue) {
//     if (err) return res.status(500).json({error: err.message});
//     console.log('Path:', issue.filepath);

//     pdfreading.startRead(issue.filepath, function(err, result) {
//       if (err) return res.status(500).json({error: err.message});

//       var files = [];
//       if (result.files) {
//         result.files.forEach(function(file) {
//           files.push(path.resolve('/', config.getRelativePath(file)));
//         });
//       }

//       res.json({
//         images: files
//       });
//     });
//   });
// }
