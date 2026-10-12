# therodrigo.com — Contexto del Proyecto

> Última verificación en vivo en VPS: **2026-10-06**. Servidor VPS activo, sitio en producción detrás de Cloudflare. Se toma el VPS como la única fuente de verdad (Single Source of Truth).

---

## 1. Qué es

Portafolio y panel de telemetría de sistemas de **Luis Rodrigo García Hernández**. Diseñado para presentación profesional y búsqueda laboral: muestra quién es, su trayectoria en soporte e ingeniería de infraestructura/open-source compliance, telemetría en tiempo real de su infraestructura y accesos directos a otros servicios y herramientas alojadas en el mismo servidor VPS.

- **Producción:** `https://therodrigo.com` (detrás del proxy de Cloudflare, SSL de extremo a extremo).
- **Idioma del sitio:** Inglés.
- **Referencias visuales y UI:** `justiin.de` (estructura, secciones numeradas, nav flotante) y `ezgclan.eu` (selector de 6 temas, diseño de tarjetas modulares).

---

## 2. Stack y Arquitectura

Express 5 + EJS + CSS/JS vanilla sin build tools ni transpiladores. Dependencias cliente limitadas a Font Awesome y Google Fonts por CDN.

```text
/var/www/my-portfolio/
├── app.js                   # Rutas y controladores Express. Cero contenido hardcodeado.
├── data/
│   ├── profile.js           # TODO el contenido del sitio (textos, hardware, flota, proyectos).
│   └── profile.js.bak       # Respaldo previo.
├── views/
│   ├── index.ejs            # Esqueleto principal; orquesta los partials, botón scroll-top y HUD toast.
│   └── partials/
│       ├── head.ejs         # Metadatos SEO, OpenGraph, JSON-LD Schema, Google Site Verification, CSS/JS v=19.
│       ├── nav.ejs          # Navegación flotante y selector de temas.
│       ├── hero.ejs         # Cabecera y Consola CLI interactiva estilo Debian 13 (Trixie).
│       ├── marquee.ejs      # Marquee infinito de tecnologías y herramientas.
│       ├── fleet.ejs        # Telemetría de la flota de servidores (gráficas RRD y contadores animados).
│       ├── infra.ejs        # Especificaciones del VPS host y PC local.
│       ├── career.ejs       # Línea de tiempo laboral con toggle "Load more".
│       ├── wins.ejs         # Logros recientes y Hub de Proyectos con botones "Technical Deep Dive".
│       ├── tech-modal.ejs   # Modal de desglose arquitectónico / write-ups de proyectos con pestañas.
│       ├── offduty.ejs      # Pasatiempos, mascotas y telemetría de Steam.
│       └── footer.ejs       # Terminal con comando uptime, botón de copiado de email, accesibilidad y copyright.
├── public/
│   ├── robots.txt           # Configuración de rastreo (deshabilita /api/ y /Appointment_Checker).
│   ├── sitemap.xml          # Mapa del sitio canónico (lastmod: 2026-10-03).
│   ├── css/
│   │   └── style.css        # Sistema de diseño, 6 temas vía [data-theme], CSS variables responsivas (v=19).
│   └── js/
│       └── main.js          # Módulos interactivos clientes (sin inline scripts, v=19).
├── .env                     # STEAM_API_KEY, STEAM_ID (Secreto en producción, nunca compartir).
├── .env.example             # Plantilla de variables de entorno.
└── package.json             # Express 5.2.1, EJS 6.0.1, Dotenv 17.4.2 (Node 22 LTS).
```

### Secciones de la página
`01 About` · `02 The Fleet` · `03 Infrastructure` · `04 Career` · `05 Wins & Projects` · `06 Off Duty`

