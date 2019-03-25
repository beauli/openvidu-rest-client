const util = require("util");

function restApiError(code, message, data) {
  this.code = code;
  this.message = message;
  this.data = data;
}

util.inherits(restApiError, Error);

module.exports = restApiError;
