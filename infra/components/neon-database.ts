import * as pulumi from "@pulumi/pulumi";
import * as neon from "@pulumi/neon";

export interface NeonDatabaseArgs {
  projectName: pulumi.Input<string>;
  regionId: pulumi.Input<string>;
  orgId: pulumi.Input<string>;
  pgVersion?: pulumi.Input<number>;
  databaseName?: pulumi.Input<string>;
  roleName?: pulumi.Input<string>;
  autoscalingMinCu?: pulumi.Input<number>;
  autoscalingMaxCu?: pulumi.Input<number>;
}

export class NeonDatabase extends pulumi.ComponentResource {
  public readonly projectId: pulumi.Output<string>;
  public readonly connectionUri: pulumi.Output<string>;
  public readonly connectionUriPooler: pulumi.Output<string>;
  public readonly databaseHost: pulumi.Output<string>;
  public readonly databaseName: pulumi.Output<string>;
  public readonly databaseUser: pulumi.Output<string>;
  public readonly databasePassword: pulumi.Output<string>;
  /**
   * SQLAlchemy asyncpg connection URI (postgresql+asyncpg://...)
   */
  public readonly asyncpgUri: pulumi.Output<string>;

  constructor(
    name: string,
    args: NeonDatabaseArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("idea-fork:index:NeonDatabase", name, {}, opts);

    const project = new neon.Project(
      `${name}-project`,
      {
        name: args.projectName,
        orgId: args.orgId,
        regionId: args.regionId,
        pgVersion: args.pgVersion ?? 18,
        branch: {
          name: "main",
          databaseName: args.databaseName ?? "idea_fork",
          roleName: args.roleName ?? "idea_fork",
        },
        defaultEndpointSettings: {
          autoscalingLimitMinCu: args.autoscalingMinCu ?? 0.25,
          autoscalingLimitMaxCu: args.autoscalingMaxCu ?? 1,
        },
        historyRetentionSeconds: 21600, // 6 hours (free tier max)
      },
      { parent: this },
    );

    this.projectId = project.id;
    this.connectionUri = project.connectionUri;
    this.connectionUriPooler = project.connectionUriPooler;
    this.databaseHost = project.databaseHost;
    this.databaseName = project.databaseName;
    this.databaseUser = project.databaseUser;
    this.databasePassword = project.databasePassword;

    // Convert to SQLAlchemy asyncpg format:
    // - postgres:// → postgresql+asyncpg://
    // - sslmode=require → ssl=require (asyncpg uses 'ssl' not 'sslmode')
    // - remove channel_binding (not supported by asyncpg)
    this.asyncpgUri = project.connectionUriPooler.apply((uri) => {
      const url = new URL(uri.replace(/^postgres(ql)?:\/\//, "postgresql+asyncpg://"));
      if (url.searchParams.has("sslmode")) {
        url.searchParams.set("ssl", url.searchParams.get("sslmode")!);
        url.searchParams.delete("sslmode");
      }
      url.searchParams.delete("channel_binding");
      return url.toString();
    });

    this.registerOutputs({
      projectId: this.projectId,
      connectionUri: this.connectionUri,
      connectionUriPooler: this.connectionUriPooler,
      asyncpgUri: this.asyncpgUri,
      databaseHost: this.databaseHost,
      databaseName: this.databaseName,
    });
  }
}
