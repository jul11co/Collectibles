var path = require('path');

var comicvineAPIKey = process.env['CV_API_KEY'] || '';
var dataFolder = path.join(process.env['HOME'], '.collectibles');

exports.getDataFolder = function() {
	return dataFolder;
}

exports.getDataPath = function(datapath) {
	return path.join(dataFolder, datapath);
}

exports.getRelativePath = function(datapath) {
	return path.relative(dataFolder, datapath);
}

exports.getComicVineAPIKey = function() {
	return comicvineAPIKey;
}
