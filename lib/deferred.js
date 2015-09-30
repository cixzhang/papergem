
function Deferred () {
  this.resolve = null;
  this.reject = null;

  this.status = null;

  this.promise = new Promise((res, rej) => {
    this.resolve = () => {
      res();
      this.status = 'resolved';
    };
    this.reject = () => {
      rej();
      this.status = 'rejected';
    };
  });
  Object.freeze(this);
}

module.exports = Deferred;
