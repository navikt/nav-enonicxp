import { getAllProducts } from '../../lib/productList/productList';

export const get = (req: XP.Request) => {
    const { secret } = req.headers;

    if (secret !== app.config.serviceSecret) {
        return {
            status: 401,
            body: {
                message: 'Unauthorized',
            },
            contentType: 'application/json',
        };
    }

    const allProducts = getAllProducts();

    return {
        status: 200,
        body: allProducts,
        contentType: 'application/json',
    };
};
