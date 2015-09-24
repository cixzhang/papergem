var _ = require('lodash'),
    Kefir = require('kefir'),
    utils = require('./utilities.js'),
    Deferred = require('./deferred.js');

var request = utils.request,
    getParamString = utils.getParamString;

// Grabs posts from tumblr.
function Tumblr (blog, params) {
  this.posts = {};
  this.host = 'api.tumblr.com';
  this.path = '/v2/blog/' + blog + '/posts?';
  this.params = params;

  this.stream = null;
  this.disposer = null;
  this.lastUpdate = null;

  this.update = this.update.bind(this);
  return this;
}

Tumblr.prototype.watch = function (timeout) {
  if (this.stream) return this.stream;

  timeout = timeout || 60000; // 1 min

  var a = getAll(this.host, this.path, this.params, null, this.posts);
  var b = getNew(this.host, this.path, this.params, timeout, this.posts);

  this.disposer = new Deferred();
  var dispose = Kefir.fromPromise(this.disposer.promise);
  this.stream = Kefir.concat([a, b]).takeUntilBy(dispose);

  this.stream.onValue(this.update);
  return this.stream;
};

Tumblr.prototype.unwatch = function () {
  this.disposer.resolve();
  this.stream.offValue(this.update);
  this.stream = null;
  this.disposer = null;
};

Tumblr.prototype.update = function (v) {
  this.lastUpdate = new Date();
};

function getNew (host, path, params, timeout, posts) {
  if (!posts) posts = {};
  var paramStrings = _.map(params, getParamString);

  var stream = Kefir.stream(emitter => {
    var errors = 0,
        wait = false;

    var onComplete = function () {
          wait = false;
        };

    var onSuccess = function (data) {
          _.each(data.response.posts, function (post) {
            posts[post.id] = post;
          });
          emitter.emit(data.response.posts.length);
        };

    var onFailure = function (e) {
          emitter.error(e);
          errors++;

          if (errors >= 3) // try at most 3 times
            emitter.end();
        };

    var intervalId = setInterval(() => {
      if (wait) return;

      // Start new request.
      wait = true;
      request(host, path + paramStrings.join('&'))
          .then(onSuccess)
          .catch(onFailure)
          .then(onComplete);
    }, timeout);

    return () => {
      clearInterval(intervalId);
    };
  });
  return stream;
}

function getAll (host, path, params, offset, posts) {
  if (!posts) posts = {};

  var stream = Kefir.stream(emitter => {
    var errors = 0;

    var onSuccess = function (data) {
          _.each(data.response.posts, function (post) {
            posts[post.id] = post;
          });
          emitter.emit(data.response.posts.length);

          var size = _.size(posts);
          if (data.response.total_posts > size)
            loop(host, path, size);
          else
            emitter.end();
        };

    var onFailure = function (e) {
          var size = _.size(posts);
          emitter.error(e);
          errors++;

          if (errors < 3) // try at most 3 times
            loop(host, path, size);
          else
            emitter.end();
        };

    var loop = function (host, path, offset) {
      var paramStrings = _.map(params, getParamString);
      if (offset) paramStrings.push('offset=' + offset);

      request(host, path + paramStrings.join('&'))
        .then(onSuccess)
        .catch(onFailure);
    };

    loop();
  });
  return stream;
}

module.exports = Tumblr;
