var https = require('https');

function getParamString (value, key) {
  return key + '=' + value;
}

function request (host, path) {
  var data = null;

  return new Promise(function (resolve, reject) {
    var req = https.get({
        hostname: host,
        path: path,
      }, function (res) {
        var body = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', function () {
          data = JSON.parse(body);
          resolve(data);
        });
      });

    req.on('error', reject);
  });
}

module.exports = {
  request: request,
  getParamString: getParamString   
};
