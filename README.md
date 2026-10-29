# Competencia Bíblica — IBCJ 2026

![Banner](https://img.shields.io/badge/Estado-Producci%C3%B3n-success?style=for-the-badge) ![Versión](https://img.shields.io/badge/Versi%C3%B3n-3.0.0-blue?style=for-the-badge) ![PWA](https://img.shields.io/badge/PWA-Ready-f59e0b?style=for-the-badge)

Una **Progressive Web App (PWA)** diseñada para que los jóvenes de la Iglesia Bautista Cristo Jesús (IBCJ) puedan estudiar y prepararse de forma interactiva y desde cualquier dispositivo. Tiene dos apartados:

*   **Jóvenes Involucrados:** las preguntas del retiro "Jóvenes Involucrados 2026".
*   **Competencia IBCJ:** las 99 preguntas de la competencia bíblica (con su cita RVR1960) y el juego **Dígalo como pueda**, con 159 temas (personajes, lugares y objetos), cronómetro configurable y alarma al terminar el tiempo.

## 🚀 Características Principales

*   **100% Offline (PWA):** Una vez que abres la página por primera vez, puedes desconectarte de internet o instalarla en tu celular/computadora y funcionará perfectamente sin consumir datos gracias al Service Worker.
*   **Modo de Autoevaluación:** Responde mentalmente las preguntas, verifica la respuesta correcta y marca si la sabías ("Lo sabía" / "No lo sabía").
*   **Algoritmo de Errores (Repaso Inteligente):** Las preguntas que marques como "No lo sabía" se enviarán automáticamente a una categoría especial llamada **Preguntas para Repasar**, manteniendo su categoría original para que puedas enfocarte en tus puntos débiles.
*   **Modo Listado y Búsqueda:** Una pantalla dedicada para leer todas las 152 preguntas de corrido, con un buscador en tiempo real para encontrar rápidamente por palabras clave o lección, separado por pestañas temáticas.
*   **Guardado Automático de Progreso:** La aplicación guarda tu avance localmente. Puedes cerrar la app y al volver retomarás exactamente en la pregunta donde te quedaste.
*   **Sistema de Rachas (Streaks) 🔥:** Registra cuántos días consecutivos has entrado a estudiar para mantenerte motivado.
*   **Dígalo como pueda ⏱️:** Sale un tema al azar con una pista de contexto; el cronómetro (30 s, 45 s, 1 min o 1:30) se inicia con un botón, avisa con tics en los últimos 5 segundos y suena una alarma al llegar a cero. Los temas no se repiten hasta que salgan todos.
*   **Feedback Visual Animado:** Anillo circular de puntaje al completar categorías y lluvia de confetti animado al terminar el repaso de una sección.

## 🗂️ Categorías de Estudio

**Jóvenes Involucrados** (`questions.js`) contiene 152 preguntas divididas en:
*   📖 **Hora Silenciosa** (28 preguntas)
*   ✝️ **Discipulado** (50 preguntas)
*   📜 **Memorización (Versículos)** (14 preguntas)
*   📚 **Lecciones** (60 preguntas)

**Competencia IBCJ** (`competencia.js`):
*   ❓ **Preguntas** (99 preguntas con cita bíblica)
*   ⏱️ **Dígalo como pueda** (159 temas: 96 personajes y grupos, 32 lugares, 31 objetos)

## 🛠️ Tecnologías Usadas

El proyecto está construido 100% con tecnologías web estándar (Vanilla Web Stack) enfocándose en un alto rendimiento y ligereza, con una estética **Premium Glassmorphism**, sin usar frameworks pesados:
*   **HTML5** (Semántico)
*   **CSS3** (Variables nativas, animaciones `@keyframes`, diseño Glassmorphism).
*   **JavaScript (ES6+)** (Lógica de estado y manipulación del DOM).
*   **Service Workers & Manifest** (PWA Offline-First).

## 💻 Desarrollo Local

Si deseas correr este proyecto en tu propia computadora o hacer modificaciones, solo necesitas un servidor web estático básico.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Claudiobeltre/jovenes-involucrados-2025.git
   cd jovenes-involucrados-2025
   ```

2. Inicia un servidor HTTP local. Si tienes Python instalado, puedes usar:
   ```bash
   python -m http.server 8080
   ```
   *(También puedes usar extensiones como "Live Server" de VSCode).*

3. Abre tu navegador en `http://localhost:8080`.

**Nota sobre PWA en desarrollo:** Los Service Workers almacenan fuertemente en caché los archivos locales. Si haces cambios en `app.js` o `styles.css` y no se reflejan, abre las Herramientas de Desarrollo (F12) -> Pestaña *Application* -> *Service Workers* y haz clic en *Unregister*, o incrementa la versión de `CACHE_NAME` en `sw.js`.

---
*Proyecto desarrollado para facilitar el estudio de la palabra a los jóvenes IBCJ.*
