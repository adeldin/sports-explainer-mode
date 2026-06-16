import { Language } from './api';

// Static UI copy, pre-translated into all 10 languages (Option B).
// NOTE: ja/zh/ko/ar are a v1 first pass needing native review before launch
// (see FEATURE_IDEAS.md). The app name "SportsWise" and the tagline
// "THE SMART PLAY" are kept in English as brand.
export interface UIStrings {
  // explanation card
  thePlay: string; whyItMatters: string; theRule: string; complexPlay: string; updated: string; latestPlay: string;
  // past plays
  playByPlay: string; loadMore: string; noPlays: string; showMore: string; showLess: string; pbpHint: string;
  // follow-up + ask
  askFollowUp: string; fuWhy: string; fuRule: string; fuNew: string; fuNext: string;
  share: string; askPlaceholder: string; askHint: string; thinking: string; answerError: string;
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
  spBaseball: string; spFootball: string; spBasketball: string; spHockey: string; spSoccer: string; spWorldCup: string; spRugby: string;
  // empty state ({sport} is replaced at render)
  noGames: string; selectGame: string; pullRefresh: string; offSeason: string; offSeasonSub: string; smartPlayReturns: string;
}

export const UI_STRINGS: Record<Language, UIStrings> = {
  en: {
    thePlay: `THE PLAY`, whyItMatters: `WHY IT MATTERS`, theRule: `THE RULE`, complexPlay: `COMPLEX PLAY`, updated: `Updated`, latestPlay: `Latest Play`,
    playByPlay: `Play-by-Play`, loadMore: `Load more`, noPlays: `No play-by-play available for this game yet.`, showMore: `Show more`, showLess: `Show less`, pbpHint: `Tap any play to explain it · ● scoring play`,
    askFollowUp: `Ask a follow-up`, fuWhy: `Why it mattered`, fuRule: `Explain the rule`, fuNew: `Explain like I'm new`, fuNext: `What's next?`,
    share: `Share The Smart Play`, askPlaceholder: `Ask anything about this play…`, askHint: `Confused by something the announcer said? Ask anything.`, thinking: `Thinking…`, answerError: `Could not get an answer. Try again.`,
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
    spBaseball: `Baseball`, spFootball: `Football`, spBasketball: `Basketball`, spHockey: `Hockey`, spSoccer: `Soccer`, spWorldCup: `World Cup`, spRugby: `Rugby`,
    noGames: `No {sport} games today`, selectGame: `Select a game above for an explanation`, pullRefresh: `Pull down to refresh or check back later.`, offSeason: `{sport} is in the off-season`, offSeasonSub: `Check back when the season starts.`, smartPlayReturns: `THE SMART PLAY RETURNS SOON`,
  },

  es: {
    thePlay: `LA JUGADA`, whyItMatters: `POR QUÉ IMPORTA`, theRule: `LA REGLA`, complexPlay: `JUGADA COMPLEJA`, updated: `Actualizado`, latestPlay: `Última jugada`,
    playByPlay: `Jugada a jugada`, loadMore: `Cargar más`, noPlays: `Aún no hay jugada a jugada para este partido.`, showMore: `Ver más`, showLess: `Ver menos`, pbpHint: `Toca cualquier jugada para explicarla · ● jugada de anotación`,
    askFollowUp: `Haz una pregunta de seguimiento`, fuWhy: `¿Por qué importó eso?`, fuRule: `Explica la regla`, fuNew: `Explícamelo como si fuera nuevo`, fuNext: `¿Qué viene ahora?`,
    share: `Compartir La Jugada Inteligente`, askPlaceholder: `Pregunta lo que quieras sobre esta jugada…`, askHint: `¿No entendiste algo que dijo el comentarista? Pregunta lo que quieras.`, thinking: `Pensando…`, answerError: `No se pudo obtener una respuesta. Inténtalo de nuevo.`,
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
    spBaseball: `Béisbol`, spFootball: `Fútbol americano`, spBasketball: `Baloncesto`, spHockey: `Hockey`, spSoccer: `Fútbol`, spWorldCup: `Mundial`, spRugby: `Rugby`,
    noGames: `No hay partidos de {sport} hoy`, selectGame: `Selecciona un partido arriba para ver una explicación`, pullRefresh: `Desliza hacia abajo para actualizar o vuelve más tarde.`, offSeason: `{sport} está en temporada baja`, offSeasonSub: `Vuelve cuando empiece la temporada.`, smartPlayReturns: `LA JUGADA INTELIGENTE VUELVE PRONTO`,
  },

  fr: {
    thePlay: `L'ACTION`, whyItMatters: `POURQUOI C'EST IMPORTANT`, theRule: `LA RÈGLE`, complexPlay: `ACTION COMPLEXE`, updated: `Mis à jour`, latestPlay: `Dernière action`,
    playByPlay: `Action par action`, loadMore: `Charger plus`, noPlays: `Pas encore d'action par action pour ce match.`, showMore: `Voir plus`, showLess: `Voir moins`, pbpHint: `Touchez une action pour l'expliquer · ● action décisive`,
    askFollowUp: `Poser une question`, fuWhy: `Pourquoi est-ce important ?`, fuRule: `Explique la règle`, fuNew: `Explique comme à un débutant`, fuNext: `Que faut-il surveiller ?`,
    share: `Partager Le Smart Play`, askPlaceholder: `Pose une question sur cette action…`, askHint: `Une phrase du commentateur vous échappe ? Posez n'importe quelle question.`, thinking: `Réflexion…`, answerError: `Impossible d'obtenir une réponse. Réessaie.`,
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
    spBaseball: `Baseball`, spFootball: `Football américain`, spBasketball: `Basket-ball`, spHockey: `Hockey`, spSoccer: `Football`, spWorldCup: `Coupe du Monde`, spRugby: `Rugby`,
    noGames: `Aucun match de {sport} aujourd'hui`, selectGame: `Sélectionnez un match ci-dessus pour une explication`, pullRefresh: `Tirez vers le bas pour actualiser ou revenez plus tard.`, offSeason: `{sport} est en intersaison`, offSeasonSub: `Revenez au début de la saison.`, smartPlayReturns: `LE SMART PLAY REVIENT BIENTÔT`,
  },

  pt: {
    thePlay: `A JOGADA`, whyItMatters: `POR QUE IMPORTA`, theRule: `A REGRA`, complexPlay: `JOGADA COMPLEXA`, updated: `Atualizado`, latestPlay: `Última jogada`,
    playByPlay: `Lance a lance`, loadMore: `Carregar mais`, noPlays: `Ainda não há lance a lance para este jogo.`, showMore: `Mostrar mais`, showLess: `Mostrar menos`, pbpHint: `Toque em qualquer jogada para explicá-la · ● jogada de pontuação`,
    askFollowUp: `Faça uma pergunta`, fuWhy: `Por que isso importou?`, fuRule: `Explique a regra`, fuNew: `Explique como se eu fosse novo`, fuNext: `O que observar a seguir?`,
    share: `Compartilhar A Jogada Inteligente`, askPlaceholder: `Pergunte qualquer coisa sobre esta jogada…`, askHint: `Não entendeu algo que o locutor disse? Pergunte o que quiser.`, thinking: `Pensando…`, answerError: `Não foi possível obter uma resposta. Tente novamente.`,
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
    spBaseball: `Beisebol`, spFootball: `Futebol americano`, spBasketball: `Basquete`, spHockey: `Hóquei`, spSoccer: `Futebol`, spWorldCup: `Copa do Mundo`, spRugby: `Rugby`,
    noGames: `Nenhum jogo de {sport} hoje`, selectGame: `Selecione um jogo acima para ver uma explicação`, pullRefresh: `Puxe para baixo para atualizar ou volte mais tarde.`, offSeason: `{sport} está na pré-temporada`, offSeasonSub: `Volte quando a temporada começar.`, smartPlayReturns: `A JOGADA INTELIGENTE VOLTA EM BREVE`,
  },

  de: {
    thePlay: `DER SPIELZUG`, whyItMatters: `WARUM ES ZÄHLT`, theRule: `DIE REGEL`, complexPlay: `KOMPLEXER SPIELZUG`, updated: `Aktualisiert`, latestPlay: `Letzter Spielzug`,
    playByPlay: `Zug für Zug`, loadMore: `Mehr laden`, noPlays: `Für dieses Spiel ist noch kein Zug-für-Zug verfügbar.`, showMore: `Mehr anzeigen`, showLess: `Weniger anzeigen`, pbpHint: `Tippe auf einen Spielzug für die Erklärung · ● Punktespielzug`,
    askFollowUp: `Stell eine Nachfrage`, fuWhy: `Warum war das wichtig?`, fuRule: `Erkläre die Regel`, fuNew: `Erkläre es für Einsteiger`, fuNext: `Worauf sollte ich als Nächstes achten?`,
    share: `The Smart Play teilen`, askPlaceholder: `Frag alles zu diesem Spielzug…`, askHint: `Etwas vom Kommentator nicht verstanden? Frag einfach.`, thinking: `Denkt nach…`, answerError: `Antwort konnte nicht geladen werden. Versuch es erneut.`,
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
    spBaseball: `Baseball`, spFootball: `American Football`, spBasketball: `Basketball`, spHockey: `Eishockey`, spSoccer: `Fußball`, spWorldCup: `WM`, spRugby: `Rugby`,
    noGames: `Heute keine {sport}-Spiele`, selectGame: `Wähle oben ein Spiel für eine Erklärung`, pullRefresh: `Zum Aktualisieren nach unten ziehen oder später wiederkommen.`, offSeason: `{sport} ist in der Saisonpause`, offSeasonSub: `Schau zum Saisonstart wieder vorbei.`, smartPlayReturns: `THE SMART PLAY KEHRT BALD ZURÜCK`,
  },

  it: {
    thePlay: `L'AZIONE`, whyItMatters: `PERCHÉ CONTA`, theRule: `LA REGOLA`, complexPlay: `AZIONE COMPLESSA`, updated: `Aggiornato`, latestPlay: `Ultima azione`,
    playByPlay: `Azione per azione`, loadMore: `Carica altro`, noPlays: `Non c'è ancora l'azione per azione per questa partita.`, showMore: `Mostra altro`, showLess: `Mostra meno`, pbpHint: `Tocca un'azione per spiegarla · ● azione da punto`,
    askFollowUp: `Fai una domanda`, fuWhy: `Perché è stato importante?`, fuRule: `Spiega la regola`, fuNew: `Spiegamelo come a un principiante`, fuNext: `Cosa guardare adesso?`,
    share: `Condividi The Smart Play`, askPlaceholder: `Chiedi qualsiasi cosa su questa azione…`, askHint: `Non hai capito qualcosa detto dal telecronista? Chiedi pure.`, thinking: `Sto pensando…`, answerError: `Impossibile ottenere una risposta. Riprova.`,
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
    spBaseball: `Baseball`, spFootball: `Football americano`, spBasketball: `Basket`, spHockey: `Hockey`, spSoccer: `Calcio`, spWorldCup: `Mondiali`, spRugby: `Rugby`,
    noGames: `Nessuna partita di {sport} oggi`, selectGame: `Seleziona una partita sopra per una spiegazione`, pullRefresh: `Trascina verso il basso per aggiornare o torna più tardi.`, offSeason: `{sport} è in pausa stagionale`, offSeasonSub: `Torna all'inizio della stagione.`, smartPlayReturns: `THE SMART PLAY TORNA PRESTO`,
  },

  ja: {
    thePlay: `プレー`, whyItMatters: `なぜ重要か`, theRule: `ルール`, complexPlay: `複雑なプレー`, updated: `更新`, latestPlay: `最新のプレー`,
    playByPlay: `プレーバイプレー`, loadMore: `もっと見る`, noPlays: `この試合のプレーバイプレーはまだありません。`, showMore: `もっと見る`, showLess: `閉じる`, pbpHint: `プレーをタップして解説 · ● 得点プレー`,
    askFollowUp: `追加で質問する`, fuWhy: `なぜ重要だったの？`, fuRule: `ルールを説明して`, fuNew: `初心者向けに説明して`, fuNext: `次は何に注目すればいい？`,
    share: `The Smart Play を共有`, askPlaceholder: `このプレーについて何でも質問…`, askHint: `アナウンサーの言葉がわからない？何でも質問できます。`, thinking: `考え中…`, answerError: `回答を取得できませんでした。もう一度お試しください。`,
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
    spBaseball: `野球`, spFootball: `アメフト`, spBasketball: `バスケットボール`, spHockey: `アイスホッケー`, spSoccer: `サッカー`, spWorldCup: `ワールドカップ`, spRugby: `ラグビー`,
    noGames: `今日は{sport}の試合がありません`, selectGame: `上の試合を選ぶと解説が表示されます`, pullRefresh: `下に引いて更新するか、後でもう一度確認してください。`, offSeason: `{sport}はオフシーズンです`, offSeasonSub: `シーズンが始まったらまた来てください。`, smartPlayReturns: `THE SMART PLAY まもなく再開`,
  },

  zh: {
    thePlay: `这次进攻`, whyItMatters: `为什么重要`, theRule: `规则`, complexPlay: `复杂战术`, updated: `已更新`, latestPlay: `最新进攻`,
    playByPlay: `逐回合`, loadMore: `加载更多`, noPlays: `本场比赛暂无逐回合记录。`, showMore: `显示更多`, showLess: `收起`, pbpHint: `点按任意回合查看解说 · ● 得分回合`,
    askFollowUp: `继续追问`, fuWhy: `这为什么重要？`, fuRule: `解释一下规则`, fuNew: `像对新手一样解释`, fuNext: `接下来该看什么？`,
    share: `分享 The Smart Play`, askPlaceholder: `关于这次进攻，随便问…`, askHint: `没听懂解说员说的话？随便问。`, thinking: `思考中…`, answerError: `无法获取答案，请重试。`,
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
    spBaseball: `棒球`, spFootball: `美式橄榄球`, spBasketball: `篮球`, spHockey: `冰球`, spSoccer: `足球`, spWorldCup: `世界杯`, spRugby: `橄榄球`,
    noGames: `今天没有{sport}比赛`, selectGame: `选择上面的比赛查看解说`, pullRefresh: `下拉刷新或稍后再来。`, offSeason: `{sport}正处于休赛期`, offSeasonSub: `赛季开始后再来看看。`, smartPlayReturns: `THE SMART PLAY 即将回归`,
  },

  ko: {
    thePlay: `플레이`, whyItMatters: `왜 중요한가`, theRule: `규칙`, complexPlay: `복잡한 플레이`, updated: `업데이트됨`, latestPlay: `최신 플레이`,
    playByPlay: `플레이별 기록`, loadMore: `더 보기`, noPlays: `이 경기의 플레이별 기록이 아직 없습니다.`, showMore: `더 보기`, showLess: `접기`, pbpHint: `플레이를 탭하면 설명이 나와요 · ● 득점 플레이`,
    askFollowUp: `추가 질문하기`, fuWhy: `그게 왜 중요했나요?`, fuRule: `규칙을 설명해 줘`, fuNew: `초보자처럼 설명해 줘`, fuNext: `다음엔 무엇을 봐야 하나요?`,
    share: `The Smart Play 공유`, askPlaceholder: `이 플레이에 대해 무엇이든 물어보세요…`, askHint: `해설자가 한 말이 헷갈리나요? 무엇이든 물어보세요.`, thinking: `생각 중…`, answerError: `답변을 가져오지 못했습니다. 다시 시도하세요.`,
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
    spBaseball: `야구`, spFootball: `미식축구`, spBasketball: `농구`, spHockey: `아이스하키`, spSoccer: `축구`, spWorldCup: `월드컵`, spRugby: `럭비`,
    noGames: `오늘은 {sport} 경기가 없습니다`, selectGame: `위에서 경기를 선택하면 설명이 나와요`, pullRefresh: `아래로 당겨 새로고침하거나 나중에 다시 확인하세요.`, offSeason: `{sport}은 비시즌입니다`, offSeasonSub: `시즌이 시작되면 다시 확인하세요.`, smartPlayReturns: `THE SMART PLAY 곧 돌아옵니다`,
  },

  ar: {
    thePlay: `اللعبة`, whyItMatters: `لماذا تهم`, theRule: `القاعدة`, complexPlay: `لعبة معقدة`, updated: `تم التحديث`, latestPlay: `آخر لعبة`,
    playByPlay: `لعبة بلعبة`, loadMore: `تحميل المزيد`, noPlays: `لا يتوفر بعد سرد لعبة بلعبة لهذه المباراة.`, showMore: `عرض المزيد`, showLess: `عرض أقل`, pbpHint: `اضغط على أي لعبة لشرحها · ● لعبة تسجيل`,
    askFollowUp: `اطرح سؤالاً للمتابعة`, fuWhy: `لماذا كان ذلك مهماً؟`, fuRule: `اشرح القاعدة`, fuNew: `اشرح لي وكأنني مبتدئ`, fuNext: `ما الذي يجب أن أنتبه له تالياً؟`,
    share: `مشاركة The Smart Play`, askPlaceholder: `اسأل أي شيء عن هذه اللعبة…`, askHint: `لم تفهم شيئًا قاله المعلّق؟ اسأل أي شيء.`, thinking: `جارٍ التفكير…`, answerError: `تعذّر الحصول على إجابة. حاول مرة أخرى.`,
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
    spBaseball: `البيسبول`, spFootball: `كرة القدم الأمريكية`, spBasketball: `كرة السلة`, spHockey: `الهوكي`, spSoccer: `كرة القدم`, spWorldCup: `كأس العالم`, spRugby: `الرغبي`,
    noGames: `لا توجد مباريات {sport} اليوم`, selectGame: `اختر مباراة بالأعلى للحصول على شرح`, pullRefresh: `اسحب للأسفل للتحديث أو عُد لاحقاً.`, offSeason: `{sport} في فترة توقف الموسم`, offSeasonSub: `عُد عند بدء الموسم.`, smartPlayReturns: `THE SMART PLAY يعود قريباً`,
  },
};
