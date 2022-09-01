#!/bin/sh

# Exit on failure
set -e

echo "Install bootstrap apps"
app.sh add https://repo.enonic.com/public/com/enonic/app/adfsidprovider/2.1.1/adfsidprovider-2.1.1.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/audit-log/1.2.1/audit-log-1.2.1.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/contentstudio/4.0.4/contentstudio-4.0.4.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/contentstudio.plus/1.3.0/contentstudio.plus-1.3.0.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/contentviewer/1.6.0/contentviewer-1.6.0.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/livetrace/2.1.1/livetrace-2.1.1.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/siteimprove/1.7.0/siteimprove-1.7.0.jar
app.sh add https://repo.enonic.com/public/com/enonic/app/xpdoctor/2.0.0/xpdoctor-2.0.0.jar
app.sh add https://rcdsystems.jfrog.io/artifactory/maven-public/systems/rcd/enonic/datatoolbox/5.0.24/datatoolbox-5.0.24.jar
app.sh add file:///enonic-xp/home/navno.jar --force
