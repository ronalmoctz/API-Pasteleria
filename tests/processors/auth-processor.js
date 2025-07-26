const API_BASE_URL = 'http://localhost:3000';
const LOGIN_ENDPOINT = '/api/auth/login'; // Ajusta según tu endpoint de login

const users = [
    {email: "ariadna.admin@pasteleria.com", password: "AdminSecurePass123!"},
    {email: "carlos.customer@pasteleria.com", password: "ClienteConfiable456*"},
];

// Cache para tokens (evitar login repetido)
const tokenCache = new Map();

export async function setAuthToken(requestParams, context, events, done) {
    try {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const userKey = randomUser.email;
        
        // Verificar si ya tenemos token en cache
        if (tokenCache.has(userKey)) {
            const cachedToken = tokenCache.get(userKey);
            
            // Verificar si el token aún es válido (simplificado)
            if (cachedToken.expires > Date.now()) {
                requestParams.headers = requestParams.headers || {};
                requestParams.headers['Authorization'] = `Bearer ${cachedToken.token}`;
                console.log(`Using cached token for ${userKey}`);
                return done();
            } else {
                tokenCache.delete(userKey);
            }
        }
        
        // Hacer login para obtener token
        console.log(`Getting new token for ${userKey}`);
        
        const loginResponse = await fetch(`${API_BASE_URL}${LOGIN_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: randomUser.email,
                password: randomUser.password
            })
        });
        
        if (!loginResponse.ok) {
            console.error(`Login failed for ${userKey}: ${loginResponse.status}`);
            events.emit('error', new Error(`Login failed: ${loginResponse.status}`));
            return done();
        }
        
        const loginData = await loginResponse.json();
        
        if (!loginData.token && !loginData.access_token) {
            console.error(`No token in response for ${userKey}:`, loginData);
            events.emit('error', new Error('No token in login response'));
            return done();
        }
        
        const token = loginData.token || loginData.access_token;
        
        // Guardar en cache (asumiendo token válido por 1 hora)
        tokenCache.set(userKey, {
            token: token,
            expires: Date.now() + (55 * 60 * 1000) // 55 minutos
        });
        
        // Establecer header de autorización
        requestParams.headers = requestParams.headers || {};
        requestParams.headers['Authorization'] = `Bearer ${token}`;
        
        console.log(`Token set successfully for ${userKey}`);
        
    } catch (error) {
        console.error('Error in setAuthToken:', error);
        events.emit('error', error);
    }
    
    return done();
}

export function handleAuthResponse(requestParams, response, context, events, done) {
    if (response.statusCode === 401) {
        console.log('Unauthorized request - token may be expired');
        // Limpiar cache si hay error 401
        tokenCache.clear();
    } else if (response.statusCode === 429) {
        console.log('Rate limited request');
    } else if (response.statusCode >= 400) {
        console.log(`Request failed with status: ${response.statusCode}`);
    }
    
    return done();
}

// Función para limpiar cache (útil para testing)
export function clearTokenCache() {
    tokenCache.clear();
    console.log('Token cache cleared');
}

// Funciones para métricas por endpoint (Artillery las busca automáticamente)
export function metricsByEndpoint_beforeRequest(requestParams, context, events, done) {
    // Registrar métricas antes del request
    const endpoint = requestParams.url || 'unknown';
    context.vars.endpoint = endpoint;
    context.vars.startTime = Date.now();
    return done();
}

export function metricsByEndpoint_afterResponse(requestParams, response, context, events, done) {
    // Registrar métricas después del response
    const endpoint = context.vars.endpoint || 'unknown';
    const duration = Date.now() - (context.vars.startTime || Date.now());
    
    // Emitir métricas personalizadas
    events.emit('counter', `endpoint.${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.requests`, 1);
    events.emit('histogram', `endpoint.${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.response_time`, duration);
    
    if (response.statusCode >= 400) {
        events.emit('counter', `endpoint.${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.errors`, 1);
    }
    
    return done();
}