
import _ from 'lodash';
import $ from 'jquery';
import routes from 'ui/routes';
import uiModules from 'ui/modules';
import newTemplate from 'plugins/kibana/data/agentUpload/new_agent.html';
import 'ui/anyrobot_ui/tm.pagination';
import 'plugins/kibana/data/ruleInput/rule_input_set';
import 'plugins/kibana/data/agentUpload/save_agent';
import 'ui/notify';
import tcpudpCom from 'plugins/kibana/data/components/tcpudp_com';
routes
.when('/data/agentUpload/newAgent', {
  template: newTemplate
});

uiModules
.get('apps/data', ['kibana/notify'])
.controller('newAgent', function ($scope, $location, $http, locals, Notifier, $timeout,$translate,$translatePartialLoader) {
  $translatePartialLoader.addPart('../plugins/kibana/data');
  $translate.refresh();
  var lang = $translate.use();
  var locationDate;
  var nullWu;
  $scope.row = 1;
  $scope.rowme = 5;
  if (lang === 'zh-cn') {
    locationDate = '数据';
    nullWu = '无';
    $scope.row = 1;
    $scope.rowme = 5;
  } else if (lang === 'zh-tw') {
    locationDate = '資料';
    nullWu = '無';
    $scope.row = 1;
    $scope.rowme = 5;
  } else {
    locationDate = 'Date';
    nullWu = 'Null';
    $scope.row = 2;
    $scope.rowme = 4;
  }

  //提示
  const notify = new Notifier({
    location: locationDate
  });

  //获取错误码对应的错误信息
  var getErrorCode = tcpudpCom.getErrorCode;

  var newtcp = locals.getObject('arg','');
  var tcparg = locals.getObject('TcpArg','');
  var labels = tcparg.Labels;
  var ruleName = locals.get('ruleName','');
  var reg = /\uff0c+|\u0020+|,+|;+| +/g;
  var regtag = /\uff0c+|,+|;+|/g;


  $scope.portError = false;
  $scope.typeError = false;
  $scope.protocolError = false;

  var errorShow = function (res,status,modify) {
    if (res.code === 3758751751) {
      $scope.typeError = true;
    } else if (res.code === 3758751746) {
      $scope.portError = true;
    } else if (res.code === 3758751745) {
      $scope.protocolError = true;
    } else {
      var message = getErrorCode(res.code,'data');
      notify.error(`${modify}：${$translate.instant(message)}`);
    }
  };

  var serviceExceptions = function (res,status,modify) {
    if (status === 502) {
      notify.error(`${modify}:${$translate.instant('服务异常！')}`);
    }
    else {
      notify.error(`${modify}：${res.message}`);
    }
  };


  $scope.$watch('data.protocol',function () {
    if ($scope.data.protocol !== '' || $scope.data.protocol !== undefined) {
      $scope.protocolError = false;
    }
  });

  $scope.$watch('data.type',function () {
    if ($scope.data.type !== '' || $scope.data.type !== undefined) {
      $scope.typeError = false;
    }
  });


  var r = /^[0-9]*[1-9][0-9]*$/;//正整数
  $scope.positiveInteger = false;
  $scope.positiveIntegerMax = false;
  $scope.$watch('data.port', function (newValue, oldValue) {
    if ($scope.data.port !== '' || $scope.data.port !== undefined) {
      $scope.portError = false;
    }
    //判断端口号不存在
    //判断端口号是否大于65535
    if ($scope.data.port > 65535) {
      $scope.positiveIntegerMax = true;
    } else {
      $scope.positiveIntegerMax = false;
    }
    //判断端口号是否为正整数
    // r.test($scope.data.port)
    if (r.test($scope.data.port)) {
      $scope.positiveInteger = false;
    } else {
      $scope.positiveInteger = true;
    };
  });

  //跳转页面
  $scope.jump = function (url) {
    $location.path(url);
  };

  //删掉数组里面的空元素
  var deleteEmptyArr = function (arr) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === '' || typeof (arr[i]) === 'undefined') {
        arr.splice(i,1);
        i = i - 1;
      }
    }
  };

  //获取字符数
  var bytesCount = function (str) {
    var bCount = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (/^[\u0000-\u00ff]$/.test(c)) {//匹配双字节
        bCount += 1;
      } else {
        bCount += 2;
      }
    }
    return bCount;
  };

  $scope.labelSame = false;//判断是否存在相同的标签
  var labelSplit = function () {
    var p = $scope.data.tags.split(/\uff0c|,/);
    var bConut = bytesCount(p[0]);
    var results = '';
    if (bConut > 20) {
      $scope.labelError = true;
      results = $translate.instant('日志标签不能超过10个中文字符!');
    } else {
      var indexFind = $.inArray(p[0], $scope.arLabel);
      if (indexFind !== -1) {
        $scope.labelSame = true;
        results = $translate.instant('存在相同的日志标签!');
      } else {
        $scope.arLabel.push(p[0]);
      }

    }
    deleteEmptyArr($scope.arLabel);
    if ($scope.arLabel[0] === '') {
      $scope.addL = false;
    } else {
      $scope.addL = true;
    }
    $scope.data.tags = '';
    return results;
  };

  //判断添加标签输入框是否存在值
  var labelEmp = function () {
    var results = '';
    if ($scope.data.tags === undefined) {
      return;
    } else {
      deleteEmptyArr($scope.arLabel);
      results = labelSplit();
      $scope.addL = true;
    };
    return results;
  };

  $scope.dataId;
  //var newtcp = $location.search().arg;
  var udata = newtcp.data;
  $scope.newOrUp = newtcp.new;

  //判断对象是否为空
  var isEmptyObject = function (obj) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        return false;
      };
    };
    return true;
  };


  var udataEmptyObj = isEmptyObject(udata);
  var tcpargEmptyObj = isEmptyObject(tcparg);
  if (udataEmptyObj || newtcp.new) {
    //1.新建tcp上传
    let ruleN1 = locals.get('ruleName','');
    let ruleN2 = nullWu;
    let ruleNa = ruleN1 === 'null' ? ruleN2 : ruleN1;
    if (tcpargEmptyObj) {
      $scope.uplodeFlag = true;//确认按钮为上传
      $scope.go = false;//修改解析规则按钮不可用
      $scope.data = {
        'protocol': 'beats',
        'port': '',
        'type': '',
        'tags': [],
        'ruleName': null,
        'status': 1
      };
    } else {
      $scope.uplodeFlag = false;//确认按钮为修改
      $scope.go = true;//修改解析规则按钮可用
      $scope.data = tcparg.data;
      $scope.data = {
        'protocol': 'beats',
        'port': tcparg.data.port,
        'type': tcparg.data.type,
        'tags': tcparg.data.tags,
        'ruleName': ruleName,
        'status': tcparg.data.status
      };
    };
    $scope.ruleName = ruleNa;
    //确定按钮
    $scope.dataAdd = function () {
      var results = labelEmp();
      if (results === '') {
        let data = {
          'protocol': 'beats',
          'port': $scope.data.port,
          'type': $scope.data.type,
          'tags': $scope.arLabel,
          'ruleName': $scope.data.ruleName,
          'status': $scope.data.status
        };
        if ($scope.uplodeFlag) {
          //1.1.第一次点击确定按钮，上传tcp/udp
          $http.post('/etl/input/agent',data).success(function (res,status) {
            if (status === 200) {
              notify.info($translate.instant('您已成功提交数据！'));
              //修改解析规则按钮可用
              $scope.dataId = res.id;
              $scope.go = true;
              $scope.uplodeFlag = false;
            } else {
              errorShow(res,status,$translate.instant('提交失败'));
            }

          }).error(function (res,status) {
            serviceExceptions(res,status,$translate.instant('提交失败'));

          });
        } else {
          //1.2.第二次点击确定按钮，修改tcp/udp
          var arDataId;
          if (tcpargEmptyObj) {
            arDataId = $scope.dataId;
          } else {
            arDataId = tcparg.id;
          };
          $http.put(`/etl/input/agent/${arDataId}`,data).success(function (res,status) {
            if (status === 200) {
              notify.info($translate.instant('修改成功！'));
              $scope.go = true;
            } else {
              errorShow(res,status,$translate.instant('修改失败'));
            }

          }).error(function (res,status) {
            serviceExceptions(res,status,$translate.instant('修改失败'));
          });
        };
      } else {
        notify.warning(results);
      }

    };
  } else if (!udataEmptyObj || !newtcp.new) {
    //2.编辑tcp
    let argId = locals.get('argId','');
    let ruleN1 = locals.get('ruleName','');
    let ruleN2 = newtcp.data.ruleName === null ? nullWu : newtcp.data.ruleName;
    let ruleNa = ruleN1 === 'null' ? ruleN2 : ruleN1;
    $scope.go = true;//修改解析规则按钮可用
    if (tcpargEmptyObj) {
      $scope.data = {
        'protocol': 'beats',
        'port': Number(newtcp.data.port),
        'type': newtcp.data.type,
        'tags': newtcp.data.tags,
        'ruleName': newtcp.data.ruleName,
        'status': newtcp.data.status
      };
    } else {
      $scope.data = {
        'protocol': 'beats',
        'port': tcparg.data.port,
        'type': tcparg.data.type,
        'tags': tcparg.data.tags,
        'ruleName': tcparg.data.ruleName,
        'status': tcparg.data.status
      };
    };

    $scope.ruleName = ruleNa;
    $scope.dataId = newtcp.data.id;
    //确定按钮
    $scope.dataAdd = function () {
      var results = labelEmp();
      if (results === '') {
        let type = typeof $scope.data.tags;
        let data = {
          'protocol': 'beats',
          'port': $scope.data.port,
          'type': $scope.data.type,
          'tags':$scope.arLabel,
          'ruleName': $scope.data.ruleName,
          'status': $scope.data.status
        };
        //修改tcp/udp
        var arDataId;
        if (tcpargEmptyObj) {
          arDataId = argId;
        } else {
          arDataId = tcparg.id;
        };
        $http.put(`/etl/input/agent/${arDataId}`,data).success(function (res,status) {
          if (status === 200) {
            notify.info($translate.instant('修改成功！'));
            $scope.go = true;
            let args = {};
            args.data = data;
            args.new = false;
            locals.setObject('arg',args);
          } else {
            errorShow(res,status,$translate.instant('修改失败'));
          }

        }).error(function (res,status) {
          serviceExceptions(res,status,$translate.instant('修改失败'));
        });
      } else {
        notify.warning(results);
      }


    };
  };



  //监听
  if (labels !== undefined) {
    $scope.arLabel = labels;
    $scope.addL = true;
  } else {
    if ($scope.data.tags === undefined) {
      $scope.arLabel = [];
    } else {
      let type = typeof $scope.data.tags;
      $scope.arLabel = type === 'object' ? $scope.data.tags.join(',').split(',') : $scope.data.tags.split(reg);
    };
  };

  if ($scope.arLabel[0] === '') {
    $scope.addL = false;
  } else {
    $scope.addL = true;
  }
  $scope.data.tags = '';
  $scope.labelError = false;
  var labelChange = function (tags) {
    let count = 0;
    if ($scope.data.tags.indexOf(',') > 0 || $scope.data.tags.indexOf('\uff0c') > 0) {
      labelSplit();
    }
  };

  $scope.labelChange = labelChange;

  //支持回车添加标签
  $scope.todoSomething = function ($event) {
    if ($event.keyCode === 13) {//回车
      labelSplit();
    }
  };


  var timeout;
  $scope.$watch('data.tags',function () {
    var bConut = bytesCount($scope.data.tags);
    if (bConut === 0) {
      if ($scope.labelError === true || $scope.labelSame === true) {
        //4秒labelError提示消失
        if (timeout) $timeout.cancel(timeout);
        timeout = $timeout(function () {
          $scope.labelError = false;
          $scope.labelSame = false;
        },4000);
      }

    } else if (0 < bConut && bConut <= 20) {
      $scope.labelError = false;
    } else if (bConut > 20) {
      $scope.labelError = true;
    }
  });


  //删除标签
  $scope.removeLabel = function (index) {
    $scope.arLabel.splice(index, 1);
  };


  //新建解析规则按钮
  $scope.newRule = function () {
    var ruleName = $scope.ruleName;
    $scope.dataId = $scope.dataId === undefined ? tcparg.id : $scope.dataId;
    locals.setObject('TcpArg',{
      data:$scope.data,id:$scope.dataId,port:$scope.data.port,Labels:$scope.arLabel,newR:true,ruleName:ruleName,type:'agent'});//给解析规则获取相应的端口
    $scope.jump('/data/ruleInput/ruleInputSet');
  };

  //修改解析规则按钮
  $scope.updetaRule = function () {
    var ruleName = $scope.ruleName;
    //给解析规则获取相应的端口
    $scope.dataId = $scope.dataId === undefined ? tcparg.id : $scope.dataId;
    locals.setObject('TcpArg',{
      data:$scope.data,id:$scope.dataId,port:$scope.data.port,Labels:$scope.arLabel,newR:false,ruleName:ruleName,type:'agent'});
    $scope.jump('/data/ruleInput/ruleInputSet');
  };

  //保存输入配置按钮
  //$scope.newSetSaveSuccess = false;
  $scope.newSetSave = true;
  $scope.saveRule = function () {
    let argId = locals.get('argId','');
    let ruleName = locals.get('ruleName','');
    let ruleN = $scope.ruleName === nullWu ? null : $scope.ruleName;
    var thisDataId = $scope.thisDataId;
    var results = labelEmp();
    if (results === '') {
      deleteEmptyArr($scope.arLabel);
      let data = {
        'protocol': 'beats',
        'port': $scope.data.port,
        'type': $scope.data.type,
        'tags': $scope.arLabel,
        'ruleName': ruleN,
        'status': $scope.data.status
      };
      var arDataId;
      if (tcpargEmptyObj) {
        arDataId = $scope.dataId === undefined ? argId : $scope.dataId;
      } else {
        arDataId = tcparg.id;
      };
      $http.put(`/etl/input/agent/${arDataId}`,data).success(function (res,status) {
        if (status === 200) {
          $scope.go = true;
          $scope.newSetSave = false;
          $scope.jump('/data/agentUpload/saveAgent');
        } else {
          errorShow(res,status,$translate.instant('保存失败'));
        }
      }).error(function (res,status) {
        if (status === 502) {
          notify.error($translate.instant('保存失败：服务异常！'));
        } else {
          notify.error(`${$translate.instant('保存失败:')}${res.message}`);
        }

      });
    } else {
      notify.warning(results);
    }

  };

  //返回按钮
  $scope.BackTo = function () {
    $location.path('/data/agentUpload');
    locals.setObject('nweTcpArg',{});//置空
    locals.set('returnTcpUdp', true);

  };


});
