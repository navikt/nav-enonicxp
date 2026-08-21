# Environment config

Changes to config files must be copied to `$xp_home/config/` on vm-servers / local sandbox. These are not deployed automatically!

## Secrets

Secret values (e.g. `serviceSecret`, `searchApiKey`, `clientId`, `clientSecret`) must be set per environment in the corresponding `config/<env>/no.nav.navno.cfg` on the server and must **not** be committed to git. Only dummy placeholders belong in `config/localhost/`.

### EntraID (Azure AD) client-credentials

Calls to Nav APIs (norg2) go through `org-ekstern-proxy` and require an OAuth2 Bearer token obtained via the client-credentials flow against Nav's tenant. The following keys must be provided:

- `clientId` – client id of the Enonic XP app registration in Nav's tenant.
- `clientSecret` – the corresponding client secret (rotate as required).

The tenant id, token endpoint, token scope and proxy routing headers (`target-client-id`, `target-app`) are non-secret and live in `lib/constants.ts`. The token scope (`norgProxyTokenScope`) must still be filled in with the value provided by the `org-ekstern-proxy` team.