### Módulos interactivos en `public/js/main.js`
1. **Selector de temas:** 6 temas (`solid-black`, `dark`, `light`, `neon`, `forest`, `ocean`) persistidos en `localStorage`.
2. **Copiado de código de descuento:** Copia el cupón `Bombiux` y abre ZAP-Hosting en pestaña nueva.
3. **Timeline "Load more":** Despliega experiencias laborales anteriores ocultas.
4. **Terminal interactiva en footer:** Ejecuta `uptime` real del servidor vía `/api/uptime`.
5. **Copiado de email al portapapeles:** Botón `#copy-email` con feedback visual dinámico (ícono de check).
6. **Refresco de gráficas RRD:** Actualización cada 60s con cache-buster `?t=timestamp`.
7. **Telemetría de Steam:** Ingesta de `/api/game-activity` sanitizada con `textContent` y creación de nodos DOM (cero `innerHTML`).
8. **Animaciones al scroll:** Squash & stretch con IntersectionObserver.
9. **Scrollspy:** Marca con `aria-current` la sección activa según la posición de lectura (30% viewport).
10. **Boot screen terminal:** Pantalla retro de bienvenida "WELCOME" (se ejecuta 1 vez por sesión vía `sessionStorage`, omitida si `prefers-reduced-motion`).
11. **Océano Cibernético de Mantarrayas (Perspectiva 3/4) y Cardúmenes ("Swarm"):** Sistema ambiental en `#stingray-ocean` con mantarrayas SVG en perspectiva 3/4 con ondulación biológica de aletas y cardúmenes dinámicos (automáticos cada 55s o disparados por comandos/clic).
12. **Consola Interactiva Debian 13 (Trixie) en Hero:** CLI inspirado en Linux/Debian 13 con barra `tmux`, prompt de Bash y comandos híbridos reales y simulados (`help`, `whoami`, `skills`, `fleet`, `vps`, `projects`, `uptime`, `steam`, `ping`, `swarm`, `feed-stingray`, `neofetch`, `zap`, `clear`).
13. **HUD de Telemetría Persistente (Esquina Inferior Izquierda):** Píldora discreta `#hud-telemetry` con baliza sonar animada y latencia en vivo (`0.8ms`), balanceada con el botón Back-to-Top.
14. **Technical Deep Dive Modals:** Sistema accesible de write-ups técnicos (`<dialog>`) con 4 pestañas (Overview, Diagrama de Arquitectura ASCII/Topology, Snippets con copiado y Outcomes).
15. **Contadores Numéricos Animados:** Animación suave de conteo progresivo al scroll (`IntersectionObserver` con curva cúbica).
16. **Botón Flotante Back-to-Top:** Botón circular con anillo de progreso SVG (`stroke-dashoffset`) que mide el avance de lectura en tiempo real.
17. **HUD Toast Notification:** Alertas no intrusivas en pantalla para feedback de comandos y acciones.

---

## 3. Endpoints del Portafolio

| Ruta | Método | Descripción |
|---|---|---|
| `/` | `GET` | Renderiza `views/index.ejs` con la data de `data/profile.js`. |
| `/api/graphs/latency/:serverId` | `GET` | Genera PNG al vuelo con `rrdtool` desde `/var/lib/rrd/`. Valida `:serverId` contra `allowedServers` (prevención de command injection). Si no hay RRD, devuelve SVG placeholder. Caché: `public, max-age=60`. |
| `/api/uptime` | `GET` | Ejecuta `uptime -p` y `uptime` en Debian de forma segura. Devuelve JSON `{ pretty, load, host }`. Caché: `no-store`. |
| `/api/game-activity` | `GET` | Consulta Steam Web API (recientes, total acumulado, pile of shame, top 5, logros). |

---

## 4. Infraestructura del Servidor VPS

- **Proveedor:** ZAP-Hosting.
- **IP:** `5.175.184.107` (Conexión SSH directa por IP; el dominio está detrás de Cloudflare y el puerto 22 no pasa por el proxy).
- **Autenticación SSH:** Llave SSH autorizada para `root` (`~/.ssh/`).
- **Sistema Operativo:** Debian 13 (Trixie) x86_64, Kernel `6.12.101+deb13-amd64`.
- **Hostname:** `white-stingray-87538`.
- **Recursos:** 4 vCPUs, 8 GB RAM (~600 MB en uso, ~7.2 GB disponibles), 25 GB SSD (9.5 GB usados, 41%).
- **Node.js:** `v22.23.2` / npm `10.9.8`.

### Procesos bajo PM2
- **`portfolio` (ID 0):** `/var/www/my-portfolio/app.js` en puerto **3000** (2 días uptime, modo fork, producción).
- **`preswin` (ID 1):** `/var/www/preswin` en puerto **4000** (modo fork, producción).

### Otros servicios activos en el VPS
- **Appointment Checker:** Demonio Python en `/opt/cita-control/app.py` escuchando en `127.0.0.1:8090`.
- **TotiMigraciones:** Aplicación Node en `/var/www/totimigraciones` en puerto **3001** (`https://totimigracion.es`).
- **Cron de telemetría:** `/usr/local/bin/ping_monitor.sh` ejecutado cada minuto por `cron`, alimentando los archivos RRD en `/var/lib/rrd/`:
  - `node-deb-01_ping.rrd` (127.0.0.1)
  - `node-win-01_ping.rrd` (194.156.90.100)
  - `node-win-02_ping.rrd` (194.156.90.101)
  - `node-win-03_ping.rrd` (194.156.90.103)

### Nginx (Reverse Proxy & Caché)
Configurado en `/etc/nginx/sites-available/default`:
- Redirección 301 de HTTP a HTTPS y de `www.therodrigo.com` a `therodrigo.com`.
- Certificados SSL emitidos por Let's Encrypt (`/etc/letsencrypt/live/therodrigo.com/`, ECDSA, vigentes hasta finales de diciembre de 2026).
- **Caché estática agressiva en Nginx:** 
  `location ~* \.(jpg|jpeg|png|gif|ico|webp|svg|css|js|woff|woff2|ttf)$` sirve directamente desde `/var/www/my-portfolio/public` con cabecera `expires 30d; Cache-Control: "public, no-transform"`.
  > **IMPORTANTE:** Cualquier cambio en CSS o JS requiere forzosamente actualizar la versión del query string (`?v=N`) en `views/partials/head.ejs` para evitar que Nginx, Cloudflare o el navegador sirvan la versión anterior.
