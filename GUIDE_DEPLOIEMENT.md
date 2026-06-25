# 🇧🇫 BurkinaMarket — Guide Complet de Déploiement

## 📋 Table des matières
1. [Architecture de l'application](#architecture)
2. [Configuration Supabase](#supabase)
3. [Variables d'environnement](#env)
4. [Déploiement sur Netlify](#netlify)
5. [Déploiement sur Vercel](#vercel)
6. [Installation PWA](#pwa)
7. [Guide Administrateur](#admin)
8. [Fonctionnalités détaillées](#fonctionnalites)

---

## 🏗️ Architecture {#architecture}

```
BurkinaMarket/
├── src/
│   ├── App.js                    ← Navigation principale + modals globales
│   ├── index.js                  ← Point d'entrée + Service Worker PWA
│   ├── index.css                 ← Tous les styles (design Burkina vert/or)
│   ├── supabase.js               ← Config Supabase + constantes métier
│   ├── hooks/
│   │   └── useAuth.js            ← Contexte authentification global
│   ├── components/
│   │   ├── AuthModal.js          ← Connexion / Inscription
│   │   ├── AnnonceCard.js        ← Carte d'une annonce
│   │   ├── AnnonceModal.js       ← Créer / Modifier une annonce
│   │   ├── PaiementModal.js      ← Process paiement Orange Money
│   │   └── Toast.js              ← Notifications
│   └── pages/
│       ├── HomePage.js           ← Accueil + recherche + listing
│       ├── DashboardPage.js      ← Espace utilisateur
│       └── AdminPage.js          ← Panneau admin
└── public/
    ├── manifest.json             ← Config PWA installable
    └── index.html                ← HTML avec meta PWA
```

**Stack technique :**
- **Frontend** : React 18, CSS custom (sans framework)
- **Base de données** : Supabase (PostgreSQL + Auth + Storage)
- **Paiement** : Orange Money via USSD + validation manuelle admin
- **PWA** : Service Worker CRA, installable sur Android/iOS/Desktop

---

## ⚙️ Configuration Supabase {#supabase}

### Étape 1 — Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Cliquez **New Project**
3. Nommez-le `burkinamarket`, choisissez une région proche (Europe West)
4. Notez bien votre **Project URL** et **anon key**

### Étape 2 — Exécuter le schéma SQL

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Créez une nouvelle query
3. Copiez-collez tout le contenu du fichier `src/schema.sql`
4. Cliquez **Run**

Ceci crée :
- Table `profiles` — profils utilisateurs
- Table `annonces` — toutes les annonces
- Table `paiements` — demandes d'abonnement
- Storage buckets `annonces` (images publiques) et `captures` (preuves de paiement)
- Triggers automatiques pour créer les profils
- Politiques RLS (sécurité niveau ligne)

### Étape 3 — Configurer l'authentification

1. Dans Supabase → **Authentication → Settings**
2. Activez **Email Confirmations** si vous voulez vérifier les emails
3. Personnalisez le template d'email de bienvenue (optionnel)
4. Dans **URL Configuration**, ajoutez votre domaine de production

### Étape 4 — Configurer le Storage

1. Dans Supabase → **Storage**
2. Vérifiez que les buckets `annonces` (public) et `captures` (privé) sont créés
3. Si pas créés automatiquement, créez-les manuellement

---

## 🔑 Variables d'environnement {#env}

Créez un fichier `.env` à la racine du projet :

```env
REACT_APP_SUPABASE_URL=https://votre-projet-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=votre-clé-anon-ici
REACT_APP_ADMIN_EMAIL=votre-email-admin@example.com
REACT_APP_ADMIN_WHATSAPP=22665413799
```

> ⚠️ **Important** : L'email admin DOIT correspondre exactement au compte Supabase créé avec cet email. C'est cet email qui débloque le panneau d'administration.

### Où trouver les clés Supabase :
- Supabase Dashboard → **Settings** → **API**
- **Project URL** → `REACT_APP_SUPABASE_URL`
- **anon public** → `REACT_APP_SUPABASE_ANON_KEY`

---

## 🚀 Déploiement sur Netlify {#netlify}

### Option A — Via l'interface Netlify (recommandé)

1. Allez sur [netlify.com](https://netlify.com) et connectez votre compte GitHub
2. Importez ce dépôt
3. Configuration du build :
   - **Build command** : `npm run build`
   - **Publish directory** : `build`
4. Dans **Environment Variables**, ajoutez vos 4 variables `.env`
5. Cliquez **Deploy**

### Option B — Via CLI

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=build
```

### Fichier `netlify.toml` (créer à la racine) :

```toml
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🚀 Déploiement sur Vercel {#vercel}

```bash
npm install -g vercel
vercel login
vercel --prod
```

Ou directement via [vercel.com](https://vercel.com) en important le repo GitHub.

**Fichier `vercel.json`** (créer à la racine) :
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## 📱 Installation PWA {#pwa}

L'application est **installable depuis le navigateur** sur tous les appareils :

### Sur Android (Chrome)
1. Ouvrir l'application dans Chrome
2. Une bannière "Ajouter à l'écran d'accueil" apparaît automatiquement
3. Sinon : menu ⋮ → **Ajouter à l'écran d'accueil**

### Sur iPhone (Safari)
1. Ouvrir dans Safari
2. Bouton partage □↑ → **Sur l'écran d'accueil**

### Sur Desktop (Chrome/Edge)
1. Une icône d'installation apparaît dans la barre d'adresse
2. Cliquez dessus → **Installer**

### Fonctionnalités PWA activées :
- ✅ Fonctionne hors ligne (pages en cache)
- ✅ Icône sur l'écran d'accueil
- ✅ Plein écran sans barre de navigateur
- ✅ Thème couleur vert Burkina `#2D6A4F`

---

## 🛡️ Guide Administrateur {#admin}

### Accès au panneau admin

1. Créez votre compte avec l'email défini dans `REACT_APP_ADMIN_EMAIL`
2. Connectez-vous → le menu **Administration** apparaît automatiquement
3. Sur mobile : bouton **Admin** dans la navigation du bas

### Tableau de bord admin — 3 sections :

#### 👥 Utilisateurs
- Voir tous les inscrits avec leurs informations
- Voir le statut d'abonnement (Basique / Premium / Certifié)
- Date d'inscription et expiration abonnement

#### 💳 Paiements — **Section la plus importante**
- Liste de toutes les demandes d'abonnement
- Statut : ⏳ En attente / ✅ Validé / ❌ Refusé
- Bouton **Voir** pour voir la capture de paiement envoyée
- Bouton **✅ Valider** : active l'abonnement + met à jour le profil automatiquement
- Bouton **❌ Refuser** : marque comme refusé

> 💡 Lorsqu'un utilisateur paie, il envoie sa capture via WhatsApp ET via l'application. Vous validez dans l'app, l'abonnement s'active automatiquement pour 30 jours.

#### 📋 Annonces
- Voir toutes les annonces publiées
- Activer / Désactiver une annonce
- Supprimer définitivement

---

## 📦 Fonctionnalités détaillées {#fonctionnalites}

### Types d'annonces

| Type | Champs spéciaux | Bouton visiteur |
|------|----------------|-----------------|
| 🛠 Offre de service | Prix (optionnel) | "Intéressé(e)" |
| 💼 Offre d'emploi | Prix/Salaire, Date limite | "Intéressé(e)" |
| 🎓 Formation | Date limite | "Intéressé(e)" |
| 🛍 Article à vendre | Prix obligatoire recommandé | "Acheter" |
| 🔍 Recherche d'emploi | — | "Contacter" |

### Formules d'abonnement

| Formule | Prix | Annonces | Avantages |
|---------|------|----------|-----------|
| Basique | Gratuit | 10 max | Fonctionnalités de base |
| Premium | 2 000 FCFA/mois | 50 max | Badge, mise en avant, stats |
| Certifié Entreprise | 5 000 FCFA/mois | 200 max | Badge ⭐, page entreprise, priorité |

### Processus de paiement Orange Money

```
Utilisateur clique "Activer Premium"
         ↓
Code USSD affiché : *144*10*65413799*2000#
         ↓
Bouton "Ouvrir le composeur" → téléphone s'ouvre
         ↓
Utilisateur effectue le paiement
         ↓
Prend une capture d'écran du reçu
         ↓
Upload de la capture dans l'app
         ↓
Envoi automatique WhatsApp à l'admin + sauvegarde en base
         ↓
Admin voit la demande dans son panneau
         ↓
Admin valide → abonnement activé 30 jours ✅
```

### Sécurité (Row Level Security Supabase)
- Chaque utilisateur ne voit que ses propres données sensibles
- Les annonces actives sont publiques (lecture)
- Seul le propriétaire peut modifier/supprimer ses annonces
- Les captures de paiement sont privées (bucket non-public)
- L'admin gère tout via l'interface Supabase ou l'app

---

## 🔧 Développement local

```bash
# Cloner et installer
git clone [votre-repo]
cd burkina-market
npm install

# Configurer les variables
cp .env.example .env
# Éditer .env avec vos vraies clés Supabase

# Lancer en développement
npm start
# → http://localhost:3000

# Build production
npm run build
```

---

## 📞 Support

Pour toute question ou personnalisation :
- WhatsApp Admin : +226 65 41 37 99
- Email : admin@burkinamarket.bf

---

*BurkinaMarket — Connecter les Burkinabè avec les opportunités* 🇧🇫
