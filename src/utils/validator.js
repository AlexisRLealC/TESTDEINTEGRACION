// ===================================================================
// VALIDATION SYSTEM - Input Validation for MVP
// ===================================================================
// Sistema de validación de entrada siguiendo principios MVP

const { logger } = require('./logger');

/**
 * Expresiones regulares para validaciones comunes
 */
const REGEX_PATTERNS = {
    PHONE: /^[1-9]\d{1,14}$/, // E.164 format without +
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/.+/,
    WHATSAPP_MESSAGE_ID: /^wamid\..+/,
    FACEBOOK_ID: /^\d+$/,
    ACCESS_TOKEN: /^[A-Za-z0-9_-]+$/
};

/**
 * Tipos de datos soportados
 */
const DATA_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    OBJECT: 'object'
};

/**
 * Validador principal para el MVP
 */
class Validator {
    constructor() {
        this.errors = [];
    }
    
    /**
     * Reinicia los errores de validación
     */
    reset() {
        this.errors = [];
        return this;
    }
    
    /**
     * Agrega un error de validación
     */
    addError(field, message) {
        this.errors.push({ field, message });
        return this;
    }
    
    /**
     * Verifica si hay errores
     */
    hasErrors() {
        return this.errors.length > 0;
    }
    
    /**
     * Obtiene todos los errores
     */
    getErrors() {
        return this.errors;
    }
    
    /**
     * Obtiene el primer error
     */
    getFirstError() {
        return this.errors[0] || null;
    }
    
    /**
     * Valida que un campo sea requerido
     */
    required(value, field) {
        if (value === undefined || value === null || value === '') {
            this.addError(field, `${field} es requerido`);
        }
        return this;
    }
    
    /**
     * Valida el tipo de dato
     */
    type(value, expectedType, field) {
        if (value === undefined || value === null) return this;
        
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== expectedType) {
            this.addError(field, `${field} debe ser de tipo ${expectedType}, recibido ${actualType}`);
        }
        return this;
    }
    
    /**
     * Valida longitud mínima
     */
    minLength(value, min, field) {
        if (value && value.length < min) {
            this.addError(field, `${field} debe tener al menos ${min} caracteres`);
        }
        return this;
    }
    
    /**
     * Valida longitud máxima
     */
    maxLength(value, max, field) {
        if (value && value.length > max) {
            this.addError(field, `${field} no puede tener más de ${max} caracteres`);
        }
        return this;
    }
    
    /**
     * Valida número de teléfono
     */
    phone(value, field) {
        if (value && !REGEX_PATTERNS.PHONE.test(value)) {
            this.addError(field, `${field} debe ser un número de teléfono válido (formato: 5491123456789)`);
        }
        return this;
    }
    
    /**
     * Valida email
     */
    email(value, field) {
        if (value && !REGEX_PATTERNS.EMAIL.test(value)) {
            this.addError(field, `${field} debe ser un email válido`);
        }
        return this;
    }
    
    /**
     * Valida URL
     */
    url(value, field) {
        if (value && !REGEX_PATTERNS.URL.test(value)) {
            this.addError(field, `${field} debe ser una URL válida (http/https)`);
        }
        return this;
    }
    
    /**
     * Valida access token
     */
    accessToken(value, field) {
        if (value && !REGEX_PATTERNS.ACCESS_TOKEN.test(value)) {
            this.addError(field, `${field} debe ser un access token válido`);
        }
        return this;
    }
    
    /**
     * Valida message ID de WhatsApp
     */
    whatsappMessageId(value, field) {
        if (value && !REGEX_PATTERNS.WHATSAPP_MESSAGE_ID.test(value)) {
            this.addError(field, `${field} debe ser un message ID válido de WhatsApp`);
        }
        return this;
    }
    
    /**
     * Valida que el valor esté en una lista de opciones
     */
    oneOf(value, options, field) {
        if (value && !options.includes(value)) {
            this.addError(field, `${field} debe ser uno de: ${options.join(', ')}`);
        }
        return this;
    }
    
    /**
     * Valida un objeto con esquema
     */
    schema(obj, schema, prefix = '') {
        if (!obj || typeof obj !== 'object') {
            this.addError(prefix || 'object', 'Debe ser un objeto válido');
            return this;
        }
        
        Object.keys(schema).forEach(key => {
            const fieldName = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            const rules = schema[key];
            
            // Aplicar reglas de validación
            if (rules.required) {
                this.required(value, fieldName);
            }
            
            if (rules.type) {
                this.type(value, rules.type, fieldName);
            }
            
            if (rules.minLength) {
                this.minLength(value, rules.minLength, fieldName);
            }
            
            if (rules.maxLength) {
                this.maxLength(value, rules.maxLength, fieldName);
            }
            
            if (rules.phone) {
                this.phone(value, fieldName);
            }
            
            if (rules.email) {
                this.email(value, fieldName);
            }
            
            if (rules.url) {
                this.url(value, fieldName);
            }
            
            if (rules.accessToken) {
                this.accessToken(value, fieldName);
            }
            
            if (rules.whatsappMessageId) {
                this.whatsappMessageId(value, fieldName);
            }
            
            if (rules.oneOf) {
                this.oneOf(value, rules.oneOf, fieldName);
            }
            
            if (rules.custom && typeof rules.custom === 'function') {
                const customResult = rules.custom(value);
                if (customResult !== true) {
                    this.addError(fieldName, customResult);
                }
            }
        });
        
        return this;
    }
}

