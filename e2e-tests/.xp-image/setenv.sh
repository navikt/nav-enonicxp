#!/bin/sh

# Exit on failure
set -e

echo "Install bootstrap apps"
app.sh add https://repo.enonic.com/public/com/enonic/app/contentstudio/5.2.1/contentstudio-5.2.1.jar
app.sh add https://github.com/GlennRicaud/maven/raw/main/systems/rcd/enonic/datatoolbox/5.1.4/datatoolbox-5.1.4.jar
app.sh add file:///enonic-xp/home/navno.jar --force
