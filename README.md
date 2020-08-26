# NAV.no - Enonic XP
NAVs content management system powered by Enonic XP, an open source project.

![Build to prod](https://github.com/navikt/nav-enonicxp/workflows/Build%20to%20prod/badge.svg)
![Deploy to prod](https://github.com/navikt/nav-enonicxp/workflows/Deploy%20to%20prod/badge.svg) <br>
![Build to Q1](https://github.com/navikt/nav-enonicxp/workflows/Build%20to%20Q1/badge.svg)
![Deploy to Q1](https://github.com/navikt/nav-enonicxp/workflows/Deploy%20to%20Q1/badge.svg) |
![Build to Q6](https://github.com/navikt/nav-enonicxp/workflows/Build%20to%20Q6/badge.svg)
![Deploy to Q6](https://github.com/navikt/nav-enonicxp/workflows/Deploy%20to%20Q6/badge.svg)

Deployed by [nav-enonicxp-actions-runner
](https://github.com/navikt/nav-enonicxp-actions-runner)

## How to get started
1. Install Enonic by following the guide at https://developer.enonic.com/start
2. Create a sandbox (preferably called **navno**)
```
enonic sandbox start
```
3. Launch admin console
```
open http://localhost:8080/admin
```
4. Download the NAV.no - XP Application
```
git clone https://github.com/navikt/nav-enonicxp.git
```
5. Copy **no.nav.navno.cfg.sample** to your sandbox
```
cp no.nav.navno.cfg.sample /YOUR_SANDBOX_PATH/home/config/no.nav.navno.cfg
```
6. Start dekoratøren med
```
docker login docker.pkg.github.com -u GITHUB_USERNAME -p GITHUB_PERSONAL_ACCESS_TOKEN
docker-compose up -d
```

## Development

```
enonic project deploy
```

## Deploy

- **Q6:** Run **trigger-deploy-q6.sh** located in the .github folder <br>
`.github/trigger-deploy-q6.sh`
- **Q1:** Merge to develop
- **P:**  Make a PR between master and develop __*__ and create a release at <br />
https://github.com/navikt/nav-enonicxp/releases <br />
**Obs:** Release must be formatted as **vX.X.X** (e.g v1.2.1)

 __*__ PR between master and develop
1. Make a pull request between master and develop
2. Name it "Release: < iso-date of the release> "
3. Write release notes in the comment. Remember to get links to the jira tasks.
  Optimally we get the whole text from Jira when doing the release there. For
  now just check how a previous release pull request looks. Bullet list with
  link to issue and short description.
4. Set the label **Release** on the pull request.
5. After code review merge the pull request to master
6. Deploy the code to production

## Environment

#### Getting access to the site from root url

To be able to navigate the site as in production ie. http://localhost:8080/sok, we need to configure this in the file ${XP_HOME}/config/com.enonic.xp.web.vhost.cfg add this properties.

    enabled = true
    mapping.public.host = localhost
    mapping.public.source = /
    mapping.public.target = /site/default/master/www.nav.no/
    mapping.public.idProvider.system = default
    mapping.admin.host = localhost
    mapping.admin.source = /admin
    mapping.admin.target = /admin
    mapping.admin.idProvider.system = default
    mapping.webapp.host = localhost
    mapping.webapp.source = /webapp
    mapping.webapp.target = /webapp
    mapping.admin2.idProvider.system = default
