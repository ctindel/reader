'use strict';

var dynamoose = require('dynamoose');

dynamoose.AWS.config.update({
  //accessKeyId: 'AKID',
  //secretAccessKey: 'SECRET',
  region: 'us-east-2'
});

// To use a local DynamoDB setup you can use the following line
// dynamoose.local(); // This will set the server to "http://localhost:8000" (default)
dynamoose.local("http://localhost:8000") // This will set the server to "http://localhost:1234"

//var Schema = new dynamoose.Schema(
//    { 
//        id: {type: Number, hashKey: true}, 
//        name: {type: String, rangeKey: true, index: true } 
//    }
//);
//
//var Cat = dynamoose.model('Cat', Schema, {create: true, waitForActive: true});
//
//var garfield = new Cat({id: 666, name: 'Garfield'});
var Schema = new dynamoose.Schema({
    email: {
        type: String,
        hashKey: true,
        required: true,
        unique: true,
        trim: true,
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    },
    facebookProvider: {
        id: { type: String, index: false },
        token: { type: String , index: false}
    },
    twitterProvider: {
        id: { type: String, index: false },
        token: { type: String , index: false}
    },
    googleProvider: {
        id: { type: String, index: false },
        token: { type: String, index: false }
    }
});
var Cat = dynamoose.model('Cat', Schema, {create: true, waitForActive: true});

var garfield = new Cat({email: 'garfield@example.com'});
garfield.save();

// This will preform an DynamoDB get on the "Cat" model/table get the object with the `id` = 666 and return a promise with the returned object.
Cat.get(666)
.then(function (badCat) {
  console.log('Never trust a smiling cat. - ' + badCat.name);
});
