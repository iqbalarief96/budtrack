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
exports.id = "app/api/emergency-fund/route";
exports.ids = ["app/api/emergency-fund/route"];
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

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Femergency-fund%2Froute&page=%2Fapi%2Femergency-fund%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Femergency-fund%2Froute.ts&appDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Femergency-fund%2Froute&page=%2Fapi%2Femergency-fund%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Femergency-fund%2Froute.ts&appDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_qbf_Documents_TES_Budtrack_app_api_emergency_fund_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/emergency-fund/route.ts */ \"(rsc)/./app/api/emergency-fund/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/emergency-fund/route\",\n        pathname: \"/api/emergency-fund\",\n        filename: \"route\",\n        bundlePath: \"app/api/emergency-fund/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\qbf\\\\Documents\\\\TES\\\\Budtrack\\\\app\\\\api\\\\emergency-fund\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_qbf_Documents_TES_Budtrack_app_api_emergency_fund_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/emergency-fund/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZlbWVyZ2VuY3ktZnVuZCUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGZW1lcmdlbmN5LWZ1bmQlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZlbWVyZ2VuY3ktZnVuZCUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNxYmYlNUNEb2N1bWVudHMlNUNURVMlNUNCdWR0cmFjayU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9QyUzQSU1Q1VzZXJzJTVDcWJmJTVDRG9jdW1lbnRzJTVDVEVTJTVDQnVkdHJhY2smaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQzRCO0FBQ3pHO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsaUVBQWlFO0FBQ3pFO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDdUg7O0FBRXZIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYnVkdHJhY2svP2MwMjIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiQzpcXFxcVXNlcnNcXFxccWJmXFxcXERvY3VtZW50c1xcXFxURVNcXFxcQnVkdHJhY2tcXFxcYXBwXFxcXGFwaVxcXFxlbWVyZ2VuY3ktZnVuZFxcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvZW1lcmdlbmN5LWZ1bmQvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9lbWVyZ2VuY3ktZnVuZFwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvZW1lcmdlbmN5LWZ1bmQvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJDOlxcXFxVc2Vyc1xcXFxxYmZcXFxcRG9jdW1lbnRzXFxcXFRFU1xcXFxCdWR0cmFja1xcXFxhcHBcXFxcYXBpXFxcXGVtZXJnZW5jeS1mdW5kXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS9lbWVyZ2VuY3ktZnVuZC9yb3V0ZVwiO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICBzZXJ2ZXJIb29rcyxcbiAgICAgICAgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBvcmlnaW5hbFBhdGhuYW1lLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Femergency-fund%2Froute&page=%2Fapi%2Femergency-fund%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Femergency-fund%2Froute.ts&appDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/emergency-fund/route.ts":
/*!*****************************************!*\
  !*** ./app/api/emergency-fund/route.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./lib/auth.ts\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n\n\n\n\nasync function GET() {\n    try {\n        const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(_lib_auth__WEBPACK_IMPORTED_MODULE_2__.authOptions);\n        if (!session?.user?.id) {\n            console.log(\"No session found\");\n            return new next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse(\"Unauthorized\", {\n                status: 401\n            });\n        }\n        console.log(\"User ID:\", session.user.id);\n        // Get total balance from all wallets\n        const wallets = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__[\"default\"].wallet.findMany({\n            where: {\n                userId: session.user.id\n            },\n            select: {\n                balance: true\n            }\n        });\n        const totalBalance = wallets.reduce((sum, wallet)=>sum + wallet.balance, 0);\n        console.log(\"Total Balance:\", totalBalance);\n        // Get savings transactions grouped by description\n        const savingsTransactions = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__[\"default\"].transaction.findMany({\n            where: {\n                userId: session.user.id,\n                description: {\n                    startsWith: \"Tabungan\"\n                },\n                category: {\n                    name: \"Savings\"\n                }\n            },\n            orderBy: {\n                date: \"desc\"\n            },\n            include: {\n                category: true,\n                wallet: true\n            }\n        });\n        console.log(\"Found savings transactions:\", savingsTransactions.length);\n        console.log(\"Raw transactions:\", JSON.stringify(savingsTransactions, null, 2));\n        // Get all categories of type SAVINGS\n        const savingsCategories = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__[\"default\"].category.findMany({\n            where: {\n                userId: session.user.id,\n                type: \"SAVINGS\"\n            }\n        });\n        console.log(\"Savings categories:\", JSON.stringify(savingsCategories, null, 2));\n        // Calculate savings by description\n        const savingsByType = savingsTransactions.reduce((acc, transaction)=>{\n            // Use transaction description as the key, fallback to category name or 'Other Savings'\n            const description = transaction.description || (transaction.category?.name ?? \"Other Savings\");\n            // Initialize if not exists\n            if (!acc[description]) {\n                acc[description] = 0;\n            }\n            // For savings:\n            // - EXPENSE means money is being saved (added to savings)\n            // - INCOME means money is being withdrawn from savings\n            const amount = transaction.type === \"EXPENSE\" ? transaction.amount : -transaction.amount;\n            acc[description] += amount;\n            console.log(`Processing transaction:\n        Description: ${description}\n        Type: ${transaction.type}\n        Amount: ${amount}\n        Category: ${transaction.category?.name}\n        Category Type: ${transaction.category?.type}\n        Running total for ${description}: ${acc[description]}`);\n            return acc;\n        }, {});\n        console.log(\"Initial savings by type:\", savingsByType);\n        // Filter out zero or negative balances and format the result\n        const filteredSavingsByType = {};\n        for (const [description, amount] of Object.entries(savingsByType)){\n            if (amount > 0) {\n                filteredSavingsByType[description] = amount;\n            }\n        }\n        console.log(\"Filtered savings:\", filteredSavingsByType);\n        // Calculate total savings from filtered amounts\n        const totalSavings = Object.values(filteredSavingsByType).reduce((sum, amount)=>sum + amount, 0);\n        console.log(\"Total savings:\", totalSavings);\n        const response = {\n            totalBalance,\n            emergencyFund: totalBalance,\n            totalSavings,\n            savingsByType: filteredSavingsByType\n        };\n        console.log(\"Final response:\", response);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(response);\n    } catch (error) {\n        console.error(\"Error calculating emergency fund:\", error);\n        return new next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse(\"Internal Server Error\", {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Qyw0QkFBNEIwQjtRQUV4Qyw2REFBNkQ7UUFDN0QsTUFBTUcsd0JBQWdELENBQUM7UUFDdkQsS0FBSyxNQUFNLENBQUNmLGFBQWFjLE9BQU8sSUFBSUUsT0FBT0MsT0FBTyxDQUFDTCxlQUFnQjtZQUNqRSxJQUFJRSxTQUFTLEdBQUc7Z0JBQ2RDLHFCQUFxQixDQUFDZixZQUFZLEdBQUdjO1lBQ3ZDO1FBQ0Y7UUFFQTdCLFFBQVFDLEdBQUcsQ0FBQyxxQkFBcUI2QjtRQUVqQyxnREFBZ0Q7UUFDaEQsTUFBTUcsZUFBZUYsT0FBT0csTUFBTSxDQUFDSix1QkFBdUJuQixNQUFNLENBQUMsQ0FBQ0MsS0FBS2lCLFNBQVdqQixNQUFNaUIsUUFBUTtRQUNoRzdCLFFBQVFDLEdBQUcsQ0FBQyxrQkFBa0JnQztRQUU5QixNQUFNRSxXQUFXO1lBQ2Z6QjtZQUNBMEIsZUFBZTFCO1lBQ2Z1QjtZQUNBTixlQUFlRztRQUNqQjtRQUVBOUIsUUFBUUMsR0FBRyxDQUFDLG1CQUFtQmtDO1FBRS9CLE9BQU8zQyxxREFBWUEsQ0FBQzZDLElBQUksQ0FBQ0Y7SUFDM0IsRUFBRSxPQUFPRyxPQUFPO1FBQ2R0QyxRQUFRc0MsS0FBSyxDQUFDLHFDQUFxQ0E7UUFDbkQsT0FBTyxJQUFJOUMscURBQVlBLENBQUMseUJBQXlCO1lBQUVVLFFBQVE7UUFBSTtJQUNqRTtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYnVkdHJhY2svLi9hcHAvYXBpL2VtZXJnZW5jeS1mdW5kL3JvdXRlLnRzPzhiN2QiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInO1xuaW1wb3J0IHsgZ2V0U2VydmVyU2Vzc2lvbiB9IGZyb20gJ25leHQtYXV0aCc7XG5pbXBvcnQgeyBhdXRoT3B0aW9ucyB9IGZyb20gJ0AvbGliL2F1dGgnO1xuaW1wb3J0IHByaXNtYSBmcm9tICdAL2xpYi9wcmlzbWEnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBnZXRTZXJ2ZXJTZXNzaW9uKGF1dGhPcHRpb25zKTtcbiAgICBcbiAgICBpZiAoIXNlc3Npb24/LnVzZXI/LmlkKSB7XG4gICAgICBjb25zb2xlLmxvZygnTm8gc2Vzc2lvbiBmb3VuZCcpO1xuICAgICAgcmV0dXJuIG5ldyBOZXh0UmVzcG9uc2UoJ1VuYXV0aG9yaXplZCcsIHsgc3RhdHVzOiA0MDEgfSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ1VzZXIgSUQ6Jywgc2Vzc2lvbi51c2VyLmlkKTtcblxuICAgIC8vIEdldCB0b3RhbCBiYWxhbmNlIGZyb20gYWxsIHdhbGxldHNcbiAgICBjb25zdCB3YWxsZXRzID0gYXdhaXQgcHJpc21hLndhbGxldC5maW5kTWFueSh7XG4gICAgICB3aGVyZToge1xuICAgICAgICB1c2VySWQ6IHNlc3Npb24udXNlci5pZFxuICAgICAgfSxcbiAgICAgIHNlbGVjdDoge1xuICAgICAgICBiYWxhbmNlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB0b3RhbEJhbGFuY2UgPSB3YWxsZXRzLnJlZHVjZSgoc3VtLCB3YWxsZXQpID0+IHN1bSArIHdhbGxldC5iYWxhbmNlLCAwKTtcbiAgICBjb25zb2xlLmxvZygnVG90YWwgQmFsYW5jZTonLCB0b3RhbEJhbGFuY2UpO1xuXG4gICAgLy8gR2V0IHNhdmluZ3MgdHJhbnNhY3Rpb25zIGdyb3VwZWQgYnkgZGVzY3JpcHRpb25cbiAgICBjb25zdCBzYXZpbmdzVHJhbnNhY3Rpb25zID0gYXdhaXQgcHJpc21hLnRyYW5zYWN0aW9uLmZpbmRNYW55KHtcbiAgICAgIHdoZXJlOiB7XG4gICAgICAgIHVzZXJJZDogc2Vzc2lvbi51c2VyLmlkLFxuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgIHN0YXJ0c1dpdGg6ICdUYWJ1bmdhbidcbiAgICAgICAgfSxcbiAgICAgICAgY2F0ZWdvcnk6IHtcbiAgICAgICAgICBuYW1lOiAnU2F2aW5ncydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG9yZGVyQnk6IHtcbiAgICAgICAgZGF0ZTogJ2Rlc2MnXG4gICAgICB9LFxuICAgICAgaW5jbHVkZToge1xuICAgICAgICBjYXRlZ29yeTogdHJ1ZSxcbiAgICAgICAgd2FsbGV0OiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnRm91bmQgc2F2aW5ncyB0cmFuc2FjdGlvbnM6Jywgc2F2aW5nc1RyYW5zYWN0aW9ucy5sZW5ndGgpO1xuICAgIGNvbnNvbGUubG9nKCdSYXcgdHJhbnNhY3Rpb25zOicsIEpTT04uc3RyaW5naWZ5KHNhdmluZ3NUcmFuc2FjdGlvbnMsIG51bGwsIDIpKTtcblxuICAgIC8vIEdldCBhbGwgY2F0ZWdvcmllcyBvZiB0eXBlIFNBVklOR1NcbiAgICBjb25zdCBzYXZpbmdzQ2F0ZWdvcmllcyA9IGF3YWl0IHByaXNtYS5jYXRlZ29yeS5maW5kTWFueSh7XG4gICAgICB3aGVyZToge1xuICAgICAgICB1c2VySWQ6IHNlc3Npb24udXNlci5pZCxcbiAgICAgICAgdHlwZTogJ1NBVklOR1MnXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnU2F2aW5ncyBjYXRlZ29yaWVzOicsIEpTT04uc3RyaW5naWZ5KHNhdmluZ3NDYXRlZ29yaWVzLCBudWxsLCAyKSk7XG5cbiAgICAvLyBDYWxjdWxhdGUgc2F2aW5ncyBieSBkZXNjcmlwdGlvblxuICAgIGNvbnN0IHNhdmluZ3NCeVR5cGUgPSBzYXZpbmdzVHJhbnNhY3Rpb25zLnJlZHVjZSgoYWNjLCB0cmFuc2FjdGlvbikgPT4ge1xuICAgICAgLy8gVXNlIHRyYW5zYWN0aW9uIGRlc2NyaXB0aW9uIGFzIHRoZSBrZXksIGZhbGxiYWNrIHRvIGNhdGVnb3J5IG5hbWUgb3IgJ090aGVyIFNhdmluZ3MnXG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHRyYW5zYWN0aW9uLmRlc2NyaXB0aW9uIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICh0cmFuc2FjdGlvbi5jYXRlZ29yeT8ubmFtZSA/PyAnT3RoZXIgU2F2aW5ncycpO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGlmIG5vdCBleGlzdHNcbiAgICAgIGlmICghYWNjW2Rlc2NyaXB0aW9uXSkge1xuICAgICAgICBhY2NbZGVzY3JpcHRpb25dID0gMDtcbiAgICAgIH1cblxuICAgICAgLy8gRm9yIHNhdmluZ3M6XG4gICAgICAvLyAtIEVYUEVOU0UgbWVhbnMgbW9uZXkgaXMgYmVpbmcgc2F2ZWQgKGFkZGVkIHRvIHNhdmluZ3MpXG4gICAgICAvLyAtIElOQ09NRSBtZWFucyBtb25leSBpcyBiZWluZyB3aXRoZHJhd24gZnJvbSBzYXZpbmdzXG4gICAgICBjb25zdCBhbW91bnQgPSB0cmFuc2FjdGlvbi50eXBlID09PSAnRVhQRU5TRScgPyB0cmFuc2FjdGlvbi5hbW91bnQgOiAtdHJhbnNhY3Rpb24uYW1vdW50O1xuICAgICAgYWNjW2Rlc2NyaXB0aW9uXSArPSBhbW91bnQ7XG5cbiAgICAgIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIHRyYW5zYWN0aW9uOlxuICAgICAgICBEZXNjcmlwdGlvbjogJHtkZXNjcmlwdGlvbn1cbiAgICAgICAgVHlwZTogJHt0cmFuc2FjdGlvbi50eXBlfVxuICAgICAgICBBbW91bnQ6ICR7YW1vdW50fVxuICAgICAgICBDYXRlZ29yeTogJHt0cmFuc2FjdGlvbi5jYXRlZ29yeT8ubmFtZX1cbiAgICAgICAgQ2F0ZWdvcnkgVHlwZTogJHt0cmFuc2FjdGlvbi5jYXRlZ29yeT8udHlwZX1cbiAgICAgICAgUnVubmluZyB0b3RhbCBmb3IgJHtkZXNjcmlwdGlvbn06ICR7YWNjW2Rlc2NyaXB0aW9uXX1gKTtcblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KTtcblxuICAgIGNvbnNvbGUubG9nKCdJbml0aWFsIHNhdmluZ3MgYnkgdHlwZTonLCBzYXZpbmdzQnlUeXBlKTtcblxuICAgIC8vIEZpbHRlciBvdXQgemVybyBvciBuZWdhdGl2ZSBiYWxhbmNlcyBhbmQgZm9ybWF0IHRoZSByZXN1bHRcbiAgICBjb25zdCBmaWx0ZXJlZFNhdmluZ3NCeVR5cGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtkZXNjcmlwdGlvbiwgYW1vdW50XSBvZiBPYmplY3QuZW50cmllcyhzYXZpbmdzQnlUeXBlKSkge1xuICAgICAgaWYgKGFtb3VudCA+IDApIHtcbiAgICAgICAgZmlsdGVyZWRTYXZpbmdzQnlUeXBlW2Rlc2NyaXB0aW9uXSA9IGFtb3VudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnRmlsdGVyZWQgc2F2aW5nczonLCBmaWx0ZXJlZFNhdmluZ3NCeVR5cGUpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRvdGFsIHNhdmluZ3MgZnJvbSBmaWx0ZXJlZCBhbW91bnRzXG4gICAgY29uc3QgdG90YWxTYXZpbmdzID0gT2JqZWN0LnZhbHVlcyhmaWx0ZXJlZFNhdmluZ3NCeVR5cGUpLnJlZHVjZSgoc3VtLCBhbW91bnQpID0+IHN1bSArIGFtb3VudCwgMCk7XG4gICAgY29uc29sZS5sb2coJ1RvdGFsIHNhdmluZ3M6JywgdG90YWxTYXZpbmdzKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0ge1xuICAgICAgdG90YWxCYWxhbmNlLFxuICAgICAgZW1lcmdlbmN5RnVuZDogdG90YWxCYWxhbmNlLFxuICAgICAgdG90YWxTYXZpbmdzLFxuICAgICAgc2F2aW5nc0J5VHlwZTogZmlsdGVyZWRTYXZpbmdzQnlUeXBlXG4gICAgfTtcblxuICAgIGNvbnNvbGUubG9nKCdGaW5hbCByZXNwb25zZTonLCByZXNwb25zZSk7XG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24ocmVzcG9uc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNhbGN1bGF0aW5nIGVtZXJnZW5jeSBmdW5kOicsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IE5leHRSZXNwb25zZSgnSW50ZXJuYWwgU2VydmVyIEVycm9yJywgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxufSAiXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiZ2V0U2VydmVyU2Vzc2lvbiIsImF1dGhPcHRpb25zIiwicHJpc21hIiwiR0VUIiwic2Vzc2lvbiIsInVzZXIiLCJpZCIsImNvbnNvbGUiLCJsb2ciLCJzdGF0dXMiLCJ3YWxsZXRzIiwid2FsbGV0IiwiZmluZE1hbnkiLCJ3aGVyZSIsInVzZXJJZCIsInNlbGVjdCIsImJhbGFuY2UiLCJ0b3RhbEJhbGFuY2UiLCJyZWR1Y2UiLCJzdW0iLCJzYXZpbmdzVHJhbnNhY3Rpb25zIiwidHJhbnNhY3Rpb24iLCJkZXNjcmlwdGlvbiIsInN0YXJ0c1dpdGgiLCJjYXRlZ29yeSIsIm5hbWUiLCJvcmRlckJ5IiwiZGF0ZSIsImluY2x1ZGUiLCJsZW5ndGgiLCJKU09OIiwic3RyaW5naWZ5Iiwic2F2aW5nc0NhdGVnb3JpZXMiLCJ0eXBlIiwic2F2aW5nc0J5VHlwZSIsImFjYyIsImFtb3VudCIsImZpbHRlcmVkU2F2aW5nc0J5VHlwZSIsIk9iamVjdCIsImVudHJpZXMiLCJ0b3RhbFNhdmluZ3MiLCJ2YWx1ZXMiLCJyZXNwb25zZSIsImVtZXJnZW5jeUZ1bmQiLCJqc29uIiwiZXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/emergency-fund/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n/* harmony import */ var bcrypt__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! bcrypt */ \"bcrypt\");\n/* harmony import */ var bcrypt__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(bcrypt__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./prisma */ \"(rsc)/./lib/prisma.ts\");\n\n\n\nconst authOptions = {\n    session: {\n        strategy: \"jwt\"\n    },\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            name: \"Sign in\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\",\n                    placeholder: \"example@example.com\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials.password) {\n                    return null;\n                }\n                const user = await _prisma__WEBPACK_IMPORTED_MODULE_2__[\"default\"].user.findUnique({\n                    where: {\n                        email: credentials.email\n                    }\n                });\n                if (!user || !user.password) {\n                    return null;\n                }\n                const isPasswordValid = await (0,bcrypt__WEBPACK_IMPORTED_MODULE_1__.compare)(credentials.password, user.password);\n                if (!isPasswordValid) {\n                    return null;\n                }\n                return {\n                    id: user.id,\n                    email: user.email,\n                    name: user.name,\n                    image: null\n                };\n            }\n        })\n    ],\n    callbacks: {\n        session: ({ session, token })=>{\n            return {\n                ...session,\n                user: {\n                    ...session.user,\n                    id: token.id\n                }\n            };\n        },\n        jwt: ({ token, user })=>{\n            if (user) {\n                return {\n                    ...token,\n                    id: user.id\n                };\n            }\n            return token;\n        }\n    },\n    pages: {\n        signIn: \"/login\"\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUNrRTtBQUNqQztBQUNIO0FBVXZCLE1BQU1HLGNBQStCO0lBQzFDQyxTQUFTO1FBQ1BDLFVBQVU7SUFDWjtJQUNBQyxXQUFXO1FBQ1ROLDJFQUFtQkEsQ0FBQztZQUNsQk8sTUFBTTtZQUNOQyxhQUFhO2dCQUNYQyxPQUFPO29CQUNMQyxPQUFPO29CQUNQQyxNQUFNO29CQUNOQyxhQUFhO2dCQUNmO2dCQUNBQyxVQUFVO29CQUFFSCxPQUFPO29CQUFZQyxNQUFNO2dCQUFXO1lBQ2xEO1lBQ0EsTUFBTUcsV0FBVU4sV0FBVztnQkFDekIsSUFBSSxDQUFDQSxhQUFhQyxTQUFTLENBQUNELFlBQVlLLFFBQVEsRUFBRTtvQkFDaEQsT0FBTztnQkFDVDtnQkFFQSxNQUFNRSxPQUFPLE1BQU1iLCtDQUFNQSxDQUFDYSxJQUFJLENBQUNDLFVBQVUsQ0FBQztvQkFDeENDLE9BQU87d0JBQ0xSLE9BQU9ELFlBQVlDLEtBQUs7b0JBQzFCO2dCQUNGO2dCQUVBLElBQUksQ0FBQ00sUUFBUSxDQUFDQSxLQUFLRixRQUFRLEVBQUU7b0JBQzNCLE9BQU87Z0JBQ1Q7Z0JBRUEsTUFBTUssa0JBQWtCLE1BQU1qQiwrQ0FBT0EsQ0FBQ08sWUFBWUssUUFBUSxFQUFFRSxLQUFLRixRQUFRO2dCQUV6RSxJQUFJLENBQUNLLGlCQUFpQjtvQkFDcEIsT0FBTztnQkFDVDtnQkFFQSxPQUFPO29CQUNMQyxJQUFJSixLQUFLSSxFQUFFO29CQUNYVixPQUFPTSxLQUFLTixLQUFLO29CQUNqQkYsTUFBTVEsS0FBS1IsSUFBSTtvQkFDZmEsT0FBTztnQkFDVDtZQUNGO1FBQ0Y7S0FDRDtJQUNEQyxXQUFXO1FBQ1RqQixTQUFTLENBQUMsRUFBRUEsT0FBTyxFQUFFa0IsS0FBSyxFQUFFO1lBQzFCLE9BQU87Z0JBQ0wsR0FBR2xCLE9BQU87Z0JBQ1ZXLE1BQU07b0JBQ0osR0FBR1gsUUFBUVcsSUFBSTtvQkFDZkksSUFBSUcsTUFBTUgsRUFBRTtnQkFDZDtZQUNGO1FBQ0Y7UUFDQUksS0FBSyxDQUFDLEVBQUVELEtBQUssRUFBRVAsSUFBSSxFQUFFO1lBQ25CLElBQUlBLE1BQU07Z0JBQ1IsT0FBTztvQkFDTCxHQUFHTyxLQUFLO29CQUNSSCxJQUFJSixLQUFLSSxFQUFFO2dCQUNiO1lBQ0Y7WUFDQSxPQUFPRztRQUNUO0lBQ0Y7SUFDQUUsT0FBTztRQUNMQyxRQUFRO0lBQ1Y7QUFDRixFQUFFIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYnVkdHJhY2svLi9saWIvYXV0aC50cz9iZjdlIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERlZmF1bHRTZXNzaW9uLCBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tIFwibmV4dC1hdXRoXCI7XHJcbmltcG9ydCBDcmVkZW50aWFsc1Byb3ZpZGVyIGZyb20gXCJuZXh0LWF1dGgvcHJvdmlkZXJzL2NyZWRlbnRpYWxzXCI7XHJcbmltcG9ydCB7IGNvbXBhcmUgfSBmcm9tIFwiYmNyeXB0XCI7XHJcbmltcG9ydCBwcmlzbWEgZnJvbSBcIi4vcHJpc21hXCI7XHJcblxyXG5kZWNsYXJlIG1vZHVsZSBcIm5leHQtYXV0aFwiIHtcclxuICBpbnRlcmZhY2UgU2Vzc2lvbiBleHRlbmRzIERlZmF1bHRTZXNzaW9uIHtcclxuICAgIHVzZXI6IHtcclxuICAgICAgaWQ6IHN0cmluZztcclxuICAgIH0gJiBEZWZhdWx0U2Vzc2lvbltcInVzZXJcIl1cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9uczogTmV4dEF1dGhPcHRpb25zID0ge1xyXG4gIHNlc3Npb246IHtcclxuICAgIHN0cmF0ZWd5OiBcImp3dFwiLFxyXG4gIH0sXHJcbiAgcHJvdmlkZXJzOiBbXHJcbiAgICBDcmVkZW50aWFsc1Byb3ZpZGVyKHtcclxuICAgICAgbmFtZTogXCJTaWduIGluXCIsXHJcbiAgICAgIGNyZWRlbnRpYWxzOiB7XHJcbiAgICAgICAgZW1haWw6IHtcclxuICAgICAgICAgIGxhYmVsOiBcIkVtYWlsXCIsXHJcbiAgICAgICAgICB0eXBlOiBcImVtYWlsXCIsXHJcbiAgICAgICAgICBwbGFjZWhvbGRlcjogXCJleGFtcGxlQGV4YW1wbGUuY29tXCIsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXNzd29yZDogeyBsYWJlbDogXCJQYXNzd29yZFwiLCB0eXBlOiBcInBhc3N3b3JkXCIgfSxcclxuICAgICAgfSxcclxuICAgICAgYXN5bmMgYXV0aG9yaXplKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgaWYgKCFjcmVkZW50aWFscz8uZW1haWwgfHwgIWNyZWRlbnRpYWxzLnBhc3N3b3JkKSB7XHJcbiAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5maW5kVW5pcXVlKHtcclxuICAgICAgICAgIHdoZXJlOiB7XHJcbiAgICAgICAgICAgIGVtYWlsOiBjcmVkZW50aWFscy5lbWFpbCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghdXNlciB8fCAhdXNlci5wYXNzd29yZCkge1xyXG4gICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpc1Bhc3N3b3JkVmFsaWQgPSBhd2FpdCBjb21wYXJlKGNyZWRlbnRpYWxzLnBhc3N3b3JkLCB1c2VyLnBhc3N3b3JkKTtcclxuXHJcbiAgICAgICAgaWYgKCFpc1Bhc3N3b3JkVmFsaWQpIHtcclxuICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiB1c2VyLmlkLFxyXG4gICAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgICAgICBuYW1lOiB1c2VyLm5hbWUsXHJcbiAgICAgICAgICBpbWFnZTogbnVsbCxcclxuICAgICAgICB9O1xyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgXSxcclxuICBjYWxsYmFja3M6IHtcclxuICAgIHNlc3Npb246ICh7IHNlc3Npb24sIHRva2VuIH0pID0+IHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5zZXNzaW9uLFxyXG4gICAgICAgIHVzZXI6IHtcclxuICAgICAgICAgIC4uLnNlc3Npb24udXNlcixcclxuICAgICAgICAgIGlkOiB0b2tlbi5pZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfSxcclxuICAgIGp3dDogKHsgdG9rZW4sIHVzZXIgfSkgPT4ge1xyXG4gICAgICBpZiAodXNlcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAuLi50b2tlbixcclxuICAgICAgICAgIGlkOiB1c2VyLmlkLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRva2VuO1xyXG4gICAgfSxcclxuICB9LFxyXG4gIHBhZ2VzOiB7XHJcbiAgICBzaWduSW46IFwiL2xvZ2luXCIsXHJcbiAgfSxcclxufTsgIl0sIm5hbWVzIjpbIkNyZWRlbnRpYWxzUHJvdmlkZXIiLCJjb21wYXJlIiwicHJpc21hIiwiYXV0aE9wdGlvbnMiLCJzZXNzaW9uIiwic3RyYXRlZ3kiLCJwcm92aWRlcnMiLCJuYW1lIiwiY3JlZGVudGlhbHMiLCJlbWFpbCIsImxhYmVsIiwidHlwZSIsInBsYWNlaG9sZGVyIiwicGFzc3dvcmQiLCJhdXRob3JpemUiLCJ1c2VyIiwiZmluZFVuaXF1ZSIsIndoZXJlIiwiaXNQYXNzd29yZFZhbGlkIiwiaWQiLCJpbWFnZSIsImNhbGxiYWNrcyIsInRva2VuIiwiand0IiwicGFnZXMiLCJzaWduSW4iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

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
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/jose","vendor-chunks/next-auth","vendor-chunks/openid-client","vendor-chunks/@babel","vendor-chunks/oauth","vendor-chunks/object-hash","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/lru-cache","vendor-chunks/cookie","vendor-chunks/oidc-token-hash","vendor-chunks/@panva"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Femergency-fund%2Froute&page=%2Fapi%2Femergency-fund%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Femergency-fund%2Froute.ts&appDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Cqbf%5CDocuments%5CTES%5CBudtrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();