- Servido directo de `/robots.txt` y `/sitemap.xml` desde `/var/www/my-portfolio/public`.
- Proxy para `/Appointment_Checker` -> `http://127.0.0.1:8090`.
- Proxy para `/preswin` -> `http://127.0.0.1:4000` (con WebSockets y `client_max_body_size 50M`).
- Proxy raíz `/` -> `http://127.0.0.1:3000` (aplicación portfolio).

---

## 5. Cambios y Novedades Recientes Detectados en el Servidor (Octubre 2026)

1. **Lanzamiento de PresWin en producción:**
   - La tarjeta anterior "Script Vault" (que estaba en estado `SOON` sin enlace) fue reemplazada en `data/profile.js` por:
     - **Título:** "Construction Cost Estimator"
     - **Descripción:** "Web-based construction budgeting & unit price estimation suite with automated material explosion breakdown."
     - **Icono:** `fa-solid fa-calculator`
     - **Enlace:** `/preswin`
     - **Estado:** `LIVE`
   - La aplicación está desplegada en `/var/www/preswin`, corriendo en el puerto 4000 vía PM2 (`preswin`) y ruteada a través de Nginx en `/preswin`.
2. **Integración del script Appointment Checker:**
   - Documentado en los logros recientes (`lastWins`) de `data/profile.js` como desarrollo 2026.
   - Corriendo como servicio en puerto 8090 y mapeado en Nginx bajo `/Appointment_Checker`.
   - Excluido de indexación en `public/robots.txt`.
3. **Optimización SEO y Structured Data:**
   - Creación de `public/robots.txt` y `public/sitemap.xml` con `<lastmod>2026-10-03</lastmod>`.
   - Agregada etiqueta de verificación de Google: `vM-EAhqlbLq2IoMQh6qRO3Clz16tF7bSPDd6wT1LF4c` en `head.ejs`.
   - Schema.org JSON-LD estructurado para `Person` y `ProfilePage` en `head.ejs`.
   - Etiquetas canónicas, OpenGraph y Twitter Cards completas.
4. **Mejoras de interacción en el Footer:**
   - Agregado botón de copiado rápido de correo (`#copy-email`) con feedback en portapapeles.

---

## 6. Trampas Conocidas y Reglas Operativas

1. **Caché en Node.js:**
   - `data/profile.js` se carga en memoria al iniciar la aplicación Express. Cualquier cambio en textos, proyectos o datos requiere reiniciar el proceso con `pm2 restart portfolio`.
2. **Versionado de Assets (`?v=14`):**
   - Nginx tiene configurado `expires 30d` para `.css` y `.js`, además del caché en los bordes de Cloudflare. Si se modifica `style.css` o `main.js`, **es mandatorio incrementar la versión en `views/partials/head.ejs`** (por ejemplo, a `v=15`).
3. **Gráficas RRD & Autoscale:**
   - Los pings entre nodos del mismo datacenter son de sub-milisegundo (0.05ms - 1.3ms). `rrdtool` utiliza `--alt-autoscale-max` y omite valores mayores a 200ms como `UNKN` (pérdida de paquetes). Nunca configurar un eje de escala fija en milisegundos.
4. **Control de versiones:**
   - No existe repositorio git local ni remoto en el VPS (`.git` ausente). Todo cambio en el servidor debe gestionarse con respaldos previos antes de editar.

## 7. Estado de Pendientes y Últimos Despliegues

1. **Horno 7 — JDE Inspection & CAM Suite (Desplegado en Producción - Octubre 2026):**
   - Reemplazó la tarjeta `FOSSology Scanner` en `data/profile.js` y el modal `Technical Deep Dive`.
   - Estado: `LIVE` con enlace directo `/horno7`.
   - Aplicación desplegada en `/var/www/my-portfolio/public/horno7/` accesible vía `https://therodrigo.com/horno7`.
   - Incluye simulador de App Móvil en split-screen, Dashboard de Jefatura, Catálogo Maestro F1201 (591 equipos) y simulador de payload JSON para JD Edwards Orchestrator / Tablas Z.
2. **Enlace de afiliado ZAP:** Abre la página principal de ZAP-Hosting con cupón `Bombiux`.
3. **Seguridad:** Mantener la recomendación de rotar la clave de root y desactivar el acceso por contraseña en `/etc/ssh/sshd_config` (`PasswordAuthentication no`), operando exclusivamente mediante llaves SSH.

