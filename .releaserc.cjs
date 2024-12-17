module.exports = {
    branches: [
        "develop",
    ],
    plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        ["@semantic-release/github"],
        [
            "@codedependant/semantic-release-docker",
            {
                dockerTags: [
                    "{{#if prerelease.[0]}}{{prerelease.[0]}}{{else}}latest{{/if}}",
                    "{{major}}-{{#if prerelease.[0]}}{{prerelease.[0]}}{{else}}latest{{/if}}",
                    "{{major}}.{{minor}}-{{#if prerelease.[0]}}{{prerelease.[0]}}{{else}}latest{{/if}}",
                    "{{version}}",
                ],
                dockerImage: "renovate-executor",
                dockerFile: "Dockerfile",
                dockerRegistry: "ghcr.io",
                dockerProject: "stefftek",
            },
        ],
    ],
};
