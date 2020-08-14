Github Addon
========================
Provides modular inputs & framework to ingest JSON data from Github APIs.

APIs supported:
- Repository Stats (https://developer.github.com/v3/repos/statistics/#get-contributors-list-with-additions-deletions-and-commit-counts)
- Repository Commits (https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository)
- Repository Issues (https://developer.github.com/v3/issues/#list-issues-for-a-repository)

## Release Notes:

###v1.0.1
Maintenance & Updates for Github.com API
- Adds input parameter and logic to handle differences beteween Github's public and enterprise API paths.
- Additional logic for API "still processing" (202 response) for stats API
- Improved logging and error handling.

###v1.0.0
Initial release. Documentation will be included in future releases.

## Submit issues or requests via Github:
TA-Github: https://github.com/pentestfail/TA-Github