define(function (require) {
  const _ = require('lodash');

  //比较两个对象所包涵的数据是否相等（数组）。
  var cmpMe = function (a, b) {
    // If both x and y are null or undefined and exactly the same
    if (a === b) {
      return true;
    }

    // If they are not strictly equal, they both need to be Objects
    if (!(a instanceof Object) || !(b instanceof Object)) {
      return false;
    }

    // Of course, we can do it use for in
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length !== bProps.length) {
      return false;
    }

    for (var i = 0; i < aProps.length; i++) {
      var propName = aProps[i];
      if (a[propName] instanceof Object) {
        if (b[propName] instanceof Object) {
          cmpMe(a[propName],b[propName]);
        } else {
          return false;
        }
      } else if (a[propName] instanceof Array) {
        if (b[propName] instanceof Array) {
          if (a[propName].join(',') !== b[propName].join(',')) {
            return false;
          }
        }
      } else {
        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName]) {
          return false;
        }
      }

      // if (typeof a[propName] === 'object') {
      //   //a[propName].json(',')
      //   if (a[propName].join(',') !== b[propName].join(',')) {
      //     return false;
      //   }
      //   //cmpMe(a[propName],b[propName]);
      // } else {
      //   // If values of same property are not equal,
      //   // objects are not equivalent
      //   if (a[propName] !== b[propName]) {
      //     return false;
      //   }
      // }


    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
  };

  var cmp = function (arr1, arr2) {
    let len1 = arr1.length;
    let len2 = arr2.length;
    let p;
    if (len1 === len2) {
      for (let i = 0; i < len1; i++) {
        p = cmpMe(arr1[i],arr2[i]);
        if (p === false) {
          break;
        }
      }
      return p;
    } else {
      return false;
    }
  };

  //获取每一列的解析方法
  var getParseMethod = function (obj) {
    //获取每一列的解析方法
    let parseMethod;
    //获取每一列的解析方法对应的表达式
    let pattern;
    //获取每一列的解析方法对应的tzinfo
    let timeZone;
    //获取每一列的解析方法对应的language
    let language;
    //获取前置条件表达式
    let condition;
    //获取每一列的解析方法对应的timestamp
    let timestamp;
    let type;
    let pattern1;
    let pattern2;
    if (obj.type) {type = obj.type;}
    if (obj.pattern) {pattern1 = obj.pattern;}//正则解析
    if (obj.dataType) {pattern1 = obj.dataType;}//数值转换解析
    if (obj.dateFormat) {pattern1 = obj.dateFormat.join(';');}//时间解析
    if (obj.tzinfo) {timeZone = obj.tzinfo;}//时间解析
    if (obj.language) {language = obj.language;}//时间解析
    if (obj.fieldSplit) {pattern1 = obj.fieldSplit;}//KV解析
    if (obj.valueSplit) {pattern2 = obj.valueSplit;}//KV解析
    if (type && type === 'userAgent' && obj.language) {pattern1 = obj.language;}//userAgent
    if (obj.condition) {condition = obj.condition;}//前置条件表达式
    if (obj.hasOwnProperty('is_index')) {timestamp = obj.is_index;}//timestamp
    switch (type) {
      case 'json':
        parseMethod = 1;
        pattern = '';
        break;
      case 'grok':
        parseMethod = 2;
        pattern = pattern1;
        break;
      case 'url':
        parseMethod = 3;
        pattern = '';
        break;
      case 'str2num':
        parseMethod = 4;
        pattern = pattern1;
        break;
      case 'geo':
        parseMethod = 5;
        pattern = '';
        break;
      case 'date':
        parseMethod = 6;
        pattern = pattern1;
        break;
      case 'syslogPri':
        parseMethod = 7;
        pattern = '';
        break;
      case 'kv':
        parseMethod = 8;
        pattern = [];
        pattern.push(pattern1,pattern2);
        break;
      case 'userAgent':
        parseMethod = 9;
        pattern = pattern1;
        break;
      default:
        break;
    };
    return {parseMethod :parseMethod,pattern:pattern,timeZone:timeZone,language:language,condition:condition,timestamp:timestamp};
  };

  //判断日志样例改变的

  var valueChange = function (arr1,arr2,min) {
    if (arr1.length > 0) {
      for (let i = min + 1; i < arr1.length; i++) {
        for (let key in arr1[i]) {
          if (arr1[i].hasOwnProperty(key)) {
            if (key === 'key') {
              for (let j = 0; j < arr2.length; j++) {
                for (let key in arr2[j]) {
                  if (arr2[j].hasOwnProperty(key)) {
                    if (key === 'key') {
                      if (arr1[i][key] === arr2[j][key]) {
                        arr1[i] = arr2[j];
                      }
                    }
                  }
                };
              }
            }
          }
        };
      }
    };
  };

  //获取进行geo解析的字段的数组
  var getGeo = function (arr) {
    let geos = [];
    arr.map(obj => {
      if (obj.type === 'geo') {
        geos.push(obj.field);
      }
    });
    return geos;
  };

  //对解析结果进行排序
  var sortObj = function (results) {
    let arr = [];
    for (let key in results) {
      if (results.hasOwnProperty(key)) {
        let value = results[key];
        let type = typeof value;
        if (type === 'number') {
          type = parseInt(value) === value ? 'int' : 'float';
          //type = type.toString.indexOf('.') > -1 ? 'float' : 'int';
        };
        arr.push({key: key, value: results[key], type: type});
      };
    };
    arr.sort(function (a, b) {
      var nameA = a.key.toUpperCase(); // ignore upper and lowercase
      var nameB = b.key.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      // names must be equal
      return 0;
    });
    arr.map((obj,i) =>{
      let idO = {id : i + 2};
      arr[i] = Object.assign(idO, obj);
    });
    return arr;
  };

  //输入框过滤换行符
  var wrap = function (str) {
    return str.replace(/[\r\n]/g, '');
  };

  //获取日志样例
  var getLog = function (itemLog) {
    let text = itemLog;
    return text;
  };

  //获取日志样表的所有数据
  var getLogs = function (allHits) {
    let texts = [];
    for (let key in allHits) {
      if (allHits.hasOwnProperty(key)) {
        let value = allHits[key]._source.message;
        texts.push(value);
      };
    };
    return texts;
  };

  var getConversionResult = function (conversionResult) {
    return conversionResult;
  };

  //有value获取ID
  var getId = function (arr,value) {
    let id = [];
    arr.map(obj => {
      value.map(val => {
        if (obj.key === val) {
          id.push(obj.id);
        }
      });
    });
    return id;
  };
  //有key获取ID
  var getKeyId = function (key,arr) {
    let id;
    arr.map(obj =>{
      if (obj.key === key) {
        id = obj.id;
      }
    });
    return id;
  };
  //有type获取ID
  var getTypeId = function (arr) {
    let id = [];
    arr.map(obj => {
      if (obj === 'string') {
        id.push(1);
      } else if (obj === 'int') {
        id.push(2);
      } else if (obj === 'float') {
        id.push(3);
      }
    });
    return id;
  };
  //修改方法获取ID
  var getAnalyMethod = function (obj) {
    let method;
    let type = obj.obj;
    let analyMethod;
    let mutateFields;
    let mutateValues;
    let mutateTypes;
    let AvailFields;
    if (obj.method) {method = obj.method;}
    switch (method) {
      case 'replace':
        analyMethod = 1;
        mutateFields = obj.mutate_fields;
        mutateValues = obj.mutate_values;
        break;
      case 'remove_field':
        analyMethod = 2;
        mutateFields = obj.remove_fields;
        AvailFields = obj.AvailFields;
        break;
      case 'add_field':
        analyMethod = 3;
        mutateFields = obj.mutate_fields;
        mutateValues = obj.mutate_values;
        mutateTypes = getTypeId(obj.mutate_types);
        break;
      case 'rename':
        analyMethod = 4;
        mutateFields = obj.mutate_fields;
        mutateValues = obj.mutate_names;
        break;
      default:
        break;
    };
    return {analyMethod :analyMethod,type:type,mutateFields:mutateFields,
      mutateValues:mutateValues,mutateTypes:mutateTypes,AvailFields: AvailFields};

  };

  //有ID获取value
  var getValue = function (arr,id) {
    let value;
    arr.map(obj => {
      if (obj.id === id) {
        value = obj.key;
      }
    });
    return value;
  };

  //有ID获取Type
  var getType = function (arr) {
    let type = [];
    arr.map(obj => {
      if (obj === 1) {
        type.push('string');
      } else if (obj === 2) {
        type.push('int');
      } else if (obj === 3) {
        type.push('float');
      }
    });

    return type;
  };

  //获取删除字段的数组
  var getRemoveArr = function (sremoves,analyMethods) {
    let removesRrr = [];
    sremoves.map(obj => {
      if (obj.analyMethod && typeof (obj.analyMethod) === 'number') {
        removesRrr.push(getValue(analyMethods,obj.analyMethod));
      } else {
        removesRrr.push(obj.analyMethod);
      }

    });
    return removesRrr;
  };
  //获取添加字段的数组
  var getAddArr = function (sadds) {
    let addObj = {};
    addObj.fieldType = [];//字段类型
    addObj.fieldName = [];//字段名
    addObj.fieldValue = [];//字段值
    sadds.map(obj => {
      addObj.fieldType.push(obj.fieldType);
      addObj.fieldName.push(obj.fieldName);
      addObj.fieldValue.push(obj.fieldValue);
    });
    return addObj;
  };

  //获取重命名字段的数组
  var getRenameArr = function (srenames,analyMethods) {
    let addObj = {};
    addObj.fieldName = [];//字段名
    addObj.fieldValue = [];//字段值
    srenames.map(obj => {
      addObj.fieldName.push(getValue(analyMethods,obj.analyMethod));
      addObj.fieldValue.push(obj.fieldValue);
    });
    return addObj;
  };

  //获取每一列的规则
  var getRules = function (itemLog, kv, dateArgs,analyMethods,resultset,indexMe, parseMethod,analyticalMethodsErr,
    parseCount, index,prefix,conversionSuccess, conversionResult, needTexts) {

    let rules;
    let field;
    let text;
    let condition;//前置条件
    let removesRrr;//删除字段
    let addsRrr;//添加字段
    let renamesRrr;//重命名字段
    let fieldType;//添加字段
    let fieldValue;
    let fieldName;

    if (dateArgs[index] && dateArgs[index].analyMethod) {//替换字段值
      if (index > 0) {
        fieldName = getValue(resultset[index - 1].analyMethods,dateArgs[index].analyMethod);
      }

      if (typeof (fieldName) === 'object') {
        fieldName = fieldName[0];
      }
      fieldValue = dateArgs[index].fieldValue;//替换字段值
      if (typeof (fieldValue) === 'object') {
        fieldValue = fieldValue[0];
      }
    }

    if (dateArgs[index] && dateArgs[index].removes) {//删除字段
      if (index > 0) {
        removesRrr = getRemoveArr(dateArgs[index].removes,resultset[index - 1].analyMethods);
      }


    }
    if (dateArgs[index] && dateArgs[index].adds) {//添加字段
      addsRrr = getAddArr(dateArgs[index].adds);
      fieldType = getType(addsRrr.fieldType);
      fieldName = addsRrr.fieldName;
      fieldValue = addsRrr.fieldValue;
    };
    if (dateArgs[index] && dateArgs[index].renames) {//重命名字段
      if (index > 0) {
        renamesRrr = getRenameArr(dateArgs[index].renames,resultset[index - 1].analyMethods);
      }

      fieldName = renamesRrr.fieldName;
      fieldValue = renamesRrr.fieldValue;
    };





    for (let key in parseCount) {
      if (parseCount.hasOwnProperty(key)) {
        if (parseCount.key === '原始日志') {
          field = 'message';
          if (conversionSuccess) {
            if (conversionSuccess === 1) {
              text = getConversionResult(conversionResult[0]);
            } else {
              text = getLog(itemLog);
            }
          }


        } else {
          field = parseCount.key;
          if (needTexts) {
            text = parseCount.value;
          }
        };
      }
    }

    if (!dateArgs[index]) {
      dateArgs[index] = {'pattern': ''};
    };
    let pattern = dateArgs[index].pattern;//表达式
    let timeZone = dateArgs[index].timeZone;//时区
    let language = dateArgs[index].language || 'zh';//时区
    let timestamp = dateArgs[index].timestamp;//时间解析戳
    if (timestamp === 'no') {
      timestamp = 0;
    } else if (timestamp === 'yes') {
      timestamp = 1;
    }



    if (analyticalMethodsErr[index] === '' || analyticalMethodsErr[index] === undefined) {
      switch (parseMethod[index]) {
        case 1:
          rules = [
            {
              'field': field,
              'type': 'json',
            },
          ];
          break;
        case 2:
          if (pattern) {
            pattern = wrap(pattern);
          }
          rules = [
            {
              'field': field,
              'type': 'grok',
              'pattern': pattern
            }
          ];
          break;
        case 3:
          rules = [
            {
              'field': field,
              'type': 'url',
            },
          ];
          break;
        case 4:
          rules = [
            {
              'field': field,
              'type': 'str2num',
              'dataType': pattern
            },
          ];
          break;
        case 5:
          rules = [
            {
              'field': field,
              'type': 'geo',
            },
          ];
          break;
        case 6:
          if (pattern) {
            pattern = wrap(pattern);
          }
          let dateFormat;
          if (pattern) {
            dateFormat = pattern.split(';');
          };
          rules = [
            {
              'field': field,
              'type': 'date',
              'dateFormat': dateFormat,
              'tzinfo': timeZone,
              'language': language,
              'is_index': timestamp
            },
          ];
          break;
        case 7:
          rules = [
            {
              'field': field,
              'type': 'syslogPri',
            },
          ];
          break;
        case 8:
          let fieldSplit;
          let valueSplit;
          if (pattern) {
            fieldSplit = !pattern[0] ? ' ' : pattern[0];
            valueSplit = !pattern[1] ? kv : pattern[1];
          }
          rules = [
            {
              'field': field,
              'type': 'kv',
              'fieldSplit': fieldSplit,
              'valueSplit': valueSplit
            },
          ];
          break;
        case 9:
          rules = [
            {
              'field': field,
              'type': 'userAgent',
              'language': pattern
            },
          ];
          break;
        default:
          rules = [
            {
              'field': field,
              'type': '',
            },
          ];
          break;
      };
    } else {
      switch (analyticalMethodsErr[index]) {
        case 1:
          rules = [
            {
              'method': 'replace',
              'type': 'mutate',
              'mutate_fields': [fieldName],
              'mutate_values': [fieldValue]
            },
          ];
          break;
        case 2:
          rules = [
            {
              'method': 'remove_field',
              'type': 'mutate',
              'remove_fields': removesRrr,
            }
          ];
          break;
        case 3:
          rules = [
            {
              'method': 'add_field',
              'type': 'mutate',
              'mutate_fields': fieldName,
              'mutate_values': fieldValue,
              'mutate_types': fieldType
            }
          ];
          break;
        case 4:
          rules = [
            {
              'method': 'rename',
              'type': 'mutate',
              'mutate_fields': fieldName,
              'mutate_names': fieldValue
            }
          ];
          break;
        default:
          break;
      };
    }


    if (needTexts) {
      if (rules) {
        rules[0].text = itemLog;
        // rules[0].text = text;
      }
    }
    if (prefix === 'yes') {
      condition = dateArgs[index].condition;
      rules[0].condition = condition === undefined ? '' : condition;
    }
    return rules;
  };

  //查找依赖关系
  var indexDemo = function (str1,str2) {
    var s = str1.indexOf(str2);
    return (s);
  };

  //判断对象是否为空
  var isEmptyObject = function (obj) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        return false;
      };
    };
    return true;
  };

 //判断数组有没有1
  var successArrAllSuc = function (arr) {
    let successArrAllS;
    arr.map(obj => {
      if (obj === 1) {
        successArrAllS = true;
        return;
      } else {
        if (successArrAllS === true) {
          return;
        }
        successArrAllS = false;
      }
    });
    return successArrAllS;
  };

  //判断数组有没有0
  var successArrAllErr = function (arr) {
    let successArrAllS;
    arr.map(obj => {
      if (obj === 0) {
        successArrAllS = true;
        return;
      } else {
        if (successArrAllS === true) {
          return;
        }
        successArrAllS = false;
      }
    });
    return successArrAllS;
  };

  //下拉框国际化
  var locals = function () {
    var lang = window.localStorage.lang;
    // this.localsObj = {};
    var localsObj = {};
    if (lang === 'zh-cn') {
      localsObj.analyticalMethods = [{
        id: 1,
        value: '替换字段值'
      },{
        id: 2,
        value: '删除字段'
      },{
        id: 3,
        value: '添加字段'
      }, {
        id: 4,
        value: '重命名字段'
      }];
      localsObj.parseMethodsOne = [[{
        id: 1,
        value: 'JSON解析'
      }, {
        id: 2,
        value: '正则解析'
      }, {
        id: 7,
        value: 'syslog_pri解析'
      }, {
        id: 8,
        value: 'KeyValue解析'
      }]];
      localsObj.parseMethodsMore = [[{
        id: 1,
        value: 'JSON解析'
      }, {
        id: 2,
        value: '正则解析'
      }, {
        id: 3,
        value: 'URL解析'
      }, {
        id: 4,
        value: '数值转换解析'
      }, {
        id: 5,
        value: 'GEO解析'
      }, {
        id: 6,
        value: '时间戳解析'
      }, {
        id: 7,
        value: 'syslog_pri解析'
      }, {
        id: 8,
        value: 'KeyValue解析'
      }, {
        id: 9,
        value: 'Agent解析'
      }]];
      localsObj.whats = [{id: 'previous', value: '前一条日志'}, {id: 'next', value: '后一条日志'}];//negates下拉框
    } else if (lang === 'zh-tw') {
      localsObj.analyticalMethods = [{
        id: 1,
        value: '替換欄位值'
      },{
        id: 2,
        value: '刪除欄位'
      },{
        id: 3,
        value: '添加欄位'
      }, {
        id: 4,
        value: '重命名欄位'
      }];
      localsObj.parseMethodsOne = [[{
        id: 1,
        value: 'JSON解析'
      }, {
        id: 2,
        value: '正則解析'
      }, {
        id: 7,
        value: 'syslog_pri解析'
      }, {
        id: 8,
        value: 'KeyValue解析'
      }]];
      localsObj.parseMethodsMore = [[{
        id: 1,
        value: 'JSON解析'
      }, {
        id: 2,
        value: '正則解析'
      }, {
        id: 3,
        value: 'URL解析'
      }, {
        id: 4,
        value: '數值轉換解析'
      }, {
        id: 5,
        value: 'GEO解析'
      }, {
        id: 6,
        value: '時間戳記解析'
      }, {
        id: 7,
        value: 'syslog_pri解析'
      }, {
        id: 8,
        value: 'KeyValue解析'
      }, {
        id: 9,
        value: 'Agent解析'
      }]];
      localsObj.whats = [{id: 'previous', value: '前一條日誌'}, {id: 'next', value: '後一條日誌'}];//negates下拉框
    } else {
      localsObj.analyticalMethods = [{
        id: 1,
        value: 'Replace Field Value'
      },{
        id: 2,
        value: 'Delete Field'
      },{
        id: 3,
        value: 'Add Field'
      }, {
        id: 4,
        value: 'Rename Field'
      }];
      localsObj.parseMethodsOne = [[{
        id: 1,
        value: 'JSON Parsing'
      }, {
        id: 2,
        value: 'Grok Parsing'
      }, {
        id: 7,
        value: 'Syslog_pri Parsing'
      }, {
        id: 8,
        value: 'KeyValue Parsing'
      }]];
      localsObj.parseMethodsMore = [[{
        id: 1,
        value: 'JSON Parsing'
      }, {
        id: 2,
        value: 'Grok Parsing'
      }, {
        id: 3,
        value: 'URL Parsing'
      }, {
        id: 4,
        value: 'Numeric Field Conversion'
      }, {
        id: 5,
        value: 'GEO Parsing'
      }, {
        id: 6,
        value: 'Timestamp Parsing'
      }, {
        id: 7,
        value: 'Syslog_pri Parsing'
      }, {
        id: 8,
        value: 'KeyValue Parsing'
      }, {
        id: 9,
        value: 'Agent Parsing'
      }]];
      localsObj.whats = [{id: 'previous', value: 'The previous log'}, {id: 'next', value: 'The next log'}];//negates下拉框
    }
    return localsObj;
  };

  var dateArgSparseMethodInit = function (obj,sprefix,sparseMethod,sdateArgs) {
    let parseMethodObj = getParseMethod(obj);
    let parseMethod = parseMethodObj.parseMethod;
    let pattern = parseMethodObj.pattern;
    let timeZone = parseMethodObj.timeZone;
    let language = parseMethodObj.language;
    let timestamp = parseMethodObj.timestamp;
    if (timestamp === 1) {
      timestamp = 'yes';
    } else if (timestamp === 0) {
      timestamp = 'no';
    }

    let condition;//前置条件
    if (!parseMethodObj.condition) {
      sprefix.push('no');
    } else {
      sprefix.push('yes');
      condition = parseMethodObj.condition;//前置条件
    }

    sparseMethod.push(parseMethod);//每一行的解析方法
    sdateArgs.push({pattern:pattern,timeZone:timeZone,language:language,condition:condition,timestamp:timestamp});//每一行的解析方法的表达式
  };

  //获取错误码对应的错误信息
  var getErrorCode = function (code,name) {
    var message = code + name;
    return message;

  };

  return {
    cmpMe: cmpMe,
    cmp: cmp,
    getParseMethod: getParseMethod,
    valueChange: valueChange,
    getGeo: getGeo,
    sortObj: sortObj,
    wrap: wrap,
    getLog: getLog,
    getLogs: getLogs,
    getRules: getRules,
    indexDemo: indexDemo,
    isEmptyObject: isEmptyObject,
    successArrAllSuc : successArrAllSuc,
    successArrAllErr: successArrAllErr,
    locals: locals,
    dateArgSparseMethodInit: dateArgSparseMethodInit,
    getAnalyMethod: getAnalyMethod,
    getKeyId: getKeyId,
    getErrorCode:getErrorCode
  };
});
