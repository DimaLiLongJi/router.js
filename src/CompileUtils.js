class CompileUtilForRepeat {
  constructor(fragment) {
    this.$fragment = fragment;
  }

  _getVMVal(vm, exp) {
    const valueList = exp.replace('()', '').split('.');
    let value = vm;
    valueList.forEach(v => {
      if (v === 'this') return;
      value = value[v];
    });
    return value;
  }

  _getVMRepeatVal(val, exp, key) {
    let value;
    const valueList = exp.replace('()', '').split('.');
    valueList.forEach((v, index) => {
      if (v === key && index === 0) {
        value = val;
        return;
      }
      value = value[v];
    });
    return value;
  }

  bind(node, val, key, dir, exp, index, vm, watchData) {
    let value;
    if (exp.indexOf(key) === 0 || exp.indexOf(`${key}.`) === 0) {
      value = this._getVMRepeatVal(val, exp, key);
    } else {
      value = this._getVMVal(vm, exp);
    }
    const watchValue = this._getVMVal(vm, watchData);
    if (!node.hasChildNodes()) this.templateUpdater(node, val, key, vm);
    // this.templateUpdater(node, val, key, vm);
    const updaterFn = this[`${dir}Updater`];
    switch (dir) {
    case 'model':
      updaterFn && updaterFn.call(this, node, value, exp, key, index, watchValue, watchData, vm);
      break;
    default:
      updaterFn && updaterFn.call(this, node, value);
    }
  }

  templateUpdater(node, val, key, vm) {
    const text = node.textContent;
    const reg = /\{\{(.*)\}\}/g;
    if (reg.test(text)) {
      const exp = RegExp.$1;
      let value;
      if (exp.indexOf(key) === 0 || exp.indexOf(`${key}.`) === 0) {
        value = this._getVMRepeatVal(val, exp, key);
      } else {
        value = this._getVMVal(vm, exp);
      }
      node.textContent = node.textContent.replace(/(\{\{.*\}\})/g, value);
    }
  }

  textUpdater(node, value) {
    node.textContent = typeof value === 'undefined' ? '' : value;
  }

  htmlUpdater(node, value) {
    node.innerHTML = typeof value === 'undefined' ? '' : value;
  }

  ifUpdater(node, value) {
    if (value) this.$fragment.appendChild(node);
  }

  classUpdater(node, value, oldValue) {
    let className = node.className;
    className = className.replace(oldValue, '').replace(/\s$/, '');
    const space = className && String(value) ? ' ' : '';
    node.className = className + space + value;
  }

  modelUpdater(node, value, exp, key, index, watchValue, watchData, vm) {
    node.value = typeof value === 'undefined' ? '' : value;
    const val = exp.replace(`${key}.`, '');
    const fn = function (event) {
      event.preventDefault();
      if (event.target.value === watchValue[index][val]) return;
      watchValue[index][val] = event.target.value;
    };
    try {
      node.addEventListener('input', fn, false);
    } catch (err) {
      node.attachEvent('oninput', fn);
    }
  }

  eventHandler(node, vm, exp, event, key, val) {
    const eventType = event.split(':')[1];
    const fnList = exp.replace(/\(.*\)/, '').split('.');
    const args = exp.match(/\((.*)\)/)[1].replace(/ /g, '').split(',');
    let fn = vm;
    fnList.forEach(f => {
      if (f === 'this') return;
      fn = fn[f];
    });
    const func = (event) => {
      let argsList = [];
      args.forEach(arg => {
        if (arg === '') return false;
        if (arg === '$event') argsList.push(event);
        if (/(this.).*/g.test(arg) || /(this.state.).*/g.test(arg) || /(this.props.).*/g.test(arg)) argsList.push(this._getVMVal(vm, arg));
        if (/\'.*\'/g.test(arg)) argsList.push(arg.match(/\'(.*)\'/)[1]);
        if (!/\'.*\'/g.test(arg) && /^[0-9]*$/g.test(arg)) argsList.push(Number(arg));
        if (arg === 'true' || arg === 'false') argsList.push(arg === 'true');
        if (arg.indexOf(key) === 0 || arg.indexOf(`${key}.`) === 0) argsList.push(this._getVMRepeatVal(val, arg, key));
      });
      fn.apply(vm, argsList);
    };
    if (eventType && fn) node.addEventListener(eventType, func, false);
  }
}

class CompileUtil {
  constructor(fragment) {
    this.$fragment = fragment;
  }

  _getVMVal(vm, exp) {
    const valueList = exp.replace('()', '').split('.');
    let value = vm;
    valueList.forEach((v, index) => {
      if (v === 'this' && index === 0) return;
      value = value[v];
    });
    return value;
  }

  _getVMRepeatVal(vm, exp) {
    const vlList = exp.split(' ');
    const value = this._getVMVal(vm, vlList[3]);
    return value;
  }

  _setVMVal(vm, exp, value) {
    var val = vm;
    exp = exp.split('.');
    exp.forEach((k, i) => {
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }

  bind(node, vm, exp, dir) {
    const updaterFn = this[`${dir}Updater`];
    const isRepeatNode = this.isRepeatNode(node);
    if (isRepeatNode) { // compile repeatNode's attributes
      switch (dir) {
      case 'repeat':
        updaterFn && updaterFn.call(this, node, this._getVMRepeatVal(vm, exp), exp, vm);
        break;
      }
    } else { // compile unrepeatNode's attributes
      switch (dir) {
      case 'model':
        updaterFn && updaterFn.call(this, node, this._getVMVal(vm, exp), exp, vm);
        break;
      case 'text':
        updaterFn && updaterFn.call(this, node, this._getVMVal(vm, exp));
        break;
      case 'if':
        updaterFn && updaterFn.call(this, node, this._getVMVal(vm, exp), exp, vm);
        break;
      // case 'prop':
      //   updaterFn && updaterFn.call(this, node, this._getVMVal(vm, /^\{(.+)\}$/.exec(exp)[1]), exp, vm);
      //   break;
      default:
        updaterFn && updaterFn.call(this, node, this._getVMVal(vm, exp));
      }
    }
  }

  templateUpdater(node, vm, exp) {
    node.textContent = node.textContent.replace(/(\{\{.*\}\})/g, this._getVMVal(vm, exp));
  }

  textUpdater(node, value) {
    node.textContent = typeof value === 'undefined' ? '' : value;
  }

  htmlUpdater(node, value) {
    node.innerHTML = typeof value === 'undefined' ? '' : value;
  }

  ifUpdater(node, value) {
    if (!value && this.$fragment.contains(node)) {
      this.$fragment.removeChild(node);
    } else {
      this.$fragment.appendChild(node);
    }
  }

  // propUpdater(node, value, exp) {
  //   const attributesList = Array.from(node.attributes);
  //   // let _props;
  //   if (!attributesList.find(attr => attr.name === '_props')) {
  //     const _props = {};
  //     const propsName = attributesList.find(attr => attr.value === exp).name;
  //     _props[propsName] = value;
  //     node.setAttribute('_props', JSON.stringify(_props));
  //   }
  //   if (attributesList.find(attr => attr.name === '_props')) {
  //     const _props = JSON.parse(node.getAttribute('_props'));
  //     const propsName = attributesList.find(attr => attr.value === exp).name;
  //     _props[propsName] = value;
  //     console.log('_props', _props);
  //     node.setAttribute('_props', JSON.stringify(_props));
  //     console.log('JSON.stringify(_props)', JSON.parse(node.getAttribute('_props')));
  //   }
  //   // console.log('JSON.stringify(_props)', JSON.parse(node.getAttribute('_props')));
  // }

  classUpdater(node, value, oldValue) {
    let className = node.className;
    className = className.replace(oldValue, '').replace(/\s$/, '');
    const space = className && String(value) ? ' ' : '';
    node.className = className + space + value;
  }

  modelUpdater(node, value, exp, vm) {
    node.value = typeof value === 'undefined' ? '' : value;
    const val = exp.replace(/(this.state.)|(this.props)/, '');
    const fn = function (event) {
      event.preventDefault();
      if (/(this.state.).*/.test(exp)) vm.state[val] = event.target.value;
      if (/(this.props.).*/.test(exp)) vm.props[val] = event.target.value;
    };
    try {
      node.addEventListener('input', fn, false);
    } catch (err) {
      node.attachEvent('oninput', fn);
    }
  }

  repeatUpdater(node, value, expFather, vm) {
    const key = expFather.split(' ')[1];
    const watchData = expFather.split(' ')[3];
    value.forEach((val, index) => {
      const newElement = node.cloneNode(true);
      const nodeAttrs = newElement.attributes;
      const text = newElement.textContent;
      const reg = /\{\{(.*)\}\}/g;
      if (reg.test(text) && text.indexOf(`{{${key}`) >= 0 && !newElement.hasChildNodes()) {
        new CompileUtilForRepeat(this.$fragment).templateUpdater(newElement, val, key, vm);
      }
      if (nodeAttrs) {
        Array.from(nodeAttrs).forEach(attr => {
          const attrName = attr.name;
          if (this.isDirective(attrName) && attrName !== 'es-repeat') {
            const dir = attrName.substring(3);
            const exp = attr.value;
            if (this.isEventDirective(dir)) {
              new CompileUtilForRepeat(this.$fragment).eventHandler(newElement, vm, exp, dir, key, val);
            } else {
              new CompileUtilForRepeat(this.$fragment).bind(newElement, val, key, dir, exp, index, vm, watchData);
            }
          }
        });
      }
      // if (!this.isIfNode(node)) this.$fragment.appendChild(newElement);
      if (!this.isIfNode(node)) {
        this.$fragment.insertBefore(newElement, node);
      // if (this.$fragment.contains(node)) this.$fragment.removeChild(node);
      }
      if (newElement.hasChildNodes()) this.repeatChildrenUpdater(newElement, val, expFather, index, vm);
    });
  }

  repeatChildrenUpdater(node, value, expFather, index, vm) {
    const key = expFather.split(' ')[1];
    const watchData = expFather.split(' ')[3];
    Array.from(node.childNodes).forEach(child => {
      if (this.isRepeatProp(child)) child.setAttribute(`_prop-${key}`, JSON.stringify(value));

      const nodeAttrs = child.attributes;
      const text = child.textContent;
      const reg = /\{\{(.*)\}\}/g;
      let canShowByIf = true;
      if (reg.test(text) && text.indexOf(`{{${key}`) >= 0 && !child.hasChildNodes()) {
        new CompileUtilForRepeat(node).templateUpdater(child, value, key, vm);
      }
      if (nodeAttrs) {
        Array.from(nodeAttrs).forEach(attr => {
          const attrName = attr.name;
          const exp = attr.value;
          const dir = attrName.substring(3);
          const repeatUtils = new CompileUtilForRepeat();
          if (this.isDirective(attrName) && attrName !== 'es-repeat' && new RegExp(`(^${key})|(^this)`).test(exp)) {
            if (this.isEventDirective(dir)) {
              new CompileUtilForRepeat(node).eventHandler(child, vm, exp, dir, key, value);
            } else {
              new CompileUtilForRepeat(node).bind(child, value, key, dir, exp, index, vm, watchData);
            }
            if (dir === 'if' && new RegExp(`(^${key})`).test(exp)) canShowByIf = repeatUtils._getVMRepeatVal(value, exp, key);
            if (dir === 'if' && /^(this\.)/.test(exp)) canShowByIf = repeatUtils._getVMVal(vm, exp);
            child.removeAttribute(attrName);
          }
        });
      }

      if (child.hasChildNodes()) this.repeatChildrenUpdater(child, value, expFather, index, vm);

      if (!canShowByIf) {
        if (node.contains(child)) node.removeChild(child);
      }

      const newAttrs = child.attributes;
      if (newAttrs && canShowByIf) {
        const restRepeat = Array.from(newAttrs).find(attr => this.isDirective(attr.name) && attr.name === 'es-repeat');
        if (restRepeat) {
          new CompileUtil(node).bind(child, vm, restRepeat.value, restRepeat.name.substring(3));
          if (node.contains(child)) node.removeChild(child);
        }
      }
    });
  }

  isDirective(attr) {
    return attr.indexOf('es-') === 0;
  }

  isEventDirective(event) {
    return event.indexOf('on') === 0;
  }

  isElementNode(node) {
    return node.nodeType === 1;
  }

  isRepeatNode(node) {
    const nodeAttrs = node.attributes;
    let result = false;
    if (nodeAttrs) {
      Array.from(nodeAttrs).forEach(attr => {
        const attrName = attr.name;
        if (attrName === 'es-repeat') result = true;
      });
    }
    return result;
  }

  isIfNode(node) {
    const nodeAttrs = node.attributes;
    let result = false;
    if (nodeAttrs) {
      Array.from(nodeAttrs).forEach(attr => {
        const attrName = attr.name;
        if (attrName === 'es-if') result = true;
      });
    }
    return result;
  }

  isRepeatProp(node) {
    const nodeAttrs = node.attributes;
    let result = false;
    if (nodeAttrs) return Array.from(nodeAttrs).find(attr => /^\{(.+)\}$/.test(attr.value));
    return result;
  }
}

module.exports = {
  CompileUtilForRepeat,
  CompileUtil,
};
