#!/bin/sh

kubectl create configmap -n xp xp-config --from-file=config --dry-run="client" -o yaml > configmap.yaml