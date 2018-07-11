'use strict';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

var containerName = 'sample-container';
var azure = require('azure-storage');
var blobService = azure.createBlobService();
var uuid = require('uuid/v4');

module.exports = function(SampleModel) {

    // Updates Blob Storage and DB to contain correct data
    SampleModel.observe('before save', function observer(ctx, next){

        // create, findOrCreate, prototype.save, replaceOrCreate, replaceById, prototype.replaceAttributes
        if(ctx.instance && ctx.instance.attachmentName){ 
            
            if(ctx.isNewInstance || !ctx.instance.blob)
                uploadAttachment(ctx.instance);
            
            else{

                deleteAttachment(ctx.instance.blob);
                uploadAttachment(ctx.instance);
            }
        }

        // prototype.updateAttributes
        else if(ctx.currentInstance && ctx.data.attachmentName && !ctx.data.blob){

            deleteAttachment(ctx.currentInstance.blob);
            uploadAttachment(ctx.currentInstance);
        }

        // upsert, upserWithWhere, updateAll?
    
        next();
    });

    // Deletes blob from Azure before model instance is deleted from DB
    SampleModel.observe('before delete', function observer(ctx, next){

        SampleModel.findById(ctx.where.id, function(err, instance){
            if (instance.blob) {  deleteAttachment(instance.blob); }
        });

        next();
    });

    // Custom Loopback remote method:
    // Downloads and saves attachment to current folder
    // with file name given by model instance
    SampleModel.getAttachment = function(reviewId,cb) {
       
        SampleModel.findById(reviewId, function(err, instance){

            if(!err && instance.blob){

                blobService.getBlobToLocalFile(containerName, instance.blob, instance.attachmentName, error => {
                    
                    if(error) return cb(error);
                    cb(null); 
                });
            }
        });
    }
    SampleModel.remoteMethod('getAttachment', {
        http: {path: '/getAttachment', verb: 'get'},
        accepts: {arg: 'id', type: 'number', http: { source: 'query' }, required: true },
        description: 'Download attachment for model with {{id}} if one exists.'
    });

    // Custom Loopback remote method:
    // Deletes attachment from Azure Blob Storage
    SampleModel.deleteAttachment = function(reviewId,cb) {
       
        SampleModel.findById(reviewId, function(err, instance){

            if (!err && instance.blob){
                
                deleteAttachment(instance.blob);
                instance.updateAttributes({'blob': null, 'attachmentName': null}, function(err,instance){});
            }
            cb(null);
        });
    }
    SampleModel.remoteMethod('deleteAttachment', {
        http: {path: '/deleteAttachment', verb: 'delete'},
        accepts: {arg: 'id', type: 'number', http: { source: 'query' }, required: true },
        description: 'Delete attachment for model with {{id}} if one exists.'
    });
};

// Upload helper method
function uploadAttachment(instance){

    var blobName = uuid();

    blobService.createBlockBlobFromLocalFile(containerName, blobName, instance.attachmentName, function(err, result, response) {
        if (!err) console.log(`${instance.attachmentName} uploaded to Azure Blob Storage.`);
    });

    instance.updateAttribute('blob', blobName, function(err, instance){});
}

// Delete helper method
function deleteAttachment(blob){

    blobService.deleteBlobIfExists(containerName, blob, err => {
        if (!err) console.log(`${blob} deleted from Azure Blob Storage.`);
    });
}
