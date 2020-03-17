'use strict';

const Path = require('path');

/**
 * FileSystem deployer
 *
 * @memberof HashBrown.Server.Entity
 */
class FileSystemDeployer extends HashBrown.Entity.Deployer.DeployerBase {
    static get title() { return 'File system'; }
    static get alias() { return 'filesystem'; }

    /**
     * Gets the root path
     *
     * @returns {String} Root
     */
    getRootPath() {
        return this.rootPath;
    }

    /**
     * Structure
     */
    structure() {
        super.structure();

        this.def(String, 'rootPath');
    }

    /**
     * Tests this deployer
     *
     * @returns {Promise} Result
     */
    test() {
        return Promise.resolve(true);  
    }

    /**
     * Gets a file
     *
     * @param {String} path
     *
     * @return {Promise} Promise
     */
    async getFile(path) {
        let data = await HashBrown.Service.FileService.read(path);
        
        return {
            name: Path.basename(path),
            path: path,
            data: data.toString('utf8')
        };
    }
    
    /**
     * Gets a folder
     *
     * @param {String} path
     * @param {Number} recursions
     *
     * @returns {Promise} Result
     */
    async getFolder(path, recursions = 0) {
        for(let i = 0; i < recursions; i++) {
            path = Path.join(path, '*');
        }

        return await HashBrown.Service.FileService.list(path);
    }
    
    /**
     * Rename file
     *
     * @param {String} oldPath
     * @param {String} name
     *
     * @return {Promise} Promise
     */
    async renameFile(oldPath, name) {
        let newPath = Path.join(Path.dirname(oldPath), name);
        
        await HashBrown.Service.FileService.move(oldPath, newPath);
    }
    
    /**
     * Set file
     *
     * @param {String} path
     * @param {String} base64
     *
     * @return {Promise} Promise
     */
    async setFile(path, base64) {
        let dirPath = Path.dirname(path);

        await HashBrown.Service.FileService.makeDirectory(dirPath);

        debug.log('Writing file "' + path + '"...', this);

        let fileData = Buffer.from(base64, 'base64');

        await HashBrown.Service.FileService.write(fileData, path);

        debug.log('...done writing file.', this);

    }
   
    /**
     * Removes a file
     *
     * @param {String} path
     *
     * @return {Promise} Promise
     */
    removeFile(path) {
        return HashBrown.Service.FileService.remove(path);
    }

    /**
     * Removes a folder
     *
     * @param {String} path
     *
     * @returns {Promise} Result
     */
    removeFolder(path) {
        return this.removeFile(path);
    }
}

module.exports = FileSystemDeployer;
