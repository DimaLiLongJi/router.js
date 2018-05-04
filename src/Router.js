class Router {
  constructor() {
    this.routes = {};
    this.currentUrl = '';
    this.lastRoute = null;
    this.rootDom = null;
    this.utils = new Utils();
    window.addEventListener('load', this.refresh.bind(this), false);
    window.addEventListener('hashchange', this.refresh.bind(this), false);
  }

  $routeChange(lastRoute, nextRoute) {}

  init(arr) {
    if (arr && arr instanceof Array) {
      arr.forEach(route => {
        if (route.path && route.controller && this.utils.isFunction(route.controller)) {
          this.route(route.path, route.controller);
        } else {
          console.error('need path or controller');
          return false;
        }
      });
      const rootDom = document.querySelector('#root');
      this.rootDom = rootDom || null;
    } else {
      console.error('no routes exit');
    }
  }

  route(path, controller) {
    this.routes[path] = controller || function () {};
  }

  refresh() {
    this.currentUrl = location.hash.slice(1) || '/';
    if (this.routes[this.currentUrl]) {
      if (window.routerController) {
        if (window.routerController.$onDestory) window.routerController.$onDestory();
        delete window.routerController;
      }
      const controller = new this.routes[this.currentUrl]();
      window.routerController = controller;
      if (controller.$beforeInit) controller.$beforeInit();
      if (controller.$renderComponent) controller.$renderComponent();
      if (controller.$onInit) controller.$onInit();
      this.renderController(controller).then(() => {
        this.$routeChange(this.lastRoute, this.currentUrl);
        this.lastRoute = this.currentUrl;
      }).catch(() => {
        console.error('route change failed');
      });
    }
  }

  renderController(controller) {
    const template = controller.declareTemplate;
    if (template && typeof template === 'string' && this.rootDom) {
      if (controller.$beforeMount) controller.$beforeMount();
      this.replaceDom(controller).then(() => {
        if (controller.declareComponents) {
          for (let key in controller.declareComponents) {
            if (controller.declareComponents[key].$reRender) controller.declareComponents[key].$reRender();
            if (controller.declareComponents[key].$afterMount) controller.declareComponents[key].$afterMount();
          }
        }
        if (controller.$afterMount) controller.$afterMount();
      });
      return Promise.resolve();
    } else {
      console.error('renderController failed: template or rootDom is not exit');
      return Promise.reject();
    }
  }

  replaceDom(controller) {
    const template = controller.declareTemplate;
    if (this.rootDom.hasChildNodes()) {
      let childs = this.rootDom.childNodes;
      for (let i = childs.length - 1; i >= 0; i--) {
        this.rootDom.removeChild(childs.item(i));
      }
    }
    let templateDom = this.parseDom(template);
    let fragment = document.createDocumentFragment();
    fragment.appendChild(templateDom);
    this.rootDom.appendChild(fragment);
    return Promise.resolve();
  }

  parseDom(template) {
    const elementCreated = document.createElement('div');
    elementCreated.id = 'route-container';
    let newTemplate = null;
    if (window.routerController) {
      newTemplate = template.replace(/( )(rt-)([A-Za-z]+="|[A-Za-z]+=')(this)/g, (...args) => `${args[1]}on${args[3]}window.routerController`);
    }
    elementCreated.innerHTML = newTemplate;
    return elementCreated;
  }
}
