# Roadmap de déploiement

Cette application est prévue pour être déployée avec :

- **Frontend** : Cloudflare Pages
- **API** : Cloudflare Workers
- **Base de données** : Cloudflare D1
- **Fichiers privés** : Cloudflare R2

Utiliser idéalement deux sous-domaines du même domaine :

```text
https://app.votredomaine.com
https://api.votredomaine.com
```

Cela permet de conserver le fonctionnement des cookies de session (`SameSite=Strict`).

## 1. Préparer Cloudflare

```bash
npm ci
npx wrangler login
```

Créer la base D1 et les buckets R2 :

```bash
npx wrangler d1 create telc-prep
npx wrangler r2 bucket create telc-payment-proofs
npx wrangler r2 bucket create telc-speaking-recordings
```

Dans `backend/wrangler.toml`, remplacer les valeurs de développement :

```toml
APP_URL = "https://app.votredomaine.com"
database_id = "ID_D1_RETOURNE_PAR_WRANGLER"
```

Configurer aussi `ADMIN_EMAIL`, `WHATSAPP_NUMBER` et `CIH_ACCOUNT_NUMBER`.

## 2. Configurer les secrets

Les secrets ne doivent pas être placés dans le frontend ni commités dans Git :

```bash
npx wrangler secret put SESSION_SECRET --config backend/wrangler.toml
npx wrangler secret put OPENROUTER_API_KEY --config backend/wrangler.toml
npx wrangler secret put GEMINI_API_KEY --config backend/wrangler.toml
npx wrangler secret put RESEND_API_KEY --config backend/wrangler.toml
```

Configurer au minimum un fournisseur IA : OpenRouter ou Gemini. Les secrets facultatifs peuvent être ignorés si la fonctionnalité correspondante n'est pas utilisée.

## 3. Appliquer les migrations D1

Avant une première mise en production, vérifier la base et son historique de récupération :

```bash
npx wrangler d1 info telc-prep --config backend/wrangler.toml
npx wrangler d1 time-travel info telc-prep --config backend/wrangler.toml
```

Sur une base de production neuve, appliquer les migrations dans l'ordre :

```bash
for file in backend/src/db/migrations/*.sql; do
  npx wrangler d1 execute telc-prep \
    --remote \
    --config backend/wrangler.toml \
    --file "$file"
done
```

Lors des déploiements suivants, n'appliquer que les nouvelles migrations. Ne pas réexécuter les anciennes migrations sur une base déjà initialisée.

## 4. Insérer les plans et créer l'administrateur

Générer le SQL des plans :

```bash
npm run db:seed -w backend
```

Copier le SQL affiché puis l'exécuter sur la base distante avec `wrangler d1 execute --remote`.

Créer éventuellement un administrateur :

```bash
npx tsx backend/src/scripts/create-admin.ts \
  admin@votredomaine.com \
  'MOT_DE_PASSE_FORT' \
  'Administrateur'
```

Copier l'instruction SQL générée et l'exécuter sur D1 en mode `--remote`.

> Ne jamais exécuter `npm run db:demo` en production.

## 5. Déployer l'API Worker

```bash
npx wrangler deploy --config backend/wrangler.toml
```

Associer ensuite le Worker au domaine :

```text
api.votredomaine.com
```

Tester l'API :

```bash
curl https://api.votredomaine.com/api/health/live
curl https://api.votredomaine.com/api/health
```

## 6. Déployer le frontend

L'URL de l'API est intégrée au build Vite :

```bash
VITE_API_URL=https://api.votredomaine.com npm run build -w frontend
```

Créer puis publier le projet Cloudflare Pages :

```bash
npx wrangler pages project create telc-prep-web
npx wrangler pages deploy frontend/dist --project-name=telc-prep-web
```

Associer Pages au domaine :

```text
app.votredomaine.com
```

Pour un déploiement automatique depuis GitHub, utiliser :

- commande de build : `npm run build -w frontend`
- répertoire de sortie : `frontend/dist`
- variable publique : `VITE_API_URL=https://api.votredomaine.com`

## 7. Sécurité et configuration finale

- Remplacer toutes les valeurs `localhost` dans la configuration de production.
- Utiliser un `SESSION_SECRET` aléatoire et suffisamment long.
- Garder les buckets R2 privés.
- Ne jamais publier `.env.local` ou `backend/.dev.vars`.
- Restreindre CORS à `https://app.votredomaine.com` avant la mise en production.
- Configurer `APP_URL` avec l'URL exacte du frontend.
- Vérifier que les changements non commités, notamment les migrations, sont bien commités avant un déploiement Git.

## 8. Checklist après déploiement

- [ ] `/api/health/live` répond correctement.
- [ ] `/api/health` indique que D1 est disponible.
- [ ] Inscription et connexion fonctionnent.
- [ ] Déconnexion et cookies de session fonctionnent.
- [ ] Un exercice gratuit est accessible.
- [ ] La restriction premium fonctionne.
- [ ] Un paiement manuel peut être créé.
- [ ] Une preuve de paiement est stockée dans R2.
- [ ] L'accès administrateur fonctionne.
- [ ] Les logs Workers et les alertes sont configurés.
