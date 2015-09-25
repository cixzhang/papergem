var Tumblr = require('../lib/tumblr.js'),
    expect = require('chai').expect,
    key = require('../api_keys.json').tumblr;

describe('a Tumblr stream', function () {
  var blog;

  beforeEach(function () {
    blog = new Tumblr('staff.tumblr.com', {api_key: key});
  });

  afterEach(function () {
    blog.unwatch();
  });

  it('has posts', function () {
    expect(blog.posts).to.exist;
  });

  it('can be watched', function (done) {
    expect(blog.watch).to.exist;

    var stream = blog.watch();
    stream.onValue(() => done());
  });

  it('can be unwatched', function (done) {
    expect(blog.unwatch).to.exist;

    var stream = blog.watch();
    stream.onEnd(() => done());
    blog.unwatch();
  });
});
