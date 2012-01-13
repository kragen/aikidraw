#!/usr/bin/env node
// That's right, motherfuckers.  This is the STORAGE SERVER.
// TODO:
// D run an HTTP server
// D store blobs in a list
// - persist blobs to disk
// - make Location URLs absolute
// - assign randomish IDs to blobs?
// - use alphabetic encoding for blob IDs
// - add APPEND
// - support CORS
// - encode response to prevent protocol confusion and XSS
// - get rid of stupid fucking mergedicts
// - rate-limit individual sources by IP address
// - reorganize code to be more top-down
// - make Aikidraw store image in storage server
// - add signaling channels

var http = require('http')
  , querystring = require('querystring')
  , fs = require('fs')
  , idl = ( '<form method="POST"><textarea name="blob"></textarea>'
          + '<input type="submit" /></form>\n'
          )
  , html_content_type = {'Content-type': 'text/html; charset=utf-8'}
  , handlers = { GET: function(req, res) {
                   if (req.url === '/') {
                     res.writeHead(200, html_content_type)
                     res.end(idl)
                   } else {
                     var blobid = +req.url.substr(1)
                     if (blobid >= 0 && blobid < blobs.length) {
                       res.writeHead(200)
                       res.end(blobs[blobid])
                     } else {
                       res.writeHead(404)
                       res.end('404')
                     }
                   }
                 }
               , POST: function(req, res) {
                   whenBodyFinished(req, function(body) {
                     var blob = querystring.parse(body).blob
                       , blobid = blobs.length
                     blobs.push(blob)
                     res.writeHead(301, mergedicts( html_content_type
                                                  , {'Location': '/'+blobid}
                                                  ))
                     res.end('go to /'+blobid)
                   })
                 }
               }
  , badMethod = function(req, res) {
      res.writeHead(501)
      res.end('501')
    }
  , blobs = []
  , blobfile = fs.openSync('aikidraw.blobs', 'a+')
  , buffer = new Buffer()
  , blobstringlen = fs.read(blobfile, buffer, 0, 1024*1024*1024, null)


http.createServer(function (req, res) {
  var handler = handlers[req.method]
  if (!handler) return badMethod(req, res)
  return handler(req, res)
}).listen(8000, "127.0.0.1")

function mergedicts(aa, bb) {
  var rv = {}
  for (var kk in aa) {
    if (aa.hasOwnProperty(kk)) rv[kk] = aa[kk]
  }
  for (var kk in bb) {
    if (bb.hasOwnProperty(kk)) rv[kk] = bb[kk]
  }
  return rv
}

function whenBodyFinished(req, callback) {
  var body = []
  req.addListener('data', function(chunk) { body.push(chunk) })
  req.addListener('end', function() { callback(body.join('')) })
}
