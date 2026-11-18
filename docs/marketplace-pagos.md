# Pagos del marketplace AURUM LAB

## Estado

Integración inicial de Checkout Pro de Mercado Pago para cobros centralizados. La plataforma cobra al comprador; la comisión y la parte atribuible al vendedor quedan registradas en `compras_archivos_digitales`. Esta versión **no transfiere automáticamente fondos a los vendedores** ni prueba que la cuenta comercial esté aprobada para producción.

## Orden de configuración

1. Ejecutar manualmente `supabase/sql/20261028_marketplace_pagos_centralizados.sql` en el SQL Editor de Lovable Cloud.
2. En Lovable Cloud, configurar los secretos de las Edge Functions:
   - `MP_ACCESS_TOKEN`: Access Token de la aplicación Mercado Pago. Para pruebas, usar credencial de prueba; para producción, usar la credencial productiva.
   - `MP_WEBHOOK_SECRET`: clave secreta de firma de Webhooks creada en Mercado Pago > Tus integraciones > Webhooks.
   - `APP_BASE_URL`: `https://www.tallerdeljoyero.com` (o el dominio canónico aprobado que se use en producción).
3. Desplegar las Edge Functions `marketplace-iniciar-pago` y `marketplace-pago-webhook` desde Lovable Cloud.
4. En Mercado Pago, configurar el evento **Pagos** para esta URL HTTPS:
   `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/marketplace-pago-webhook`
   El ref debe ser el proyecto realmente conectado a Lovable Cloud; no se debe adivinar ni copiar el identificador local de `supabase/config.toml`.
5. Probar primero con credenciales de prueba y una cuenta compradora/vendedora de prueba. Verificar el checkout, notificación firmada, estado `pagado`, descarga desde Mis compras y que una notificación falsa no habilite la descarga.
6. Solo después de pruebas satisfactorias, cambiar a credenciales productivas y URL de webhook productiva.

## Reglas y limitaciones actuales

- El comprador debe iniciar sesión.
- El servidor obtiene el precio y vendedor desde la publicación en estado `publicado`; no confía en el precio enviado por el navegador.
- No se permite comprar la propia publicación.
- Solo se inicia checkout para precios en PEN. Los listados en USD siguen visibles, pero la compra está deshabilitada hasta definir conversión y moneda de cobro.
- El webhook verifica firma, consulta el pago a Mercado Pago y compara referencia, importe y moneda antes de marcar la compra como pagada.
- La descarga sigue dependiendo de `estado_pago = 'pagado'`.
- La comisión es 20% del importe bruto; el importe del vendedor se registra como 80% antes de costos de procesamiento, impuestos, reembolsos o contracargos.
- No existe todavía panel de liquidación ni transferencia de fondos al vendedor. El pago al vendedor deberá realizarse mediante un proceso financiero definido y conciliado, y validarse con asesoría contable/legal aplicable en Perú.
- Las credenciales privadas no deben guardarse en el repositorio ni en variables públicas del frontend.
