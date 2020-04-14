const isPortReachable = require('is-port-reachable');

module.exports = {
  async findPort(starting, end) {
    for (var i = starting; i < end; i++) {
      const reachable = await isPortReachable(i, {host: 'localhost'});
      if (!reachable) {
        return i;
      }
    }
    throw new Error("No port between " + start + " and " + end + " dound that is not in use :(");
  },
  objFillDefaults(obj, defaults) {
    Object.keys(defaults).forEach(key => {
      if (!(key in obj)) {
        obj[key] = defaults[key];
      }
      else if (typeof defaults[key] == "object" && defaults[key] != null) {
        obj[key] = obj[key].fillDefaults(defaults[key]);
      }
    });
    return obj;
  }
};
