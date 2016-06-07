var request = require('request');

// var COMICVINE_API = 'http://api.comicvine.com/';
var COMICVINE_API = 'http://comicvine.gamespot.com/api/';
var COMICVINE_API_KEY = '';

exports.setAPIKey = function(api_key) {
  COMICVINE_API_KEY = api_key;
}

// RESOURCES
// - character
// - concept
// - origin
// - object
// - location
// - issue
// - story_arc
// - volume
// - publisher
// - person
// - team
// - video

// OPTIONS
// - limit: default 100
// - offset: default 0
// - field_list

exports.search = function(query, resources, options, callback) {
  if (typeof resources == 'function') {
    callback = resources;
    resources = [];
    options = {};
  }
  if (typeof options == 'function') {
    callback = options;
    options = {};
  };

  var url = COMICVINE_API + 'search/?';
  url += 'api_key=' + COMICVINE_API_KEY;
  url += '&query=' + query;
  url += '&format=json';
  if (resources.length) {
    url += '&resources=' + resources.join(',');
  }
  if (options.limit) {
    url += '&limit=' + options.limit;
  }
  if (options.offset) {
    url += '&offset=' + options.offset;
  }
  if (options.page) {
    url += '&page=' + options.page;
  }
  if (options.field_list) {
    url += '&field_list=' + options.field_list.join(',');
  }

  console.log('URL:', url);

  request.get({
    url: url,
    headers: {
      'User-Agent': 'collectibles'
    },
    json: true
  }, function(err, response, body) {
    if (err) return callback(err);
    callback(null, body);
  });
}

exports.searchCharacter = function(query, options, callback) {
  return exports.search(query, ["character"], options, callback);
}

exports.searchIssue = function(query, options, callback) {
  return exports.search(query, ["issue"], options, callback);
}

exports.searchVolume = function(query, options, callback) {
  return exports.search(query, ["volume"], options, callback);
}

exports.getAPIDetail = function(api_detail_url, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  };

  var url = api_detail_url + '?';
  url += 'api_key=' + COMICVINE_API_KEY;
  url += '&format=json';
  if (options.field_list) {
    url += '&field_list=' + options.field_list.join(',');
  }
  if (options.sort) {
    url += '&sort=' + options.sort;
  }

  console.log('URL:', url);

  request.get({
    url: url,
    headers: {
      'User-Agent': 'collectibles'
    },
    json: true
  }, function(err, response, body) {
    if (err) return callback(err);
    callback(null, body);
  });
}

exports.getAPI = function(api_url, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  };

  var url = api_url + '?';
  url += 'api_key=' + COMICVINE_API_KEY;
  url += '&format=json';
  if (options.limit) {
    url += '&limit=' + options.limit;
  }
  if (options.offset) {
    url += '&offset=' + options.offset;
  }
  if (options.field_list) {
    url += '&field_list=' + options.field_list.join(',');
  }
  if (options.sort) {
    url += '&sort=' + options.sort;
  }
  if (options.filter) {
    url += '&filter=' + options.filter;
  }

  console.log('URL:', url);

  request.get({
    url: url,
    headers: {
      'User-Agent': 'collectibles'
    },
    json: true
  }, function(err, response, body) {
    if (err) return callback(err);
    callback(null, body);
  });
}
