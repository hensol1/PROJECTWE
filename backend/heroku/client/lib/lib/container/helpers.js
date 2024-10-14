"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureContainerStack = void 0;
const color_1 = require("@heroku-cli/color");
const core_1 = require("@oclif/core");
const stackLabelMap = {
    cnb: 'Cloud Native Buildpack',
};
/**
 * Ensure that the given app is a container app.
 * @param app {Heroku.App} heroku app
 * @param cmd {String} command name
 * @returns {null} null
 */
function ensureContainerStack(app, cmd) {
    var _a, _b, _c;
    if (((_a = app.stack) === null || _a === void 0 ? void 0 : _a.name) !== 'container') {
        const appLabel = (((_b = app.stack) === null || _b === void 0 ? void 0 : _b.name) && stackLabelMap[app.stack.name]) || ((_c = app.stack) === null || _c === void 0 ? void 0 : _c.name);
        let message = 'This command is for Docker apps only.';
        if (['push', 'release'].includes(cmd)) {
            message += ` Run ${color_1.default.cyan('git push heroku main')} to deploy your ${color_1.default.cyan(app.name)} ${color_1.default.cyan(appLabel)} app instead.`;
        }
        core_1.ux.error(message, { exit: 1 });
    }
}
exports.ensureContainerStack = ensureContainerStack;
