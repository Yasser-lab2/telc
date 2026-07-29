export const lesenThemes = [
  {
    id: 'wohnung',
    title: 'Wohnung suchen',
    niveau: 'B1',
    text: 'Mira sucht eine kleine Wohnung in Köln. Sie arbeitet in der Innenstadt und möchte nicht länger als 30 Minuten zur Arbeit fahren. Wichtig sind ihr eine ruhige Lage, eine gute Bahnverbindung und eine helle Küche.',
    questions: [
      {
        id: 'q1',
        prompt: 'Was ist Mira besonders wichtig?',
        options: ['Ein großer Balkon', 'Eine gute Bahnverbindung', 'Ein Garten'],
        answerIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'Wie lange möchte Mira maximal zur Arbeit fahren?',
        options: ['30 Minuten', '45 Minuten', 'Eine Stunde'],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 'arbeit',
    title: 'Termin im Büro',
    niveau: 'B2',
    text: 'Herr Schneider bittet sein Team, die Unterlagen bis Donnerstag zu prüfen. Am Freitag findet eine kurze Besprechung statt, damit offene Fragen vor der Präsentation geklärt werden können.',
    questions: [
      {
        id: 'q1',
        prompt: 'Warum gibt es am Freitag eine Besprechung?',
        options: ['Um offene Fragen zu klären', 'Um Urlaub zu planen', 'Um neue Mitarbeiter zu begrüßen'],
        answerIndex: 0,
      },
    ],
  },
];

export const horenAudios = [
  {
    id: 'bahnhof',
    title: 'Ansage am Bahnhof',
    niveau: 'B1',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    transcript: 'Der Zug nach Hamburg fährt heute von Gleis 8 ab. Die Abfahrt verzögert sich um zehn Minuten.',
    questions: [
      {
        id: 'q1',
        prompt: 'Von welchem Gleis fährt der Zug ab?',
        options: ['Gleis 6', 'Gleis 8', 'Gleis 10'],
        answerIndex: 1,
      },
    ],
  },
  {
    id: 'arzt',
    title: 'Telefonat mit der Praxis',
    niveau: 'B1',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    transcript: 'Die Praxis ist heute bis 16 Uhr geöffnet. Für neue Termine rufen Sie bitte morgen früh wieder an.',
    questions: [
      {
        id: 'q1',
        prompt: 'Bis wann ist die Praxis heute geöffnet?',
        options: ['14 Uhr', '16 Uhr', '18 Uhr'],
        answerIndex: 1,
      },
    ],
  },
];

export const schreibenTypes = [
  {
    id: 'beschwerde',
    title: 'Beschwerde schreiben',
    niveau: 'B1',
    context:
      'Sie haben online einen Sprachkurs gebucht. Der Kursraum war zu klein und der Lehrer kam oft zu spät. Schreiben Sie eine Beschwerde an die Sprachschule.',
  },
  {
    id: 'bitte',
    title: 'Bitte um Informationen',
    niveau: 'B1',
    context:
      'Sie möchten an einem Deutschkurs teilnehmen. Schreiben Sie eine E-Mail und fragen Sie nach Preis, Zeiten und Prüfungsvorbereitung.',
  },
  {
    id: 'absage',
    title: 'Termin absagen',
    niveau: 'B2',
    context:
      'Sie können an einem wichtigen Termin nicht teilnehmen. Schreiben Sie eine höfliche Absage mit Begründung und schlagen Sie einen neuen Termin vor.',
  },
];
