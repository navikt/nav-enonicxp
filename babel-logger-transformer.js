const transformLogger = ({ types: t }) => {
    class BabelInlineImport {
        constructor() {
            return {
                visitor: {
                    CallExpression: {
                        exit(path, state) {
                            const node = path.node;
                            if (node.callee.object && node.callee.object.name === 'logger') {
                                if (node.callee.property.name === 'info') {
                                    if (!node.arguments[1]) {
                                        node.arguments[1] = t.identifier('__FILE__');
                                    }
                                    if (!node.arguments[2]) {
                                        node.arguments[2] = t.identifier('__LINE__');
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
                                        node.arguments[4] = t.identifier('__LINE__');
                                    }
                                }
                            }
                        },
                    },
                },
            };
        }
    }

    return new BabelInlineImport();
};

module.exports = transformLogger;