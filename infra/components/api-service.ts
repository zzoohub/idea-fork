import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as dockerBuild from "@pulumi/docker-build";

export interface ApiServiceArgs {
  gcpProject: pulumi.Input<string>;
  region: pulumi.Input<string>;
  cpu: pulumi.Input<string>;
  memory: pulumi.Input<string>;
  minInstances: pulumi.Input<number>;
  maxInstances: pulumi.Input<number>;
  databaseUrl: pulumi.Input<string>;
  googleApiKey: pulumi.Input<string>;
  internalSecret: pulumi.Input<string>;
  sentryDsn: pulumi.Input<string>;
  corsAllowedOrigins: pulumi.Input<string>;
  producthuntApiToken: pulumi.Input<string>;
  appstoreKeywords: pulumi.Input<string>;
  pipelineSubreddits: pulumi.Input<string>;
  pipelineRssFeeds: pulumi.Input<string>;
}

export class ApiService extends pulumi.ComponentResource {
  public readonly url: pulumi.Output<string>;
  public readonly imageRef: pulumi.Output<string>;

  constructor(
    name: string,
    args: ApiServiceArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("idea-fork:index:ApiService", name, {}, opts);

    // ── Enable required APIs ──────────────────────────────────────────────
    const runApi = new gcp.projects.Service(
      `${name}-run-api`,
      {
        service: "run.googleapis.com",
        disableOnDestroy: false,
      },
      { parent: this },
    );

    const artifactRegistryApi = new gcp.projects.Service(
      `${name}-ar-api`,
      {
        service: "artifactregistry.googleapis.com",
        disableOnDestroy: false,
      },
      { parent: this },
    );

    // ── Artifact Registry ─────────────────────────────────────────────────
    const repo = new gcp.artifactregistry.Repository(
      `${name}-repo`,
      {
        repositoryId: "idea-fork",
        location: args.region,
        format: "DOCKER",
        cleanupPolicies: [
          {
            id: "keep-recent",
            action: "KEEP",
            mostRecentVersions: { keepCount: 10 },
          },
        ],
      },
      { parent: this, dependsOn: [artifactRegistryApi] },
    );

    const imageTag = pulumi.interpolate`${args.region}-docker.pkg.dev/${args.gcpProject}/${repo.repositoryId}/api`;

    // ── Docker image ──────────────────────────────────────────────────────
    const image = new dockerBuild.Image(
      `${name}-image`,
      {
        tags: [pulumi.interpolate`${imageTag}:latest`],
        context: { location: ".." },
        dockerfile: { location: "../services/api/Dockerfile" },
        platforms: [dockerBuild.Platform.Linux_amd64],
        push: true,
      },
      { parent: this, dependsOn: [repo] },
    );

    // ── Service account ───────────────────────────────────────────────────
    const sa = new gcp.serviceaccount.Account(
      `${name}-sa`,
      {
        accountId: "idea-fork-api",
        displayName: "idea-fork API Cloud Run SA",
      },
      { parent: this },
    );

    // ── Cloud Run v2 service ──────────────────────────────────────────────
    const service = new gcp.cloudrunv2.Service(
      `${name}-service`,
      {
        name: "idea-fork-api",
        location: args.region,
        ingress: "INGRESS_TRAFFIC_ALL",
        template: {
          serviceAccount: sa.email,
          scaling: {
            minInstanceCount: args.minInstances,
            maxInstanceCount: args.maxInstances,
          },
          containers: [
            {
              image: image.ref,
              resources: {
                limits: {
                  cpu: args.cpu,
                  memory: args.memory,
                },
              },
              ports: { containerPort: 8080 },
              envs: [
                { name: "API_DATABASE_URL", value: args.databaseUrl },
                { name: "GOOGLE_API_KEY", value: args.googleApiKey },
                { name: "API_INTERNAL_SECRET", value: args.internalSecret },
                { name: "SENTRY_DSN", value: args.sentryDsn },
                { name: "SENTRY_ENVIRONMENT", value: "production" },
                {
                  name: "API_CORS_ALLOWED_ORIGINS",
                  value: args.corsAllowedOrigins,
                },
                { name: "API_DEBUG", value: "false" },
                {
                  name: "PRODUCTHUNT_API_TOKEN",
                  value: args.producthuntApiToken,
                },
                {
                  name: "PIPELINE_APPSTORE_KEYWORDS",
                  value: args.appstoreKeywords,
                },
                {
                  name: "PIPELINE_SUBREDDITS",
                  value: args.pipelineSubreddits,
                },
                {
                  name: "PIPELINE_RSS_FEEDS",
                  value: args.pipelineRssFeeds,
                },
              ],
              startupProbe: {
                httpGet: { path: "/health", port: 8080 },
                initialDelaySeconds: 5,
                periodSeconds: 5,
                failureThreshold: 6,
              },
              livenessProbe: {
                httpGet: { path: "/health", port: 8080 },
                periodSeconds: 30,
              },
            },
          ],
        },
      },
      { parent: this, dependsOn: [runApi] },
    );

    // ── Public access (allUsers invoker) ──────────────────────────────────
    new gcp.cloudrunv2.ServiceIamMember(
      `${name}-public`,
      {
        name: service.name,
        location: args.region,
        role: "roles/run.invoker",
        member: "allUsers",
      },
      { parent: this },
    );

    this.url = service.uri;
    this.imageRef = image.ref;

    this.registerOutputs({
      url: this.url,
      imageRef: this.imageRef,
    });
  }
}
