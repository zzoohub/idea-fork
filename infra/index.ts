import * as config from "./config";
import { NeonDatabase } from "./components/neon-database";
import { ApiService } from "./components/api-service";
import { PipelineCron } from "./components/pipeline-cron";

const db = new NeonDatabase("db", {
  projectName: "idea-fork",
  orgId: config.neonOrgId,
  regionId: config.neonRegion,
});

const api = new ApiService("api", {
  gcpProject: config.gcpProject,
  region: config.gcpRegion,
  cpu: config.cloudRunCpu,
  memory: config.cloudRunMemory,
  minInstances: config.cloudRunMinInstances,
  maxInstances: config.cloudRunMaxInstances,
  databaseUrl: db.asyncpgUri,
  googleApiKey: config.googleApiKey,
  internalSecret: config.internalSecret,
  sentryDsn: config.sentryDsn,
  corsAllowedOrigins: config.corsAllowedOrigins,
  producthuntApiToken: config.producthuntApiToken,
  appstoreKeywords: config.appstoreKeywords,
  pipelineSubreddits: config.pipelineSubreddits,
  pipelineRssFeeds: config.pipelineRssFeeds,
});

const cron = new PipelineCron("pipeline", {
  apiUrl: api.url,
  internalSecret: config.internalSecret,
  schedule: config.pipelineSchedule,
  timezone: config.pipelineTimezone,
  region: config.gcpRegion,
});

export const neonProjectId = db.projectId;
export const neonDatabaseHost = db.databaseHost;
export const apiUrl = api.url;
export const pipelineCronJob = cron.jobName;
