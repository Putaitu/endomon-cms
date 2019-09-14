'use strict';

/**
 * The base view for client side elements
 */
class ViewBase extends require('Common/Entity/View/ViewBase') {
    /**
     * Constructor
     */
    constructor(params) {
        super(params);

        this.element = document.createElement('div');
        this.element.className = 'placeholder';

        this.update();

        this.constructor.instance = this;
    }

    /**
     * Structure
     */
    structure() {
        super.structure();

        this.def(HTMLElement, 'element', null);
        this.def(Object, 'events', {});
    }
    
    /**
     * Gets a valid instance of this view
     * This should only be used with solo views like the navbar, as keeping arrays creates a potential for memory leaks
     */
    static getInstance() {
        if(!this.instance || !this.instance.isValid()) { return null; }

        return this.instance;
    }

    /**
     * Checks if this view is visible in the DOM
     *
     * @return {Boolean} Is valid
     */
    isValid() {
        return !!this.element && !!this.element.parentElement;
    }

    /**
     * Adds an event handler to this view
     *
     * @param {String} type
     * @param {Function} handler
     */
    on(type, handler) {
        checkParam(type, 'type', String, true);
        checkParam(handler, 'handler', Function, true);
   
        if(!this.events) { this.events = {} }
        if(!this.events[type]) { this.events[type] = []; }

        this.events[type].push(handler);
    }

    /**
     * Triggers an event
     *
     * @param {String} type
     * @param {Array} params
     */
    trigger(type, ...params) {
        checkParam(type, 'type', String, true);

        if(!this.events || !this.events[type]) { return; }
    
        for(let handler of this.events[type]) {
            handler(...params);
        }
    }

    /**
     * Scope
     *
     * @return {Object} Scope
     */
    scope() {
        // Create a default scope with basic templating functionaly
        let scope = {
            if: (statement, content)  => {
                if(!statement) { return ''; }

                return content;
            },
            each: (items, callback) => {
                let content = [];

                for(let key in items) {
                    if(!isNaN(key)) {
                        key = parseFloat(key);
                    }

                    content.push(callback(key, items[key]));
                }

                return content;
            },
            include: (template, model) => {
                if(typeof template !== 'function') { return ''; }

                return template(this.scope(), model || this.model);
            }
        };

        // Let the template call the scope dynamically
        let proxy = new Proxy(scope, {
            get: (target, name, receiver) => {
                // Any key starting with "on" that corresponds with a function name will be passed to the scope
                if(name.substring(0, 2) === 'on' && typeof this[name] === 'function') {
                    return (e) => { this[name](e); };
                }

                // Any other undefined key in the scope will be interpreted as an element constructor
                if(target[name] === undefined) {
                    return (attributes = {}, ...content) => {
                        return this.createElement(name, attributes, content);
                    }
                }
                   
                // Defined keys will be passed directly
                return target[name];
            }
        });

        return proxy;
    }
 
    /**
     * Appends content to an element
     * 
     * @param {HTMLElement} element
     * @param {Array} content
     */
    appendToElement(element, content) {
        if(!content) { return; }

        if(content.constructor === Array) {
            for(let item of content) {
                this.appendToElement(element, item);
            }

        } else {
            if(content instanceof Crisp.View) {
                content = content.element;
            
            } else if(content && content[0] && content[0] instanceof Node) {
                content = content[0];
            
            }

            if(content instanceof Node) {
                element.appendChild(content);
            
            } else {
                element.innerHTML += content.toString();
            
            }
        }
    }

    /**
     * Renders an element
     *
     * @param {String} type
     * @param {Object} attributes
     * @param {Array} content
     *
     * @return {HTMLElement} Element
     */
    createElement(type, ...params) {
        let element = document.createElement(type);
        let attributes = {};
        let content = [];

        // The first parameter could be a collection of attributes
        if(params && params[0] && params[0].constructor === Object) {
            attributes = params.shift();
        }

        // The remaining parameters are content
        content = params;

        // Adopt all attributes
        for(let key in attributes) {
            let value = attributes[key];

            if(value === null || value === undefined || value === false) { continue; }

            if(typeof value === 'number' || typeof value === 'string') {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        }
      
        // Append all content
        this.appendToElement(element, content);

        return element;
    }

    /**
     * Fetches the model
     */
    async fetch() {}

    /**
     * Updates the view
     */
    async update() {
        try {
            await this.fetch();

        } catch(e) {
            UI.errorModal(e);

        }

        this.render();
    }

    /**
     * Removes this element
     */
    remove() {
        if(!this.isValid()) { return; }

        this.element.parentElement.removeChild(this.element);
    }

    /**
     * Renders the template
     *
     * @return {HTMLElement} Element
     */
    render() {
        let output = super.render();
        let element = null;

        if(output instanceof Node) {
            element = output;

        } else if(typeof output === 'string') {
            let wrapper = document.createElement('div');
            wrapper.innerHTML = output;
            element = wrapper.firstElementChild; 
        
        }

        if(this.isValid()) {
            this.element.parentElement.replaceChild(element, this.element); 
        }

        this.element = element;

        return this.element;
    }
}

module.exports = ViewBase;
