
var escapeRegExp = function(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

var replaceAll = function(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

var removeExtraSpaces = function(string) {
  return string.replace(/\s+/g,' ').trim();
}

var patterns = [
  {
    key: "year",
    match: /([\[\(]?((?:19[0-9]|20[01])[0-9])[\]\)]?)/g,
    type: "String"
  },
  {
    key: "format",
    match: /(?:Digital|digital|webrip|WebRip|hybrid|Hybrid)/g,
    type: "String"
  },
  {
    key: "filetype",
    match: /(?:cbr|CBR|cbz|CBZ|cbc|CBC|cbt|CBT|cba|CBA|cb7|CB7|zip|ZIP|rar|RAR|pdf|PDF)/g,
    type: "String"
  },
  {
    key: "name",
    match: /[^|~]*/,
    type: "String"
  }
];

module.exports = function(text) {
  var result = {};

  var tmp = text;
  tmp = replaceAll(tmp, '.', ' ');
  tmp = replaceAll(tmp, '–', '-');
  tmp = replaceAll(tmp, '_', ' ');
  tmp = replaceAll(tmp, '[', '|');
  tmp = replaceAll(tmp, ']', '|');
  tmp = replaceAll(tmp, '(', '|');
  tmp = replaceAll(tmp, ')', '|');
  var parts = tmp.split(' ');

  result.finename = removeExtraSpaces(tmp);
  // console.log(tmp);

  var match;
  patterns.forEach(function(pattern) {
    var key = pattern.key;
    if(!(match = tmp.match(pattern.match))) {
      return;
    }

    if (pattern.type == "Array") {
      result[key] = match;
    } else {
      result[key] = match[0].trim();
      if (key == 'year') {
        tmp = replaceAll(tmp, result[key], '');
        result.year = parseInt(result[key]);
      } else if (key == 'filetype') {
        tmp = replaceAll(tmp, result[key], '');
      }
    }
  });

  if (result.name || result.name != '') {
    result.name = removeExtraSpaces(result.name);
    var name_parts = result.name.split(' ');
    if (name_parts.length > 1) {
      var last_part = name_parts[name_parts.length - 1];
      if (!isNaN(last_part)) {
        result.issue = last_part;
        name_parts.pop();
        result.name = name_parts.join(' ');
      } else if(last_part.toLowerCase()[0] == 'v') {
        var volume = last_part.substring(1);
        if (!isNaN(volume)) {
          result.volume = volume;
          name_parts.pop();
          result.name = name_parts.join(' ');
        }
      }
      result.name = removeExtraSpaces(result.name);
    }
  }
  return result;
}