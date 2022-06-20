export const get = () => {
    return {
        status: 200,
        body: {
            message: 'I am alive!',
        },
        contentType: 'application/json',
    };
};
