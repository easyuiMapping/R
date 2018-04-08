import _ from 'lodash';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import chrome from 'ui/chrome/chrome';
import indexTemplate from 'plugins/kibana/data/index.html';
import sections from 'plugins/kibana/data/component';
import 'ui/kbn_top_nav';
import 'plugins/kibana/data/styles/main.less';


// uiRoutes
// .when('/data', {
//   template: indexTemplate
// });


uiRoutes
.when('/data', {
  redirectTo: '/data/tcpUdp'
});

uiModules
.get('apps/data')
.directive('kbnDataApp', function (Private, $route, timefilter,$translate, $translatePartialLoader,$location) {
  $translatePartialLoader.addPart('../plugins/kibana/data');
  $translate.refresh();
  var lang = $translate.use();
  var TCPUDP;
  var agentUpload;
  if (lang === 'zh-cn') {
    TCPUDP = 'TCP/UDP上传';
    agentUpload = '代理上传';
  } else if (lang === 'zh-tw') {
    TCPUDP = 'TCP/UDP上傳';
    agentUpload = '代理上傳';
  } else {
    TCPUDP = 'TCP/UDP Upload';
    agentUpload = 'Agent Upload';
  }
  return {
    restrict: 'E',
    template: indexTemplate,
    transclude: true,
    scope: {
      sectionName: '@section'
    },
    //添加controller  luochunxiang@eisoo.com
    controller: function ($scope) {

      //增加对象luochunxiang@eisoo.com
      var subNavs = {
        '0': TCPUDP,
        '1': agentUpload,
       // '2': '本地文件上传'
      };
      for (let key in sections) {
        if (sections.hasOwnProperty(key)) {
          sections[key].subNav = subNavs[key];
        };
      };
    },
    link: function ($scope, $el) {
      timefilter.enabled = false;
      $scope.sections = sections;

      $scope.section = _.find($scope.sections, { name: $scope.sectionName });

      $scope.sections.forEach(function (section) {
        //section.class = (section === $scope.section) ? 'active' : void 0;
        section.active = `#${$location.path()}`.indexOf(section.url) > -1;
      });
    }
  };
});

