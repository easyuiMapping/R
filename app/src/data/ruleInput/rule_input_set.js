import _ from 'lodash';
import $ from 'jquery';
import jstimezonedetect from 'jstimezonedetect';
import moment from 'moment';
//import jstz from 'jstz';
import angular from 'angular';
import routes from 'ui/routes';
import uiModules from 'ui/modules';
import setTemplate from 'plugins/kibana/data/ruleInput/rule_input_set.html';
import tcpudpCom from 'plugins/kibana/data/components/tcpudp_com';
import timeZone from 'plugins/kibana/data/components/time_zone';
import 'ui/anyrobot_ui/tm.pagination';
import 'ui/notify';
import 'ui/anyrobot_ui/data_sidebar/data_sidebar.less';
import 'ui/anyrobot_ui/data_sidebar/data_sidebar';

routes
  .when('/data/ruleInput/ruleInputSet', {
    template: setTemplate
  });

uiModules
  .get('apps/data', ['kibana/notify'])
  .controller('inputRuleSetting', function ($scope, $location, $http, locals, Notifier, $translate, $translatePartialLoader) {
    $translatePartialLoader.addPart('../plugins/kibana/data');
    $translate.refresh();
    var lang = $translate.use();
    var locationDate;
    var newRule;
    var existingRules;
    var messageLog;
    if (lang === 'zh-cn') {
      locationDate = '数据';
      newRule = '新建规则';
      existingRules = '已有规则';
      messageLog = '原始日志';

    } else if (lang === 'zh-tw') {
      locationDate = '資料';
      newRule = '新建規則';
      existingRules = '已有規則';
      messageLog = '原始日志';

    } else {
      locationDate = 'Date';
      newRule = 'New rule';
      existingRules = 'Existing rules';
      messageLog = 'message';
    }


    //提示
    const notify = new Notifier({
      location: locationDate
    });
    var nowDataSettingItemsPerPage = locals.get('curDataSettingItemsPerPage', '');
    var TcpArg = locals.getObject('TcpArg', '');//获取上一页传过来的数据
    var arPort = TcpArg.port;//获取相应的端口
    var newR = TcpArg.newR;//是新建规则还是修改规则
    var ruleName = TcpArg.ruleName;//是新建规则还是修改规则
    var ruleNameOld = TcpArg.ruleName;//是新建规则还是修改规则
    var uplodeType = TcpArg.type;//是新建规则还是修改规则
    var mapHits = [];
    var noMapHits = [];

    //获取错误码对应的错误信息
    var getErrorCode = tcpudpCom.getErrorCode;
    var getLog = tcpudpCom.getLog;  //获取日志样例
    var getLogs = tcpudpCom.getLogs;  //获取所有日志样例
    var getRules = tcpudpCom.getRules;  //获取每一列的规则
    var localsObj = tcpudpCom.locals();  //下拉框国际化
    var dateArgSparseMethodInit = tcpudpCom.dateArgSparseMethodInit;  //下拉框国际化

    $scope.uplodeType = uplodeType;
    $scope.rules = [];//规则数组


    //AR-207 优化多个时间戳解析索引混乱问题
    //2017.3.16
    //by:luo.chunxiang
    var timestampOne = function () {
      let num = 0;
      $scope.dateArgs.map((obj, i)=> {
        if (obj.timestamp) {
          num++;
        }
      });
      return num;
    };

    $scope.timestampChange = function (timestamp, index) {
      if (timestamp === 'yes') {
        $scope.dateArgs.map((obj, i)=> {
          if (obj.timestamp && i !== index) {
            $scope.dateArgs[i].timestamp = 'no';
          } else if (obj.timestamp && i === index) {
            $scope.dateArgs[index].timestamp = 'yes';
          }
        });
      } else {
        for (let i = 0; i < $scope.dateArgs.length; i++) {
          if ($scope.dateArgs[i].timestamp) {
            $scope.dateArgs[i].timestamp = 'yes';
            break;
          }
        }

      }
    };


    //AR-207 AR-97 时间戳解析-时区识别优化
    //by:luo.chunxiang
    /*
     1.1获取当前时区：
     */
    var timezone = jstimezonedetect.jstz.determine();
    $scope.timezoneName = timezone.name();

    /*
     1.1获取当前语言：
     */
    var language = $translate.use();


    /*
     1.默认时区
     */
    $scope.defaultZone = timeZone.defaultZone;

    /*
     根据时间文本是否有CST 来给默认的时区
     */
    var selectedCstTime = function (index) {
      let cstTime = $scope.parseCounts[index].value;
      let rawOffset = moment().tz($scope.timezoneName).format('Z');
      if (cstTime.indexOf('CST') > -1) {
        if (rawOffset === '-06:00') {
          $scope.dateArgs[index].timeZone = '-06:00';
        } else if (rawOffset === '+09:30') {
          $scope.dateArgs[index].timeZone = '+09:30';
        } else if (rawOffset === '+08:00') {
          $scope.dateArgs[index].timeZone = '+08:00';
        } else if (rawOffset === '-04:00') {
          $scope.dateArgs[index].timeZone = '-04:00';
        } else {
          if (language === 'en-us') {
            $scope.dateArgs[index].timeZone = '-06:00';
            $scope.dateArgs[index].language = 'en';
          } else {
            $scope.dateArgs[index].timeZone = '+08:00';
            $scope.dateArgs[index].language = 'zh';
          }
        }

      } else {
        $scope.dateArgs[index].timeZone = $scope.timezoneName;
        $scope.dateArgs[index].language = language;
      }
    };

    var domeButInit = function (index) {
      $scope.domeBut = false;//完成按钮不用
      $scope.successArr = [];
      $scope.conversionSuccess = '';
      $scope.conversionErrmsg = '';
      // if (index || index === 0) {
      //   $scope.modifyLayer.push(index);//修改操作 第index层被修改 00001
      // }


    };
    /*
     新增修改解析方法
     */
    /*
     2.删除字段名
     */
    $scope.removes = [];
    $scope.addRemoveField = function (outerIndex, index) {
      domeButInit();
      let item = {id: index};
      if ($scope.dateArgs[outerIndex].removes) {
        if ($scope.dateArgs[outerIndex].removes[index].analyMethod !== '' &&
          $scope.dateArgs[outerIndex].removes[index].analyMethod !== undefined) {
          $scope.dateArgs[outerIndex].removes.push(item);
        }
      }
      // $scope.dateArgs[outerIndex].removes.push(item);

    };
    $scope.deleteRemoveField = function (outerIndex, index) {
      domeButInit();
      $scope.dateArgs[outerIndex].removes.splice(index, 1);
    };
    /*
     3.添加字段名
     */
    $scope.adds = [];
    $scope.addAddField = function (outerIndex, index) {
      domeButInit();
      let item = {id: index};
      if ($scope.dateArgs[outerIndex].adds) {
        if ($scope.dateArgs[outerIndex].adds[index].fieldType !== '' &&
          $scope.dateArgs[outerIndex].adds[index].fieldType !== undefined
          && $scope.dateArgs[outerIndex].adds[index].fieldName !== '' &&
          $scope.dateArgs[outerIndex].adds[index].fieldName !== undefined
          && $scope.dateArgs[outerIndex].adds[index].fieldValue !== '' &&
          $scope.dateArgs[outerIndex].adds[index].fieldValue !== undefined) {
          $scope.dateArgs[outerIndex].adds.push(item);
        }
      }
      // $scope.dateArgs[outerIndex].adds.push(item);
    };
    $scope.deleteAddField = function (outerIndex, index) {
      domeButInit();
      $scope.dateArgs[outerIndex].adds.splice(index, 1);
    };
    /*
     3.重命名字段名
     */
    $scope.renames = [];
    $scope.addRenameField = function (outerIndex, index) {
      domeButInit();
      let item = {id: index};
      if ($scope.dateArgs[outerIndex].renames) {
        if ($scope.dateArgs[outerIndex].renames[index].analyMethod !== '' &&
          $scope.dateArgs[outerIndex].renames[index].analyMethod !== undefined
          && $scope.dateArgs[outerIndex].renames[index].fieldValue !== '' &&
          $scope.dateArgs[outerIndex].renames[index].fieldValue !== undefined) {
          $scope.dateArgs[outerIndex].renames.push(item);
        }
      }
      // $scope.dateArgs[outerIndex].renames.push(item);
    };
    $scope.deleteRenameField = function (outerIndex, index) {
      domeButInit();
      $scope.dateArgs[outerIndex].renames.splice(index, 1);
    };

    /*
     字段类型
     */
    $scope.fieldTypes = [{id: 1, key: 'string'}, {id: 2, key: 'int'}, {id: 3, key: 'float'}];

    $scope.fieldTypesChange = function (index) {
      domeButInit(index);//修改操作 第index层被修改 00001
    };


    /*
     前置条件
     */
    $scope.prefix = [];//前置条件
    $scope.prefixConditions = function (prefix, index) {
      if (!$scope.dateArgs[index]) {
        $scope.dateArgs[index] = {};
      }
      $scope.dateArgs[index].condition = '';
      $scope.prefix[index] = prefix;
      domeButInit(index);//修改操作 第index层被修改 00001
    };


    /*
     多行日志
     */
    $scope.MultipleLinesLogs = 'no';//多行日志默认为否
    $scope.whats = localsObj.whats;//negates下拉框
    $scope.conversionRes = false;//多行转换结果不可见
    $scope.conversionResult = [];
    $scope.verifyRul = false;

    //校验按钮可用
    var checkAllButWork = function () {
      if ($scope.hits && $scope.hits.length > 0 && $scope.verifyRul === true) {
        $scope.checkAllBut = true;//校验按钮可用
      } else {
        $scope.checkAllBut = false;
      }
    };


    var initMultiple = function () {
      $scope.Multiple = {};//多行日志的参数
      $scope.negate = 'no';//正则反转
      $scope.what = 'previous';//previous前一条日志
      $scope.MultipleLinesLogShow = false;//多行转换配置不可见
      $scope.MultiplePatternErr = false;//多行转换正则匹配错误提示
      $scope.conversionErrmsg = '';
      $scope.conversionSuccess = '';
    };

    initMultiple();

    var initArgs = function () {
      domeButInit(0);//修改操作 第一层被修改 00001
      $scope.index = '';
      $scope.successArr = [];
      $scope.textArr = [];
    };
    var initRes = function () {
      $scope.conversionSuc = '';
      $scope.parseContentsInit = [{id: 1, key: messageLog, value: $scope.itemLog}];
      $scope.parseContents = [{id: 1, key: messageLog, value: $scope.itemLog}];
      if ($scope.parseCounts.length === 0) {
        $scope.analysisContentsHead = true;//选择解析内容下拉框
        $scope.addBotton = false;//继续添加按钮可见
        $scope.results = [];//结果清空
      }
    };
    var initParseContents = function () {
      if ($scope.MultipleLinesLogs === 'yes' && $scope.conversionSuccess === 1) {
        $scope.parseContentsInit = [{id: 1, key: messageLog, value: $scope.conversionResult[0]}];
        $scope.parseContents = [{id: 1, key: messageLog, value: $scope.conversionResult[0]}];
      } else {
        $scope.parseContentsInit = [{id: 1, key: messageLog, value: $scope.itemLog}];
        $scope.parseContents = [{id: 1, key: messageLog, value: $scope.itemLog}];
      }
    };
    /*
     多行日志
     */
    //1.正则匹配
    $scope.$watch('Multiple.pattern', function () {
      if ($scope.Multiple.pattern !== undefined || $scope.Multiple.pattern !== '') {
        $scope.MultiplePatternErr = false;
      }
      initArgs();
    });

    //2.正则反转
    $scope.negateChange = function (negate) {
      $scope.negate = negate;
      initArgs();

    };

    //3.归属日志
    $scope.whatChange = function (what) {
      $scope.what = what;
      initArgs();

    };

    //删除多行合并
    $scope.removeMultiple = function () {
      initMultiple();
      $('#no')[0].checked = true;
      $scope.MultipleLinesLogs = 'no';//MultipleLinesLogs重置为no
      initArgs();
      initRes();

    };

    //多行日志
    $scope.MultipleLinesLogsChange = function (MultipleLinesLogs) {

      if (MultipleLinesLogs === 'yes') {
        $scope.MultipleLinesLogShow = true;
      } else {
        $scope.MultipleLinesLogShow = false;
        initMultiple();
      }
      $scope.MultipleLinesLogs = MultipleLinesLogs;

      initArgs();
      initRes();
    };


    //合并转换按钮
    var conversion = function (flag) {
      $scope.verifyRul = true;
      if (!$scope.Multiple.pattern) {
        $scope.MultiplePatternErr = true;
      }
      $scope.Multiple = {
        'type': 'multiline',
        'pattern': $scope.Multiple.pattern,
        'what': $scope.what,
        'negate': $scope.negate === 'no' ? 0 : 1,
        'field': 'message'
      };
      let rules = [];
      rules.push($scope.Multiple);
      let arg = {
        'rules': rules,
        'resultFormat': 1,
        'needDetails': 1,
        'texts': getLog($scope.itemLog)
      };
      $http.post('/manager/parse', arg).success(function (res) {
        $scope.conversionDetails = res.details[0];
        $scope.conversionErrmsg = getErrorCode($scope.conversionDetails.errmsg,'data');
        $scope.conversionSuccess = $scope.conversionDetails.success;
        $scope.conversionSuc = $scope.conversionDetails.success;
        $scope.conversionResult = [];
        for (let key in res.results) {
          if (res.results.hasOwnProperty(key)) {
            $scope.conversionResult.push(res.results[key]);
          }
        }
        if ($scope.parseCounts.length === 0 && $scope.conversionSuccess === 1) {
          $scope.domeBut = true;
        }
        $scope.conversionResultOne = $scope.conversionResult[0];
        if (flag) {
          $scope.conversionRes = false;
        } else {
          $scope.conversionRes = true;
          $scope.results = [];
          $scope.successArr = [];
          $scope.textArr = [];
          $scope.oneParseResults = false;
          $scope.textAlls = [];
          $scope.rules = [];
          $scope.textAlls.unshift($scope.Multiple);
          $scope.rules.unshift($scope.Multiple);
        }
        initParseContents();
        checkAllButWork();
      }).error(function (res, status) {
        if (status === 502) {
          notify.error($translate.instant('合并失败：服务异常！'));
        } else {
          notify.error(res.errmsg);
        }
      });

    };
    $scope.conversion = conversion;


    /*
     多行日志结束
     */

    //分页功能
    //配置分页基本参数
    $scope.pageData = {
      settingConf: {
        currentPage: 1,
        itemsPerPage: nowDataSettingItemsPerPage ? nowDataSettingItemsPerPage : 10,
        perPageOptions: [10, 15, 20, 30, 50]
      }
    };

    //监听currentPage，itemsPerPage
    $scope.$watch('pageData.settingConf.currentPage + pageData.settingConf.itemsPerPage', getDataSetting);


    //从elasticsearch获取数据-post
    var sortStart;
    var sortEnd;

    function getDataSetting() {
      locals.set('curDataSettingItemsPerPage', $scope.pageData.settingConf.itemsPerPage);

      sortStart = $scope.pageData.settingConf.itemsPerPage * ($scope.pageData.settingConf.currentPage - 1);
      sortEnd = $scope.pageData.settingConf.itemsPerPage * $scope.pageData.settingConf.currentPage;
      if ($scope.showme === 2) {
        $scope.hits = $scope.allHits.slice(sortStart, sortEnd);
        $scope.successesMap = $scope.successes.slice(sortStart, sortEnd);
        $scope.pageData.settingConf.totalItems = $scope.successes.length;
        return;
      } else if ($scope.showme === 1) {

        $scope.matchHits = mapHits.slice(sortStart, sortEnd);
        $scope.pageData.settingConf.totalItems = mapHits.length;
        return;
      } else if ($scope.showme === 0) {
        $scope.noMatchHits = noMapHits.slice(sortStart, sortEnd);
        $scope.pageData.settingConf.totalItems = noMapHits.length;
        return;
      }

      $http({
        url: '/elasticsearch/logstash-*/_search',
        method: 'POST',
        async: true,
        data: {
          'timeout': 0,
          'query': {
            'term': {'arPort': arPort}
          },
          'size': 1000,
          'sort': {
            '_index': 'desc',
            '@timestamp': {
              'order': 'desc',
              'unmapped_type': 'boolean'
            }
          }
        }
      }).success(function (data) {

        //将结果在日志样本显示+数据源
        $scope.allHits = data.hits.hits;
        $scope.pageData.settingConf.totalItems = $scope.allHits.length;
        //分页获取数据

        $scope.hits = $scope.allHits.slice(sortStart, sortEnd);
        $scope.successesMap = $scope.successes.slice(sortStart, sortEnd);
      }).error(function () {
        // notify.error('数据读取错误！');
      });
    }


    getDataSetting();


    $scope.go = false;//继续添加按钮的最初不可用
    $scope.ok = true;//使用模板灰化最初可用
    $scope.kv = '=';//K-V分隔符默认为等号
    $scope.analysisContentsHead = true;//解析内容 最初可见
    $scope.addBotton = false;//应用和继续添加按钮 最初不可见

    $scope.itemLog = '';//日志样例
    //选为日志样例按钮
    $scope.curStateChange = function (log) {
      $scope.itemLog = log;
      $scope.redShow = false;//样例提示
    };


    $scope.selectedRule = '';
    $scope.selectedRules = [{id: 0, value: newRule}];
    $scope.engineer = {currentActivityId: 3};
    $scope.parseContent = 0;
    initParseContents();

    //最初有0层解析
    $scope.parseCounts = [];
    $scope.redShow = false;//样例提示

    //日志样例提示问题
    $scope.meChange = false;
    $scope.updated = -1;
    $scope.$watch('selectedRule', function (newValue, oldValue) {
      if (newR === true) {
        if ($scope.selectedRule === 0) {
          $scope.meChange = false;
        } else {
          $scope.meChange = true;
        }
      } else {
        if ($scope.updated < 1) {
          $scope.meChange = false;
        } else {
          if ($scope.selectedRule === 0) {
            $scope.meChange = false;
          } else {
            $scope.meChange = true;
          }

        }
        $scope.updated++;
      }
    });

    //监听日志样本的变化
    $scope.$watch('itemLog', function (newValue, oldValue) {
      $scope.parseContentsInit = [{id: 1, key: messageLog, value: $scope.itemLog}];
      domeButInit(0);//修改操作 第一层被修改 00001
      $scope.conversionErrmsg = '';
      if ($scope.parseCounts[0]) {
        $scope.parseCounts[0].key = messageLog;
      }
      if ($scope.meChange === true) {
        $scope.redShow = true;
      } else {
        $scope.redShow = false;//样例提示
      }
      if ($scope.itemLog === '') {
        $scope.redShow = false;//样例提示
      }
      $scope.meChange = false;
    });


    $scope.parseMethods = [];//解析方法

    //原始日志4种解析方法
    var parseMethodsOne = localsObj.parseMethodsOne;

    //解析
    $scope.dateArgs = [{
      'pattern': '',
      'condition': ''//前置条件
    }];
    //非原始日志有8种解析方法
    var parseMethodsMore = localsObj.parseMethodsMore;

    $scope.texts = [];//原始日志
    $scope.field = $scope.itemLog;
    $scope.results = {};//解析结果对象
    $scope.verifyRes = {};//验证结果对象
    $scope.success = 0;
    $scope.successes = [];


    //获取所有规则
    $scope.rulesNamesAndText = [];//获取所有规则的名称
    var selectedRulesFrom = [];
    var getRulesAndText = function () {
      selectedRulesFrom = [{id: 0, value: newRule}];
      $http.get(`/manager/rule/all?timestamp = ${new Date().getTime()}`).success(function (res) {
        res.map((obj, i) => {
          var p = selectedRulesFrom.push({id: i + 1, value: obj.ruleName, name: existingRules});
        });
        $scope.rulesNamesAndText = res;
      }).error(function (res, statu) {
        if (status === 502) {
          notify.error($translate.instant('获取规则模板失败：服务异常！'));
        } else {
          notify.error(res.errmsg);
        }
      });
      $scope.selectedRules = selectedRulesFrom;
    };
    getRulesAndText();


    //用于展示规则模板
    var revertRule = function (ruleName) {
      $scope.parseCounts = [];
      $scope.parseMethod = [];
      $scope.parseMethods = [];//解析方法
      $scope.analyticalMethodsErr = [];//修改方法
      $scope.analyMethods = [];//修改方法字段
      $scope.resultset = [];
      let countMe = 1;
      $scope.dateArgs = [];
      $scope.prefix = [];//前置条件
      $scope.dateArgs.ruleName = ruleName;
      $scope.rulesNamesAndText.map(objPre => {
        if (objPre.ruleName === ruleName) {
          $scope.itemLog = objPre.sampleLog;
          objPre.rules.map((obj, i) => {
            if (i === 0 && obj.type === 'multiline') {
              $scope.MultipleLinesLogs = 'yes';//多行日志默认为否
              $scope.Multiple.pattern = obj.pattern;//多行日志的参数
              $scope.negate = obj.negate === 1 ? 'yes' : 'no';//正则反转
              $scope.what = obj.what;//归属日志
              $scope.MultipleLinesLogShow = true;//多行转换配置不可见
              $scope.MultiplePatternErr = false;//多行转换正则匹配错误提示
              $scope.conversionSuc = 1;
              $scope.Multiple = {
                'type': 'multiline',
                'pattern': $scope.Multiple.pattern,
                'what': $scope.what,
                'negate': $scope.negate === 'no' ? 0 : 1,
                'field': 'message'
              };
            } else if (i === 0 && obj.type !== 'multiline') {
              initMultiple();

              $scope.parseCounts.push({id: objPre.id, key: obj.field, value: obj.text});//表格行数
              if (obj.field === 'message' || obj.field === messageLog) {
                $scope.parseMethods = $scope.parseMethods.concat(parseMethodsOne);
              } else {
                $scope.parseMethods = $scope.parseMethods.concat(parseMethodsMore);
              }
              $scope.analyticalMethodsErr.push('');
              //点击一次添加一个选择修改字段下拉框
              //$scope.resultset = $scope.resultset.concat({id: $scope.resultset.length + 1,analyMethods: $scope.analyMethods});

              dateArgSparseMethodInit(obj, $scope.prefix, $scope.parseMethod, $scope.dateArgs);

              $scope.analyMethods = $scope.analyMethods.concat([{id: 1, key: obj.field, value: obj.text}]);
              countMe++;
              $scope.resultset.push(obj.AvailFields);

            } else if (i !== 0) {

              $scope.resultset.push(obj.AvailFields);

              if ($scope.conversionSuc === 1 && i === 1) {
                $scope.conversionResultOne = obj.text;
              }

              if (!obj.field) {
                let parseCountsArr = [{mutate: 'Mutate'}];
                //点击一次增加一个列表元素

                $scope.parseCounts = $scope.parseCounts.concat(parseCountsArr);
                let analyMethodMe = tcpudpCom.getAnalyMethod(obj, $scope.analyMethods);
                $scope.analyticalMethodsErr.push(analyMethodMe.analyMethod);

                let condition;//前置条件
                if (!obj.condition) {
                  $scope.prefix.push('no');
                } else {
                  $scope.prefix.push('yes');
                  condition = obj.condition;//前置条件
                }
                let removes = [];
                let adds = [];
                let renames = [];
                if (analyMethodMe.analyMethod === 1) {//替换字段值
                  let analyMethod = tcpudpCom.getKeyId(analyMethodMe.mutateFields[0], objPre.rules[i - 1].AvailFields.analyMethods);
                  let fieldValue = analyMethodMe.mutateValues[0];
                  $scope.dateArgs.push({analyMethod: analyMethod, fieldValue: fieldValue, condition: condition});
                } else if (analyMethodMe.analyMethod === 2) {//删除
                  analyMethodMe.mutateFields.map((mutate, j) => {
                    let analyMethod = tcpudpCom.getKeyId(analyMethodMe.mutateFields[j], objPre.rules[i - 1].AvailFields.analyMethods);
                    let remove = {id: j + 1, analyMethod: analyMethod};
                    removes.push(remove);

                  });
                  $scope.dateArgs.push({removes: removes, condition: condition});

                } else if (analyMethodMe.analyMethod === 3) {//添加
                  analyMethodMe.mutateTypes.map((mutate, i) => {
                    let add = {
                      id: i + 1, fieldType: analyMethodMe.mutateTypes[i],
                      fieldName: analyMethodMe.mutateFields[i], fieldValue: analyMethodMe.mutateValues[i]
                    };
                    adds.push(add);

                  });
                  $scope.dateArgs.push({adds: adds, condition: condition});

                } else if (analyMethodMe.analyMethod === 4) {//重命名
                  analyMethodMe.mutateValues.map((mutate, j) => {
                    let analyMethod = tcpudpCom.getKeyId(analyMethodMe.mutateFields[j], objPre.rules[i - 1].AvailFields.analyMethods);
                    let rename = {
                      id: j + 1, analyMethod: analyMethod,
                      fieldValue: analyMethodMe.mutateValues[j]
                    };
                    renames.push(rename);
                  });
                  $scope.dateArgs.push({renames: renames, condition: condition});

                }

                //点击一次增加一个选择解析方法下拉框
                $scope.parseMethods = $scope.parseMethods.concat(parseMethodsMore);
                $scope.parseMethod.push('');

              } else {
                $scope.parseCounts.push({id: objPre.id, key: obj.field, value: obj.text});//表格行数
                if (obj.field === 'message' || obj.field === messageLog) {
                  $scope.parseMethods = $scope.parseMethods.concat(parseMethodsOne);
                } else {
                  $scope.parseMethods = $scope.parseMethods.concat(parseMethodsMore);
                }
                $scope.analyticalMethodsErr.push('');
                dateArgSparseMethodInit(obj, $scope.prefix, $scope.parseMethod, $scope.dateArgs);

                $scope.analyMethods = $scope.analyMethods.concat([{id: countMe, key: obj.field, value: obj.text}]);
                countMe++;
              }

            }

          });
          if (objPre.rules.length === 1 && objPre.rules[0].type === 'multiline') {
            $scope.addBotton = false;
            $scope.analysisContentsHead = true;
          }
        }
        ;
      });

    };


    //验证结果集
    $scope.resultset = [];

    //解析一条
    var analysisOne = function (arg, index) {
      $http.post('/manager/parse', arg).success(function (res) {
        let geos = tcpudpCom.getGeo($scope.rules);
        let arr = [];
        let arrC = [];
        let details = res.details;
        let results = res.results;
        if (results.message) {
          $scope.oneParseResults = false;//解析结果表单不出现
          $scope.conversionRes = true;
          delete results.message;
        }
        let success = details[details.length - 1].success;
        let successArr = [];//每一层解析的成功与否
        let errmsgArr = [];//每一层解析的错误信息
        let textArr = [];//每一层解析的解析文本
        for (let key in details) {
          if (details.hasOwnProperty(key)) {
            let suc = details[key].success;
            let err = getErrorCode(details[key].errmsg,'data');
            let text = details[key].text;
            successArr.push(suc);
            errmsgArr.push(err);
            textArr.push(text);
          }
          ;
        }
        ;
        $scope.successArr = successArr;
        $scope.errmsgArr = errmsgArr;
        $scope.textArr = textArr;
        //$scope.textAlls里面text值有误
        $scope.textAlls.map((obj, i)=> {
          obj.text = $scope.textArr[i];
        });
        if ($scope.MultipleLinesLogs === 'yes') {
          $scope.conversionSuccess = $scope.successArr.shift();
          $scope.conversionErrmsg = $scope.errmsgArr.shift();
          $scope.textArr.shift();
        }
        arr = tcpudpCom.sortObj(results);
        $scope.results = arr;
        //解析结果是否有geo解析的字段
        if (geos.length > 0) {
          let keys = [];
          for (let key in results) {
            if (results.hasOwnProperty(key)) {
              geos.map(obj => {
                let field = obj + '.';
                if (key.indexOf(field) === 0) {
                  keys.push(key);
                  delete results[key];
                }
              });
            }
          }
          arrC = tcpudpCom.sortObj(results);
          $scope.parseContents = $scope.parseContentsInit.concat(arrC);//把解析结果添加到选择解析内容

          $scope.analyMethods = $scope.parseContentsInit.concat(arrC);//修改方法
          $scope.analyMethods.shift();//删除原始日志

          $scope.resultset[index] = {id: index + 1, analyMethods: $scope.analyMethods};

        } else {
          $scope.parseContents = $scope.parseContentsInit.concat($scope.results);//把解析结果添加到选择解析内容

          $scope.analyMethods = $scope.parseContentsInit.concat($scope.results);//修改方法
          $scope.analyMethods.shift();//删除原始日志

          $scope.resultset[index] = {id: index + 1, analyMethods: $scope.analyMethods};

        }
        $scope.success = success;
        let successArrAllS = tcpudpCom.successArrAllSuc($scope.successArr);
        if ($scope.MultipleLinesLogs === 'yes' && successArrAllS === false) {
          $scope.oneParseResults = false;//解析结果表单不出现
          $scope.conversionRes = true;
        } else {
          $scope.oneParseResults = true;//解析结果表单出现
          $scope.conversionRes = false;
        }

        $scope.go = true;//应用成果：继续添加按钮的最初可用

        checkAllButWork();

        if ($scope.MultipleLinesLogs === 'yes' && $scope.conversionSuccess === 0) {
          $scope.results = [];
          $scope.successArr = [];
          $scope.textArr = [];
        }
        $scope.textArr.map((obj, i)=> {
          $scope.parseCounts[i].value = obj;
          if ($scope.dateArgs[i].timeZone) {
            selectedCstTime(i);
          }

        });

      }).error(function (res, status) {
        if (status === 502) {
          notify.error($translate.instant('解析失败：服务异常！'));
        } else {
          notify.error(res.errmsg);
        }

      });
    };
    //解析多条
    $scope.analysisLoading = false;
    var analysisAll = function (arg) {
      $scope.analysisLoading = true;
      $http.post('/manager/parse', arg).success(function (res) {
        let successes = [];
        for (let key in res) {
          if (res.hasOwnProperty(key)) {
            let success = res[key].success;
            successes.push({success: success});
          }
          ;
        }
        ;
        $scope.successes = successes;
        $scope.successesMap = $scope.successes.slice(sortStart, sortEnd);
        mapHits = [];
        noMapHits = [];
        for (var i = 0; i < successes.length; i++) {
          if (successes[i].success === 1) {
            mapHits.push($scope.allHits[i]);
          } else if (successes[i].success === 0) {
            noMapHits.push($scope.allHits[i]);
          }
        }
        getDataSetting();

        $scope.parseResults = true;//解析结果表单出现
        $scope.analysisLoading = false;

      }).error(function (res, status) {
        if (status === 502) {
          notify.error($translate.instant('解析失败：服务异常！'));
        } else {
          notify.error(res.errmsg);
        }

        $scope.analysisLoading = false;
      });
    };

    //监听partten的变化
    $scope.dateArgsChange = function (pattern, index) {
      domeButInit(index);//修改操作 第index层被修改 00001
    };

    $scope.row = 12;

    //验证按钮
    $scope.index;
    var verifyRules = function (index, removeFlag) {
      if (index < 0) {
        index = 0;
      }
      $scope.verifyRul = true;
      $scope.index = index;
      var rules = [];
      let text = [];
      let textAlls = [];
      text = getLog($scope.itemLog);
      for (let i = 0; i < index + 1; i++) {
        let parseCount = $scope.parseCounts[i];
        let rule;
        let textAll;
        if ($scope.prefix[i] === 'no') {
          rule = getRules($scope.itemLog, $scope.kv, $scope.dateArgs, $scope.analyMethods, $scope.resultset, index,
            $scope.parseMethod, $scope.analyticalMethodsErr, parseCount, i, 'no');
          textAll = getRules($scope.itemLog, $scope.kv, $scope.dateArgs, $scope.analyMethods, $scope.resultset, index,
            $scope.parseMethod, $scope.analyticalMethodsErr, parseCount, i, 'no',
            $scope.conversionSuccess, $scope.conversionResult, true);
        } else {
          rule = getRules($scope.itemLog, $scope.kv, $scope.dateArgs, $scope.analyMethods, $scope.resultset, index,
            $scope.parseMethod, $scope.analyticalMethodsErr, parseCount, i, 'yes');
          textAll = getRules($scope.itemLog, $scope.kv, $scope.dateArgs, $scope.analyMethods, $scope.resultset, index,
            $scope.parseMethod, $scope.analyticalMethodsErr, parseCount, i, 'yes',
            $scope.conversionSuccess, $scope.conversionResult, true);
        }

        if (rule === undefined) {
          return;
        } else {
          rules.push(rule[0]);
          textAlls.push(textAll[0]);
        }
      }
      ;
      if ($scope.MultipleLinesLogs === 'yes') {
        conversion(true);
        rules.unshift($scope.Multiple);
        textAlls.unshift($scope.Multiple);
      }
      $scope.rules = rules;
      $scope.textAlls = textAlls;
      //解析一条
      let arg = {
        'rules': rules,
        'resultFormat': 1,
        'needDetails': 1,
        'texts': text
      };


      analysisOne(arg, index);
      //判断完成按钮何时可以点击
      let successArrAllE = tcpudpCom.successArrAllErr($scope.successArr);
      if (successArrAllE === false && $scope.index === $scope.parseCounts.length - 1) {
        $scope.domeBut = true;
      } else {
        $scope.domeBut = false;
      }
      ;
    };

    $scope.verifyRules = verifyRules;


    $scope.$watch('results', function (newValue, oldValue) {
      //判断完成按钮何时可以点击
      if ($scope.successArr === undefined) {
        return;
      } else {

        let successArrAllE = tcpudpCom.successArrAllErr($scope.successArr);
        if (successArrAllE === false && $scope.index === $scope.parseCounts.length - 1) {
          $scope.domeBut = true;
        } else {
          if ($scope.parseCounts.length === 0 && $scope.conversionSuccess === 1) {
            $scope.domeBut = true;
          } else {
            $scope.domeBut = false;
          }

        }
        ;
      }

    });


    $scope.$watch('hits', function (newValue, oldValue) {
      //判断校验按钮何时可以点击，数据量很大的时候
      if (newR === true) {
        if ($scope.checkAllBut === false) {
          $scope.checkAllBut = false;
        }
      } else {
        checkAllButWork();
      }
    });

    $scope.$watch('successArr', function (newValue, oldValue) {
      //判断校验按钮何时可以点击，数据量很大的时候
      if ($scope.MultipleLinesLogs === 'yes') {
        if ($scope.successArr === undefined || $scope.successArr.length === 0 &&
          $scope.conversionSuccess === undefined || $scope.conversionSuccess === '') {
          $scope.checkAllBut = false;
        }
      } else {
        if ($scope.successArr === undefined || $scope.successArr.length === 0) {
          $scope.checkAllBut = false;
        }
      }

    });


    //校验按钮
    $scope.checkAll = function () {
      //解析多条
      //判断校验按钮何时可以点击
      if (tcpudpCom.isEmptyObject($scope.rules)) {
        return;
      } else {
        checkAllButWork();
        let texts = [];
        texts = getLogs($scope.allHits);
        let args = {
          'rules': $scope.rules,
          'resultFormat': 1,
          'needDetails': 0,
          'texts': texts
        };
        analysisAll(args);
      }
    };

    //删除按钮
    $scope.removeRules = function (index) {
      var verifyInd = $scope.index;
      //$scope.domeBut = false;//完成按钮不用
      var field = '.';
      if ($scope.parseCounts[index]) {
        field = $scope.parseCounts[index].key;
      }

      var str2 = field + '.';
      var len = $scope.parseCounts.length;
      var subFieldArr = [];//field的子类
      var fieldArr = [];//相同字段index数组
      //判断该字段是否为最后一个
      for (let i = 0; i < len; i++) {
        let str1;
        if ($scope.parseCounts[index]) {
          str1 = $scope.parseCounts[i].key;
        }
        if (str1 === field) {
          fieldArr.push(i);
        }
      }
      ;

      //判断该字段是否为最后一个
      if (index === fieldArr[-1]) {
        for (let i = 0; i < len; i++) {
          let str1 = $scope.results[i].key;
          let indexfir = tcpudpCom.indexDemo(str1, str2);
          if (indexfir === 0) {
            subFieldArr.push(str1);
          }
        }
        ;
        //结果表单删除不存在的字段
        for (let j = 0; j < subFieldArr.length; j++) {
          for (let i = 0; i < $scope.results.length; i++) {
            if ($scope.results[i].key === subFieldArr[j]) {
              let pp = $scope.results.splice(i, 1);
            }
          }
        }
      }
      $scope.parseCounts.splice(index, 1);//删除该列表
      if ($scope.errmsgArr) {
        $scope.errmsgArr.splice(index, 1);//删除错误
      }

      //AR-207 优化多个时间戳解析索引混乱问题
      let timestampYes = 0;
      if ($scope.dateArgs[index] && $scope.dateArgs[index].timestamp && $scope.dateArgs[index].timestamp === 'yes') {
        timestampYes = 1;
      }

      $scope.parseMethod.splice(index, 1);//删除该列表的解析方法
      $scope.parseContentsErr.splice(index, 1);//删除没有字段列表
      $scope.dateArgs.splice(index, 1);//删除该列表的解析方法下的表达式
      $scope.prefix.splice(index, 1);//删除该列表的前置条件表达式
      $scope.parseMethods.splice(index, 1);//删除该列表的解析方法
      console.log($scope.analyticalMethodsErr);
      $scope.analyticalMethodsErr.splice(index, 1);//删除该列表的修改方法
      $scope.resultset.splice(index, 1);//删除该列表的修改方法

      $scope.analysisContentsHead = false;//选择解析内容下拉框
      $scope.addBotton = true;//继续添加按钮可见

      $scope.domeBut = false;//完成按钮不用
      $scope.successArr = [];
      $scope.errmsgArr = [];
      $scope.textArr = [];
      $scope.conversionSuccess = '';

      if ($scope.parseCounts.length === 0) {
        initParseContents();
      }
      //AR-207 优化多个时间戳解析索引混乱问题
      if (timestampYes === 1) {
        for (let i = 0; i < $scope.dateArgs.length; i++) {
          if ($scope.dateArgs[i].timestamp) {
            $scope.dateArgs[i].timestamp = 'yes';
            break;
          }
        }
      }

    };

    //非法字符
    var charList = ['/', ':', '?', '\"', '<', '>', '|', '：', '？', '’', '“', '”', '《', '》', ',', '.', '，', '。', '{', '}'];
    $scope.illegalRuleName = false;
    $scope.illegalRuleNameMe;

    $scope.ruleNameChange = false;
    $scope.$watch('dateArgs.ruleName', function () {
      let charstr = '';
      if ($scope.dateArgs.ruleName) {
        charList.map(x => {
          if ($scope.dateArgs.ruleName.indexOf(x) > -1) {
            charstr = charstr + x;
          }
        });
      }
      if (charstr.length > 0) {
        $scope.illegalRuleName = true;//存在非法字符提示
        $scope.illegalRuleNameMe = charstr;
      } else {
        $scope.illegalRuleName = false;
        $scope.illegalRuleNameMe = '';
      }


      $scope.renameRule = false;
      let selectedRule = $scope.selectedRule;
      if ($scope.selectedRules[selectedRule]) {
        if ($scope.dateArgs.ruleName !== $scope.selectedRules[selectedRule].value) {
          $scope.ruleNameChange = true;//判断规则名称是否改变
          $scope.ok = true;
        } else {
          $scope.ruleNameChange = false;//判断规则名称是否改变
        }
        ;
      }
      if ($scope.dateArgs.ruleName !== undefined && $scope.dateArgs.ruleName !== '') {
        $scope.newRuleSetRuleName = false;
      }

    });

    //获取使用该规则名的端口
    var getPort = function (ruleName) {
      let ports;
      $http.get(`/etl/filter/${ruleName}/ports?timestamp = ${new Date().getTime()}`).success(function (res) {
        ports = res;
        $scope.ports = res;
        $scope.portsCopy = res;
      });
      return ports;
    };

    //判断完成使用的函数
    var domeFun = function (info) {
      let sampleLog = getLog($scope.itemLog);
      let selectedRule = $scope.selectedRule;
      let source = $scope.selectedRules[selectedRule].value;

      var arg = {
        'source': source,
        'sampleLog': sampleLog,
        'rules': $scope.textAlls,
        'status': 1,
        'ruleName': $scope.dateArgs.ruleName
      };
      if ($scope.ruleNameChange === true) {//规则名改变，新建规则
        $http.post('/manager/rule', arg).success(function (res, status) {
          if (status === 200) {
            locals.set('ruleName', $scope.dateArgs.ruleName);
            locals.setObject('TcpArg', TcpArg);
            notify.info($translate.instant('添加规则成功！'));
            if (uplodeType === 'agent') {
              $location.path('/data/agentUpload/newAgent');
            } else {
              $location.path('/data/tcpUdp/newTcpUdp');
            }
          } else {
            var message = getErrorCode(res.code,'data');
            notify.error(`${$translate.instant(message)}`);
          }

        }).error(function (res, status) {
          if (status === 502) {
            notify.error($translate.instant('操作失败：服务异常！'));
          } else {
            notify.error(res.errmsg);
          }
        });
      } else {//规则名不变
        let ruleName = $scope.dateArgs.ruleName;
        let arr2;
        let arr1 = $scope.rules;
        var ruleArr;
        let ruleNameUrl = encodeURIComponent(ruleName);
        $http.get(`/manager/rule/${ruleNameUrl}?timestamp = ${new Date().getTime()}`).success(function (res, status) {
          if (status === 200) {
            arr2 = res.rules;
            arr2.map(obj => {
              if (obj.text) {
                delete obj.text;
              }
              ;
              if (obj.AvailFields) {
                delete obj.AvailFields;
              }
              ;
            });
            arr1.map(obj => {
              if (obj.hasOwnProperty('text')) {
                delete obj.text;
              }
              if (obj.hasOwnProperty('AvailFields')) {
                delete obj.AvailFields;
              }

            });
            if (sampleLog !== res.sampleLog) {
              ruleArr = false;
            } else {
              ruleArr = tcpudpCom.cmp(arr1, arr2);
            }


            if (ruleArr === true) {//如果规则不变，什么都不做
              locals.set('ruleName', $scope.dateArgs.ruleName);
              locals.setObject('TcpArg', TcpArg);
              notify.info($translate.instant('应用规则成功！'));
              if (uplodeType === 'agent') {
                $location.path('/data/agentUpload/newAgent');
              } else {
                $location.path('/data/tcpUdp/newTcpUdp');
              }
            } else {//如果规则改变，提示修改规则名称
              $scope.renameRule = true;
              notify.error(info);
            }
          } else {
            let message = getErrorCode(res.code,'data');
            notify.error(`${$translate.instant(message)}`);
          }

        }).error(function (res, status) {
          if (status === 502) {
            notify.error($translate.instant('操作失败：服务异常！'));
          } else {
            notify.error(res.errmsg);
          }

        });

      }
    };
    //完成按钮
    $scope.dome = function () {
      if ($scope.dateArgs.ruleName === undefined || $scope.dateArgs.ruleName === '') {
        $scope.newRuleSetRuleName = true;
        notify.error($translate.instant('规则名称不能为空！'));
      } else {
        let sampleLog = getLog($scope.itemLog);
        let selectedRule = $scope.selectedRule;
        let source = $scope.selectedRules[selectedRule].value;
        $scope.textAlls.map((obj, i) => {
          $scope.textAlls[i].AvailFields = $scope.resultset[i];
        });
        var arg = {
          'source': source,
          'sampleLog': sampleLog,
          'rules': $scope.textAlls,
          'status': 1,
          'ruleName': $scope.dateArgs.ruleName
        };
        if ($scope.ports) {//修改规则入口
          if ((ruleNameOld === ruleName && $scope.ports.length < 2) || (ruleNameOld !== ruleName && $scope.ports.length < 1)) {//如果使用该规则名的端口唯一，修改规则
            $http.put(`/manager/rule/${ruleName}`, arg).success(function (res, status) {
              if (status === 200) {
                locals.set('ruleName', $scope.dateArgs.ruleName);
                locals.setObject('TcpArg', TcpArg);
                notify.info($translate.instant('修改规则成功！'));
                if (uplodeType === 'agent') {
                  $location.path('/data/agentUpload/newAgent');
                } else {
                  $location.path('/data/tcpUdp/newTcpUdp');
                }
              } else {
                let message = getErrorCode(res.code,'data');
                notify.error(`${$translate.instant(message)}`);
              }

            }).error(function (res, status) {
              if (status === 502) {
                notify.error($translate.instant('修改规则失败：服务异常！'));
              } else {
                notify.error(`${$translate.instant('修改规则失败')}:${res.errmsg}！`);
              }
            });
          } else {//如果使用该规则名的端口不唯一
            let info = $translate.instant('规则内容已修改且有其他端口绑定，请重新设置唯一规则名称');
            $scope.info = info;
            domeFun(info);
          }

        } else {//新建规则入口
          let info = $translate.instant('模版为内置模板，请勿修改！');
          $scope.info = info;
          domeFun(info);
        }
      }

    };

    //返回按钮
    $scope.BackTo = function () {
      locals.setObject('TcpArg', TcpArg);
      if (uplodeType === 'agent') {
        $location.path('/data/agentUpload/newAgent');
      } else {
        $location.path('/data/tcpUdp/newTcpUdp');
      }

    };

    //监听规则来源下拉框
    $scope.selectedRuleShow = false;
    var selectedRuleChange = function (selectedRule) {
      if (selectedRule !== 0) {
        getPort($scope.selectedRules[selectedRule].value);
      } else {
        $scope.ports = undefined;
      }

      $scope.selectedRule = selectedRule;
      $scope.selectedRuleShow = true;
      $scope.checkAllBut = false;
      $scope.parseMethod = [];
      $scope.parseResults = false;
      $scope.successArr = [];//單層解析的結果
      $scope.errmsgArr = [];//單層错误解析的結果
      $scope.successes = [];//多層解析的結果
      $scope.successesMap = [];
      $scope.results = [];
      $scope.textArr = [];
      $scope.index = -1;
      /*
       多行日志开始
       */
      $scope.conversionResult = [];//多層解析的結果
      $scope.conversionSuccess = '';//多層解析的結果
      $scope.MultipleLinesLogs = 'no';//多行日志默认为否
      $scope.Multiple = {};//多行日志的参数
      $scope.negate = 'no';//正则反转
      //$scope.whats = [{id: 'previous', value: '前一条日志'}, {id: 'next', value: '后一条日志'}];//negates下拉框
      $scope.whats = localsObj.whats;//negates下拉框
      $scope.what = 'previous';//previous前一条日志
      $scope.MultipleLinesLogShow = false;//多行转换配置不可见
      $scope.MultiplePatternErr = false;//多行转换正则匹配错误提示
      /*
       多行日志结束
       */
      $scope.conversionSuc = '';
      initParseContents();
      if (selectedRule === 0) {//新建规则
        $scope.parseCounts = [];
        $scope.dateArgs = [];
        $scope.prefix = [];//前置条件
        $scope.analyticalMethodsErr = [];//修改方法

        $scope.addBotton = false;//继续添加按钮
        $scope.analysisContentsHead = true;//选择解析内容下拉框
        if ($scope.redShow || $scope.verifyRul) {
          $scope.itemLog = '';
        }
      } else {//已有规则模板
        ruleName = $scope.selectedRules[selectedRule].value;
        $scope.addBotton = true;//继续添加按钮
        $scope.analysisContentsHead = false;//选择解析内容下拉框
        $scope.redShow = true;//样例提示
        $scope.ok = false;//使用模板灰化不可用
        revertRule(ruleName);
      }
    };

    $scope.selectedRuleChange = selectedRuleChange;

    var ifNewR = function () {
      if (newR === true) {
        //最初有0层解析
        $scope.parseCounts = [];
        $scope.domeBut = false;//完成按钮不可用
      } else {
        $scope.selectedRuleShow = true;
        let ports = getPort(ruleName);
        let thisRule;
        $http.get(`/manager/rule/${ruleName}?timestamp = ${new Date().getTime()}`)
          .success(function (res, status) {
            thisRule = res.rules;
            selectedRulesFrom.map(obj => {
              if (obj.value === ruleName) {
                $scope.selectedRule = obj.id;
              }
            });
            $scope.addBotton = true;//继续添加按钮
            $scope.analysisContentsHead = false;//选择解析内容下拉框
            $scope.domeBut = true;//完成按钮
            $scope.successArr = [];
            $scope.ok = false;
            revertRule(ruleName);
            if (thisRule.length === 1 && thisRule[0].type === 'multiline') {
              conversion();
            } else {
              if ($scope.MultipleLinesLogs === 'yes') {
                verifyRules(res.rules.length - 2);
              } else {
                verifyRules(res.rules.length - 1);
              }
              // verifyRules(res.rules.length - 1);
            }

          }).error(function (res, status,) {
            if (status === 502) {
              notify.error(`${$translate.instant('获取')}${ruleName}${$translate.instant('失败：服务异常！')}`);
            } else {
              notify.error(res.errmsg);
            }

          });
      }
    };

    // ifNewR();


    $scope.$watch('rulesNamesAndText', function () {
      ifNewR();
    });

    //多行日记
    $scope.$watch('parseCounts.length', function () {
      if ($scope.parseCounts.length === 0) {
        $scope.analysisContentsHead = true;//选择解析内容下拉框
        $scope.addBotton = false;//继续添加按钮可见
      }
      if ($scope.MultipleLinesLogs === 'no' && $scope.parseCounts.length === 0) {
        $scope.results = [];//验证结果清空
      }
    });
    $scope.$watch('conversionRes', function () {
      if ($scope.parseCounts.length === 0 && $scope.conversionSuccess === 1) {
        $scope.domeBut = true;
      }
    });
    $scope.$watch('conversionSuccess', function () {
      if ($scope.parseCounts.length === 0 && $scope.conversionSuccess === 1) {
        $scope.domeBut = true;
      }
    });
    //多行解析


    //监听选择解析内容的变化
    $scope.parseContentChange = function (parseContent) {
      if (parseContent === null) {
        $scope.addBotton = false;
        $scope.analysisContentsHead = true;
      } else {
        $scope.domeBut = false;//完成按钮不用
        $scope.addBotton = true;
        $scope.analysisContentsHead = false;
      }
      $scope.successArr = [];
      $scope.conversionSuccess = '';
      var parseCountsArr = [];
      parseCountsArr.push($scope.parseContents[parseContent - 1]);
      //点击一次增加一个列表元素
      $scope.parseCounts = $scope.parseCounts.concat(parseCountsArr);
      //点击一次增加一个选择解析方法下拉框
      if (parseContent === 1) {
        $scope.parseMethods = $scope.parseMethods.concat(parseMethodsOne);
      } else {
        $scope.parseMethods = $scope.parseMethods.concat(parseMethodsMore);
      }
      //点击一次增加一个前置条件的默认值
      $scope.prefix.push('no');//前置条件
      //点击一次增加一个选择修改方法下拉框
      $scope.analyticalMethodsErr.push('');
      //点击一次添加一个选择修改字段下拉框
      $scope.resultset.push({id: $scope.resultset.length + 1, analyMethods: $scope.analyMethods});

      $scope.parseContent = 0;
      $scope.successArr = [];
      $scope.conversionSuccess = '';

    };


    /*
     新增修改解析方法
     */
    $scope.analyticalMethodsErr = [];
    //监听选择修改方法的变化
    $scope.analyticalMethodChange = function (analyticalMethod) {
      if (analyticalMethod === null) {
        $scope.addBotton = false;
        //$scope.analysisContentsHead = true;
        $scope.analyticalMethodsHead = true;//修改字段的解析方式不可见
      } else {
        $scope.domeBut = false;//完成按钮不用
        $scope.addBotton = true;
        //$scope.analysisContentsHead = false;
        $scope.analyticalMethodsHead = false;//修改字段的解析方式不可见
      }
      $scope.successArr = [];
      $scope.conversionSuccess = '';
      let parseCountsArr = [{mutate: 'Mutate'}];
      //点击一次增加一个列表元素
      $scope.parseCounts = $scope.parseCounts.concat(parseCountsArr);
      //点击一次增加一个前置条件的默认值
      $scope.prefix.push('no');//前置条件
      //点击一次增加一个选择修改方法下拉框
      $scope.analyticalMethodsErr.push(analyticalMethod);
      //点击一次增加一个选择解析方法下拉框
      $scope.parseMethods = $scope.parseMethods.concat(parseMethodsMore);

      //点击一次添加一个选择修改字段下拉框
      $scope.resultset.push({id: $scope.resultset.length + 1, analyMethods: $scope.analyMethods});

      $scope.analyticalMethod = 0;
      $scope.successArr = [];
      $scope.conversionSuccess = '';

      if (analyticalMethod === 2) {
        $scope.removes = [{id: 1}];
        $scope.dateArgs[$scope.index + 1] = {};
        $scope.dateArgs[$scope.index + 1].removes = [{id: 1}];
      } else if (analyticalMethod === 3) {
        $scope.adds = [{id: 1}];
        $scope.dateArgs[$scope.index + 1] = {};
        $scope.dateArgs[$scope.index + 1].adds = [{id: 1}];
      } else if (analyticalMethod === 4) {
        $scope.renames = [{id: 1}];
        $scope.dateArgs[$scope.index + 1] = {};
        $scope.dateArgs[$scope.index + 1].renames = [{id: 1}];
      }

    };

    //监听错误字段选择解析内容的变化
    $scope.parseContentsErr = [];
    $scope.parseContentErrChange = function (parseContentErr, index) {
      $scope.parseContentsErr[index] = parseContentErr;
      let parseCountsArr = [];
      parseCountsArr.push($scope.parseContents[parseContentErr - 1]);
      $scope.parseCounts[index] = parseCountsArr[0];
      if (parseContentErr === 1) {
        $scope.parseMethods[index] = parseMethodsOne[0];
      }
    };

    //监听选择时区
    $scope.defaultZoneChange = function (timeZone, index) {
      domeButInit();
    };


    //监听选择解析方法
    $scope.parseMethod = [];
    $scope.selectedparseMethod = function (parseMethod, index) {
      $scope.parseMethod[index] = parseMethod;//解析方法
      domeButInit(index);//修改操作 第index层被修改 00001
      if (!$scope.dateArgs[index]) {
        $scope.dateArgs[index] = {};//解析表达式
      } else {
        $scope.dateArgs[index].pattern = '';
      }
      if (parseMethod === 9) {
        $scope.dateArgs[index].pattern = 'cn';
      }
      if (parseMethod === 6) {
        selectedCstTime(index);
        //AR-207 优化多个时间戳解析索引混乱问题
        //2017.3.16
        $scope.dateArgs[index].timestamp = 'no';
        let num = timestampOne();
        if (num === 1) {
          $scope.dateArgs[index].timestamp = 'yes';
        }


      }
    };

    //监听选择修改方法
    $scope.selectedAnalyticalMethods = function (analyticalMethodsErr, index) {
      domeButInit(index);//修改操作 第index层被修改 00001

      if (!$scope.dateArgs[index]) {
        $scope.dateArgs[index] = {};//解析表达式
      } else {
        $scope.dateArgs[index].pattern = '';
        $scope.dateArgs[index].analyMethod = '';
        $scope.dateArgs[index].fieldValue = '';
      }
      if (analyticalMethodsErr === 1) {
        $scope.dateArgs[index].removes = '';
        $scope.dateArgs[index].adds = '';
        $scope.dateArgs[index].renames = '';
      } else if (analyticalMethodsErr === 2) {
        $scope.dateArgs[index].removes = [{id: 1}];
        $scope.dateArgs[index].adds = '';
        $scope.dateArgs[index].renames = '';
      } else if (analyticalMethodsErr === 3) {
        $scope.dateArgs[index].adds = [{id: 1}];
        $scope.dateArgs[index].removes = '';
        $scope.dateArgs[index].renames = '';
      } else if (analyticalMethodsErr === 4) {
        $scope.dateArgs[index].renames = [{id: 1}];
        $scope.dateArgs[index].removes = '';
        $scope.dateArgs[index].adds = '';
      }

    };

    //监听选择修改字段的变化
    $scope.analyMethodChange = function (analyMethod, index) {
      domeButInit(index);//修改操作 第index层被修改 00001

    };

    $scope.toggleLegend = function () {
      var bwcAddLegend = $scope.renderbot.vislibVis._attr.addLegend;
      var bwcLegendStateDefault = bwcAddLegend == null ? true : bwcAddLegend;
      $scope.open = !$scope.uiState.get('vis.legendOpen', bwcLegendStateDefault);
      $scope.uiState.set('vis.legendOpen', $scope.open);
    };

    $scope.jump = function (url) {
      $location.path(url);
    };

    //继续添加按钮
    //解析层数
    $scope.continueAdd = function () {
      $scope.addBotton = false;
      $scope.analysisContentsHead = true;//解析内容可见
      $scope.analyticalMethodsHead = false;//修改字段的解析方式不可见
    };

    //修改字段的解析方法
    $scope.analyticalMethods = localsObj.analyticalMethods;
    //修改字段按钮
    //解析层数
    $scope.modifyField = function () {
      $scope.addBotton = false;
      $scope.analysisContentsHead = false;//解析内容不可见
      $scope.analyticalMethodsHead = true;//修改字段的解析方式可见
    };

    //选择显示日志方式 默认显示全部
    $scope.show = true;
    $scope.showme = undefined;
    //1.显示全部
    $scope.allLog = function () {
      $scope.pageData.settingConf.currentPage = 1;
      $scope.show = true;
      $scope.showme = 2;
      $scope.pageData.settingConf.totalItems = $scope.successes.length;

      $scope.hits = $scope.allHits.slice(sortStart, sortEnd);
      $scope.successesMap = $scope.successes.slice(sortStart, sortEnd);

    };
    //2.显示匹配样例
    $scope.matchLog = function () {
      $scope.pageData.settingConf.currentPage = 1;
      $scope.show = false;
      $scope.showme = 1;
      var matchLog = [];
      $scope.successes.map(obj => {
        if (obj.success === 1) {
          matchLog.push(obj);
        }
      });
      $scope.pageData.settingConf.totalItems = matchLog.length;
      $scope.matchHits = mapHits.slice(sortStart, sortEnd);

    };
    //3.显示不匹配样例
    $scope.noMatchLog = function () {
      $scope.pageData.settingConf.currentPage = 1;
      $scope.show = false;
      $scope.showme = 0;
      var noMatchLog = [];
      $scope.successes.map(obj => {
        if (obj.success === 0) {
          noMatchLog.push(obj);
        }
      });
      $scope.pageData.settingConf.totalItems = noMatchLog.length;
      $scope.noMatchHits = noMapHits.slice(sortStart, sortEnd);

    };
    //右侧列表的显示问题
    $scope.$watch('parseResults+oneParseResults', function () {
      if ($scope.parseResults || $scope.oneParseResults || $scope.conversionRes) {
        $scope.row = 9;
        $scope.myContainer = 'side-bar-show';
        $scope.myBtn = 'marLeft';
      } else {
        // $scope.row = 12;
        $scope.myContainer = 'con-pading';
      }
    });


  });
