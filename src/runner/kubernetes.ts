/**
 * Imports
 */
import { Runner } from "../types/runner.js";
import { Batch } from "../types/batch.js";
import { CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import { config as loadEnv } from "dotenv";

/**
 * Load Environment Variables
 */
loadEnv();

/**
 * @class Kubernetes Runner
 * @description Kubernetes Runner for Renovate Executor. Schedules and runs k8s jobs.
 */
export class KubernetesRunner extends Runner {
    /**
     * kubeconfig
     * @type {KubeConfig}
     * @description Kubernetes configuration
     */
    private kubeconfig: KubeConfig;
    /**
     * kube api client
     * @type {CoreV1Api}
     * @description Kubernetes API client
     */
    private kubeApi: CoreV1Api;

    /**
     * Constructor
     */
    constructor(renovateImage: string, renovateEnvironment: string) {
        super(renovateImage, renovateEnvironment);
        // Create KubeConfig
        this.kubeconfig = new KubeConfig();
        this.kubeconfig.loadFromDefault();
        // Connect to Kubernetes API
        this.kubeApi = this.kubeconfig.makeApiClient(CoreV1Api);
    }

    public async checkJob(batch: Batch): Promise<boolean> {
        // Check if the job is running
        const res = await this.kubeApi
            .listNamespacedPod({
                namespace: process.env.KUBERNETES_NAMESPACE ?? "renovate-executor",
                labelSelector: `batchId=${batch.id}`,
            })
            .catch((err) => {
                console.error(err);
                return { items: [] };
            });
        if (res.items.length === 0) {
            console.log("Job not found");
            return false;
        }
        // Check if the pod is still running
        // => if not delete the pod
        const pod = res.items[0];
        if (pod.status?.phase !== "Running" && pod.status?.phase !== "Pending") {
            await this.deletePod(pod.metadata?.name ?? "");
            return false;
        }
        return true;
    }

    public async runJob(batch: Batch): Promise<void> {
        await this.kubeApi.createNamespacedPod({
            namespace: process.env.KUBERNETES_NAMESPACE ?? "renovate-executor",
            body: {
                apiVersion: "v1",
                kind: "Pod",
                metadata: {
                    name: `renovate-${batch.id}-${batch.type}`,
                    labels: {
                        batchId: batch.id,
                    },
                    annotations: {
                        batchType: batch.type,
                        repositories: JSON.stringify(batch.repositories.map((repo) => repo.path)),
                    },
                },
                spec: {
                    imagePullSecrets: [
                        {
                            name: process.env.KUBERNETES_IMAGE_PULL_SECRET ?? "",
                        },
                    ],
                    containers: [
                        {
                            name: "renovate",
                            image: this.getRenovateImage(),
                            restartPolicy: "Never",
                            resources: {
                                requests: {
                                    cpu: process.env.KUBERNETES_CPU_REQUEST ?? "1000m",
                                    memory: process.env.KUBERNETES_MEMORY_REQUEST ?? "1024Mi",
                                },
                                limits: {
                                    cpu: process.env.KUBERNETES_CPU_LIMIT ?? "2000m",
                                    memory: process.env.KUBERNETES_MEMORY_LIMIT ?? "2048Mi",
                                },
                            },
                            envFrom: [
                                // Secret Env
                                {
                                    secretRef: {
                                        name: "renovate-secret",
                                    },
                                },
                            ],
                            env: [
                                {
                                    name: "RENOVATE_REPOSITORIES",
                                    value: JSON.stringify(batch.repositories.map((repo) => repo.path)),
                                },
                            ],
                            volumeMounts: [
                                // Config Map at /tmp/config/${renovate.config.file.name}
                                {
                                    name: "renovate-config",
                                    mountPath: "/tmp/config/",
                                },
                            ],
                        },
                    ],
                    volumes: [
                        {
                            name: "renovate-config",
                            configMap: {
                                defaultMode: 420,
                                name: "renovate-config",
                            },
                        },
                    ],
                    restartPolicy: "Never",
                },
            },
        });
    }

    public async cleanUp(): Promise<void> {
        // Get All Pods in the Namespace
        const res = await this.kubeApi.listNamespacedPod({
            namespace: process.env.KUBERNETES_NAMESPACE ?? "renovate-executor",
            limit: 100,
        });
        // Delete all pods that are not running or pending
        for (const pod of res.items) {
            if (pod.status?.phase !== "Running" && pod.status?.phase !== "Pending") {
                await this.deletePod(pod.metadata?.name ?? "");
            }
        }
    }

    private async deletePod(name: string): Promise<void> {
        console.log(`Deleting pod ${name}`);
        await this.kubeApi.deleteNamespacedPod({
            name: name,
            namespace: process.env.KUBERNETES_NAMESPACE ?? "renovate-executor",
        });
    }
}