/**
 * Esquemas de validación para endpoints del MVP
 */
const SCHEMAS = {
    // WhatsApp Text Message
    whatsappTextMessage: {
        access_token: { required: true, type: 'string', accessToken: true },
        phone_number_id: { required: true, type: 'string' },
        to: { required: true, type: 'string', phone: true },
        message_text: { required: true, type: 'string', minLength: 1, maxLength: 4096 }
    },
    
    // WhatsApp Image Message
    whatsappImageMessage: {
        access_token: { required: true, type: 'string', accessToken: true },
        phone_number_id: { required: true, type: 'string' },
        to: { required: true, type: 'string', phone: true },
        image_url: { required: true, type: 'string', url: true },
        caption: { type: 'string', maxLength: 1024 }
    },
    
    // WhatsApp Typing Indicator
    whatsappTyping: {
        access_token: { required: true, type: 'string', accessToken: true },
        phone_number_id: { required: true, type: 'string' },
        to: { required: true, type: 'string', phone: true }
    },
    
    // WhatsApp Mark Read
    whatsappMarkRead: {
        access_token: { required: true, type: 'string', accessToken: true },
        phone_number_id: { required: true, type: 'string' },
        message_id: { required: true, type: 'string', whatsappMessageId: true }
    },
    
    // Embedded Signup Data
    embeddedSignupData: {
        code: { required: true, type: 'string' },
        state: { type: 'string' }
    },
    
    // Instagram Auth
    instagramAuth: {
        code: { required: true, type: 'string' },
        state: { type: 'string' }
    },
    
    // Tienda Nube Auth
    tiendanubeAuth: {
        code: { required: true, type: 'string' },
        state: { type: 'string' }
    }
};

/**
 * Middleware de validación para Express
 */
const validateMiddleware = (schemaName) => {
    return (req, res, next) => {
        const schema = SCHEMAS[schemaName];
        if (!schema) {
            logger.error(`Schema de validación no encontrado: ${schemaName}`);
            return res.status(500).json({
                success: false,
                error: 'Error interno de validación'
            });
        }
        
        const validator = new Validator();
        const data = { ...req.body, ...req.query };
        
        validator.schema(data, schema);
        
        if (validator.hasErrors()) {
            const errors = validator.getErrors();
            logger.warn('Errores de validación', { 
                endpoint: req.originalUrl,
                errors 
            });
            
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors
            });
        }
        
        req.validatedData = data;
        next();
    };
};

/**
 * Función helper para validación manual
 */
const validate = (data, schemaName) => {
    const schema = SCHEMAS[schemaName];
    if (!schema) {
        throw new Error(`Schema de validación no encontrado: ${schemaName}`);
    }
    
    const validator = new Validator();
    validator.schema(data, schema);
    
    return {
        isValid: !validator.hasErrors(),
        errors: validator.getErrors(),
        firstError: validator.getFirstError()
    };
};

module.exports = {
    Validator,
    SCHEMAS,
    validateMiddleware,
    validate,
    REGEX_PATTERNS,
    DATA_TYPES
};
