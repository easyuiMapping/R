import _ from 'lodash';
import $ from 'jquery';
//import jqueryUi from 'jquery-ui';
import jqueryUi from 'jquery-ui/ui/jquery-ui';
import uisortable  from 'angular-ui-sortable/src/sortable';
//import 'jquery-ui';
// import 'angular-ui-sortable/src/sortable';
//import 'angular-sortable-view';
import angular from 'angular';
import chrome from 'ui/chrome';
import 'ui/courier';
import 'ui/config';
import 'ui/notify';
import 'ui/typeahead';
import 'ui/share';
import 'plugins/kibana/dashboard/directives/grid';
import 'plugins/kibana/dashboard/components/panel/panel';
import 'plugins/kibana/dashboard/services/saved_dashboards';
import 'plugins/kibana/dashboard/styles/main.less';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DocTitleProvider from 'ui/doc_title';
import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/dashboard/index.html';

require('ui/saved_objects/saved_object_registry').register(require('plugins/kibana/dashboard/services/saved_dashboard_register'));

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'kibana/courier',
  'kibana/config',
  'kibana/notify',
  'kibana/typeahead',
  'ui.sortable'
]);

uiRoutes
  .defaults(/dashboard/, {
    requireDefaultIndex: true
  })
  .when('/dashboard', {
    template: indexTemplate,
    resolve: {
      dash: function (savedDashboards, config) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    template: indexTemplate,
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
          .catch(courier.redirectWhenMissing({
            'dashboard': '/dashboard'
          }));
      }
    }
  });

