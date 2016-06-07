var request = require('request');

var TOKEN = 'InsertTokenHere';

var addMagazineIssueURL = 'http://127.0.0.1:8810/magazine_issues';
var addComicIssueURL = 'http://127.0.0.1:8810/comic_issues';
var addBookURL = 'http://127.0.0.1:8810/books';

exports.importMagazineIssue = function(data, options, callback) {
  console.log('importMagazineIssue');
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var import_url = addMagazineIssueURL;
  if (typeof options.import_url !== 'undefined') {
    import_url = options.import_url;
  }
  if (!import_url || import_url == '') {
    return callback(new Error('Empty import URL'));
  }
  request.post({
    url: import_url,
    json: data,
    headers: {
      "Authorization": "Bearer " + TOKEN
    }
  }, function(err, httpResponse, body) {
    if (err) {
      console.log('Import failed: ', err);
      return callback(err);
    }
    console.log(body);
    console.log('');
    callback();
  });
}

exports.importComicIssue = function(data, options, callback) {
  console.log('importComicIssue');
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var import_url = addComicIssueURL;
  if (typeof options.import_url !== 'undefined') {
    import_url = options.import_url;
  }
  if (!import_url || import_url == '') {
    return callback(new Error('Empty import URL'));
  }
  request.post({
    url: import_url,
    json: data,
    headers: {
      "Authorization": "Bearer " + TOKEN
    }
  }, function(err, httpResponse, body) {
    if (err) {
      console.log('Import failed: ', err);
      return callback(err);
    }
    console.log(body);
    console.log('');
    callback();
  });
}

exports.importBook = function(data, options, callback) {
  console.log('importBook');
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var import_url = addBookURL;
  if (typeof options.import_url !== 'undefined') {
    import_url = options.import_url;
  }
  if (!import_url || import_url == '') {
    return callback(new Error('Empty import URL'));
  }
  request.post({
    url: import_url,
    json: data,
    headers: {
      "Authorization": "Bearer " + TOKEN
    }
  }, function(err, httpResponse, body) {
    if (err) {
      console.log('Import failed: ', err);
      return callback(err);
    }
    console.log(body);
    console.log('');
    callback();
  });
}
