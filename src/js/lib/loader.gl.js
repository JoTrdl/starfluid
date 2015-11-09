
;(function(exports) {

  'use strict';

  var loaded = false;

  // Namespace
  var Loader = {};
  Loader.onLoad = function() {};
  Loader.done = function(callback) {
    if (loaded) {
      callback();
    }
    Loader.onLoad = callback;
  };

  var load = function() {
    var importTags = document.getElementsByTagName('extern');
    var imported = 0, total = importTags.length;

    for (var i = 0; i < importTags.length; i++) {
      (function(importNode) {
        var request = new XMLHttpRequest();

        request.onreadystatechange = function() {
          if (request.readyState != 4) return;
          
          if (request.status == 200) {
            // Put content in tmp div
            var content = document.createElement('div');
            content.innerHTML = request.responseText;

            importNode.parentNode.insertBefore(content, importNode.nextSibling);
            importNode.parentNode.removeChild(importNode);

            // Move div content to parent & delete the tmp div
            while (content.childNodes.length > 0) {
              content.parentNode.insertBefore(content.childNodes[0], content.nextSibling);
            }
            content.parentNode.removeChild(content);
          }

          if (++imported == total) {
            Loader.onLoad();
            loaded = true;
          }
            
        };

        request.open('GET', importTags[i].getAttribute('src'), true);
        request.send();
      })(importTags[i]);
    } // for
  };

  if (document.readyState == "complete") {
    load();
  } else {
    window.addEventListener('load', load);
  }

  // Exports
  exports.Loader = Loader;

})(window);