#!/usr/bin/env node
// Points every game frontend in the repo at this backend.
//
//   node backend/scripts/wire-frontends.js
//
// For each folder listed in config.GAME_SITES it:
//   1. rewrites the hard-coded external API hosts to this server's origin
//   2. sends players to /login.html when the page is opened without a token
//   3. serves the CDN libraries (axios, moment, toastify, randomColor) from
//      assets/vendor/ so the games work offline
//   4. makes the liability loop skip market slots the page never filled in
//      (several frontends loop past the end of their own odds table)
//
// Safe to re-run: every step checks whether it has already been applied.

const fs = require("fs");
const path = require("path");
const config = require("../src/config");

const VENDOR_SRC = path.join(config.ROOT, "dragonTiger_Web", "assets", "vendor");
const VENDOR_FILES = [
  "axios.min.js",
  "moment.min.js",
  "toastify.min.js",
  "toastify.min.css",
  "randomColor.min.js",
];

const OLD_URLS = `  var API_URL = "http://52.220.88.240:8080/";
  let Bet_URL = "http://13.250.53.81/VirtualCasinoBetPlacer/vc/";
  var API_Img = "http://admin.kalyanexch.com/";
  let API_Admin = "http://23.106.234.25:8192/admin-new-apis/enduser/";
  let API_Edup = "https://oddsapi.247idhub.com/";`;

const NEW_URLS = `  // All services are served by the local backend (backend/src/server.js)
  var BACKEND = window.location.origin + "/";
  var API_URL = BACKEND;
  let Bet_URL = BACKEND + "VirtualCasinoBetPlacer/vc/";
  var API_Img = BACKEND;
  let API_Admin = BACKEND + "admin-new-apis/enduser/";
  let API_Edup = BACKEND;`;

const LOGIN_GUARD = `
  // not logged in -> go get a token first, then come back here
  if (!API_TOKEN) {
    window.location.replace(
      "/login.html?next=" + encodeURIComponent(window.location.pathname)
    );
    return;
  }
`;

const HTML_SUBS = [
  [/<link rel="stylesheet" type="text\/css" href="https:\/\/cdn\.jsdelivr\.net\/npm\/toastify-js\/src\/toastify\.min\.css">/g,
   '<link rel="stylesheet" type="text/css" href="assets/vendor/toastify.min.css">'],
  [/<script type="text\/javascript" src="https:\/\/cdn\.jsdelivr\.net\/npm\/toastify-js"><\/script>/g,
   '<script type="text/javascript" src="assets/vendor/toastify.min.js"></script>'],
  [/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/toastify-js"><\/script>/g,
   '<script src="assets/vendor/toastify.min.js"></script>'],
  [/<script src="https:\/\/unpkg\.com\/axios\/dist\/axios\.min\.js"><\/script>/g,
   '<script src="assets/vendor/axios.min.js"></script>'],
  [/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/moment\.js\/2\.29\.4\/moment\.min\.js"><\/script>/g,
   '<script src="assets/vendor/moment.min.js"></script>'],
  [/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/moment@2\.29\.4\/moment\.min\.js"><\/script>/g, ""],
  [/<script src='https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/randomcolor\/0\.5\.2\/randomColor\.js'><\/script>/g,
   "<script src='assets/vendor/randomColor.min.js'></script>"],
  [/<script src='https:\/\/bundle\.run\/css-scroll-snap-polyfill@0\.1\.2'><\/script>/g, ""],
  [/<script src="https:\/\/unpkg\.com\/device-detector-js\/dist\/device-detector\.min\.js"><\/script>/g, ""],
];

function patchGameJs(file) {
  let src = fs.readFileSync(file, "utf8");
  const before = src;

  if (src.includes(OLD_URLS)) src = src.replace(OLD_URLS, NEW_URLS);

  // insert the login guard right after User_name is read
  if (!src.includes('"/login.html?next="')) {
    src = src.replace(
      /(let User_name = new URLSearchParams\(window\.location\.search\)\.get\("username"\);)/,
      `$1\n${LOGIN_GUARD}`
    );
  }

  // these pages loop over more market slots than they ever populate
  src = src
    .replace(/let sidLocal = liveOddsDataObj\[i\]\.sid;/g,
             "let sidLocal = liveOddsDataObj[i]?.sid;\n          if (sidLocal === undefined) continue;")
    .replace(/let libLocal = libData\.find\(\(i\) => i\.sid == sidLocal\)\.liability;/g,
             "let libLocal = libData.find((i) => i.sid == sidLocal)?.liability;\n          if (libLocal === undefined) continue;");

  if (src !== before) {
    fs.writeFileSync(file, src);
    return true;
  }
  return false;
}

function patchIndexHtml(file) {
  let src = fs.readFileSync(file, "utf8");
  const before = src;
  for (const [re, to] of HTML_SUBS) src = src.replace(re, to);
  if (src !== before) {
    fs.writeFileSync(file, src);
    return true;
  }
  return false;
}

function copyVendor(dir) {
  const dest = path.join(dir, "assets", "vendor");
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0;
  for (const f of VENDOR_FILES) {
    const to = path.join(dest, f);
    if (!fs.existsSync(to)) {
      fs.copyFileSync(path.join(VENDOR_SRC, f), to);
      copied++;
    }
  }
  return copied;
}

const folders = config.GAME_SITES.flatMap((s) => [s.web, s.mobile]).filter(Boolean);
let total = 0;

for (const folder of folders) {
  const dir = path.join(config.ROOT, folder);
  if (!fs.existsSync(dir)) {
    console.log(`skip   ${folder} (not in repo)`);
    continue;
  }
  const changes = [];
  const gameJs = path.join(dir, "assets", "livegame.js");
  if (fs.existsSync(gameJs) && patchGameJs(gameJs)) changes.push("livegame.js");
  const indexHtml = path.join(dir, "index.html");
  if (fs.existsSync(indexHtml) && patchIndexHtml(indexHtml)) changes.push("index.html");
  const n = copyVendor(dir);
  if (n) changes.push(`${n} vendor files`);
  total += changes.length ? 1 : 0;
  console.log(
    changes.length
      ? `wired  ${folder} (${changes.join(", ")})`
      : `ok     ${folder} (already wired)`
  );
}

console.log(`\n${total} folder(s) updated, ${folders.length} checked.`);
