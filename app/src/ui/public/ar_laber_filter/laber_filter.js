import _ from 'lodash';
import template from 'ui/ar_laber_filter/laber_filter.html';
import 'ui/ar_laber_filter/laber_filter.less';
import moment from 'moment';
import angular from 'angular';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');


module.directive('laberFilter', function (Private, Promise, getAppState) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      labels:'=',
      type:'@',
      method:'='
    },
    link: function ($scope, $el, attrs) {


    }
  };
});
