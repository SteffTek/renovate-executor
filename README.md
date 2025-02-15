[![Create Release](https://github.com/SteffTek/renovate-executor/actions/workflows/release.yaml/badge.svg)](https://github.com/SteffTek/renovate-executor/actions/workflows/release.yaml)

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
- Auto-Merge support with automatic approvals
- Rate limiting for API requests

# Configuration

## Main Configuration

The main configuration is done through environment variables. These are needed to run the renovate-executor.

```bash
RE_HANDLER=github                   # github or gitlab. Set the handler. This lets renovate-executor know which handler to use
RE_RUNTIME=docker                   # docker or kubernetes, default is docker. Runtime specifies where the workers will be scheduled
RE_API_PORT=4000                    # Port for the webhook to listen on
RE_CRON_SCHEDULE="0 * * * *"        # Cron schedule for the autoscaling renovate instance
RE_BATCH_SIZE=10                    # Number of repositories to process in a single worker batch
RE_MAX_RETRIES=3                    # Maximum number of retries for fetching from the remote git server. If the limit is reached, the process will halt
RE_MAX_PARALLEL_CRON_JOBS=10        # Maximum number of parallel cron jobs to run scaled workers, default is 10
RE_MAX_PARALLEL_HOOK_JOBS=10        # Maximum number of parallel webhook jobs to run scaled workers, default is 10
RE_RENOVATE_IMAGE=renovate/renovate # Docker image for the renovate instance
RE_RENOVATE_ENV=./renovate.env.json # Renovate environment file. Contains all environment variables that will be passed to the renovate instance
RE_JOB_RATE_LIMIT=300               # Rate limit for the internal job scheduler in seconds. Default is 300 seconds. It's recommended that this value should be higher than the median execution time of a single webhook job to avoid spamming the renovate instance
```

## Specific Configuration

```bash
RE_REPOSITORIES=SteffTek/renovate-executor # Comma separated list of repositories to process. This acts as whitelist for the renovate instance. If empty, all found repositories will be processed
RE_TOPICS=renovate,github                  # Comma separated list of topics to filter repositories. Only repositories with these topics will be processed. This is an AND filter, so all topics must be present
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

The Kubernetes executor requires a KubeConfig file to be mounted into the container. This file is used to authenticate with the Kubernetes cluster. Alternatively, it uses the default service account for the namespace the pod is running in.

```bash
RE_RUNTIME=kubernetes                   # Set the runtime to kubernetes
KUBERNETES_NAMESPACE=renovate-executor  # Namespace for the scheduled worker pods, default is renovate-executor
KUBERNETES_CPU_LIMIT=2000m              # CPU limit for the worker pods, default is 2000m
KUBERNETES_MEMORY_LIMIT=2048Mi          # Memory limit for the worker pods, default is 2048Mi
KUBERNETES_CPU_REQUEST=1000m            # CPU request for the worker pods, default is 1000m
KUBERNETES_MEMORY_REQUEST=1024Mi        # Memory request for the worker pods, default is 1024Mi
KUBERNETES_IMAGE_PULL_SECRET=regcred    # Image pull secret for the worker pods, default is an empty string
```

The `renovate.env.json` file in not supported for the Kubernetes executor. You have to pass all environment variables through a secret named `renovate-secret`. The secret must be created in the same namespace as the executor.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: renovate-secret
  namespace: renovate-executor
type: Opaque
stringData:
  RENOVATE_CONFIG_FILE: /tmp/config/renovate.config.json    # This is the path inside the container. A ConfigMap is used to mount the file. /tmp/config is a fixed path. Name the file as you like
  RENOVATE_TOKEN: ghp_xxxx                                  # GitHub personal access token
```

The ConfigMap for the `renovate.config.json` file must be created in the same namespace as the executor. Same as for the docker executor, you don't need this file to run renovate. Only if you specify the config file in the secret.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: renovate-config
  namespace: renovate-executor
data:
  renovate.config.json: | # This must be the same name as the filename in the secret
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

## API Configuration

The API configuration is used to configure the internal API server. This server is used to trigger the renovate instance to run a job.

```bash
RE_API_PORT=4000                # Port for the API server to listen on
RE_WEBHOOK_ENABLED=true         # Enable or disable the webhook. Default is disabled
RE_API_ENABLED=true             # Enable or disable the API server. Default is disabled
RE_WEBHOOK_SECRET=renovate      # Secret for the webhook. If set, the webhook will only accept requests with this secret
RE_API_SECRET=renovate          # Secret for the other API endpoints. If set, the API will only accept requests with this secret
```

### Webhook

The webhook is used to trigger the renovate instance to run a job. The webhook is disabled by default. You can enable it by setting the `RE_WEBHOOK_ENABLED` environment variable to `true`.
To trigger a job, create a new Webhook in GitHub or GitLab and point it to the API server. The URL should look like this: `http://localhost:4000/hook`.

### Header Validation

The API automatically validates the headers of incoming requests.

- For the webhook, the `X-Hub-Signature` header is validated for GitHub. For GitLab, the `X-Gitlab-Token` header is validated.
- For all other requests coming to the regular API, the `X-API-Secret` header is needed to validate the request.

### Swagger UI

The API server has a built-in Swagger UI. You can access it by navigating to `http://localhost:4000/docs` in your browser.

## GitHub Configuration

The GitHub configuration requires a personal access token to be able to fetch repositories. All repositories the token can access will be processed by the renovate instance.

```bash
RE_HANDLER=github                       # Set the handler to github. Required for using GitHub as repository source
RE_GITHUB_API=https://api.github.com    # GitHub API URL, default is https://api.github.com
RE_GITHUB_TOKEN=ghp_xxxx                # GitHub personal access token. This is REQUIRED
RE_GITHUB_USERS=SteffTek                # Filter for repositories. Only repositories from this user will be processed. This is a comma separated list
RE_GITHUB_ORGS=SteffTek                 # Filter for repositories. Only repositories from this organization will be processed. This is a comma separated list
RE_GITHUB_APPROVE_TOKEN=ghp_xxxx        # GitHub personal access token for approving pull requests. This should be a separate user with the necessary permissions
```

**Note:** The `RE_GITHUB_USERS` and `RE_GITHUB_ORGS` are synonymous. Both look at the first part of the repository URL. These are only two distinct options for organizing purposes.

## GitLab Configuration

As with GitHub, the GitLab configuration requires a personal access token to be able to fetch repositories. All repositories the token can access will be processed by the renovate instance. You can filter repositories similar to GitHub.

```bash
RE_HANDLER=gitlab                       # Set the handler to gitlab. Required for using GitLab as repository source
RE_GITLAB_API=https://gitlab.com/       # GitLab URL, default is https://gitlab.com/
RE_GITLAB_TOKEN=xxxx                    # GitLab personal access token. This is REQUIRED
RE_GITLAB_USERS=SteffTek                # Filter for repositories. Only repositories from this user will be processed. This is a comma separated list
RE_GITLAB_GROUPS=SteffTek               # Filter for repositories. Only repositories from this group will be processed. This is a comma separated list
RE_GITLAB_APPROVE_TOKEN=xxxx            # GitLab personal access token for approving merge requests. This should be a separate user with the necessary permissions
```

**Note:** The `RE_GITLAB_USERS` and `RE_GITLAB_GROUPS` are synonymous. Both look at the first part of the repository URL. These are only two distinct options for organizing purposes.

## Helm Chart
W.I.P.
