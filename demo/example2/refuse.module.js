function e(){e=function(){return t};var t={},r=Object.prototype,n=r.hasOwnProperty,o=Object.defineProperty||function(e,t,r){e[t]=r.value},i="function"==typeof Symbol?Symbol:{},a=i.iterator||"@@iterator",f=i.asyncIterator||"@@asyncIterator",c=i.toStringTag||"@@toStringTag";function u(e,t,r){return Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}),e[t]}try{u({},"")}catch(e){u=function(e,t,r){return e[t]=r}}function s(e,t,r,n){var i=Object.create((t&&t.prototype instanceof h?t:h).prototype),a=new j(n||[]);return o(i,"_invoke",{value:x(e,r,a)}),i}function l(e,t,r){try{return{type:"normal",arg:e.call(t,r)}}catch(e){return{type:"throw",arg:e}}}t.wrap=s;var p={};function h(){}function y(){}function v(){}var d={};u(d,a,function(){return this});var m=Object.getPrototypeOf,g=m&&m(m(D([])));g&&g!==r&&n.call(g,a)&&(d=g);var b=v.prototype=h.prototype=Object.create(d);function w(e){["next","throw","return"].forEach(function(t){u(e,t,function(e){return this._invoke(t,e)})})}function L(e,t){function r(o,i,a,f){var c=l(e[o],e,i);if("throw"!==c.type){var u=c.arg,s=u.value;return s&&"object"==typeof s&&n.call(s,"__await")?t.resolve(s.__await).then(function(e){r("next",e,a,f)},function(e){r("throw",e,a,f)}):t.resolve(s).then(function(e){u.value=e,a(u)},function(e){return r("throw",e,a,f)})}f(c.arg)}var i;o(this,"_invoke",{value:function(e,n){function o(){return new t(function(t,o){r(e,n,t,o)})}return i=i?i.then(o,o):o()}})}function x(e,t,r){var n="suspendedStart";return function(o,i){if("executing"===n)throw new Error("Generator is already running");if("completed"===n){if("throw"===o)throw i;return{value:void 0,done:!0}}for(r.method=o,r.arg=i;;){var a=r.delegate;if(a){var f=A(a,r);if(f){if(f===p)continue;return f}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if("suspendedStart"===n)throw n="completed",r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);n="executing";var c=l(e,t,r);if("normal"===c.type){if(n=r.done?"completed":"suspendedYield",c.arg===p)continue;return{value:c.arg,done:r.done}}"throw"===c.type&&(n="completed",r.method="throw",r.arg=c.arg)}}}function A(e,t){var r=t.method,n=e.iterator[r];if(void 0===n)return t.delegate=null,"throw"===r&&e.iterator.return&&(t.method="return",t.arg=void 0,A(e,t),"throw"===t.method)||"return"!==r&&(t.method="throw",t.arg=new TypeError("The iterator does not provide a '"+r+"' method")),p;var o=l(n,e.iterator,t.arg);if("throw"===o.type)return t.method="throw",t.arg=o.arg,t.delegate=null,p;var i=o.arg;return i?i.done?(t[e.resultName]=i.value,t.next=e.nextLoc,"return"!==t.method&&(t.method="next",t.arg=void 0),t.delegate=null,p):i:(t.method="throw",t.arg=new TypeError("iterator result is not an object"),t.delegate=null,p)}function E(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t)}function O(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t}function j(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(E,this),this.reset(!0)}function D(e){if(e){var t=e[a];if(t)return t.call(e);if("function"==typeof e.next)return e;if(!isNaN(e.length)){var r=-1,o=function t(){for(;++r<e.length;)if(n.call(e,r))return t.value=e[r],t.done=!1,t;return t.value=void 0,t.done=!0,t};return o.next=o}}return{next:M}}function M(){return{value:void 0,done:!0}}return y.prototype=v,o(b,"constructor",{value:v,configurable:!0}),o(v,"constructor",{value:y,configurable:!0}),y.displayName=u(v,c,"GeneratorFunction"),t.isGeneratorFunction=function(e){var t="function"==typeof e&&e.constructor;return!!t&&(t===y||"GeneratorFunction"===(t.displayName||t.name))},t.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,v):(e.__proto__=v,u(e,c,"GeneratorFunction")),e.prototype=Object.create(b),e},t.awrap=function(e){return{__await:e}},w(L.prototype),u(L.prototype,f,function(){return this}),t.AsyncIterator=L,t.async=function(e,r,n,o,i){void 0===i&&(i=Promise);var a=new L(s(e,r,n,o),i);return t.isGeneratorFunction(r)?a:a.next().then(function(e){return e.done?e.value:a.next()})},w(b),u(b,c,"Generator"),u(b,a,function(){return this}),u(b,"toString",function(){return"[object Generator]"}),t.keys=function(e){var t=Object(e),r=[];for(var n in t)r.push(n);return r.reverse(),function e(){for(;r.length;){var n=r.pop();if(n in t)return e.value=n,e.done=!1,e}return e.done=!0,e}},t.values=D,j.prototype={constructor:j,reset:function(e){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(O),!e)for(var t in this)"t"===t.charAt(0)&&n.call(this,t)&&!isNaN(+t.slice(1))&&(this[t]=void 0)},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(e){if(this.done)throw e;var t=this;function r(r,n){return a.type="throw",a.arg=e,t.next=r,n&&(t.method="next",t.arg=void 0),!!n}for(var o=this.tryEntries.length-1;o>=0;--o){var i=this.tryEntries[o],a=i.completion;if("root"===i.tryLoc)return r("end");if(i.tryLoc<=this.prev){var f=n.call(i,"catchLoc"),c=n.call(i,"finallyLoc");if(f&&c){if(this.prev<i.catchLoc)return r(i.catchLoc,!0);if(this.prev<i.finallyLoc)return r(i.finallyLoc)}else if(f){if(this.prev<i.catchLoc)return r(i.catchLoc,!0)}else{if(!c)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return r(i.finallyLoc)}}}},abrupt:function(e,t){for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break}}i&&("break"===e||"continue"===e)&&i.tryLoc<=t&&t<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=e,a.arg=t,i?(this.method="next",this.next=i.finallyLoc,p):this.complete(a)},complete:function(e,t){if("throw"===e.type)throw e.arg;return"break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),p},finish:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.finallyLoc===e)return this.complete(r.completion,r.afterLoc),O(r),p}},catch:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.tryLoc===e){var n=r.completion;if("throw"===n.type){var o=n.arg;O(r)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(e,t,r){return this.delegate={iterator:D(e),resultName:t,nextLoc:r},"next"===this.method&&(this.arg=void 0),p}},t}function t(){return t=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(e[n]=r[n])}return e},t.apply(this,arguments)}function r(e,t){return r=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},r(e,t)}function n(e,t,o){return n=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){})),!0}catch(e){return!1}}()?Reflect.construct.bind():function(e,t,n){var o=[null];o.push.apply(o,t);var i=new(Function.bind.apply(e,o));return n&&r(i,n.prototype),i},n.apply(null,arguments)}function o(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function i(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(r)return(r=r.call(e)).next.bind(r);if(Array.isArray(e)||(r=function(e,t){if(e){if("string"==typeof e)return o(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?o(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var n=0;return function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}const a=(e,t,r,n)=>{let o;t[0]=0;for(let i=1;i<t.length;i++){const f=t[i++],c=t[i]?(t[0]|=f?1:2,r[t[i++]]):t[++i];3===f?n[0]=c:4===f?n[1]=Object.assign(n[1]||{},c):5===f?(n[1]=n[1]||{})[t[++i]]=c:6===f?n[1][t[++i]]+=c+"":f?(o=e.apply(c,a(e,c,r,["",null])),n.push(o),c[0]?t[0]|=2:(t[i-2]=0,t[i]=o)):n.push(c)}return n},f=function(e){let t,r,n=1,o="",i="",a=[0];const f=e=>{1===n&&(e||(o=o.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?a.push(0,e,o):3===n&&(e||o)?(a.push(3,e,o),n=2):2===n&&"..."===o&&e?a.push(4,e,0):2===n&&o&&!e?a.push(5,0,!0,o):n>=5&&((o||!e&&5===n)&&(a.push(n,0,o,r),n=6),e&&(a.push(n,e,0,r),n=6)),o=""};for(let c=0;c<e.length;c++){c&&(1===n&&f(),f(c));for(let u=0;u<e[c].length;u++)t=e[c][u],1===n?"<"===t?(f(),a=[a],n=3):o+=t:4===n?"--"===o&&">"===t?(n=1,o=""):o=t+o[0]:i?t===i?i="":o+=t:'"'===t||"'"===t?i=t:">"===t?(f(),n=1):n&&("="===t?(n=5,r=o,o=""):"/"===t&&(n<5||">"===e[c][u+1])?(f(),3===n&&(a=a[0]),n=a,(a=a[0]).push(2,0,n),n=0):" "===t||"\t"===t||"\n"===t||"\r"===t?(f(),n=2):o+=t),3===n&&"!--"===o&&(n=4,a=a[0])}return f(),a},c=new Map;function u(e){return e instanceof Buffer?Buffer.from(e):new e.constructor(e.buffer.slice(),e.byteOffset,e.length)}var s=function(e){return(e=e||{}).circles?function(e){var t=[],r=[];return e.proto?function e(o){if("object"!=typeof o||null===o)return o;if(o instanceof Date)return new Date(o);if(Array.isArray(o))return n(o,e);if(o instanceof Map)return new Map(n(Array.from(o),e));if(o instanceof Set)return new Set(n(Array.from(o),e));var i={};for(var a in t.push(o),r.push(i),o){var f=o[a];if("object"!=typeof f||null===f)i[a]=f;else if(f instanceof Date)i[a]=new Date(f);else if(f instanceof Map)i[a]=new Map(n(Array.from(f),e));else if(f instanceof Set)i[a]=new Set(n(Array.from(f),e));else if(ArrayBuffer.isView(f))i[a]=u(f);else{var c=t.indexOf(f);i[a]=-1!==c?r[c]:e(f)}}return t.pop(),r.pop(),i}:function e(o){if("object"!=typeof o||null===o)return o;if(o instanceof Date)return new Date(o);if(Array.isArray(o))return n(o,e);if(o instanceof Map)return new Map(n(Array.from(o),e));if(o instanceof Set)return new Set(n(Array.from(o),e));var i={};for(var a in t.push(o),r.push(i),o)if(!1!==Object.hasOwnProperty.call(o,a)){var f=o[a];if("object"!=typeof f||null===f)i[a]=f;else if(f instanceof Date)i[a]=new Date(f);else if(f instanceof Map)i[a]=new Map(n(Array.from(f),e));else if(f instanceof Set)i[a]=new Set(n(Array.from(f),e));else if(ArrayBuffer.isView(f))i[a]=u(f);else{var c=t.indexOf(f);i[a]=-1!==c?r[c]:e(f)}}return t.pop(),r.pop(),i};function n(e,n){for(var o=Object.keys(e),i=new Array(o.length),a=0;a<o.length;a++){var f=o[a],c=e[f];if("object"!=typeof c||null===c)i[f]=c;else if(c instanceof Date)i[f]=new Date(c);else if(ArrayBuffer.isView(c))i[f]=u(c);else{var s=t.indexOf(c);i[f]=-1!==s?r[s]:n(c)}}return i}}(e):e.proto?function e(r){if("object"!=typeof r||null===r)return r;if(r instanceof Date)return new Date(r);if(Array.isArray(r))return t(r,e);if(r instanceof Map)return new Map(t(Array.from(r),e));if(r instanceof Set)return new Set(t(Array.from(r),e));var n={};for(var o in r){var i=r[o];n[o]="object"!=typeof i||null===i?i:i instanceof Date?new Date(i):i instanceof Map?new Map(t(Array.from(i),e)):i instanceof Set?new Set(t(Array.from(i),e)):ArrayBuffer.isView(i)?u(i):e(i)}return n}:function e(r){if("object"!=typeof r||null===r)return r;if(r instanceof Date)return new Date(r);if(Array.isArray(r))return t(r,e);if(r instanceof Map)return new Map(t(Array.from(r),e));if(r instanceof Set)return new Set(t(Array.from(r),e));var n={};for(var o in r)if(!1!==Object.hasOwnProperty.call(r,o)){var i=r[o];n[o]="object"!=typeof i||null===i?i:i instanceof Date?new Date(i):i instanceof Map?new Map(t(Array.from(i),e)):i instanceof Set?new Set(t(Array.from(i),e)):ArrayBuffer.isView(i)?u(i):e(i)}return n};function t(e,t){for(var r=Object.keys(e),n=new Array(r.length),o=0;o<r.length;o++){var i=r[o],a=e[i];n[i]="object"!=typeof a||null===a?a:a instanceof Date?new Date(a):ArrayBuffer.isView(a)?u(a):t(a)}return n}}();function l(e){return"object"==typeof e&&null!==e&&"child"in e}function p(e){return"object"==typeof e&&null!==e&&"type"in e&&"function"==typeof e.type}Element.prototype._addEventListener=Element.prototype.addEventListener,Element.prototype._removeEventListener=Element.prototype.removeEventListener,Element.prototype.addEventListener=function(e,t,r){void 0===r&&(r=!1),this._addEventListener(e,t,r),this.eventListenerList||(this.eventListenerList={}),this.eventListenerList[e]||(this.eventListenerList[e]=[]),this.eventListenerList[e].push({type:e,listener:t,useCapture:r})},Element.prototype.removeEventListener=function(e,t,r){void 0===r&&(r=!1),this._removeEventListener(e,t,r),this.eventListenerList||(this.eventListenerList={}),this.eventListenerList[e]||(this.eventListenerList[e]=[]);for(var n=0;n<this.eventListenerList[e].length;n++)if(this.eventListenerList[e][n].listener===t&&this.eventListenerList[e][n].useCapture===r){this.eventListenerList[e].splice(n,1);break}0==this.eventListenerList[e].length&&delete this.eventListenerList[e]},Element.prototype.getEventListeners=function(e){return this.eventListenerList||(this.eventListenerList={}),void 0===e?this.eventListenerList:this.eventListenerList[e]};var h,y,v,d,m=/*#__PURE__*/e().mark(M),g=[],b=[],w={value:void 0},L=console.log,x=L=function(){};function A(e){return e.children}function E(e,t,r,n){return{ref:n,type:e,props:null!=t?t:{},child:null!=r?r:[],isProcessed:!1,isDirty:!0,state:[],stateIndex:0,effects:[],effectIndex:0,memos:[],memoIndex:0,renderType:void 0,renderProps:{}}}function O(){throw n(Error,[].slice.call(arguments))}var j=function(e){let t=c.get(this);return t||(t=new Map,c.set(this,t)),t=a(this,t.get(e)||(t.set(e,t=f(e)),t),arguments,[]),t.length>1?t:t[0]}.bind(function(e,t){var r,n,o,i=[].slice.call(arguments,2),a=null==(r=t)?void 0:r.ref;if(null==(n=t)||delete n.ref,"function"==typeof e)return E(e,t,i,a);"string"!=typeof e&&O("Invalid element type, required string, received "+typeof e+" instead: "+JSON.stringify(e)+"."),t||(t={}),Object.getOwnPropertySymbols(t).length>0&&O("Invalid element prop name in "+e+", we don't support for symbol prop name, please try another primitive.");for(var f=0,c=Object.values(t);f<c.length;f++){var u=c[f];"string"!=typeof u&&"number"!=typeof u&&"function"!=typeof u&&O("Invalid element prop value in "+e+", we only support for string, number and function prop value.")}return{ref:a,renderType:e,renderProps:null!=(o=t)?o:{},child:i}});function D(e){"number"!=typeof e&&"string"!=typeof e&&p(e)&&b.push(e)}function M(t){var r,n,o,a,f,c,u,s;return e().wrap(function(h){for(;;)switch(h.prev=h.next){case 0:if(!Array.isArray(t)){h.next=20;break}h.t0=e().keys(t);case 2:if((h.t1=h.t0()).done){h.next=18;break}if(!p(t[r=h.t1.value])){h.next=9;break}return h.next=7,[t,r];case 7:h.next=16;break;case 9:n=i(M(t[r]));case 10:if((o=n()).done){h.next=16;break}return a=o.value,h.next=14,a;case 14:h.next=10;break;case 16:h.next=2;break;case 18:h.next=38;break;case 20:if(!l(t)){h.next=38;break}h.t2=e().keys(t.child);case 22:if((h.t3=h.t2()).done){h.next=38;break}if(!p(t.child[f=h.t3.value])){h.next=29;break}return h.next=27,[t.child,f];case 27:h.next=36;break;case 29:c=i(M(t.child[f]));case 30:if((u=c()).done){h.next=36;break}return s=u.value,h.next=34,s;case 34:h.next=30;break;case 36:h.next=22;break;case 38:case"end":return h.stop()}},m)}function k(e,t,r){if(Array.isArray(e))e.forEach(function(e,n){var o;"string"!=typeof t&&"number"!=typeof t&&t&&t.DOMNode&&(o=Array.isArray(t)?t[n]:t.child[n]),k(e,o,r)});else if(!1!==e&&null!=e)if(e&&"string"!=typeof e&&"number"!=typeof e){var n;p(e)||("string"!=typeof t&&"number"!=typeof t&&t&&t.DOMNode&&(e.DOMNode=t.DOMNode,n=t.child),S(e,n)),r.appendChild(e.DOMNode)}else r.appendChild(document.createTextNode(String(e)))}function S(e,t){if(!("isProcessed"in e)||!e.isProcessed){var r=new DocumentFragment;if(void 0!==e.renderType){var n={},o={};for(var a in e.renderProps)[null,void 0,!1].includes(e.renderProps[a])||("function"!=typeof e.renderProps[a]?n[a]=e.renderProps[a]:o[a.slice(2)]=e.renderProps[a]);if(null!=e&&e.DOMNode&&e.DOMNode instanceof Element&&e.DOMNode.tagName.toLowerCase()===e.renderType){r=e.DOMNode;for(var f,c=i(e.DOMNode.attributes);!(f=c()).done;){var u=f.value;u.name in n||r.removeAttribute(u.name)}var s=r.getEventListeners(),l=function(e){s[e].forEach(function(t){r.removeEventListener(e,t.listener)})};for(var p in s)l(p);for(;r.firstChild;)r.removeChild(r.firstChild)}else r=document.createElement(e.renderType);for(var h in n)r.setAttribute(h,n[h]);for(var y in o)r.addEventListener(y,o[y]);null!=e&&e.ref&&(e.ref.current=r)}e.DOMNode=r,e.child.forEach(function(r,n){k(r,null==t?void 0:t[n],e.DOMNode)})}}function P(e,r,n){if(n.isProcessed)return n;var o=null==r?void 0:r.child;if(n.type!==A){var a=!1;if(r&&(r.type===n.type?(a=!0,n.isDirty=r.isDirty):D(r)),n.isDirty=e||n.isDirty,n.isDirty){L(n.type.name,"is dirty");var f,c=n.props,u=n.ref;e&&(c=t({},n.props,{children:null!=(f=n.child)?f:[]})),a&&(n=r),n.props=c,n.ref=u,d=n;var l=n.type(t({},n.props),n.ref);void 0===l||!1===l||null===l?n.child=[]:Array.isArray(l)?n.child=l:"object"!=typeof l||p(l)&&l.type!==n.type?n.child=[l]:(n.renderType=l.renderType,n.renderProps=l.renderProps,n.child=l.child),L("Result:",n.type.name,s(n))}else L(n.type.name,"is clean"),a&&(n=r)}return function(e,t,r,n){for(var o in r)if("number"!=typeof r[o]&&"string"!=typeof r[o]){if(p(r[o])&&e||Array.isArray(r[o])||!p(r[o])){for(var a,f=M(null==t?void 0:t[o]),c=i(M(r[o]));!(a=c()).done;){var u,s=a.value,l=f.next().value;s[0][s[1]]=P(e,null==l||null==(u=l[0])?void 0:u[l[1]],s[0][s[1]])}for(var h,y=i(f);!(h=y()).done;){var v=h.value;D(v[0][v[1]])}}p(r[o])?r[o]=P(e,p(null==t?void 0:t[o])?t[o]:void 0,r[o]):p(null==t?void 0:t[o])&&D(null==t?void 0:t[o])}else(null==t?void 0:t[o])!==r[o]&&p(null==t?void 0:t[o])&&D(null==t?void 0:t[o])}("isDirty"in n&&n.isDirty,o,n.child),L("DONE: ",n.type.name,s(n)),S(n,o),n.isProcessed=!0,n}function N(e){"object"==typeof e&&e&&(Array.isArray(e)?e.forEach(function(e){return N(e)}):(p(e)&&(e.stateIndex=0,e.effectIndex=0,e.memoIndex=0,e.isDirty=!1,e.isProcessed=!1),e.child.forEach(function(e){"object"==typeof e&&N(e)})))}function _(e,t){if(void 0===t&&(t=!1),"string"!=typeof e&&"number"!=typeof e&&e&&(e.child.forEach(function(e){Array.isArray(e)?e.forEach(function(e){return _(e,t)}):_(e,t)}),p(e)))for(var r=0;r<e.effects.length;r++){var n,o;e.effects[r].run&&e.effects[r].isLayout===t&&(null==(n=(o=e.effects[r]).cleanup)||n.call(o),e.effects[r].cleanup=e.effects[r].callback(),e.effects[r].run=!1)}}function I(e){if("string"!=typeof e&&"number"!=typeof e&&e&&(e.child.forEach(function(e){Array.isArray(e)?e.forEach(function(e){return I(e)}):I(e)}),p(e)))for(var t=0;t<e.effects.length;t++){var r,n;null==(r=(n=e.effects[t]).cleanup)||r.call(n)}}function T(){for(L("----------------------------------------------------------------"),L("@@@@@@@ Batch updating..."),L=function(){return x.apply(void 0,["[State change]"].concat([].slice.call(arguments)))};g.length;)g.pop()();(L=x)("@@@@@@@ Rendering...");var e=P(void 0,v,E(y));N(e),L("Result:",e),h.textContent="",h.appendChild(e.DOMNode),v=e;var t=new MessageChannel;function r(){for(L("@@@@@@ Running effects..."),L=function(){return x.apply(void 0,["[Effect]"].concat([].slice.call(arguments)))},_(v),(L=x)("@@@@@@ Cleaning up unmounted components..."),L=function(){return x.apply(void 0,["[Effect cleanup]"].concat([].slice.call(arguments)))};b.length;)I(b.pop());L=x}requestAnimationFrame(function(){L("@@@@@@ Running layout effects before repaint..."),L=function(){return x.apply(void 0,["[Layout effect]"].concat([].slice.call(arguments)))},_(v,!0),L=x,g.length?(r(),clearTimeout(w.value),T()):(t.port1.onmessage=r,t.port2.postMessage(void 0),L("@@@@@@ Browser painted to the screen"))})}function C(e,t){t?h=t:(h=document.createDocumentFragment(),document.body.prepend(h)),y=e,T()}function B(e){var t,r=d,n=r.stateIndex++;return null!=(t=r.state)[n]||(t[n]=e),[r.state[n],function(e){g.length||(w.value=setTimeout(T,0)),g.push(function(){"function"==typeof e&&(e=e(r.state[n])),r.state[n]!==e&&(console.log("Update from",r.state[n],"to",e,"in",r.type.name),r.state[n]=e,r.isDirty=!0)})}]}function R(e,r,n){var o;void 0===n&&(n=!1);var i=d,a=i.effectIndex++,f=!1;r&&i.effects[a]&&r.length===(null==(o=i.effects[a].deps)?void 0:o.length)&&!r.some(function(e,t){var r;return e!==(null==(r=i.effects[a].deps)?void 0:r[t])})||(f=!0),f&&(i.effects[a]=t({},i.effects[a],{deps:r,callback:e,run:f,isLayout:n}))}var F=function(e,t){return R(e,t,!0)};function G(e,r){var n,o=d,i=o.memoIndex++,a=!1;return r&&o.memos[i]&&r.length===(null==(n=o.memos[i].deps)?void 0:n.length)&&!r.some(function(e,t){var r;return e!==(null==(r=o.memos[i].deps)?void 0:r[t])})||(a=!0),a&&(o.memos[i]=t({},o.memos[i],{deps:r,factory:e,value:e()})),o.memos[i].value}function V(e,t){return G(function(){return e},t)}function q(e){return G(function(){return{current:e}},[])}function U(e,t){if(null===e)return!1;var r=Object.keys(e),n=Object.keys(t);if(r.length!==n.length)return!1;if(0===r.length)return!0;for(var o=0;o<r.length;o++)if("children"!==r[o]&&e[r[o]]!==t[r[o]])return!1;return U(e.children,t.children)}function Y(e,t){void 0===t&&(t=U);var r=function(r,n){var o=q(null);return R(function(){o.current=r},[r]),console.log("[Memo check]",t(o.current,r),o.current,r),t(o.current,r)?d:e(r,n)};return Object.defineProperty(r,"name",{value:e.name,writable:!1}),r}export{A as Fragment,j as fuse,Y as memo,C as render,V as useCallback,R as useEffect,F as useLayoutEffect,G as useMemo,q as useRef,B as useState};
//# sourceMappingURL=refuse.module.js.map
