var ComicVineAPI = require('../../lib/comicvine-api');

var config = require('../config');

ComicVineAPI.setAPIKey(config.getComicVineAPIKey());

// GET /comicvine
exports.viewComicVine = function(req, res, next) {
  var layout = (req.query.inplace=='1')?false:'layout';
  return res.render('comicvine', {
    layout: layout,
    query: req.query,
    helpers: req.handlebars.helpers
  });
}

// GET /comicvine/search?q=...
// GET /comicvine/search?q=...&skip=...
// GET /comicvine/search?q=...&page=...
// GET /comicvine/search?q=...&limit=...
// GET /comicvine/search?q=...&type=... (type: 'issue' or 'volume' or 'character')
exports.search = function(req, res, next) {
  var layout = (req.query.inplace=='1')?false:'layout';
  return res.render('comicvine_search', {
    layout: layout,
    query: req.query,
    helpers: req.handlebars.helpers
  });
}

// GET /comicvine/search_results?q=...
// GET /comicvine/search_results?q=...&skip=...
// GET /comicvine/search_results?q=...&page=...
// GET /comicvine/search_results?q=...&limit=...
// GET /comicvine/search_results?q=...&type=... (type: 'issue' or 'volume' or 'character')
exports.searchResults = function(req, res, next) {
  console.log(req.query);

  if (typeof req.query.q == 'undefined' || req.query.q == '') {
    return res.render('comicvine_search_results', {
      layout: false,
      query: {},
      helpers: req.handlebars.helpers
    });
  }

  var options = {};
  if (req.query.skip) {
    options.offset = parseInt(req.query.skip);
  }
  if (req.query.page) {
    options.page = parseInt(req.query.page);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }

  var search_type = 'issue';
  if (req.query.type) {
    search_type = req.query.type;
  }

  var renderResults = function(result) {
    var characters = [];
    var volumes = [];
    var issues = [];

    result['results'].forEach(function(data) {
      if (data['resource_type'] == 'character') {
        characters.push(data);
      } else if (data['resource_type'] == 'volume') {
        // if (data.api_detail_url) {
        //   data.api_id = data.api_detail_url.replace('http://comicvine.gamespot.com/api/volume/', '');
        // }
        volumes.push(data);
      } else if (data['resource_type'] == 'issue') {
        // if (data.api_detail_url) {
        //   data.api_id = data.api_detail_url.replace('http://comicvine.gamespot.com/api/issue/', '');
        // }
        issues.push(data);
      }
    });

    res.render('comicvine_search_results', {
      layout: false,
      query: req.query,
      count: result['number_of_total_results'],
      offset: result['offset'],
      page: options.page,
      limit: result['limit'],
      characters: characters,
      volumes: volumes,
      issues: issues,
      helpers: req.handlebars.helpers
    });
  }

  if (search_type == 'character') {
    ComicVineAPI.searchCharacter(req.query.q, options, function(err, result) {
      if (err) return next(err);
      if (result['status_code'] != 1) {
        return next(new Error(result['error']))
      }

      renderResults(result);
    });
  } else if (search_type == 'volume') {
    ComicVineAPI.searchVolume(req.query.q, options, function(err, result) {
      if (err) return next(err);
      if (result['status_code'] != 1) {
        return next(new Error(result['error']))
      }

      renderResults(result);
    });
  } else /*if (search_type == 'issue')*/ {
    ComicVineAPI.searchIssue(req.query.q, options, function(err, result) {
      if (err) return next(err);
      if (result['status_code'] != 1) {
        return next(new Error(result['error']))
      }

      renderResults(result);
    });
  } 
}

// GET /comicvine/issues
exports.viewIssues = function(req, res, next) {
  var api_url = 'http://comicvine.gamespot.com/api/issues';

  var options = {};
  if (req.query.offset) {
    options.offset = parseInt(req.query.offset);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  options.sort = 'date_added:desc';

  ComicVineAPI.getAPI(api_url, options, function(err, result) {
    if (err) return next(err);
    if (result['status_code'] != 1) {
      return next(new Error(result['error']))
    }

    // console.log(result);

    var issues = [];

    result['results'].forEach(function(data) {
      // if (data.api_detail_url) {
      //   data.api_id = data.api_detail_url.replace('http://comicvine.gamespot.com/api/issue/', '');
      // }
      issues.push(data);
    });

    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('comicvine_issues', {
      layout: layout,
      query: req.query,
      count: result['number_of_total_results'],
      offset: result['offset'],
      limit: result['limit'],
      issues: issues,
      helpers: req.handlebars.helpers
    });
  });
}

// GET /comicvine/issues/:issue_id
exports.viewIssue = function(req, res, next) {
  var api_detail_url = 'http://comicvine.gamespot.com/api/issue/' + req.params.issue_id;
  ComicVineAPI.getAPIDetail(api_detail_url, function(err, result) {
    if (err) return next(err);
    if (result['status_code'] != 1) {
      return next(new Error(result['error']))
    }

    // console.log(result);

    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('comicvine_issue', {
      layout: layout,
      query: req.query,
      issue: result['results'],
      helpers: req.handlebars.helpers
    });
  });
}

// GET /comicvine/volumes
exports.viewVolumes = function(req, res, next) {
  var api_url = 'http://comicvine.gamespot.com/api/volumes';

  var options = {};
  if (req.query.offset) {
    options.offset = parseInt(req.query.offset);
  }
  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else {
    options.limit = 30;
  }
  options.sort = 'date_added:desc';

  ComicVineAPI.getAPI(api_url, options, function(err, result) {
    if (err) return next(err);
    if (result['status_code'] != 1) {
      return next(new Error(result['error']))
    }

    // console.log(result);

    var volumes = [];

    result['results'].forEach(function(data) {
      // if (data.api_detail_url) {
      //   data.api_id = data.api_detail_url.replace('http://comicvine.gamespot.com/api/volume/', '');
      // }
      volumes.push(data);
    });

    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('comicvine_volumes', {
      layout: layout,
      query: req.query,
      count: result['number_of_total_results'],
      offset: result['offset'],
      limit: result['limit'],
      volumes: volumes,
      helpers: req.handlebars.helpers
    });
  });
}

// GET /comicvine/volumes/:volume_id
exports.viewVolume = function(req, res, next) {
  var api_detail_url = 'http://comicvine.gamespot.com/api/volume/' + req.params.volume_id;
  ComicVineAPI.getAPIDetail(api_detail_url, function(err, result) {
    if (err) return next(err);
    if (result['status_code'] != 1) {
      return next(new Error(result['error']))
    }

    // console.log(result);
    var layout = (req.query.inplace=='1')?false:'layout';
    res.render('comicvine_volume', {
      layout: layout,
      query: req.query,
      volume: result['results'],
      helpers: req.handlebars.helpers
    });
  });
}
