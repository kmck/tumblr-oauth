'use strict';

const TUMBLR_REQUEST_TOKEN_URL = 'https://www.tumblr.com/oauth/request_token';
const TUMBLR_AUTHORIZE_URL = 'https://www.tumblr.com/oauth/authorize';
const TUMBLR_ACCESS_TOKEN_URL = 'https://www.tumblr.com/oauth/access_token';

const express = require('express');

function dbConnect(url) {
    const MongoClient = require('mongodb').MongoClient;
    return new Promise(function(resolve, reject) {
        MongoClient.connect(url, function(err, db) {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}

function createOAuthClient(consumerKey, consumerSecret) {
    // Create OAuth client
    const OAuth = require('oauth').OAuth;
    return new OAuth(
        TUMBLR_REQUEST_TOKEN_URL,
        TUMBLR_ACCESS_TOKEN_URL,
        consumerKey,
        consumerSecret,
        '1.0A',
        null,
        'HMAC-SHA1'
    );
}

function createApp(options) {
    options = options || {};
    let port = options.port || 3000;
    let host = options.host || 'http://localhost:' + port;
    let dbUrl = options.dbUrl || 'mongodb://localhost:27017';

    let credentials = {
        consumer_key: options.consumer_key || options.consumerKey,
        consumer_secret: options.consumer_secret || options.consumerSecret,
    };

    let app = express();
    let oa = createOAuthClient(credentials.consumer_key, credentials.consumer_secret);
    let db;
    let tumblrClient;

    // Reset database
    dbConnect(dbUrl)
        .then(function(database) {
            db = database;

            // Request tokens
            db.collection('requestTokens')
                .drop()
                .createIndex({
                    oauthToken: 'hashed',
                }, {
                    unique: true,
                });

            // User tokens
            db.collection('accessTokens')
                .drop()
                .createIndex({
                    userToken: 'hashed',
                }, {
                    unique: true,
                });
        });

    function getOAuthRequestToken() {
        return new Promise(function(resolve, reject) {
            oa.getOAuthRequestToken(function(err, oauthToken, oauthTokenSecret) {
                if (err) {
                    reject(err);
                } else {
                    let requestToken = {oauthToken, oauthTokenSecret};
                    console.log('Insert request token', requestToken);
                    db.collection('requestTokens').insert(requestToken)
                        .then(function() {
                            resolve(requestToken);
                        })
                        .catch(reject);
                }
            });
        });
    }

    function getOAuthAccessToken(oauthToken, oauthTokenSecret, oauthVerifier) {
        return new Promise(function(resolve, reject) {
            oa.getOAuthAccessToken(oauthToken, oauthTokenSecret, oauthVerifier, function(err, userToken, userTokenSecret) {
                if (err) {
                    reject(err);
                } else {
                    let accessToken = {userToken, userTokenSecret};
                    console.log('Insert access token', accessToken);
                    db.collection('accessTokens').insert(accessToken)
                        .then(function() {
                            resolve(accessToken);
                        })
                        .catch(reject);
                }
            })
        });
    }

    app.get('/', function(req, res) {
        res.header('Content-Type', 'text/plain');
        res.send('Hi there! Go to /authorize to get your Tumblr credentials.');
    });

    app.get('/credentials', function(req, res) {
        res.header('Content-Type', 'text/plain');
        res.send('Your credentials:\n' + JSON.stringify(credentials, null, 2));
    });

    // The authorize URL starts the process of getting user tokens.
    // First, you get a request token, which only needs your app's OAuth credentials.
    // Next, you use the request token to generate an authorization URL that you redirect the user
    // to so they can give your app permission to use Tumblr on their behalf.
    app.get('/authorize', function(req, res) {
        console.log('Getting requset token...');
        getOAuthRequestToken()
            .then(function(requestToken) {
                let callbackUrl = host + '/callback';
                res.redirect(TUMBLR_AUTHORIZE_URL + '?' + [
                    'oauth_token=' + requestToken.oauthToken,
                    'oauth_callback=' + callbackUrl,
                ].join('&'));
            })
            .catch(function(err) {
                console.error('Error', err);
                res.send('It did not work?');
            });
    });

    // After the user authorizes your app, they're redirected back to your callback URL with an
    // OAuth token and an OAuth verifier.
    //
    // Using the OAuth secret for that token (you'll have both from the previous step) along with
    // the verifier, you can request an access token, which is what allows you to make fully
    // authenticated API requests.
    app.get('/callback', function(req, res) {
        res.header('Content-Type', 'text/plain');
        let query = req.query || {};
        let oauthToken = query.oauthToken || query.oauth_token;
        let oauthVerifier = query.oauthVerifier || query.oauth_verifier;
        if (oauthToken && oauthVerifier) {
            db.collection('requestTokens').findOne({oauthToken})
                .then(function(requestToken) {
                    console.log('Getting user token...');
                    console.log(oauthToken, requestToken.oauthTokenSecret, oauthVerifier);
                    getOAuthAccessToken(oauthToken, requestToken.oauthTokenSecret, oauthVerifier)
                        .then(function(accessToken) {
                            const tumblr = require('tumblr.js');
                            credentials.token = accessToken.userToken;
                            credentials.token_secret = accessToken.userTokenSecret;
                            tumblrClient = tumblr.createClient({
                                credentials: credentials,
                                returnPromises: true,
                            });
                            return tumblrClient.userInfo();
                        })
                        .then(function(response) {
                            res.send([
                                'Successfully retrieved user token for ' + (response.user || {}).name + '!',
                                'Copy the text below to credentials.json:',
                                JSON.stringify(credentials, null, 2),
                            ].join('\n\n'));
                        })
                        .catch(function(err) {
                            console.error('Error', err);
                            res.send('It did not work.');
                        });
                })
                .catch(function(err) {
                    console.error('Error', err);
                    res.send('Could not find request token!');
                });
        } else {
            res.send('Missing token and/or verifier?');
        }
    });

    app.listen(port, function() {
        console.log('Listening on port', port);
        console.log('Go to ' + host + '/authorize to get some Tumblr tokens!');
    });

    return app;
}

module.exports = createApp;
