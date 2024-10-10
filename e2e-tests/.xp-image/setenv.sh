#!/bin/sh

# Exit on failure
set -e

echo "Install bootstrap apps"
app.sh add https://repo.enonic.com/public/com/enonic/app/contentstudio/5.2.2/contentstudio-5.2.2.jar
app.sh add file:///enonic-xp/home/navno.jar --force
