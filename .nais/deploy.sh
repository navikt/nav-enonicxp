#!/bin/bash

if [[ -z $XP_USER ]]
then
  echo "XP_USER must be specified"
  exit
fi

echo $XP_USER