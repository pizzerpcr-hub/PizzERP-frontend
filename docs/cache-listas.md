# Memoria temporal de listas

`listasSesion.js` conserva listas y búsquedas en memoria de esta aplicación/pestaña,
no en localStorage ni en cookies. `useListaSesion` suscribe las páginas a esas listas.
La sesión la establece AuthContext después de restaurar/login y obtener permisos.

- Primera visita: consulta el recurso permitido; el cargador solo aparece sin datos.
- Volver antes de 60 segundos: muestra la lista guardada, sin otro GET.
- Volver con datos vencidos o invalidados: muestra los datos y actualiza en fondo.
- Página visible: respaldo cada 60 segundos. Foco/visibilidad comprueban sesión y
  permisos y refrescan datos vencidos; `online` también fuerza su reconciliación.
- Tras confirmar cuenta y permisos se precargan las listas permitidas una vez por
  sesión de memoria. La sección inicial (o la ruta restaurada) y su catálogo tienen
  prioridad; luego se procesan las demás con dos trabajadores como máximo. El panel
  no espera esa precarga. Navegar comparte la petición ya iniciada. No se consultan
  módulos denegados. Logout/cambio de cuenta cancelan solicitudes y la cola anterior.
- Solo las páginas/catálogos utilizados tienen observadores periódicos.
- GET idénticos comparten la petición en curso. Los endpoints de catálogos filtrados
  no se confunden con las listas completas: sus permisos y contenido son diferentes.
- Las verificaciones simultáneas de sesión/permisos comparten la promesa de AuthContext,
  sin almacenar una autorización para futuras solicitudes. La revisión de sesión de
  10 segundos existente se conserva. Laravel sigue autorizando cada petición.
- Una respuesta de mutación confirmada incorpora/reemplaza su fila. Categorías invalida
  productos, sus categorías asignables y combos; Productos invalida el conteo de categorías,
  combos y sus productos asignables; Roles invalida Usuarios y roles asignables.
  Solo se consultan esas dependencias cuando están en uso o al visitarlas.
- Los errores transitorios conservan la lista y permiten Reintentar. 401/403 retiran
  el recurso y solicitan revisión de sesión. Una revocación confirmada retira datos,
  búsquedas y catálogos que ya no están permitidos.
- Logout confirmado, revocación de sesión o cambio de cuenta vacían la memoria.
  Si logout falla no se afirma un cierre ni se vacía una sesión todavía válida.
- Versiones por recurso y por sesión impiden aplicar respuestas anteriores a una
  mutación, invalidación o cambio de cuenta. Los cambios optimistas de Usuarios y sus
  bloqueos sobreviven al desmontaje; un rechazo revierte la fila también en memoria.
  Solo se guardan los cinco campos públicos del usuario, nunca su contraseña/hash.

## Reverb

Actualmente solo existe la notificación privada `usuario.{id}` de estado de la propia
cuenta. Se conserva: su revocación limpia también estas listas. No existen eventos de
catálogo ni se ha reintroducido el canal general `usuarios`, retirado por seguridad.
Los cambios de otros usuarios se detectan por el respaldo, el foco y la reconexión;
no son instantáneos por WebSocket con la arquitectura actual.

## Comparación de peticiones

Antes, el código montaba y consultaba cada página en cada visita. Para dos vueltas
rápidas por los seis módulos con permisos de edición: 12 GET principales y 4 auxiliares
(roles asignables y categorías de producto), sin contar revisiones de sesión.
En la prueba aislada del navegador, la primera vuelta hizo 6 + 2 y la segunda 0:
8 frente a los 16 que requería el flujo anterior. Es una comparación de cantidades,
no una medición de latencia real de Supabase. No se hicieron escrituras reales.

En Network activar Preserve log y filtrar `/api/`; distinguir listas de `/api/user`
y `/api/permissions`. Navegar sin F5 dos veces entre secciones antes de 60 segundos;
los GET de listas no deben aumentar en la segunda vuelta. Esperar 60 segundos en una
página visible o recuperar conexión sí debe consultar, sin ocultar las filas ni el filtro.
Un F5 reinicia esta memoria y restaura sesión de forma normal.

Con precarga, una cuenta con acceso completo hace 9 GET de listas/catálogos durante
  el calentamiento (6 listas + 3 auxiliares). Una visita posterior antes del vencimiento
  hace 0 GET adicionales; navegar durante la precarga comparte el GET pendiente.
  No reduce los 9 recursos distintos: adelanta el trabajo sin bloquear el panel.
  Estas cantidades están comprobadas con loaders simulados; no representan tiempos
  medidos de Render/Supabase. La concurrencia se limita en la precarga, no en consultas
  explícitas de páginas que el usuario abra mientras hay otros recursos pendientes.

Los catálogos distinguen pendiente, respuesta exitosa vacía y error. Un refresh
  conserva opciones anteriores; no vuelve a mostrar carga inicial ni mensajes de
  catálogo vacío mientras todavía no se recibió una lista válida. Reintentar comparte
  la consulta en curso. El backend siempre vuelve a validar permiso y dependencias.

Verificación automatizada: `node --test tests/*.test.mjs`, `npm run lint`, `npm run build`.
Las pruebas de caché usan loaders/fetch simulados, nunca la base de datos.
