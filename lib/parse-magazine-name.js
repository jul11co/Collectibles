
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
    key: "month",
    match: /(?:Jan(?:uary)?|Feb(?:ruary)?|March?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|December?)/g,
    type: "Array"
  },
  {
    key: "region",
    match: /(?:UK|USA|AU|PL|RUS|ZA|SG|MY|IN|HK|UAE)/g,
    type: "String"
  },
  {
    key: "name",
    match: /[^-|~]*/,
    type: "String"
  }
];

var months_map = {
  "Jan": "January",
  "Feb": "February",
  "Mar": "March",
  "Apr": "April",
  "May": "May",
  "Jun": "June",
  "Jul": "July",
  "Aug": "August",
  "Sep": "September",
  "Oct": "October",
  "Nov": "November",
  "Dec": "December"
};

module.exports = function(text) {
  var result = {};

  var tmp = text;
  tmp = replaceAll(tmp, '.', ' ');
  tmp = replaceAll(tmp, '–', '-');
  tmp = replaceAll(tmp, '_', ' ');
  tmp = replaceAll(tmp, '[', ' ');
  tmp = replaceAll(tmp, ']', ' ');
  tmp = replaceAll(tmp, '(', ' ');
  tmp = replaceAll(tmp, ')', ' ');
  var parts = tmp.split(' ');

  result.basename = removeExtraSpaces(tmp);

  var match;
  patterns.forEach(function(pattern) {
    var key = pattern.key;
    if(!(match = tmp.match(pattern.match))) {
      return;
    }

    if (pattern.type == "Array") {
      if (key == 'month') {
        result[key] = match.map(function(month){ return months_map[month] || month; });
        match.forEach(function(month) {
          tmp = removeExtraSpaces(replaceAll(tmp, month, ''));
        });
      } else {
        result[key] = match;
      }
    } else {
      result[key] = removeExtraSpaces(match[0].trim());
      if (key == 'year') {
        tmp = removeExtraSpaces(replaceAll(tmp, result[key], ''));
      }
    }
  });
  if (result.name && result.name != '') {
    result.name = removeExtraSpaces(result.name);
  }
  return result;
}