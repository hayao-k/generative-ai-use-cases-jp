import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { CommonWebAcl } from './construct/common-web-acl';

interface CloudFrontWafStackProps extends StackProps {
  allowedIpV4AddressRanges: string[] | null;
  allowedIpV6AddressRanges: string[] | null;
  allowedCountryCodes: string[] | null;
  hostName?: string;
  domainName?: string;
  hostedZoneId?: string;
  certificateArn?: string;
}

export class CloudFrontWafStack extends Stack {
  public readonly webAclArn: string;
  public readonly webAcl: CommonWebAcl;
  public readonly cert: ICertificate;

  constructor(scope: Construct, id: string, props: CloudFrontWafStackProps) {
    super(scope, id, props);

    if (
      props.allowedIpV4AddressRanges ||
      props.allowedIpV6AddressRanges ||
      props.allowedCountryCodes
    ) {
      const webAcl = new CommonWebAcl(this, `WebAcl${id}`, {
        scope: 'CLOUDFRONT',
        allowedIpV4AddressRanges: props.allowedIpV4AddressRanges,
        allowedIpV6AddressRanges: props.allowedIpV6AddressRanges,
        allowedCountryCodes: props.allowedCountryCodes,
      });

      new CfnOutput(this, 'WebAclId', {
        value: webAcl.webAclArn,
      });
      this.webAclArn = webAcl.webAclArn;
      this.webAcl = webAcl;
    }

    if (props.certificateArn) {
      // 既存の証明書を使用
      this.cert = Certificate.fromCertificateArn(this, 'ExistingCert', props.certificateArn);
    } else if (props.hostName && props.domainName && props.hostedZoneId) {
      // ホスト名、ドメイン名、ホストゾーンIDがすべて提供された場合のみ、新しい証明書を作成
      const hostedZone = HostedZone.fromHostedZoneAttributes(
        this,
        'HostedZone',
        {
          hostedZoneId: props.hostedZoneId,
          zoneName: props.domainName,
        }
      );
      this.cert = new Certificate(this, 'Cert', {
        domainName: `${props.hostName}.${props.domainName}`,
        validation: CertificateValidation.fromDns(hostedZone),
      });
    }
  }
}
