import _ from 'lodash';
import $ from 'jquery';
import Binder from 'ui/binder';
import 'gridster';
import uiModules from 'ui/modules';

const app = uiModules.get('app/dashboard');

app.directive('dashboardGrid', function ($compile, Notifier, $timeout) {
  return {
    restrict: 'E',
    require: '^dashboardApp', // must inherit from the dashboardApp
    link: function ($scope, $el) {
      const notify = new Notifier();
      const $container = $el;
      //lcx
      let $div = $('#panel-lcx');
      const $divCon = $div;

      $el = $('<ul>').appendTo($container);


      const $window = $(window);
      const $body = $(document.body);
      const binder = new Binder($scope);

      // appState from controller
      const $state = $scope.state;

      //lcx
      var panels10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      //LCX
      let gridster = []; // defined in init()

      // number of columns to render
      const COLS = 12;
      // number of pixed between each column/row
      const SPACER = 0;
      // pixels used by all of the spacers (gridster puts have a spacer on the ends)
      const spacerSize = SPACER * COLS;

      // debounced layout function is safe to call as much as possible
      const safeLayout = _.debounce(layout, 200);

      function init() {

        //lcx
        let index = $scope.showTabIndex;
        panels10.map((obj, i)=> {
          if (i === index) {
            $(`<div id = panel${i} ><ul class = "gridster"><div>`).appendTo($div);
            $(`#panel${i}`).addClass('lcx-show');
          } else {
            $(`<div id = panel${i} ><ul class = "gridster"><div>`).appendTo($div);
            $(`#panel${i}`).addClass('lcx-hide');
          }
        });


        $scope.$watch('state.panels', function (panels, oldVal) {
          //lcx
          let index = $scope.state.panels[0].index || 0;
          //let drag = $scope.state.panels[0].drag || 'no';
          let oldIndex = oldVal[0].index;
          let panel = $scope.state.panels[index].panel;
          //let oldPanel = $scope.state.panels[oldIndex].panel;

          if (_.size(panel) === 0) {
            $(`#panel${index}`).html('<ul class = "gridster">');
          }

          //let gridsts = [];
          if (_.size(panel) > 0) {
            panel.sort((a, b) => {
              if (a.row === b.row) {
                return a.col - b.col;
              } else {
                return a.row - b.row;
              }
            });
          }


          let gridst = $(`#panel${index} ul`).gridster({
            max_cols: COLS,
            min_cols: COLS,
            autogenerate_stylesheet: false,
            resize: {
              enabled: true,
              stop: readGridsterChangeHandler
            },
            draggable: {
              handle: '.panel-move, .fa-arrows',
              stop: readGridsterChangeHandler
            }
          }).data('gridster');

          gridster[index] = gridst;
          //gridster[oldIndex] = gridst;

          //binder
          //This is necessary to enable text selection within gridster elements
          binder.jqOn(`panel-${index}`, 'mousedown', function () {
            //lcx
            gridster[index].disable().disable_resize();
          });
          binder.jqOn(`panel-${index}`, 'mouseup', function enableResize() {
            //lcx
            gridster[index].enable().enable_resize();
          });

          // lcx
          let removed = [];
          let added = [];


          if (gridster[index]) {
            let currentPanels = gridster[index].$widgets.toArray().map(function (el) {
              return getPanelFor(el);
            });
            removed = _.difference(currentPanels, panel);

            added = _.difference(panel, currentPanels);

          }

          if (_.size(panels) >= _.size(oldVal)) {
            if (removed.length > 0) {
              removed.map((obj, i)=> {
                removePanel(obj, index);
              });
            }
          }

          //在tab页切换的时候，会进入watchk两次，会发两次mget请求，只让其发一次
          if (panels[0].index === oldVal[0].index) {
            if (added.length > 0) {
              added.map((obj, i)=> {
                addPanel(obj, index);
              });
            }
          }


          // ensure that every panel can be serialized now that we are done
          if (_.size(panel) > 0) {
            panel.forEach(makePanelSerializeable);
          }


          //reflowGridster();


          // alert interested parties that we have finished processing changes to the panels
          // TODO: change this from event based to calling a method on dashboardApp

          //if (added.length || removed.length) $scope.$root.$broadcast('change:vis');
          if ($scope.$root) {
            $scope.$root.$broadcast('change:vis');
          }


          if (panels[0].index !== oldVal[0].index) {
            safeLayout();
            $window.on('resize', safeLayout);
            $scope.$on('ready:vis', safeLayout);
            $scope.$on('globalNav:update', safeLayout);
          }
        }, true);


        //
        // lcx
        $scope.$on('$destroy', function () {
          safeLayout.cancel();
          $window.off('resize', safeLayout);

          if (!gridster) return;
          gridster.map((obj, i)=> {
            obj.$widgets.each(function (i, el) {
              const panel = getPanelFor(el);
              // stop any animations
              if (panel) {
                panel.$el.stop();
                removePanel(panel, i, true);
                // not that we will, but lets be safe
                makePanelSerializeable(panel);
              }

            });
          });
        });

        safeLayout();
        $window.on('resize', safeLayout);
        $scope.$on('ready:vis', safeLayout);
        $scope.$on('globalNav:update', safeLayout);
      }

      // return the panel object for an element.
      //
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // ALWAYS CALL makePanelSerializeable AFTER YOU ARE DONE WITH IT
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      function getPanelFor(el) {

        const $panel = el.jquery ? el : $(el);
        const panel = $panel.data('panel');
        if (panel) {
          panel.$el = $panel;
          panel.$scope = $panel.data('$scope');
        }


        return panel;
      }

      // since the $el and $scope are circular structures, they need to be
      // removed from panel before it can be serialized (we also wouldn't
      // want them to show up in the url)
      function makePanelSerializeable(panel) {

        delete panel.$el;
        delete panel.$scope;
      }

      // tell gridster to remove the panel, and cleanup our metadata
      function removePanel(panel, index, silent) {
        // remove from grister 'silently' (don't reorganize after)
        if (gridster[index]) {
          gridster[index].remove_widget(panel.$el, silent);
        }


        // destroy the scope
        panel.$scope.$destroy();

        panel.$el.removeData('panel');
        panel.$el.removeData('$scope');
      }

      // tell gridster to add the panel, and create additional meatadata like $scope
      function addPanel(panel, index) {
        _.defaults(panel, {
          size_x: 3,
          size_y: 2
        });

        // ignore panels that don't have vis id's
        if (!panel.id) {
          // In the interest of backwards compat
          if (panel.visId) {
            panel.id = panel.visId;
            panel.type = 'visualization';
            delete panel.visId;
          } else {
            throw new Error('missing object id on panel');
          }
        }

        panel.$scope = $scope.$new();
        panel.$scope.panel = panel;
        panel.$scope.panelOne = $scope.state.panels[index].panel;
        panel.$scope.parentUiState = $scope.uiState;

        panel.$el = $compile('<li><dashboard-panel></li>')(panel.$scope);

        // tell gridster to use the widget
        gridster[index].add_widget(panel.$el, panel.size_x, panel.size_y, panel.col, panel.row);

        // update size/col/etc.
        refreshPanelStats(panel);

        // stash the panel and it's scope in the element's data
        panel.$el.data('panel', panel);
        panel.$el.data('$scope', panel.$scope);
      }

      // ensure that the panel object has the latest size/pos info
      function refreshPanelStats(panel) {
        const data = panel.$el.coords().grid;
        panel.size_x = data.size_x;
        panel.size_y = data.size_y;
        panel.col = data.col;
        panel.row = data.row;
      }

      // when gridster tell us it made a change, update each of the panel objects

      //
      // lcx
      function readGridsterChangeHandler(e, ui, $widget) {
        // ensure that our panel objects keep their size in sync
        let index = $scope.state.panels[0].index || 0;
        gridster[index].$widgets.each(function (i, el) {
          const panel = getPanelFor(el);
          refreshPanelStats(panel);
          panel.$scope.$broadcast('resize');
          makePanelSerializeable(panel);
          $scope.$root.$broadcast('change:vis');
        });

      }

      // calculate the position and sizing of the gridster el, and the columns within it
      // then tell gridster to "reflow" -- which is definitely not supported.
      // we may need to consider using a different library

      //
      // lcx
      function reflowGridster() {
        // https://github.com/gcphost/gridster-responsive/blob/97fe43d4b312b409696b1d702e1afb6fbd3bba71/jquery.gridster.js#L1208-L1235
        let index = $scope.state.panels[0].index || 0;
        let g = gridster[index];
        if (g) {
          g.options.widget_margins = [SPACER / 2, SPACER / 2];
          g.options.widget_base_dimensions = [($container.width() - spacerSize) / COLS, 100];
          g.min_widget_width = (g.options.widget_margins[0] * 2) + g.options.widget_base_dimensions[0];
          g.min_widget_height = (g.options.widget_margins[1] * 2) + g.options.widget_base_dimensions[1];

          // const serializedGrid = g.serialize();
          g.$widgets.each(function (i, widget) {
            g.resize_widget($(widget));
          });

          g.generate_grid_and_stylesheet();
          g.generate_stylesheet({namespace: '.gridster'});

          g.get_widgets_from_DOM();
          // We can't call this method if the gridmap is empty. This was found
          // when the user double clicked the "New Dashboard" icon. See
          // https://github.com/elastic/kibana4/issues/390
          if (gridster[index].gridmap.length > 0) g.set_dom_grid_height();
          g.drag_api.set_limits(COLS * g.min_widget_width);
        }


      }

      function layout() {
        const complete = notify.event('reflow dashboard');
        reflowGridster();
        readGridsterChangeHandler();
        complete();
      }

      init();
    }
  };
});
