"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/groups/[groupId]/categories/route";
exports.ids = ["app/api/groups/[groupId]/categories/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "bcrypt":
/*!*************************!*\
  !*** external "bcrypt" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("bcrypt");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&page=%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute.ts&appDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&page=%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute.ts&appDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var D_DATA_Documents_code_Tes_budtrack_app_api_groups_groupId_categories_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/groups/[groupId]/categories/route.ts */ \"(rsc)/./app/api/groups/[groupId]/categories/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/groups/[groupId]/categories/route\",\n        pathname: \"/api/groups/[groupId]/categories\",\n        filename: \"route\",\n        bundlePath: \"app/api/groups/[groupId]/categories/route\"\n    },\n    resolvedPagePath: \"D:\\\\DATA\\\\Documents\\\\code\\\\Tes\\\\budtrack\\\\app\\\\api\\\\groups\\\\[groupId]\\\\categories\\\\route.ts\",\n    nextConfigOutput,\n    userland: D_DATA_Documents_code_Tes_budtrack_app_api_groups_groupId_categories_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/groups/[groupId]/categories/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZncm91cHMlMkYlNUJncm91cElkJTVEJTJGY2F0ZWdvcmllcyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGZ3JvdXBzJTJGJTVCZ3JvdXBJZCU1RCUyRmNhdGVnb3JpZXMlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZncm91cHMlMkYlNUJncm91cElkJTVEJTJGY2F0ZWdvcmllcyUyRnJvdXRlLnRzJmFwcERpcj1EJTNBJTVDREFUQSU1Q0RvY3VtZW50cyU1Q2NvZGUlNUNUZXMlNUNidWR0cmFjayU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9RCUzQSU1Q0RBVEElNUNEb2N1bWVudHMlNUNjb2RlJTVDVGVzJTVDYnVkdHJhY2smaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQzJDO0FBQ3hIO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsaUVBQWlFO0FBQ3pFO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDdUg7O0FBRXZIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYnVkdHJhY2svPzUzMTUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiRDpcXFxcREFUQVxcXFxEb2N1bWVudHNcXFxcY29kZVxcXFxUZXNcXFxcYnVkdHJhY2tcXFxcYXBwXFxcXGFwaVxcXFxncm91cHNcXFxcW2dyb3VwSWRdXFxcXGNhdGVnb3JpZXNcXFxccm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2dyb3Vwcy9bZ3JvdXBJZF0vY2F0ZWdvcmllcy9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2dyb3Vwcy9bZ3JvdXBJZF0vY2F0ZWdvcmllc1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvZ3JvdXBzL1tncm91cElkXS9jYXRlZ29yaWVzL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiRDpcXFxcREFUQVxcXFxEb2N1bWVudHNcXFxcY29kZVxcXFxUZXNcXFxcYnVkdHJhY2tcXFxcYXBwXFxcXGFwaVxcXFxncm91cHNcXFxcW2dyb3VwSWRdXFxcXGNhdGVnb3JpZXNcXFxccm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2dyb3Vwcy9bZ3JvdXBJZF0vY2F0ZWdvcmllcy9yb3V0ZVwiO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICBzZXJ2ZXJIb29rcyxcbiAgICAgICAgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBvcmlnaW5hbFBhdGhuYW1lLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&page=%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute.ts&appDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/[...nextauth]/route.ts":
/*!*********************************************!*\
  !*** ./app/api/auth/[...nextauth]/route.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ handler),\n/* harmony export */   POST: () => (/* binding */ handler),\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var _auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @auth/prisma-adapter */ \"(rsc)/./node_modules/@auth/prisma-adapter/index.js\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var bcrypt__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! bcrypt */ \"bcrypt\");\n/* harmony import */ var bcrypt__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(bcrypt__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n\n\n\n\n\nconst prisma = new _prisma_client__WEBPACK_IMPORTED_MODULE_1__.PrismaClient();\nconst authOptions = {\n    adapter: (0,_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__.PrismaAdapter)(prisma),\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_4__[\"default\"])({\n            name: \"credentials\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials?.password) {\n                    return null;\n                }\n                const user = await prisma.user.findUnique({\n                    where: {\n                        email: credentials.email\n                    }\n                });\n                if (!user || !user.password) {\n                    return null;\n                }\n                const isPasswordValid = await (0,bcrypt__WEBPACK_IMPORTED_MODULE_2__.compare)(credentials.password, user.password);\n                if (!isPasswordValid) {\n                    return null;\n                }\n                return {\n                    id: user.id,\n                    email: user.email,\n                    name: user.name,\n                    image: user.image\n                };\n            }\n        })\n    ],\n    session: {\n        strategy: \"jwt\"\n    },\n    callbacks: {\n        async jwt ({ token, user, account }) {\n            if (user) {\n                return {\n                    ...token,\n                    id: user.id\n                };\n            }\n            return token;\n        },\n        async session ({ session, token }) {\n            return {\n                ...session,\n                user: {\n                    ...session.user,\n                    id: token.id\n                }\n            };\n        }\n    },\n    pages: {\n        signIn: \"/auth/signin\"\n    },\n    debug: \"development\" === \"development\",\n    secret: process.env.NEXTAUTH_SECRET\n};\nconst handler = next_auth__WEBPACK_IMPORTED_MODULE_3___default()(authOptions);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFvRDtBQUNQO0FBQ2I7QUFDQTtBQUNpQztBQUdqRSxNQUFNSyxTQUFTLElBQUlKLHdEQUFZQTtBQUV4QixNQUFNSyxjQUErQjtJQUMxQ0MsU0FBU1AsbUVBQWFBLENBQUNLO0lBQ3ZCRyxXQUFXO1FBQ1RKLDJFQUFtQkEsQ0FBQztZQUNsQkssTUFBTTtZQUNOQyxhQUFhO2dCQUNYQyxPQUFPO29CQUFFQyxPQUFPO29CQUFTQyxNQUFNO2dCQUFRO2dCQUN2Q0MsVUFBVTtvQkFBRUYsT0FBTztvQkFBWUMsTUFBTTtnQkFBVztZQUNsRDtZQUNBLE1BQU1FLFdBQVVMLFdBQVc7Z0JBQ3pCLElBQUksQ0FBQ0EsYUFBYUMsU0FBUyxDQUFDRCxhQUFhSSxVQUFVO29CQUNqRCxPQUFPO2dCQUNUO2dCQUVBLE1BQU1FLE9BQU8sTUFBTVgsT0FBT1csSUFBSSxDQUFDQyxVQUFVLENBQUM7b0JBQ3hDQyxPQUFPO3dCQUNMUCxPQUFPRCxZQUFZQyxLQUFLO29CQUMxQjtnQkFDRjtnQkFFQSxJQUFJLENBQUNLLFFBQVEsQ0FBQ0EsS0FBS0YsUUFBUSxFQUFFO29CQUMzQixPQUFPO2dCQUNUO2dCQUVBLE1BQU1LLGtCQUFrQixNQUFNakIsK0NBQU9BLENBQ25DUSxZQUFZSSxRQUFRLEVBQ3BCRSxLQUFLRixRQUFRO2dCQUdmLElBQUksQ0FBQ0ssaUJBQWlCO29CQUNwQixPQUFPO2dCQUNUO2dCQUVBLE9BQU87b0JBQ0xDLElBQUlKLEtBQUtJLEVBQUU7b0JBQ1hULE9BQU9LLEtBQUtMLEtBQUs7b0JBQ2pCRixNQUFNTyxLQUFLUCxJQUFJO29CQUNmWSxPQUFPTCxLQUFLSyxLQUFLO2dCQUNuQjtZQUNGO1FBQ0Y7S0FDRDtJQUNEQyxTQUFTO1FBQ1BDLFVBQVU7SUFDWjtJQUNBQyxXQUFXO1FBQ1QsTUFBTUMsS0FBSSxFQUFFQyxLQUFLLEVBQUVWLElBQUksRUFBRVcsT0FBTyxFQUFFO1lBQ2hDLElBQUlYLE1BQU07Z0JBQ1IsT0FBTztvQkFDTCxHQUFHVSxLQUFLO29CQUNSTixJQUFJSixLQUFLSSxFQUFFO2dCQUNiO1lBQ0Y7WUFDQSxPQUFPTTtRQUNUO1FBQ0EsTUFBTUosU0FBUSxFQUFFQSxPQUFPLEVBQUVJLEtBQUssRUFBRTtZQUM5QixPQUFPO2dCQUNMLEdBQUdKLE9BQU87Z0JBQ1ZOLE1BQU07b0JBQ0osR0FBR00sUUFBUU4sSUFBSTtvQkFDZkksSUFBSU0sTUFBTU4sRUFBRTtnQkFDZDtZQUNGO1FBQ0Y7SUFDRjtJQUNBUSxPQUFPO1FBQ0xDLFFBQVE7SUFDVjtJQUNBQyxPQUFPQyxrQkFBeUI7SUFDaENDLFFBQVFELFFBQVFFLEdBQUcsQ0FBQ0MsZUFBZTtBQUNyQyxFQUFDO0FBRUQsTUFBTUMsVUFBVWhDLGdEQUFRQSxDQUFDRztBQUVpQiIsInNvdXJjZXMiOlsid2VicGFjazovL2J1ZHRyYWNrLy4vYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHM/YzhhNCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcmlzbWFBZGFwdGVyIH0gZnJvbSAnQGF1dGgvcHJpc21hLWFkYXB0ZXInXHJcbmltcG9ydCB7IFByaXNtYUNsaWVudCB9IGZyb20gJ0BwcmlzbWEvY2xpZW50J1xyXG5pbXBvcnQgeyBjb21wYXJlIH0gZnJvbSAnYmNyeXB0J1xyXG5pbXBvcnQgTmV4dEF1dGggZnJvbSAnbmV4dC1hdXRoJ1xyXG5pbXBvcnQgQ3JlZGVudGlhbHNQcm92aWRlciBmcm9tICduZXh0LWF1dGgvcHJvdmlkZXJzL2NyZWRlbnRpYWxzJ1xyXG5pbXBvcnQgeyBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tICduZXh0LWF1dGgnXHJcblxyXG5jb25zdCBwcmlzbWEgPSBuZXcgUHJpc21hQ2xpZW50KClcclxuXHJcbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9uczogTmV4dEF1dGhPcHRpb25zID0ge1xyXG4gIGFkYXB0ZXI6IFByaXNtYUFkYXB0ZXIocHJpc21hKSxcclxuICBwcm92aWRlcnM6IFtcclxuICAgIENyZWRlbnRpYWxzUHJvdmlkZXIoe1xyXG4gICAgICBuYW1lOiAnY3JlZGVudGlhbHMnLFxyXG4gICAgICBjcmVkZW50aWFsczoge1xyXG4gICAgICAgIGVtYWlsOiB7IGxhYmVsOiAnRW1haWwnLCB0eXBlOiAnZW1haWwnIH0sXHJcbiAgICAgICAgcGFzc3dvcmQ6IHsgbGFiZWw6ICdQYXNzd29yZCcsIHR5cGU6ICdwYXNzd29yZCcgfVxyXG4gICAgICB9LFxyXG4gICAgICBhc3luYyBhdXRob3JpemUoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICBpZiAoIWNyZWRlbnRpYWxzPy5lbWFpbCB8fCAhY3JlZGVudGlhbHM/LnBhc3N3b3JkKSB7XHJcbiAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdXNlciA9IGF3YWl0IHByaXNtYS51c2VyLmZpbmRVbmlxdWUoe1xyXG4gICAgICAgICAgd2hlcmU6IHtcclxuICAgICAgICAgICAgZW1haWw6IGNyZWRlbnRpYWxzLmVtYWlsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgaWYgKCF1c2VyIHx8ICF1c2VyLnBhc3N3b3JkKSB7XHJcbiAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaXNQYXNzd29yZFZhbGlkID0gYXdhaXQgY29tcGFyZShcclxuICAgICAgICAgIGNyZWRlbnRpYWxzLnBhc3N3b3JkLFxyXG4gICAgICAgICAgdXNlci5wYXNzd29yZFxyXG4gICAgICAgIClcclxuXHJcbiAgICAgICAgaWYgKCFpc1Bhc3N3b3JkVmFsaWQpIHtcclxuICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgaWQ6IHVzZXIuaWQsXHJcbiAgICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICAgIG5hbWU6IHVzZXIubmFtZSxcclxuICAgICAgICAgIGltYWdlOiB1c2VyLmltYWdlLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICBdLFxyXG4gIHNlc3Npb246IHtcclxuICAgIHN0cmF0ZWd5OiAnand0JyxcclxuICB9LFxyXG4gIGNhbGxiYWNrczoge1xyXG4gICAgYXN5bmMgand0KHsgdG9rZW4sIHVzZXIsIGFjY291bnQgfSkge1xyXG4gICAgICBpZiAodXNlcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAuLi50b2tlbixcclxuICAgICAgICAgIGlkOiB1c2VyLmlkLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdG9rZW5cclxuICAgIH0sXHJcbiAgICBhc3luYyBzZXNzaW9uKHsgc2Vzc2lvbiwgdG9rZW4gfSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIC4uLnNlc3Npb24sXHJcbiAgICAgICAgdXNlcjoge1xyXG4gICAgICAgICAgLi4uc2Vzc2lvbi51c2VyLFxyXG4gICAgICAgICAgaWQ6IHRva2VuLmlkLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcGFnZXM6IHtcclxuICAgIHNpZ25JbjogJy9hdXRoL3NpZ25pbicsXHJcbiAgfSxcclxuICBkZWJ1ZzogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcsXHJcbiAgc2VjcmV0OiBwcm9jZXNzLmVudi5ORVhUQVVUSF9TRUNSRVQsXHJcbn1cclxuXHJcbmNvbnN0IGhhbmRsZXIgPSBOZXh0QXV0aChhdXRoT3B0aW9ucylcclxuXHJcbmV4cG9ydCB7IGhhbmRsZXIgYXMgR0VULCBoYW5kbGVyIGFzIFBPU1QgfSAiXSwibmFtZXMiOlsiUHJpc21hQWRhcHRlciIsIlByaXNtYUNsaWVudCIsImNvbXBhcmUiLCJOZXh0QXV0aCIsIkNyZWRlbnRpYWxzUHJvdmlkZXIiLCJwcmlzbWEiLCJhdXRoT3B0aW9ucyIsImFkYXB0ZXIiLCJwcm92aWRlcnMiLCJuYW1lIiwiY3JlZGVudGlhbHMiLCJlbWFpbCIsImxhYmVsIiwidHlwZSIsInBhc3N3b3JkIiwiYXV0aG9yaXplIiwidXNlciIsImZpbmRVbmlxdWUiLCJ3aGVyZSIsImlzUGFzc3dvcmRWYWxpZCIsImlkIiwiaW1hZ2UiLCJzZXNzaW9uIiwic3RyYXRlZ3kiLCJjYWxsYmFja3MiLCJqd3QiLCJ0b2tlbiIsImFjY291bnQiLCJwYWdlcyIsInNpZ25JbiIsImRlYnVnIiwicHJvY2VzcyIsInNlY3JldCIsImVudiIsIk5FWFRBVVRIX1NFQ1JFVCIsImhhbmRsZXIiLCJHRVQiLCJQT1NUIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./app/api/groups/[groupId]/categories/route.ts":
/*!******************************************************!*\
  !*** ./app/api/groups/[groupId]/categories/route.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _app_api_auth_nextauth_route__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/app/api/auth/[...nextauth]/route */ \"(rsc)/./app/api/auth/[...nextauth]/route.ts\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n\n\n\n\n// GET /api/groups/[groupId]/categories\nasync function GET(request, { params }) {\n    try {\n        const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(_app_api_auth_nextauth_route__WEBPACK_IMPORTED_MODULE_2__.authOptions);\n        if (!session?.user?.id) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Unauthorized\"\n            }, {\n                status: 401\n            });\n        }\n        // Check user membership\n        const membership = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__[\"default\"].userGroup.findFirst({\n            where: {\n                userId: session.user.id,\n                groupId: params.groupId\n            }\n        });\n        if (!membership) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"You are not a member of this group\"\n            }, {\n                status: 403\n            });\n        }\n        // Get user's categories first\n        const userCategories = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__[\"default\"].category.findMany({\n            where: {\n                userId: session.user.id,\n                // We usually only want expense categories for group expenses\n                // but we'll provide both types for flexibility\n                type: {\n                    in: [\n                        \"EXPENSE\",\n                        \"INCOME\"\n                    ]\n                }\n            },\n            orderBy: {\n                name: \"asc\"\n            }\n        });\n        // Get the default categories as fallback if user has no custom categories\n        const defaultCategories = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__[\"default\"].category.findMany({\n            where: {\n                isDefault: true\n            },\n            orderBy: {\n                name: \"asc\"\n            }\n        });\n        // Combine and deduplicate\n        const allCategories = [\n            ...userCategories\n        ];\n        // Only add default categories that don't conflict with user categories\n        for (const defaultCat of defaultCategories){\n            if (!userCategories.some((userCat)=>userCat.name.toLowerCase() === defaultCat.name.toLowerCase() && userCat.type === defaultCat.type)) {\n                allCategories.push(defaultCat);\n            }\n        }\n        // Sort by type and name\n        const sortedCategories = allCategories.sort((a, b)=>{\n            if (a.type !== b.type) {\n                return a.type === \"EXPENSE\" ? -1 : 1;\n            }\n            return a.name.localeCompare(b.name);\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(sortedCategories);\n    } catch (error) {\n        console.error(\"Error fetching categories:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Internal server error\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2dyb3Vwcy9bZ3JvdXBJZF0vY2F0ZWdvcmllcy9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBMEM7QUFDRTtBQUNvQjtBQUMvQjtBQUVqQyx1Q0FBdUM7QUFDaEMsZUFBZUksSUFDcEJDLE9BQWdCLEVBQ2hCLEVBQUVDLE1BQU0sRUFBbUM7SUFFM0MsSUFBSTtRQUNGLE1BQU1DLFVBQVUsTUFBTU4sMkRBQWdCQSxDQUFDQyxxRUFBV0E7UUFFbEQsSUFBSSxDQUFDSyxTQUFTQyxNQUFNQyxJQUFJO1lBQ3RCLE9BQU9ULHFEQUFZQSxDQUFDVSxJQUFJLENBQ3RCO2dCQUFFQyxPQUFPO1lBQWUsR0FDeEI7Z0JBQUVDLFFBQVE7WUFBSTtRQUVsQjtRQUVBLHdCQUF3QjtRQUN4QixNQUFNQyxhQUFhLE1BQU1WLG1EQUFNQSxDQUFDVyxTQUFTLENBQUNDLFNBQVMsQ0FBQztZQUNsREMsT0FBTztnQkFDTEMsUUFBUVYsUUFBUUMsSUFBSSxDQUFDQyxFQUFFO2dCQUN2QlMsU0FBU1osT0FBT1ksT0FBTztZQUN6QjtRQUNGO1FBRUEsSUFBSSxDQUFDTCxZQUFZO1lBQ2YsT0FBT2IscURBQVlBLENBQUNVLElBQUksQ0FDdEI7Z0JBQUVDLE9BQU87WUFBcUMsR0FDOUM7Z0JBQUVDLFFBQVE7WUFBSTtRQUVsQjtRQUVBLDhCQUE4QjtRQUM5QixNQUFNTyxpQkFBaUIsTUFBTWhCLG1EQUFNQSxDQUFDaUIsUUFBUSxDQUFDQyxRQUFRLENBQUM7WUFDcERMLE9BQU87Z0JBQ0xDLFFBQVFWLFFBQVFDLElBQUksQ0FBQ0MsRUFBRTtnQkFDdkIsNkRBQTZEO2dCQUM3RCwrQ0FBK0M7Z0JBQy9DYSxNQUFNO29CQUFFQyxJQUFJO3dCQUFDO3dCQUFXO3FCQUFTO2dCQUFDO1lBQ3BDO1lBQ0FDLFNBQVM7Z0JBQ1BDLE1BQU07WUFDUjtRQUNGO1FBRUEsMEVBQTBFO1FBQzFFLE1BQU1DLG9CQUFvQixNQUFNdkIsbURBQU1BLENBQUNpQixRQUFRLENBQUNDLFFBQVEsQ0FBQztZQUN2REwsT0FBTztnQkFDTFcsV0FBVztZQUNiO1lBQ0FILFNBQVM7Z0JBQ1BDLE1BQU07WUFDUjtRQUNGO1FBRUEsMEJBQTBCO1FBQzFCLE1BQU1HLGdCQUFnQjtlQUFJVDtTQUFlO1FBRXpDLHVFQUF1RTtRQUN2RSxLQUFLLE1BQU1VLGNBQWNILGtCQUFtQjtZQUMxQyxJQUFJLENBQUNQLGVBQWVXLElBQUksQ0FBQ0MsQ0FBQUEsVUFDdkJBLFFBQVFOLElBQUksQ0FBQ08sV0FBVyxPQUFPSCxXQUFXSixJQUFJLENBQUNPLFdBQVcsTUFDMURELFFBQVFULElBQUksS0FBS08sV0FBV1AsSUFBSSxHQUMvQjtnQkFDRE0sY0FBY0ssSUFBSSxDQUFDSjtZQUNyQjtRQUNGO1FBRUEsd0JBQXdCO1FBQ3hCLE1BQU1LLG1CQUFtQk4sY0FBY08sSUFBSSxDQUFDLENBQUNDLEdBQUdDO1lBQzlDLElBQUlELEVBQUVkLElBQUksS0FBS2UsRUFBRWYsSUFBSSxFQUFFO2dCQUNyQixPQUFPYyxFQUFFZCxJQUFJLEtBQUssWUFBWSxDQUFDLElBQUk7WUFDckM7WUFDQSxPQUFPYyxFQUFFWCxJQUFJLENBQUNhLGFBQWEsQ0FBQ0QsRUFBRVosSUFBSTtRQUNwQztRQUVBLE9BQU96QixxREFBWUEsQ0FBQ1UsSUFBSSxDQUFDd0I7SUFDM0IsRUFBRSxPQUFPdkIsT0FBTztRQUNkNEIsUUFBUTVCLEtBQUssQ0FBQyw4QkFBOEJBO1FBQzVDLE9BQU9YLHFEQUFZQSxDQUFDVSxJQUFJLENBQ3RCO1lBQUVDLE9BQU87UUFBd0IsR0FDakM7WUFBRUMsUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9idWR0cmFjay8uL2FwcC9hcGkvZ3JvdXBzL1tncm91cElkXS9jYXRlZ29yaWVzL3JvdXRlLnRzP2Y5MWYiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInXHJcbmltcG9ydCB7IGdldFNlcnZlclNlc3Npb24gfSBmcm9tICduZXh0LWF1dGgnXHJcbmltcG9ydCB7IGF1dGhPcHRpb25zIH0gZnJvbSAnQC9hcHAvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZSdcclxuaW1wb3J0IHByaXNtYSBmcm9tICdAL2xpYi9wcmlzbWEnXHJcblxyXG4vLyBHRVQgL2FwaS9ncm91cHMvW2dyb3VwSWRdL2NhdGVnb3JpZXNcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChcclxuICByZXF1ZXN0OiBSZXF1ZXN0LFxyXG4gIHsgcGFyYW1zIH06IHsgcGFyYW1zOiB7IGdyb3VwSWQ6IHN0cmluZyB9IH1cclxuKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBnZXRTZXJ2ZXJTZXNzaW9uKGF1dGhPcHRpb25zKVxyXG5cclxuICAgIGlmICghc2Vzc2lvbj8udXNlcj8uaWQpIHtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxyXG4gICAgICAgIHsgZXJyb3I6ICdVbmF1dGhvcml6ZWQnIH0sXHJcbiAgICAgICAgeyBzdGF0dXM6IDQwMSB9XHJcbiAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayB1c2VyIG1lbWJlcnNoaXBcclxuICAgIGNvbnN0IG1lbWJlcnNoaXAgPSBhd2FpdCBwcmlzbWEudXNlckdyb3VwLmZpbmRGaXJzdCh7XHJcbiAgICAgIHdoZXJlOiB7XHJcbiAgICAgICAgdXNlcklkOiBzZXNzaW9uLnVzZXIuaWQsXHJcbiAgICAgICAgZ3JvdXBJZDogcGFyYW1zLmdyb3VwSWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG5cclxuICAgIGlmICghbWVtYmVyc2hpcCkge1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXHJcbiAgICAgICAgeyBlcnJvcjogJ1lvdSBhcmUgbm90IGEgbWVtYmVyIG9mIHRoaXMgZ3JvdXAnIH0sXHJcbiAgICAgICAgeyBzdGF0dXM6IDQwMyB9XHJcbiAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgdXNlcidzIGNhdGVnb3JpZXMgZmlyc3RcclxuICAgIGNvbnN0IHVzZXJDYXRlZ29yaWVzID0gYXdhaXQgcHJpc21hLmNhdGVnb3J5LmZpbmRNYW55KHtcclxuICAgICAgd2hlcmU6IHtcclxuICAgICAgICB1c2VySWQ6IHNlc3Npb24udXNlci5pZCxcclxuICAgICAgICAvLyBXZSB1c3VhbGx5IG9ubHkgd2FudCBleHBlbnNlIGNhdGVnb3JpZXMgZm9yIGdyb3VwIGV4cGVuc2VzXHJcbiAgICAgICAgLy8gYnV0IHdlJ2xsIHByb3ZpZGUgYm90aCB0eXBlcyBmb3IgZmxleGliaWxpdHlcclxuICAgICAgICB0eXBlOiB7IGluOiBbJ0VYUEVOU0UnLCAnSU5DT01FJ10gfVxyXG4gICAgICB9LFxyXG4gICAgICBvcmRlckJ5OiB7XHJcbiAgICAgICAgbmFtZTogJ2FzYycsXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEdldCB0aGUgZGVmYXVsdCBjYXRlZ29yaWVzIGFzIGZhbGxiYWNrIGlmIHVzZXIgaGFzIG5vIGN1c3RvbSBjYXRlZ29yaWVzXHJcbiAgICBjb25zdCBkZWZhdWx0Q2F0ZWdvcmllcyA9IGF3YWl0IHByaXNtYS5jYXRlZ29yeS5maW5kTWFueSh7XHJcbiAgICAgIHdoZXJlOiB7XHJcbiAgICAgICAgaXNEZWZhdWx0OiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBvcmRlckJ5OiB7XHJcbiAgICAgICAgbmFtZTogJ2FzYycsXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENvbWJpbmUgYW5kIGRlZHVwbGljYXRlXHJcbiAgICBjb25zdCBhbGxDYXRlZ29yaWVzID0gWy4uLnVzZXJDYXRlZ29yaWVzXVxyXG4gICAgXHJcbiAgICAvLyBPbmx5IGFkZCBkZWZhdWx0IGNhdGVnb3JpZXMgdGhhdCBkb24ndCBjb25mbGljdCB3aXRoIHVzZXIgY2F0ZWdvcmllc1xyXG4gICAgZm9yIChjb25zdCBkZWZhdWx0Q2F0IG9mIGRlZmF1bHRDYXRlZ29yaWVzKSB7XHJcbiAgICAgIGlmICghdXNlckNhdGVnb3JpZXMuc29tZSh1c2VyQ2F0ID0+IFxyXG4gICAgICAgIHVzZXJDYXQubmFtZS50b0xvd2VyQ2FzZSgpID09PSBkZWZhdWx0Q2F0Lm5hbWUudG9Mb3dlckNhc2UoKSAmJiBcclxuICAgICAgICB1c2VyQ2F0LnR5cGUgPT09IGRlZmF1bHRDYXQudHlwZVxyXG4gICAgICApKSB7XHJcbiAgICAgICAgYWxsQ2F0ZWdvcmllcy5wdXNoKGRlZmF1bHRDYXQpXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBTb3J0IGJ5IHR5cGUgYW5kIG5hbWVcclxuICAgIGNvbnN0IHNvcnRlZENhdGVnb3JpZXMgPSBhbGxDYXRlZ29yaWVzLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgaWYgKGEudHlwZSAhPT0gYi50eXBlKSB7XHJcbiAgICAgICAgcmV0dXJuIGEudHlwZSA9PT0gJ0VYUEVOU0UnID8gLTEgOiAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSlcclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHNvcnRlZENhdGVnb3JpZXMpXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGNhdGVnb3JpZXM6JywgZXJyb3IpXHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXHJcbiAgICAgIHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0sXHJcbiAgICAgIHsgc3RhdHVzOiA1MDAgfVxyXG4gICAgKVxyXG4gIH1cclxufSAiXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiZ2V0U2VydmVyU2Vzc2lvbiIsImF1dGhPcHRpb25zIiwicHJpc21hIiwiR0VUIiwicmVxdWVzdCIsInBhcmFtcyIsInNlc3Npb24iLCJ1c2VyIiwiaWQiLCJqc29uIiwiZXJyb3IiLCJzdGF0dXMiLCJtZW1iZXJzaGlwIiwidXNlckdyb3VwIiwiZmluZEZpcnN0Iiwid2hlcmUiLCJ1c2VySWQiLCJncm91cElkIiwidXNlckNhdGVnb3JpZXMiLCJjYXRlZ29yeSIsImZpbmRNYW55IiwidHlwZSIsImluIiwib3JkZXJCeSIsIm5hbWUiLCJkZWZhdWx0Q2F0ZWdvcmllcyIsImlzRGVmYXVsdCIsImFsbENhdGVnb3JpZXMiLCJkZWZhdWx0Q2F0Iiwic29tZSIsInVzZXJDYXQiLCJ0b0xvd2VyQ2FzZSIsInB1c2giLCJzb3J0ZWRDYXRlZ29yaWVzIiwic29ydCIsImEiLCJiIiwibG9jYWxlQ29tcGFyZSIsImNvbnNvbGUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/groups/[groupId]/categories/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/prisma.ts":
/*!***********************!*\
  !*** ./lib/prisma.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n\nconst prismaClientSingleton = ()=>{\n    return new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient();\n};\nconst globalForPrisma = globalThis;\nconst prisma = globalForPrisma.prisma ?? prismaClientSingleton();\nif (true) globalForPrisma.prisma = prisma;\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (prisma);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcHJpc21hLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUE2QztBQUU3QyxNQUFNQyx3QkFBd0I7SUFDNUIsT0FBTyxJQUFJRCx3REFBWUE7QUFDekI7QUFJQSxNQUFNRSxrQkFBa0JDO0FBSXhCLE1BQU1DLFNBQVNGLGdCQUFnQkUsTUFBTSxJQUFJSDtBQUV6QyxJQUFJSSxJQUF5QixFQUFjSCxnQkFBZ0JFLE1BQU0sR0FBR0E7QUFFcEUsaUVBQWVBLE1BQU1BLEVBQUEiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9idWR0cmFjay8uL2xpYi9wcmlzbWEudHM/OTgyMiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcmlzbWFDbGllbnQgfSBmcm9tICdAcHJpc21hL2NsaWVudCdcclxuXHJcbmNvbnN0IHByaXNtYUNsaWVudFNpbmdsZXRvbiA9ICgpID0+IHtcclxuICByZXR1cm4gbmV3IFByaXNtYUNsaWVudCgpXHJcbn1cclxuXHJcbnR5cGUgUHJpc21hQ2xpZW50U2luZ2xldG9uID0gUmV0dXJuVHlwZTx0eXBlb2YgcHJpc21hQ2xpZW50U2luZ2xldG9uPlxyXG5cclxuY29uc3QgZ2xvYmFsRm9yUHJpc21hID0gZ2xvYmFsVGhpcyBhcyB1bmtub3duIGFzIHtcclxuICBwcmlzbWE6IFByaXNtYUNsaWVudFNpbmdsZXRvbiB8IHVuZGVmaW5lZFxyXG59XHJcblxyXG5jb25zdCBwcmlzbWEgPSBnbG9iYWxGb3JQcmlzbWEucHJpc21hID8/IHByaXNtYUNsaWVudFNpbmdsZXRvbigpXHJcblxyXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgZ2xvYmFsRm9yUHJpc21hLnByaXNtYSA9IHByaXNtYVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgcHJpc21hICJdLCJuYW1lcyI6WyJQcmlzbWFDbGllbnQiLCJwcmlzbWFDbGllbnRTaW5nbGV0b24iLCJnbG9iYWxGb3JQcmlzbWEiLCJnbG9iYWxUaGlzIiwicHJpc21hIiwicHJvY2VzcyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/openid-client","vendor-chunks/@babel","vendor-chunks/oauth","vendor-chunks/object-hash","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/yallist","vendor-chunks/lru-cache","vendor-chunks/preact-render-to-string","vendor-chunks/oidc-token-hash","vendor-chunks/@panva","vendor-chunks/@auth"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&page=%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgroups%2F%5BgroupId%5D%2Fcategories%2Froute.ts&appDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CDATA%5CDocuments%5Ccode%5CTes%5Cbudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();