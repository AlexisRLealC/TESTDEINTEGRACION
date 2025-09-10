// ===================================================================
// ERROR HANDLING SYSTEM - Centralized Error Management for MVP
// ===================================================================
// Sistema centralizado de manejo de errores siguiendo principios MVP

const { logger } = require('./logger');

/**
 * Tipos de errores del sistema
 */
const ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    API: 'API_ERROR',
    AUTH: 'AUTH_ERROR',
    WEBHOOK: 'WEBHOOK_ERROR',
    CONFIG: 'CONFIG_ERROR',
    NETWORK: 'NETWORK_ERROR',
    INTERNAL: 'INTERNAL_ERROR'
};

/**
 * Códigos de error específicos del MVP
 */
const ERROR_CODES = {
    // Validación
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    
    // WhatsApp API
    WHATSAPP_API_ERROR: 'WHATSAPP_API_ERROR',
    INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
    MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
    
    // Autenticación
    INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    
    // Webhook
    WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
    INVALID_WEBHOOK_PAYLOAD: 'INVALID_WEBHOOK_PAYLOAD',
    
    // Configuración
    MISSING_CONFIG: 'MISSING_CONFIG',
    INVALID_CONFIG: 'INVALID_CONFIG',
    
    // Red
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    
    // Interno
    UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
};

/**
 * Clase base para errores personalizados
 */
class AppError extends Error {
    constructor(message, type = ERROR_TYPES.INTERNAL, code = ERROR_CODES.UNEXPECTED_ERROR, statusCode = 500, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.type = type;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }
    
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

/**
 * Error de validación
 */
class ValidationError extends AppError {
    constructor(message, details = {}) {
        super(message, ERROR_TYPES.VALIDATION, ERROR_CODES.INVALID_INPUT, 400, details);
    }
}

/**
 * Error de API externa
 */
class ApiError extends AppError {
    constructor(message, apiName, statusCode = 500, details = {}) {
        super(message, ERROR_TYPES.API, ERROR_CODES.WHATSAPP_API_ERROR, statusCode, {
            apiName,
            ...details
        });
    }
}

/**
 * Error de autenticación
 */
class AuthError extends AppError {
    constructor(message, code = ERROR_CODES.UNAUTHORIZED, details = {}) {
        super(message, ERROR_TYPES.AUTH, code, 401, details);
    }
}

/**
 * Error de webhook
 */
class WebhookError extends AppError {
    constructor(message, code = ERROR_CODES.INVALID_WEBHOOK_PAYLOAD, details = {}) {
        super(message, ERROR_TYPES.WEBHOOK, code, 400, details);
    }
}

/**
 * Error de configuración
 */
class ConfigError extends AppError {
    constructor(message, code = ERROR_CODES.MISSING_CONFIG, details = {}) {
        super(message, ERROR_TYPES.CONFIG, code, 500, details);
    }
}

/**
 * Manejador centralizado de errores
 */
class ErrorHandler {
    /**
     * Maneja errores de WhatsApp API
     */
    static handleWhatsAppError(error, context = {}) {
        const { response } = error;
        
        if (response?.data?.error) {
            const fbError = response.data.error;
            
            // Mapear errores específicos de Facebook/WhatsApp
            let code = ERROR_CODES.WHATSAPP_API_ERROR;
            let message = fbError.message || 'Error de WhatsApp API';
            
            switch (fbError.code) {
                case 100:
                    code = ERROR_CODES.INVALID_ACCESS_TOKEN;
                    message = 'Access token inválido o expirado';
                    break;
                case 131056:
                    code = ERROR_CODES.INVALID_PHONE_NUMBER;
                    message = 'Número de teléfono inválido';
                    break;
                case 80007:
                    code = ERROR_CODES.MESSAGE_SEND_FAILED;
                    message = 'No se pudo enviar el mensaje';
                    break;
            }
            
            return new ApiError(message, 'WhatsApp', response.status, {
                facebookError: fbError,
                ...context
            });
        }
        
        return new ApiError(
            error.message || 'Error de conexión con WhatsApp API',
            'WhatsApp',
            error.response?.status || 500,
            context
        );
    }
    
