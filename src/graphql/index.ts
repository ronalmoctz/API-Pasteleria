import { createSchema, createYoga } from "graphql-yoga";
import { apiLimiter } from "@/middlewares/rate_limit.js";
import type { Express } from "express";
import { productsResolvers } from './resolvers/products.js'
import { productsTypeDefs } from "./schemas/products.js";

export const setupGraphQl = (app: Express) => {

    app.use('/graphql', apiLimiter);

    const yoga = createYoga({
        schema: createSchema({
            typeDefs: [productsTypeDefs],
            resolvers: [productsResolvers]
        }),
        graphqlEndpoint: '/graphql',
        logging: true,
        context: ({ request }) => ({
            user: null
        })
    })

    app.use(yoga.graphqlEndpoint, yoga)
}

