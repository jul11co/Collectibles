var util = require('util');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var crypto = require('crypto');
var easyimg = require('easyimage');
var md5file = require('md5-file');

var md5cache = require('./md5cache');

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

exports.getInfo = function(pdf_file, callback) {
  // console.log('getInfo:', pdf_file);
  var pdfImage = new PDFImage(pdf_file);
  pdfImage.getInfo().then(function(info) {
    callback(null, info);
  }, function(err) {
    callback(err);
  });
}

exports.getNumberOfPages = function(pdf_file, callback) {
  var pdfImage = new PDFImage(pdf_file);
  pdfImage.numberOfPages().then(function(numberOfPages) {
    callback(null, numberOfPages);
  }, function(err) {
    callback(err);
  });
}

exports.extractCoverImage = function(pdf_file, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  var pdfImage = new PDFImage(pdf_file, options);
  pdfImage.convertPage(0).then(function(imagePath) {
    // 0-th page (first page) of the slide.pdf is available as slide-0.png 
    callback(null, imagePath);
  }, function(err) {
    callback(err);
  });
}

var fileExists = function(file_path) {
  try {
    var stats = fs.statSync(file_path);
    if (stats.isFile()) {
      return true;
    }
  } catch (e) {
  }
  return false;
}

exports.parseAndExtractCoverImage = function(pdf_file, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = {};
  }
  // console.log('parse:', pdf_file);
  // console.log(options);

  var result = {};
  
  // result.md5sum = md5file.sync(pdf_file);

  md5cache.getMD5(pdf_file, function(err, md5sum) {
    if (err) return callback(err);

    result.md5sum = md5sum;

    var tmpdir = options.tmpdir || path.join(__dirname, '..', '.tmp/out');
    var outputdir = options.outputdir || path.join(__dirname, '..', '.tmp/magazine_covers');
    fse.ensureDirSync(tmpdir);
    fse.ensureDirSync(outputdir);

    // fse.emptyDirSync(tmpdir); // cleaned if exists, created if not exist

    var pdfImage = new PDFImage(pdf_file, { outputDirectory: tmpdir });
    pdfImage.getInfo().then(function(info) {
      result.pdfinfo = info;

      var cover_image = path.join(
        outputdir,
        result.md5sum + '.png' // default extname
      );

      if (fileExists(cover_image)) {
        result.cover_image = cover_image;
        return callback(null, result);
      }

      pdfImage.convertPage(0).then(function(imagePath) {

        // result.cover_image = imagePath;
        // callback(null, result);

        // copy & resize the cover image to outputdir
        easyimg.resize({
          src: imagePath, 
          dst: cover_image,
          width: 640, 
          height: 400
        }).then(function (file) {
          result.cover_file = file;
          result.cover_image = file.path;
          callback(null, result);
        }, function(err) {
          callback(err);
        });
        
      }, function(err) {
        callback(err);
      });
    }, function(err) {
      callback(err);
    });
  });
}
