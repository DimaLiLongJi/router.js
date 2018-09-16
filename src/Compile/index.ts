import { IPatchList } from '../types';

import VirtualDOM from '../VirtualDOM';
import Utils from '../Utils';
import { CompileUtil } from '../CompileUtils';

/**
 * main compiler
 *
 * @class Compile
 */
class Compile {
  public utils: Utils;
  public $vm: any;
  public $el: Element;
  public $fragment: DocumentFragment;

  /**
   * Creates an instance of Compile.
   * @param {(string | Element)} el
   * @param {*} vm
   * @param {Element} [routerRenderDom]
   * @memberof Compile
   */
  constructor(el: string | Element, vm: any, routerRenderDom?: Element) {
    this.utils = new Utils();
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el as Element : document.querySelector(el as string);
    if (this.$el) {
      this.$fragment = this.node2Fragment();
      this.init();
      if (routerRenderDom) {
        // replace routeDom
        const newRouterRenderDom = this.$fragment.querySelectorAll(this.$vm.$vm.$routeDOMKey)[0];
        newRouterRenderDom.parentNode.replaceChild(routerRenderDom, newRouterRenderDom);
      }

      let oldVnode = VirtualDOM.parseToVnode(this.$el);
      // console.log(6666, oldVnode);
      let newVnode = VirtualDOM.parseToVnode(this.$fragment);
      // console.log(7777, newVnode);
      let patchList: IPatchList[] = [];
      VirtualDOM.diffVnode(oldVnode, newVnode, patchList);
      // console.log(8888, patchList);
      VirtualDOM.renderVnode(patchList);

      this.utils = null;
      this.$fragment = null;
      oldVnode = null;
      newVnode = null;
      patchList = null;
    }
  }

  /**
   * init compile
   *
   * @memberof Compile
   */
  public init(): void {
    this.compileElement(this.$fragment);
  }

  /**
   * compile element
   *
   * @param {DocumentFragment} fragment
   * @memberof Compile
   */
  public compileElement(fragment: DocumentFragment): void {
    const elementCreated = document.createElement('div');
    elementCreated.innerHTML = this.utils.formatInnerHTML(this.$vm.$template);
    const childNodes = elementCreated.childNodes;
    this.recursiveDOM(childNodes, fragment);
  }

  /**
   * recursive DOM for New State
   *
   * @param {(NodeListOf<Node & ChildNode>)} childNodes
   * @param {(DocumentFragment | Element)} fragment
   * @memberof Compile
   */
  public recursiveDOM(childNodes: NodeListOf<Node & ChildNode>, fragment: DocumentFragment | Element): void {
    Array.from(childNodes).forEach((node: Element) => {

      if (node.hasChildNodes() && !this.isRepeatNode(node)) this.recursiveDOM(node.childNodes, node);

      fragment.appendChild(node);

      const text = node.textContent;
      const reg = /\{\{(.*)\}\}/g;
      if (this.isElementNode(node)) {
        this.compile(node, fragment);
      }

      if (this.isTextNode(node) && reg.test(text)) {
        const textList = text.match(/(\{\{(state\.)[^\{\}]+?\}\})/g);
        if (textList && textList.length > 0) {
          for (let i = 0; i < textList.length; i++) {
              this.compileText(node, textList[i]);
          }
        }
      }

      // after compile repeatNode, remove repeatNode
      if (this.isRepeatNode(node) && fragment.contains(node)) fragment.removeChild(node);
    });
  }

  /**
   * compile string to DOM
   *
   * @param {Element} node
   * @param {(DocumentFragment | Element)} fragment
   * @memberof Compile
   */
  public compile(node: Element, fragment: DocumentFragment | Element): void {
    const nodeAttrs = node.attributes;
    if (nodeAttrs) {
      Array.from(nodeAttrs).forEach(attr => {
        const attrName = attr.name;
        if (this.isDirective(attrName)) {
          const dir = attrName.substring(3);
          const exp = attr.value;
          if (this.isEventDirective(dir)) {
            this.eventHandler(node, this.$vm, exp, dir);
          } else {
            new CompileUtil(fragment).bind(node, this.$vm, exp, dir);
          }
        }
      });
    }
  }

