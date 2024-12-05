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
                dockerTags: ["latest", "{{version}}", "{{major}}-latest", "{{major}}.{{minor}}"],
                dockerImage: "renovate-executor",
                dockerFile: "Dockerfile",
                dockerRegistry: "ghcr.io",
                dockerProject: "stefftek",
                dockerPlatform: ["linux/amd64", "linux/arm64"],
            },
        ],
    ],
};
