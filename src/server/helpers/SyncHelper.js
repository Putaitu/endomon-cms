'use strict';

let restler = require('restler');

/**
 * The helper class for all synchronisation services
 */
class SyncHelper {
    /**
     * Gets the sync settings
     *
     * @returns Promise
     */
    static getSettings() {
        return SettingsHelper.getSettings('sync');
    }

    /**
     * Gets a new token
     *
     * @param {String} username
     * @param {String} password
     *
     * @returns {Promise} New token
     */
    static renewToken(username, password) {
        return this.getSettings()
        .then((settings) => {
            debug.log('Renewing token for sync...', this);

            return new Promise((resolve, reject) => {
                let headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json; charset=utf-8'
                };
                
                let postData = {
                    username: username,
                    password: password
                };
                    
                restler.post(settings.url + 'user/login?persist=true', {
                    headers: headers,
                    data: JSON.stringify(postData)
                }).on('complete', (data, response) => {
                    if(typeof data !== 'string' || data.length !== 40) {
                        reject(data);
                    
                    } else {
                        resolve(data);
                    
                    }
                });
            });
        });
    }
    
    /**
     * Get resource item
     *
     * @param {String} remoteResourceName
     * @param {String} remoteItemName
     *
     * @returns {Promise} Resource
     */
    static getResourceItem(remoteResourceName, remoteItemName) {
        return this.getSettings()
        .then((settings) => {
            return new Promise((resolve, reject) => {
                if(settings && settings.enabled && settings[remoteResourceName]) {
                    let headers = {
                        'Accept': 'application/json'
                    };
                    
                    restler.get(settings.url + settings.project + '/' + settings.environment + '/' + remoteResourceName + '/' + remoteItemName + '?token=' + settings.token, {
                        headers: headers
                    }).on('complete', (data, response) => {
                        if(data instanceof Error) {
                            reject(data);

                        } else if(typeof data === 'string') {
                            reject(new Error(data));
                        
                        } else {
                            resolve(data);
                        
                        }
                    });

                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Get resource
     *
     * @param {String} remoteResourceName
     * @param {Object} params
     *
     * @returns {Promise} Resource
     */
    static getResource(remoteResourceName, params) {
        params = params || {};

        return this.getSettings()
        .then((settings) => {
            params.token = settings.token;

            return new Promise((resolve, reject) => {
                if(settings && settings.enabled && settings[remoteResourceName]) {
                    let headers = {
                        'Accept': 'application/json'
                    };
                    
                    restler.get(settings.url + settings.project + '/' + settings.environment + '/' + remoteResourceName, {
                        headers: headers,
                        query: params
                    }).on('complete', (data, response) => {
                        if(data instanceof Error) {
                            reject(data);
                        
                        } else {
                            resolve(data);
                        
                        }
                    });

                } else {
                    resolve([]);
                }
            });
        });
    }

    /**
     * Merges a resource with a synced one
     *
     * @param {String} remoteResourceName
     * @param {Array} localResource
     * @param {Object} params
     *
     * @return {Promise} Merged resource
     */
    static mergeResource(remoteResourceName, localResource, params) {
        return this.getResource(remoteResourceName, params)
        .then((remoteResource) => {
            let mergedResource;

            if(remoteResource) {
                // Look for duplicates
                let ids = {};
                
                for(let r in remoteResource) {
                    let remoteItem = remoteResource[r];

                    if(!remoteItem) {
                        debug.log('"' + r + '" is null in remote resource "' + remoteResourceName + '"', this);

                    } else {
                        remoteItem.locked = true;
                        remoteItem.remote = true;

                        ids[remoteItem.id] = true;

                    }
                }

                for(let l in localResource) {
                    let localItem = localResource[l];

                    if(ids[localItem.id] == true) {
                        return new Promise((resolve, reject) => {
                            reject(new Error('Resource "' + remoteItem.id + '" in "' + remoteResourceName + '" is a duplicate. Please resolve by removing local item.'));
                        });
                    }
                }

                // Merge resources
                if(remoteResource instanceof Array && localResource instanceof Array) {
                    mergedResource = remoteResource.concat(localResource);
                
                } else if(remoteResource instanceof Object && localResource instanceof Object) {
                    mergedResource = Object.assign(localResource, remoteResource);
                
                } else {
                    debug.log('Local and remote resources in "' + remoteResourceName + '" are not of same type', this);
                    debug.log('Response from remote: ' + remoteResource, this);

                    mergedResource = localResource;
                }
            
            } else {
                mergedResource = localResource;

            }

            return new Promise((resolve) => {
                resolve(mergedResource);
            });
        });
    }
}

module.exports = SyncHelper;