## Calendar API (NestJS)
Une API simple pour gérer utilisateurs, projets, affectations et événements (télétravail / congés). C’est fait avec NestJS, et toute la doc est dispo via Swagger sur `/api`.

### À quoi ça sert ?
- Créer un compte, se connecter et voir/mettre à jour son profil.
- Gérer les rôles (`Employee`, `ProjectManager`, `Admin`) pour sécuriser qui fait quoi.
- Lister et créer/modifier des projets, et affecter des personnes dessus avec des périodes.
- Poser des jours de télétravail ou des congés payés, avec validation côté admin/PM.
- Calculer les tickets resto du mois (8€ par jour ouvré éligible).

### Prérequis
- Node.js 18+ et npm
- Docker & Docker Compose (pour la base) ou un PostgreSQL dispo

### Configuration rapide
Crée un fichier `.env` à la racine :
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=devapi
DB_PASSWORD=workdb123
DB_NAME=devapi
JWT_SECRET=change-me
JWT_EXPIRATION=1d #optionnal
```
Les valeurs DB collent au `docker-compose.yml` fourni.

### Installation & démarrage
```bash
npm install
docker-compose up -d  
npm run start        
```
Swagger : `http://localhost:3000/api`

### Tests unitaires
```bash
npm run test
```

### Structure rapide
- `src/users` : utilisateurs, auth, tickets resto
- `src/projects` : projets et accès
- `src/project-users` : affectations projet/utilisateur
- `src/events` : télétravail & congés
- `src/common` : enums, guards, décorateurs, interceptor
- `src/auth` : gestion d'authentification

## Auteurs
- Kevin CANO
- Aymeric MAREC
- Diane SAUTEREAU DU PART

