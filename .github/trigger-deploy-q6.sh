version="$(git describe --tags `git rev-list --tags --max-count=1`)-$(git rev-parse --short HEAD)-$(git rev-parse --abbrev-ref HEAD)"
git tag -a "${version}" -m "${version}"
git push && git push --tags
