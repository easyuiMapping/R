//luo.chunxiang
//2017.3.23
import uiModules from 'ui/modules';
import $ from 'jquery';
uiModules.get('kibana')
.service('searchType', function () {
  let searchType = {'type':'search'};
  return searchType;

});