  /**
   * create document fragment
   *
   * @returns {DocumentFragment}
   * @memberof Compile
   */
  public node2Fragment(): DocumentFragment {
    return document.createDocumentFragment();
  }

  /**
   * compile text and use CompileUtil templateUpdater
   *
   * @param {Element} node
   * @param {string} exp
   * @memberof Compile
   */
  public compileText(node: Element, exp: string): void {
    new CompileUtil(this.$fragment).templateUpdater(node, this.$vm, exp);
  }

  /**
   * compile event and build eventType in DOM
   *
   * @param {Element} node
   * @param {*} vm
   * @param {string} exp
   * @param {string} eventName
   * @memberof Compile
   */
  public eventHandler(node: Element, vm: any, exp: string, eventName: string): void {
    const eventType = eventName.split(':')[1];

    const fnList = exp.replace(/^(\@)/, '').replace(/\(.*\)/, '').split('.');
    const args = exp.replace(/^(\@)/, '').match(/\((.*)\)/)[1].replace(/\s+/g, '').split(',');

    let fn = vm;
    fnList.forEach(f => {
      fn = fn[f];
    });
    const func = function(event: Event): void {
      const argsList: any[] = [];
      args.forEach(arg => {
        if (arg === '') return false;
        if (arg === '$event') return argsList.push(event);
        if (arg === '$element') return argsList.push(node);
        if (/(state.).*/g.test(arg)) return argsList.push(new CompileUtil()._getVMVal(vm, arg));
        if (/\'.*\'/g.test(arg)) return argsList.push(arg.match(/\'(.*)\'/)[1]);
        if (!/\'.*\'/g.test(arg) && /^[0-9]*$/g.test(arg)) return argsList.push(Number(arg));
        if (arg === 'true' || arg === 'false') return argsList.push(arg === 'true');
      });
      fn.apply(vm, argsList);
    };
    if (eventType && fn) {
      (node as any)[`on${eventType}`] = func;
      (node as any)[`event${eventType}`] = func;
      if (node.eventTypes) {
        const eventlist = JSON.parse(node.eventTypes);
        eventlist.push(eventType);
        node.eventTypes = eventlist;
      }
      if (!node.eventTypes) node.eventTypes = JSON.stringify([eventType]);
    }
  }

  /**
   * judge attribute is nv directive or not
   *
   * @param {string} attr
   * @returns {boolean}
   * @memberof Compile
   */
  public isDirective(attr: string): boolean {
    return attr.indexOf('nv-') === 0;
  }

  /**
   * judge attribute is nv event directive or not
   *
   * @param {string} eventName
   * @returns {boolean}
   * @memberof Compile
   */
  public isEventDirective(eventName: string): boolean {
    return eventName.indexOf('on') === 0;
  }

  /**
   * judge DOM is a element node or not
   *
   * @param {(Element | string)} node
   * @returns {boolean}
   * @memberof Compile
   */
  public isElementNode(node: Element | string): boolean {
    if (typeof node === 'string') return false;
    return node.nodeType === 1;
  }

  /**
   * judge DOM is nv-repeat dom or not
   *
   * @param {Element} node
   * @returns {boolean}
   * @memberof Compile
   */
  public isRepeatNode(node: Element): boolean {
    const nodeAttrs = node.attributes;
    let result = false;
    if (nodeAttrs) {
      Array.from(nodeAttrs).forEach(attr => {
        const attrName = attr.name;
        if (attrName === 'nv-repeat') result = true;
      });
    }
    return result;
  }

  /**
   * judge DOM is nv-if dom or not
   *
   * @param {Element} node
   * @returns {boolean}
   * @memberof Compile
   */
  public isIfNode(node: Element): boolean {
    const nodeAttrs = node.attributes;
    let result = false;
    if (nodeAttrs) {
      Array.from(nodeAttrs).forEach(attr => {
        const attrName = attr.name;
        if (attrName === 'nv-if') result = true;
      });
    }
    return result;
  }

  /**
   * judge DOM is text node or not
   *
   * @param {Element} node
   * @returns {boolean}
   * @memberof Compile
   */
  public isTextNode(node: Element): boolean {
    return node.nodeType === 3;
  }
}

export default Compile;
