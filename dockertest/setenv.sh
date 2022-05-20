#!/bin/sh

# Exit on failure
set -e

echo "Install bootstrap apps"
# Install snapshotter to create index snapshots
app.sh add https://repo.enonic.com/public/com/enonic/app/snapshotter/3.0.2/snapshotter-3.0.2.jar