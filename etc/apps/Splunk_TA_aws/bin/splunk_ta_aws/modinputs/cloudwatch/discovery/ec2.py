import itertools
from .base import DiscoveringPolicyRegistry, DiscoveringPolicy


class DiscoverEC2Metrics(DiscoveringPolicy):
    _METRIC_NAMES = [
        'CPUUtilization',
        'DiskReadOps',
        'DiskWriteOps',
        'DiskReadBytes',
        'DiskWriteBytes',
        'NetworkIn',
        'NetworkOut',
        'NetworkPacketsIn',
        'NetworkPacketsOut',
        'StatusCheckFailed',
        'StatusCheckFailed_Instance',
        'StatusCheckFailed_System',
    ]

    _T2_METRIC_NAMES = [
        'CPUCreditUsage',
        'CPUCreditBalance',
        'CPUSurplusCreditBalance',
        'CPUSurplusCreditsCharged',
    ]

    _C5_M5_METRIC_NAMES = [
        'EBSReadOps',
        'EBSWriteOps',
        'EBSReadBytes',
        'EBSWriteBytes',
        'EBSIOBalance%',
        'EBSByteBalance%',
    ]

    @classmethod
    def _get_instances(cls, client):
        reservations = client.get_ec2_reservations()
        instances = [reservation['Instances'] for reservation in reservations]
        result = itertools.chain.from_iterable(instances)
        return [instance for instance in result]

    @classmethod
    def _get_detail_monitored_instances(cls, client):
        instances = cls._get_instances(client)
        return [_ for _ in instances if _['Monitoring']['State'] == 'enabled']

    @classmethod
    def _create_metric_names(cls, *types):
        result = set()
        for typename in types:
            parts = [cls._METRIC_NAMES]
            if typename.startswith("t2"):
                parts.append(cls._T2_METRIC_NAMES)
            elif typename.startswith("c5") or typename.startswith("m5"):
                parts.append(cls._C5_M5_METRIC_NAMES)
            for name in itertools.chain(*parts):
                result.add(name)
        return result


class DiscoverEC2MetricsByInstance(DiscoverEC2Metrics):
    _EXT_DIMS = [
        'ImageId',
        'InstanceType',
        'PrivateIpAddress',
        'PublicIpAddress',
        'PrivateDnsName',
        'PublicDnsName',
        'Architecture'
    ]

    def __call__(self, client):
        for item in self._get_instances(client):
            tags = self._extract_extra_dimensions(item)
            dimensions = {'InstanceId': item['InstanceId']}
            typename = item['InstanceType']
            metric_names = self._create_metric_names(typename)
            yield self._create_metrics(dimensions, metric_names, tags)

    @classmethod
    def _extract_extra_dimensions(cls, instance):
        extra = [{item['Key']: item['Value']} for item in instance.get('Tags', [])]
        dims = {key: instance.get(key) for key in cls._EXT_DIMS}
        extra.extend([{key: value} for key, value in dims.items() if value])
        return extra


class DiscoverEC2MetricsByInstanceType(DiscoverEC2Metrics):
    def __call__(self, client):
        instances = self._get_detail_monitored_instances(client)
        for typename in {_['InstanceType'] for _ in instances}:
            dimensions = {'InstanceType': typename}
            metric_names = self._create_metric_names(typename)
            yield self._create_metrics(dimensions, metric_names)


class DiscoverEC2MetricsByImage(DiscoverEC2Metrics):
    def __call__(self, client):
        instances = self._get_detail_monitored_instances(client)
        images = dict()
        for instance in instances:
            types = images.setdefault(instance['ImageId'], set())
            types.add(instance['InstanceType'])

        for image, types in images.items():
            dimensions = {'ImageId': image}
            metric_names = {metric for metric in self._create_metric_names(*types)}
            yield self._create_metrics(dimensions, metric_names)


class DiscoverEC2MetricsByAutoScalingGroup(DiscoverEC2Metrics):
    def __call__(self, client):
        auto_scaling_groups = client.get_auto_scaling_groups()
        configurations = {
            item['LaunchConfigurationName']: item['InstanceType']
            for item in client.get_launch_configurations()
        }
        for group in auto_scaling_groups:
            lcn = group['LaunchConfigurationName']
            typename = configurations[lcn]
            metric_names = self._create_metric_names(typename)
            dimensions = {'AutoScalingGroupName': group['AutoScalingGroupName']}
            yield self._create_metrics(dimensions, metric_names)


def create_policy_registry():
    registry = DiscoveringPolicyRegistry()
    registry.set(DiscoverEC2MetricsByInstance, 'InstanceId')
    registry.set(DiscoverEC2MetricsByAutoScalingGroup, 'AutoScalingGroupName')
    registry.set(DiscoverEC2MetricsByImage, 'ImageId')
    registry.set(DiscoverEC2MetricsByInstanceType, 'InstanceType')
    return registry
