define(function (require) {
  const _ = require('lodash');

  var lang = window.localStorage.lang || 'zh-cn';

  var comFun = {};

  //1.[{"type": 0, "negative": 0, "value": "192.168.84.91"},{"type": 1},{"type": 0, "negative": 0, "value": "192.168.84.91"}]
  //2.[{"query_string": {"query": "(host: 192.168.84.81 or not host: 192.168.84.82)", "analyze_wildcard": true}}]
  //1->2
  comFun.getfieldsText = function (arr1,type) {
    let arr2 = [];
    arr1.map((obj,i)=>{
      switch (obj.type) {
        case 0:
          if (obj.negative === 0) {
            arr2.push(`${type}: ${obj.value}`);
          } else {
            arr2.push(`not ${type}: ${obj.value}`);
          }

          break;
        case 1:
          arr2.push('and');
          break;
        case 2:
          arr2.push('or');
          break;
        default:
          break;
      }
    });
    return arr2.join(' ');
  };

  //1.[{"type": 0, "negative": 0, "value": "192.168.84.91"},{"type": 1},{"type": 0, "negative": 0, "value": "192.168.84.91"}]
  //2.[{value:"192.168.84.91,negative:0 },{value:'and',negative:0},{value:'or',negative:0}]
  //用来转换type,tags,host ->文本的数组

  comFun.getObjToText = function (obj1,obj2) {
    for (let key in obj1) {
      if (obj1.hasOwnProperty(key)) {
        if (key !== 'advance') {

          if (obj1[key].length !== 0) {
            obj2[key] = [];

            obj1[key].map((obj,i)=>{
              switch (obj.type) {
                case 0:
                  obj2[key].push({value:obj.value,negative:obj.negative });
                  break;
                case 1:
                  obj2[key].push({value:'and',negative:0});
                  break;
                case 2:
                  obj2[key].push({value:'or',negative:0});
                  break;
                default:
                  break;
              }

            });
          }

        }

      }
    }

  };

  //转换树结构结果的形式
  comFun.nodeChange = function (arr) {
    arr.map((obj,i)=>{
      arr[i].name = obj.groupName;
      arr[i].title = obj.groupName;
      arr[i].isParent = obj.hasChildren;
      arr[i].iconSkin = obj.hasChildren === 0 ? 'diy03' : 'diy02';
    });
    return arr;
  };

  //获取字符数
  comFun.bytesCount = function (str) {
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


  //搜索
  //
  // 获取body参数
  //    //提交搜素任务

  comFun.getSubmit = function (filters,filtersText,groupId,gte,lte,query) {
    let fields = filters;
    for (let key in fields) {
      if (fields.hasOwnProperty(key)) {
        if (key === 'advance') {
          if (fields[key] !== '') {
            let text = `(advance: ${fields[key]})`;
            filtersText.must.push({'query_string': {'query': text, 'analyze_wildcard': true}});
          }

        } else {
          let text = comFun.getfieldsText(fields[key],key);
          if (text !== '') {
            filtersText.must.push({'query_string': {'query': `(${text})`, 'analyze_wildcard': true}});
          }

        }
      }
    }
    let data = [{
      'logGroup':groupId,
      'order': [{'@timestamp':'desc'}],
      'timeRange':[gte, lte],
      'filters': filtersText,
      'from':0,
      'size':500,
      'query':query,
      'resultFilters':[],
      'includeSource':true
    }];
    return data;
  };


  //查询一个数组是否存在某个值
  comFun.arrHasValue = function (arr,id) {
    let hasValue = false;
    if (arr.length === 0) { return;}
    arr.map((obj,i)=>{
      if (obj.id === id) {
        hasValue = true;
      }
    });
    return hasValue;
  };

  //有id获取数组中的index
  comFun.getIndex = function (arr,id) {
    let index;
    arr.map((obj,i)=>{
      if (obj.groupId === id) {
        index = i;
      }
    });
    return index;
  };


  ///////////////////////////////////////
  ///判断type,host,tags数组中某个值是否已被选择了
  comFun.hasPro = function (arr, key) {
    let has = false;
    arr.map((obj, i)=>{
      let arrObj = [];
      arrObj = obj.value.split(' ');
      if (!arrObj[1]) {
        if (arrObj[0] === key) {
          has = true;
        }
      } else {
        if (arrObj[1] === key) {
          has = true;
        }
      }

    });
    return has;
  };

  comFun.hasProThis = function (arr, key) {
    let has = false;
    arr.map((obj, i)=>{
      let arrObj = [];
      if (obj.value) {
        if (obj.value === key) {
          has = true;
        }
      }

    });
    return has;
  };





  return comFun;
});

