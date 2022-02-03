/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const path = require('path')
const {getRuntime} = require('pwa-kit-runtime/ssr/server/express')
const pkg = require('../package.json')

const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

const options = {
    buildDir: path.resolve(process.cwd(), 'build'),
    faviconPath: path.resolve(__dirname, 'static', 'favicon.ico'),
    defaultCacheTimeSeconds: 600,
    mobify: pkg.mobify,
    enableLegacyRemoteProxying: false,
    protocol: 'http'
}

const runtime = getRuntime()

const {handler} = runtime.createHandler(options, (app) => {
    // app.get('/', (req, res) => {
    //     return res.json({
    //         protocol: req.protocol,
    //         method: req.method,
    //         path: req.path,
    //         query: req.query,
    //         body: req.body,
    //         headers: req.headers,
    //         ip: req.ip
    //     })
    // })

    // runtime.addSSRRenderer(app)

    app.use(compression());

    // You may want to be more aggressive with this caching
    app.use(express.static("public", { maxAge: "1h" }));

    // Remix fingerprints its assets so we can cache forever
    app.use(express.static("public/build", { immutable: true, maxAge: "1y" }));

    app.use(morgan("tiny"));
    app.all(
      "*",
      MODE === "production"
        ? createRequestHandler({ build: require("../server/build") })
        : (req, res, next) => {
            purgeRequireCache();
            const build = require("../server/build");
            return createRequestHandler({ build, mode: MODE })(req, res, next);
          }
    );

    // const port = process.env.PORT || 3000;
    // app.listen(port, () => {
    //   console.log(`Express server listening on port ${port}`);
    // });

    ////////////////////////////////////////////////////////////////////////////////
    function purgeRequireCache() {
      // purge require cache on requests for "server side HMR" this won't let
      // you have in-memory objects between requests in development,
      // alternatively you can set up nodemon/pm2-dev to restart the server on
      // file changes, we prefer the DX of this though, so we've included it
      // for you by default
      for (const key in require.cache) {
        if (key.startsWith(BUILD_DIR)) {
          delete require.cache[key];
        }
      }
    }
})

exports.get = handler
