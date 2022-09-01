#!/bin/sh

kubectl create configmap -n personbruker xp-config --from-file=config --dry-run="client" -o yaml > configmap.yaml