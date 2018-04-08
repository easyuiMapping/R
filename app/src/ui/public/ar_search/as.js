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

  .service('as', function (Notifier,searchType,T,$http,$timeout,$translate,$translatePartialLoader) {
    $translatePartialLoader.addPart('../plugins/kibana');
    $translate.refresh();
    const notify = new Notifier({
      location: T.t(searchType.type)
    });

    let searchRes = {'responses': []};



    //502错误处理
    let handleError = function (res, status) {
      let err;
      if (status === 502) {
        err = '服务异常！';
      } else {
        err = res.message;//后台错误
      }
      notify.error(err);
    };


    //提交搜素任务
    let getJobIds = function (body) {
      return new Promise(function (resolve, reject) { //做一些异步操作
        let jobIds = [];
        $http.post('/v1/search/submit',body).success(function (res, status) {
          if (status === 200) {
            res.map((obj,i) => {
              jobIds[i] = obj.id;
            });
            resolve(jobIds);
          } else if (status === 202) {
            let err = T.t(`${res.code}search`);
            notify.error(err);
          }
        }).error(function (res, status) {
          handleError(res, status);
        });
      });
    };

    //获取搜索任务结果的状态
    let getSearchRes = function (obj) {
      return new Promise(function (resolve, reject) {
        $http.get(`/v1/search/fetch/${obj}`).success(function (res, status) {
          if (status === 200) {
            resolve(res);
          } else if (status === 202) {
            let err = T.t(`${res.code}search`);
            notify.error(err);
          }
        }).error(function (res, status) {
          handleError(res, status);
        });
      });
    };

    let bar = function (obj,i) {

      return new Promise(function (resolve, reject) {
        let foo = function () {
        //做一些异步操作
          getSearchRes(obj).then(function (res) {
            let err;
            if (res.status === 0) {
              err = `${res.id}${T.t('任务正在准备中')}`;
              $timeout(function () {
                return foo(obj,i);
              },500);
            } else if (res.status === 1) {
              err = `${res.id}${T.t('任务正在运行中')}`;
              $timeout(function () {
                return foo(obj,i);
              },500);
            } else if (res.status === 2) {
              err = `${res.id}${T.t('任务失败')}`;
              notify.info(`${T.t('第')}${i}${T.t('个')}${err}`);
              return;
            } else if (res.status === 3) {
              err = `${res.id}${T.t('任务成功')}`;
              resolve(res);
              return;
            }
          });
        };
        foo();
      });


    };


    //
    let as = function (body) {

      return new Promise(function (resolve, reject) { //做一些异步操作
        searchRes = {'responses': []};
        let flag = 0;
        getJobIds(body)
        .then(function (jobIdsRes) {
          jobIdsRes.map((obj,i) => {
            bar(obj,i)
            .then(function (res) {
              searchRes.responses[i] = res;
              flag++;
              if (flag === jobIdsRes.length) {
                resolve(searchRes);
              }
            });
          });

        });
      });
    };
    return as;
  });
