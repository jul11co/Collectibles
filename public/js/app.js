$(document).ready(function() {
  window.goBack = function() {
    window.history.back();
  }
  window.addEventListener('popstate', function(e) {
    console.log('popstate', e.state);
    if (e.state && e.state.inplace && e.state.url) {
      $('#main').load(e.state.url, function(err) {
        bindSearchForm();
      });
    }
  });
  window.loadPage = function(page_url, options, callback) {
    if (typeof options == 'function') {
      callback = options;
      options = {};
    }
    var options = options || {};
    var callback = callback || function(){};
    var load_url = page_url;
    if (load_url.indexOf('?')>=0) {
      load_url += '&inplace=1';
    } else {
      load_url += '?inplace=1';
    }
    console.log('load:', page_url);
    // $('#main').html('');
    $('#main').load(load_url, function(err) {
      history.pushState({inplace: 1, url: load_url}, "Collectibles", page_url);
      bindSearchForm();
      callback();
    });
  }
  window.bindSearchForm = function() {
    $('#search-form').submit(function() {
      var page_url = $(this).attr('action');
      var query = $(this).serialize();
      var load_url = page_url + '?inplace=1';
      console.log('submit:', page_url + '?' + query);
      $.ajax({
        data: $(this).serialize(),
        type: $(this).attr('method'),
        url: load_url,
        success: function(response) {
          $('#main').html(response);
          history.pushState({inplace: 1, url: load_url + '&' + query}, "Collectibles", page_url + '?' + query);
          bindSearchForm();
        }
      });
      return false;
    });
  }
  window.loadInplace = function(obj, clear) {
    var url = obj.getAttribute("href");
    if (url && url != '') {
      loadPage(url, {clear:1});
    }
    return false;
  }
});