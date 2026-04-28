# DBR CHARITÉ v6.0

Application web interactive pour la méthode CHARITÉ.

## 🎯 Qu'est-ce que DBR CHARITÉ?

DBR - Dream Becomes Reality

DBR accompagne entrepreneurs, cadres et jeunes talents a transformer ce qu'ils portent en silence en une realite qu'ils embrassent.

Son compagnon de parcours s'appelle Reel.

La methode CHARITE en 8 etapes : Clarifier, Honorer, Aligner, Renoncer, Installer, Tenir, Eprouver.

Deux parcours disponibles selon le profil du participant.
Parcours complet pour celui qui cherche encore sa direction.
Parcours accelere pour celui qui a deja une idee et veut un plan d'action.

DBR existe pour une seule raison : que ni le reve ni les moments qui comptent ne restent prisonniers de toi.

## 🚀 Fonctionnalités

✅ Authentification sécurisée (email + mot de passe)
✅ Gestion des sessions multi-utilisateurs
✅ Rôles et permissions (Admin/Participant)
✅ Invitations par email
✅ Synthèses automatiques
✅ Exportation de rapports
✅ Logs d'audit complets

## 📋 Prérequis

- Node.js 18+ ([Télécharger](https://nodejs.org))
- Un compte Supabase gratuit ([Créer](https://supabase.com))
- Git ([Télécharger](https://git-scm.com))

## 🔧 Installation (5 étapes)

### Étape 1 : Cloner le projet
```bash
git clone https://github.com/dibyrichmond/dbr-charite.git
cd dbr-charite
```

### Étape 2 : Installer les dépendances
```bash
npm install
```

### Étape 3 : Configurer Supabase

1. Créez un compte gratuit sur [Supabase](https://supabase.com)
2. Créez un nouveau projet
3. Allez dans **SQL Editor**
4. Copiez-collez tout le contenu de `SUPABASE_SCHEMA_V8.sql`
5. Cliquez sur **Run**

### Étape 4 : Variables d'environnement

1. Créez un fichier `.env.local` à la racine
2. Remplissez-le avec vos clés Supabase :

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

(Trouvez ces clés dans Supabase > Settings > API)

### Étape 5 : Lancer l'app

```bash
npm run dev
```

Allez sur `http://localhost:5173` 🎉

## 🏗️ Structure du projet

```
dbr-charite/
├── src/                 # Code source
│   ├── components/      # Composants React
│   ├── hooks/           # Hooks personnalisés
│   ├── supabase.js      # Configuration Supabase
│   ├── App.jsx         # Composant principal
│   ├── main.jsx        # Point d'entrée
│   └── index.css       # Styles globaux
├── public/              # Fichiers statiques
├── package.json         # Dépendances
├── vite.config.js       # Configuration Vite
└── vercel.json         # Configuration Vercel
```

## 🚀 Déployer sur Vercel

1. Connectez votre repo GitHub à [Vercel](https://vercel.com)
2. Vercel détectera automatiquement le projet
3. Ajoutez les variables d'environnement:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Cliquez sur **Deploy**

## 🔐 Sécurité

✅ RLS (Row Level Security) activé sur Supabase
✅ Variables d'environnement protégées
✅ Sessions JWT
✅ Validation des données

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)

## ❓ Questions ou problèmes?

📧 Contactez: dibyrichmond@gmail.com

---

**Version:** 6.0.0 | **Dernière mise à jour:** Mars 2026
