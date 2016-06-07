var util = require('util');
var path = require('path');
var fse = require('fs-extra');
var crypto = require('crypto');
var easyimg = require('easyimage');
var async = require('async');

var PDFImage = require("pdf-image").PDFImage;
 
PDFImage.prototype.constructGetInfoCommand = function () {
  return util.format(
    "pdfinfo \"%s\"",
    this.pdfFilePath
  );
}
PDFImage.prototype.getOutputImagePathForPage = function (pageNumber) {
  var imageFileName = crypto.createHash('md5').update(this.pdfFilePath).digest("hex");
  return path.join(
    this.outputDirectory,
    imageFileName + "-" + pageNumber + "." + this.convertExtension
  );
}
PDFImage.prototype.constructConvertCommandForPage = function (pageNumber) {
  var pdfFilePath = this.pdfFilePath;
  var outputImagePath = this.getOutputImagePathForPage(pageNumber);
  var convertOptionsString = this.constructConvertOptions();
  return util.format(
    "%s %s\"%s[%d]\" \"%s\"",
    this.useGM ? "gm convert" : "convert",
    convertOptionsString ? convertOptionsString + " " : "",
    pdfFilePath, pageNumber, outputImagePath
  );
}

// extract images from PDF file
exports.startRead = function(pdf_file, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  
  var result = {};

  if (!options.outputDirectory) {
    var filehash = crypto.createHash('md5').update(pdf_file).digest("hex");
    var tmpdir = path.join(__dirname, '..', '.tmp/reading/' + filehash);
    options.outputDirectory = tmpdir;
  }

  fse.emptyDirSync(options.outputDirectory); // cleaned if exists, created if not exist

  var pdfImage = new PDFImage(pdf_file, options);
  var result = {};

  pdfImage.getInfo().then(function(info) {
    result.pdfinfo = info;
    
    var pages = info['Pages'];
    var page_numbers = [];
    for (var i = 0; i < pages; i++) {
      page_numbers.push(i);
    }

    console.log('Number of Pages:', pages);

    result.pages = pages;
    result.files = [];
    
    async.eachSeries(page_numbers, function(page_num, cb) {
      pdfImage.convertPage(page_num).then(function(imagePath) {
        console.log('Image:', imagePath);
        result.files.push(imagePath);
        cb();
      }, function(err) {
        cb(err);
      });
    }, function(err) {
      callback(err, result);
    })
  }, function(err) {
    callback(err);
  });
}