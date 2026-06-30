import { Language } from './api';

// Static UI copy, pre-translated into all 10 languages (Option B).
// NOTE: ja/zh/ko/ar are a v1 first pass needing native review before launch
// (see FEATURE_IDEAS.md). The app name "SportsWise" and the tagline
// "Watch and ask why." are kept in English as brand.
export interface UIStrings {
  // explanation card
  thePlay: string; whyItMatters: string; theRule: string; complexPlay: string; updated: string; latestPlay: string; playHeadlineFallback: string; gameNotStarted: string; watchNextLabel: string; liveNowLabel: string; feedbackPrompt: string; feedbackThanks: string;
  // Free-tier caps — indicators ({n} = remaining), graceful "keep going" blocked states, shared CTA.
  capLeftToday: string; capQaLeft: string; capExplainTitle: string; capExplainBody: string; capQaTitle: string; capQaBody: string; capCta: string;
  // Post-Game Recap (premium #1) — section titles, unlock CTA, empty-data fallback.
  recapEyebrow: string; recapStoryTitle: string; recapTurningPoint: string; recapKeyPerformance: string; recapWhyMattered: string; recapUnlock: string; recapAvailabilityNote: string; recapNoData: string;
  // Vision "analyze the screen" (premium #2) — entry, locked preview, capture flow, errors.
  visionTitle: string; visionLockedTitle: string; visionLockedBody: string; visionUnlock: string; visionTakePhoto: string; visionChoosePhoto: string; visionAnalyze: string; visionRetake: string; visionAnalyzing: string; visionAskPlaceholder: string; visionPermissionDenied: string; visionError: string;
  // Coach's Corner (premium #3) — free hook, unlock CTA, coming-soon, expand label, loading.
  coachHook: string; coachUnlock: string; coachComingSoon: string; coachExpand: string; coachThinking: string;
  // Soccer Match Timeline (Highlightly events) — section title + the common no-events state.
  matchTimelineTitle: string; matchTimelineEmpty: string;
  // past plays
  playByPlay: string; loadMore: string; noPlays: string; showMore: string; showLess: string; pbpHint: string;
  // follow-up + ask
  askFollowUp: string; fuWhy: string; fuRule: string; fuNew: string; fuNext: string;
  share: string; askPlaceholder: string; askLearnPlaceholder: string; askHint: string; thinking: string; answerError: string;
  // favorite alert
  favTitle: string; favMsg: string; cancel: string;
  // settings
  settings: string; secExpertise: string; secAppearance: string; secLanguage: string; secPreferences: string;
  tSystem: string; tDark: string; tLight: string;
  autoRefresh: string; autoRefreshDesc: string; gameAlerts: string; gameAlertsDesc: string; poweredBy: string;
  // expertise levels (shared by Settings + Onboarding)
  lvlKid: string; lvlKidDesc: string; lvlBeginner: string; lvlBeginnerDesc: string;
  lvlInter: string; lvlInterDesc: string; lvlExpert: string; lvlExpertDesc: string;
  // onboarding
  heroSub: string; feat1: string; feat2: string; feat3: string; getStarted: string;
  step1: string; step2: string; lvlTitle: string; lvlSub: string; sportTitle: string; sportSub: string;
  next: string; letsGo: string; back: string;
  // sport names (onboarding subs + empty state)
  spBaseball: string; spFootball: string; spBasketball: string; spHockey: string; spSoccer: string; spWorldCup: string; spRugby: string; spWnba: string; spPremierLeague: string; spLaLiga: string; spMlr: string; spTennis: string; spGolf: string; spCricket: string;
  // learn-mode empty states (tennis/golf/cricket)
  noTournaments: string; noTournamentsSub: string; noCricketData: string; noCricketDataSub: string; learnModeExplainer: string; learnModeFollowAlong: string; seasonJustEnded: string;
  // empty state ({sport} is replaced at render)
  noGames: string; selectGame: string; pullRefresh: string; offSeason: string; offSeasonSub: string; seasonTitle: string; seasonRuns: string; worldCupRuns: string;
  // my sports + app section
  mySports: string; customizeSports: string; resetDefault: string; keepOneSport: string;
  secApp: string; rateApp: string; shareApp: string; sendFeedback: string; privacyPolicy: string;
}