app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl, $translate, $translatePartialLoader,
  T, $timeout) {
  //luochunxiang@eisoo.com
  $translatePartialLoader.addPart('../plugins/kibana/dashboard');
  $translate.refresh();

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: function ($scope, $rootScope, $route, $routeParams, $location, Private, getAppState, $modal,searchType) {
      searchType.type = 'dashboard';
      $rootScope.arMetricRatiosArr = [];
      $rootScope.arDashboardFlag = true;
      $rootScope.arGanttDArr = [];
      const queryFilter = Private(FilterBarQueryFilterProvider);

      const notify = new Notifier({
        location: $translate.instant('Dashboard')
      });

      //const dash = $scope.dash = $route.current.locals.dash;
      //lcx
      let dash = $scope.dash = $route.current.locals.dash;


      if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
        timefilter.time.to = dash.timeTo;
        timefilter.time.from = dash.timeFrom;
        if (dash.refreshInterval) {
          timefilter.refreshInterval = dash.refreshInterval;
        }
      }

      const matchQueryFilter = function (filter) {
        return filter.query && filter.query.query_string && !filter.meta;
      };

      const extractQueryFromFilters = function (filters) {
        const filter = _.find(filters, matchQueryFilter);
        if (filter) return filter.query;
      };

      let showTabIndex;
      // lcx
      let defaultLabel;
      let newLabel;
      let lang = $translate.use();
      if (lang === 'zh-cn') {
        defaultLabel = '默认标签页';
        newLabel = '新标签页';
      } else if (lang === 'zh-tw') {
        defaultLabel = '默認標籤頁';
        newLabel = '新標籤頁';
      } else {
        defaultLabel = 'Default Tab';
        newLabel = 'New Tab';
      }

      let stateDefaults = {
        title: dash.title,
        panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [{tab: defaultLabel, panel: [], index: 0}],
        options: dash.optionsJSON ? JSON.parse(dash.optionsJSON) : {},
        uiState: dash.uiStateJSON ? JSON.parse(dash.uiStateJSON) : {},
        query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || {query_string: {query: '*'}},
        filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter),
      };

      if (stateDefaults.panels.length === 0) {
        stateDefaults.panels.push({tab: defaultLabel, panel: [], index: 0});
      }

      let stateMonitor;
      let $state;
      let $uiState = $scope.uiState;
      let $appStatus;
      let that = this;

      var stateInit = function () {
        $state = $scope.state = new AppState(stateDefaults);
        $uiState = $scope.uiState = $state.makeStateful('uiState');
        $appStatus = $scope.appStatus = that.appStatus = {};
      };
      stateInit();


      /*
       仪表盘导航栏
       */
      $scope.inputArr = [];//input


      //lcx
      if ($scope.state.panels.length === 0 || $scope.state.panels === '[]') {
        $scope.state.panels = [];
        $scope.state.panels.push({tab: defaultLabel, panel: [], index: 0});
      } else {
        //兼容就仪表盘格式
        let indexOld = [];
        if (!$scope.state.panels[0].tab) {
          let panelsCh = [];
          $state.panels.map((obj, i)=> {
            //let pane = $scope.state.panels.splice(i,1);
            if (!$scope.state.panels[i].tab) {
              panelsCh.push($scope.state.panels[i]);
              indexOld.push(i);
            }

          });
          $state.panels[0] = {tab: defaultLabel, panel: panelsCh, index: 0};
        } else {
          $state.panels.map((obj, i)=> {
            if (!$scope.state.panels[i].tab) {
              $scope.state.panels[0].panel.push($scope.state.panels[i]);
              indexOld.push(i);
            }

          });
        }
        //let indexOldLen = indexOld.length;
        if (indexOld.length > 0) {
          let indexOldLen = 0;
          indexOld.map((obj, i)=> {
            if (i !== 0) {
              $scope.state.panels.splice(obj - indexOldLen, 1);
              indexOldLen++;
            }

          });
        }

      }
      showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index || 0;//当前选择的标签页

      //点击仪表盘标签页
      // $scope.$watch('state.panels',function () {
      //   if (_.size($scope.state.panels) === 0) {
      //     $scope.state.panels.push({tab:defaultLabel,panel:[],index:0});
      //   }
      //   showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index || 0;//当前选择的标签页

      // });

      $scope.stateReplace = [];


      //文本框
      if ($scope.state.panels) {
        $scope.state.panels.map((obj, i)=> {
          $scope.inputArr.push(0);

        });
      }

      $scope.$watchCollection('state.options', function (newVal, oldVal) {
        if (!angular.equals(newVal, oldVal)) $state.save();
      });

      $scope.$watch('state.options.darkTheme', setDarkTheme);

      $scope.topNavMenu = [{
        key: 'new',
        description: 'New Dashboard',
        run: function () {
          kbnUrl.change('/dashboard', {});
        },
      }, {
        key: 'add-dash',
        description: 'Add a panel to the dashboard',
        template: require('plugins/kibana/dashboard/partials/pick_visualization.html')
      }, {
        key: 'save',
        description: 'Save Dashboard',
        template: require('plugins/kibana/dashboard/partials/save_dashboard.html')
      }, {
        key: 'open',
        description: 'Load Saved Dashboard',
        template: require('plugins/kibana/dashboard/partials/load_dashboard.html')
      }, {
        key: 'share',
        description: 'Share Dashboard',
        template: require('plugins/kibana/dashboard/partials/share.html')
      }, {
        key: 'options',
        description: 'Options',
        template: require('plugins/kibana/dashboard/partials/options.html')
      }];

      $scope.refresh = _.bindKey(courier, 'fetch');

      timefilter.enabled = true;
      $scope.timefilter = timefilter;
      $scope.$listen(timefilter, 'fetch', $scope.refresh);

      courier.setRootSearchSource(dash.searchSource);

      function init() {
        updateQueryOnRootSource();

        const docTitle = Private(DocTitleProvider);
        if (dash.id) {
          docTitle.change(dash.title);
        }

        //
        //lcx
        $scope.state.panels.map((obj, i)=> {
          initPanelIndices(i);
        });


        // watch for state changes and update the appStatus.dirty value
        stateMonitor = stateMonitorFactory.create($state, stateDefaults);
        stateMonitor.onChange((status) => {
          $appStatus.dirty = status.dirty;
        });

        $scope.$on('$destroy', () => {
          $rootScope.arMetricRatiosArr = [];
          $rootScope.arDashboardFlag = false;
          $rootScope.arGanttDArr = [];
          stateMonitor.destroy();
          dash.destroy();

          // Remove dark theme to keep it from affecting the appearance of other apps.
          setDarkTheme(false);
        });

        $scope.$emit('application.load');
      }

      function initPanelIndices(ind) {
        // find the largest panelIndex in all the panels
        let maxIndex = getMaxPanelIndex(ind);

        // lcx
        $scope.state.panels[ind].panel.forEach(function (panel) {
          if (!panel.panelIndex) {
            panel.panelIndex = maxIndex++;
          }
        });
      }

      function getMaxPanelIndex(ind) {

        // lcx
        let index = $scope.state.panels[ind].panel.reduce(function (idx, panel) {
          // if panel is missing an index, add one and increment the index
          return Math.max(idx, panel.panelIndex || idx);
        }, 0);
        return ++index;
      }

      function updateQueryOnRootSource() {
        const filters = queryFilter.getFilters();
        if ($state.query) {
          dash.searchSource.set('filter', _.union(filters, [{
            query: $state.query
          }]));
        } else {
          dash.searchSource.set('filter', filters);
        }
      }

      function setDarkTheme(enabled) {
        const theme = Boolean(enabled) ? 'theme-dark' : 'theme-light';
        chrome.removeApplicationClass(['theme-dark', 'theme-light']);
        chrome.addApplicationClass(theme);
      }

      // update root source when filters update
      $scope.$listen(queryFilter, 'update', function () {
        updateQueryOnRootSource();
        $state.save();
      });

      // update data when filters fire fetch event
      $scope.$listen(queryFilter, 'fetch', $scope.refresh);

      $scope.newDashboard = function () {
        kbnUrl.change('/dashboard', {});
      };

      $scope.filterResults = function () {
        updateQueryOnRootSource();
        $state.save();
        $scope.refresh();
      };

      $scope.save = function () {
        $scope.state.panels[0].index = 0;
        $state.title = dash.id = dash.title;
        $state.save();

        const timeRestoreObj = _.pick(timefilter.refreshInterval, ['display', 'pause', 'section', 'value']);
        dash.panelsJSON = angular.toJson($state.panels);
        dash.uiStateJSON = angular.toJson($uiState.getChanges());
        dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
        dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;
        dash.refreshInterval = dash.timeRestore ? timeRestoreObj : undefined;
        dash.optionsJSON = angular.toJson($state.options);

        dash.save()
          .then(function (id) {
            stateMonitor.setInitialState($state.toJSON());
            $scope.kbnTopNav.close('save');
            if (id) {
              notify.info($translate.instant('Saved Dashboard as') + '"' + dash.title + '"');
              if (dash.id !== $routeParams.id) {
                kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
              }
            }
          })
          .catch(notify.fatal);
      };

      //let pendingVis = _.size($state.panels);
      //lcx
      let pendingVis = 0;

      var getPending = function () {
        pendingVis = _.size($state.panels[showTabIndex].panel);
      };


      getPending();


      //let pendingVis = _.size($state.panels) - 1;
      $scope.$on('ready:vis', function () {
        //lcx
        if (pendingVis) pendingVis--;
        if (pendingVis === 0) {
          //console.log('$scope.refresh()');
          $state.save();
          $scope.refresh();
        }
      });

      // listen for notifications from the grid component that changes have
      // been made, rather than watching the panels deeply
      $scope.$on('change:vis', function () {
        $state.save();
      });

      // called by the saved-object-finder when a user clicks a vis
      $scope.addVis = function (hit) {
        pendingVis = 0;
        pendingVis++;
        //lcx
        $state.panels[showTabIndex].panel.push({
          id: hit.id,
          type: 'visualization',
          panelIndex: getMaxPanelIndex(showTabIndex)
        });
        $scope.state.panels = $state.panels;
      };

      $scope.addSearch = function (hit) {
        pendingVis = 0;
        pendingVis++;
        //lcx
        $state.panels[showTabIndex].panel.push({
          id: hit.id,
          type: 'search',
          panelIndex: getMaxPanelIndex(showTabIndex)
        });
        $scope.state.panels = $state.panels;
      };


      /*
       仪表盘分标签页的实现
       */

      /*
       显示隐藏默认标签

       */
      function showhideFisst(index) {
        var temp2 = $scope.dashNavs;
        temp2.map((obj, i)=> {
          var sbtitle = $(`#panel${i}`);
          var sbli = $(`#li-${i}`);
          if (i === 0) {
            sbtitle.addClass('lcx-show');
            sbtitle.removeClass('lcx-hide');
            sbli.addClass('lcx-red');

          } else {
            sbtitle.addClass('lcx-hide');
            sbtitle.removeClass('lcx-show');
            sbli.removeClass('lcx-red');
          }
        });

      };
      //showhideFisst();

      /*
       显示隐藏
       */
      function showhide(index) {
        let temp2 = $scope.state.panels.length + 1;
        for (let i = 0; i < temp2; i++) {
          var sbtitle = $(`#panel${i}`);
          var sbli = $(`#li-${i}`);
          if (Number(index) === Number(i)) {
            sbtitle.addClass('lcx-show');
            sbtitle.removeClass('lcx-hide');

          } else {
            sbtitle.addClass('lcx-hide');
            sbtitle.removeClass('lcx-show');
            $scope.inputArr[i] = 0;
            sbli.removeClass('lcx-click');
          }
        }

      };


      /*
       切换tap
       */

      $scope.showTab = function (e, index) {
        if (showTabIndex === index) {
          return;
        } else {
          kbnUrl.change('#/dashboard');
          let s1 = _.size($state.panels[index].panel) > 0 ? _.size($state.panels[index].panel) : 1;
          let s2 = _.size($state.panels[$scope.showTabIndex].panel) > 0 ? _.size($state.panels[$scope.showTabIndex].panel) : 1;
          pendingVis = s1 + s2;
          showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index = index;
          showhide(index);

        }

      };


      /*
       添加按钮
       */
      $scope.addTab = function (e) {
        let leng = $scope.state.panels.length;
        $scope.inputArr.push(0);//input
        $scope.inputArrOne = false;
        $scope.state.panels.push({tab: newLabel, panel: []});
        pendingVis = _.size($state.panels[showTabIndex].panel) + 1;
        showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index = leng;
        showhide(showTabIndex);
        $state.save();
        kbnUrl.change('#/dashboard');

      };
      /*
       删除按钮
       */
      var dashClearOne = function (index, e) {
        let panelsL = _.size($scope.state.panels);
        let panelDed = $scope.state.panels.splice(index, 1);
        $scope.inputArr.splice(index, 1);//input
        $(`#panel${panelsL - 1}`).html('<ul class = "gridster">');

        if (showTabIndex >= index) {
          if (_.size($scope.state.panels) === 0) {
            $scope.state.panels.push({tab: defaultLabel, panel: []});
            $scope.inputArr[0] = 0;
            showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index = 0;
          } else {
            showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index = showTabIndex - 1 < 0 ? 0 : showTabIndex - 1;
          }
          showhide(showTabIndex);
          let s1 = _.size($state.panels[showTabIndex].panel);
          let s2 = _.size(panelDed[0].panel);
          pendingVis = s1 > s2 ? s1 : s2;
          pendingVis = s1 + s2;
        } else if (showTabIndex < index) {
          showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index = showTabIndex;
          showhide(showTabIndex);

        }
        kbnUrl.change('#/dashboard');
      };
      $scope.dashClearOne = dashClearOne;


      /*
       点击空白处
       */
      let tabBlack = '';
      let listener = function () {
        let tab = $scope.state.panels[showTabIndex].tab;
        if (tab === '' || tab === ' ' || tab === undefined) {
          $scope.state.panels[showTabIndex].tab = tabBlack;
        }
        $scope.inputArr[showTabIndex] = 0;
        var sbli = $(`#li-${showTabIndex}`);
        sbli.removeClass('lcx-click');
        $('#li-0').removeClass('lcx-click1');
        $scope.inputArrOne = false;
      };

      $scope.listener = listener;

      /*
       修改标签的名称 双击事件
       */
      $scope.inputArrOne;

      $scope.tabChange = function (e, index) {
        tabBlack = $scope.state.panels[index].tab;
        // console.log(tabBlack);
        let addt = $('Add-tab');
        if (_.size($scope.state.panels) === 1) {
          $scope.inputArr[0] = 1;
          $scope.inputArrOne = true;
          $('#li-0').removeClass('lcx-click');
          $('#li-0').addClass('lcx-click1');
        } else {
          $scope.inputArrOne = false;
          addt.removeClass('lcx-bottom');
          $('#li-0').removeClass('lcx-click1');
          $scope.inputArr.map((obj, i)=> {
            let sbli = $(`#li-${i}`);
            if (i === index) {
              $scope.inputArr[i] = 1;
              sbli.addClass('lcx-click');
            } else {
              $scope.inputArr[i] = 0;
              sbli.removeClass('lcx-click');
            }
          });
        }

      };


      /*
       input 回车事件
       */
      $scope.enterEvent = function (e, index) {
        var keycode = window.event ? e.keyCode : e.which;
        let tab = $scope.state.panels[index].tab;
        // console.log(tab);
        if (keycode === 13) {
          $scope.inputArr[index] = 0;
          var sbli = $(`#li-${index}`);
          sbli.removeClass('lcx-click');
          $('#li-0').removeClass('lcx-click1');
          $scope.inputArrOne = false;
          if (tab === '' || tab === ' ' || tab === undefined) {
            $scope.state.panels[index].tab = tabBlack;
          }
        }
      };

      /*
       标签拖动替换
       */


      $scope.foo = function (item, partFrom, partTo, indexFrom, indexTo) {
        let index = indexFrom;//移动前的索引
        let dropindex = indexTo;//移动后的索引
        kbnUrl.change('#/dashboard');
        let s1 = _.size($state.panels[index].panel) > 0 ? _.size($state.panels[index].panel) : 1;
        let s2 = _.size($state.panels[dropindex].panel) > 0 ? _.size($state.panels[dropindex].panel) : 1;
        pendingVis = s1 + s2;
        showTabIndex = $scope.showTabIndex = $scope.state.panels[0].index = dropindex;
        $scope.state.panels[index].index = dropindex;
        $scope.state.panels[dropindex].index = dropindex;
        showhide(dropindex);
        // e.stopPropagation();
      };

      // Setup configurable values for config directive, after objects are initialized
      $scope.lcxDashboardTitle = T.t('Dashboard title');
      $scope.opts = {
        dashboard: dash,
        ui: $state.options,
        save: $scope.save,
        addVis: $scope.addVis,
        addSearch: $scope.addSearch,
        timefilter: $scope.timefilter,
        lcxDashboardTitle: $scope.lcxDashboardTitle
      };

      init();
    }

  };
});


