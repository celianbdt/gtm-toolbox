# ABX/ABM Knowledge Base -- Reference Document

> Ce fichier est la base de connaissances de reference pour le skill /abx-abm.
> Il contient toute la methodologie, les outils, les prix, les scoring models, les architectures et les best practices ABX/ABM.

---

## 1. DEFINITIONS FONDAMENTALES

### ABM (Account-Based Marketing)
Strategie marketing B2B qui concentre les ressources sur un ensemble defini de comptes cibles, avec des campagnes personnalisees pour chaque compte.

### ABX (Account-Based Experience)
Version scalable de l'ABM. L'ABX permet une personnalisation extreme a l'echelle. Le client n'achete PAS du Paid, de l'outbound ou du contenu separement -- il achete un **systeme**. L'objectif n'est JAMAIS le volume de leads. L'objectif est le **pipeline**, construit dans le temps via une experience coherente et repetee sur les comptes cibles.

### Difference cle ABM vs ABX
- ABM = approche manuelle, ultra-personnalisee, limitee en scale
- ABX = systeme automatise qui combine paid + outbound + content + signaux pour toucher les bons comptes au bon moment a grande echelle

---

## 2. LOGIQUE DE PROGRESSION ABX (Framework en 5 etapes)

1. **Structurer le marche** et identifier les comptes a forte valeur
2. **Capter l'engagement** sur ces comptes via differents leviers
3. **Transformer l'engagement en signaux exploitables et comparables**
4. **Activer les Sales** uniquement quand le contexte est suffisant
5. **Analyser, ajuster, recommencer**

La repetition est deliberee -- elle permet au systeme de gagner en precision, eliminer le bruit, et ameliorer la qualite des conversations a chaque iteration.

---

## 3. LES 4 PILIERS D'ACTIVATION ABX

| Pilier | Description |
|--------|------------|
| **Contenu** | White papers, webinars, events physiques, case studies, lead magnets |
| **Paid Ads** | Distribution du contenu via LinkedIn Ads, Meta, Google Ads |
| **Outbound** | Activation des leads via sequences email, LinkedIn, WhatsApp, SMS |
| **Outreach** | Contact telephonique par SDR/CSREP pour prise de RDV |

---

## 4. PROCESSUS DE MISSION ABX (4 Phases)

### Phase 1 : TARGET -- Construction et segmentation du TAM (Mois 1)
**Objectif** : Poser les fondations du systeme ABX. Aucun objectif commercial attendu.

**Actions** :
- Scraper et enrichir le marche cible (emails, telephones)
- Segmenter le TAM en tiers (Tier 1, Tier 2, Tier 3)
- Determiner les signaux marche a tracker via outils tiers (visites page pricing, opens email, suivi concurrents, avis)
- Mettre en place le monitoring du TAM pour declencher alertes ou actions a la detection d'un signal
- Demarrer le warm-up email immediatement (le temps technique ne se rattrape pas)
- Securiser tous les acces : comptes pub, CRM, outils outbound, espaces partages

**Livrables** :
- TAM structure, enrichi, exploitable
- Regles de tiering claires (T1/T2/T3/exclusions)
- ICP et personas valides
- Modele de signaux defini
- Modele de scoring (cold/warm/hot)
- Stack operationnelle et routing CRM fonctionnel

### Phase 2 : ENGAGEMENT -- Test & Learn (Mois 2-3)
**Objectif** : Comprendre ce qui genere reellement de l'interet et des conversations.

**Actions** :
- Generer de l'engagement sur le TAM via outbound, contenu et paid
- Lancer des campagnes video LinkedIn (mini motion design avec Jitter) pour generer des signaux faibles
- Creer des audiences basees sur le % de video vue (25%, 50%, 75%) pour le retargeting
- Utiliser des document ads, infographies, carousels comme lead magnets legers quand les vrais lead magnets n'existent pas encore
- Activer l'outbound aussi pour observer les reactions (reponses, clics, interactions, ou absence = signaux exploitables)

**Livrables** :
- Premieres campagnes LinkedIn Ads actives
- Signaux mesurables sur les comptes cibles
- Premieres activations basees sur le scoring
- Scoring ajuste a partir des retours terrain
- Premiers meetings qualifies

