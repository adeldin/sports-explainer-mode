import { Language } from './api';

// Static UI copy, pre-translated into all 10 languages (Option B).
// NOTE: ja/zh/ko/ar are a v1 first pass needing native review before launch
// (see FEATURE_IDEAS.md). The app name "SportsWise" and the tagline
// "Watch and ask why." are kept in English as brand.
export interface UIStrings {
  // explanation card
  thePlay: string; whyItMatters: string; theRule: string; complexPlay: string; updated: string; latestPlay: string; playHeadlineFallback: string; gameNotStarted: string; watchNextLabel: string; liveNowLabel: string;
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
  noTournaments: string; noCricketData: string; learnModeExplainer: string; learnModeFollowAlong: string; seasonJustEnded: string;
  // empty state ({sport} is replaced at render)
  noGames: string; selectGame: string; pullRefresh: string; offSeason: string; offSeasonSub: string; seasonTitle: string; seasonRuns: string; worldCupRuns: string;
  // my sports + app section
  mySports: string; customizeSports: string; resetDefault: string; keepOneSport: string;
  secApp: string; rateApp: string; shareApp: string; sendFeedback: string; privacyPolicy: string;
}

export const UI_STRINGS: Record<Language, UIStrings> = {
  en: {
    thePlay: `THE PLAY`, whyItMatters: `WHY IT MATTERS`, theRule: `THE RULE`, complexPlay: `COMPLEX PLAY`, updated: `Updated`, latestPlay: `Latest Play`, playHeadlineFallback: `A key play just happened`, gameNotStarted: `This game hasn't started yet`, watchNextLabel: `Watch Next`, liveNowLabel: `Live Now`,
    playByPlay: `Play-by-Play`, loadMore: `Load more`, noPlays: `No play-by-play available for this game yet.`, showMore: `Show more`, showLess: `Show less`, pbpHint: `Tap any play to explain it · ● scoring play`,
    askFollowUp: `Ask a follow-up`, fuWhy: `Why it mattered`, fuRule: `Explain the rule`, fuNew: `Explain like I'm new`, fuNext: `What's next?`,
    share: `Share`, askPlaceholder: `Ask anything about this play…`, askLearnPlaceholder: `Ask anything about {sport}…`, askHint: `Confused by something the announcer said? Ask anything.`, thinking: `Thinking…`, answerError: `Could not get an answer. Try again.`,
    favTitle: `Favorite a Team`, favMsg: `Which team do you want to follow?`, cancel: `Cancel`,
    settings: `Settings`, secExpertise: `EXPERTISE LEVEL`, secAppearance: `APPEARANCE`, secLanguage: `LANGUAGE`, secPreferences: `PREFERENCES`,
    tSystem: `System`, tDark: `Dark`, tLight: `Light`,
    autoRefresh: `Auto-Refresh`, autoRefreshDesc: `Update every 60 seconds`, gameAlerts: `Game Alerts`, gameAlertsDesc: `Notify me when favorite teams play`, poweredBy: `Powered by Groq + ESPN`,
    lvlKid: `Kid Mode`, lvlKidDesc: `Simple analogies, zero jargon`, lvlBeginner: `Beginner`, lvlBeginnerDesc: `New fan friendly`,
    lvlInter: `Intermediate`, lvlInterDesc: `Regular viewer`, lvlExpert: `Expert`, lvlExpertDesc: `Coaching-level analysis`,
    heroSub: `Never feel lost watching sports again.\nWe explain every play, in real time,\nat your level.`,
    feat1: `Live game explanations as they happen`, feat2: `Powered by AI — not just stats`, feat3: `Your level: Kid to Coaching-level Expert`, getStarted: `Get Started`,
    step1: `Step 1 of 2`, step2: `Step 2 of 2`, lvlTitle: `How do you watch sports?`, lvlSub: `You can always change this in Settings.`, sportTitle: `What's your sport?`, sportSub: `We'll open here by default.`,
    next: `Next`, letsGo: `Let's Go`, back: `Back`,
    spBaseball: `Baseball`, spFootball: `Football`, spBasketball: `Basketball`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `World Cup`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `No {sport} games today`, selectGame: `Select a game above for an explanation`, pullRefresh: `Pull down to refresh or check back later.`, offSeason: `{sport} is in the off-season`, offSeasonSub: `Check back when the season starts.`, seasonTitle: `No {sport} games right now.`, seasonRuns: `The season runs {start} to {end} — check back then!`, worldCupRuns: `The tournament runs every 4 years — check back for the next one!`,
    mySports: `My Sports`, customizeSports: `Customize My Sports`, resetDefault: `Reset to Default`, keepOneSport: `Keep at least one sport visible`, secApp: `APP`, rateApp: `Rate SportsWise`, shareApp: `Share SportsWise`, sendFeedback: `Send Feedback`, privacyPolicy: `Privacy Policy`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `No tournaments this week — check back soon!`, noCricketData: `No live cricket data yet — ask anything about the sport below!`, learnModeExplainer: `No live games right now — explore the sport and ask anything below.`, learnModeFollowAlong: `Follow along and ask anything below.`, seasonJustEnded: `No {sport} games right now — check back next season.`,
  },

  es: {
    thePlay: `LA JUGADA`, whyItMatters: `POR QUÉ IMPORTA`, theRule: `LA REGLA`, complexPlay: `JUGADA COMPLEJA`, updated: `Actualizado`, latestPlay: `Última jugada`, playHeadlineFallback: `Acaba de ocurrir una jugada clave`, gameNotStarted: `Este partido aún no ha comenzado`, watchNextLabel: `Para ver`, liveNowLabel: `En vivo ahora`,
    playByPlay: `Jugada a jugada`, loadMore: `Cargar más`, noPlays: `Aún no hay jugada a jugada para este partido.`, showMore: `Ver más`, showLess: `Ver menos`, pbpHint: `Toca cualquier jugada para explicarla · ● jugada de anotación`,
    askFollowUp: `Haz una pregunta de seguimiento`, fuWhy: `¿Por qué importó eso?`, fuRule: `Explica la regla`, fuNew: `Explícamelo como si fuera nuevo`, fuNext: `¿Qué viene ahora?`,
    share: `Compartir`, askPlaceholder: `Pregunta lo que quieras sobre esta jugada…`, askLearnPlaceholder: `Pregunta lo que quieras sobre {sport}…`, askHint: `¿No entendiste algo que dijo el comentarista? Pregunta lo que quieras.`, thinking: `Pensando…`, answerError: `No se pudo obtener una respuesta. Inténtalo de nuevo.`,
    favTitle: `Marcar un equipo`, favMsg: `¿A qué equipo quieres seguir?`, cancel: `Cancelar`,
    settings: `Ajustes`, secExpertise: `NIVEL DE EXPERIENCIA`, secAppearance: `APARIENCIA`, secLanguage: `IDIOMA`, secPreferences: `PREFERENCIAS`,
    tSystem: `Sistema`, tDark: `Oscuro`, tLight: `Claro`,
    autoRefresh: `Actualización automática`, autoRefreshDesc: `Actualizar cada 60 segundos`, gameAlerts: `Alertas de partidos`, gameAlertsDesc: `Avísame cuando jueguen mis equipos favoritos`, poweredBy: `Con tecnología de Groq + ESPN`,
    lvlKid: `Modo Niño`, lvlKidDesc: `Analogías simples, cero jerga`, lvlBeginner: `Principiante`, lvlBeginnerDesc: `Ideal para nuevos aficionados`,
    lvlInter: `Intermedio`, lvlInterDesc: `Espectador habitual`, lvlExpert: `Experto`, lvlExpertDesc: `Análisis a nivel de entrenador`,
    heroSub: `Nunca vuelvas a sentirte perdido viendo deportes.\nExplicamos cada jugada, en tiempo real,\na tu nivel.`,
    feat1: `Explicaciones de los partidos en directo`, feat2: `Impulsado por IA, no solo estadísticas`, feat3: `Tu nivel: de Niño a Experto`, getStarted: `Empezar`,
    step1: `Paso 1 de 2`, step2: `Paso 2 de 2`, lvlTitle: `¿Cómo ves los deportes?`, lvlSub: `Siempre puedes cambiarlo en Ajustes.`, sportTitle: `¿Cuál es tu deporte?`, sportSub: `Abriremos aquí por defecto.`,
    next: `Siguiente`, letsGo: `Vamos`, back: `Atrás`,
    spBaseball: `Béisbol`, spFootball: `Fútbol americano`, spBasketball: `Baloncesto`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `Mundial`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `No hay partidos de {sport} hoy`, selectGame: `Selecciona un partido arriba para ver una explicación`, pullRefresh: `Desliza hacia abajo para actualizar o vuelve más tarde.`, offSeason: `{sport} está en temporada baja`, offSeasonSub: `Vuelve cuando empiece la temporada.`, seasonTitle: `No hay partidos de {sport} en este momento.`, seasonRuns: `La temporada va de {start} a {end}: ¡vuelve entonces!`, worldCupRuns: `El torneo se juega cada 4 años: ¡vuelve para el próximo!`,
    mySports: `Mis deportes`, customizeSports: `Personalizar mis deportes`, resetDefault: `Restablecer`, keepOneSport: `Mantén al menos un deporte visible`, secApp: `APLICACIÓN`, rateApp: `Califica SportsWise`, shareApp: `Compartir SportsWise`, sendFeedback: `Enviar comentarios`, privacyPolicy: `Política de privacidad`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `No hay torneos esta semana: ¡vuelve pronto!`, noCricketData: `Aún no hay datos de críquet en vivo: ¡pregunta lo que quieras sobre el deporte abajo!`, learnModeExplainer: `No hay partidos en vivo ahora mismo: explora el deporte y pregunta lo que quieras abajo.`, learnModeFollowAlong: `Sigue el torneo y pregunta lo que quieras abajo.`, seasonJustEnded: `No hay partidos de {sport} ahora mismo: vuelve la próxima temporada.`,
  },

  fr: {
    thePlay: `L'ACTION`, whyItMatters: `POURQUOI C'EST IMPORTANT`, theRule: `LA RÈGLE`, complexPlay: `ACTION COMPLEXE`, updated: `Mis à jour`, latestPlay: `Dernière action`, playHeadlineFallback: `Une action clé vient de se produire`, gameNotStarted: `Ce match n'a pas encore commencé`, watchNextLabel: `À suivre`, liveNowLabel: `En direct`,
    playByPlay: `Action par action`, loadMore: `Charger plus`, noPlays: `Pas encore d'action par action pour ce match.`, showMore: `Voir plus`, showLess: `Voir moins`, pbpHint: `Touchez une action pour l'expliquer · ● action décisive`,
    askFollowUp: `Poser une question`, fuWhy: `Pourquoi est-ce important ?`, fuRule: `Explique la règle`, fuNew: `Explique comme à un débutant`, fuNext: `Que faut-il surveiller ?`,
    share: `Partager`, askPlaceholder: `Pose une question sur cette action…`, askLearnPlaceholder: `Pose une question sur {sport}…`, askHint: `Une phrase du commentateur vous échappe ? Posez n'importe quelle question.`, thinking: `Réflexion…`, answerError: `Impossible d'obtenir une réponse. Réessaie.`,
    favTitle: `Suivre une équipe`, favMsg: `Quelle équipe veux-tu suivre ?`, cancel: `Annuler`,
    settings: `Paramètres`, secExpertise: `NIVEAU`, secAppearance: `APPARENCE`, secLanguage: `LANGUE`, secPreferences: `PRÉFÉRENCES`,
    tSystem: `Système`, tDark: `Sombre`, tLight: `Clair`,
    autoRefresh: `Actualisation auto`, autoRefreshDesc: `Mise à jour toutes les 60 secondes`, gameAlerts: `Alertes de match`, gameAlertsDesc: `Me prévenir quand mes équipes jouent`, poweredBy: `Propulsé par Groq + ESPN`,
    lvlKid: `Mode Enfant`, lvlKidDesc: `Analogies simples, zéro jargon`, lvlBeginner: `Débutant`, lvlBeginnerDesc: `Idéal pour les nouveaux fans`,
    lvlInter: `Intermédiaire`, lvlInterDesc: `Spectateur régulier`, lvlExpert: `Expert`, lvlExpertDesc: `Analyse niveau entraîneur`,
    heroSub: `Ne soyez plus jamais perdu devant le sport.\nNous expliquons chaque action, en direct,\nà votre niveau.`,
    feat1: `Explications des matchs en direct`, feat2: `Propulsé par l'IA, pas que des stats`, feat3: `Votre niveau : d'Enfant à Expert`, getStarted: `Commencer`,
    step1: `Étape 1 sur 2`, step2: `Étape 2 sur 2`, lvlTitle: `Comment regardez-vous le sport ?`, lvlSub: `Vous pouvez changer cela dans les Paramètres.`, sportTitle: `Quel est votre sport ?`, sportSub: `Nous ouvrirons ici par défaut.`,
    next: `Suivant`, letsGo: `C'est parti`, back: `Retour`,
    spBaseball: `Baseball`, spFootball: `Football américain`, spBasketball: `Basket-ball`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `Coupe du Monde`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Aucun match de {sport} aujourd'hui`, selectGame: `Sélectionnez un match ci-dessus pour une explication`, pullRefresh: `Tirez vers le bas pour actualiser ou revenez plus tard.`, offSeason: `{sport} est en intersaison`, offSeasonSub: `Revenez au début de la saison.`, seasonTitle: `Aucun match de {sport} pour le moment.`, seasonRuns: `La saison va de {start} à {end} — revenez à ce moment-là !`, worldCupRuns: `Le tournoi a lieu tous les 4 ans — revenez pour le prochain !`,
    mySports: `Mes sports`, customizeSports: `Personnaliser mes sports`, resetDefault: `Réinitialiser`, keepOneSport: `Gardez au moins un sport visible`, secApp: `APPLICATION`, rateApp: `Noter SportsWise`, shareApp: `Partager SportsWise`, sendFeedback: `Envoyer un commentaire`, privacyPolicy: `Politique de confidentialité`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Aucun tournoi cette semaine — revenez bientôt !`, noCricketData: `Pas encore de données de cricket en direct — posez vos questions sur ce sport ci-dessous !`, learnModeExplainer: `Aucun match en direct pour le moment — explorez le sport et posez vos questions ci-dessous.`, learnModeFollowAlong: `Suivez le tournoi et posez vos questions ci-dessous.`, seasonJustEnded: `Aucun match de {sport} pour le moment — revenez la saison prochaine.`,
  },

  pt: {
    thePlay: `A JOGADA`, whyItMatters: `POR QUE IMPORTA`, theRule: `A REGRA`, complexPlay: `JOGADA COMPLEXA`, updated: `Atualizado`, latestPlay: `Última jogada`, playHeadlineFallback: `Uma jogada importante acabou de acontecer`, gameNotStarted: `Este jogo ainda não começou`, watchNextLabel: `Assista a seguir`, liveNowLabel: `Ao vivo agora`,
    playByPlay: `Lance a lance`, loadMore: `Carregar mais`, noPlays: `Ainda não há lance a lance para este jogo.`, showMore: `Mostrar mais`, showLess: `Mostrar menos`, pbpHint: `Toque em qualquer jogada para explicá-la · ● jogada de pontuação`,
    askFollowUp: `Faça uma pergunta`, fuWhy: `Por que isso importou?`, fuRule: `Explique a regra`, fuNew: `Explique como se eu fosse novo`, fuNext: `O que observar a seguir?`,
    share: `Compartilhar`, askPlaceholder: `Pergunte qualquer coisa sobre esta jogada…`, askLearnPlaceholder: `Pergunte qualquer coisa sobre {sport}…`, askHint: `Não entendeu algo que o locutor disse? Pergunte o que quiser.`, thinking: `Pensando…`, answerError: `Não foi possível obter uma resposta. Tente novamente.`,
    favTitle: `Favoritar um time`, favMsg: `Qual time você quer seguir?`, cancel: `Cancelar`,
    settings: `Configurações`, secExpertise: `NÍVEL`, secAppearance: `APARÊNCIA`, secLanguage: `IDIOMA`, secPreferences: `PREFERÊNCIAS`,
    tSystem: `Sistema`, tDark: `Escuro`, tLight: `Claro`,
    autoRefresh: `Atualização automática`, autoRefreshDesc: `Atualizar a cada 60 segundos`, gameAlerts: `Alertas de jogos`, gameAlertsDesc: `Avise-me quando meus times jogarem`, poweredBy: `Desenvolvido com Groq + ESPN`,
    lvlKid: `Modo Criança`, lvlKidDesc: `Analogias simples, zero jargão`, lvlBeginner: `Iniciante`, lvlBeginnerDesc: `Ideal para novos fãs`,
    lvlInter: `Intermediário`, lvlInterDesc: `Espectador regular`, lvlExpert: `Especialista`, lvlExpertDesc: `Análise nível de treinador`,
    heroSub: `Nunca mais se sinta perdido assistindo esportes.\nExplicamos cada jogada, em tempo real,\nno seu nível.`,
    feat1: `Explicações dos jogos ao vivo`, feat2: `Movido por IA, não só estatísticas`, feat3: `Seu nível: de Criança a Especialista`, getStarted: `Começar`,
    step1: `Etapa 1 de 2`, step2: `Etapa 2 de 2`, lvlTitle: `Como você assiste esportes?`, lvlSub: `Você pode mudar isso nas Configurações.`, sportTitle: `Qual é o seu esporte?`, sportSub: `Abriremos aqui por padrão.`,
    next: `Próximo`, letsGo: `Vamos`, back: `Voltar`,
    spBaseball: `Beisebol`, spFootball: `Futebol americano`, spBasketball: `Basquete`, spHockey: `Hóquei`, spSoccer: `MLS`, spWorldCup: `Copa do Mundo`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Nenhum jogo de {sport} hoje`, selectGame: `Selecione um jogo acima para ver uma explicação`, pullRefresh: `Puxe para baixo para atualizar ou volte mais tarde.`, offSeason: `{sport} está na pré-temporada`, offSeasonSub: `Volte quando a temporada começar.`, seasonTitle: `Nenhum jogo de {sport} no momento.`, seasonRuns: `A temporada vai de {start} a {end} — volte nessa época!`, worldCupRuns: `O torneio acontece a cada 4 anos — volte para o próximo!`,
    mySports: `Meus esportes`, customizeSports: `Personalizar meus esportes`, resetDefault: `Redefinir`, keepOneSport: `Mantenha pelo menos um esporte visível`, secApp: `APLICATIVO`, rateApp: `Avaliar o SportsWise`, shareApp: `Compartilhar o SportsWise`, sendFeedback: `Enviar feedback`, privacyPolicy: `Política de privacidade`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Nenhum torneio esta semana — volte em breve!`, noCricketData: `Ainda não há dados de críquete ao vivo — pergunte o que quiser sobre o esporte abaixo!`, learnModeExplainer: `Nenhum jogo ao vivo no momento — explore o esporte e pergunte o que quiser abaixo.`, learnModeFollowAlong: `Acompanhe e pergunte o que quiser abaixo.`, seasonJustEnded: `Nenhum jogo de {sport} no momento — volte na próxima temporada.`,
  },

  de: {
    thePlay: `DER SPIELZUG`, whyItMatters: `WARUM ES ZÄHLT`, theRule: `DIE REGEL`, complexPlay: `KOMPLEXER SPIELZUG`, updated: `Aktualisiert`, latestPlay: `Letzter Spielzug`, playHeadlineFallback: `Gerade ist ein wichtiger Spielzug passiert`, gameNotStarted: `Dieses Spiel hat noch nicht begonnen`, watchNextLabel: `Als Nächstes`, liveNowLabel: `Jetzt live`,
    playByPlay: `Zug für Zug`, loadMore: `Mehr laden`, noPlays: `Für dieses Spiel ist noch kein Zug-für-Zug verfügbar.`, showMore: `Mehr anzeigen`, showLess: `Weniger anzeigen`, pbpHint: `Tippe auf einen Spielzug für die Erklärung · ● Punktespielzug`,
    askFollowUp: `Stell eine Nachfrage`, fuWhy: `Warum war das wichtig?`, fuRule: `Erkläre die Regel`, fuNew: `Erkläre es für Einsteiger`, fuNext: `Worauf sollte ich als Nächstes achten?`,
    share: `Teilen`, askPlaceholder: `Frag alles zu diesem Spielzug…`, askLearnPlaceholder: `Frag alles über {sport}…`, askHint: `Etwas vom Kommentator nicht verstanden? Frag einfach.`, thinking: `Denkt nach…`, answerError: `Antwort konnte nicht geladen werden. Versuch es erneut.`,
    favTitle: `Team favorisieren`, favMsg: `Welchem Team möchtest du folgen?`, cancel: `Abbrechen`,
    settings: `Einstellungen`, secExpertise: `NIVEAU`, secAppearance: `ERSCHEINUNGSBILD`, secLanguage: `SPRACHE`, secPreferences: `EINSTELLUNGEN`,
    tSystem: `System`, tDark: `Dunkel`, tLight: `Hell`,
    autoRefresh: `Auto-Aktualisierung`, autoRefreshDesc: `Alle 60 Sekunden aktualisieren`, gameAlerts: `Spiel-Benachrichtigungen`, gameAlertsDesc: `Benachrichtige mich, wenn meine Teams spielen`, poweredBy: `Unterstützt von Groq + ESPN`,
    lvlKid: `Kindermodus`, lvlKidDesc: `Einfache Vergleiche, kein Fachjargon`, lvlBeginner: `Einsteiger`, lvlBeginnerDesc: `Für neue Fans`,
    lvlInter: `Fortgeschritten`, lvlInterDesc: `Regelmäßiger Zuschauer`, lvlExpert: `Experte`, lvlExpertDesc: `Analyse auf Trainerniveau`,
    heroSub: `Fühl dich beim Sport nie wieder verloren.\nWir erklären jeden Spielzug, in Echtzeit,\nauf deinem Niveau.`,
    feat1: `Live-Erklärungen während des Spiels`, feat2: `KI-gestützt, nicht nur Statistik`, feat3: `Dein Niveau: vom Kind bis zum Experten`, getStarted: `Loslegen`,
    step1: `Schritt 1 von 2`, step2: `Schritt 2 von 2`, lvlTitle: `Wie schaust du Sport?`, lvlSub: `Du kannst das jederzeit in den Einstellungen ändern.`, sportTitle: `Was ist deine Sportart?`, sportSub: `Wir öffnen standardmäßig hier.`,
    next: `Weiter`, letsGo: `Los geht's`, back: `Zurück`,
    spBaseball: `Baseball`, spFootball: `American Football`, spBasketball: `Basketball`, spHockey: `Eishockey`, spSoccer: `MLS`, spWorldCup: `WM`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Heute keine {sport}-Spiele`, selectGame: `Wähle oben ein Spiel für eine Erklärung`, pullRefresh: `Zum Aktualisieren nach unten ziehen oder später wiederkommen.`, offSeason: `{sport} ist in der Saisonpause`, offSeasonSub: `Schau zum Saisonstart wieder vorbei.`, seasonTitle: `Gerade keine {sport}-Spiele.`, seasonRuns: `Die Saison läuft von {start} bis {end} — schau dann wieder vorbei!`, worldCupRuns: `Das Turnier findet alle 4 Jahre statt — schau beim nächsten wieder vorbei!`,
    mySports: `Meine Sportarten`, customizeSports: `Meine Sportarten anpassen`, resetDefault: `Zurücksetzen`, keepOneSport: `Mindestens eine Sportart sichtbar lassen`, secApp: `APP`, rateApp: `SportsWise bewerten`, shareApp: `SportsWise teilen`, sendFeedback: `Feedback senden`, privacyPolicy: `Datenschutzrichtlinie`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Diese Woche keine Turniere — schau bald wieder vorbei!`, noCricketData: `Noch keine Live-Cricket-Daten — frag unten alles über die Sportart!`, learnModeExplainer: `Gerade keine Live-Spiele — entdecke die Sportart und frag unten alles.`, learnModeFollowAlong: `Verfolge das Turnier und frag unten alles.`, seasonJustEnded: `Gerade keine {sport}-Spiele — schau nächste Saison wieder vorbei.`,
  },

  it: {
    thePlay: `L'AZIONE`, whyItMatters: `PERCHÉ CONTA`, theRule: `LA REGOLA`, complexPlay: `AZIONE COMPLESSA`, updated: `Aggiornato`, latestPlay: `Ultima azione`, playHeadlineFallback: `È appena successa un'azione chiave`, gameNotStarted: `Questa partita non è ancora iniziata`, watchNextLabel: `Da vedere`, liveNowLabel: `Ora in diretta`,
    playByPlay: `Azione per azione`, loadMore: `Carica altro`, noPlays: `Non c'è ancora l'azione per azione per questa partita.`, showMore: `Mostra altro`, showLess: `Mostra meno`, pbpHint: `Tocca un'azione per spiegarla · ● azione da punto`,
    askFollowUp: `Fai una domanda`, fuWhy: `Perché è stato importante?`, fuRule: `Spiega la regola`, fuNew: `Spiegamelo come a un principiante`, fuNext: `Cosa guardare adesso?`,
    share: `Condividi`, askPlaceholder: `Chiedi qualsiasi cosa su questa azione…`, askLearnPlaceholder: `Chiedi qualsiasi cosa su {sport}…`, askHint: `Non hai capito qualcosa detto dal telecronista? Chiedi pure.`, thinking: `Sto pensando…`, answerError: `Impossibile ottenere una risposta. Riprova.`,
    favTitle: `Aggiungi una squadra`, favMsg: `Quale squadra vuoi seguire?`, cancel: `Annulla`,
    settings: `Impostazioni`, secExpertise: `LIVELLO`, secAppearance: `ASPETTO`, secLanguage: `LINGUA`, secPreferences: `PREFERENZE`,
    tSystem: `Sistema`, tDark: `Scuro`, tLight: `Chiaro`,
    autoRefresh: `Aggiornamento automatico`, autoRefreshDesc: `Aggiorna ogni 60 secondi`, gameAlerts: `Avvisi partite`, gameAlertsDesc: `Avvisami quando giocano le mie squadre`, poweredBy: `Realizzato con Groq + ESPN`,
    lvlKid: `Modalità Bambino`, lvlKidDesc: `Analogie semplici, zero gergo`, lvlBeginner: `Principiante`, lvlBeginnerDesc: `Per i nuovi tifosi`,
    lvlInter: `Intermedio`, lvlInterDesc: `Spettatore abituale`, lvlExpert: `Esperto`, lvlExpertDesc: `Analisi da allenatore`,
    heroSub: `Non sentirti mai più perso guardando lo sport.\nSpieghiamo ogni azione, in tempo reale,\nal tuo livello.`,
    feat1: `Spiegazioni delle partite in diretta`, feat2: `Basato sull'IA, non solo statistiche`, feat3: `Il tuo livello: da Bambino a Esperto`, getStarted: `Inizia`,
    step1: `Passo 1 di 2`, step2: `Passo 2 di 2`, lvlTitle: `Come guardi lo sport?`, lvlSub: `Puoi sempre cambiarlo nelle Impostazioni.`, sportTitle: `Qual è il tuo sport?`, sportSub: `Apriremo qui per impostazione predefinita.`,
    next: `Avanti`, letsGo: `Andiamo`, back: `Indietro`,
    spBaseball: `Baseball`, spFootball: `Football americano`, spBasketball: `Basket`, spHockey: `Hockey`, spSoccer: `MLS`, spWorldCup: `Mondiali`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `La Liga`, spMlr: `MLR`,
    noGames: `Nessuna partita di {sport} oggi`, selectGame: `Seleziona una partita sopra per una spiegazione`, pullRefresh: `Trascina verso il basso per aggiornare o torna più tardi.`, offSeason: `{sport} è in pausa stagionale`, offSeasonSub: `Torna all'inizio della stagione.`, seasonTitle: `Nessuna partita di {sport} al momento.`, seasonRuns: `La stagione va da {start} a {end} — torna in quel periodo!`, worldCupRuns: `Il torneo si gioca ogni 4 anni — torna per il prossimo!`,
    mySports: `I miei sport`, customizeSports: `Personalizza i miei sport`, resetDefault: `Ripristina`, keepOneSport: `Mantieni almeno uno sport visibile`, secApp: `APP`, rateApp: `Valuta SportsWise`, shareApp: `Condividi SportsWise`, sendFeedback: `Invia feedback`, privacyPolicy: `Informativa sulla privacy`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `Nessun torneo questa settimana — torna presto!`, noCricketData: `Ancora nessun dato dal vivo sul cricket — chiedi qualsiasi cosa sullo sport qui sotto!`, learnModeExplainer: `Nessuna partita dal vivo al momento — esplora lo sport e chiedi qualsiasi cosa qui sotto.`, learnModeFollowAlong: `Segui il torneo e chiedi qualsiasi cosa qui sotto.`, seasonJustEnded: `Nessuna partita di {sport} al momento — torna la prossima stagione.`,
  },

  ja: {
    thePlay: `プレー`, whyItMatters: `なぜ重要か`, theRule: `ルール`, complexPlay: `複雑なプレー`, updated: `更新`, latestPlay: `最新のプレー`, playHeadlineFallback: `重要なプレーがありました`, gameNotStarted: `この試合はまだ始まっていません`, watchNextLabel: `次に観る`, liveNowLabel: `今ライブ中`,
    playByPlay: `プレーバイプレー`, loadMore: `もっと見る`, noPlays: `この試合のプレーバイプレーはまだありません。`, showMore: `もっと見る`, showLess: `閉じる`, pbpHint: `プレーをタップして解説 · ● 得点プレー`,
    askFollowUp: `追加で質問する`, fuWhy: `なぜ重要だったの？`, fuRule: `ルールを説明して`, fuNew: `初心者向けに説明して`, fuNext: `次は何に注目すればいい？`,
    share: `シェア`, askPlaceholder: `このプレーについて何でも質問…`, askLearnPlaceholder: `{sport}について何でも質問…`, askHint: `アナウンサーの言葉がわからない？何でも質問できます。`, thinking: `考え中…`, answerError: `回答を取得できませんでした。もう一度お試しください。`,
    favTitle: `チームをお気に入りに`, favMsg: `どのチームをフォローしますか？`, cancel: `キャンセル`,
    settings: `設定`, secExpertise: `レベル`, secAppearance: `外観`, secLanguage: `言語`, secPreferences: `環境設定`,
    tSystem: `システム`, tDark: `ダーク`, tLight: `ライト`,
    autoRefresh: `自動更新`, autoRefreshDesc: `60秒ごとに更新`, gameAlerts: `試合アラート`, gameAlertsDesc: `お気に入りチームの試合を通知`, poweredBy: `Groq + ESPN を利用`,
    lvlKid: `キッズモード`, lvlKidDesc: `わかりやすいたとえ、専門用語なし`, lvlBeginner: `初心者`, lvlBeginnerDesc: `新しいファン向け`,
    lvlInter: `中級`, lvlInterDesc: `いつも見ている人向け`, lvlExpert: `エキスパート`, lvlExpertDesc: `コーチレベルの分析`,
    heroSub: `スポーツ観戦でもう迷わない。\nすべてのプレーを、リアルタイムで、\nあなたのレベルで解説します。`,
    feat1: `試合中にライブで解説`, feat2: `統計だけでなくAIが解説`, feat3: `レベル：キッズからコーチ級まで`, getStarted: `はじめる`,
    step1: `ステップ 1 / 2`, step2: `ステップ 2 / 2`, lvlTitle: `スポーツをどう見ていますか？`, lvlSub: `設定でいつでも変更できます。`, sportTitle: `好きなスポーツは？`, sportSub: `デフォルトでここを開きます。`,
    next: `次へ`, letsGo: `はじめよう`, back: `戻る`,
    spBaseball: `野球`, spFootball: `アメフト`, spBasketball: `バスケットボール`, spHockey: `アイスホッケー`, spSoccer: `MLS`, spWorldCup: `ワールドカップ`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `ラ・リーガ`, spMlr: `MLR`,
    noGames: `今日は{sport}の試合がありません`, selectGame: `上の試合を選ぶと解説が表示されます`, pullRefresh: `下に引いて更新するか、後でもう一度確認してください。`, offSeason: `{sport}はオフシーズンです`, offSeasonSub: `シーズンが始まったらまた来てください。`, seasonTitle: `現在{sport}の試合はありません。`, seasonRuns: `シーズンは{start}から{end}までです。その頃にまたチェックしてください！`, worldCupRuns: `大会は4年ごとに開催されます。次回をお楽しみに！`,
    mySports: `マイスポーツ`, customizeSports: `マイスポーツを編集`, resetDefault: `デフォルトに戻す`, keepOneSport: `少なくとも1つのスポーツを表示してください`, secApp: `アプリ`, rateApp: `SportsWiseを評価`, shareApp: `SportsWiseをシェア`, sendFeedback: `フィードバックを送信`, privacyPolicy: `プライバシーポリシー`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `今週は大会がありません。またチェックしてください！`, noCricketData: `ライブのクリケットデータはまだありません。下でこのスポーツについて何でも質問してください！`, learnModeExplainer: `現在ライブの試合はありません。下でこのスポーツについて何でも質問してください。`, learnModeFollowAlong: `大会を観ながら、下で何でも質問してください。`, seasonJustEnded: `現在{sport}の試合はありません。来シーズンにまたチェックしてください。`,
  },

  zh: {
    thePlay: `这次进攻`, whyItMatters: `为什么重要`, theRule: `规则`, complexPlay: `复杂战术`, updated: `已更新`, latestPlay: `最新进攻`, playHeadlineFallback: `刚刚发生了一次关键进攻`, gameNotStarted: `这场比赛尚未开始`, watchNextLabel: `接下来观看`, liveNowLabel: `正在直播`,
    playByPlay: `逐回合`, loadMore: `加载更多`, noPlays: `本场比赛暂无逐回合记录。`, showMore: `显示更多`, showLess: `收起`, pbpHint: `点按任意回合查看解说 · ● 得分回合`,
    askFollowUp: `继续追问`, fuWhy: `这为什么重要？`, fuRule: `解释一下规则`, fuNew: `像对新手一样解释`, fuNext: `接下来该看什么？`,
    share: `分享`, askPlaceholder: `关于这次进攻，随便问…`, askLearnPlaceholder: `关于{sport}，随便问…`, askHint: `没听懂解说员说的话？随便问。`, thinking: `思考中…`, answerError: `无法获取答案，请重试。`,
    favTitle: `收藏球队`, favMsg: `你想关注哪支球队？`, cancel: `取消`,
    settings: `设置`, secExpertise: `水平`, secAppearance: `外观`, secLanguage: `语言`, secPreferences: `偏好设置`,
    tSystem: `系统`, tDark: `深色`, tLight: `浅色`,
    autoRefresh: `自动刷新`, autoRefreshDesc: `每 60 秒更新一次`, gameAlerts: `比赛提醒`, gameAlertsDesc: `我喜欢的球队比赛时通知我`, poweredBy: `由 Groq + ESPN 提供支持`,
    lvlKid: `儿童模式`, lvlKidDesc: `简单类比，零术语`, lvlBeginner: `新手`, lvlBeginnerDesc: `适合新球迷`,
    lvlInter: `进阶`, lvlInterDesc: `经常观看的观众`, lvlExpert: `专家`, lvlExpertDesc: `教练级分析`,
    heroSub: `看体育不再一头雾水。\n我们实时解说每一回合，\n按你的水平讲解。`,
    feat1: `比赛进行中实时解说`, feat2: `由 AI 驱动，不只是数据`, feat3: `你的水平：从儿童到教练级专家`, getStarted: `开始`,
    step1: `第 1 步，共 2 步`, step2: `第 2 步，共 2 步`, lvlTitle: `你是怎么看体育的？`, lvlSub: `你随时可以在设置中更改。`, sportTitle: `你喜欢哪项运动？`, sportSub: `默认从这里打开。`,
    next: `下一步`, letsGo: `出发`, back: `返回`,
    spBaseball: `棒球`, spFootball: `美式橄榄球`, spBasketball: `篮球`, spHockey: `冰球`, spSoccer: `MLS`, spWorldCup: `世界杯`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `西甲联赛`, spMlr: `MLR`,
    noGames: `今天没有{sport}比赛`, selectGame: `选择上面的比赛查看解说`, pullRefresh: `下拉刷新或稍后再来。`, offSeason: `{sport}正处于休赛期`, offSeasonSub: `赛季开始后再来看看。`, seasonTitle: `目前没有{sport}比赛。`, seasonRuns: `赛季为{start}至{end}，到时再来看看！`, worldCupRuns: `该赛事每4年举办一次，下次再来看看！`,
    mySports: `我的运动`, customizeSports: `自定义我的运动`, resetDefault: `恢复默认`, keepOneSport: `请至少保留一项运动`, secApp: `应用`, rateApp: `评价 SportsWise`, shareApp: `分享 SportsWise`, sendFeedback: `发送反馈`, privacyPolicy: `隐私政策`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `本周没有赛事，请稍后再来！`, noCricketData: `暂无板球实时数据，在下方随便问关于这项运动的问题吧！`, learnModeExplainer: `目前没有实时比赛——在下方了解这项运动并随便提问。`, learnModeFollowAlong: `一边观看，一边在下方随便提问。`, seasonJustEnded: `目前没有{sport}比赛——下个赛季再来看看。`,
  },

  ko: {
    thePlay: `플레이`, whyItMatters: `왜 중요한가`, theRule: `규칙`, complexPlay: `복잡한 플레이`, updated: `업데이트됨`, latestPlay: `최신 플레이`, playHeadlineFallback: `방금 중요한 플레이가 나왔습니다`, gameNotStarted: `이 경기는 아직 시작되지 않았습니다`, watchNextLabel: `다음 경기`, liveNowLabel: `지금 라이브`,
    playByPlay: `플레이별 기록`, loadMore: `더 보기`, noPlays: `이 경기의 플레이별 기록이 아직 없습니다.`, showMore: `더 보기`, showLess: `접기`, pbpHint: `플레이를 탭하면 설명이 나와요 · ● 득점 플레이`,
    askFollowUp: `추가 질문하기`, fuWhy: `그게 왜 중요했나요?`, fuRule: `규칙을 설명해 줘`, fuNew: `초보자처럼 설명해 줘`, fuNext: `다음엔 무엇을 봐야 하나요?`,
    share: `공유`, askPlaceholder: `이 플레이에 대해 무엇이든 물어보세요…`, askLearnPlaceholder: `{sport}에 대해 무엇이든 물어보세요…`, askHint: `해설자가 한 말이 헷갈리나요? 무엇이든 물어보세요.`, thinking: `생각 중…`, answerError: `답변을 가져오지 못했습니다. 다시 시도하세요.`,
    favTitle: `팀 즐겨찾기`, favMsg: `어느 팀을 팔로우할까요?`, cancel: `취소`,
    settings: `설정`, secExpertise: `수준`, secAppearance: `화면 모드`, secLanguage: `언어`, secPreferences: `환경설정`,
    tSystem: `시스템`, tDark: `다크`, tLight: `라이트`,
    autoRefresh: `자동 새로고침`, autoRefreshDesc: `60초마다 업데이트`, gameAlerts: `경기 알림`, gameAlertsDesc: `좋아하는 팀의 경기를 알려줘요`, poweredBy: `Groq + ESPN 제공`,
    lvlKid: `키즈 모드`, lvlKidDesc: `쉬운 비유, 전문 용어 없음`, lvlBeginner: `초보자`, lvlBeginnerDesc: `새 팬에게 적합`,
    lvlInter: `중급`, lvlInterDesc: `자주 보는 시청자`, lvlExpert: `전문가`, lvlExpertDesc: `코치 수준 분석`,
    heroSub: `스포츠를 볼 때 더 이상 헤매지 마세요.\n모든 플레이를 실시간으로,\n당신의 수준에 맞게 설명해 드려요.`,
    feat1: `경기 중 실시간 해설`, feat2: `통계만이 아닌 AI 기반`, feat3: `당신의 수준: 키즈부터 코치급 전문가까지`, getStarted: `시작하기`,
    step1: `2단계 중 1단계`, step2: `2단계 중 2단계`, lvlTitle: `스포츠를 어떻게 보시나요?`, lvlSub: `설정에서 언제든 바꿀 수 있어요.`, sportTitle: `어떤 스포츠를 좋아하세요?`, sportSub: `기본으로 여기서 열려요.`,
    next: `다음`, letsGo: `시작`, back: `뒤로`,
    spBaseball: `야구`, spFootball: `미식축구`, spBasketball: `농구`, spHockey: `아이스하키`, spSoccer: `MLS`, spWorldCup: `월드컵`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `라리가`, spMlr: `MLR`,
    noGames: `오늘은 {sport} 경기가 없습니다`, selectGame: `위에서 경기를 선택하면 설명이 나와요`, pullRefresh: `아래로 당겨 새로고침하거나 나중에 다시 확인하세요.`, offSeason: `{sport}은 비시즌입니다`, offSeasonSub: `시즌이 시작되면 다시 확인하세요.`, seasonTitle: `현재 {sport} 경기가 없습니다.`, seasonRuns: `시즌은 {start}부터 {end}까지입니다 — 그때 다시 확인하세요!`, worldCupRuns: `이 대회는 4년마다 열립니다 — 다음 대회를 기대해 주세요!`,
    mySports: `내 스포츠`, customizeSports: `내 스포츠 맞춤설정`, resetDefault: `기본값으로 재설정`, keepOneSport: `최소 하나의 스포츠는 표시하세요`, secApp: `앱`, rateApp: `SportsWise 평가하기`, shareApp: `SportsWise 공유하기`, sendFeedback: `피드백 보내기`, privacyPolicy: `개인정보 처리방침`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `이번 주에는 대회가 없습니다 — 곧 다시 확인하세요!`, noCricketData: `아직 라이브 크리켓 데이터가 없습니다 — 아래에서 이 스포츠에 대해 무엇이든 물어보세요!`, learnModeExplainer: `현재 라이브 경기가 없습니다 — 아래에서 이 스포츠를 살펴보고 무엇이든 물어보세요.`, learnModeFollowAlong: `경기를 보면서 아래에서 무엇이든 물어보세요.`, seasonJustEnded: `현재 {sport} 경기가 없습니다 — 다음 시즌에 다시 확인하세요.`,
  },

  ar: {
    thePlay: `اللعبة`, whyItMatters: `لماذا تهم`, theRule: `القاعدة`, complexPlay: `لعبة معقدة`, updated: `تم التحديث`, latestPlay: `آخر لعبة`, playHeadlineFallback: `حدثت لحظة حاسمة للتو`, gameNotStarted: `لم تبدأ هذه المباراة بعد`, watchNextLabel: `شاهد التالي`, liveNowLabel: `مباشر الآن`,
    playByPlay: `لعبة بلعبة`, loadMore: `تحميل المزيد`, noPlays: `لا يتوفر بعد سرد لعبة بلعبة لهذه المباراة.`, showMore: `عرض المزيد`, showLess: `عرض أقل`, pbpHint: `اضغط على أي لعبة لشرحها · ● لعبة تسجيل`,
    askFollowUp: `اطرح سؤالاً للمتابعة`, fuWhy: `لماذا كان ذلك مهماً؟`, fuRule: `اشرح القاعدة`, fuNew: `اشرح لي وكأنني مبتدئ`, fuNext: `ما الذي يجب أن أنتبه له تالياً؟`,
    share: `مشاركة`, askPlaceholder: `اسأل أي شيء عن هذه اللعبة…`, askLearnPlaceholder: `اسأل أي شيء عن {sport}…`, askHint: `لم تفهم شيئًا قاله المعلّق؟ اسأل أي شيء.`, thinking: `جارٍ التفكير…`, answerError: `تعذّر الحصول على إجابة. حاول مرة أخرى.`,
    favTitle: `إضافة فريق للمفضلة`, favMsg: `أي فريق تريد متابعته؟`, cancel: `إلغاء`,
    settings: `الإعدادات`, secExpertise: `المستوى`, secAppearance: `المظهر`, secLanguage: `اللغة`, secPreferences: `التفضيلات`,
    tSystem: `النظام`, tDark: `داكن`, tLight: `فاتح`,
    autoRefresh: `تحديث تلقائي`, autoRefreshDesc: `التحديث كل 60 ثانية`, gameAlerts: `تنبيهات المباريات`, gameAlertsDesc: `نبّهني عندما تلعب فرقي المفضلة`, poweredBy: `مدعوم بواسطة Groq + ESPN`,
    lvlKid: `وضع الأطفال`, lvlKidDesc: `تشبيهات بسيطة، بلا مصطلحات`, lvlBeginner: `مبتدئ`, lvlBeginnerDesc: `مناسب للمشجعين الجدد`,
    lvlInter: `متوسط`, lvlInterDesc: `مشاهد منتظم`, lvlExpert: `خبير`, lvlExpertDesc: `تحليل بمستوى المدربين`,
    heroSub: `لن تشعر بالضياع أثناء مشاهدة الرياضة بعد الآن.\nنشرح كل لعبة، في الوقت الفعلي،\nعلى مستواك.`,
    feat1: `شروحات مباشرة أثناء المباراة`, feat2: `مدعوم بالذكاء الاصطناعي، وليس الإحصائيات فقط`, feat3: `مستواك: من الأطفال إلى مستوى المدربين`, getStarted: `ابدأ`,
    step1: `الخطوة 1 من 2`, step2: `الخطوة 2 من 2`, lvlTitle: `كيف تشاهد الرياضة؟`, lvlSub: `يمكنك تغيير ذلك في الإعدادات في أي وقت.`, sportTitle: `ما رياضتك المفضلة؟`, sportSub: `سنفتح هنا افتراضياً.`,
    next: `التالي`, letsGo: `هيا بنا`, back: `رجوع`,
    spBaseball: `البيسبول`, spFootball: `كرة القدم الأمريكية`, spBasketball: `كرة السلة`, spHockey: `الهوكي`, spSoccer: `MLS`, spWorldCup: `كأس العالم`, spRugby: `URC`, spWnba: `WNBA`, spPremierLeague: `EPL`, spLaLiga: `الدوري الإسباني`, spMlr: `MLR`,
    noGames: `لا توجد مباريات {sport} اليوم`, selectGame: `اختر مباراة بالأعلى للحصول على شرح`, pullRefresh: `اسحب للأسفل للتحديث أو عُد لاحقاً.`, offSeason: `{sport} في فترة توقف الموسم`, offSeasonSub: `عُد عند بدء الموسم.`, seasonTitle: `لا توجد مباريات {sport} حالياً.`, seasonRuns: `يمتد الموسم من {start} إلى {end} — تحقق مرة أخرى حينها!`, worldCupRuns: `تقام البطولة كل 4 سنوات — تحقق مرة أخرى للبطولة القادمة!`,
    mySports: `رياضاتي`, customizeSports: `تخصيص رياضاتي`, resetDefault: `إعادة التعيين`, keepOneSport: `أبقِ رياضة واحدة على الأقل ظاهرة`, secApp: `التطبيق`, rateApp: `قيّم SportsWise`, shareApp: `مشاركة SportsWise`, sendFeedback: `إرسال ملاحظات`, privacyPolicy: `سياسة الخصوصية`,
    spTennis: `Tennis`, spGolf: `Golf`, spCricket: `Cricket`, noTournaments: `لا توجد بطولات هذا الأسبوع — تحقق مرة أخرى قريباً!`, noCricketData: `لا توجد بيانات كريكيت مباشرة بعد — اسأل أي شيء عن الرياضة أدناه!`, learnModeExplainer: `لا توجد مباريات مباشرة الآن — استكشف الرياضة واسأل أي شيء أدناه.`, learnModeFollowAlong: `تابع البطولة واسأل أي شيء أدناه.`, seasonJustEnded: `لا توجد مباريات {sport} حالياً — تحقق مرة أخرى الموسم القادم.`,
  },
};
