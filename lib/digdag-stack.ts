import * as cdk from '@aws-cdk/core'
import * as route53 from '@aws-cdk/aws-route53'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns'
import * as certificatemanager from '@aws-cdk/aws-certificatemanager'
import * as rds from '@aws-cdk/aws-rds'
import * as iam from '@aws-cdk/aws-iam'
import * as loadbalancer from '@aws-cdk/aws-elasticloadbalancingv2'

interface Props extends cdk.StackProps {
  vpcCidr: string
  route53ZoneName: string
  route53RecordName: string
  route53ZoneId: string
  acmArn: string
  logBucket: string
  userPoolArn: string
  userPoolClientId: string
  userPoolDomain: string
}

export class DigdagStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      cidr: props.vpcCidr,
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'digdag-public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'digdag-private',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          name: 'digdag-db',
          subnetType: ec2.SubnetType.ISOLATED,
        }
      ]
    })

    // DB
    const databaseName = 'digdag'
    const dbPort = 54321
    const db = new rds.DatabaseCluster(this, 'DBCluster', {
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      engineVersion: '10.7',
      instances: 1,
      masterUser: {
        username: 'digdag',
      },
      defaultDatabaseName: databaseName,
      port: dbPort,
      instanceProps: {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.R5, ec2.InstanceSize.LARGE),
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.ISOLATED
        }
      },
      parameterGroup: new rds.ClusterParameterGroup(this, 'DBClusterParameterGroup', {
        family: 'aurora-postgresql10',
        parameters: {
          application_name: 'digdag',
        }
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY // for test
    })

    // ECS
    const cluster = new ecs.Cluster(this, 'ECSCluster', {
      clusterName: 'digdag',
      vpc: vpc
    })
    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ]
    })
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
      ]
    })
    const domainZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.route53ZoneId,
      zoneName: props.route53ZoneName
    })
    const service = new ecsPatterns.LoadBalancedFargateService(this, 'Service', {
      cluster,
      image: ecs.ContainerImage.fromAsset('./docker'),
      loadBalancerType: ecsPatterns.LoadBalancerType.APPLICATION,
      certificate: certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', props.acmArn),
      domainName: `${props.route53RecordName}.${props.route53ZoneName}.`,
      domainZone,
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
        DB_USERNAME: db.secret!.secretValueFromJson('username').toString(),
        DB_PASSWORD: db.secret!.secretValueFromJson('password').toString(),
        DB_HOST: db.secret!.secretValueFromJson('host').toString(),
        DB_PORT: db.secret!.secretValueFromJson('port').toString(),
        DB_DATABASE: databaseName,
        S3_LOG_BUCKET: props.logBucket
      },
      executionRole,
      taskRole
    })
    const dbSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'DBSG', db.securityGroupId)
    const serviceSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'ServiceSG', service.service.connections.securityGroups[0].securityGroupId)
    dbSG.addIngressRule(serviceSG, ec2.Port.tcp(dbPort))
    dbSG.addIngressRule(serviceSG, ec2.Port.tcp(dbPort))

    // Auth
    const lbSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'LBSG',
      cdk.Fn.select(0, service.loadBalancer.loadBalancerSecurityGroups))
    lbSG.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443))
    lbSG.addEgressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(443))
    new loadbalancer.CfnListenerRule(this, 'AuthListenerRule', {
      conditions: [{
        field: 'path-pattern',
        values: ['/*']
      }],
      listenerArn: service.listener.listenerArn,
      priority: 10,
      actions: [{
        type: 'authenticate-cognito',
        order: 1,
        authenticateCognitoConfig: {
          onUnauthenticatedRequest: 'authenticate',
          userPoolArn: props.userPoolArn,
          userPoolClientId: props.userPoolClientId,
          userPoolDomain: props.userPoolDomain
        }
      }, {
        type: 'forward',
        order: 2,
        targetGroupArn: service.targetGroup.targetGroupArn
      }]
    })
  }
}
