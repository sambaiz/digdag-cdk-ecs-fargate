#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { DigdagStack } from '../lib/digdag-stack';

const app = new cdk.App();
new DigdagStack(app, 'DigdagStack', {
    vpcCidr: 'a.b.c.d/24',
    route53ZoneName: 'example.com',
    route53RecordName: 'digdag', // digdag.example.com
    route53ZoneId: 'XXXXXXXXXXX',
    acmArn: 'arn:aws:acm:xxxxxxxxxxxxxxx',
    logBucket: 'xxxxxxxxxx',
    userPoolArn: 'arn:aws:cognito-idp:xxxxxxxxxxxxxxx',
    userPoolClientId: 'xxxxxxxxxxxxxxxxx',
    userPoolDomain: 'xxxxxxxxxxxxxx.auth.ap-northeast-1.amazoncognito.com'
});
