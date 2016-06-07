var md5file = require('md5-file');
var levelup = require('levelup');

var md5cache = undefined;

exports.setDataStore = function(datastore) {
  md5cache = levelup(datastore);
}

exports.getMD5 = function(file_path, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  if (!md5cache) {
    var md5sum = md5file.sync(file_path);
    return callback(null, md5sum);
  }
  md5cache.get(file_path, function(err, md5sum) {
    if (err) {
      if (!err.notFound) { // io error
        return callback(err);
      }
    }

    if (!md5sum) {
      md5sum = md5file.sync(file_path);
      md5cache.put(file_path, md5sum, function(err) {
        if (err) return callback(err);
        callback(null, md5sum);
      });
    } else {
      callback(null, md5sum);
    }
  });
}