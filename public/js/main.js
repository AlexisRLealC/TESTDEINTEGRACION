// ===================================================================
// TIENDA NUBE LOGIN - OAuth Integration
// ===================================================================
function launchTiendaNube() {
    console.log('🛍️ Iniciando instalación directa de Tienda Nube...');
    
    // Mostrar información del proceso
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="info-box">
            <h3>🛍️ Instalación Directa de Tienda Nube</h3>
            <p>Para instalar la aplicación, el cliente debe usar el siguiente enlace:</p>
            <p><strong>Método:</strong> Enlace de instalación directo</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #007bff;">
                <h4>🔗 Enlace de Instalación:</h4>
                <p><strong>Formato:</strong></p>
                <code style="background: #e9ecef; padding: 5px; border-radius: 3px; display: block; margin: 5px 0;">
                https://[NOMBRE_TIENDA].mitiendanube.com/admin/apps/21480/authorize
                </code>
                <p><strong>Ejemplo:</strong></p>
                <code style="background: #e9ecef; padding: 5px; border-radius: 3px; display: block; margin: 5px 0;">
                https://mitienda.mitiendanube.com/admin/apps/21480/authorize
                </code>
            </div>
            
            <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; color: #0c5460;">
                <p><strong>✨ Instalación Directa</strong></p>
                <p><strong>📋 Proceso:</strong> El cliente debe:</p>
                <ul style="text-align: left; margin: 5px 0;">
                    <li>Reemplazar [NOMBRE_TIENDA] con su dominio real</li>
                    <li>Abrir el enlace en su navegador</li>
                    <li>Estar logueado en su panel de Tienda Nube</li>
                    <li>Autorizar la aplicación</li>
                </ul>
            </div>
            
            <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; color: #856404;">
                <p><strong>⚠️ Importante:</strong></p>
                <ul style="text-align: left; margin: 5px 0;">
                    <li>Cada tienda tiene su propio dominio único</li>
                    <li>El cliente debe estar logueado en su tienda</li>
                    <li>Este es un enlace de aplicación privada</li>
                </ul>
            </div>
            
            <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0; color: #155724;">
                <p><strong>💡 Alternativa Recomendada:</strong></p>
                <p>Para un flujo más automático, usa el botón OAuth original que maneja todo automáticamente.</p>
                <button onclick="window.location.href='/tiendanube/auth'" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    🔄 Usar Flujo OAuth Automático
                </button>
            </div>
        </div>
    `;
    
    console.log('📋 Información de instalación mostrada al usuario');
}
