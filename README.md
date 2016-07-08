# Tumblr Three-legged OAuth

This is an example of how to get do three-legged OAuth to get user tokens for the Tumblr API.

You can use this as a starting point for when you're trying to build some super cool app using [tumblr.js](https://github.com/tumblr/tumblr.js).

## Usage

1. Register a [Tumblr OAuth app](https://www.tumblr.com/oauth/register)
2. Create a `credentials.json` file with the `consumer_key` and `consumer_secret` for your OAuth app.
3. Run the little [express](http://expressjs.com/) server included to get you started

    ```bash
    npm run server
    ```
4. Hit the authorize URL on the local server, which is will be [http://localhost:3000/authorize](http://localhost:3000/authorize) by default
5. Log in with your Tumblr account and click "Allow"
6. Voila! You now have user tokens that you can use to make authenticated requests against the Tumblr API.

## How does it work?

Take a look at [`lib/app.js`](https://github.com/kmck/tumblr-oauth/blob/master/lib/app.js)! There are some comments explaining roughly how `/authorize` and `/callback` work together to get the credentials you need to make fully authenticated requests to the Tumblr API.
