
function Deferred () {
  this.resolve = null;
  this.reject = null;

  this.promise = new Promise((res, rej) => {
    this.resolve = res;
    this.reject = rej;
  });
  Object.freeze(this);
}

module.exports = Deferred;
