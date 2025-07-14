import { createSchema, createYoga } from "graphql-yoga";
import { apiLimiter } from "@/middlewares/rate_limit";
import type { Express } from "express";
import { productsResolvers } from './resolvers/products'
import { productsTypeDefs } from "./schemas/products";

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