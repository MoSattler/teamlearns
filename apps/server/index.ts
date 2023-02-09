import path = require('path');

import express = require('express');
import cms = require('@teamlearns/cms');
import webExpressAdapter = require('@teamlearns/web/express');
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv'
import invariant from "tiny-invariant";

dotenv.config()

const { payload } = cms;
const { createRequestHandler } = webExpressAdapter;

// During development this is fine. Conditionalize this for production as needed.
const BUILD_DIR = path.join(process.cwd(), '../web/build');
const PUBLIC_DIR = path.join(process.cwd(), '../web/public');
const PUBLIC_BUILD_DIR = path.join(process.cwd(), '../web/public/build');

const start = async () => {
    invariant(process.env.PAYLOAD_SECRET, "PAYLOAD_SECRET is required");
    invariant(process.env.MONGODB_URI, "MONGODB_URI is required");

    const app = express();

    await payload.init({
        secret: process.env.PAYLOAD_SECRET,
        mongoURL: process.env.MONGODB_URI,
        express: app,
        onInit: () => {
            payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
        },
    });

    app.use(payload.authenticate);

    app.use(compression());

    // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
    app.disable('x-powered-by');

    // Remix fingerprints its assets so we can cache forever.
    app.use(
        '/build',
        express.static(PUBLIC_BUILD_DIR, { immutable: true, maxAge: '1y' })
    );

    // Everything else (like favicon.ico) is cached for an hour. You may want to be
    // more aggressive with this caching.
    app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));

    app.use(morgan('tiny'));

    app.all(
        '*',
        process.env.NODE_ENV === 'development'
            ? (req, res, next) => {
                  purgeRequireCache();

                  return createRequestHandler({
                      build: require(BUILD_DIR),
                      mode: process.env.NODE_ENV,
                      getLoadContext(req, res) {
                          return {
                              payload: req.payload,
                              user: req.user,
                              res: res,
                          };
                      },
                  })(req, res, next);
              }
            : createRequestHandler({
                  build: require(BUILD_DIR),
                  mode: process.env.NODE_ENV,
                  getLoadContext(req, res) {
                      return {
                          payload: req.payload,
                          user: req.user,
                          res: res,
                      };
                  },
              })
    );

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`Express server listening on port ${port}`);
    });
};

start();

function purgeRequireCache() {
    // purge require cache on requests for "server side HMR" this won't let
    // you have in-memory objects between requests in development,
    // alternatively you can set up nodemon/pm2-dev to restart the server on
    // file changes, but then you'll have to reconnect to databases/etc on each
    // change. We prefer the DX of this, so we've included it for you by default
    for (const key in require.cache) {
        if (key.startsWith(BUILD_DIR)) {
            delete require.cache[key];
        }
    }
}
