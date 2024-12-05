# Renovate Executor
Run an autoscaling renovate instance with webhook. Automatically schedules workload on docker or kubernetes environments.

This project was created due to the lack of a simple way to run a renovate instance with autoscaling capabilities. There is a paid option from Mend, the creators of renovate, but it is not open source and requires a subscription.

## Features
- Autoscaling renovate instance
- Webhook for triggering renovate runs
- Docker and Kubernetes support
- GitHub and GitLab support
- Internal Job Scheduler for running cron jobs
- Job Queues with filters
- Full renovate configuration support

# Configuration

## Main Configuration

The main configuration is done through environment variables. These are needed to run the renovate-executor.

```bash
RE_HANDLER=github                   # github or gitlab. Set the handler. This lets renovate-executor know which handler to use
RE_RUNTIME=docker                   # docker or kubernetes, default is docker. Runtime specifies where the workers will be scheduled
RE_WEBHOOK_PORT=4000                # Port for the webhook to listen on
RE_CRON_SCHEDULE="0 * * * *"        # Cron schedule for the autoscaling renovate instance
RE_BATCH_SIZE=10                    # Number of repositories to process in a single worker batch
RE_MAX_RETRIES=3                    # Maximum number of retries for fetching from the remote git server. If the limit is reached, the process will halt
RE_MAX_PARALLEL_CRON_JOBS=10        # Maximum number of parallel cron jobs to run scaled workers, default is 10
RE_MAX_PARALLEL_HOOK_JOBS=10        # Maximum number of parallel webhook jobs to run scaled workers, default is 10
RE_RENOVATE_IMAGE=renovate/renovate # Docker image for the renovate instance
RE_RENOVATE_ENV=./renovate.env.json # Renovate environment file. Contains all environment variables that will be passed to the renovate instance
```

## Specific Configuration

```bash
RE_REPOSITORIES=SteffTek/renovate-executor # Comma separated list of repositories to process. This acts as whitelist for the renovate instance. If empty, all found repositories will be processed
```

## Renovate Configuration

All renovate configuration options are supported. You can use the RE_RENOVATE_ENV variable to pass a JSON file with all the renovate environment variables. A minimal configuration for using GitHub as a repository source would look like this:

**Example `renovate.env.json`:**
```json
{
    "RENOVATE_TOKEN": "ghp_xxxx",
    "RENOVATE_CONFIG_FILE": "./renovate.config.json"
}
```

You can pass a renovate config file to the renovate instance. This file will be automatically mounted into the container.

**Example `renovate.config.json`:**
```json
{
    "binarySource": "install",
    "forkProcessing": "enabled",
    "onboarding": true,
    "semanticCommits": "enabled",
    "onboardingCommitMessage": "chore: add Renovate config",
    "onboardingConfig": {
        "$schema": "https://docs.renovatebot.com/renovate-schema.json",
        "extends": ["config:recommended"]
    },
    "autodiscover": false,
    "printConfig": true
}
```

## Docker Executor

Currently only the local docker socket is supported. This means that the docker executor will only work on the host machine.

## Kubernetes Executor
W.I.P.

## GitHub Configuration

The GitHub configuration requires a personal access token to be able to fetch repositories. All repositories the token can access will be processed by the renovate instance.

```bash
RE_HANDLER=github                       # Set the handler to github. Required for using GitHub as repository source
RE_GITHUB_API=https://api.github.com    # GitHub API URL, default is https://api.github.com
RE_GITHUB_TOKEN=ghp_xxxx                # GitHub personal access token. This is REQUIRED
RE_GITHUB_USER=SteffTek                 # Filter for repositories. Only repositories from this user will be processed. Not compatible with RE_GITHUB_ORGANIZATION
RE_GITHUB_ORGANIZATION=SteffTek         # Filter for repositories. Only repositories from this organization will be processed. Not compatible with RE_GITHUB_USER
```

## GitLab Configuration
W.I.P.