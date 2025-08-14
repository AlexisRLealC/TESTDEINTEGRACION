// ===================================================================
// INSTAGRAM ID HELPER
// ===================================================================
// Helper para gestionar automáticamente el ID correcto de Instagram
// que se debe usar para mensajería (el que aparece en webhooks)

class InstagramIdHelper {
    constructor() {
        // Almacenar el ID correcto para mensajería
        this.correctMessagingId = null;
        this.lastUpdated = null;
        this.loginId = null; // ID obtenido del login (para referencia)
    }

    /**
     * Capturar el ID correcto desde los webhooks de Instagram
     * @param {string} webhookEntryId - ID que aparece en entry.id de webhooks
     */
    captureCorrectIdFromWebhook(webhookEntryId) {
        if (webhookEntryId && webhookEntryId !== this.correctMessagingId) {
            console.log('🎯 CAPTURANDO ID CORRECTO PARA MENSAJERÍA:');
            console.log(`   - ID anterior: ${this.correctMessagingId || 'ninguno'}`);
            console.log(`   - ID nuevo (de webhook): ${webhookEntryId}`);
            
            this.correctMessagingId = webhookEntryId;
            this.lastUpdated = new Date().toISOString();
            
            console.log('✅ ID correcto para mensajería actualizado');
        }
    }

    /**
     * Establecer el ID obtenido del login (para referencia)
     * @param {string} loginId - ID obtenido durante el login
     */
    setLoginId(loginId) {
        this.loginId = loginId;
        console.log(`📝 ID de login registrado: ${loginId}`);
    }

    /**
     * Obtener el ID correcto para enviar mensajes
     * @returns {string|null} ID correcto para mensajería
     */
    getCorrectMessagingId() {
        if (!this.correctMessagingId) {
            console.log('⚠️ ADVERTENCIA: No se ha capturado el ID correcto desde webhooks');
            console.log('   - Recomendación: Espera a recibir un webhook de Instagram primero');
            console.log('   - O usa el ID de login como fallback temporal');
            return this.loginId; // Fallback al ID de login
        }
        
        return this.correctMessagingId;
    }

    /**
     * Verificar si tenemos el ID correcto
     * @returns {boolean} true si tenemos el ID correcto
     */
    hasCorrectId() {
        return !!this.correctMessagingId;
    }

    /**
     * Obtener información completa sobre los IDs
     * @returns {object} Información detallada de los IDs
     */
    getIdInfo() {
        return {
            correctMessagingId: this.correctMessagingId,
            loginId: this.loginId,
            hasCorrectId: this.hasCorrectId(),
            lastUpdated: this.lastUpdated,
            recommendation: this.hasCorrectId() 
                ? `Usar ${this.correctMessagingId} para mensajería`
                : 'Esperar webhook para obtener ID correcto'
        };
    }

    /**
     * Forzar el uso de un ID específico (para casos especiales)
     * @param {string} forcedId - ID a usar forzadamente
     */
    forceMessagingId(forcedId) {
        console.log(`🔧 FORZANDO ID DE MENSAJERÍA: ${forcedId}`);
        this.correctMessagingId = forcedId;
        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Resetear el helper
     */
    reset() {
        this.correctMessagingId = null;
        this.loginId = null;
        this.lastUpdated = null;
        console.log('🔄 Instagram ID Helper reseteado');
    }
}

// Crear instancia singleton
const instagramIdHelper = new InstagramIdHelper();

module.exports = instagramIdHelper;
