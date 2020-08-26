const context = typeof window !== 'undefined' ? window : global;
if (typeof context.document === 'undefined') {
    // context.document = { createElement: () => {} };
    context.document = {};
}
