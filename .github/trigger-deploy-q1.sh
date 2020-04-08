version="$(git tag --sort=committerdate | grep -E '^v[0-9]' | tail -1)-$(git rev-parse --short HEAD)-$(git rev-parse --abbrev-ref HEAD)"
git tag -a "${version}" -m "${version}"
git push && git push --tags
