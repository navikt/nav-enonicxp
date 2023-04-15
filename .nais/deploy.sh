#!/bin/sh

echo "Running deploy script!"

if [[ -z $XP_USER ]]
then
  echo "XP_USER must be specified"
  exit
fi

echo "XP user: $XP_USER"
