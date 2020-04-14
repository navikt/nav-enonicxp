version="$(git tag | grep -E '^v[0-9]' | grep -v '-' | sort -V | tail -1)-$(git rev-parse --short HEAD)-$(git rev-parse --abbrev-ref HEAD)"
git tag -a "${version}" -m "${version}"
git push && git push --tags
