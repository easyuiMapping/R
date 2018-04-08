//luo.chunxiang
//2017.3.23
import uiModules from 'ui/modules';
import $ from 'jquery';
uiModules.get('kibana')
.service('parameters', function () {
  let parameters = [{
    'logGroup': 'logstash-*',
    'timeRange': [1492531200000,1492617599999],
    'filterField':{'must':[],'must_not':[]},
    'query': '* | bucket datehistorgram(@timestamp) interval=3h timezone=\"Asia/Shanghai\" mindoccount=1 as 2',
    'sort':[{'@timestamp':'desc'}],
    'page': 0,
    'size': 500,
    'resultFilters': [],
    'includeSource': 1,
    'dsl':{}
  }];
  return parameters;

});
