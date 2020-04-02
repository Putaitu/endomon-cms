'use strict';

/**
 * The base class for resources
 */
class ResourceBase extends require('Common/Entity/Resource/ResourceBase') {
    /**
     * Structure
     */
    structure() {
        super.structure();

        this.def(Object, 'context', {});
    }
    
    /**
     * Adopts values into this entity
     *
     * @param {Object} params
     */
    adopt(params = {}) {
        checkParam(params, 'params', Object);

        if(!this.context) {
            checkParam(params.context, 'params.context', Object, true);
            checkParam(params.context.project, 'params.context.project', String, true);
            checkParam(params.context.environment, 'params.context.environment', String, true);
        }

        super.adopt(params);

        if(!this.context) {
            Object.seal(this.context);
        }
    }
   
    /**
     * Gets an instance of this entity type
     *
     * @param {String} projectId
     * @param {String} environment
     * @param {String} id
     * @param {Object} options
     *
     * @return {HashBrown.Entity.Resource.ResourceBase} Instance
     */
    static async get(projectId, environment, id, options = {}) {
        checkParam(projectId, 'projectId', String, true);
        checkParam(environment, 'environment', String, true);
        checkParam(id, 'id', String, true);
        checkParam(options, 'options', Object, true);

        let resource = await HashBrown.Service.DatabaseService.findOne(
            projectId,
            environment + '.' + this.category,
            {
                id: id
            }
        );
        
        // If the resource was not found locally, attempt remote fetch
        if(!resource && !options.localOnly) {
            let project = await HashBrown.Entity.Project.get(projectId);
            let sync = await project.getSyncSettings();

            if(sync) {
                options.token = sync.token;

                resource = await HashBrown.Service.RequestService.request(
                    'get',
                    sync.url + '/api/' + sync.project + '/' + this.category + '/' + id,
                    options
                );

                if(resource) {
                    resource.isLocked = true;
                    resource.sync.isRemote = true;
                }
            }
        }

        if(!resource) { return null; }

        resource.context = {
            project: projectId, 
            environment: environment
        };
        
        return this.new(resource);
    }
    
    /**
     * Gets a list of instances of this entity type
     *
     * @param {String} projectId
     * @param {String} environment
     * @param {Object} options
     *
     * @return {Array} Instances
     */
    static async list(projectId, environment, options = {}) {
        checkParam(projectId, 'projectId', String, true);
        checkParam(environment, 'environment', String, true);
        checkParam(options, 'options', Object, true);
        
        let resources = await HashBrown.Service.DatabaseService.find(
            projectId,
            environment + '.' + this.category,
            options
        );

        // Attempt remote fetch
        if(!options.localOnly) {
            let project = await HashBrown.Entity.Project.get(projectId);
            let sync = await project.getSyncSettings();

            if(sync) {
                let allResources = {};

                for(let resource of resources) {
                    if(!resource || !resource.id) { continue; }

                    allResources[resource.id] = resource;
                }

                options.token = sync.token;

                let remoteResources = await HashBrown.Service.RequestService.request(
                    'get',
                    sync.url + '/api/' + sync.project + '/' + this.category,
                    options
                );

                for(let resource of remoteResources) {
                    if(!resource || !resource.id || allResources[resource.id]) { continue; }

                    resource.isLocked = true;
                    resource.sync.isRemote = true;

                    allResources[resource.id] = resource;
                }

                resources = Object.values(resources);
            }
        }

        // Apply models and context
        for(let i = resources.length - 1; i >= 0; i--) {
            resources[i].context = {
                project: projectId, 
                environment: environment
            };
            
            resources[i] = this.new(resources[i]);
        
            if(!resources[i]) {
                resources.splice(i, 1);
            }
        }

        // Sort resources if specified
        if(options.sortBy) {
            resources = resources.sort((a, b) => {
                a = options.sortBy === 'name' ? a.getName() : a[options.sortBy];
                b = options.sortBy === 'name' ? b.getName() : b[options.sortBy];

                return a > b ? 1 : a < b ? -1 : 0;
            }) 
        }

        return resources;
    }
    
    /**
     * Creates a new instance of this entity type
     *
     * @param {HashBrown.Entity.User} user
     * @param {String} projectId
     * @param {String} environment
     * @param {Object} data
     * @param {Object} options
     *
     * @return {HashBrown.Entity.Resource.ResourceBase} Instance
     */
    static async create(user, projectId, environment, data = {}, options = {}) {
        checkParam(user, 'user', HashBrown.Entity.User, true);
        checkParam(projectId, 'projectId', String, true);
        checkParam(environment, 'environment', String, true);
        checkParam(data, 'data', Object, true);
        checkParam(options, 'options', Object, true);

        data.createdBy = user.id;
        data.createdOn = new Date();
        data.updatedBy = user.id;
        data.updatedOn = new Date();
        data.viewedBy = user.id;
        data.viewedOn = new Date();

        data.id = this.createId();
            
        data.context = {
            project: projectId,
            environment: environment
        };
        
        let resource = this.new(data);

        await HashBrown.Service.DatabaseService.insertOne(
            projectId,
            environment + '.' + this.category,
            resource.getObject()
        );

        return resource;
    }
    
