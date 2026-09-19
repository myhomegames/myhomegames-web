/**
 * Homepage i18n for MyHomeGames landing (docs/index.html).
 * Languages: en, it, es, de, fr, pt, ja, zh — resolved from browser language.
 */
(function (global) {
  "use strict";

  var SUPPORTED = ["en", "it", "es", "de", "fr", "pt", "ja", "zh"];
  var HTML_LANG = { en: "en", it: "it", es: "es", de: "de", fr: "fr", pt: "pt", ja: "ja", zh: "zh-CN" };
  var OG_LOCALE = { en: "en_US", it: "it_IT", es: "es_ES", de: "de_DE", fr: "fr_FR", pt: "pt_PT", ja: "ja_JP", zh: "zh_CN" };

  var TRANSLATIONS = {
  "en": {
    "title": "MyHomeGames — Self-Hosted Game Library & Collection Manager",
    "description": "MyHomeGames is a free, self-hosted catalog for your personal video game collection. Organize libraries, ratings, and IGDB metadata on Windows, macOS, and Linux. Not a game store or distributor.",
    "ogTitle": "MyHomeGames — Self-Hosted Game Library & Collection Manager",
    "ogDescription": "Free self-hosted catalog for your personal video game collection. Windows, macOS, and Linux. Organize games, ratings, and IGDB metadata — not a game store.",
    "ogImageAlt": "MyHomeGames — personal video game collection manager",
    "twitterTitle": "MyHomeGames — Self-Hosted Game Library",
    "twitterDescription": "Free self-hosted catalog for your personal video game collection on Windows, macOS, and Linux.",
    "schemaWebsiteDescription": "Self-hosted personal video game library and collection manager.",
    "schemaSoftwareDescription": "Self-hosted server and web app to catalog and organize your personal video game collection with optional IGDB metadata.",
    "logoAlt": "MyHomeGames — self-hosted video game library manager",
    "subtitle": "Personal video game collection management system",
    "ctaAccessWebApp": "🌐 Access Web App",
    "videoTitle": "MyHomeGames overview video",
    "aboutTitle": "📖 About MyHomeGames",
    "aboutP1": "MyHomeGames is a modern web application for managing your personal video game collection. Organize your games, create custom collections, add ratings, and much more.",
    "aboutImportant": "<strong>Important:</strong> MyHomeGames does not distribute, sell, host, or provide video games for download or streaming. It is only a personal catalog tool to organize metadata and links for games you already own or manage yourself.",
    "featureLibraryTitle": "📚 Library Management",
    "featureLibraryDesc": "Organize all your video games in one centralized library",
    "featureCategoriesTitle": "🏷️ Categories & Collections",
    "featureCategoriesDesc": "Create custom categories and collections to organize your games",
    "featureRatingsTitle": "⭐ Ratings",
    "featureRatingsDesc": "Rate your games with a star system and add critic ratings",
    "featureSearchTitle": "🔍 Advanced Search",
    "featureSearchDesc": "Search games by name, year, genre, and more",
    "featureLangTitle": "🌐 Multi-language",
    "featureLangDesc": "Support for multiple languages: English, Italian, Spanish, French, German, Portuguese, Japanese, Chinese",
    "featureIgdbTitle": "🎮 IGDB Catalog",
    "featureIgdbDescBefore": "Optional: enrich your library with IGDB metadata (covers, descriptions, similar games).",
    "setupGuide": "Setup guide",
    "gettingStartedTitle": "🚀 Getting Started",
    "gettingStartedIntro": "To use MyHomeGames, download and run the server, then open the web app.",
    "step1Title": "1. Download the Server Package",
    "step1P1": "<strong>The server is essential for MyHomeGames to work.</strong> Download and install the server package before proceeding.",
    "remoteNoteBefore": "Install the server on a <strong>Windows, macOS, or Linux</strong> computer — not on this phone, tablet, or TV. From a desktop PC, download the package for your platform, then return here to open the web app.",
    "viewAllReleases": "View all releases",
    "downloadEllipsis": "Download…",
    "download": "Download",
    "downloadFor": "Download for {{platform}}",
    "installApt": "Install with Apt",
    "installYumDnf": "Install with Yum/Dnf",
    "installYumDnfApt": "Install with Yum/Dnf/Apt",
    "installBrew": "Install with Brew",
    "osWin": "Windows",
    "osMacArm": "macOS (Apple Silicon)",
    "osMacIntel": "macOS (Intel)",
    "osLinuxDeb": "Linux (.deb)",
    "osLinuxRpm": "Linux (.rpm)",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "your platform",
    "step2Title": "2. Access the Web Application",
    "step2P1": "Once the server is running, access the web application using the button at the top of this page or by visiting the web app URL directly. You can start managing your video game collection right away.",
    "step2P2": "Sign in with your <strong>email address</strong>.",
    "step2P3": "Enter the <strong>verification code</strong> sent to your inbox to complete access.",
    "step2Important": "<strong>Important:</strong> complete the <strong>first login on the same Windows, macOS, or Linux PC</strong> where the server is installed. That first sign-in creates the secure tunnel to your home server. Afterwards you can open the web app from a phone, tablet, or TV with the same email and verification code.",
    "step3Title": "3. Choose and Install Skins (optional)",
    "step3P1": "MyHomeGames supports installable skins to customize the interface style and layout. You can choose from available skins, download them, and install them directly from the web app settings.",
    "step3Li1": "Browse available skins in the official skins repository releases.",
    "step3Li2": "Download a skin package (<code>.zip</code> / <code>.mhg-skin.zip</code>).",
    "step3Li3": "In MyHomeGames open <strong>Settings → Skin</strong>, upload the package, then select it from the installed skins list.",
    "browseSkins": "🎨 Browse and Download Skins",
    "usefulLinksTitle": "🔗 Useful Links",
    "usefulLinksAria": "Useful links",
    "webAppLabel": "Web App",
    "docsTitle": "📚 Documentation",
    "docsDevGuide": "Development Guide",
    "docsDevGuideDesc": "Development environment setup",
    "docsServer": "Server Documentation",
    "docsServerDesc": "API and backend configuration",
    "docsWeb": "Web App Documentation",
    "docsWebDesc": "Frontend and build",
    "docsIgdbSetup": "IGDB Catalog Setup",
    "docsIgdbSetupDesc": "Automatic proxy credentials or manual Twitch Developer Console",
    "docsIgdbTech": "IGDB (technical reference)",
    "docsIgdbTechDesc": "Server-side configuration details",
    "licenseTitle": "📄 License",
    "licenseP": "This project is released under the <strong>Apache License 2.0</strong>. See the <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> file for details.",
    "footerTagline": "© 2026 MyHomeGames — Self-hosted game library catalog",
    "footerBuilt": "Built with ❤️ using React, TypeScript, and Express.js",
    "privacyPolicy": "Privacy Policy"
  },
  "it": {
    "title": "MyHomeGames — Libreria di giochi self-hosted e gestore collezioni",
    "description": "MyHomeGames è un catalogo gratuito e self-hosted per la tua collezione personale di videogiochi. Organizza librerie, voti e metadati IGDB su Windows, macOS e Linux. Non è uno store né un distributore.",
    "ogTitle": "MyHomeGames — Libreria di giochi self-hosted e gestore collezioni",
    "ogDescription": "Catalogo self-hosted gratuito per la tua collezione personale di videogiochi. Windows, macOS e Linux. Organizza giochi, voti e metadati IGDB — non è uno store.",
    "ogImageAlt": "MyHomeGames — gestore della collezione personale di videogiochi",
    "twitterTitle": "MyHomeGames — Libreria di giochi self-hosted",
    "twitterDescription": "Catalogo self-hosted gratuito per la tua collezione personale di videogiochi su Windows, macOS e Linux.",
    "schemaWebsiteDescription": "Libreria e gestore self-hosted della collezione personale di videogiochi.",
    "schemaSoftwareDescription": "Server e web app self-hosted per catalogare e organizzare la tua collezione personale di videogiochi con metadati IGDB opzionali.",
    "logoAlt": "MyHomeGames — gestore self-hosted della libreria di videogiochi",
    "subtitle": "Gestisci la tua collezione di videogiochi",
    "ctaAccessWebApp": "🌐 Accedi alla Web App",
    "videoTitle": "Video di panoramica MyHomeGames",
    "aboutTitle": "📖 Informazioni su MyHomeGames",
    "aboutP1": "MyHomeGames è un'applicazione web moderna per gestire la tua collezione personale di videogiochi. Organizza i giochi, crea collezioni personalizzate, aggiungi voti e molto altro.",
    "aboutImportant": "<strong>Importante:</strong> MyHomeGames non distribuisce, vende, ospita né fornisce videogiochi da scaricare o in streaming. È solo uno strumento di catalogo personale per organizzare metadati e link ai giochi che già possiedi o gestisci tu.",
    "featureLibraryTitle": "📚 Gestione libreria",
    "featureLibraryDesc": "Organizza tutti i tuoi videogiochi in una libreria centralizzata",
    "featureCategoriesTitle": "🏷️ Categorie e collezioni",
    "featureCategoriesDesc": "Crea categorie e collezioni personalizzate per organizzare i tuoi giochi",
    "featureRatingsTitle": "⭐ Voti",
    "featureRatingsDesc": "Vota i tuoi giochi con un sistema a stelle e aggiungi i voti della critica",
    "featureSearchTitle": "🔍 Ricerca avanzata",
    "featureSearchDesc": "Cerca giochi per nome, anno, genere e altro",
    "featureLangTitle": "🌐 Multilingua",
    "featureLangDesc": "Supporto per più lingue: inglese, italiano, spagnolo, francese, tedesco, portoghese, giapponese, cinese",
    "featureIgdbTitle": "🎮 Catalogo IGDB",
    "featureIgdbDescBefore": "Opzionale: arricchisci la libreria con metadati IGDB (copertine, descrizioni, giochi simili).",
    "setupGuide": "Guida alla configurazione",
    "gettingStartedTitle": "🚀 Per iniziare",
    "gettingStartedIntro": "Per usare MyHomeGames, scarica e avvia il server, poi apri la web app.",
    "step1Title": "1. Scarica il pacchetto del server",
    "step1P1": "<strong>Il server è essenziale affinché MyHomeGames funzioni.</strong> Scarica e installa il pacchetto del server prima di procedere.",
    "remoteNoteBefore": "Installa il server su un computer <strong>Windows, macOS o Linux</strong> — non su questo telefono, tablet o TV. Da un PC desktop scarica il pacchetto per la tua piattaforma, poi torna qui per aprire la web app.",
    "viewAllReleases": "Vedi tutti i rilasci",
    "downloadEllipsis": "Scarica…",
    "download": "Scarica",
    "downloadFor": "Scarica per {{platform}}",
    "installApt": "Installa con Apt",
    "installYumDnf": "Installa con Yum/Dnf",
    "installYumDnfApt": "Installa con Yum/Dnf/Apt",
    "installBrew": "Installa con Brew",
    "osWin": "Windows",
    "osMacArm": "macOS (Apple Silicon)",
    "osMacIntel": "macOS (Intel)",
    "osLinuxDeb": "Linux (.deb)",
    "osLinuxRpm": "Linux (.rpm)",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "la tua piattaforma",
    "step2Title": "2. Accedi alla web application",
    "step2P1": "Quando il server è in esecuzione, accedi alla web application con il pulsante in alto in questa pagina oppure visitando direttamente l'URL della web app. Puoi iniziare subito a gestire la tua collezione.",
    "step2P2": "Accedi con il tuo <strong>indirizzo email</strong>.",
    "step2P3": "Inserisci il <strong>codice di verifica</strong> inviato alla tua casella di posta per completare l'accesso.",
    "step2Important": "<strong>Importante:</strong> completa il <strong>primo accesso sullo stesso PC Windows, macOS o Linux</strong> dove è installato il server. Quel primo login crea il tunnel sicuro verso il server di casa. Dopo puoi aprire la web app da telefono, tablet o TV con la stessa email e lo stesso codice di verifica.",
    "step3Title": "3. Scegli e installa gli skin (opzionale)",
    "step3P1": "MyHomeGames supporta skin installabili per personalizzare stile e layout dell'interfaccia. Puoi scegliere tra gli skin disponibili, scaricarli e installarli dalle impostazioni della web app.",
    "step3Li1": "Sfoglia gli skin disponibili nei rilasci del repository ufficiale.",
    "step3Li2": "Scarica un pacchetto skin (<code>.zip</code> / <code>.mhg-skin.zip</code>).",
    "step3Li3": "In MyHomeGames apri <strong>Impostazioni → Skin</strong>, carica il pacchetto, poi selezionalo dall'elenco degli skin installati.",
    "browseSkins": "🎨 Sfoglia e scarica gli skin",
    "usefulLinksTitle": "🔗 Link utili",
    "usefulLinksAria": "Link utili",
    "webAppLabel": "Web App",
    "docsTitle": "📚 Documentazione",
    "docsDevGuide": "Guida allo sviluppo",
    "docsDevGuideDesc": "Configurazione dell'ambiente di sviluppo",
    "docsServer": "Documentazione del server",
    "docsServerDesc": "API e configurazione backend",
    "docsWeb": "Documentazione della web app",
    "docsWebDesc": "Frontend e build",
    "docsIgdbSetup": "Configurazione catalogo IGDB",
    "docsIgdbSetupDesc": "Credenziali proxy automatiche oppure Twitch Developer Console manuale",
    "docsIgdbTech": "IGDB (riferimento tecnico)",
    "docsIgdbTechDesc": "Dettagli di configurazione lato server",
    "licenseTitle": "📄 Licenza",
    "licenseP": "Questo progetto è rilasciato sotto la <strong>Apache License 2.0</strong>. Vedi il file <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> per i dettagli.",
    "footerTagline": "© 2026 MyHomeGames — Catalogo self-hosted di librerie di giochi",
    "footerBuilt": "Realizzato con ❤️ usando React, TypeScript ed Express.js",
    "privacyPolicy": "Informativa sulla privacy"
  },
  "es": {
    "title": "MyHomeGames — Biblioteca de juegos autoalojada y gestor de colecciones",
    "description": "MyHomeGames es un catálogo gratuito y autoalojado para tu colección personal de videojuegos. Organiza bibliotecas, valoraciones y metadatos IGDB en Windows, macOS y Linux. No es una tienda ni un distribuidor.",
    "ogTitle": "MyHomeGames — Biblioteca de juegos autoalojada y gestor de colecciones",
    "ogDescription": "Catálogo autoalojado gratuito para tu colección personal de videojuegos. Windows, macOS y Linux. Organiza juegos, valoraciones y metadatos IGDB — no es una tienda.",
    "ogImageAlt": "MyHomeGames — gestor de colección personal de videojuegos",
    "twitterTitle": "MyHomeGames — Biblioteca de juegos autoalojada",
    "twitterDescription": "Catálogo autoalojado gratuito para tu colección personal de videojuegos en Windows, macOS y Linux.",
    "schemaWebsiteDescription": "Biblioteca y gestor autoalojado de la colección personal de videojuegos.",
    "schemaSoftwareDescription": "Servidor y aplicación web autoalojados para catalogar y organizar tu colección personal de videojuegos con metadatos IGDB opcionales.",
    "logoAlt": "MyHomeGames — gestor autoalojado de biblioteca de videojuegos",
    "subtitle": "Sistema de gestión de la colección personal de videojuegos",
    "ctaAccessWebApp": "🌐 Acceder a la Web App",
    "videoTitle": "Vídeo de presentación de MyHomeGames",
    "aboutTitle": "📖 Acerca de MyHomeGames",
    "aboutP1": "MyHomeGames es una aplicación web moderna para gestionar tu colección personal de videojuegos. Organiza tus juegos, crea colecciones personalizadas, añade valoraciones y mucho más.",
    "aboutImportant": "<strong>Importante:</strong> MyHomeGames no distribuye, vende, aloja ni proporciona videojuegos para descargar o en streaming. Solo es una herramienta de catálogo personal para organizar metadatos y enlaces de juegos que ya posees o gestionas tú.",
    "featureLibraryTitle": "📚 Gestión de biblioteca",
    "featureLibraryDesc": "Organiza todos tus videojuegos en una biblioteca centralizada",
    "featureCategoriesTitle": "🏷️ Categorías y colecciones",
    "featureCategoriesDesc": "Crea categorías y colecciones personalizadas para organizar tus juegos",
    "featureRatingsTitle": "⭐ Valoraciones",
    "featureRatingsDesc": "Valora tus juegos con un sistema de estrellas y añade notas de la crítica",
    "featureSearchTitle": "🔍 Búsqueda avanzada",
    "featureSearchDesc": "Busca juegos por nombre, año, género y más",
    "featureLangTitle": "🌐 Multidioma",
    "featureLangDesc": "Compatibilidad con varios idiomas: inglés, italiano, español, francés, alemán, portugués, japonés, chino",
    "featureIgdbTitle": "🎮 Catálogo IGDB",
    "featureIgdbDescBefore": "Opcional: enriquece tu biblioteca con metadatos IGDB (carátulas, descripciones, juegos similares).",
    "setupGuide": "Guía de configuración",
    "gettingStartedTitle": "🚀 Primeros pasos",
    "gettingStartedIntro": "Para usar MyHomeGames, descarga e inicia el servidor y luego abre la aplicación web.",
    "step1Title": "1. Descarga el paquete del servidor",
    "step1P1": "<strong>El servidor es esencial para que MyHomeGames funcione.</strong> Descarga e instala el paquete del servidor antes de continuar.",
    "remoteNoteBefore": "Instala el servidor en un ordenador <strong>Windows, macOS o Linux</strong> — no en este teléfono, tableta o televisor. Desde un PC de escritorio, descarga el paquete para tu plataforma y vuelve aquí para abrir la aplicación web.",
    "viewAllReleases": "Ver todos los lanzamientos",
    "downloadEllipsis": "Descargar…",
    "download": "Descargar",
    "downloadFor": "Descargar para {{platform}}",
    "installApt": "Instalar con Apt",
    "installYumDnf": "Instalar con Yum/Dnf",
    "installYumDnfApt": "Instalar con Yum/Dnf/Apt",
    "installBrew": "Instalar con Brew",
    "osWin": "Windows",
    "osMacArm": "macOS (Apple Silicon)",
    "osMacIntel": "macOS (Intel)",
    "osLinuxDeb": "Linux (.deb)",
    "osLinuxRpm": "Linux (.rpm)",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "tu plataforma",
    "step2Title": "2. Accede a la aplicación web",
    "step2P1": "Cuando el servidor esté en ejecución, accede a la aplicación web con el botón de la parte superior de esta página o visitando directamente la URL. Puedes empezar a gestionar tu colección de inmediato.",
    "step2P2": "Inicia sesión con tu <strong>dirección de correo</strong>.",
    "step2P3": "Introduce el <strong>código de verificación</strong> enviado a tu bandeja de entrada para completar el acceso.",
    "step2Important": "<strong>Importante:</strong> completa el <strong>primer inicio de sesión en el mismo PC Windows, macOS o Linux</strong> donde está instalado el servidor. Ese primer acceso crea el túnel seguro hacia tu servidor doméstico. Después puedes abrir la aplicación web desde un teléfono, tableta o televisor con el mismo correo y código de verificación.",
    "step3Title": "3. Elige e instala skins (opcional)",
    "step3P1": "MyHomeGames admite skins instalables para personalizar el estilo y el diseño de la interfaz. Puedes elegir entre los skins disponibles, descargarlos e instalarlos desde los ajustes de la aplicación web.",
    "step3Li1": "Explora los skins disponibles en las versiones del repositorio oficial.",
    "step3Li2": "Descarga un paquete de skin (<code>.zip</code> / <code>.mhg-skin.zip</code>).",
    "step3Li3": "En MyHomeGames abre <strong>Ajustes → Skin</strong>, sube el paquete y selecciónalo de la lista de skins instalados.",
    "browseSkins": "🎨 Explorar y descargar skins",
    "usefulLinksTitle": "🔗 Enlaces útiles",
    "usefulLinksAria": "Enlaces útiles",
    "webAppLabel": "Web App",
    "docsTitle": "📚 Documentación",
    "docsDevGuide": "Guía de desarrollo",
    "docsDevGuideDesc": "Configuración del entorno de desarrollo",
    "docsServer": "Documentación del servidor",
    "docsServerDesc": "API y configuración del backend",
    "docsWeb": "Documentación de la web app",
    "docsWebDesc": "Frontend y compilación",
    "docsIgdbSetup": "Configuración del catálogo IGDB",
    "docsIgdbSetupDesc": "Credenciales de proxy automáticas o Twitch Developer Console manual",
    "docsIgdbTech": "IGDB (referencia técnica)",
    "docsIgdbTechDesc": "Detalles de configuración en el servidor",
    "licenseTitle": "📄 Licencia",
    "licenseP": "Este proyecto se publica bajo la <strong>Apache License 2.0</strong>. Consulta el archivo <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> para más detalles.",
    "footerTagline": "© 2026 MyHomeGames — Catálogo autoalojado de bibliotecas de juegos",
    "footerBuilt": "Hecho con ❤️ usando React, TypeScript y Express.js",
    "privacyPolicy": "Política de privacidad"
  },
  "de": {
    "title": "MyHomeGames — Selbst gehostete Spielebibliothek & Sammlungsmanager",
    "description": "MyHomeGames ist ein kostenloser, selbst gehosteter Katalog für deine persönliche Videospielsammlung. Organisiere Bibliotheken, Bewertungen und IGDB-Metadaten unter Windows, macOS und Linux. Kein Store und kein Distributor.",
    "ogTitle": "MyHomeGames — Selbst gehostete Spielebibliothek & Sammlungsmanager",
    "ogDescription": "Kostenloser selbst gehosteter Katalog für deine persönliche Videospielsammlung. Windows, macOS und Linux. Organisiere Spiele, Bewertungen und IGDB-Metadaten — kein Store.",
    "ogImageAlt": "MyHomeGames — Manager für die persönliche Videospielsammlung",
    "twitterTitle": "MyHomeGames — Selbst gehostete Spielebibliothek",
    "twitterDescription": "Kostenloser selbst gehosteter Katalog für deine persönliche Videospielsammlung unter Windows, macOS und Linux.",
    "schemaWebsiteDescription": "Selbst gehostete persönliche Videospielbibliothek und Sammlungsmanager.",
    "schemaSoftwareDescription": "Selbst gehosteter Server und Web-App zum Katalogisieren und Organisieren deiner persönlichen Videospielsammlung mit optionalen IGDB-Metadaten.",
    "logoAlt": "MyHomeGames — selbst gehosteter Videospiel-Bibliotheksmanager",
    "subtitle": "System zur Verwaltung der persönlichen Videospielsammlung",
    "ctaAccessWebApp": "🌐 Web-App öffnen",
    "videoTitle": "MyHomeGames Übersichtsvideo",
    "aboutTitle": "📖 Über MyHomeGames",
    "aboutP1": "MyHomeGames ist eine moderne Webanwendung zur Verwaltung deiner persönlichen Videospielsammlung. Organisiere Spiele, erstelle eigene Sammlungen, vergebe Bewertungen und vieles mehr.",
    "aboutImportant": "<strong>Wichtig:</strong> MyHomeGames vertreibt, verkauft, hostet oder stellt keine Videospiele zum Download oder Streaming bereit. Es ist nur ein persönliches Katalogwerkzeug, um Metadaten und Links zu Spielen zu organisieren, die du bereits besitzt oder selbst verwaltest.",
    "featureLibraryTitle": "📚 Bibliotheksverwaltung",
    "featureLibraryDesc": "Organisiere alle deine Videospiele in einer zentralen Bibliothek",
    "featureCategoriesTitle": "🏷️ Kategorien & Sammlungen",
    "featureCategoriesDesc": "Erstelle eigene Kategorien und Sammlungen zur Organisation deiner Spiele",
    "featureRatingsTitle": "⭐ Bewertungen",
    "featureRatingsDesc": "Bewerte deine Spiele mit einem Sterne-System und füge Kritikwertungen hinzu",
    "featureSearchTitle": "🔍 Erweiterte Suche",
    "featureSearchDesc": "Suche Spiele nach Name, Jahr, Genre und mehr",
    "featureLangTitle": "🌐 Mehrsprachig",
    "featureLangDesc": "Unterstützung für mehrere Sprachen: Englisch, Italienisch, Spanisch, Französisch, Deutsch, Portugiesisch, Japanisch, Chinesisch",
    "featureIgdbTitle": "🎮 IGDB-Katalog",
    "featureIgdbDescBefore": "Optional: reichere deine Bibliothek mit IGDB-Metadaten an (Cover, Beschreibungen, ähnliche Spiele).",
    "setupGuide": "Einrichtungsanleitung",
    "gettingStartedTitle": "🚀 Erste Schritte",
    "gettingStartedIntro": "Um MyHomeGames zu nutzen, lade den Server herunter und starte ihn, öffne dann die Web-App.",
    "step1Title": "1. Serverpaket herunterladen",
    "step1P1": "<strong>Der Server ist für MyHomeGames unerlässlich.</strong> Lade das Serverpaket herunter und installiere es, bevor du fortfährst.",
    "remoteNoteBefore": "Installiere den Server auf einem <strong>Windows-, macOS- oder Linux-Computer</strong> — nicht auf diesem Telefon, Tablet oder TV. Lade von einem Desktop-PC das Paket für deine Plattform herunter und kehre dann hierher zurück, um die Web-App zu öffnen.",
    "viewAllReleases": "Alle Releases anzeigen",
    "downloadEllipsis": "Download…",
    "download": "Download",
    "downloadFor": "Download für {{platform}}",
    "installApt": "Mit Apt installieren",
    "installYumDnf": "Mit Yum/Dnf installieren",
    "installYumDnfApt": "Mit Yum/Dnf/Apt installieren",
    "installBrew": "Mit Brew installieren",
    "osWin": "Windows",
    "osMacArm": "macOS (Apple Silicon)",
    "osMacIntel": "macOS (Intel)",
    "osLinuxDeb": "Linux (.deb)",
    "osLinuxRpm": "Linux (.rpm)",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "deine Plattform",
    "step2Title": "2. Webanwendung öffnen",
    "step2P1": "Sobald der Server läuft, öffne die Webanwendung über den Button oben auf dieser Seite oder indem du die Web-App-URL direkt aufrufst. Du kannst sofort mit der Verwaltung deiner Sammlung beginnen.",
    "step2P2": "Melde dich mit deiner <strong>E-Mail-Adresse</strong> an.",
    "step2P3": "Gib den <strong>Bestätigungscode</strong> aus deinem Posteingang ein, um den Zugang abzuschließen.",
    "step2Important": "<strong>Wichtig:</strong> schließe die <strong>erste Anmeldung auf demselben Windows-, macOS- oder Linux-PC</strong> ab, auf dem der Server installiert ist. Diese erste Anmeldung erstellt den sicheren Tunnel zu deinem Heimserver. Danach kannst du die Web-App von Telefon, Tablet oder TV mit derselben E-Mail und demselben Code öffnen.",
    "step3Title": "3. Skins wählen und installieren (optional)",
    "step3P1": "MyHomeGames unterstützt installierbare Skins zur Anpassung von Stil und Layout. Du kannst verfügbare Skins auswählen, herunterladen und direkt in den Web-App-Einstellungen installieren.",
    "step3Li1": "Durchsuche verfügbare Skins in den Releases des offiziellen Skin-Repositories.",
    "step3Li2": "Lade ein Skin-Paket herunter (<code>.zip</code> / <code>.mhg-skin.zip</code>).",
    "step3Li3": "Öffne in MyHomeGames <strong>Einstellungen → Skin</strong>, lade das Paket hoch und wähle es aus der Liste installierter Skins.",
    "browseSkins": "🎨 Skins durchsuchen und herunterladen",
    "usefulLinksTitle": "🔗 Nützliche Links",
    "usefulLinksAria": "Nützliche Links",
    "webAppLabel": "Web-App",
    "docsTitle": "📚 Dokumentation",
    "docsDevGuide": "Entwicklerhandbuch",
    "docsDevGuideDesc": "Einrichtung der Entwicklungsumgebung",
    "docsServer": "Serverdokumentation",
    "docsServerDesc": "API und Backend-Konfiguration",
    "docsWeb": "Web-App-Dokumentation",
    "docsWebDesc": "Frontend und Build",
    "docsIgdbSetup": "IGDB-Katalog einrichten",
    "docsIgdbSetupDesc": "Automatische Proxy-Zugangsdaten oder manuelle Twitch Developer Console",
    "docsIgdbTech": "IGDB (technische Referenz)",
    "docsIgdbTechDesc": "Serverseitige Konfigurationsdetails",
    "licenseTitle": "📄 Lizenz",
    "licenseP": "Dieses Projekt steht unter der <strong>Apache License 2.0</strong>. Details findest du in der Datei <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a>.",
    "footerTagline": "© 2026 MyHomeGames — Selbst gehosteter Spielebibliothek-Katalog",
    "footerBuilt": "Mit ❤️ erstellt mit React, TypeScript und Express.js",
    "privacyPolicy": "Datenschutzerklärung"
  },
  "fr": {
    "title": "MyHomeGames — Bibliothèque de jeux auto-hébergée et gestionnaire de collection",
    "description": "MyHomeGames est un catalogue gratuit et auto-hébergé pour votre collection personnelle de jeux vidéo. Organisez bibliothèques, notes et métadonnées IGDB sur Windows, macOS et Linux. Ce n’est ni une boutique ni un distributeur.",
    "ogTitle": "MyHomeGames — Bibliothèque de jeux auto-hébergée et gestionnaire de collection",
    "ogDescription": "Catalogue auto-hébergé gratuit pour votre collection personnelle de jeux vidéo. Windows, macOS et Linux. Organisez jeux, notes et métadonnées IGDB — pas une boutique.",
    "ogImageAlt": "MyHomeGames — gestionnaire de collection personnelle de jeux vidéo",
    "twitterTitle": "MyHomeGames — Bibliothèque de jeux auto-hébergée",
    "twitterDescription": "Catalogue auto-hébergé gratuit pour votre collection personnelle de jeux vidéo sur Windows, macOS et Linux.",
    "schemaWebsiteDescription": "Bibliothèque et gestionnaire auto-hébergés de collection personnelle de jeux vidéo.",
    "schemaSoftwareDescription": "Serveur et application web auto-hébergés pour cataloguer et organiser votre collection personnelle de jeux vidéo avec des métadonnées IGDB optionnelles.",
    "logoAlt": "MyHomeGames — gestionnaire auto-hébergé de bibliothèque de jeux vidéo",
    "subtitle": "Système de gestion de collection personnelle de jeux vidéo",
    "ctaAccessWebApp": "🌐 Accéder à la Web App",
    "videoTitle": "Vidéo de présentation MyHomeGames",
    "aboutTitle": "📖 À propos de MyHomeGames",
    "aboutP1": "MyHomeGames est une application web moderne pour gérer votre collection personnelle de jeux vidéo. Organisez vos jeux, créez des collections personnalisées, ajoutez des notes, et bien plus.",
    "aboutImportant": "<strong>Important :</strong> MyHomeGames ne distribue, ne vend, n’héberge ni ne fournit de jeux vidéo en téléchargement ou en streaming. Ce n’est qu’un outil de catalogue personnel pour organiser les métadonnées et les liens des jeux que vous possédez déjà ou que vous gérez vous-même.",
    "featureLibraryTitle": "📚 Gestion de bibliothèque",
    "featureLibraryDesc": "Organisez tous vos jeux vidéo dans une bibliothèque centralisée",
    "featureCategoriesTitle": "🏷️ Catégories et collections",
    "featureCategoriesDesc": "Créez des catégories et collections personnalisées pour organiser vos jeux",
    "featureRatingsTitle": "⭐ Notes",
    "featureRatingsDesc": "Notez vos jeux avec un système d’étoiles et ajoutez les notes de la critique",
    "featureSearchTitle": "🔍 Recherche avancée",
    "featureSearchDesc": "Recherchez des jeux par nom, année, genre, et plus",
    "featureLangTitle": "🌐 Multilingue",
    "featureLangDesc": "Prise en charge de plusieurs langues : anglais, italien, espagnol, français, allemand, portugais, japonais, chinois",
    "featureIgdbTitle": "🎮 Catalogue IGDB",
    "featureIgdbDescBefore": "Optionnel : enrichissez votre bibliothèque avec les métadonnées IGDB (jaquettes, descriptions, jeux similaires).",
    "setupGuide": "Guide de configuration",
    "gettingStartedTitle": "🚀 Pour commencer",
    "gettingStartedIntro": "Pour utiliser MyHomeGames, téléchargez et lancez le serveur, puis ouvrez l’application web.",
    "step1Title": "1. Télécharger le paquet serveur",
    "step1P1": "<strong>Le serveur est indispensable au fonctionnement de MyHomeGames.</strong> Téléchargez et installez le paquet serveur avant de continuer.",
    "remoteNoteBefore": "Installez le serveur sur un ordinateur <strong>Windows, macOS ou Linux</strong> — pas sur ce téléphone, tablette ou téléviseur. Depuis un PC de bureau, téléchargez le paquet pour votre plateforme, puis revenez ici pour ouvrir l’application web.",
    "viewAllReleases": "Voir toutes les versions",
    "downloadEllipsis": "Télécharger…",
    "download": "Télécharger",
    "downloadFor": "Télécharger pour {{platform}}",
    "installApt": "Installer avec Apt",
    "installYumDnf": "Installer avec Yum/Dnf",
    "installYumDnfApt": "Installer avec Yum/Dnf/Apt",
    "installBrew": "Installer avec Brew",
    "osWin": "Windows",
    "osMacArm": "macOS (Apple Silicon)",
    "osMacIntel": "macOS (Intel)",
    "osLinuxDeb": "Linux (.deb)",
    "osLinuxRpm": "Linux (.rpm)",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "votre plateforme",
    "step2Title": "2. Accéder à l’application web",
    "step2P1": "Une fois le serveur démarré, accédez à l’application web via le bouton en haut de cette page ou en visitant directement l’URL. Vous pouvez immédiatement commencer à gérer votre collection.",
    "step2P2": "Connectez-vous avec votre <strong>adresse e-mail</strong>.",
    "step2P3": "Saisissez le <strong>code de vérification</strong> envoyé dans votre boîte de réception pour finaliser l’accès.",
    "step2Important": "<strong>Important :</strong> effectuez la <strong>première connexion sur le même PC Windows, macOS ou Linux</strong> où le serveur est installé. Cette première connexion crée le tunnel sécurisé vers votre serveur domestique. Ensuite, vous pouvez ouvrir l’application web depuis un téléphone, une tablette ou une TV avec le même e-mail et le même code.",
    "step3Title": "3. Choisir et installer des skins (optionnel)",
    "step3P1": "MyHomeGames prend en charge des skins installables pour personnaliser le style et la mise en page. Vous pouvez choisir parmi les skins disponibles, les télécharger et les installer depuis les paramètres de l’application web.",
    "step3Li1": "Parcourir les skins disponibles dans les versions du dépôt officiel.",
    "step3Li2": "Télécharger un paquet skin (<code>.zip</code> / <code>.mhg-skin.zip</code>).",
    "step3Li3": "Dans MyHomeGames, ouvrez <strong>Paramètres → Skin</strong>, importez le paquet, puis sélectionnez-le dans la liste des skins installés.",
    "browseSkins": "🎨 Parcourir et télécharger les skins",
    "usefulLinksTitle": "🔗 Liens utiles",
    "usefulLinksAria": "Liens utiles",
    "webAppLabel": "Web App",
    "docsTitle": "📚 Documentation",
    "docsDevGuide": "Guide de développement",
    "docsDevGuideDesc": "Configuration de l’environnement de développement",
    "docsServer": "Documentation du serveur",
    "docsServerDesc": "API et configuration backend",
    "docsWeb": "Documentation de la web app",
    "docsWebDesc": "Frontend et build",
    "docsIgdbSetup": "Configuration du catalogue IGDB",
    "docsIgdbSetupDesc": "Identifiants proxy automatiques ou Twitch Developer Console manuelle",
    "docsIgdbTech": "IGDB (référence technique)",
    "docsIgdbTechDesc": "Détails de configuration côté serveur",
    "licenseTitle": "📄 Licence",
    "licenseP": "Ce projet est publié sous la <strong>Apache License 2.0</strong>. Voir le fichier <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> pour les détails.",
    "footerTagline": "© 2026 MyHomeGames — Catalogue auto-hébergé de bibliothèques de jeux",
    "footerBuilt": "Réalisé avec ❤️ en React, TypeScript et Express.js",
    "privacyPolicy": "Politique de confidentialité"
  },
  "pt": {
    "title": "MyHomeGames — Biblioteca de jogos self-hosted e gestor de coleções",
    "description": "MyHomeGames é um catálogo gratuito e self-hosted para a sua coleção pessoal de videojogos. Organize bibliotecas, classificações e metadados IGDB no Windows, macOS e Linux. Não é uma loja nem um distribuidor.",
    "ogTitle": "MyHomeGames — Biblioteca de jogos self-hosted e gestor de coleções",
    "ogDescription": "Catálogo self-hosted gratuito para a sua coleção pessoal de videojogos. Windows, macOS e Linux. Organize jogos, classificações e metadados IGDB — não é uma loja.",
    "ogImageAlt": "MyHomeGames — gestor da coleção pessoal de videojogos",
    "twitterTitle": "MyHomeGames — Biblioteca de jogos self-hosted",
    "twitterDescription": "Catálogo self-hosted gratuito para a sua coleção pessoal de videojogos no Windows, macOS e Linux.",
    "schemaWebsiteDescription": "Biblioteca e gestor self-hosted da coleção pessoal de videojogos.",
    "schemaSoftwareDescription": "Servidor e aplicação web self-hosted para catalogar e organizar a sua coleção pessoal de videojogos com metadados IGDB opcionais.",
    "logoAlt": "MyHomeGames — gestor self-hosted de biblioteca de videojogos",
    "subtitle": "Sistema de gestão da coleção pessoal de videojogos",
    "ctaAccessWebApp": "🌐 Aceder à Web App",
    "videoTitle": "Vídeo de apresentação do MyHomeGames",
    "aboutTitle": "📖 Sobre o MyHomeGames",
    "aboutP1": "MyHomeGames é uma aplicação web moderna para gerir a sua coleção pessoal de videojogos. Organize os jogos, crie coleções personalizadas, adicione classificações e muito mais.",
    "aboutImportant": "<strong>Importante:</strong> o MyHomeGames não distribui, vende, alojá nem fornece videojogos para transferência ou streaming. É apenas uma ferramenta de catálogo pessoal para organizar metadados e ligações dos jogos que já possui ou gere.",
    "featureLibraryTitle": "📚 Gestão de biblioteca",
    "featureLibraryDesc": "Organize todos os seus videojogos numa biblioteca centralizada",
    "featureCategoriesTitle": "🏷️ Categorias e coleções",
    "featureCategoriesDesc": "Crie categorias e coleções personalizadas para organizar os seus jogos",
    "featureRatingsTitle": "⭐ Classificações",
    "featureRatingsDesc": "Classifique os seus jogos com um sistema de estrelas e adicione notas da crítica",
    "featureSearchTitle": "🔍 Pesquisa avançada",
    "featureSearchDesc": "Pesquise jogos por nome, ano, género e mais",
    "featureLangTitle": "🌐 Multilíngue",
    "featureLangDesc": "Suporte para vários idiomas: inglês, italiano, espanhol, francês, alemão, português, japonês, chinês",
    "featureIgdbTitle": "🎮 Catálogo IGDB",
    "featureIgdbDescBefore": "Opcional: enriqueça a biblioteca com metadados IGDB (capas, descrições, jogos semelhantes).",
    "setupGuide": "Guia de configuração",
    "gettingStartedTitle": "🚀 Como começar",
    "gettingStartedIntro": "Para usar o MyHomeGames, descarregue e execute o servidor e depois abra a aplicação web.",
    "step1Title": "1. Descarregar o pacote do servidor",
    "step1P1": "<strong>O servidor é essencial para o MyHomeGames funcionar.</strong> Descarregue e instale o pacote do servidor antes de continuar.",
    "remoteNoteBefore": "Instale o servidor num computador <strong>Windows, macOS ou Linux</strong> — não neste telemóvel, tablet ou TV. A partir de um PC de secretária, descarregue o pacote para a sua plataforma e volte aqui para abrir a aplicação web.",
    "viewAllReleases": "Ver todos os lançamentos",
    "downloadEllipsis": "Descarregar…",
    "download": "Descarregar",
    "downloadFor": "Descarregar para {{platform}}",
    "installApt": "Instalar com Apt",
    "installYumDnf": "Instalar com Yum/Dnf",
    "installYumDnfApt": "Instalar com Yum/Dnf/Apt",
    "installBrew": "Instalar com Brew",
    "osWin": "Windows",
    "osMacArm": "macOS (Apple Silicon)",
    "osMacIntel": "macOS (Intel)",
    "osLinuxDeb": "Linux (.deb)",
    "osLinuxRpm": "Linux (.rpm)",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "a sua plataforma",
    "step2Title": "2. Aceder à aplicação web",
    "step2P1": "Com o servidor em execução, aceda à aplicação web com o botão no topo desta página ou visitando diretamente o URL. Pode começar a gerir a sua coleção de imediato.",
    "step2P2": "Inicie sessão com o seu <strong>endereço de e-mail</strong>.",
    "step2P3": "Introduza o <strong>código de verificação</strong> enviado para a sua caixa de entrada para concluir o acesso.",
    "step2Important": "<strong>Importante:</strong> complete o <strong>primeiro início de sessão no mesmo PC Windows, macOS ou Linux</strong> onde o servidor está instalado. Esse primeiro login cria o túnel seguro para o servidor de casa. Depois pode abrir a aplicação web a partir de um telemóvel, tablet ou TV com o mesmo e-mail e código de verificação.",
    "step3Title": "3. Escolher e instalar skins (opcional)",
    "step3P1": "O MyHomeGames suporta skins instaláveis para personalizar o estilo e o layout da interface. Pode escolher skins disponíveis, descarregá-los e instalá-los nas definições da aplicação web.",
    "step3Li1": "Explore skins disponíveis nos lançamentos do repositório oficial.",
    "step3Li2": "Descarregue um pacote de skin (<code>.zip</code> / <code>.mhg-skin.zip</code>).",
    "step3Li3": "No MyHomeGames abra <strong>Definições → Skin</strong>, carregue o pacote e selecione-o na lista de skins instalados.",
    "browseSkins": "🎨 Explorar e descarregar skins",
    "usefulLinksTitle": "🔗 Ligações úteis",
    "usefulLinksAria": "Ligações úteis",
    "webAppLabel": "Web App",
    "docsTitle": "📚 Documentação",
    "docsDevGuide": "Guia de desenvolvimento",
    "docsDevGuideDesc": "Configuração do ambiente de desenvolvimento",
    "docsServer": "Documentação do servidor",
    "docsServerDesc": "API e configuração do backend",
    "docsWeb": "Documentação da web app",
    "docsWebDesc": "Frontend e build",
    "docsIgdbSetup": "Configuração do catálogo IGDB",
    "docsIgdbSetupDesc": "Credenciais de proxy automáticas ou Twitch Developer Console manual",
    "docsIgdbTech": "IGDB (referência técnica)",
    "docsIgdbTechDesc": "Detalhes de configuração no servidor",
    "licenseTitle": "📄 Licença",
    "licenseP": "Este projeto é publicado sob a <strong>Apache License 2.0</strong>. Consulte o ficheiro <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> para mais detalhes.",
    "footerTagline": "© 2026 MyHomeGames — Catálogo self-hosted de bibliotecas de jogos",
    "footerBuilt": "Feito com ❤️ usando React, TypeScript e Express.js",
    "privacyPolicy": "Política de privacidade"
  },
  "ja": {
    "title": "MyHomeGames — セルフホスト型ゲームライブラリ＆コレクション管理",
    "description": "MyHomeGames は、個人のビデオゲームコレクション向けの無料セルフホスト型カタログです。Windows / macOS / Linux でライブラリ、評価、IGDB メタデータを整理できます。ストアや配信サービスではありません。",
    "ogTitle": "MyHomeGames — セルフホスト型ゲームライブラリ＆コレクション管理",
    "ogDescription": "個人のビデオゲームコレクション向けの無料セルフホスト型カタログ。Windows / macOS / Linux。ゲーム・評価・IGDB メタデータを整理 — ストアではありません。",
    "ogImageAlt": "MyHomeGames — 個人ビデオゲームコレクション管理",
    "twitterTitle": "MyHomeGames — セルフホスト型ゲームライブラリ",
    "twitterDescription": "Windows / macOS / Linux 向けの個人ビデオゲームコレクション用無料セルフホスト型カタログ。",
    "schemaWebsiteDescription": "セルフホスト型の個人ビデオゲームライブラリ＆コレクション管理。",
    "schemaSoftwareDescription": "オプションの IGDB メタデータ付きで個人のビデオゲームコレクションを整理するセルフホスト型サーバーと Web アプリ。",
    "logoAlt": "MyHomeGames — セルフホスト型ビデオゲームライブラリ管理",
    "subtitle": "個人のビデオゲームコレクション管理システム",
    "ctaAccessWebApp": "🌐 Web アプリを開く",
    "videoTitle": "MyHomeGames 概要動画",
    "aboutTitle": "📖 MyHomeGames について",
    "aboutP1": "MyHomeGames は、個人のビデオゲームコレクションを管理するモダンな Web アプリです。ゲームの整理、カスタムコレクション、評価など多くの機能を提供します。",
    "aboutImportant": "<strong>重要:</strong> MyHomeGames はビデオゲームの配布・販売・ホスティング・ダウンロード／ストリーミング提供を行いません。すでに所有または自分で管理しているゲームのメタデータとリンクを整理する個人カタログツールです。",
    "featureLibraryTitle": "📚 ライブラリ管理",
    "featureLibraryDesc": "すべてのビデオゲームをひとつの中央ライブラリで整理",
    "featureCategoriesTitle": "🏷️ カテゴリとコレクション",
    "featureCategoriesDesc": "カスタムカテゴリとコレクションでゲームを整理",
    "featureRatingsTitle": "⭐ 評価",
    "featureRatingsDesc": "星評価でゲームを採点し、批評家の評価も追加",
    "featureSearchTitle": "🔍 高度な検索",
    "featureSearchDesc": "名前・年・ジャンルなどでゲームを検索",
    "featureLangTitle": "🌐 多言語",
    "featureLangDesc": "英語・イタリア語・スペイン語・フランス語・ドイツ語・ポルトガル語・日本語・中国語に対応",
    "featureIgdbTitle": "🎮 IGDB カタログ",
    "featureIgdbDescBefore": "任意: IGDB メタデータ（カバー、説明、類似ゲーム）でライブラリを充実。",
    "setupGuide": "セットアップガイド",
    "gettingStartedTitle": "🚀 はじめに",
    "gettingStartedIntro": "MyHomeGames を使うには、サーバーをダウンロードして起動し、その後 Web アプリを開きます。",
    "step1Title": "1. サーバーパッケージをダウンロード",
    "step1P1": "<strong>MyHomeGames の動作にはサーバーが必須です。</strong>続行する前にサーバーパッケージをダウンロードしてインストールしてください。",
    "remoteNoteBefore": "サーバーは <strong>Windows / macOS / Linux</strong> のパソコンにインストールしてください — このスマートフォン・タブレット・テレビにはインストールしません。デスクトップ PC からプラットフォーム用パッケージをダウンロードし、ここに戻って Web アプリを開いてください。",
    "viewAllReleases": "すべてのリリースを見る",
    "downloadEllipsis": "ダウンロード…",
    "download": "ダウンロード",
    "downloadFor": "{{platform}} 向けダウンロード",
    "installApt": "Apt でインストール",
    "installYumDnf": "Yum/Dnf でインストール",
    "installYumDnfApt": "Yum/Dnf/Apt でインストール",
    "installBrew": "Brew でインストール",
    "osWin": "Windows",
    "osMacArm": "macOS（Apple Silicon）",
    "osMacIntel": "macOS（Intel）",
    "osLinuxDeb": "Linux（.deb）",
    "osLinuxRpm": "Linux（.rpm）",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "お使いのプラットフォーム",
    "step2Title": "2. Web アプリケーションにアクセス",
    "step2P1": "サーバー起動後、このページ上部のボタン、または Web アプリ URL から直接アクセスできます。すぐにコレクション管理を始められます。",
    "step2P2": "<strong>メールアドレス</strong>でサインインします。",
    "step2P3": "受信トレイに届いた<strong>確認コード</strong>を入力してアクセスを完了します。",
    "step2Important": "<strong>重要:</strong> <strong>サーバーをインストールした同じ Windows / macOS / Linux PC</strong>で最初のログインを完了してください。その初回サインインで自宅サーバーへの安全なトンネルが作成されます。その後は同じメールと確認コードでスマホ・タブレット・TV からも Web アプリを開けます。",
    "step3Title": "3. スキンの選択とインストール（任意）",
    "step3P1": "MyHomeGames はインストール可能なスキンで UI のスタイルとレイアウトをカスタマイズできます。利用可能なスキンを選び、ダウンロードして Web アプリ設定からインストールできます。",
    "step3Li1": "公式スキンリポジトリのリリースで利用可能なスキンを閲覧します。",
    "step3Li2": "スキンパッケージ（<code>.zip</code> / <code>.mhg-skin.zip</code>）をダウンロードします。",
    "step3Li3": "MyHomeGames で<strong>設定 → スキン</strong>を開き、パッケージをアップロードしてインストール済み一覧から選択します。",
    "browseSkins": "🎨 スキンを閲覧してダウンロード",
    "usefulLinksTitle": "🔗 便利なリンク",
    "usefulLinksAria": "便利なリンク",
    "webAppLabel": "Web アプリ",
    "docsTitle": "📚 ドキュメント",
    "docsDevGuide": "開発ガイド",
    "docsDevGuideDesc": "開発環境のセットアップ",
    "docsServer": "サーバードキュメント",
    "docsServerDesc": "API とバックエンド設定",
    "docsWeb": "Web アプリドキュメント",
    "docsWebDesc": "フロントエンドとビルド",
    "docsIgdbSetup": "IGDB カタログ設定",
    "docsIgdbSetupDesc": "自動プロキシ資格情報、または手動の Twitch Developer Console",
    "docsIgdbTech": "IGDB（技術リファレンス）",
    "docsIgdbTechDesc": "サーバー側の設定詳細",
    "licenseTitle": "📄 ライセンス",
    "licenseP": "本プロジェクトは <strong>Apache License 2.0</strong> の下で公開されています。詳細は <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> ファイルを参照してください。",
    "footerTagline": "© 2026 MyHomeGames — セルフホスト型ゲームライブラリカタログ",
    "footerBuilt": "❤️ とともに React・TypeScript・Express.js で構築",
    "privacyPolicy": "プライバシーポリシー"
  },
  "zh": {
    "title": "MyHomeGames — 自托管游戏库与收藏管理",
    "description": "MyHomeGames 是面向个人电子游戏收藏的免费自托管目录。在 Windows、macOS 和 Linux 上整理游戏库、评分与 IGDB 元数据。不是商店，也不是发行商。",
    "ogTitle": "MyHomeGames — 自托管游戏库与收藏管理",
    "ogDescription": "面向个人电子游戏收藏的免费自托管目录。Windows、macOS 与 Linux。整理游戏、评分与 IGDB 元数据——不是商店。",
    "ogImageAlt": "MyHomeGames — 个人电子游戏收藏管理",
    "twitterTitle": "MyHomeGames — 自托管游戏库",
    "twitterDescription": "面向 Windows、macOS 与 Linux 的个人电子游戏收藏免费自托管目录。",
    "schemaWebsiteDescription": "自托管的个人电子游戏库与收藏管理工具。",
    "schemaSoftwareDescription": "用于编目与整理个人电子游戏收藏的自托管服务器与 Web 应用，可选 IGDB 元数据。",
    "logoAlt": "MyHomeGames — 自托管电子游戏库管理",
    "subtitle": "个人电子游戏收藏管理系统",
    "ctaAccessWebApp": "🌐 打开 Web 应用",
    "videoTitle": "MyHomeGames 概览视频",
    "aboutTitle": "📖 关于 MyHomeGames",
    "aboutP1": "MyHomeGames 是一款用于管理个人电子游戏收藏的现代 Web 应用。整理游戏、创建自定义收藏、添加评分，还有更多功能。",
    "aboutImportant": "<strong>重要：</strong>MyHomeGames 不发行、不销售、不托管，也不提供电子游戏下载或流媒体。它只是一个个人目录工具，用于整理你已拥有或自行管理的游戏的元数据与链接。",
    "featureLibraryTitle": "📚 游戏库管理",
    "featureLibraryDesc": "在一个集中的游戏库中整理所有电子游戏",
    "featureCategoriesTitle": "🏷️ 分类与收藏",
    "featureCategoriesDesc": "创建自定义分类与收藏来整理游戏",
    "featureRatingsTitle": "⭐ 评分",
    "featureRatingsDesc": "用星级系统为游戏打分，并添加评论评分",
    "featureSearchTitle": "🔍 高级搜索",
    "featureSearchDesc": "按名称、年份、类型等搜索游戏",
    "featureLangTitle": "🌐 多语言",
    "featureLangDesc": "支持多种语言：英语、意大利语、西班牙语、法语、德语、葡萄牙语、日语、中文",
    "featureIgdbTitle": "🎮 IGDB 目录",
    "featureIgdbDescBefore": "可选：用 IGDB 元数据（封面、简介、相似游戏）丰富你的游戏库。",
    "setupGuide": "配置指南",
    "gettingStartedTitle": "🚀 开始使用",
    "gettingStartedIntro": "使用 MyHomeGames：先下载并运行服务器，然后打开 Web 应用。",
    "step1Title": "1. 下载服务器安装包",
    "step1P1": "<strong>服务器是 MyHomeGames 正常工作所必需的。</strong>请先下载并安装服务器包，再继续。",
    "remoteNoteBefore": "请将服务器安装在 <strong>Windows、macOS 或 Linux</strong> 电脑上——不要安装在此手机、平板或电视上。从台式机下载对应平台的安装包，然后返回此处打开 Web 应用。",
    "viewAllReleases": "查看所有版本",
    "downloadEllipsis": "下载…",
    "download": "下载",
    "downloadFor": "下载 {{platform}} 版本",
    "installApt": "使用 Apt 安装",
    "installYumDnf": "使用 Yum/Dnf 安装",
    "installYumDnfApt": "使用 Yum/Dnf/Apt 安装",
    "installBrew": "使用 Brew 安装",
    "osWin": "Windows",
    "osMacArm": "macOS（Apple Silicon）",
    "osMacIntel": "macOS（Intel）",
    "osLinuxDeb": "Linux（.deb）",
    "osLinuxRpm": "Linux（.rpm）",
    "osLinux": "Linux",
    "osAndroid": "Android",
    "osPlatform": "你的平台",
    "step2Title": "2. 访问 Web 应用",
    "step2P1": "服务器运行后，可通过本页顶部按钮或直接访问 Web 应用 URL 打开。你可以立即开始管理收藏。",
    "step2P2": "使用你的<strong>电子邮箱</strong>登录。",
    "step2P3": "输入发送到收件箱的<strong>验证码</strong>以完成访问。",
    "step2Important": "<strong>重要：</strong>请在<strong>安装服务器的同一台 Windows、macOS 或 Linux 电脑</strong>上完成首次登录。该首次登录会创建通往家庭服务器的安全隧道。之后你可以用同一邮箱与验证码在手机、平板或电视上打开 Web 应用。",
    "step3Title": "3. 选择并安装皮肤（可选）",
    "step3P1": "MyHomeGames 支持可安装皮肤以自定义界面风格与布局。你可以从可用皮肤中选择、下载，并在 Web 应用设置中直接安装。",
    "step3Li1": "在官方皮肤仓库的发行版中浏览可用皮肤。",
    "step3Li2": "下载皮肤包（<code>.zip</code> / <code>.mhg-skin.zip</code>）。",
    "step3Li3": "在 MyHomeGames 中打开<strong>设置 → 皮肤</strong>，上传包，然后从已安装列表中选择。",
    "browseSkins": "🎨 浏览并下载皮肤",
    "usefulLinksTitle": "🔗 实用链接",
    "usefulLinksAria": "实用链接",
    "webAppLabel": "Web 应用",
    "docsTitle": "📚 文档",
    "docsDevGuide": "开发指南",
    "docsDevGuideDesc": "开发环境搭建",
    "docsServer": "服务器文档",
    "docsServerDesc": "API 与后端配置",
    "docsWeb": "Web 应用文档",
    "docsWebDesc": "前端与构建",
    "docsIgdbSetup": "IGDB 目录配置",
    "docsIgdbSetupDesc": "自动代理凭证或手动 Twitch Developer Console",
    "docsIgdbTech": "IGDB（技术参考）",
    "docsIgdbTechDesc": "服务器端配置详情",
    "licenseTitle": "📄 许可证",
    "licenseP": "本项目基于 <strong>Apache License 2.0</strong> 发布。详情见 <a href=\"https://github.com/myhomegames/myhomegames-server/blob/main/LICENSE\">LICENSE</a> 文件。",
    "footerTagline": "© 2026 MyHomeGames — 自托管游戏库目录",
    "footerBuilt": "用 ❤️ 与 React、TypeScript、Express.js 构建",
    "privacyPolicy": "隐私政策"
  }
};


  function resolveLang() {
    var candidates = [];
    try {
      if (Array.isArray(navigator.languages)) {
        candidates = candidates.concat(navigator.languages);
      }
    } catch (_) {}
    try {
      if (navigator.language) candidates.push(navigator.language);
    } catch (_) {}
    try {
      if (navigator.userLanguage) candidates.push(navigator.userLanguage);
    } catch (_) {}

    for (var i = 0; i < candidates.length; i++) {
      var raw = String(candidates[i] || "").toLowerCase().replace(/_/g, "-");
      if (!raw) continue;
      var base = raw.split("-")[0];
      if (base === "zh" || raw.indexOf("zh") === 0) return "zh";
      if (base === "ja" || base === "jp") return "ja";
      if (SUPPORTED.indexOf(base) !== -1) return base;
    }
    return "en";
  }

  function interpolate(template, vars) {
    var text = String(template == null ? "" : template);
    if (!vars) return text;
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : "";
    });
  }

  function dictFor(lang) {
    return TRANSLATIONS[lang] || TRANSLATIONS.en;
  }

  function t(key, vars, lang) {
    var code = lang || global.__MHG_HOME_LANG || "en";
    var dict = dictFor(code);
    var value = dict[key];
    if (value == null) value = TRANSLATIONS.en[key];
    if (value == null) return key;
    return interpolate(value, vars);
  }

  function setMetaByName(name, content) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (el) el.setAttribute("content", content);
  }

  function setMetaByProperty(prop, content) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (el) el.setAttribute("content", content);
  }

  function apply(lang) {
    var code = SUPPORTED.indexOf(lang) !== -1 ? lang : resolveLang();
    var dict = dictFor(code);
    global.__MHG_HOME_LANG = code;

    document.documentElement.lang = HTML_LANG[code] || code;
    document.documentElement.setAttribute("data-home-lang", code);

    if (dict.title) document.title = dict.title;
    if (dict.description) setMetaByName("description", dict.description);
    setMetaByProperty("og:locale", OG_LOCALE[code] || "en_US");
    if (dict.ogTitle) setMetaByProperty("og:title", dict.ogTitle);
    if (dict.ogDescription) setMetaByProperty("og:description", dict.ogDescription);
    if (dict.ogImageAlt) setMetaByProperty("og:image:alt", dict.ogImageAlt);
    if (dict.twitterTitle) setMetaByName("twitter:title", dict.twitterTitle);
    if (dict.twitterDescription) setMetaByName("twitter:description", dict.twitterDescription);
    if (dict.ogImageAlt) setMetaByName("twitter:image:alt", dict.ogImageAlt);

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (!key) continue;
      var val = dict[key];
      if (val == null) val = TRANSLATIONS.en[key];
      if (val == null) continue;
      el.textContent = val;
    }

    var htmlNodes = document.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < htmlNodes.length; j++) {
      var hel = htmlNodes[j];
      var hkey = hel.getAttribute("data-i18n-html");
      if (!hkey) continue;
      var hval = dict[hkey];
      if (hval == null) hval = TRANSLATIONS.en[hkey];
      if (hval == null) continue;
      hel.innerHTML = hval;
    }

    var attrNodes = document.querySelectorAll("[data-i18n-attr]");
    for (var k = 0; k < attrNodes.length; k++) {
      var ael = attrNodes[k];
      var spec = ael.getAttribute("data-i18n-attr") || "";
      // format: "alt:logoAlt" or "title:videoTitle;aria-label:usefulLinksAria"
      var parts = spec.split(";");
      for (var p = 0; p < parts.length; p++) {
        var pair = parts[p].split(":");
        if (pair.length < 2) continue;
        var attr = pair[0].trim();
        var akey = pair.slice(1).join(":").trim();
        var aval = dict[akey];
        if (aval == null) aval = TRANSLATIONS.en[akey];
        if (aval == null) continue;
        ael.setAttribute(attr, aval);
      }
    }

    // Update JSON-LD inLanguage / descriptions when present
    try {
      var ld = document.querySelector('script[type="application/ld+json"]');
      if (ld && ld.textContent) {
        var data = JSON.parse(ld.textContent);
        var graph = data["@graph"] || [];
        for (var g = 0; g < graph.length; g++) {
          var item = graph[g];
          if (!item) continue;
          if (item["@type"] === "WebSite") {
            item.inLanguage = HTML_LANG[code] || code;
            if (dict.schemaWebsiteDescription) item.description = dict.schemaWebsiteDescription;
          }
          if (item["@type"] === "SoftwareApplication" && dict.schemaSoftwareDescription) {
            item.description = dict.schemaSoftwareDescription;
          }
        }
        ld.textContent = JSON.stringify(data);
      }
    } catch (_) {}

    document.documentElement.setAttribute("data-i18n-ready", "1");
    return code;
  }

  global.MHG_HOME_I18N = {
    SUPPORTED: SUPPORTED,
    TRANSLATIONS: TRANSLATIONS,
    resolveLang: resolveLang,
    apply: apply,
    t: t,
  };

})(typeof window !== "undefined" ? window : this);
