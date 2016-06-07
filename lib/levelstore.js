var levelup = require('levelup');

var LevelStore = function(db) {
  this.db = levelup(db, { valueEncoding: 'json' });
};

LevelStore.prototype.set = function(key, value, callback) {
  this.db.put(key, value, function(err) {
    if (err) return callback(err);
    callback();
  });
}

LevelStore.prototype.get = function(key, callback) {
  this.db.get(key, function(err, value) {
    if (err) {
      if (err.notFound) { // key not found
        return callback(null); // value = 'undefined'
      }
      return callback(err);
    }
    callback(null, value);
  });
}

LevelStore.prototype.delete = function(key, callback) {
  this.db.del(key, function(err) {
    if (err) return callback(err);
    callback();
  });
}

function updateObject(original, update, verbose) {
  if (typeof original == 'object' && typeof update == 'object') {
    for (var prop in update) {
      if (verbose) {
        console.log('Update prop "' + prop + '":', 
          ' (' + typeof original[prop] + ' --> ' + typeof update[prop] + ')');
      }
      if (typeof original[prop] == 'object' && typeof update[prop] == 'object') {
        updateObject(original[prop], update[prop], verbose);
      } else {
        original[prop] = update[prop];
      }
    }
  } else {
    original = update;
  }
}

LevelStore.prototype.update = function(key, update, callback) {
  var self = this;
  self.get(key, function(err, value) {
    if (err) return callback(err);
    if (!value) {
      self.set(key, update, function(err) {
        if (err) return callback(err);
        callback();
      });
    } else {
      if (typeof value == 'object' && typeof update == 'object') {
        updateObject(value, update);
      } else {
        value = update;
      }
      self.set(key, value, function(err) {
        if (err) return callback(err);
        callback();
      });
    }
  });
}

// for array value only
LevelStore.prototype.push = function(key, value, callback) {
  var self = this;
  self.get(key, function(err, array) {
    if (err) return callback(err);
    if (!array) {
      array = [];
      array.push(value);
      self.set(key, array, function(err) {
        if (err) return callback(err);
        callback();
      });
    } else {
      if (Object.prototype.toString.call(array) === '[object Array]') {
        array.push(value);
        self.set(key, array, function(err) {
          if (err) return callback(err);
          callback();
        });
      } else {
        callback(new Error('Cannot push to this key (not an array)'));
      }
    }
  });
}

module.exports = LevelStore;