### Phase 3 : CAPTURE -- Scoring et activation (Mois 2-3, en parallele)
**Objectif** : Scorer les leads et declencher les actions appropriees.

**Actions** :
- Capturer l'engagement en creant des audiences basees sur les interactions
- Definir un modele de scoring : cold/warm/hot
- Automatiser les actions via Make ou N8N (placement dans audience specifique, lancement campagne outreach, ajout au pipe Sales)

### Phase 4 : MEASURE -- Run et optimisation continue (Mois 4-12)
**Objectif** : Transformer le systeme en moteur de pipeline regulier.

**Livrables** :
- Scoring stabilise et fiable
- Segments reellement rentables identifies
- Automatisations renforcees
- Pilotage mensuel du pipeline ABX
- Documentation vivante des decisions et iterations

---

## 5. PROGRESSION SEQUENTIELLE DES METRIQUES (Ordre obligatoire)

**Etape 1 : Engagement** (likes, clics, telechargements) -- doit etre atteint en premier
**Etape 2 : Conversations ouvertes** (demandes de demo, reponses outbound, meetings bookes) -- impossible sans etape 1
**Etape 3 : Revenue** (deals ouverts, pipeline) -- impossible sans etape 2

> On ne peut PAS sauter d'etape. Chaque etape prepare la suivante.

---

## 6. MODELES DE SCORING

### Structure du scoring
- Utiliser des **plages larges** (ex: -1000 a +1000) pour rendre les ecarts visibles et les decisions evidentes
- Le scoring sert de "juge" : il determine quand un compte merite une activation commerciale vs quand c'est trop tot
- Le scoring doit etre **clair, lisible, et partage** avec les Sales

### Trois niveaux de scoring

| Niveau | Points | Definition | Action declenchee |
|--------|--------|-----------|-------------------|
| **Cold (Froid)** | Bas | Open newsletter, interaction minimale | Nurturing passif uniquement |
| **Warm (Tiede)** | ~100 pts | Engagement modere accumule | Outbound, ajout LinkedIn, travail one-to-one |
| **Hot (Chaud)** | ~200 pts | Engagement fort ou action forte | Appel telephonique direct, action one-to-one immediate |

### Bypass du scoring
Les actions a fort engagement (ex: demande de demo) declenchent directement le statut "Hot", quel que soit le score accumule.

### Categories d'engagement (modele interne)

| Categorie | Score | Actions |
|-----------|-------|---------|
| **High Engaged** | 66-133 | Connait deja la marque ; envoye directement au SDR pour prise de RDV + invite aux events |
| **Mid Engaged** | < 66 | Approche moins directe ; nourri avec du contenu pour l'aider a identifier la marque comme solution |

---

## 7. TYPES DE SIGNAUX

### Signaux faibles (Weak Signals)
- Vues video (25%, 50%, 75%)
- Interactions posts (likes, commentaires, partages)
- Clics pub
- Opens newsletter
- Visites site web
- Opens email

