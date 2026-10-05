# Zeroed Landing

Proyecto independiente de inscripción a la beta cerrada. No importa código del
juego ni necesita que exista el checkout de Zeroed. Incluye HTML/CSS/TypeScript,
Vite y una función Node para enviar las solicitudes a biel40aws@gmail.com.

La página `agradecimientos.html` contiene la dedicatoria a los participantes de
las pruebas internas y la beta cerrada; se enlaza desde el final de la landing
y el pie de página, y comparte estilos y efecto de brasas con la portada.

## Desarrollo y validación

Requiere Node 20.19+ o 22.12+.

```powershell
npm ci
npm run dev
npm run typecheck
npm run build
npm test
```

Abre http://127.0.0.1:4174/. El servidor de desarrollo sirve también /api/beta.
Sin credenciales devuelve 503 y el formulario explica que las inscripciones no
están abiertas. Las pruebas de correo usan un envío simulado; no envían mensajes.
`npm run preview` sirve solo los archivos compilados, sin la API local.

## Correo y despliegue

1. Crea una contraseña de aplicación en la cuenta biel40aws@gmail.com, con
   verificación en dos pasos. No uses ni compartas la contraseña habitual.
2. En un proyecto Vercel independiente, configura BETA_GMAIL_APP_PASSWORD como
   variable privada del servidor y BETA_SITE_ORIGIN con el origen público exacto
   (sin barra final). Nunca añadas el prefijo VITE_ a la contraseña.
3. Usa `npm run build`, salida `dist`, y la función `api/beta.mjs`. Publicar solo
   los archivos estáticos no habilita el envío de correo.
4. Ajusta canonical, og:url y og:image de `index.html` al dominio elegido. La
   landing se sirve en la raíz de su propio proyecto. Elegir dominio, subdominio
   o enrutamiento bajo zeroed.es es un paso de publicación independiente; esta
   separación no cambia DNS ni el alojamiento actual del juego.
5. Envía una solicitud real y comprueba Gmail, spam y la dirección de respuesta
   antes de promocionar el enlace en Instagram.

Para probar correo local, copia `.env.example` a `.env.local` y configura allí
la contraseña. El origen local predeterminado es http://127.0.0.1:4174. Si cambias
el origen o el puerto, ajusta BETA_SITE_ORIGIN. Los secretos no se compilan en
el frontend. El destino y remitente están fijados al Gmail de Biel40.

La confirmación indica aceptación SMTP, no entrega final en la bandeja de
entrada. No se envía confirmación al solicitante ni se crea base de datos: el
buzón contiene las solicitudes y su consentimiento. La gestión de invitaciones
y eliminación es manual. Gmail puede limitar envíos o rechazar conexiones.

El endpoint valida origen, método, tipo y tamaño del contenido, email,
consentimiento y campo trampa. El campo trampa es protección básica, no CAPTCHA
ni límite de envíos. El aviso de privacidad corresponde exclusivamente a la
landing y está en `public/privacy.html`.

## Captura y vídeo

Guarda los archivos en `public/assets/beta/` y configura antes de compilar:

```dotenv
VITE_BETA_POSTER_URL=/assets/beta/burned-mansion.webp
VITE_BETA_VIDEO_URL=/assets/beta/gameplay.mp4
```

Usa una captura comprimida y un clip corto sin audio. El fondo funciona sin
medios ni autoplay. Ahorro de datos y movimiento reducido conservan la captura;
hay un control de pausa. Los iconos incluidos son copias propias de la marca,
sin referencias al checkout del juego.
