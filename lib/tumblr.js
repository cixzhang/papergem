var _ = require('lodash'),
    Kefir = require('kefir'),
    utils = require('./utilities.js'),
    Deferred = require('./deferred.js');

var request = utils.request,
    getParamString = utils.getParamString;

// Grabs posts from tumblr.
function Tumblr (blog, params) {
  this.postsById = {};

  this.host = 'api.tumblr.com';
  this.path = '/v2/blog/' + blog + '/posts?';
  this.params = params;

  this.stream = null;
  this.disposer = null;
  this.lastUpdate = null;

  this.update = this.update.bind(this);
  return this;
}

Object.defineProperty(Tumblr.prototype, 'posts', {
  get: function () {
    return _.sortBy(this.postsById, 'timestamp');
  }
});

Tumblr.prototype.watch = function (options) {
  if (this.stream) return this.stream;

  this.disposer = new Deferred();

  var timeout = options && options.timeout || 60000; // 1 min

  var hydrate = getAll.call(this);
  var updates = getNew.call(this, timeout);
  var dispose = Kefir.fromPromise(this.disposer.promise);

  this.stream = Kefir.concat([hydrate, updates]).takeUntilBy(dispose);
  this.stream.onValue(this.update);
  return this.stream;
};

Tumblr.prototype.unwatch = function () {
  if (!this.stream || !this.disposer) return;
  this.disposer.resolve();
  this.stream.offValue(this.update);
  this.stream = null;
  this.disposer = null;
};

Tumblr.prototype.update = function (posts) {
  this.lastUpdate = new Date();
};

function getNew (timeout) {
  var host = this.host;
  var path = this.path;
  var params = this.params;
  var postsById = this.postsById || {};

  var stream = Kefir.stream(emitter => {
    var errors = 0,
        wait = false;

    var onComplete = function () {
          wait = false;
        };

    var onSuccess = function (data) {
          emitter.emit(extractPosts(data, postsById));
        };

    var onFailure = function (e) {
          emitter.error(e);
          errors++;
          if (errors >= 3) // try at most 3 times
            emitter.end();
        };

    var intervalId = setInterval(() => {
          if (wait) return;
          wait = true;
          requestPosts(host, path, params)
              .then(onSuccess)
              .catch(onFailure)
              .then(onComplete);
        }, timeout);

    return () => { clearInterval(intervalId); };
  });
  return stream;
}

function getAll () {
  var host = this.host;
  var path = this.path;
  var params = this.params;
  var postsById = this.postsById || {};

  var stream = Kefir.stream(emitter => {
    var errors = 0;

    var onSuccess = function (data) {
          var newPosts = extractPosts(data, postsById);
          emitter.emit(newPosts);

          var size = _.size(postsById);
          if (data.response.total_posts <= size || newPosts.length === 0)
            emitter.end();
          else
            loop(size);
        };

    var onFailure = function (e) {
          var size = _.size(postsById);
          emitter.error(e);
          errors++;

          if (errors < 3) // try at most 3 times
            loop(size);
          else
            emitter.end();
        };

    var loop = function (offset) {
          requestPosts(host, path, params, offset)
            .then(onSuccess)
            .catch(onFailure);
        };

    loop();
  });
  return stream;
}

function requestPosts (host, path, params, offset) {
  var paramStrings = _.map(params, getParamString);
  if (offset) paramStrings.push('offset=' + offset);
  return request(host, path + paramStrings.join('&'));
}

function extractPosts (data, postsById) {
  var newPosts = [];
  _.each(data.response.posts, function (post) {
    if (!(post.id in postsById)) newPosts.push(post);
    postsById[post.id] = post;
  });
  return newPosts.length ?  newPosts : null;
}

module.exports = Tumblr;
