// @ts-nocheck
'use strict';

/**
 * order controller
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
    async customOrderController(ctx) {
        try {
            const data = ctx.body
            const entities = await strapi.entityService.findMany('api::product.product', {
            });
            return { data: entities }
        } catch (err) {
            ctx.body = err;
        };
    },
    async create(ctx) {
        try {
            const { products } = ctx.request.body;
            const lineItems = await Promise.all(products.map(async (product) => {
                const productEntity = await strapi.entityService.findMany('api::product.product', {
                    filters: {
                        key: product.key
                    }
                });
                const realProduct = productEntity[0];
                const image = product.image
                return {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: realProduct.title,
                            images: [image]
                        },
                        unit_amount: realProduct.price * 100
                    },
                    quantity: product.quantity
                }
            }));
            const session = await stripe.checkout.sessions.create({
                shipping_address_collection: {
                    allowed_countries: ['IN']
                },
                line_items: lineItems,
                mode: 'payment',
                success_url: `${process.env.CLIENT_BASE_URL}#/payments/success`,
                cancel_url: `${process.env.CLIENT_BASE_URL}#/payments/failed`,
            });
            await strapi.entityService.create('api::order.order', {
                data: {
                    products,
                    strapid: session.id
                }
            })
            return { stripeId: session.id }
        } catch (error) {
            ctx.response.status = 500;
            return error;
        }
    }
}));
