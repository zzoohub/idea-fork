import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

export const gcpProject = gcpConfig.require("project");
export const gcpRegion = gcpConfig.get("region") ?? "us-east4";

// Cloud Run sizing
export const cloudRunCpu = config.get("cloudRunCpu") ?? "1";
export const cloudRunMemory = config.get("cloudRunMemory") ?? "1Gi";
export const cloudRunMinInstances =
  config.getNumber("cloudRunMinInstances") ?? 0;
export const cloudRunMaxInstances =
  config.getNumber("cloudRunMaxInstances") ?? 3;

// Neon
export const neonOrgId = config.require("neonOrgId");
export const neonRegion = config.get("neonRegion") ?? "aws-us-east-1";

// Secrets
export const googleApiKey = config.requireSecret("googleApiKey");
export const internalSecret = config.requireSecret("internalSecret");
export const sentryDsn = config.getSecret("sentryDsn") ?? pulumi.output("");
export const producthuntApiToken =
  config.getSecret("producthuntApiToken") ?? pulumi.output("");

// App config
export const corsAllowedOrigins =
  config.get("corsAllowedOrigins") ?? "https://idea-fork.zzooapp.com";
export const pipelineSchedule = config.get("pipelineSchedule") ?? "0 14 * * *";
export const pipelineTimezone =
  config.get("pipelineTimezone") ?? "America/New_York";
export const appstoreKeywords =
  config.get("appstoreKeywords") ??
  "productivity,finance,health,fitness,education,business,social networking,entertainment,food,travel,weather,music,photography,utilities,shopping,lifestyle,medical,news,communication,developer tools";
export const pipelineSubreddits =
  config.get("pipelineSubreddits") ??
  "SaaS,SideProject,smallbusiness,ecommerce,Entrepreneur,startups,personalfinance,FinancialPlanning,CryptoCurrency,BlockchainStartups,Web3,investing,healthcare,mentalhealth,Supplements,loseit,Nutrition,AskDocs,Fitness,bodyweightfitness,MealPrepSunday,Cooking,EatCheapAndHealthy,productivity,Notion,learnprogramming,GetStudying,ContentCreators,socialmedia,Instagram,movies,cordcutters,travel,digitalnomad,WeAreTheMusicMakers,photography,selfhosted,automation,BuyItForLife,selfimprovement,minimalism,technology,technews,discordapp,webdev,devops,marketing";
export const pipelineRssFeeds =
  config.get("pipelineRssFeeds") ??
  "https://hnrss.org/newest?points=50,https://techcrunch.com/feed/";