### Signaux forts (Strong Signals)
- Demande de demo (bypass direct vers "Hot")
- Telechargement lead magnet
- 75% de completion video
- Visite page pricing
- Suivi concurrents / avis
- Telechargement de contenu (echange d'info contre engagement)

### Intents endogenes (signaux internes)
- Visites site web
- Opens email
- Telechargements contenu
- Clics pub
- Interactions LinkedIn (vues video, engagement post, visites profil)

### Intents exogenes (signaux externes/marche)
- Changements de poste dans les comptes cibles
- Recrutements dans les comptes cibles (indique un besoin potentiel)
- Monitoring concurrents
- Avis / reviews

---

## 8. MODELE DE TIERING

### Tiering par taille d'entreprise (modele generique)

| Tier | Definition | Volumes ideaux |
|------|-----------|---------------|
| **Tier 0** | 0-20 employes OU agences marketing (concurrents) | Exclus |
| **Tier 3** | 20-50 employes | Variable |
| **Tier 2** | 50-200 employes | ~2 000 comptes |
| **Tier 1** | 200+ employes (avec exceptions pour missions reussies ou contrats high-value) | 300-500 comptes |

### Regles de tiering
- Le tiering doit etre adapte a chaque client en fonction de son marche
- Les criteres peuvent inclure : taille, secteur, CA, maturite, priorites commerciales
- Un Tier 1 trop large dilue la personnalisation ; un Tier 1 trop restreint limite le paid
- **Ideal Tier 1** : 300-500 comptes
- **Ideal Tier 2** : ~2 000 comptes (peut aller jusqu'a 20 000 pour le paid mais c'est trop large)

### Categorisation des personas

| Categorie | Description |
|-----------|------------|
| **Decideur** | Cible prioritaire |
| **Operationnel / Manager** | Cible secondaire |
| **Hors scope** | Freelance, junior, non-marketing |

---

## 9. ARCHITECTURE TECHNIQUE ET DATA

### Flux de donnees

```
Sources de signaux (ReactIn, LinkedIn, Site web, Email)
    --> Clay.com (agregation + enrichissement + personnalisation IA)
        --> CRM (HubSpot ou autre)
        --> Outil outbound (Lemlist, Salesloft)
        --> LinkedIn Ads (upload audiences)
```

### Construction du TAM
1. Recherche personas et ICP selon priorites client
2. Analyse des reponses client, discussions clients, temoignages, donnees CRM
3. Construction base TAM utilisee pour paid, outbound et creation de contenu
4. Acquisition donnees via API (ex: Find People, mises a jour trimestrielles)
5. Ne PAS scraper tout le TAM d'un coup -- activer progressivement par petits lots tests

### Upload audiences LinkedIn
- Upload de **listes d'entreprises + ciblage job title manuel** est plus efficace que l'upload d'emails professionnels seuls
- Les taux de match sont meilleurs avec le ciblage base entreprise

### Warm-up email
- A commencer le plus tot possible, meme si l'outbound n'est pas immediatement active
- Le temps technique de warm-up ne se rattrape pas

### Automatisation
- **Make** ou **N8N** pour : placement dans audience specifique, lancement campagne outreach, ajout au pipe Sales
- **Zapier** pour construction du pipeline de lead scoring et connexion LinkedIn lead gen vers CRM

---

## 10. SEQUENCES OUTBOUND PAR TYPE DE SIGNAL

| Signal detecte | Action declenchee |
|---------------|-------------------|
| **Interaction post** (commentaire, partage, clic) | Invitation LinkedIn par le commercial + message automatise |
| **Visite site web (non-paid)** | Sequence email/mailing pour generer interaction |
| **Telechargement lead magnet** | Invitation LinkedIn par le commercial + message personnalise base sur le contenu telecharge |
| **Vue video 50%+** | Ajout audience retargeting + creation signal intent pour outbound |
| **Demande de connexion LinkedIn** | Tracke dans table intents Clay |
| **Visite profil LinkedIn** | Tracke dans table intents Clay |

### Types de campagnes outbound
- **Intent-Based campaigns** : declenchees par des signaux
- **Nurturing campaigns** : pour les leads issus de campagnes lead magnet
- **Intents Endogenes** : visites site, opens email
- **Intents Exogenes** : changements de poste, recrutements dans les cibles

---

## 11. CONTENU ET FORMATS

### 4 familles de formats de contenu
1. **Formats classiques** : white papers, guides, benchmarks
2. **Fake presentations** : decks simules type "Strategie 2025"
3. **Case studies** : etudes de cas clients
4. **Contenu interactif** : GIFs, videos scrollables, calculateurs d'economies

### Best practices contenu
- Les propositions de valeur doivent donner des signaux sur les comptes (ex: telecharger "Budget Marketing 2025" = le client construit son budget)
- Quand pas de vrais lead magnets : utiliser des formats legers (document ads, infographies, carousels)
- **Visuels humains** (photos de collaborateurs) > visuels produit pour les posts sponsorises
- **Duree video optimale** : 45 secondes a 1 minute
- Utiliser l'IA (Gemini + Gamma) pour produire des lead magnets quand le client n'a pas d'equipe marketing
- **TLA (Thought Leadership Ads)** : posts sponsorises depuis des profils personnels ; envoyer un message de remerciement apres interaction = **60-70% de taux de reponse**

---

## 12. METRIQUES ET KPIs

### Metriques d'engagement (Phase 1)
- Likes, clics, telechargements
- % de vues video (25%, 50%, 75%)
- Interactions posts
- Opens email et newsletter
- Visites site web

### Metriques de conversation (Phase 2)
- Demandes de demo
- Taux de reponse outbound
- Appels passes
- RDV acceptes

### Metriques de revenue (Phase 3)
- Deals ouverts
- Pipeline genere
- MQL, SQL, deals signes

### Benchmarks de performance references

| Metrique | Valeur |
|----------|--------|
| Leads/semaine sur paid | 1-3 |
| CPL paid general | ~5 euros |
| CPL lead magnets | 35-40 euros (mais qualifie) |
| Conversion outreach | 10-20% |
| Nouveaux meetings/semaine (outreach) | 20-30 |
| Taux reponse TLA | 60-70% (avec message remerciement) |
| Video optimale | 45s-1min |
| Vue video signal intent | 50%+ |
| No-show rate acceptable | < 30% |
| Cycle de vente moyen | ~4 mois |

---

## 13. STACK OUTILS ET PRICING (Mars 2026)

### OUTILS CORE

#### Clay.com -- Orchestration data (CENTRAL)
| Plan | Prix/mois | Credits/mois | CRM Integration |
|------|-----------|-------------|-----------------|
| Free | 0 | 100 | Non |
| Starter | 134-149 euros | 2 000-3 000 | Non |
| Explorer | 314-349 euros | 10 000-20 000 | Non |
| Pro | 720-800 euros | 50 000-150 000 | Oui |
| Enterprise | Custom (~2 500+/mois) | 200 000-500 000 | Oui |

- ~10 credits/lead en workflow standard (prospect + enrich company + find email + find mobile + AI personalization)
- Starter suffit pour demarrer (200 leads enrichis/mois)
- Pro necessaire des que CRM integration requise
- Credits non utilises cumulent (max 2x le plan mensuel)
- LinkedIn enrichment necessite LinkedIn Sales Navigator ($99.99/mois/user en plus)

#### HubSpot -- CRM
**Sales Hub** :
| Plan | Prix/mois | Details |
|------|-----------|---------|
| Free | 0 | Basique |
| Starter | 20 euros/seat | 1 core seat inclus |
| Professional | 100 euros/seat | Onboarding: 1 500 euros |
| Enterprise | 150 euros/seat | Onboarding: 3 500 euros |

**Marketing Hub** :
| Plan | Prix/mois | Contacts marketing inclus |
|------|-----------|--------------------------|
| Free | 0 | 2 000 envois/mois |
| Starter | 15 euros/seat | 1 000 contacts |
| Professional | 890 euros | 2 000 contacts, 3 seats inclus. Onboarding: 3 000 euros |
| Enterprise | 3 600 euros | 10 000 contacts, 5 seats inclus. Onboarding: 7 000 euros |

**Bundle Starter Customer Platform** : 15-20 euros/user/mois (Marketing + Sales + Service + Content + Data Hub Starter)

- Engagement annuel obligatoire pour Pro et Enterprise
- Paiement annuel economise 10-20%
- Startups : 30-90% de remise la premiere annee
- Negociable en fin de trimestre ou via Solutions Partner

#### ReactIn -- Intent tracking LinkedIn
| Plan | Prix/mois | Details |
|------|-----------|---------|
| Basic | 29 euros | Invitations seulement |
| Growth | 69 euros | Full automation (invitations + messages + inbox unifiee) |
| Agency | 199 euros | 5 seats inclus |
| SaaS/Agency Special | 1 000 euros | Jusqu'a 50 comptes LinkedIn |

- Fonctionne avec LinkedIn Free, Premium ou Sales Navigator
- Pas besoin de Sales Navigator pour les fonctionnalites core

### OUTILS OUTBOUND

#### Lemlist
| Plan | Prix/mois/user | Details |
|------|---------------|---------|
| Email Pro | 55-69 euros | Campagnes email illimitees, warm-up, 450M+ base leads, 200 credits enrichissement |
| Multichannel Expert | 79-99 euros | + LinkedIn automation, cold calling, 400 credits enrichissement |
| Enterprise | Custom | Min 5 users, SSO, compte manager dedie |

- Reduction : -10% trimestriel, -20% annuel
- Credits supplementaires : 50 euros / 5 000 credits

#### Salesloft
| Plan | Prix/mois/user | Details |
|------|---------------|---------|
| Essentials | ~140 euros | Petites equipes |
| Advanced | ~180 euros | Plan le plus populaire |
| Premier | Custom | +20-40% vs Advanced |

- Dialer en add-on : 200 euros/user/an
- Negociation possible : 35-45% de remise sur le prix liste
- Contrat annuel obligatoire. Onboarding ~3 000 euros possible

### OUTILS AUTOMATION

#### Make.com
| Plan | Prix/mois | Operations/mois |
|------|-----------|----------------|
| Free | 0 | 1 000 |
| Core | 10.59 euros | 10 000 |
| Pro | 18.82 euros | + execution prioritaire |
| Teams | 34.12 euros | + collaboration equipe |
| Enterprise | Custom | SSO, audit logs, SLA |

- 3-5x moins cher que Zapier pour les memes workflows
- Credits ne expirent pas
- Attention aux scenarios haute frequence qui consomment vite

#### N8N
- Alternative open-source a Make
- Self-hosted gratuit ou cloud a partir de ~20 euros/mois
- Plus puissant que Make mais necessite plus de competences techniques

#### Zapier
- A partir de ~20 euros/mois pour 750 tasks
- Plus cher que Make a volume equivalent
- Plus simple d'utilisation, plus de connecteurs natifs

### OUTILS PAID

#### LinkedIn Ads
| Metrique | Fourchette 2026 |
|----------|----------------|
| CPC moyen | 4.50-12 euros |
| CPM moyen | 28-55 euros |
| Cout par InMail envoye | 0.20-1 euros |
| Budget minimum/jour | 10 euros |
| Budget recommande pour tester | 25-100 euros/jour |
| Budget recommande ABX notoriete | ~500 euros/mois |
| Budget recommande ABX complet | 3 000-5 000 euros/mois |

- Le ciblage C-suite et industries competitives (tech, finance) = CPC de 10-15+ euros
- Q4 et Q1 : CPM +20-40% plus eleves

#### Google Ads
- CPC typique B2B : 2-8 euros
- Moins efficace pour le B2B niche que LinkedIn Ads
- Utile principalement pour la brand awareness

#### Meta Ads
- CPC moyen : 0.26-0.50 euros (beaucoup moins cher que LinkedIn)
- Pertinent pour le retargeting et la notoriete
- Moins precis en ciblage B2B

### OUTILS CONTENU

#### Gamma
- Free : 400 credits IA
- Plus : 8 euros/mois, credits illimites
- Pour generer des presentations/lead magnets rapidement

#### Gemini (Google)
- Free avec compte Google
- Pro : 20 euros/mois
- Pour generer du contenu textuel long format (white papers, guides)

#### Jitter
- Free : basique
- Pro : 19 euros/mois
- Pour mini motion design video LinkedIn

### OUTILS COLLABORATION

#### Whimsical / Miro
- Pour mind-maps de la roadmap ABX et visualisation strategie
- Whimsical : Free ou 10 euros/mois ; Miro : Free ou 8 euros/mois

#### Notion
- Pour documentation des propositions de valeur et workspace partage
- Free ou 10 euros/user/mois

---

## 14. STACKS RECOMMANDEES PAR BUDGET

### Stack Minimale (< 500 euros/mois)
**Pour** : Solopreneurs, startups early-stage, test ABX

| Outil | Plan | Prix/mois |
|-------|------|-----------|
| HubSpot | Free CRM | 0 |
| Clay | Starter | 134 euros |
| ReactIn | Basic | 29 euros |
| Lemlist | Email Pro (annuel) | 55 euros |
| LinkedIn Ads | Budget notoriete | ~500 euros |
| Make | Core | 10.59 euros |
| Gamma | Plus | 8 euros |
| **TOTAL** | | **~737 euros/mois** |

> Limitations : pas d'integration CRM native dans Clay, pas de multichannel outbound, audience LinkedIn limitee

### Stack Standard (1 500-3 000 euros/mois)
**Pour** : PME B2B en croissance, 1-2 SDRs

| Outil | Plan | Prix/mois |
|-------|------|-----------|
| HubSpot | Starter Customer Platform x2 seats | 40 euros |
| Clay | Explorer | 314 euros |
| ReactIn | Growth | 69 euros |
| Lemlist | Multichannel Expert x2 | 158 euros |
| LinkedIn Ads | Budget ABX | 2 000-3 000 euros |
| Make | Pro | 18.82 euros |
| Gamma + Jitter | Pro + Pro | 27 euros |
| **TOTAL** | | **~2 627-3 627 euros/mois** |

### Stack Premium (5 000-10 000 euros/mois)
**Pour** : Scale-ups, equipes sales de 5-10 personnes

| Outil | Plan | Prix/mois |
|-------|------|-----------|
| HubSpot | Professional (Sales + Marketing) | ~990 euros |
| Clay | Pro | 720 euros |
| ReactIn | Agency | 199 euros |
| Salesloft | Advanced x5 | ~900 euros (negocie) |
| LinkedIn Ads | Budget ABX | 3 000-5 000 euros |
| Make | Teams | 34 euros |
| Contenu (Gamma + Jitter + Gemini Pro) | | ~47 euros |
| **TOTAL** | | **~5 890-7 890 euros/mois** |

### Stack Enterprise (15 000+ euros/mois)
**Pour** : ETI/Grands comptes, equipes sales 10+

| Outil | Plan | Prix/mois |
|-------|------|-----------|
| HubSpot | Enterprise (Sales + Marketing) | ~3 750 euros |
| Clay | Enterprise | ~2 500 euros |
| ReactIn | SaaS/Agency Special | 1 000 euros |
| Salesloft | Premier x10 | ~2 000 euros (negocie) |
| LinkedIn Ads | Budget ABX | 5 000-15 000 euros |
| Make | Enterprise | ~500 euros |
| **TOTAL** | | **~14 750-24 750 euros/mois** |

---

## 15. TABLES CLES CRM (HubSpot)

### Table Companies (Objets Entreprise)
| Champ | Type | Description |
|-------|------|-------------|
| company_name | Text | Nom de l'entreprise |
| domain | Text | Domaine web |
| industry | Dropdown | Secteur d'activite |
| employee_count | Number | Nombre d'employes |
| annual_revenue | Number | CA annuel estime |
| tier | Dropdown (T0/T1/T2/T3) | Tier ABX |
| abx_status | Dropdown | Cold / Warm / Hot |
| abx_score | Number | Score ABX cumule |
| abx_segment | Text | Segment ABX (industrie, taille, etc.) |
| first_signal_date | Date | Date du premier signal detecte |
| last_signal_date | Date | Date du dernier signal detecte |
| signal_count | Number | Nombre total de signaux detectes |
| source_channel | Dropdown | Paid / Outbound / Inbound / Organic |
| owner | HubSpot User | Commercial assigne |
| lifecycle_stage | Dropdown | Standard HubSpot |

### Table Contacts
| Champ | Type | Description |
|-------|------|-------------|
| firstname / lastname | Text | Identite |
| email | Email | Email professionnel |
| personal_email | Email | Email personnel (pour LinkedIn matching) |
| phone | Phone | Telephone direct |
| job_title | Text | Titre du poste |
| persona_category | Dropdown | Decideur / Operationnel / Hors scope |
| linkedin_url | URL | Profil LinkedIn |
| associated_company | Lookup | Lien vers table Companies |
| engagement_score | Number | Score d'engagement individuel |
| engagement_category | Dropdown | High Engaged / Mid Engaged / Low Engaged |
| last_interaction_type | Dropdown | Post interaction / Video view / Lead magnet / Site visit / Demo request |
| last_interaction_date | Date | Date derniere interaction |
| outbound_sequence | Text | Nom de la sequence outbound en cours |
| is_champion | Boolean | Champion detecte oui/non |

### Table Signals (Objet personnalise ou via Clay)
| Champ | Type | Description |
|-------|------|-------------|
| signal_id | Auto | ID unique |
| contact | Lookup | Contact associe |
| company | Lookup | Entreprise associee |
| signal_type | Dropdown | Post interaction / Video view 25% / Video view 50% / Video view 75% / Lead magnet download / Site visit / Demo request / Profile visit / Connection request / Job change / Hiring signal |
| signal_source | Dropdown | LinkedIn Ads / Google Ads / Website / Email / Organic |
| signal_strength | Dropdown | Weak / Strong |
| signal_date | Date | Date du signal |
| campaign_name | Text | Nom de la campagne source |
| content_asset | Text | Asset de contenu associe |
| points_attributed | Number | Points attribues au scoring |
| action_triggered | Text | Action declenchee (sequence outbound, ajout audience, etc.) |

### Table Campaigns (pour tracking ABX)
| Champ | Type | Description |
|-------|------|-------------|
| campaign_name | Text | Nom de la campagne |
| campaign_type | Dropdown | Paid / Outbound / Content / Event |
| channel | Dropdown | LinkedIn / Google / Email / Phone / Website |
| target_tier | Multi-select | T1 / T2 / T3 |
| value_proposition | Text | Proposition de valeur associee |
| start_date | Date | Date de lancement |
| budget | Number | Budget alloue |
| leads_generated | Number | Leads generes |
| meetings_booked | Number | RDV bookes |
| pipeline_generated | Number | Pipeline genere (euros) |
| cost_per_lead | Number | CPL |
| status | Dropdown | Active / Paused / Completed |

---

## 16. CHECKLIST DE DEMARRAGE PROJET ABX

### Semaine 1 : Kick-off et preparation
- [ ] Reunion kick-off : collecter offre, cycles de vente, priorites commerciales, organisation Sales, objections recurrentes, maturite marketing, contraintes internes
- [ ] Securiser tous les acces : comptes pub, CRM, outils outbound, espaces partages
- [ ] Creer la mind-map strategie sur Whimsical/Miro
- [ ] Demarrer le warm-up email
- [ ] Commander les licences outils

### Semaines 2-3 : Construction TAM et infrastructure
- [ ] Definir l'ICP et les personas
- [ ] Construire le TAM et le segmenter en tiers
- [ ] Enrichir les donnees via Clay
- [ ] Configurer le scoring dans le CRM
- [ ] Mettre en place le tracking des signaux (ReactIn, tracking site web)
- [ ] Documenter les propositions de valeur sur Notion/Google Sheets

### Semaine 4 : Lancement
- [ ] Creer les premiers contenus/lead magnets (avec IA si besoin)
- [ ] Configurer les campagnes LinkedIn Ads (video, document ads, TLA)
- [ ] Configurer les sequences outbound par type de signal
- [ ] Upload des audiences sur LinkedIn (listes entreprises + job titles)
- [ ] Lancer les campagnes paid et outbound simultanement

### Mois 2-3 : Test & Learn
- [ ] Analyser les signaux generes
- [ ] Ajuster le scoring selon les retours Sales
- [ ] Tester differents angles de contenu et formats
- [ ] Iterer sur les sequences outbound (personnalisation)
- [ ] Nettoyer le CRM et reintroduire les nouveaux contacts TAM

### Mois 4+ : Run
- [ ] Concentrer les efforts sur les strategies performantes
- [ ] Renforcer les automatisations
- [ ] Detection de champions
- [ ] Pilotage mensuel du pipeline ABX
- [ ] Documentation continue

---

## 17. BEST PRACTICES

### Strategiques
- ABX ne vise JAMAIS le volume de leads -- il vise le **pipeline**
- Chaque etape prepare la suivante ; aucune n'est optionnelle
- Le systeme est volontairement repetitif -- la repetition engendre la precision
- Ne pas appliquer un modele unique mecaniquement -- adapter a la realite du TAM
- Un TAM restreint implique plus de personnalisation ; un TAM large necessite plus de structuration, signaux et automatisation
- Toujours penser a l'etape suivante quand on lance un premier batch

### Operationnelles
- Securiser tous les acces des le debut (comptes pub, CRM, outils outbound, espaces partages)
- Demarrer le warm-up email ASAP
- Coordonner avec les ressources internes du client (designer, content team, relais organiques) des le debut
- Ne PAS scraper tout le TAM d'un coup -- activer progressivement par petits lots tests
- Documenter chaque decision : tests lances, choix valides, approches abandonnees

### Paid
- Budget notoriete recommande : ~500 euros/mois (maintenir l'omnipresence sans chercher la conversion immediate)
- Upload listes entreprises sur LinkedIn (plus efficace que emails seuls) + ciblage job title manuel
- 50% de vue video = signal d'intention
- Tester differents objectifs pub : Conversation Ads, Document Ads
- Audiences trop petites nuisent aux campagnes paid (retargeting limite, volume de distribution limite)

### Outbound
- JAMAIS de cold pur : toujours baser l'outbound sur un signal d'intention detecte
- Sequences differentes pour signaux differents
- TLA + message de remerciement = 60-70% taux de reponse
- Bons taux d'ouverture mais faibles taux de reponse = probleme de personnalisation, PAS de ciblage
- Integrer des etapes d'appel telephonique dans les sequences une fois les SDRs en place

### Scoring et Sales
- Construire le scoring en collaboration avec les Sales
- Activation uniquement quand les signaux cumules atteignent un seuil defini
- A l'activation, les Sales ont le contexte : le compte a ete expose aux messages, a montre un interet mesurable, reconnait les problemes adresses
- Le feedback Sales et la performance mesuree nourrissent les ajustements strategie

### Attribution
- L'attribution est un enjeu cle : doit etre configuree pour mesurer l'impact ABX sur MQL, SQL, deals signes
- La detection de champions doit etre un projet prioritaire
- Le CRM doit etre nettoye et maintenu comme base de donnees vivante

---

## 18. AUDIT ABX -- GRILLE D'EVALUATION

### 1. Fondations (Score /20)
- [ ] ICP et personas clairement definis et documentes (/4)
- [ ] TAM construit, enrichi, et segmente en tiers (/4)
- [ ] Modele de scoring defini et partage avec les Sales (/4)
- [ ] Stack outils en place et fonctionnelle (/4)
- [ ] Warm-up email fait et deliverabilite bonne (/4)

### 2. Engagement (Score /20)
- [ ] Campagnes paid actives et bien ciblees (/4)
- [ ] Contenu de qualite adapte aux personas (/4)
- [ ] Signaux d'intention trackes et exploites (/4)
- [ ] Sequences outbound differenciees par signal (/4)
- [ ] TLA et social selling actifs (/4)

### 3. Data et Automatisation (Score /20)
- [ ] Clay ou equivalent configure comme hub central (/5)
- [ ] CRM propre avec bon routing (/5)
- [ ] Automatisations fonctionnelles (Make/N8N/Zapier) (/5)
- [ ] Attribution en place et mesuree (/5)

### 4. Sales Alignment (Score /20)
- [ ] SDRs dedies par tier (/5)
- [ ] Scoring co-construit avec les Sales (/5)
- [ ] Feedback loop en place (Sales --> Marketing --> Ajustement) (/5)
- [ ] Detection de champions active (/5)

### 5. Performance et Iteration (Score /20)
- [ ] Metriques sequentielles suivies (Engagement --> Conversations --> Revenue) (/5)
- [ ] Iteration mensuelle documentee (/5)
- [ ] Segments rentables identifies (/5)
- [ ] Pipeline ABX mesurable et en croissance (/5)

**Score total : /100**
- 0-30 : ABX inexistant ou embryonnaire
- 31-50 : Fondations posees mais execution faible
- 51-70 : ABX fonctionnel, optimisation necessaire
- 71-85 : ABX mature et performant
- 86-100 : ABX best-in-class

---

## 19. CAS D'USAGE REFERENCES (Anonymises)

### Cas 1 : Startup hardware B2B, pas d'equipe marketing
- 400 clients existants, equipe commerciale de 7 personnes
- CRM (Microsoft Dynamics) sous-exploite
- Solution : ABX avec Clay + ReactIn + Salesloft + LinkedIn Ads
- AI (Gemini + Gamma) pour compenser l'absence d'equipe marketing
- Budget paid : 3 000 euros/mois
- Resultats : CPL lead magnets 35-40 euros, TLA 60-70% response rate, bons open rates outbound

### Cas 2 : Agence growth en propre
- 4 leviers : paid, outbound, outreach, contenu
- Segmentation par secteur (ex: BTP/construction)
- Budget paid : ~500 euros
- Resultats : 1-3 leads/semaine paid a ~5 euros CPL, 10-20% conversion outreach, 20-30 nouveaux meetings/semaine

### Cas 3 : Optimisation d'un process de qualification existant
- Avant : 25 meetings/semaine mais no-show >30%, mauvaise qualite leads
- Apres : Clay + HubSpot pour qualification, categorisation personas, tiering entreprises, scoring engagement
- Resultat : reduction du no-show, meilleure qualite des meetings, temps commercial mieux utilise
