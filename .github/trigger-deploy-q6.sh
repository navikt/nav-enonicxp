version="$(git tag  | sed 's/.*\(v[0-9].[0-9].[0-9]\).*/\1/p' | sort -V | tail -1)-$(git rev-parse --short HEAD)-$(git rev-parse --abbrev-ref HEAD)"
git tag -a "${version}" -m "${version}"
git push && git push --tags