export const UI_STRINGS: Record<Language, UIStrings> = {
  en: {
    thePlay: `THE PLAY`, whyItMatters: `WHY IT MATTERS`, theRule: `THE RULE`, complexPlay: `COMPLEX PLAY`, updated: `Updated`, latestPlay: `Latest Play`, playHeadlineFallback: `A key play just happened`, gameNotStarted: `This game hasn't started yet`, watchNextLabel: `Watch Next`, liveNowLabel: `Live Now`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `{n} left today`, capQaLeft: `{n} questions left`, capExplainTitle: `{n} plays explored today 🎉`, capExplainBody: `Go Pro for unlimited plays + questions. Your free plays refresh tomorrow.`, capQaTitle: `{n} questions this game 🙌`, capQaBody: `Go Pro to keep asking — unlimited questions on every play. A new game gives you more.`, capCta: `Keep going with Pro →`,
    recapEyebrow: `POST-GAME RECAP`, recapStoryTitle: `THE STORY`, recapTurningPoint: `TURNING POINT`, recapKeyPerformance: `KEY PERFORMANCE`, recapWhyMattered: `WHY IT MATTERED`, recapUnlock: `🔓 Unlock the full breakdown with Pro`, recapAvailabilityNote: `Shown when the game's data supports each one.`, recapNoData: `No recap available for this game yet.`,
    visionTitle: `Analyze the screen`, visionLockedTitle: `See what's on screen, explained`, visionLockedBody: `Point your phone at the game — or pick a screenshot — and SportsWise explains what's happening and what to watch, at your level.`, visionUnlock: `🔓 Unlock with Pro`, visionTakePhoto: `📷 Take a photo`, visionChoosePhoto: `🖼️ Choose from library`, visionAnalyze: `Analyze`, visionRetake: `Retake`, visionAnalyzing: `Reading the screen…`, visionAskPlaceholder: `Ask about this image…`, visionPermissionDenied: `Camera or photo access is off. Turn it on in Settings to analyze the screen.`, visionError: `Couldn't read that image. Try another shot.`,
    coachHook: `There's a specific strategic reason for this — and it changes what to watch next.`, coachUnlock: `🔓 Unlock the read with Pro`, coachComingSoon: `Coach's Corner is coming to this sport as its data improves.`, coachExpand: `Tap for the strategic read`, coachThinking: `Reading the situation…`,
    matchTimelineTitle: `Match Timeline`, matchTimelineEmpty: `No key events yet — goals, cards and subs will appear here.`,
    playByPlay: `Play-by-Play`, loadMore: `Load more`, noPlays: `No play-by-play available for this game yet.`, showMore: `Show more`, showLess: `Show less`, pbpHint: `Tap any play to explain it · ● scoring play`,
    askFollowUp: `Ask a follow-up`, fuWhy: `Why it mattered`, fuRule: `Explain the rule`, fuNew: `Explain like I'm new`, fuNext: `What's next?`,
    share: `Share`, askPlaceholder: `Ask anything about this play…`, askLearnPlaceholder: `Ask anything about {sport}…`, askHint: `Confused by something the announcer said? Ask anything.`, thinking: `Thinking…`, answerError: `Could not get an answer. Try again.`,
    favTitle: `Favorite a Team`, favMsg: `Which team do you want to follow?`, cancel: `Cancel`,
    settings: `Settings`, secExpertise: `EXPERTISE LEVEL`, secAppearance: `APPEARANCE`, secLanguage: `LANGUAGE`, secPreferences: `PREFERENCES`,
    tSystem: `System`, tDark: `Dark`, tLight: `Light`,
    autoRefresh: `Auto-Refresh`, autoRefreshDesc: `Update every 60 seconds`, gameAlerts: `Game Alerts`, gameAlertsDesc: `Notify me when favorite teams play`, poweredBy: `Powered by Groq + ESPN`,
    lvlKid: `Rookie`, lvlKidDesc: `Simple analogies, zero jargon`, lvlBeginner: `Beginner`, lvlBeginnerDesc: `New fan friendly`,
    lvlInter: `Intermediate`, lvlInterDesc: `Regular viewer`, lvlExpert: `Expert`, lvlExpertDesc: `Coaching-level analysis`,
    heroSub: `Never feel lost watching sports again.\nWe explain every play, in real time,\nat your level.`,
    feat1: `Live game explanations as they happen`, feat2: `Powered by AI — not just stats`, feat3: `Your level: Rookie to Coaching-level Expert`, getStarted: `Get Started`,
    step1: `Step 1 of 2`, step2: `Step 2 of 2`, lvlTitle: `How do you watch sports?`, lvlSub: `You can always change this in Settings.`, sportTitle: `What's your sport?`, sportSub: `We'll open here by default.`,
    next: `Next`, letsGo: `Let's Go`, back: `Back`,
    spBaseball: `Baseball`, spFootball: `Football`, spBasketball: `Basketball`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `World Cup`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `No {sport} games today`, selectGame: `Select a game above for an explanation`, pullRefresh: `Pull down to refresh or check back later.`, offSeason: `{sport} is in the off-season`, offSeasonSub: `Check back when the season starts.`, seasonTitle: `No {sport} games right now.`, seasonRuns: `The season runs {start} to {end} — check back then!`, worldCupRuns: `The tournament runs every 4 years — check back for the next one!`,
    mySports: `My Sports`, customizeSports: `Customize My Sports`, resetDefault: `Reset to Default`, keepOneSport: `Keep at least one sport visible`, secApp: `APP`, rateApp: `Rate SportsWise`, shareApp: `Share SportsWise`, sendFeedback: `Send Feedback`, privacyPolicy: `Privacy Policy`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `No tournaments this week.`, noTournamentsSub: `Check back soon.`, noCricketData: `No live cricket right now.`, noCricketDataSub: `Ask anything about the sport below.`, learnModeExplainer: `No live games right now — explore the sport and ask anything below.`, learnModeFollowAlong: `Follow along and ask anything below.`, seasonJustEnded: `No {sport} games right now — check back next season.`,
  },

  es: {
    thePlay: `LA JUGADA`, whyItMatters: `POR QUÉ IMPORTA`, theRule: `LA REGLA`, complexPlay: `JUGADA COMPLEJA`, updated: `Actualizado`, latestPlay: `Última jugada`, playHeadlineFallback: `Acaba de ocurrir una jugada clave`, gameNotStarted: `Este partido aún no ha comenzado`, watchNextLabel: `Para ver`, liveNowLabel: `En vivo ahora`, feedbackPrompt: `¿Te ayudó a aprender? (toca el foco)`, feedbackThanks: `¡Gracias, me alegra que esto te ayudara!`,
    capLeftToday: `{n} restantes hoy`, capQaLeft: `{n} preguntas restantes`, capExplainTitle: `{n} jugadas exploradas hoy 🎉`, capExplainBody: `Hazte Pro para jugadas y preguntas ilimitadas. Tus jugadas gratis se renuevan mañana.`, capQaTitle: `{n} preguntas en este partido 🙌`, capQaBody: `Hazte Pro para seguir preguntando: preguntas ilimitadas en cada jugada. Un nuevo partido te da más.`, capCta: `Continúa con Pro →`,
    recapEyebrow: `RESUMEN DEL PARTIDO`, recapStoryTitle: `LA HISTORIA`, recapTurningPoint: `MOMENTO CLAVE`, recapKeyPerformance: `ACTUACIÓN DESTACADA`, recapWhyMattered: `POR QUÉ IMPORTÓ`, recapUnlock: `🔓 Desbloquea el análisis completo con Pro`, recapAvailabilityNote: `Se muestran cuando los datos del partido lo permiten.`, recapNoData: `Aún no hay resumen para este partido.`,
    visionTitle: `Analiza la pantalla`, visionLockedTitle: `Mira qué hay en pantalla, explicado`, visionLockedBody: `Apunta tu teléfono al partido —o elige una captura— y SportsWise te explica qué pasa y qué mirar, a tu nivel.`, visionUnlock: `🔓 Desbloquear con Pro`, visionTakePhoto: `📷 Tomar una foto`, visionChoosePhoto: `🖼️ Elegir de la galería`, visionAnalyze: `Analizar`, visionRetake: `Repetir`, visionAnalyzing: `Leyendo la pantalla…`, visionAskPlaceholder: `Pregunta sobre esta imagen…`, visionPermissionDenied: `El acceso a la cámara o fotos está desactivado. Actívalo en Ajustes para analizar la pantalla.`, visionError: `No se pudo leer esa imagen. Prueba con otra toma.`,
    coachHook: `Hay una razón estratégica específica para esto, y cambia qué mirar a continuación.`, coachUnlock: `🔓 Desbloquear el análisis con Pro`, coachComingSoon: `Coach's Corner llegará a este deporte cuando mejoren sus datos.`, coachExpand: `Toca para ver el análisis estratégico`, coachThinking: `Leyendo la jugada…`,
    matchTimelineTitle: `Cronología del partido`, matchTimelineEmpty: `Aún no hay eventos clave: goles, tarjetas y cambios aparecerán aquí.`,
    playByPlay: `Jugada a jugada`, loadMore: `Cargar más`, noPlays: `Aún no hay jugada a jugada para este partido.`, showMore: `Ver más`, showLess: `Ver menos`, pbpHint: `Toca cualquier jugada para explicarla · ● jugada de anotación`,
    askFollowUp: `Haz una pregunta de seguimiento`, fuWhy: `¿Por qué importó eso?`, fuRule: `Explica la regla`, fuNew: `Explícamelo como si fuera nuevo`, fuNext: `¿Qué viene ahora?`,
    share: `Compartir`, askPlaceholder: `Pregunta lo que quieras sobre esta jugada…`, askLearnPlaceholder: `Pregunta lo que quieras sobre {sport}…`, askHint: `¿No entendiste algo que dijo el comentarista? Pregunta lo que quieras.`, thinking: `Pensando…`, answerError: `No se pudo obtener una respuesta. Inténtalo de nuevo.`,
    favTitle: `Marcar un equipo`, favMsg: `¿A qué equipo quieres seguir?`, cancel: `Cancelar`,
    settings: `Ajustes`, secExpertise: `NIVEL DE EXPERIENCIA`, secAppearance: `APARIENCIA`, secLanguage: `IDIOMA`, secPreferences: `PREFERENCIAS`,
    tSystem: `Sistema`, tDark: `Oscuro`, tLight: `Claro`,
    autoRefresh: `Actualización automática`, autoRefreshDesc: `Actualizar cada 60 segundos`, gameAlerts: `Alertas de partidos`, gameAlertsDesc: `Avísame cuando jueguen mis equipos favoritos`, poweredBy: `Con tecnología de Groq + ESPN`,
    lvlKid: `Novato`, lvlKidDesc: `Analogías simples, cero jerga`, lvlBeginner: `Principiante`, lvlBeginnerDesc: `Ideal para nuevos aficionados`,
    lvlInter: `Intermedio`, lvlInterDesc: `Espectador habitual`, lvlExpert: `Experto`, lvlExpertDesc: `Análisis a nivel de entrenador`,
    heroSub: `Nunca vuelvas a sentirte perdido viendo deportes.\nExplicamos cada jugada, en tiempo real,\na tu nivel.`,
    feat1: `Explicaciones de los partidos en directo`, feat2: `Impulsado por IA, no solo estadísticas`, feat3: `Tu nivel: de Novato a Experto`, getStarted: `Empezar`,
    step1: `Paso 1 de 2`, step2: `Paso 2 de 2`, lvlTitle: `¿Cómo ves los deportes?`, lvlSub: `Siempre puedes cambiarlo en Ajustes.`, sportTitle: `¿Cuál es tu deporte?`, sportSub: `Abriremos aquí por defecto.`,
    next: `Siguiente`, letsGo: `Vamos`, back: `Atrás`,
    spBaseball: `Béisbol`, spFootball: `Fútbol americano`, spBasketball: `Baloncesto`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `Mundial`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `No hay partidos de {sport} hoy`, selectGame: `Selecciona un partido arriba para ver una explicación`, pullRefresh: `Desliza hacia abajo para actualizar o vuelve más tarde.`, offSeason: `{sport} está en temporada baja`, offSeasonSub: `Vuelve cuando empiece la temporada.`, seasonTitle: `No hay partidos de {sport} en este momento.`, seasonRuns: `La temporada va de {start} a {end}: ¡vuelve entonces!`, worldCupRuns: `El torneo se juega cada 4 años: ¡vuelve para el próximo!`,
    mySports: `Mis deportes`, customizeSports: `Personalizar mis deportes`, resetDefault: `Restablecer`, keepOneSport: `Mantén al menos un deporte visible`, secApp: `APLICACIÓN`, rateApp: `Califica SportsWise`, shareApp: `Compartir SportsWise`, sendFeedback: `Enviar comentarios`, privacyPolicy: `Política de privacidad`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `No hay torneos esta semana.`, noTournamentsSub: `Vuelve pronto.`, noCricketData: `No hay críquet en vivo ahora mismo.`, noCricketDataSub: `Pregunta lo que quieras sobre el deporte abajo.`, learnModeExplainer: `No hay partidos en vivo ahora mismo: explora el deporte y pregunta lo que quieras abajo.`, learnModeFollowAlong: `Sigue el torneo y pregunta lo que quieras abajo.`, seasonJustEnded: `No hay partidos de {sport} ahora mismo: vuelve la próxima temporada.`,
  },

  fr: {
    thePlay: `L'ACTION`, whyItMatters: `POURQUOI C'EST IMPORTANT`, theRule: `LA RÈGLE`, complexPlay: `ACTION COMPLEXE`, updated: `Mis à jour`, latestPlay: `Dernière action`, playHeadlineFallback: `Une action clé vient de se produire`, gameNotStarted: `Ce match n'a pas encore commencé`, watchNextLabel: `À suivre`, liveNowLabel: `En direct`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `{n} restantes aujourd'hui`, capQaLeft: `{n} questions restantes`, capExplainTitle: `{n} actions explorées aujourd'hui 🎉`, capExplainBody: `Passez à Pro pour des actions et questions illimitées. Vos actions gratuites se renouvellent demain.`, capQaTitle: `{n} questions ce match 🙌`, capQaBody: `Passez à Pro pour continuer à poser des questions — illimitées sur chaque action. Un nouveau match vous en donne plus.`, capCta: `Continuer avec Pro →`,
    recapEyebrow: `APRÈS-MATCH`, recapStoryTitle: `L'HISTOIRE`, recapTurningPoint: `LE TOURNANT`, recapKeyPerformance: `PERFORMANCE CLÉ`, recapWhyMattered: `POURQUOI C'ÉTAIT IMPORTANT`, recapUnlock: `🔓 Débloque l'analyse complète avec Pro`, recapAvailabilityNote: `Affichés quand les données du match le permettent.`, recapNoData: `Pas encore de résumé pour ce match.`,
    visionTitle: `Analyser l'écran`, visionLockedTitle: `Voyez ce qui est à l'écran, expliqué`, visionLockedBody: `Pointez votre téléphone vers le match — ou choisissez une capture — et SportsWise explique ce qu'il se passe et quoi regarder, à votre niveau.`, visionUnlock: `🔓 Débloquer avec Pro`, visionTakePhoto: `📷 Prendre une photo`, visionChoosePhoto: `🖼️ Choisir dans la galerie`, visionAnalyze: `Analyser`, visionRetake: `Reprendre`, visionAnalyzing: `Lecture de l'écran…`, visionAskPlaceholder: `Posez une question sur cette image…`, visionPermissionDenied: `L'accès à la caméra ou aux photos est désactivé. Activez-le dans Réglages pour analyser l'écran.`, visionError: `Impossible de lire cette image. Essayez une autre photo.`,
    coachHook: `Il y a une raison stratégique précise à cela — et elle change ce qu'il faut regarder ensuite.`, coachUnlock: `🔓 Débloquer l'analyse avec Pro`, coachComingSoon: `Coach's Corner arrivera sur ce sport quand ses données s'amélioreront.`, coachExpand: `Touchez pour l'analyse stratégique`, coachThinking: `Lecture de la situation…`,
    matchTimelineTitle: `Chronologie du match`, matchTimelineEmpty: `Pas encore d'événements clés — buts, cartons et remplacements apparaîtront ici.`,
    playByPlay: `Action par action`, loadMore: `Charger plus`, noPlays: `Pas encore d'action par action pour ce match.`, showMore: `Voir plus`, showLess: `Voir moins`, pbpHint: `Touchez une action pour l'expliquer · ● action décisive`,
    askFollowUp: `Poser une question`, fuWhy: `Pourquoi est-ce important ?`, fuRule: `Explique la règle`, fuNew: `Explique comme à un débutant`, fuNext: `Que faut-il surveiller ?`,
    share: `Partager`, askPlaceholder: `Pose une question sur cette action…`, askLearnPlaceholder: `Pose une question sur {sport}…`, askHint: `Une phrase du commentateur vous échappe ? Posez n'importe quelle question.`, thinking: `Réflexion…`, answerError: `Impossible d'obtenir une réponse. Réessaie.`,
    favTitle: `Suivre une équipe`, favMsg: `Quelle équipe veux-tu suivre ?`, cancel: `Annuler`,
    settings: `Paramètres`, secExpertise: `NIVEAU`, secAppearance: `APPARENCE`, secLanguage: `LANGUE`, secPreferences: `PRÉFÉRENCES`,
    tSystem: `Système`, tDark: `Sombre`, tLight: `Clair`,
    autoRefresh: `Actualisation auto`, autoRefreshDesc: `Mise à jour toutes les 60 secondes`, gameAlerts: `Alertes de match`, gameAlertsDesc: `Me prévenir quand mes équipes jouent`, poweredBy: `Propulsé par Groq + ESPN`,
    lvlKid: `Recrue`, lvlKidDesc: `Analogies simples, zéro jargon`, lvlBeginner: `Débutant`, lvlBeginnerDesc: `Idéal pour les nouveaux fans`,
    lvlInter: `Intermédiaire`, lvlInterDesc: `Spectateur régulier`, lvlExpert: `Expert`, lvlExpertDesc: `Analyse niveau entraîneur`,
    heroSub: `Ne soyez plus jamais perdu devant le sport.\nNous expliquons chaque action, en direct,\nà votre niveau.`,
    feat1: `Explications des matchs en direct`, feat2: `Propulsé par l'IA, pas que des stats`, feat3: `Votre niveau : de Recrue à Expert`, getStarted: `Commencer`,
    step1: `Étape 1 sur 2`, step2: `Étape 2 sur 2`, lvlTitle: `Comment regardez-vous le sport ?`, lvlSub: `Vous pouvez changer cela dans les Paramètres.`, sportTitle: `Quel est votre sport ?`, sportSub: `Nous ouvrirons ici par défaut.`,
    next: `Suivant`, letsGo: `C'est parti`, back: `Retour`,
    spBaseball: `Baseball`, spFootball: `Football américain`, spBasketball: `Basket-ball`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `Coupe du Monde`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Aucun match de {sport} aujourd'hui`, selectGame: `Sélectionnez un match ci-dessus pour une explication`, pullRefresh: `Tirez vers le bas pour actualiser ou revenez plus tard.`, offSeason: `{sport} est en intersaison`, offSeasonSub: `Revenez au début de la saison.`, seasonTitle: `Aucun match de {sport} pour le moment.`, seasonRuns: `La saison va de {start} à {end} — revenez à ce moment-là !`, worldCupRuns: `Le tournoi a lieu tous les 4 ans — revenez pour le prochain !`,
    mySports: `Mes sports`, customizeSports: `Personnaliser mes sports`, resetDefault: `Réinitialiser`, keepOneSport: `Gardez au moins un sport visible`, secApp: `APPLICATION`, rateApp: `Noter SportsWise`, shareApp: `Partager SportsWise`, sendFeedback: `Envoyer un commentaire`, privacyPolicy: `Politique de confidentialité`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Aucun tournoi cette semaine.`, noTournamentsSub: `Revenez bientôt.`, noCricketData: `Pas de cricket en direct pour le moment.`, noCricketDataSub: `Posez vos questions sur ce sport ci-dessous.`, learnModeExplainer: `Aucun match en direct pour le moment — explorez le sport et posez vos questions ci-dessous.`, learnModeFollowAlong: `Suivez le tournoi et posez vos questions ci-dessous.`, seasonJustEnded: `Aucun match de {sport} pour le moment — revenez la saison prochaine.`,
  },

  pt: {
    thePlay: `A JOGADA`, whyItMatters: `POR QUE IMPORTA`, theRule: `A REGRA`, complexPlay: `JOGADA COMPLEXA`, updated: `Atualizado`, latestPlay: `Última jogada`, playHeadlineFallback: `Uma jogada importante acabou de acontecer`, gameNotStarted: `Este jogo ainda não começou`, watchNextLabel: `Assista a seguir`, liveNowLabel: `Ao vivo agora`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `{n} restantes hoje`, capQaLeft: `{n} perguntas restantes`, capExplainTitle: `{n} jogadas exploradas hoje 🎉`, capExplainBody: `Seja Pro para jogadas e perguntas ilimitadas. Suas jogadas grátis renovam amanhã.`, capQaTitle: `{n} perguntas neste jogo 🙌`, capQaBody: `Seja Pro para continuar perguntando — perguntas ilimitadas em cada jogada. Um novo jogo dá mais.`, capCta: `Continue com o Pro →`,
    recapEyebrow: `PÓS-JOGO`, recapStoryTitle: `A HISTÓRIA`, recapTurningPoint: `A VIRADA`, recapKeyPerformance: `DESTAQUE`, recapWhyMattered: `POR QUE IMPORTOU`, recapUnlock: `🔓 Desbloqueie a análise completa com o Pro`, recapAvailabilityNote: `Exibidos quando os dados do jogo permitem.`, recapNoData: `Ainda não há resumo para este jogo.`,
    visionTitle: `Analisar a tela`, visionLockedTitle: `Veja o que está na tela, explicado`, visionLockedBody: `Aponte o celular para o jogo — ou escolha uma captura — e o SportsWise explica o que está acontecendo e o que observar, no seu nível.`, visionUnlock: `🔓 Desbloquear com o Pro`, visionTakePhoto: `📷 Tirar uma foto`, visionChoosePhoto: `🖼️ Escolher da galeria`, visionAnalyze: `Analisar`, visionRetake: `Refazer`, visionAnalyzing: `Lendo a tela…`, visionAskPlaceholder: `Pergunte sobre esta imagem…`, visionPermissionDenied: `O acesso à câmera ou fotos está desativado. Ative em Ajustes para analisar a tela.`, visionError: `Não foi possível ler essa imagem. Tente outra foto.`,
    coachHook: `Há um motivo estratégico específico para isso — e muda o que observar a seguir.`, coachUnlock: `🔓 Desbloquear a análise com o Pro`, coachComingSoon: `O Coach's Corner chegará a este esporte conforme os dados melhorarem.`, coachExpand: `Toque para ver a análise estratégica`, coachThinking: `Lendo a jogada…`,
    matchTimelineTitle: `Linha do tempo da partida`, matchTimelineEmpty: `Ainda sem eventos-chave — gols, cartões e substituições aparecerão aqui.`,
    playByPlay: `Lance a lance`, loadMore: `Carregar mais`, noPlays: `Ainda não há lance a lance para este jogo.`, showMore: `Mostrar mais`, showLess: `Mostrar menos`, pbpHint: `Toque em qualquer jogada para explicá-la · ● jogada de pontuação`,
    askFollowUp: `Faça uma pergunta`, fuWhy: `Por que isso importou?`, fuRule: `Explique a regra`, fuNew: `Explique como se eu fosse novo`, fuNext: `O que observar a seguir?`,
    share: `Compartilhar`, askPlaceholder: `Pergunte qualquer coisa sobre esta jogada…`, askLearnPlaceholder: `Pergunte qualquer coisa sobre {sport}…`, askHint: `Não entendeu algo que o locutor disse? Pergunte o que quiser.`, thinking: `Pensando…`, answerError: `Não foi possível obter uma resposta. Tente novamente.`,
    favTitle: `Favoritar um time`, favMsg: `Qual time você quer seguir?`, cancel: `Cancelar`,
    settings: `Configurações`, secExpertise: `NÍVEL`, secAppearance: `APARÊNCIA`, secLanguage: `IDIOMA`, secPreferences: `PREFERÊNCIAS`,
    tSystem: `Sistema`, tDark: `Escuro`, tLight: `Claro`,
    autoRefresh: `Atualização automática`, autoRefreshDesc: `Atualizar a cada 60 segundos`, gameAlerts: `Alertas de jogos`, gameAlertsDesc: `Avise-me quando meus times jogarem`, poweredBy: `Desenvolvido com Groq + ESPN`,
    lvlKid: `Novato`, lvlKidDesc: `Analogias simples, zero jargão`, lvlBeginner: `Iniciante`, lvlBeginnerDesc: `Ideal para novos fãs`,
    lvlInter: `Intermediário`, lvlInterDesc: `Espectador regular`, lvlExpert: `Especialista`, lvlExpertDesc: `Análise nível de treinador`,
    heroSub: `Nunca mais se sinta perdido assistindo esportes.\nExplicamos cada jogada, em tempo real,\nno seu nível.`,
    feat1: `Explicações dos jogos ao vivo`, feat2: `Movido por IA, não só estatísticas`, feat3: `Seu nível: de Novato a Especialista`, getStarted: `Começar`,
    step1: `Etapa 1 de 2`, step2: `Etapa 2 de 2`, lvlTitle: `Como você assiste esportes?`, lvlSub: `Você pode mudar isso nas Configurações.`, sportTitle: `Qual é o seu esporte?`, sportSub: `Abriremos aqui por padrão.`,
    next: `Próximo`, letsGo: `Vamos`, back: `Voltar`,
    spBaseball: `Beisebol`, spFootball: `Futebol americano`, spBasketball: `Basquete`, spHockey: `Hóquei`, spSoccer: `MLS`, spWorldCup: `Copa do Mundo`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Nenhum jogo de {sport} hoje`, selectGame: `Selecione um jogo acima para ver uma explicação`, pullRefresh: `Puxe para baixo para atualizar ou volte mais tarde.`, offSeason: `{sport} está na pré-temporada`, offSeasonSub: `Volte quando a temporada começar.`, seasonTitle: `Nenhum jogo de {sport} no momento.`, seasonRuns: `A temporada vai de {start} a {end} — volte nessa época!`, worldCupRuns: `O torneio acontece a cada 4 anos — volte para o próximo!`,
    mySports: `Meus esportes`, customizeSports: `Personalizar meus esportes`, resetDefault: `Redefinir`, keepOneSport: `Mantenha pelo menos um esporte visível`, secApp: `APLICATIVO`, rateApp: `Avaliar o SportsWise`, shareApp: `Compartilhar o SportsWise`, sendFeedback: `Enviar feedback`, privacyPolicy: `Política de privacidade`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Nenhum torneio esta semana.`, noTournamentsSub: `Volte em breve.`, noCricketData: `Sem críquete ao vivo agora.`, noCricketDataSub: `Pergunte o que quiser sobre o esporte abaixo.`, learnModeExplainer: `Nenhum jogo ao vivo no momento — explore o esporte e pergunte o que quiser abaixo.`, learnModeFollowAlong: `Acompanhe e pergunte o que quiser abaixo.`, seasonJustEnded: `Nenhum jogo de {sport} no momento — volte na próxima temporada.`,
  },

  de: {
    thePlay: `DER SPIELZUG`, whyItMatters: `WARUM ES ZÄHLT`, theRule: `DIE REGEL`, complexPlay: `KOMPLEXER SPIELZUG`, updated: `Aktualisiert`, latestPlay: `Letzter Spielzug`, playHeadlineFallback: `Gerade ist ein wichtiger Spielzug passiert`, gameNotStarted: `Dieses Spiel hat noch nicht begonnen`, watchNextLabel: `Als Nächstes`, liveNowLabel: `Jetzt live`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `Noch {n} heute`, capQaLeft: `{n} Fragen übrig`, capExplainTitle: `{n} Spielzüge heute erkundet 🎉`, capExplainBody: `Hol dir Pro für unbegrenzte Spielzüge und Fragen. Deine Gratis-Spielzüge gibt es morgen wieder.`, capQaTitle: `{n} Fragen in diesem Spiel 🙌`, capQaBody: `Hol dir Pro, um weiter zu fragen — unbegrenzte Fragen zu jedem Spielzug. Ein neues Spiel gibt dir mehr.`, capCta: `Mit Pro weitermachen →`,
    recapEyebrow: `SPIELBERICHT`, recapStoryTitle: `DIE GESCHICHTE`, recapTurningPoint: `WENDEPUNKT`, recapKeyPerformance: `TOP-LEISTUNG`, recapWhyMattered: `WARUM ES WICHTIG WAR`, recapUnlock: `🔓 Die ganze Analyse mit Pro freischalten`, recapAvailabilityNote: `Werden angezeigt, wenn die Spieldaten es zulassen.`, recapNoData: `Noch kein Bericht für dieses Spiel.`,
    visionTitle: `Bildschirm analysieren`, visionLockedTitle: `Sieh, was auf dem Bildschirm passiert — erklärt`, visionLockedBody: `Richte dein Handy auf das Spiel — oder wähle einen Screenshot — und SportsWise erklärt, was passiert und worauf du achten solltest, auf deinem Niveau.`, visionUnlock: `🔓 Mit Pro freischalten`, visionTakePhoto: `📷 Foto aufnehmen`, visionChoosePhoto: `🖼️ Aus Galerie wählen`, visionAnalyze: `Analysieren`, visionRetake: `Wiederholen`, visionAnalyzing: `Bildschirm wird gelesen…`, visionAskPlaceholder: `Frag etwas zu diesem Bild…`, visionPermissionDenied: `Kamera- oder Fotozugriff ist aus. Aktiviere ihn in den Einstellungen, um den Bildschirm zu analysieren.`, visionError: `Dieses Bild konnte nicht gelesen werden. Versuch eine andere Aufnahme.`,
    coachHook: `Dahinter steckt ein konkreter strategischer Grund — und er ändert, worauf du als Nächstes achten solltest.`, coachUnlock: `🔓 Analyse mit Pro freischalten`, coachComingSoon: `Coach's Corner kommt zu dieser Sportart, sobald die Daten besser werden.`, coachExpand: `Tippen für die strategische Analyse`, coachThinking: `Situation wird gelesen…`,
    matchTimelineTitle: `Spielverlauf`, matchTimelineEmpty: `Noch keine Schlüsselereignisse — Tore, Karten und Wechsel erscheinen hier.`,
    playByPlay: `Zug für Zug`, loadMore: `Mehr laden`, noPlays: `Für dieses Spiel ist noch kein Zug-für-Zug verfügbar.`, showMore: `Mehr anzeigen`, showLess: `Weniger anzeigen`, pbpHint: `Tippe auf einen Spielzug für die Erklärung · ● Punktespielzug`,
    askFollowUp: `Stell eine Nachfrage`, fuWhy: `Warum war das wichtig?`, fuRule: `Erkläre die Regel`, fuNew: `Erkläre es für Einsteiger`, fuNext: `Worauf sollte ich als Nächstes achten?`,
    share: `Teilen`, askPlaceholder: `Frag alles zu diesem Spielzug…`, askLearnPlaceholder: `Frag alles über {sport}…`, askHint: `Etwas vom Kommentator nicht verstanden? Frag einfach.`, thinking: `Denkt nach…`, answerError: `Antwort konnte nicht geladen werden. Versuch es erneut.`,
    favTitle: `Team favorisieren`, favMsg: `Welchem Team möchtest du folgen?`, cancel: `Abbrechen`,
    settings: `Einstellungen`, secExpertise: `NIVEAU`, secAppearance: `ERSCHEINUNGSBILD`, secLanguage: `SPRACHE`, secPreferences: `EINSTELLUNGEN`,
    tSystem: `System`, tDark: `Dunkel`, tLight: `Hell`,
    autoRefresh: `Auto-Aktualisierung`, autoRefreshDesc: `Alle 60 Sekunden aktualisieren`, gameAlerts: `Spiel-Benachrichtigungen`, gameAlertsDesc: `Benachrichtige mich, wenn meine Teams spielen`, poweredBy: `Unterstützt von Groq + ESPN`,
    lvlKid: `Neuling`, lvlKidDesc: `Einfache Vergleiche, kein Fachjargon`, lvlBeginner: `Einsteiger`, lvlBeginnerDesc: `Für neue Fans`,
    lvlInter: `Fortgeschritten`, lvlInterDesc: `Regelmäßiger Zuschauer`, lvlExpert: `Experte`, lvlExpertDesc: `Analyse auf Trainerniveau`,
    heroSub: `Fühl dich beim Sport nie wieder verloren.\nWir erklären jeden Spielzug, in Echtzeit,\nauf deinem Niveau.`,
    feat1: `Live-Erklärungen während des Spiels`, feat2: `KI-gestützt, nicht nur Statistik`, feat3: `Dein Niveau: vom Neuling bis zum Experten`, getStarted: `Loslegen`,
    step1: `Schritt 1 von 2`, step2: `Schritt 2 von 2`, lvlTitle: `Wie schaust du Sport?`, lvlSub: `Du kannst das jederzeit in den Einstellungen ändern.`, sportTitle: `Was ist deine Sportart?`, sportSub: `Wir öffnen standardmäßig hier.`,
    next: `Weiter`, letsGo: `Los geht's`, back: `Zurück`,
    spBaseball: `Baseball`, spFootball: `American Football`, spBasketball: `Basketball`, spHockey: `Eishockey`, spSoccer: `MLS`, spWorldCup: `WM`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Heute keine {sport}-Spiele`, selectGame: `Wähle oben ein Spiel für eine Erklärung`, pullRefresh: `Zum Aktualisieren nach unten ziehen oder später wiederkommen.`, offSeason: `{sport} ist in der Saisonpause`, offSeasonSub: `Schau zum Saisonstart wieder vorbei.`, seasonTitle: `Gerade keine {sport}-Spiele.`, seasonRuns: `Die Saison läuft von {start} bis {end} — schau dann wieder vorbei!`, worldCupRuns: `Das Turnier findet alle 4 Jahre statt — schau beim nächsten wieder vorbei!`,
    mySports: `Meine Sportarten`, customizeSports: `Meine Sportarten anpassen`, resetDefault: `Zurücksetzen`, keepOneSport: `Mindestens eine Sportart sichtbar lassen`, secApp: `APP`, rateApp: `SportsWise bewerten`, shareApp: `SportsWise teilen`, sendFeedback: `Feedback senden`, privacyPolicy: `Datenschutzrichtlinie`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Diese Woche keine Turniere.`, noTournamentsSub: `Schau bald wieder vorbei.`, noCricketData: `Gerade kein Live-Cricket.`, noCricketDataSub: `Frag unten alles über die Sportart.`, learnModeExplainer: `Gerade keine Live-Spiele — entdecke die Sportart und frag unten alles.`, learnModeFollowAlong: `Verfolge das Turnier und frag unten alles.`, seasonJustEnded: `Gerade keine {sport}-Spiele — schau nächste Saison wieder vorbei.`,
  },

  it: {
    thePlay: `L'AZIONE`, whyItMatters: `PERCHÉ CONTA`, theRule: `LA REGOLA`, complexPlay: `AZIONE COMPLESSA`, updated: `Aggiornato`, latestPlay: `Ultima azione`, playHeadlineFallback: `È appena successa un'azione chiave`, gameNotStarted: `Questa partita non è ancora iniziata`, watchNextLabel: `Da vedere`, liveNowLabel: `Ora in diretta`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `{n} rimaste oggi`, capQaLeft: `{n} domande rimaste`, capExplainTitle: `{n} azioni esplorate oggi 🎉`, capExplainBody: `Passa a Pro per azioni e domande illimitate. Le tue azioni gratis si rinnovano domani.`, capQaTitle: `{n} domande in questa partita 🙌`, capQaBody: `Passa a Pro per continuare a chiedere — domande illimitate su ogni azione. Una nuova partita te ne dà altre.`, capCta: `Continua con Pro →`,
    recapEyebrow: `DOPO-PARTITA`, recapStoryTitle: `LA STORIA`, recapTurningPoint: `LA SVOLTA`, recapKeyPerformance: `PRESTAZIONE CHIAVE`, recapWhyMattered: `PERCHÉ HA CONTATO`, recapUnlock: `🔓 Sblocca l'analisi completa con Pro`, recapAvailabilityNote: `Mostrati quando i dati della partita lo consentono.`, recapNoData: `Ancora nessun resoconto per questa partita.`,
    visionTitle: `Analizza lo schermo`, visionLockedTitle: `Scopri cosa c'è sullo schermo, spiegato`, visionLockedBody: `Punta il telefono sulla partita — o scegli uno screenshot — e SportsWise spiega cosa succede e cosa guardare, al tuo livello.`, visionUnlock: `🔓 Sblocca con Pro`, visionTakePhoto: `📷 Scatta una foto`, visionChoosePhoto: `🖼️ Scegli dalla galleria`, visionAnalyze: `Analizza`, visionRetake: `Riprova`, visionAnalyzing: `Lettura dello schermo…`, visionAskPlaceholder: `Fai una domanda su questa immagine…`, visionPermissionDenied: `L'accesso a fotocamera o foto è disattivato. Attivalo in Impostazioni per analizzare lo schermo.`, visionError: `Impossibile leggere l'immagine. Prova con un altro scatto.`,
    coachHook: `C'è un motivo strategico preciso dietro questo — e cambia cosa guardare dopo.`, coachUnlock: `🔓 Sblocca l'analisi con Pro`, coachComingSoon: `Coach's Corner arriverà su questo sport quando i dati miglioreranno.`, coachExpand: `Tocca per l'analisi strategica`, coachThinking: `Lettura della situazione…`,
    matchTimelineTitle: `Cronologia della partita`, matchTimelineEmpty: `Ancora nessun evento chiave — gol, cartellini e cambi appariranno qui.`,
    playByPlay: `Azione per azione`, loadMore: `Carica altro`, noPlays: `Non c'è ancora l'azione per azione per questa partita.`, showMore: `Mostra altro`, showLess: `Mostra meno`, pbpHint: `Tocca un'azione per spiegarla · ● azione da punto`,
    askFollowUp: `Fai una domanda`, fuWhy: `Perché è stato importante?`, fuRule: `Spiega la regola`, fuNew: `Spiegamelo come a un principiante`, fuNext: `Cosa guardare adesso?`,
    share: `Condividi`, askPlaceholder: `Chiedi qualsiasi cosa su questa azione…`, askLearnPlaceholder: `Chiedi qualsiasi cosa su {sport}…`, askHint: `Non hai capito qualcosa detto dal telecronista? Chiedi pure.`, thinking: `Sto pensando…`, answerError: `Impossibile ottenere una risposta. Riprova.`,
    favTitle: `Aggiungi una squadra`, favMsg: `Quale squadra vuoi seguire?`, cancel: `Annulla`,
    settings: `Impostazioni`, secExpertise: `LIVELLO`, secAppearance: `ASPETTO`, secLanguage: `LINGUA`, secPreferences: `PREFERENZE`,
    tSystem: `Sistema`, tDark: `Scuro`, tLight: `Chiaro`,
    autoRefresh: `Aggiornamento automatico`, autoRefreshDesc: `Aggiorna ogni 60 secondi`, gameAlerts: `Avvisi partite`, gameAlertsDesc: `Avvisami quando giocano le mie squadre`, poweredBy: `Realizzato con Groq + ESPN`,
    lvlKid: `Esordiente`, lvlKidDesc: `Analogie semplici, zero gergo`, lvlBeginner: `Principiante`, lvlBeginnerDesc: `Per i nuovi tifosi`,
    lvlInter: `Intermedio`, lvlInterDesc: `Spettatore abituale`, lvlExpert: `Esperto`, lvlExpertDesc: `Analisi da allenatore`,
    heroSub: `Non sentirti mai più perso guardando lo sport.\nSpieghiamo ogni azione, in tempo reale,\nal tuo livello.`,
    feat1: `Spiegazioni delle partite in diretta`, feat2: `Basato sull'IA, non solo statistiche`, feat3: `Il tuo livello: da Esordiente a Esperto`, getStarted: `Inizia`,
    step1: `Passo 1 di 2`, step2: `Passo 2 di 2`, lvlTitle: `Come guardi lo sport?`, lvlSub: `Puoi sempre cambiarlo nelle Impostazioni.`, sportTitle: `Qual è il tuo sport?`, sportSub: `Apriremo qui per impostazione predefinita.`,
    next: `Avanti`, letsGo: `Andiamo`, back: `Indietro`,
    spBaseball: `Baseball`, spFootball: `Football americano`, spBasketball: `Basket`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `Mondiali`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Nessuna partita di {sport} oggi`, selectGame: `Seleziona una partita sopra per una spiegazione`, pullRefresh: `Trascina verso il basso per aggiornare o torna più tardi.`, offSeason: `{sport} è in pausa stagionale`, offSeasonSub: `Torna all'inizio della stagione.`, seasonTitle: `Nessuna partita di {sport} al momento.`, seasonRuns: `La stagione va da {start} a {end} — torna in quel periodo!`, worldCupRuns: `Il torneo si gioca ogni 4 anni — torna per il prossimo!`,
    mySports: `I miei sport`, customizeSports: `Personalizza i miei sport`, resetDefault: `Ripristina`, keepOneSport: `Mantieni almeno uno sport visibile`, secApp: `APP`, rateApp: `Valuta SportsWise`, shareApp: `Condividi SportsWise`, sendFeedback: `Invia feedback`, privacyPolicy: `Informativa sulla privacy`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Nessun torneo questa settimana.`, noTournamentsSub: `Torna presto.`, noCricketData: `Nessun cricket dal vivo ora.`, noCricketDataSub: `Chiedi qualsiasi cosa sullo sport qui sotto.`, learnModeExplainer: `Nessuna partita dal vivo al momento — esplora lo sport e chiedi qualsiasi cosa qui sotto.`, learnModeFollowAlong: `Segui il torneo e chiedi qualsiasi cosa qui sotto.`, seasonJustEnded: `Nessuna partita di {sport} al momento — torna la prossima stagione.`,
  },

  ja: {
    thePlay: `プレー`, whyItMatters: `なぜ重要か`, theRule: `ルール`, complexPlay: `複雑なプレー`, updated: `更新`, latestPlay: `最新のプレー`, playHeadlineFallback: `重要なプレーがありました`, gameNotStarted: `この試合はまだ始まっていません`, watchNextLabel: `次に観る`, liveNowLabel: `今ライブ中`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `本日残り{n}回`, capQaLeft: `残り{n}問`, capExplainTitle: `今日は{n}プレーを確認 🎉`, capExplainBody: `Proなら無制限のプレーと質問。無料プレーは明日また使えます。`, capQaTitle: `この試合で{n}問 🙌`, capQaBody: `Proで質問を続けよう — どのプレーも質問し放題。新しい試合でさらに。`, capCta: `Proで続ける →`,
    recapEyebrow: `試合レビュー`, recapStoryTitle: `試合の流れ`, recapTurningPoint: `ターニングポイント`, recapKeyPerformance: `注目の活躍`, recapWhyMattered: `なぜ重要だったか`, recapUnlock: `🔓 Proで詳しい分析を解除`, recapAvailabilityNote: `試合のデータが揃ったときに表示されます。`, recapNoData: `この試合のレビューはまだありません。`,
    visionTitle: `画面を解析`, visionLockedTitle: `画面に映るものを解説`, visionLockedBody: `試合にスマホを向けるか、スクリーンショットを選ぶと、SportsWiseが今起きていることと注目点をあなたのレベルで解説します。`, visionUnlock: `🔓 Proで解除`, visionTakePhoto: `📷 写真を撮る`, visionChoosePhoto: `🖼️ ライブラリから選ぶ`, visionAnalyze: `解析する`, visionRetake: `撮り直す`, visionAnalyzing: `画面を読み取り中…`, visionAskPlaceholder: `この画像について質問…`, visionPermissionDenied: `カメラまたは写真へのアクセスがオフです。設定でオンにして画面を解析してください。`, visionError: `この画像を読み取れませんでした。別の写真をお試しください。`,
    coachHook: `これには明確な戦略的理由があり、次に見るべきものが変わります。`, coachUnlock: `🔓 Proで解説を見る`, coachComingSoon: `Coach's Cornerはデータが充実次第このスポーツに対応します。`, coachExpand: `タップして戦略解説を見る`, coachThinking: `状況を読み取り中…`,
    matchTimelineTitle: `試合タイムライン`, matchTimelineEmpty: `まだ主なイベントはありません — ゴール・カード・交代がここに表示されます。`,
    playByPlay: `プレーバイプレー`, loadMore: `もっと見る`, noPlays: `この試合のプレーバイプレーはまだありません。`, showMore: `もっと見る`, showLess: `閉じる`, pbpHint: `プレーをタップして解説 · ● 得点プレー`,
    askFollowUp: `追加で質問する`, fuWhy: `なぜ重要だったの？`, fuRule: `ルールを説明して`, fuNew: `初心者向けに説明して`, fuNext: `次は何に注目すればいい？`,
    share: `シェア`, askPlaceholder: `このプレーについて何でも質問…`, askLearnPlaceholder: `{sport}について何でも質問…`, askHint: `アナウンサーの言葉がわからない？何でも質問できます。`, thinking: `考え中…`, answerError: `回答を取得できませんでした。もう一度お試しください。`,
    favTitle: `チームをお気に入りに`, favMsg: `どのチームをフォローしますか？`, cancel: `キャンセル`,
    settings: `設定`, secExpertise: `レベル`, secAppearance: `外観`, secLanguage: `言語`, secPreferences: `環境設定`,
    tSystem: `システム`, tDark: `ダーク`, tLight: `ライト`,
    autoRefresh: `自動更新`, autoRefreshDesc: `60秒ごとに更新`, gameAlerts: `試合アラート`, gameAlertsDesc: `お気に入りチームの試合を通知`, poweredBy: `Groq + ESPN を利用`,
    lvlKid: `ルーキー`, lvlKidDesc: `わかりやすいたとえ、専門用語なし`, lvlBeginner: `初心者`, lvlBeginnerDesc: `新しいファン向け`,
    lvlInter: `中級`, lvlInterDesc: `いつも見ている人向け`, lvlExpert: `エキスパート`, lvlExpertDesc: `コーチレベルの分析`,
    heroSub: `スポーツ観戦でもう迷わない。\nすべてのプレーを、リアルタイムで、\nあなたのレベルで解説します。`,
    feat1: `試合中にライブで解説`, feat2: `統計だけでなくAIが解説`, feat3: `レベル：ルーキーからコーチ級まで`, getStarted: `はじめる`,
    step1: `ステップ 1 / 2`, step2: `ステップ 2 / 2`, lvlTitle: `スポーツをどう見ていますか？`, lvlSub: `設定でいつでも変更できます。`, sportTitle: `好きなスポーツは？`, sportSub: `デフォルトでここを開きます。`,
    next: `次へ`, letsGo: `はじめよう`, back: `戻る`,
    spBaseball: `野球`, spFootball: `アメフト`, spBasketball: `バスケットボール`, spHockey: `アイスホッケー`, spSoccer: `MLS`, spWorldCup: `ワールドカップ`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `ラ・リーガ`, spMlr: `MLR`,
    noGames: `今日は{sport}の試合がありません`, selectGame: `上の試合を選ぶと解説が表示されます`, pullRefresh: `下に引いて更新するか、後でもう一度確認してください。`, offSeason: `{sport}はオフシーズンです`, offSeasonSub: `シーズンが始まったらまた来てください。`, seasonTitle: `現在{sport}の試合はありません。`, seasonRuns: `シーズンは{start}から{end}までです。その頃にまたチェックしてください！`, worldCupRuns: `大会は4年ごとに開催されます。次回をお楽しみに！`,
    mySports: `マイスポーツ`, customizeSports: `マイスポーツを編集`, resetDefault: `デフォルトに戻す`, keepOneSport: `少なくとも1つのスポーツを表示してください`, secApp: `アプリ`, rateApp: `SportsWiseを評価`, shareApp: `SportsWiseをシェア`, sendFeedback: `フィードバックを送信`, privacyPolicy: `プライバシーポリシー`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `今週は大会がありません。`, noTournamentsSub: `またチェックしてください。`, noCricketData: `現在ライブのクリケットはありません。`, noCricketDataSub: `下でこのスポーツについて何でも質問してください。`, learnModeExplainer: `現在ライブの試合はありません。下でこのスポーツについて何でも質問してください。`, learnModeFollowAlong: `大会を観ながら、下で何でも質問してください。`, seasonJustEnded: `現在{sport}の試合はありません。来シーズンにまたチェックしてください。`,
  },

  zh: {
    thePlay: `这次进攻`, whyItMatters: `为什么重要`, theRule: `规则`, complexPlay: `复杂战术`, updated: `已更新`, latestPlay: `最新进攻`, playHeadlineFallback: `刚刚发生了一次关键进攻`, gameNotStarted: `这场比赛尚未开始`, watchNextLabel: `接下来观看`, liveNowLabel: `正在直播`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `今日还剩 {n} 次`, capQaLeft: `还剩 {n} 个问题`, capExplainTitle: `今天已了解 {n} 个回合 🎉`, capExplainBody: `升级 Pro 畅享无限回合和提问。免费次数明天刷新。`, capQaTitle: `本场比赛 {n} 个问题 🙌`, capQaBody: `升级 Pro 继续提问 — 每个回合都能无限提问。新比赛还有更多。`, capCta: `升级 Pro 继续 →`,
    recapEyebrow: `赛后回顾`, recapStoryTitle: `比赛经过`, recapTurningPoint: `转折点`, recapKeyPerformance: `关键表现`, recapWhyMattered: `为何重要`, recapUnlock: `🔓 升级 Pro 解锁完整分析`, recapAvailabilityNote: `当比赛数据支持时显示。`, recapNoData: `暂无本场比赛的回顾。`,
    visionTitle: `分析画面`, visionLockedTitle: `看懂画面里发生了什么`, visionLockedBody: `把手机对准比赛，或选择一张截图，SportsWise 会按你的水平讲解正在发生什么、该看什么。`, visionUnlock: `🔓 升级 Pro 解锁`, visionTakePhoto: `📷 拍照`, visionChoosePhoto: `🖼️ 从相册选择`, visionAnalyze: `分析`, visionRetake: `重拍`, visionAnalyzing: `正在读取画面…`, visionAskPlaceholder: `就这张图片提问…`, visionPermissionDenied: `相机或照片访问已关闭。请在设置中开启以分析画面。`, visionError: `无法读取该图片，换一张试试。`,
    coachHook: `这背后有一个具体的战术原因，而且会改变接下来该看什么。`, coachUnlock: `🔓 升级 Pro 查看解读`, coachComingSoon: `随着数据完善，Coach's Corner 将支持这项运动。`, coachExpand: `点按查看战术解读`, coachThinking: `正在解读局势…`,
    matchTimelineTitle: `比赛时间线`, matchTimelineEmpty: `暂无关键事件——进球、罚牌和换人将显示在这里。`,
    playByPlay: `逐回合`, loadMore: `加载更多`, noPlays: `本场比赛暂无逐回合记录。`, showMore: `显示更多`, showLess: `收起`, pbpHint: `点按任意回合查看解说 · ● 得分回合`,
    askFollowUp: `继续追问`, fuWhy: `这为什么重要？`, fuRule: `解释一下规则`, fuNew: `像对新手一样解释`, fuNext: `接下来该看什么？`,
    share: `分享`, askPlaceholder: `关于这次进攻，随便问…`, askLearnPlaceholder: `关于{sport}，随便问…`, askHint: `没听懂解说员说的话？随便问。`, thinking: `思考中…`, answerError: `无法获取答案，请重试。`,
    favTitle: `收藏球队`, favMsg: `你想关注哪支球队？`, cancel: `取消`,
    settings: `设置`, secExpertise: `水平`, secAppearance: `外观`, secLanguage: `语言`, secPreferences: `偏好设置`,
    tSystem: `系统`, tDark: `深色`, tLight: `浅色`,
    autoRefresh: `自动刷新`, autoRefreshDesc: `每 60 秒更新一次`, gameAlerts: `比赛提醒`, gameAlertsDesc: `我喜欢的球队比赛时通知我`, poweredBy: `由 Groq + ESPN 提供支持`,
    lvlKid: `新秀`, lvlKidDesc: `简单类比，零术语`, lvlBeginner: `新手`, lvlBeginnerDesc: `适合新球迷`,
    lvlInter: `进阶`, lvlInterDesc: `经常观看的观众`, lvlExpert: `专家`, lvlExpertDesc: `教练级分析`,
    heroSub: `看体育不再一头雾水。\n我们实时解说每一回合，\n按你的水平讲解。`,
    feat1: `比赛进行中实时解说`, feat2: `由 AI 驱动，不只是数据`, feat3: `你的水平：从新秀到教练级专家`, getStarted: `开始`,
    step1: `第 1 步，共 2 步`, step2: `第 2 步，共 2 步`, lvlTitle: `你是怎么看体育的？`, lvlSub: `你随时可以在设置中更改。`, sportTitle: `你喜欢哪项运动？`, sportSub: `默认从这里打开。`,
    next: `下一步`, letsGo: `出发`, back: `返回`,
    spBaseball: `棒球`, spFootball: `美式橄榄球`, spBasketball: `篮球`, spHockey: `冰球`, spSoccer: `MLS`, spWorldCup: `世界杯`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `西甲联赛`, spMlr: `MLR`,
    noGames: `今天没有{sport}比赛`, selectGame: `选择上面的比赛查看解说`, pullRefresh: `下拉刷新或稍后再来。`, offSeason: `{sport}正处于休赛期`, offSeasonSub: `赛季开始后再来看看。`, seasonTitle: `目前没有{sport}比赛。`, seasonRuns: `赛季为{start}至{end}，到时再来看看！`, worldCupRuns: `该赛事每4年举办一次，下次再来看看！`,
    mySports: `我的运动`, customizeSports: `自定义我的运动`, resetDefault: `恢复默认`, keepOneSport: `请至少保留一项运动`, secApp: `应用`, rateApp: `评价 SportsWise`, shareApp: `分享 SportsWise`, sendFeedback: `发送反馈`, privacyPolicy: `隐私政策`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `本周没有赛事。`, noTournamentsSub: `请稍后再来。`, noCricketData: `暂时没有板球比赛。`, noCricketDataSub: `在下方随便问关于这项运动的问题吧。`, learnModeExplainer: `目前没有实时比赛——在下方了解这项运动并随便提问。`, learnModeFollowAlong: `一边观看，一边在下方随便提问。`, seasonJustEnded: `目前没有{sport}比赛——下个赛季再来看看。`,
  },

  ko: {
    thePlay: `플레이`, whyItMatters: `왜 중요한가`, theRule: `규칙`, complexPlay: `복잡한 플레이`, updated: `업데이트됨`, latestPlay: `최신 플레이`, playHeadlineFallback: `방금 중요한 플레이가 나왔습니다`, gameNotStarted: `이 경기는 아직 시작되지 않았습니다`, watchNextLabel: `다음 경기`, liveNowLabel: `지금 라이브`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `오늘 {n}회 남음`, capQaLeft: `질문 {n}개 남음`, capExplainTitle: `오늘 {n}개 플레이 살펴봄 🎉`, capExplainBody: `Pro로 무제한 플레이와 질문을 즐기세요. 무료 플레이는 내일 다시 채워집니다.`, capQaTitle: `이 경기에서 질문 {n}개 🙌`, capQaBody: `Pro로 계속 질문하세요 — 모든 플레이에 무제한 질문. 새 경기엔 더 많이.`, capCta: `Pro로 계속하기 →`,
    recapEyebrow: `경기 리뷰`, recapStoryTitle: `경기 흐름`, recapTurningPoint: `분수령`, recapKeyPerformance: `주목할 활약`, recapWhyMattered: `왜 중요했나`, recapUnlock: `🔓 Pro로 전체 분석 잠금 해제`, recapAvailabilityNote: `경기 데이터가 충분할 때 표시됩니다.`, recapNoData: `아직 이 경기의 리뷰가 없습니다.`,
    visionTitle: `화면 분석`, visionLockedTitle: `화면에 무슨 일인지 풀어드려요`, visionLockedBody: `경기에 휴대폰을 비추거나 스크린샷을 고르면, SportsWise가 무슨 일이 벌어지는지와 무엇을 볼지 당신 수준에 맞춰 설명합니다.`, visionUnlock: `🔓 Pro로 잠금 해제`, visionTakePhoto: `📷 사진 찍기`, visionChoosePhoto: `🖼️ 라이브러리에서 선택`, visionAnalyze: `분석`, visionRetake: `다시 찍기`, visionAnalyzing: `화면을 읽는 중…`, visionAskPlaceholder: `이 이미지에 대해 질문…`, visionPermissionDenied: `카메라 또는 사진 접근이 꺼져 있습니다. 설정에서 켜고 화면을 분석하세요.`, visionError: `이미지를 읽지 못했어요. 다른 사진으로 시도해 보세요.`,
    coachHook: `여기에는 분명한 전략적 이유가 있고, 다음에 무엇을 볼지가 달라집니다.`, coachUnlock: `🔓 Pro로 분석 보기`, coachComingSoon: `데이터가 좋아지면 이 종목에도 Coach's Corner가 추가됩니다.`, coachExpand: `전략 분석을 보려면 탭하세요`, coachThinking: `상황을 읽는 중…`,
    matchTimelineTitle: `경기 타임라인`, matchTimelineEmpty: `아직 주요 이벤트가 없습니다 — 골, 카드, 교체가 여기에 표시됩니다.`,
    playByPlay: `플레이별 기록`, loadMore: `더 보기`, noPlays: `이 경기의 플레이별 기록이 아직 없습니다.`, showMore: `더 보기`, showLess: `접기`, pbpHint: `플레이를 탭하면 설명이 나와요 · ● 득점 플레이`,
    askFollowUp: `추가 질문하기`, fuWhy: `그게 왜 중요했나요?`, fuRule: `규칙을 설명해 줘`, fuNew: `초보자처럼 설명해 줘`, fuNext: `다음엔 무엇을 봐야 하나요?`,
    share: `공유`, askPlaceholder: `이 플레이에 대해 무엇이든 물어보세요…`, askLearnPlaceholder: `{sport}에 대해 무엇이든 물어보세요…`, askHint: `해설자가 한 말이 헷갈리나요? 무엇이든 물어보세요.`, thinking: `생각 중…`, answerError: `답변을 가져오지 못했습니다. 다시 시도하세요.`,
    favTitle: `팀 즐겨찾기`, favMsg: `어느 팀을 팔로우할까요?`, cancel: `취소`,
    settings: `설정`, secExpertise: `수준`, secAppearance: `화면 모드`, secLanguage: `언어`, secPreferences: `환경설정`,
    tSystem: `시스템`, tDark: `다크`, tLight: `라이트`,
    autoRefresh: `자동 새로고침`, autoRefreshDesc: `60초마다 업데이트`, gameAlerts: `경기 알림`, gameAlertsDesc: `좋아하는 팀의 경기를 알려줘요`, poweredBy: `Groq + ESPN 제공`,
    lvlKid: `루키`, lvlKidDesc: `쉬운 비유, 전문 용어 없음`, lvlBeginner: `초보자`, lvlBeginnerDesc: `새 팬에게 적합`,
    lvlInter: `중급`, lvlInterDesc: `자주 보는 시청자`, lvlExpert: `전문가`, lvlExpertDesc: `코치 수준 분석`,
    heroSub: `스포츠를 볼 때 더 이상 헤매지 마세요.\n모든 플레이를 실시간으로,\n당신의 수준에 맞게 설명해 드려요.`,
    feat1: `경기 중 실시간 해설`, feat2: `통계만이 아닌 AI 기반`, feat3: `당신의 수준: 루키부터 코치급 전문가까지`, getStarted: `시작하기`,
    step1: `2단계 중 1단계`, step2: `2단계 중 2단계`, lvlTitle: `스포츠를 어떻게 보시나요?`, lvlSub: `설정에서 언제든 바꿀 수 있어요.`, sportTitle: `어떤 스포츠를 좋아하세요?`, sportSub: `기본으로 여기서 열려요.`,
    next: `다음`, letsGo: `시작`, back: `뒤로`,
    spBaseball: `야구`, spFootball: `미식축구`, spBasketball: `농구`, spHockey: `아이스하키`, spSoccer: `MLS`, spWorldCup: `월드컵`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `라리가`, spMlr: `MLR`,
    noGames: `오늘은 {sport} 경기가 없습니다`, selectGame: `위에서 경기를 선택하면 설명이 나와요`, pullRefresh: `아래로 당겨 새로고침하거나 나중에 다시 확인하세요.`, offSeason: `{sport}은 비시즌입니다`, offSeasonSub: `시즌이 시작되면 다시 확인하세요.`, seasonTitle: `현재 {sport} 경기가 없습니다.`, seasonRuns: `시즌은 {start}부터 {end}까지입니다 — 그때 다시 확인하세요!`, worldCupRuns: `이 대회는 4년마다 열립니다 — 다음 대회를 기대해 주세요!`,
    mySports: `내 스포츠`, customizeSports: `내 스포츠 맞춤설정`, resetDefault: `기본값으로 재설정`, keepOneSport: `최소 하나의 스포츠는 표시하세요`, secApp: `앱`, rateApp: `SportsWise 평가하기`, shareApp: `SportsWise 공유하기`, sendFeedback: `피드백 보내기`, privacyPolicy: `개인정보 처리방침`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `이번 주에는 대회가 없습니다.`, noTournamentsSub: `곧 다시 확인하세요.`, noCricketData: `지금은 라이브 크리켓이 없습니다.`, noCricketDataSub: `아래에서 이 스포츠에 대해 무엇이든 물어보세요.`, learnModeExplainer: `현재 라이브 경기가 없습니다 — 아래에서 이 스포츠를 살펴보고 무엇이든 물어보세요.`, learnModeFollowAlong: `경기를 보면서 아래에서 무엇이든 물어보세요.`, seasonJustEnded: `현재 {sport} 경기가 없습니다 — 다음 시즌에 다시 확인하세요.`,
  },

  ar: {
    thePlay: `اللعبة`, whyItMatters: `لماذا تهم`, theRule: `القاعدة`, complexPlay: `لعبة معقدة`, updated: `تم التحديث`, latestPlay: `آخر لعبة`, playHeadlineFallback: `حدثت لحظة حاسمة للتو`, gameNotStarted: `لم تبدأ هذه المباراة بعد`, watchNextLabel: `شاهد التالي`, liveNowLabel: `مباشر الآن`, feedbackPrompt: `Did this help you learn? (tap the lightbulb)`, feedbackThanks: `Thanks — glad this helped!`,
    capLeftToday: `متبقٍ {n} اليوم`, capQaLeft: `متبقٍ {n} أسئلة`, capExplainTitle: `استكشفت {n} لقطات اليوم 🎉`, capExplainBody: `اشترك في Pro للقطات وأسئلة غير محدودة. لقطاتك المجانية تتجدد غدًا.`, capQaTitle: `{n} أسئلة في هذه المباراة 🙌`, capQaBody: `اشترك في Pro لمواصلة السؤال — أسئلة غير محدودة على كل لقطة. مباراة جديدة تمنحك المزيد.`, capCta: `تابع مع Pro ←`,
    recapEyebrow: `ملخص المباراة`, recapStoryTitle: `القصة`, recapTurningPoint: `نقطة التحول`, recapKeyPerformance: `الأداء البارز`, recapWhyMattered: `لماذا كانت مهمة`, recapUnlock: `🔓 افتح التحليل الكامل مع Pro`, recapAvailabilityNote: `تظهر عندما تدعمها بيانات المباراة.`, recapNoData: `لا يوجد ملخص لهذه المباراة بعد.`,
    visionTitle: `حلّل الشاشة`, visionLockedTitle: `افهم ما يحدث على الشاشة`, visionLockedBody: `وجّه هاتفك نحو المباراة — أو اختر لقطة شاشة — وسيشرح لك SportsWise ما يحدث وما يجب متابعته، حسب مستواك.`, visionUnlock: `🔓 افتح مع Pro`, visionTakePhoto: `📷 التقط صورة`, visionChoosePhoto: `🖼️ اختر من المعرض`, visionAnalyze: `حلّل`, visionRetake: `أعد الالتقاط`, visionAnalyzing: `جارٍ قراءة الشاشة…`, visionAskPlaceholder: `اسأل عن هذه الصورة…`, visionPermissionDenied: `الوصول إلى الكاميرا أو الصور متوقف. فعّله من الإعدادات لتحليل الشاشة.`, visionError: `تعذّر قراءة هذه الصورة. جرّب لقطة أخرى.`,
    coachHook: `هناك سبب استراتيجي محدد لهذا — وهو يغيّر ما يجب متابعته تاليًا.`, coachUnlock: `🔓 افتح التحليل مع Pro`, coachComingSoon: `سيصل Coach's Corner إلى هذه الرياضة مع تحسّن بياناتها.`, coachExpand: `اضغط لعرض التحليل الاستراتيجي`, coachThinking: `جارٍ قراءة الموقف…`,
    matchTimelineTitle: `الجدول الزمني للمباراة`, matchTimelineEmpty: `لا توجد أحداث رئيسية بعد — ستظهر الأهداف والبطاقات والتبديلات هنا.`,
    playByPlay: `لعبة بلعبة`, loadMore: `تحميل المزيد`, noPlays: `لا يتوفر بعد سرد لعبة بلعبة لهذه المباراة.`, showMore: `عرض المزيد`, showLess: `عرض أقل`, pbpHint: `اضغط على أي لعبة لشرحها · ● لعبة تسجيل`,
    askFollowUp: `اطرح سؤالاً للمتابعة`, fuWhy: `لماذا كان ذلك مهماً؟`, fuRule: `اشرح القاعدة`, fuNew: `اشرح لي وكأنني مبتدئ`, fuNext: `ما الذي يجب أن أنتبه له تالياً؟`,
    share: `مشاركة`, askPlaceholder: `اسأل أي شيء عن هذه اللعبة…`, askLearnPlaceholder: `اسأل أي شيء عن {sport}…`, askHint: `لم تفهم شيئًا قاله المعلّق؟ اسأل أي شيء.`, thinking: `جارٍ التفكير…`, answerError: `تعذّر الحصول على إجابة. حاول مرة أخرى.`,
    favTitle: `إضافة فريق للمفضلة`, favMsg: `أي فريق تريد متابعته؟`, cancel: `إلغاء`,
    settings: `الإعدادات`, secExpertise: `المستوى`, secAppearance: `المظهر`, secLanguage: `اللغة`, secPreferences: `التفضيلات`,
    tSystem: `النظام`, tDark: `داكن`, tLight: `فاتح`,
    autoRefresh: `تحديث تلقائي`, autoRefreshDesc: `التحديث كل 60 ثانية`, gameAlerts: `تنبيهات المباريات`, gameAlertsDesc: `نبّهني عندما تلعب فرقي المفضلة`, poweredBy: `مدعوم بواسطة Groq + ESPN`,
    lvlKid: `مستجد`, lvlKidDesc: `تشبيهات بسيطة، بلا مصطلحات`, lvlBeginner: `مبتدئ`, lvlBeginnerDesc: `مناسب للمشجعين الجدد`,
    lvlInter: `متوسط`, lvlInterDesc: `مشاهد منتظم`, lvlExpert: `خبير`, lvlExpertDesc: `تحليل بمستوى المدربين`,
    heroSub: `لن تشعر بالضياع أثناء مشاهدة الرياضة بعد الآن.\nنشرح كل لعبة، في الوقت الفعلي،\nعلى مستواك.`,
    feat1: `شروحات مباشرة أثناء المباراة`, feat2: `مدعوم بالذكاء الاصطناعي، وليس الإحصائيات فقط`, feat3: `مستواك: من المستجد إلى مستوى المدربين`, getStarted: `ابدأ`,
    step1: `الخطوة 1 من 2`, step2: `الخطوة 2 من 2`, lvlTitle: `كيف تشاهد الرياضة؟`, lvlSub: `يمكنك تغيير ذلك في الإعدادات في أي وقت.`, sportTitle: `ما رياضتك المفضلة؟`, sportSub: `سنفتح هنا افتراضياً.`,
    next: `التالي`, letsGo: `هيا بنا`, back: `رجوع`,
    spBaseball: `البيسبول`, spFootball: `كرة القدم الأمريكية`, spBasketball: `كرة السلة`, spHockey: `الهوكي`, spSoccer: `MLS`, spWorldCup: `كأس العالم`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `الدوري الإسباني`, spMlr: `MLR`,
    noGames: `لا توجد مباريات {sport} اليوم`, selectGame: `اختر مباراة بالأعلى للحصول على شرح`, pullRefresh: `اسحب للأسفل للتحديث أو عُد لاحقاً.`, offSeason: `{sport} في فترة توقف الموسم`, offSeasonSub: `عُد عند بدء الموسم.`, seasonTitle: `لا توجد مباريات {sport} حالياً.`, seasonRuns: `يمتد الموسم من {start} إلى {end} — تحقق مرة أخرى حينها!`, worldCupRuns: `تقام البطولة كل 4 سنوات — تحقق مرة أخرى للبطولة القادمة!`,
    mySports: `رياضاتي`, customizeSports: `تخصيص رياضاتي`, resetDefault: `إعادة التعيين`, keepOneSport: `أبقِ رياضة واحدة على الأقل ظاهرة`, secApp: `التطبيق`, rateApp: `قيّم SportsWise`, shareApp: `مشاركة SportsWise`, sendFeedback: `إرسال ملاحظات`, privacyPolicy: `سياسة الخصوصية`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `لا توجد بطولات هذا الأسبوع.`, noTournamentsSub: `تحقق مرة أخرى قريباً.`, noCricketData: `لا يوجد كريكيت مباشر الآن.`, noCricketDataSub: `اسأل أي شيء عن الرياضة أدناه.`, learnModeExplainer: `لا توجد مباريات مباشرة الآن — استكشف الرياضة واسأل أي شيء أدناه.`, learnModeFollowAlong: `تابع البطولة واسأل أي شيء أدناه.`, seasonJustEnded: `لا توجد مباريات {sport} حالياً — تحقق مرة أخرى الموسم القادم.`,
  },
};
