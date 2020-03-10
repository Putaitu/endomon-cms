'use strict';

/**
 * A class for deploying and retrieving data to and from a server
 *
 * @memberof HashBrown.Common.Entity
 */
class DeployerBase extends HashBrown.Entity.EntityBase {
    static get title() { return 'Deployer'; }
    static get alias() { return 'deployer'; }
    
    /**
     * Constructor
     */
    constructor(params) {
        super(params);

        this.title = this.constructor.title;
        this.alias = this.constructor.alias;

        if(!this.paths) { this.paths = {}; }
    }
   
    /**
     * Adopts values into this entity
     *
     * @param {Object} params
     */
    adopt(params = {}) {
        checkParam(params, 'params', Object);
        
        params = params || {};

        delete params.title;
        delete params.name;
        delete params.alias;

        super.adopt(params);
    }

    /**
     * Structure
     */
    structure() {
        this.def(String, 'title');
        this.def(String, 'alias');
        this.def(Object, 'paths', {
            media: '',
            content: ''
        });
    }
}

module.exports = DeployerBase;
