define(function (require) {
  const _ = require('lodash');
  const jstimezonedetect = require('jstimezonedetect');
  const moment = require('moment');

   /*
     时间戳解析-时区识别优化
     2017.02.08
    */

  /*
  1.CST时区
   */
  var timeCST = [{
    id: '-06:00', value: 'Central Standard Time (USA) UT-06:00',rawOffset:'-16:00',tem:-960
  }, {
    id: '+09:30', value: 'Central Standard Time (Australia) UT+09:30',rawOffset:'-15:00',tem:-900
  }, {
    id: '+08:00', value: 'China Standard Time UT+08:00',rawOffset:'-14:00',tem:-840
  }, {
    id: '-04:00', value: 'Cuba Standard Time UT-04:00',rawOffset:'-13:00',tem:-780
  }];




  /*
  .获取时区列表：
   */
  var timeZones = moment.tz.names();
  //console.log(timeZones);


  /*
  3.javascript 通过时区ID获取标准时间的时间量
   */
  var defaultZone = [];
  timeZones.map((obj,i)=>{
    let rawOffset = moment().tz(obj).format('Z');
    if (obj === 'Pacific/Chatham') {
      rawOffset = '+12:45';
    } else if (obj === 'NZ-CHAT') {
      rawOffset = '+12:45';
    } else if (obj === 'Australia/Hobart') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Tasmania') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Melbourne') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Victoria') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/ACT') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Canberra') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/NSW') {
      rawOffset = '-05:00';
    } else if (obj === 'Australia/Currie') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Lord_Howe') {
      rawOffset = '+10:30';
    } else if (obj === 'Australia/LHI') {
      rawOffset = '+10:30';
    } else if (obj === 'Asia/Anadyr') {
      rawOffset = '+11:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Pacific/Auckland') {
      rawOffset = '+12:00';
    } else if (obj === 'NZ') {
      rawOffset = '+12:00';
    } else if (obj === 'Antarctica/McMurdo') {
      rawOffset = '+12:00';
    } else if (obj === '  Antarctica/South_Pole') {
      rawOffset = '+12:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'America/Sao_Paulo') {
      rawOffset = '-03:00';
    } else if (obj === 'Brazil/East') {
      rawOffset = '-03:00';
    } else if (obj === 'Atlantic/Stanley') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Caracas') {
      rawOffset = '-04:30';
    } else if (obj === 'America/Resolute') {
      rawOffset = '-05:00';
    } else if (obj === 'Pacific/Easter') {
      rawOffset = '-06:00';
    } else if (obj === 'Chile/EasterIsland') {
      rawOffset = '-06:00';
    } else if (obj === 'Europe/Samara') {
      rawOffset = '+03:00';
    } else if (obj === 'Asia/Pyongyang') {
      rawOffset = '+09:00';
    } else if (obj === 'Australia/Adelaide') {
      rawOffset = '+09:30';
    } else if (obj === 'Australia/South') {
      rawOffset = '+09:30';
    } else if (obj === 'Australia/Yancowinna') {
      rawOffset = '+09:30';
    } else if (obj === 'Australia/Broken_Hill') {
      rawOffset = '+09:30';
    } else if (obj === 'Australia/Currie') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Tasmania') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Hobart') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Melbourne') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Victoria') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Sydney') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/ACT') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Canberra') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/NSW') {
      rawOffset = '+10:00';
    } else if (obj === 'Australia/Lord_Howe') {
      rawOffset = '+10:30';
    } else if (obj === 'Australia/LHI') {
      rawOffset = '+10:30';
    } else if (obj === 'Asia/Kamchatka') {
      rawOffset = '+11:00';
    } else if (obj === 'Antarctica/McMurdo') {
      rawOffset = '+12:00';
    } else if (obj === 'Antarctica/South_Pole') {
      rawOffset = '+12:00';
    } else if (obj === 'Pacific/Auckland') {
      rawOffset = '+12:00';
    } else if (obj === 'NZ') {
      rawOffset = '+12:00';
    } else if (obj === 'Asia/Sakhalin') {
      rawOffset = '+10:00';
    } else if (obj === 'Asia/Urumqi') {
      rawOffset = '+08:00';
    } else if (obj === 'Asia/Kashgar') {
      rawOffset = '+08:00';
    } else if (obj === 'Europe/Kiev') {
      rawOffset = '+02:00';
    } else if (obj === 'Europe/Riga') {
      rawOffset = '+02:00';
    } else if (obj === 'Africa/Windhoek') {
      rawOffset = '+01:00';
    } else if (obj === 'Pacific/Norfolk') {
      rawOffset = '+11:30';
    } else if (obj === 'Pacific/Apia') {
      rawOffset = '-11:00';
    } else if (obj === 'Pacific/Fakaofo') {
      rawOffset = '-10:00';
    } else if (obj === 'Chile/Continental') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Santiago') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Rio_Branco') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Eirunepe') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Porto_Acre') {
      rawOffset = '-04:00';
    } else if (obj === 'Brazil/Acre') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Cancun') {
      rawOffset = '-06:00';
    } else if (obj === 'America/Asuncion') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Campo_Grande') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Cuiaba') {
      rawOffset = '-04:00';
    } else if (obj === 'America/Grand_Turk') {
      rawOffset = '-05:00';
    }
    let tem = moment().utcOffset(rawOffset);
    defaultZone.push({id:obj,value:`${obj} (${rawOffset})`,rawOffset:rawOffset,tem:tem._offset});
  });
  timeCST.map(obj=>{
    defaultZone.push(obj);
  });

  return {
    defaultZone: defaultZone
  };
});

