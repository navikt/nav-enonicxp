// Injects nashorn global for filename and the typescript line number
// as arguments for our custom logger functions

const transformLogger = ({ types: t }) => {
    class BabelTransformLogger {
        constructor() {
            return {
                visitor: {
                    CallExpression: {
                        exit(path) {
                            const { node } = path;
                            if (!node.callee.object || node.callee.object.name !== 'logger') {
                                return;
                            }

                            const line = node.loc.start.line.toString();

                            if (node.callee.property.name === 'info') {
                                if (!node.arguments[1]) {
                                    node.arguments[1] = t.identifier('__FILE__');
                                }
                                if (!node.arguments[2]) {
                                    node.arguments[2] = t.stringLiteral(line);
                                }
                            } else {
                                if (!node.arguments[1]) {
                                    node.arguments[1] = t.identifier('undefined');
                                }
                                if (!node.arguments[2]) {
                                    node.arguments[2] = t.identifier('undefined');
                                }
                                if (!node.arguments[3]) {
                                    node.arguments[3] = t.identifier('__FILE__');
                                }
                                if (!node.arguments[4]) {
                                    node.arguments[4] = t.stringLiteral(line);
                                }
                            }
                        },
                    },
                },
            };
        }
    }

    return new BabelTransformLogger();
};

module.exports = transformLogger;