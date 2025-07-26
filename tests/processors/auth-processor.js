import { response } from "express";

export function setAuthToken(requestParams, context, events, done){
    const users = [
        {email: "ariadna.admin@pasteleria.com", password:"AdminSecurePass123!"},
        {email: "carlos.customer@pasteleria.com", password:"ClienteConfiable456*"},
    ];

    const randomUser = users[Math.floor(Math.random() * users.length)];
    requestParams.authToken = randomUser.email + ":" + randomUser.password;

    return done();
}

export function handleAuthResponse(requestParams, response, context, events, done) {
    if (response.statusCode >= 400){
        console.log(`Error: ${response.statusCode} - Unable to set auth token`);
    }
    return done();
}