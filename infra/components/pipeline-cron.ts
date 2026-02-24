import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface PipelineCronArgs {
  apiUrl: pulumi.Input<string>;
  internalSecret: pulumi.Input<string>;
  schedule: pulumi.Input<string>;
  timezone: pulumi.Input<string>;
  region: pulumi.Input<string>;
}

export class PipelineCron extends pulumi.ComponentResource {
  public readonly jobName: pulumi.Output<string>;

  constructor(
    name: string,
    args: PipelineCronArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("idea-fork:index:PipelineCron", name, {}, opts);

    // ── Enable Cloud Scheduler API ────────────────────────────────────────
    const schedulerApi = new gcp.projects.Service(
      `${name}-scheduler-api`,
      {
        service: "cloudscheduler.googleapis.com",
        disableOnDestroy: false,
      },
      { parent: this },
    );

    // ── Cloud Scheduler job ───────────────────────────────────────────────
    const job = new gcp.cloudscheduler.Job(
      `${name}-job`,
      {
        name: "idea-fork-pipeline",
        region: args.region,
        schedule: args.schedule,
        timeZone: args.timezone,
        attemptDeadline: "600s",
        retryConfig: {
          retryCount: 1,
          minBackoffDuration: "60s",
        },
        httpTarget: {
          uri: pulumi.interpolate`${args.apiUrl}/internal/pipeline/run`,
          httpMethod: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": args.internalSecret,
          },
        },
      },
      { parent: this, dependsOn: [schedulerApi] },
    );

    this.jobName = job.name;

    this.registerOutputs({
      jobName: this.jobName,
    });
  }
}
