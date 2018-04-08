/**
 * @name es
 *
 * @description This is the result of calling esFactory. esFactory is exposed by the
 * elasticsearch.angular.js client.
 */

import _ from 'lodash';
import uiModules from 'ui/modules';
uiModules
  .get('kibana',['kibana/notify'])

  .service('getPathInfo', function (Notifier,searchType,T,$http,$timeout,$translate,$translatePartialLoader) {

    const notify = new Notifier({
      location: T.t(searchType.type)
    });

    let getPathInfo = function (id,node) {
      return new Promise(function (resolve, reject) { //做一些异步操作
        let pathInfo = '';
        $http.get(`/manager/loggroup/${id}/paths`).success(function (res,status) {
          if (status === 200) {
            res.map((obj,i) => {
              if (i === 0) {
                pathInfo = obj.groupName;
              } else {
                pathInfo = pathInfo + '->' + obj.groupName;
              }

            });
            node.pathInfo = pathInfo;
            resolve(pathInfo);
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }

        }).error(function (res) {
          notify.error($translate.instant(res));
        });

      });


    };


    return getPathInfo;
  });