    /**
     * Saves the current state of this entity
     *
     * @param {HashBrown.Entity.User} user
     * @param {Object} options
     */
    async save(user, options = {}) {
        checkParam(user, 'user', HashBrown.Entity.User);
        checkParam(options, 'options', Object, true);

        if(this.isLocked) {
            throw new Error(`The resource ${this.id} (${this.getName()}) is locked`);
        }

        // Unset sync flags
        this.sync = {
            isRemote: false,
            hasRemote: false
        };

        if(user) {
            this.updatedBy = user.id;
            this.updatedOn = new Date();
        }

        // Insert into database
        await HashBrown.Service.DatabaseService.updateOne(
            this.context.project,
            this.context.environment + '.' + this.category,
            {
                id: options.id || this.id
            },
            this.getObject(),
            {
                upsert: true
            }
        );
    }
    
    /**
     * Removes this entity
     *
     * @param {HashBrown.Entity.User} user
     * @param {Object} options
     */
    async remove(user, options = {}) {
        checkParam(user, 'user', HashBrown.Entity.User, true);
        checkParam(options, 'options', Object, true);

        await HashBrown.Service.DatabaseService.removeOne(
            this.context.project,
            this.context.environment + '.' + this.category,
            {
                id: this.id
            }
        );
    }
    
    /**
     * Pulls a synced resource
     *
     * @param {HashBrown.Entity.User} user
     */
    async pull(user) {
        checkParam(user, 'user', HashBrown.Entity.User, true);

        let project = await HashBrown.Entity.Project.get(this.context.project);
        let sync = await project.getSyncSettings();

        if(!sync) {
            throw new Error('Sync not enabled or unconfigured for this project');
        }

        let resource = await HashBrown.Service.RequestService.request(
            'get',
            sync.url + '/api/' + sync.project + '/' + this.context.environment + '/' + this.category + '/' + this.id,
            { token: sync.token }
        );
        
        if(!resource) {
            throw new Error(`Could not find remote resource ${this.category}/${this.id}`);
        }
        
        this.adopt(resource);
        
        await this.save(user);
    }
    
    /**
     * Pushes a synced resource
     *
     * @param {HashBrown.Entity.User} user
     */
    async push(user) {
        checkParam(user, 'user', HashBrown.Entity.User, true);
        
        let project = await HashBrown.Entity.Project.get(this.context.project);
        let sync = await project.getSyncSettings();

        if(!sync) {
            throw new Error('Sync not enabled or unconfigured for this project');
        }

        await HashBrown.Service.RequestService.request(
            'post',
            sync.url + '/api/' + sync.project + '/' + this.context.environment + '/' + this.category + '/' + this.id + '?token=' + sync.token,
            this.getObject()
        );

        await this.remove(user);
    }
    
    /**
     * Submits a heartbeat on this resource
     *
     * @param {HashBrown.Entity.User} user
     */
    async heartbeat(user) {
        checkParam(user, 'user', HashBrown.Entity.User, true);
        
        if(this.isLocked) { return; }

        await HashBrown.Service.DatabaseService.updateOne(
            this.context.project,
            this.context.environment + '.' + this.category,
            {
                id: this.id
            },
            {
                viewedBy: user.id,
                viewedOn: new Date()
            }
        );
    }

    /**
     * Gets a mutable object of this entity
     *
     * @return {Object} Object
     */
    getObject() {
        let object = super.getObject();

        delete object.context;

        return object;
    }

    /**
     * Gets a nested list of dependencies
     *
     * @return {Object} Dependencies
     */
    async getDependencies() {
        throw new Error('Method "getDependencies" must be overridden');
    }

    /**
     * Gets a nested list of dependencies for multiple resources
     *
     * @param {String} projectId
     * @param {String} environment
     * @param {Array} resourceIds
     *
     * @return {Object} Dependencies
     */
    static async getDependencies(projectId, environment, resourceIds) {
        checkParam(projectId, 'projectId', String, true);
        checkParam(environment, 'environment', String, true);
        checkParam(resourceIds, 'resourceIds', Array, true);

        let allDependencies = {};

        for(let resourceId of resourceIds) {
            let resource = await this.get(projectId, environment, resourceId);

            if(!resource) { continue; }

            let dependencies = await resource.getDependencies();

            for(let category in dependencies) {
                if(!allDependencies[category]) {
                    allDependencies[category] = {};
                }

                for(let dependencyId in dependencies[category]) {
                    if(allDependencies[category][dependencyId]) { continue; }

                    allDependencies[category][dependencyId] = dependencies[category][dependencyId];
                }
            }
        }
    
        return allDependencies;
    }
}

module.exports = ResourceBase;
