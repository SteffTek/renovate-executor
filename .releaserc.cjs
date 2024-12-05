module.exports = {
    branches: [
        "main",
        {
            name: "develop",
            prerelease: true,
        },
    ],
    plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        ["@semantic-release/github"],
        [
            "@saithodev/semantic-release-backmerge",
            {
                backmergeBranches: [
                    {
                        from: "main",
                        to: "develop",
                    },
                ],
            },
        ],
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
