define(function (require) {
  const _ = require('lodash');

  var lang = window.localStorage.lang || 'zh-cn';

  var __ = {};

  if (lang === 'zh-cn') {
    __.Rootgroup = '根分组';
    __.Subgroup = '子分组';
    __.AllLogName = '所以日志';
    __.AllLogDescription = '包含所有的日志';

  } else if (lang === 'zh-tw') {
    __.Rootgroup = '根分組';
    __.Subgroup = '子分組';
    __.AllLogName = '所以日志';
    __.AllLogDescription = '包含所有的日志';

  } else {
    __.Rootgroup = 'Root group';
    __.Subgroup = 'Subgroup';
    __.AllLogName = 'All Logs';
    __.AllLogDescription = 'Include all logs';


  }

  return __;
});