    /**
     * Maneja errores de Instagram API
     */
    static handleInstagramError(error, context = {}) {
        return new ApiError(
            error.message || 'Error de Instagram API',
            'Instagram',
            error.response?.status || 500,
            context
        );
    }
    
    /**
     * Maneja errores de Tienda Nube API
     */
    static handleTiendaNubeError(error, context = {}) {
        return new ApiError(
            error.message || 'Error de Tienda Nube API',
            'TiendaNube',
            error.response?.status || 500,
            context
        );
    }
    
    /**
     * Convierte errores genéricos a AppError
     */
    static normalizeError(error, context = {}) {
        if (error instanceof AppError) {
            return error;
        }
        
        // Error de validación de Joi, express-validator, etc.
        if (error.name === 'ValidationError' || error.isJoi) {
            return new ValidationError(error.message, { originalError: error.details });
        }
        
        // Error de red/timeout
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return new AppError(
                'Error de conexión de red',
                ERROR_TYPES.NETWORK,
                ERROR_CODES.CONNECTION_FAILED,
                503,
                { originalCode: error.code, ...context }
            );
        }
        
        // Error genérico
        return new AppError(
            error.message || 'Error interno del servidor',
            ERROR_TYPES.INTERNAL,
            ERROR_CODES.UNEXPECTED_ERROR,
            500,
            { stack: error.stack, ...context }
        );
    }
    
    /**
     * Middleware de manejo de errores para Express
     */
    static middleware() {
        return (error, req, res, next) => {
            const normalizedError = ErrorHandler.normalizeError(error, {
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            // Log del error
            const logLevel = normalizedError.statusCode >= 500 ? 'error' : 'warn';
            logger[logLevel](`${normalizedError.type}: ${normalizedError.message}`, {
                error: normalizedError.toJSON(),
                request: {
                    url: req.originalUrl,
                    method: req.method,
                    body: req.body,
                    query: req.query
                }
            });
            
            // Respuesta al cliente
            const response = {
                success: false,
                error: normalizedError.message,
                code: normalizedError.code,
                timestamp: normalizedError.timestamp
            };
            
            // En desarrollo, incluir detalles adicionales
            if (process.env.NODE_ENV === 'development') {
                response.details = normalizedError.details;
                response.stack = normalizedError.stack;
            }
            
            res.status(normalizedError.statusCode).json(response);
        };
    }
    
    /**
     * Wrapper para funciones async que maneja errores automáticamente
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
    
    /**
     * Wrapper para llamadas a APIs externas
     */
    static async apiCall(apiFunction, apiName, context = {}) {
        try {
            return await apiFunction();
        } catch (error) {
            switch (apiName.toLowerCase()) {
                case 'whatsapp':
                    throw ErrorHandler.handleWhatsAppError(error, context);
                case 'instagram':
                    throw ErrorHandler.handleInstagramError(error, context);
                case 'tiendanube':
                    throw ErrorHandler.handleTiendaNubeError(error, context);
                default:
                    throw ErrorHandler.normalizeError(error, context);
            }
        }
    }
}

/**
 * Funciones helper para crear errores específicos
 */
const createError = {
    validation: (message, details) => new ValidationError(message, details),
    auth: (message, code) => new AuthError(message, code),
    webhook: (message, code) => new WebhookError(message, code),
    config: (message, code) => new ConfigError(message, code),
    api: (message, apiName, statusCode, details) => new ApiError(message, apiName, statusCode, details)
};

module.exports = {
    AppError,
    ValidationError,
    ApiError,
    AuthError,
    WebhookError,
    ConfigError,
    ErrorHandler,
    createError,
    ERROR_TYPES,
    ERROR_CODES
};
