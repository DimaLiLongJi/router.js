const Utils = require('./Utils');

class Watcher {
  constructor(data, watcher, render) {
    this.data = data;
    this.watcher = watcher;
    this.render = render;
    this.watchData(this.data);
    this.utils = new Utils();
  }

  watchData(data) {
    if (!data || typeof data !== 'object') return;
    const vm = this;
    for (let key in data) {
      let val = data[key];
      vm.watchData(val);
      Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
          return val;
        },
        set(newVal) {
          if (vm.utils.isEqual(newVal, val)) return;
          const oldData = {};
          oldData[key] = val;
          const newData = {};
          newData[key] = newVal;
          val = newVal;
          vm.watchData(val);
          if (vm.watcher) vm.watcher(oldData, newData);
          if (vm.render) vm.render();
        },
      });
    }
  }
}

module.exports = Watcher;
