#!/bin/sh

echo "Running deploy script!"

if [[ -z $XP_USER ]]
then
  echo "XP_USER must be specified"
  exit
fi

echo "XP user: $XP_USER"

if [[ -z $XP_PASSWORD ]]
then
  echo "XP_PASSWORD must be specified"
  exit
fi

if [[ -z $XP_INSTALL_API ]]
then
  echo "XP_INSTALL_API must be specified"
  exit
fi

echo "XP api: $XP_INSTALL_API"

if [[ -z $APP_FILE_NAME ]]
then
  echo "APP_FILE_NAME must be specified"
  exit
fi

echo "APP_FILE_NAME: $APP_FILE_NAME"

curl \
  --cacert /etc/pki/tls/cacert.pem \
  -k "$XP_INSTALL_API" \
  --user "$XP_USER:$XP_PASSWORD" \
  -F file=@$APP_FILE_NAME
